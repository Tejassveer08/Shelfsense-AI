import "server-only";
import type { Emotion, Filters, QueryIntent, Sliders } from "../types";

/**
 * Fast, deterministic understanding of a free-text request. Pulls hard constraints
 * ("under 300 pages", "from the 90s", "rated over 4", "sci-fi") and vibe cues ("dark",
 * "cozy", "fast-paced") out of the query, and leaves the rest as the semantic query.
 * Runs on every search (no LLM latency); the librarian uses the LLM (Groq) on top of it.
 */

const CATEGORY_CUES: [string, RegExp][] = [
  ["Sci-Fi & Fantasy", /\b(sci[- ]?fi|science fiction|fantasy|space opera|cyberpunk|dystopian|dystopia|epic fantasy)\b/],
  ["Mystery & Thriller", /\b(mystery|mysteries|thrillers?|whodunn?it|crime novel|detective)\b/],
  ["Romance", /\b(romance|romcom|rom-com|love stor(y|ies))\b/],
  ["Horror", /\b(horror|scary|haunted)\b/],
  ["Biography & Memoir", /\b(memoirs?|biograph(y|ies)|autobiograph(y|ies))\b/],
  ["History & Politics", /\b(history book|historical nonfiction|politics|political)\b/],
  ["Science & Nature", /\b(popular science|pop[- ]sci|science book|physics|biology|psychology|neuroscience)\b/],
  ["Young Adult & Children", /\b(ya|young adult|middle grade|children'?s|for kids|teen)\b/],
  ["Comics & Graphic Novels", /\b(graphic novels?|comics?|manga)\b/],
  ["Business & Self-Help", /\b(self[- ]help|business book|productivity|personal finance|leadership)\b/],
  ["Philosophy & Religion", /\b(philosophy|philosophical treatise|religion|spirituality|theology)\b/],
  ["Arts & Literature", /\b(poetry|poems|plays|essays)\b/],
  ["Nonfiction", /\b(non[- ]?fiction)\b/],
];

const TONE_CUES: [Emotion, RegExp][] = [
  ["sadness", /\b(sad|melanchol\w*|heartbreak\w*|tearjerker|grief|grieving|bittersweet)\b/],
  ["joy", /\b(uplifting|joyful|happy|feel[- ]good|wholesome|heartwarming)\b/],
  ["fear", /\b(terrifying|scary|creepy|spooky|chilling|suspenseful)\b/],
  ["surprise", /\b(twist(y|s)?|mind[- ]?bending|shocking)\b/],
  ["anger", /\b(revenge|rage|injustice)\b/],
];

const SLIDER_CUES: { axis: keyof Sliders; value: number; re: RegExp }[] = [
  { axis: "dark_light", value: -0.7, re: /\b(dark|bleak|grim|gritty|disturbing|brutal)\b/ },
  { axis: "dark_light", value: 0.7, re: /\b(light[- ]?hearted|cozy|cosy|wholesome|uplifting|feel[- ]good|funny|hilarious|warm)\b/ },
  { axis: "pacing", value: -0.7, re: /\b(fast[- ]paced|page[- ]turner|gripping|action[- ]packed|propulsive|thrilling|unputdownable)\b/ },
  { axis: "pacing", value: 0.7, re: /\b(slow[- ]?burn|slow|contemplative|meditative|quiet|atmospheric|lyrical)\b/ },
  { axis: "cerebral_escapist", value: -0.7, re: /\b(cerebral|philosophical|thought[- ]provoking|challenging|literary|profound)\b/ },
  { axis: "cerebral_escapist", value: 0.7, re: /\b(escapist|fun|easy read|beach read|light read|popcorn|guilty pleasure)\b/ },
  { axis: "length_scale", value: -0.7, re: /\b(short|quick read|novella|brief|nothing too long|not too long)\b/ },
  { axis: "length_scale", value: 0.7, re: /\b(epic|long|doorstopper|sprawling|chunky)\b/ },
];

const FILLER = /\b(i want|i'?m looking for|looking for|recommend( me)?|suggest( me)?|give me|show me|find me|please|something|anything|a book|books?|novels?|reads?|that is|which is|with)\b/g;

const LENGTH_PHRASES = /\b(nothing|not) (too|that|very|overly) (long|short)\b|\b(quick|short|fast|long) reads?\b|\bnot too long\b/g;

function cleanup(q: string): string {
  return q.replace(/\s{2,}/g, " ").replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "").trim();
}

export function parseQuery(raw: string): QueryIntent {
  let q = ` ${raw.toLowerCase()} `;
  const filters: Filters = {};
  const sliders: Sliders = {};
  const chips: string[] = [];

  // pages
  const pages = q.match(/\b(?:under|less than|fewer than|below|max(?:imum)?|at most|<)\s*(\d{2,4})\s*(?:pages|pp|page)\b/);
  if (pages) {
    filters.maxPages = Number(pages[1]);
    chips.push(`≤ ${filters.maxPages} pages`);
    q = q.replace(pages[0], " ");
  }

  // rating
  const rating = q.match(/\b(?:rated|rating|ratings?|stars?)\s*(?:over|above|at least|>=?|of)?\s*([1-4](?:\.\d)?)\+?(?:\s*stars?)?\b|\b([1-4](?:\.\d)?)\+?\s*stars?\b/);
  if (rating) {
    const value = Number(rating[1] ?? rating[2]);
    if (value >= 1 && value <= 4.8) {
      filters.minRating = value;
      chips.push(`★ ${value}+`);
      q = q.replace(rating[0], " ");
    }
  }

  // years and decades
  const between = q.match(/\b(?:between|from)\s*((?:18|19|20)\d\d)\s*(?:and|to|-|–)\s*((?:18|19|20)\d\d)\b/);
  const after = q.match(/\b(?:after|since|newer than|published after|post)\s*((?:18|19|20)\d\d)\b/);
  const before = q.match(/\b(?:before|prior to|older than|published before|pre)\s*((?:18|19|20)\d\d)\b/);
  const decade = q.match(/\b(?:from the |in the |the )?(?:(19|20)?(\d)0)'?s\b/);
  if (between) {
    filters.yearMin = Number(between[1]);
    filters.yearMax = Number(between[2]);
    q = q.replace(between[0], " ");
  } else {
    if (after) {
      filters.yearMin = Number(after[1]);
      q = q.replace(after[0], " ");
    }
    if (before) {
      filters.yearMax = Number(before[1]);
      q = q.replace(before[0], " ");
    }
    if (!after && !before && decade) {
      const century = decade[1] ? Number(decade[1]) * 100 : Number(decade[2]) >= 3 ? 1900 : 2000;
      const start = century + Number(decade[2]) * 10;
      if (start >= 1800 && start <= 2020) {
        filters.yearMin = start;
        filters.yearMax = start + 9;
        q = q.replace(decade[0], " ");
      }
    }
  }
  if (/\b(classic|classics)\b/.test(q) && !filters.yearMax) {
    filters.yearMax = 1970;
  }
  if (/\b(recent|new releases?|latest)\b/.test(q) && !filters.yearMin) {
    filters.yearMin = 2012;
  }
  if (filters.yearMin && filters.yearMax) chips.push(`${filters.yearMin}–${filters.yearMax}`);
  else if (filters.yearMin) chips.push(`after ${filters.yearMin}`);
  else if (filters.yearMax) chips.push(`before ${filters.yearMax}`);

  // category: only when the query is clearly asking for it ("short sci-fi" yes, "like Dune" no)
  for (const [name, re] of CATEGORY_CUES) {
    if (re.test(q)) {
      filters.category = name;
      chips.push(name);
      break;
    }
  }

  const toneLabels: Record<string, string> = { sadness: "melancholy", joy: "uplifting", fear: "suspense", surprise: "twisty", anger: "fury" };
  for (const [tone, re] of TONE_CUES) {
    if (re.test(q)) {
      filters.tone = tone;
      chips.push(toneLabels[tone]);
      break;
    }
  }

  for (const { axis, value, re } of SLIDER_CUES) {
    if (sliders[axis] !== undefined) continue;
    const m = q.match(new RegExp(`(?:\\b(less|not too|not so|not|no|without|never)\\s+)?${re.source}`));
    if (!m) continue;
    if (m[1]) {
      // "less dark" / "not too long": push the other way, and keep the word out of the
      // semantic query (embeddings don't understand negation)
      sliders[axis] = -value * 0.7;
      q = q.replace(m[0], " ");
    } else {
      sliders[axis] = value;
    }
  }
  const sliderChips: Record<string, [string, string]> = {
    dark_light: ["dark", "light"],
    pacing: ["fast-paced", "slow-burn"],
    cerebral_escapist: ["cerebral", "escapist"],
    length_scale: ["short", "epic"],
  };
  for (const [axis, v] of Object.entries(sliders)) {
    if (v) chips.push(sliderChips[axis][v < 0 ? 0 : 1]);
  }

  // Length cues become a slider; leaving "long" in the text would pull in books titled "Long…".
  // may be empty when the whole request was constraints ("less dark", "under 200 pages")
  const semanticQuery = cleanup(q.replace(LENGTH_PHRASES, " ").replace(FILLER, " "));
  // Keyword search should hit concrete words (setting, subject, names), not vibe adjectives:
  // "dark thriller" must not rank every book titled "Dark…" first.
  let kw = semanticQuery;
  for (const { re } of SLIDER_CUES) kw = kw.replace(new RegExp(re.source, "g"), " ");
  for (const [, re] of TONE_CUES) kw = kw.replace(new RegExp(re.source, "g"), " ");
  const keywords = cleanup(kw.replace(/\b(but|and|or|not|too|very|really|quite)\b/g, " "));
  return { semanticQuery: semanticQuery || (Object.keys(filters).length || Object.keys(sliders).length ? "" : raw.trim()), keywords, filters, sliders, chips };
}

export function mergeFilters(...parts: (Filters | undefined | null)[]): Filters {
  const out: Filters = {};
  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

export function mergeSliders(...parts: (Sliders | undefined | null)[]): Sliders {
  const out: Sliders = {};
  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === "number" && Number.isFinite(v)) (out as Record<string, number>)[k] = Math.max(-1, Math.min(1, v));
    }
  }
  return out;
}
