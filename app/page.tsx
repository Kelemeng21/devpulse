"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

interface ActivityPoint {
  month: string;
  commits: number | null;
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repoLanguages, setRepoLanguages] = useState<
    Record<number, Record<string, number>>
  >({});
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [activityWarning, setActivityWarning] = useState(false);
  const [expandedLanguages, setExpandedLanguages] = useState<Record<number, boolean>>({});

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
      return true;
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${username}/${repo.name}/languages`
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      setRepoLanguages((current) => ({
        ...current,
        [repo.id]: data,
      }));
      return true;
    } catch {
      console.error("Failed to load repository languages.");
      return false;
    }
  }

  async function toggleLanguages(repo: Repository) {
    if (expandedLanguages[repo.id]) {
      setExpandedLanguages((current) => ({
        ...current,
        [repo.id]: false,
      }));
      return;
    }

    const loaded = await loadLanguages(repo);

    if (loaded) {
      setExpandedLanguages((current) => ({
        ...current,
        [repo.id]: true,
      }));
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
        setActivity([]);
        setActivityWarning(false);
        return;
      }

      setRepositories(data.repositories);
      setActivity(data.activity);
      setActivityWarning(data.activityWarning);
    } catch {
      setError("Something went wrong.");
      setRepositories([]);
      setActivity([]);
      setActivityWarning(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="top" className="min-h-screen bg-[#0a0a0f] text-white">
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

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {activity.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
                  Last 12 months
                </p>
                <h2 className="mt-2 text-3xl font-bold">GitHub Activity</h2>
              </div>
              <p className="text-sm text-gray-500">Commits by month</p>
            </div>

            {activityWarning && (
              <p className="mb-6 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                Some months could not be loaded. Add a GitHub token for the complete history.
              </p>
            )}

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity} margin={{ top: 24, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(34,211,238,0.08)" }}
                    contentStyle={{
                      backgroundColor: "#171722",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="commits" fill="#22d3ee" radius={[5, 5, 0, 0]}>
                    <LabelList dataKey="commits" position="top" fill="#9ca3af" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </section>
          )}

          {repositories.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-white/5 p-8">
            <h2 className="mb-16 text-3xl font-bold text-align: center gap-6 text-grey-500">
              Language Distribution
            </h2>

            <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center">

              <PieChart width={375} height={375} className="text-align: justify;">
                <Pie
                  data={languageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={140}
                  paddingAngle={0}
                >
                  {languageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(${index * 50}, 60%, 80%)`}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>

            </div>
            </section>
          )}
        </div>

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

            <div className="space-y-3">
              {Array.from({ length: Math.ceil(repositories.length / 3) }).map(
                (_, rowIndex) => {
                  const rowRepositories = repositories.slice(
                    rowIndex * 3,
                    rowIndex * 3 + 3
                  );
                  const rowClassName =
                    rowRepositories.length === 2
                      ? "grid gap-3 md:grid-cols-2"
                      : "grid gap-3 md:grid-cols-3";

                  return (
                    <div key={rowIndex} className={rowClassName}>
                      {rowRepositories.map((repo) => (
                        <div
                          key={repo.id}
                          className={`${rowRepositories.length === 1 ? "md:col-start-2" : ""} rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/50 hover:bg-white/10`}
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

                    <div className="mt-3 flex items-center gap-5 text-sm text-gray-500">
                      <span>⭐ {repo.stargazers_count}</span>
                      <span>🍴 {repo.forks_count}</span>
                    </div>
                  </a>

                  <button
                    onClick={() => toggleLanguages(repo)}
                    aria-expanded={Boolean(expandedLanguages[repo.id])}
                    className="mt-5 flex w-full items-center justify-between border-t border-white/10 pt-4 text-left text-sm text-gray-400 transition hover:text-cyan-400"
                  >
                    <span>{expandedLanguages[repo.id] ? "Hide languages" : "Languages"}</span>
                    <span className="text-lg leading-none">{expandedLanguages[repo.id] ? "⌃" : "⌄"}</span>
                  </button>
                  {repoLanguages[repo.id] && expandedLanguages[repo.id] && (
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
                                    {percentage.toFixed(2)}%
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
                  );
                }
              )}
            </div>
          </section>
        )}

      </div>
      <footer className="mt-20 border-t border-white/10 bg-[#0d0d14]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="#top" className="inline-flex items-center gap-3 text-xl font-semibold tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400 text-sm font-black text-black">
                D
              </span>
              <span>
                Dev<span className="text-cyan-400">Pulse</span>
              </span>
            </a>
            <p className="mt-3 max-w-xs text-sm leading-6 text-gray-500">
              A clearer pulse on your open-source work.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-400">
              <li>
                <a href="#top" className="transition-colors hover:text-cyan-400">Back to top</a>
              </li>
              <li>
                <a href="https://github.com/Kelemeng21" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-cyan-400">GitHub</a>
              </li>
              <li>
                <a href="mailto:gaborkelemen21@gmail.com" className="transition-colors hover:text-cyan-400">Contact</a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mx-auto max-w-6xl border-t border-white/5 px-6 py-5 text-xs text-gray-600">
          <span>© {new Date().getFullYear()} DevPulse. Built for developers.</span>
        </div>
      </footer>
    </main>
  );
}