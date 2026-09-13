"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Line,
  LineChart,
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
  pushed_at: string | null;
}

interface ActivityPoint {
  month: string;
  commits: number | null;
}

interface AnalyticsData {
  repositories: Repository[];
  activity: ActivityPoint[];
  profile: GithubProfile;
}

interface HeatmapDay {
  date: string;
  count: number;
  weekday: number;
}

interface HeatmapWeek {
  days: HeatmapDay[];
}

interface HeatmapData {
  totalContributions: number;
  weeks: HeatmapWeek[];
}

interface GithubProfile {
  login: string;
  avatar_url: string | null;
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

export default function Home() {
  const [username, setUsername] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repoLanguages, setRepoLanguages] = useState<
    Record<number, Record<string, number>>
  >({});
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [heatmapError, setHeatmapError] = useState("");
  const [profile, setProfile] = useState<GithubProfile | null>(null);
  const [contributedRepositories, setContributedRepositories] = useState<ContributedRepository[]>([]);
  const [activityWarning, setActivityWarning] = useState(false);
  const [expandedLanguages, setExpandedLanguages] = useState<Record<number, boolean>>({});
  const [languageError, setLanguageError] = useState<Record<number, string>>({});
  const [repositoryQuery, setRepositoryQuery] = useState("");
  const [repositorySort, setRepositorySort] = useState("updated");
  const [compareUsername, setCompareUsername] = useState("");
  const [comparison, setComparison] = useState<AnalyticsData[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

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

  const totalStars = repositories.reduce(
    (total, repo) => total + repo.stargazers_count,
    0
  );
  const totalForks = repositories.reduce(
    (total, repo) => total + repo.forks_count,
    0
  );
  const mostUsedLanguage = languageData.reduce(
    (mostUsed, language) =>
      language.value > (mostUsed?.value ?? 0) ? language : mostUsed,
    languageData[0]
  );

  const visibleRepositories = repositories
    .filter((repo) => {
      const query = repositoryQuery.trim().toLowerCase();

      return (
        !query ||
        repo.name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query)
      );
    })
    .sort((first, second) => {
      if (repositorySort === "stars") {
        return second.stargazers_count - first.stargazers_count;
      }

      if (repositorySort === "forks") {
        return second.forks_count - first.forks_count;
      }

      return (
        new Date(second.pushed_at || 0).getTime() -
        new Date(first.pushed_at || 0).getTime()
      );
    });

  async function fetchAnalytics(profileUsername: string): Promise<AnalyticsData> {
    const response = await fetch(
      `/api/github/repos?username=${encodeURIComponent(profileUsername)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load GitHub profile.");
    }

    return {
      repositories: data.repositories,
      activity: data.activity,
      profile: data.profile,
    };
  }

  async function compareProfiles() {
    if (!username.trim() || !compareUsername.trim()) {
      setCompareError("Enter two GitHub usernames to compare.");
      return;
    }

    setComparing(true);
    setCompareError("");

    try {
      const profiles = await Promise.all([
        fetchAnalytics(username.trim()),
        fetchAnalytics(compareUsername.trim()),
      ]);
      const activityResponse = await fetch(
        `/api/github/compare?first=${encodeURIComponent(username.trim())}&second=${encodeURIComponent(compareUsername.trim())}`
      );
      const activityData = await activityResponse.json();

      if (!activityResponse.ok) {
        throw new Error(activityData.error || "Could not load comparison activity.");
      }

      setComparison([
        { ...profiles[0], activity: activityData.first },
        { ...profiles[1], activity: activityData.second },
      ]);
    } catch (comparisonError) {
      setComparison(null);
      setCompareError(
        comparisonError instanceof Error
          ? comparisonError.message
          : "Could not compare these GitHub profiles."
      );
    } finally {
      setComparing(false);
    }
  }

  const comparisonActivity = comparison
    ? comparison[0].activity.map((point, index) => ({
        month: point.month,
        first: point.commits,
        second: comparison[1].activity[index]?.commits ?? null,
      }))
    : [];

  function getTopLanguages(data: AnalyticsData) {
    const languages = data.repositories.reduce<Record<string, number>>(
      (stats, repo) => {
        if (repo.language) {
          stats[repo.language] = (stats[repo.language] || 0) + 1;
        }

        return stats;
      },
      {}
    );

    return Object.entries(languages)
      .sort((first, second) => second[1] - first[1])
      .slice(0, 4);
  }

  async function loadLanguages(repo: Repository) {
    if (repoLanguages[repo.id]) {
      return true;
    }

    try {
      const response = await fetch(
        `/api/github/languages?username=${encodeURIComponent(
          username
        )}&repo=${encodeURIComponent(repo.name)}`
      );

      const data = await response.json();

      if (!response.ok) {
        setLanguageError((current) => ({
          ...current,
          [repo.id]: data.error || "Could not load repository languages.",
        }));
        return false;
      }

      setRepoLanguages((current) => ({
        ...current,
        [repo.id]: data,
      }));
      setLanguageError((current) => {
        const next = { ...current };
        delete next[repo.id];
        return next;
      });
      return true;
    } catch {
      console.error("Failed to load repository languages.");
      setLanguageError((current) => ({
        ...current,
        [repo.id]: "Failed to connect to GitHub.",
      }));
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
        setHeatmap(null);
        setHeatmapError("");
        setProfile(null);
        setContributedRepositories([]);
        return;
      }

      setRepositories(data.repositories);
      setRepositoryQuery("");
      setProfile(data.profile);
      setContributedRepositories(data.contributedRepositories);
      setActivity(data.activity);
      setActivityWarning(data.activityWarning);

      const heatmapResponse = await fetch(
        `/api/github/heatmap?username=${encodeURIComponent(username)}`
      );
      const heatmapData = await heatmapResponse.json();

      if (heatmapResponse.ok) {
        setHeatmap(heatmapData);
        setHeatmapError("");
      } else {
        setHeatmap(null);
        setHeatmapError(heatmapData.error || "Could not load contribution data.");
      }
    } catch {
      setError("Something went wrong.");
      setRepositories([]);
      setActivity([]);
      setActivityWarning(false);
      setHeatmap(null);
      setHeatmapError("");
      setProfile(null);
      setContributedRepositories([]);
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

          <div className="mx-auto mt-8 max-w-3xl border-t border-white/10 pt-8">
            <p className="mb-3 text-left text-sm font-medium uppercase tracking-[0.16em] text-gray-500">
              Compare two developers
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Second GitHub username"
                value={compareUsername}
                onChange={(event) => setCompareUsername(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    compareProfiles();
                  }
                }}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-white outline-none transition focus:border-cyan-400"
              />
              <button
                onClick={compareProfiles}
                disabled={comparing}
                className="rounded-lg border border-cyan-400/50 px-6 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {comparing ? "Comparing..." : "Compare users"}
              </button>
            </div>
            {compareError && (
              <p className="mt-3 text-left text-sm text-red-400">{compareError}</p>
            )}
          </div>
        </div>

        {comparison && (
          <section className="mt-14 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-6 sm:p-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
                  Side by side
                </p>
                <h2 className="mt-2 text-3xl font-bold">Developer comparison</h2>
              </div>
              <button
                onClick={() => setComparison(null)}
                className="text-sm text-gray-500 transition hover:text-white"
              >
                Clear
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {comparison.map((data) => {
                const stars = data.repositories.reduce(
                  (total, repo) => total + repo.stargazers_count,
                  0
                );
                const forks = data.repositories.reduce(
                  (total, repo) => total + repo.forks_count,
                  0
                );

                return (
                  <div key={data.profile.login} className="rounded-xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center gap-3">
                      {data.profile.avatar_url && (
                        <Image
                          src={data.profile.avatar_url}
                          alt={`${data.profile.login} profile`}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-full border border-cyan-400/30"
                        />
                      )}
                      <h3 className="text-xl font-semibold">{data.profile.login}</h3>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-semibold">{data.repositories.length}</p>
                        <p className="text-xs text-gray-500">Repos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{stars}</p>
                        <p className="text-xs text-gray-500">Stars</p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{forks}</p>
                        <p className="text-xs text-gray-500">Forks</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {getTopLanguages(data).map(([language, count]) => (
                        <span key={language} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                          {language} · {count}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonActivity} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171722",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="first" name={comparison[0].profile.login} stroke="#22d3ee" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="second" name={comparison[1].profile.login} stroke="#f59e0b" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {repositories.length > 0 && (
          <section className="mt-14 overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 px-6 py-6 sm:px-8">
              <div className="flex items-center gap-4">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={`${profile.login} GitHub profile`}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full border border-cyan-400/40 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl font-semibold text-cyan-300">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-white">
                    {profile?.login || username}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">GitHub Developer</p>
                </div>
              </div>
            </div>

            <div className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-6 py-5 sm:px-8">
                <p className="text-2xl font-semibold text-white">{repositories.length}</p>
                <p className="mt-1 text-sm text-gray-500">Repositories</p>
              </div>
              <div className="px-6 py-5 sm:px-8">
                <p className="text-2xl font-semibold text-white">⭐ {totalStars}</p>
                <p className="mt-1 text-sm text-gray-500">Total stars</p>
              </div>
              <div className="px-6 py-5 sm:px-8">
                <p className="text-2xl font-semibold text-white">🍴 {totalForks}</p>
                <p className="mt-1 text-sm text-gray-500">Total forks</p>
              </div>
            </div>

            <div className="border-t border-white/10 px-6 py-5 sm:px-8">
              <span className="text-sm text-gray-500">Most used: </span>
              <span className="font-medium text-cyan-300">
                {mostUsedLanguage?.name || "No language data"}
              </span>
            </div>
          </section>
        )}

        {contributedRepositories.length > 0 && (
          <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
                  Open-source work
                </p>
                <h2 className="mt-2 text-3xl font-bold">Contributed Projects</h2>
              </div>
              <p className="text-sm text-gray-500">Projects outside your own repositories</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {contributedRepositories.map((repo) => (
                <a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 bg-black/10 p-5 transition hover:border-cyan-400/50 hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 break-words font-semibold text-white [overflow-wrap:anywhere]">
                      {repo.full_name}
                    </h3>
                    <span className="shrink-0 text-xs text-cyan-300">
                      {repo.commit_count} commits
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-gray-400">
                    {repo.description || "No description available."}
                  </p>
                  <div className="mt-4 flex gap-4 text-xs text-gray-500">
                    <span>{repo.language || "Unknown language"}</span>
                    <span>⭐ {repo.stargazers_count}</span>
                    <span>🍴 {repo.forks_count}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {(heatmap || heatmapError) && (
          <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
                  Contribution calendar
                </p>
                <h2 className="mt-2 text-3xl font-bold">GitHub Contributions</h2>
              </div>
              {heatmap && (
                <p className="text-sm text-gray-500">
                  {heatmap.totalContributions} contributions in the last year
                </p>
              )}
            </div>

            {heatmapError ? (
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-200">
                  <p>{heatmapError}</p>
                  {heatmapError.includes("GITHUB_TOKEN") && (
                    <p className="mt-2 text-amber-200/70">
                      Add <code className="rounded bg-black/20 px-1.5 py-0.5">GITHUB_TOKEN</code> to <code className="rounded bg-black/20 px-1.5 py-0.5">.env.local</code>, then restart the dev server.
                    </p>
                  )}
                </div>
            ) : heatmap ? (
              <>
                <div className="overflow-x-auto rounded-xl border border-cyan-400/10 bg-black/20 px-4 pb-4 pt-3">
                  <div className="flex min-w-[720px] gap-3">
                    <div className="grid w-8 shrink-0 grid-rows-7 gap-1 pt-5 text-[10px] text-gray-600">
                      <span />
                      <span>Mon</span>
                      <span />
                      <span>Wed</span>
                      <span />
                      <span>Fri</span>
                      <span />
                    </div>

                    <div className="flex gap-1">
                      {heatmap.weeks.map((week, weekIndex) => {
                        const firstDay = week.days[0];
                        const showMonth = firstDay && new Date(firstDay.date).getUTCDate() <= 7;
                        const monthLabel = firstDay
                          ? new Date(firstDay.date).toLocaleDateString("en-US", {
                              month: "short",
                            })
                          : "";

                        return (
                          <div
                            key={`${week.days[0]?.date || "week"}-${weekIndex}`}
                            className="relative grid w-3 shrink-0 grid-rows-7 gap-1 pt-5"
                          >
                            {showMonth && (
                              <span className="absolute -top-0.5 left-0 whitespace-nowrap text-[10px] text-gray-500">
                                {monthLabel}
                              </span>
                            )}
                            {Array.from({ length: 7 }, (_, weekday) => {
                          const day = week.days.find(
                            (currentDay) => currentDay.weekday === weekday
                          );

                          if (!day) {
                            return <span key={weekday} className="h-3 w-3" />;
                          }

                          const intensity =
                            day.count === 0
                              ? "bg-white/10 hover:bg-white/20"
                              : day.count < 3
                                ? "bg-cyan-950 shadow-[0_0_4px_rgba(34,211,238,0.15)] hover:bg-cyan-800"
                                : day.count < 6
                                  ? "bg-cyan-700 shadow-[0_0_5px_rgba(34,211,238,0.25)] hover:bg-cyan-500"
                                  : day.count < 10
                                    ? "bg-cyan-500 shadow-[0_0_7px_rgba(34,211,238,0.45)] hover:bg-cyan-400"
                                    : "bg-cyan-300 shadow-[0_0_9px_rgba(103,232,249,0.75)] hover:bg-white";

                          return (
                            <span
                              key={day.date}
                              title={`${day.date}: ${day.count} contributions`}
                              className={`h-3 w-3 rounded-[3px] transition-all duration-150 hover:scale-125 hover:z-10 ${intensity}`}
                            />
                          );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                  <span>Each square represents one day</span>
                  <div className="flex items-center gap-2">
                    <span>Less</span>
                    <span className="h-3 w-3 rounded-[3px] bg-white/10" />
                    <span className="h-3 w-3 rounded-[3px] bg-cyan-950" />
                    <span className="h-3 w-3 rounded-[3px] bg-cyan-700" />
                    <span className="h-3 w-3 rounded-[3px] bg-cyan-500" />
                    <span className="h-3 w-3 rounded-[3px] bg-cyan-300" />
                    <span>More</span>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        )}

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
                {visibleRepositories.length} of {repositories.length} repositories
              </span>
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <label className="flex-1">
                <span className="sr-only">Search repositories</span>
                <input
                  type="search"
                  value={repositoryQuery}
                  onChange={(event) => setRepositoryQuery(event.target.value)}
                  placeholder="Search repositories..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400"
                />
              </label>

              <label>
                <span className="sr-only">Sort repositories</span>
                <select
                  value={repositorySort}
                  onChange={(event) => setRepositorySort(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#171722] px-4 py-3 text-sm text-gray-300 outline-none transition focus:border-cyan-400 sm:w-52"
                >
                  <option value="updated">Last modified</option>
                  <option value="stars">Most stars</option>
                  <option value="forks">Most forks</option>
                </select>
              </label>
            </div>

            {visibleRepositories.length > 0 ? (
              <div className="space-y-3">
              {Array.from({ length: Math.ceil(visibleRepositories.length / 3) }).map(
                (_, rowIndex) => {
                  const rowRepositories = visibleRepositories.slice(
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
                            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                              <h3
                                className={`${repo.name.length > 50 ? "text-base" : repo.name.length > 32 ? "text-lg" : "text-xl"} min-w-0 flex-1 font-semibold break-words [overflow-wrap:anywhere] transition group-hover:text-cyan-400`}
                              >
                                {repo.name}
                              </h3>

                              <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
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
                          {languageError[repo.id] && (
                            <p className="mt-3 text-sm text-red-400">{languageError[repo.id]}</p>
                          )}
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
            ) : (
              <p className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">
                No repositories match your search.
              </p>
            )}
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