"use client";

import { CATEGORIES, EMOTION_META } from "@/lib/constants";
import type { Emotion, Filters } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES: Emotion[] = ["joy", "sadness", "fear", "surprise", "anger"];
const PAGES = [200, 300, 400, 600];
const RATINGS = [3.5, 3.8, 4.0, 4.2];
const ERAS: { label: string; min?: number; max?: number }[] = [
  { label: "Classics", max: 1970 },
  { label: "1970–99", min: 1970, max: 1999 },
  { label: "2000s", min: 2000, max: 2009 },
  { label: "2010+", min: 2010 },
];

function Chip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink-2",
      )}
    >
      {color && <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

export function FiltersPanel({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Category</h3>
        <select
          value={value.category ?? ""}
          onChange={(e) => set({ category: e.target.value || null })}
          className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
          aria-label="Category"
        >
          <option value="">Any category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Feeling</h3>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((t) => (
            <Chip key={t} active={value.tone === t} color={EMOTION_META[t].color} onClick={() => set({ tone: value.tone === t ? null : t })}>
              {EMOTION_META[t].label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Length</h3>
        <div className="flex flex-wrap gap-1.5">
          {PAGES.map((p) => (
            <Chip key={p} active={value.maxPages === p} onClick={() => set({ maxPages: value.maxPages === p ? null : p })}>
              ≤ {p} pages
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Rating</h3>
        <div className="flex flex-wrap gap-1.5">
          {RATINGS.map((r) => (
            <Chip key={r} active={value.minRating === r} onClick={() => set({ minRating: value.minRating === r ? null : r })}>
              ★ {r}+
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Published</h3>
        <div className="flex flex-wrap gap-1.5">
          {ERAS.map((era) => {
            const active = (value.yearMin ?? undefined) === era.min && (value.yearMax ?? undefined) === era.max;
            return (
              <Chip key={era.label} active={active} onClick={() => set(active ? { yearMin: null, yearMax: null } : { yearMin: era.min ?? null, yearMax: era.max ?? null })}>
                {era.label}
              </Chip>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Popularity</h3>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Any", v: null },
            { label: "1K+ ratings", v: 1000 },
            { label: "Bestsellers", v: 50000 },
          ].map((o) => (
            <Chip key={o.label} active={(value.minRatings ?? null) === o.v} onClick={() => set({ minRatings: o.v })}>
              {o.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
