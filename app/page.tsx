export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Strava Map Silhouette
        </h1>
        <p className="mt-3 text-slate-300">
          Next.js Option 1 migration scaffold is ready. API placeholders are
          under
          <code className="mx-1 rounded bg-slate-800 px-2 py-1">app/api</code>.
        </p>
      </header>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold">Migration Note</h2>
        <p className="mt-2 text-slate-300">
          Existing Express server and scripts are intentionally kept during
          transition. We can migrate endpoint-by-endpoint next.
        </p>
        <div className="mt-4">
          <a
            href="/legacy-demo"
            className="inline-flex rounded-md bg-lime-300 px-4 py-2 font-medium text-slate-950"
          >
            Open legacy demo
          </a>
        </div>
      </section>
    </main>
  );
}
