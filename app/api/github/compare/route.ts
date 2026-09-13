import { NextResponse } from "next/server";

const CONTRIBUTIONS_QUERY = `
  query ($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

interface ContributionDay {
  date: string;
  contributionCount: number;
}

async function loadActivity(username: string, from: string, to: string) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { username, from, to },
    }),
  });
  const data = await response.json();

  if (!response.ok || data.errors) {
    throw new Error(data.errors?.[0]?.message || "Could not load activity.");
  }

  const days: ContributionDay[] = data.data?.user?.contributionsCollection?.contributionCalendar?.weeks
    ?.flatMap((week: { contributionDays: ContributionDay[] }) => week.contributionDays) || [];
  const months = new Map<string, number>();

  for (const day of days) {
    const month = day.date.slice(0, 7);
    months.set(month, (months.get(month) || 0) + day.contributionCount);
  }

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - 11 + index);
    const key = date.toISOString().slice(0, 7);

    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      commits: months.get(key) || 0,
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const first = searchParams.get("first");
  const second = searchParams.get("second");

  if (!first || !second) {
    return NextResponse.json({ error: "Two usernames are required." }, { status: 400 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN is required for comparison activity." }, { status: 500 });
  }

  const to = new Date();
  const from = new Date(to);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  from.setUTCDate(from.getUTCDate() + 1);

  try {
    const [firstActivity, secondActivity] = await Promise.all([
      loadActivity(first, from.toISOString(), to.toISOString()),
      loadActivity(second, from.toISOString(), to.toISOString()),
    ]);

    return NextResponse.json({ first: firstActivity, second: secondActivity });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load comparison activity." },
      { status: 502 }
    );
  }
}
