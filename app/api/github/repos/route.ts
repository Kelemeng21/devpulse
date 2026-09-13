import { NextResponse } from "next/server";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

interface ContributedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  commit_count: number;
}

export async function GET(
  request: Request
) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "GitHub username is required" },
      { status: 400 }
    );
  }

  const githubHeaders: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const [response, profileResponse] = await Promise.all([
    fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
      { headers: githubHeaders }
    ),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      { headers: githubHeaders }
    ),
  ]);

  if (!response.ok) {
    return NextResponse.json(
      { error: "GitHub user not found" },
      { status: response.status }
    );
  }

  const repositories = await response.json();
  const profile = profileResponse.ok
    ? await profileResponse.json()
    : { login: username, avatar_url: null };
  const now = new Date();
  const activityHeaders: HeadersInit = {
    ...githubHeaders,
  };

  const activityResults = await Promise.allSettled(
    Array.from({ length: 12 }, async (_, index) => {
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1)
      );
      const monthEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 10 + index, 0)
      );
      const query = `author:${username} author-date:${formatDate(monthStart)}..${formatDate(monthEnd)}`;
      const commitsResponse = await fetch(
        `https://api.github.com/search/commits?q=${encodeURIComponent(query)}&per_page=1`,
        { headers: activityHeaders }
      );

      if (!commitsResponse.ok) {
        throw new Error("GitHub activity request failed");
      }

      const commits = await commitsResponse.json();

      return {
        month: monthStart.toLocaleDateString("en-US", { month: "short" }),
        commits: commits.total_count,
      };
    })
  );

  const contributedResponse = await fetch(
    `https://api.github.com/search/commits?q=${encodeURIComponent(`author:${username}`)}&per_page=100`,
    { headers: githubHeaders }
  );
  const contributedRepositories = new Map<string, ContributedRepository>();

  if (contributedResponse.ok) {
    const contributedData = await contributedResponse.json();

    for (const item of contributedData.items ?? []) {
      const repository = item.repository;

      if (!repository?.full_name || repository.full_name.toLowerCase().startsWith(`${username.toLowerCase()}/`)) {
        continue;
      }

      const existing = contributedRepositories.get(repository.full_name);

      contributedRepositories.set(repository.full_name, {
        id: repository.id,
        name: repository.name,
        full_name: repository.full_name,
        html_url: repository.html_url,
        description: repository.description,
        language: repository.language,
        stargazers_count: repository.stargazers_count,
        forks_count: repository.forks_count,
        commit_count: existing?.commit_count ?? 0,
      });
    }
  }

  const contributedRepositoryResults = await Promise.all(
    Array.from(contributedRepositories.values()).map(async (repository) => {
      const query = `author:${username} repo:${repository.full_name}`;
      const countResponse = await fetch(
        `https://api.github.com/search/commits?q=${encodeURIComponent(query)}&per_page=1`,
        { headers: githubHeaders }
      );

      if (!countResponse.ok) {
        return repository;
      }

      const countData = await countResponse.json();

      return {
        ...repository,
        commit_count: countData.total_count,
      };
    })
  );

  const activity = activityResults.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1)
    );

    return {
      month: monthStart.toLocaleDateString("en-US", { month: "short" }),
      commits: null,
    };
  });

  return NextResponse.json({
    repositories,
    contributedRepositories: contributedRepositoryResults.sort(
      (first, second) =>
        second.commit_count - first.commit_count
    ),
    profile: {
      login: profile.login,
      avatar_url: profile.avatar_url,
    },
    activity,
    activityWarning: activityResults.some((result) => result.status === "rejected"),
  });
}