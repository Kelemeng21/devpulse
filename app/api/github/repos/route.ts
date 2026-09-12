import { NextResponse } from "next/server";

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

  return NextResponse.json(repositories);
}