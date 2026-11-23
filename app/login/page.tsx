import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

/* Shared-password sign-in. Rendered without the app shell (see AppShell's bare-route check). */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-shell px-4">
      <form method="post" action="/api/login" className="card w-full max-w-sm space-y-4 p-8">
        <div>
          <div className="eyebrow text-brand">VCG Intranet</div>
          <h1 className="mt-1 text-[24px] font-extrabold">Sign in</h1>
          <p className="mt-1 text-[13px] text-ink-2">Enter the team password to open the dashboards.</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          className="h-11 w-full rounded-xl border border-line bg-white px-4 text-[14px] outline-none focus:ring-2 focus:ring-brand"
        />
        {error && <p className="text-[12.5px] font-semibold text-bad">That password isn&apos;t right. Try again.</p>}
        <button type="submit" className="btn btn-brand w-full justify-center">
          Sign in
        </button>
      </form>
    </main>
  );
}
