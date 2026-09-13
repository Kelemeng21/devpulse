import { NextResponse } from "next/server";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
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

  const response = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "GitHub user not found" },
      { status: response.status }
    );
  }

  const repositories = await response.json();
  const now = new Date();
  const githubHeaders: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

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
        { headers: githubHeaders }
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
    activity,
    activityWarning: activityResults.some((result) => result.status === "rejected"),
  });
}