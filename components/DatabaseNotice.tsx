import { DatabaseZap } from "lucide-react";

export function DatabaseNotice() {
  return (
    <div className="my-6 flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <DatabaseZap className="mt-0.5 size-5 shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold">The book database isn&apos;t reachable.</p>
        <p className="mt-1 text-muted">
          Set <code className="rounded bg-surface-2 px-1">MONGODB_URI</code> and load the catalogue (see the README). Check{" "}
          <a href="/api/health" className="underline">/api/health</a> for details.
        </p>
      </div>
    </div>
  );
}
