import { NextResponse } from "next/server";

const githubHeaders = {
    Accept: "application/vnd.github+json",
    ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    "X-GitHub-Api-Version": "2022-11-28",
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const username = searchParams.get("username");
    const repo = searchParams.get("repo");

    if (!username || !repo) {
        return NextResponse.json(
            { error: "Username and repository are required." },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(
                username
            )}/${encodeURIComponent(repo)}/languages`,
            {
                headers: githubHeaders,
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || "GitHub API error." },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch repository languages." },
            { status: 500 }
        );
    }
}