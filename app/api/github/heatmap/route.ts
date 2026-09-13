import { NextRequest, NextResponse } from "next/server";
 
const CONTRIBUTIONS_QUERY = `
  query ($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
            }
          }
        }
      }
    }
  }
`;
 
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
 
  if (!username) {
    return NextResponse.json(
      { error: "Username is required." },
      { status: 400 }
    );
  }
 
  const token = process.env.GITHUB_TOKEN;
 
  if (!token) {
    return NextResponse.json(
      {
        error:
          "A GITHUB_TOKEN is required to load the contribution calendar.",
      },
      { status: 500 }
    );
  }
 
  const to = new Date();
  const from = new Date(to);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  from.setUTCDate(from.getUTCDate() + 1);
 
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: {
          username,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
    });
 
    const data = await response.json();
 
    if (!response.ok || data.errors) {
      const message =
        data.errors?.[0]?.message || "Could not load contribution data.";
      return NextResponse.json(
        { error: message },
        { status: response.ok ? 404 : response.status }
      );
    }
 
    const calendar = data.data?.user?.contributionsCollection?.contributionCalendar;
 
    if (!calendar) {
      return NextResponse.json(
        { error: "No contribution data found for this user." },
        { status: 404 }
      );
    }
 
    const weeks = calendar.weeks.map(
      (week: { contributionDays: { date: string; contributionCount: number; weekday: number }[] }) => ({
        days: week.contributionDays.map((day) => ({
          date: day.date,
          count: day.contributionCount,
          weekday: day.weekday,
        })),
      })
    );
 
    return NextResponse.json({
      totalContributions: calendar.totalContributions,
      weeks,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to GitHub." },
      { status: 500 }
    );
  }
}