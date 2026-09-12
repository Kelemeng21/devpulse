export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        
        <div className="mb-6 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
          GitHub Developer Analytics
        </div>

        <h1 className="text-6xl font-bold tracking-tight">
          Dev<span className="text-cyan-400">Pulse</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">
          Analyze your GitHub activity, repositories and development habits
          in one powerful dashboard.
        </p>

        <div className="mt-10 flex w-full max-w-xl gap-3">
          <input
            type="text"
            placeholder="Enter your GitHub username"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition focus:border-cyan-400"
          />

          <button
            className="rounded-lg bg-cyan-400 px-6 py-4 font-semibold text-black transition hover:bg-cyan-300"
          >
            Analyze
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Public GitHub data only · No account required
        </p>

      </div>
    </main>
  );
}