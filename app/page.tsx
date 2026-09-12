"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface Repository {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repoLanguages, setRepoLanguages] = useState<
    Record<number, Record<string, number>>
  >({});

  const languageStats = repositories.reduce<Record<string, number>>(
    (stats, repo) => {
      if (repo.language) {
        stats[repo.language] = (stats[repo.language] || 0) + 1;
      }

      return stats;
    },
    {}
  );

  const languageData = Object.entries(languageStats).map(
    ([name, value]) => ({
      name,
      value,
    })
  );

  async function loadLanguages(repo: Repository) {
    if (repoLanguages[repo.id]) {
      return;
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${username}/${repo.name}/languages`
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setRepoLanguages((current) => ({
        ...current,
        [repo.id]: data,
      }));
    } catch {
      console.error("Failed to load repository languages.");
    }
  }

  async function analyzeProfile() {
    if (!username.trim()) {
      setError("Enter a GitHub username.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/github/repos?username=${encodeURIComponent(username)}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        setRepositories([]);
        return;
      }

      setRepositories(data);
    } catch {
      setError("Something went wrong.");
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto max-w-6xl px-6 py-20">

        {/* Header */}
        <div className="text-center">
          <div className="mb-6 inline-block rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            GitHub Developer Analytics
          </div>

          <h1 className="text-6xl font-bold tracking-tight">
            Dev<span className="text-cyan-400">Pulse</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
            Analyze your GitHub activity, repositories and development habits
            in one powerful dashboard.
          </p>

          {/* Search */}
          <div className="mx-auto mt-10 flex w-full max-w-xl gap-3">
            <input
              type="text"
              placeholder="Enter your GitHub username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  analyzeProfile();
                }
              }}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition focus:border-cyan-400"
            />

            <button
              onClick={analyzeProfile}
              disabled={loading}
              className="rounded-lg bg-cyan-400 px-6 py-4 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-red-400">
              {error}
            </p>
          )}
        </div>

        {repositories.length > 0 && (
          <section className="mt-16 rounded-xl border border-white/10 bg-white/5 p-8">
            <h2 className="mb-8 text-3xl font-bold">
              Language Distribution
            </h2>

            <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center">

              <PieChart width={350} height={350}>
                <Pie
                  data={languageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={140}
                  paddingAngle={3}
                >
                  {languageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(${index * 50}, 80%, 60%)`}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>

            </div>
          </section>
        )}

        {/* Repository list */}
        {repositories.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold">
                Repositories
              </h2>

              <span className="text-sm text-gray-500">
                {repositories.length} repositories
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/50 hover:bg-white/10"
                >
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-semibold transition group-hover:text-cyan-400">
                        {repo.name}
                      </h3>

                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>

                    <p className="mt-3 min-h-12 text-sm text-gray-400">
                      {repo.description || "No description available."}
                    </p>

                    <div className="mt-5 flex items-center gap-5 text-sm text-gray-500">
                      <span>⭐ {repo.stargazers_count}</span>
                      <span>🍴 {repo.forks_count}</span>
                    </div>
                  </a>

                  <button
                    onClick={() => loadLanguages(repo)}
                    className="mt-5 flex w-full items-center justify-between border-t border-white/10 pt-4 text-left text-sm text-gray-400 transition hover:text-cyan-400"
                  >
                    <span>Languages</span>
                    <span>⌄</span>
                  </button>
                    {repoLanguages[repo.id] && (
  <div className="mt-4 space-y-4">
    {(() => {
      const languages = repoLanguages[repo.id];

      const totalBytes = Object.values(languages).reduce(
        (sum, bytes) => sum + bytes,
        0
      );

      return Object.entries(languages).map(
        ([language, bytes]) => {
          const percentage = (bytes / totalBytes) * 100;

          return (
            <div key={language}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-300">
                  {language}
                </span>

                <span className="text-gray-500">
                  {percentage.toFixed(1)}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        }
      );
    })()}
  </div>
)}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}