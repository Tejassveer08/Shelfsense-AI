import type { Emotion, Sliders, VibeAxis } from "./types";

export const CATEGORIES = [
  "Fiction",
  "Sci-Fi & Fantasy",
  "Mystery & Thriller",
  "Romance",
  "Horror",
  "Young Adult & Children",
  "Comics & Graphic Novels",
  "Arts & Literature",
  "History & Politics",
  "Biography & Memoir",
  "Science & Nature",
  "Philosophy & Religion",
  "Business & Self-Help",
  "Nonfiction",
] as const;

export const VIBE_META: Record<VibeAxis, { label: string; left: string; right: string }> = {
  dark_light: { label: "Mood", left: "Dark", right: "Light" },
  pacing: { label: "Pace", left: "Fast-paced", right: "Slow-burn" },
  cerebral_escapist: { label: "Depth", left: "Cerebral", right: "Escapist" },
  length_scale: { label: "Length", left: "Short", right: "Epic" },
};

export const EMOTION_META: Record<Emotion, { label: string; color: string }> = {
  joy: { label: "Joy", color: "#e9a23b" },
  sadness: { label: "Melancholy", color: "#5b7bd5" },
  fear: { label: "Suspense", color: "#7b4fc9" },
  anger: { label: "Fury", color: "#d6453d" },
  surprise: { label: "Twists", color: "#2aa59a" },
  disgust: { label: "Grit", color: "#7a8a3a" },
  neutral: { label: "Calm", color: "#8a8f98" },
};

export interface Mood {
  slug: string;
  name: string;
  blurb: string;
  query: string;
  sliders: Sliders;
  gradient: string;
  emoji: string;
}

export const MOODS: Mood[] = [
  {
    slug: "cozy",
    name: "Cozy & comforting",
    blurb: "Warm blankets, found family, low stakes",
    query: "cozy heartwarming comforting story found family small town",
    sliders: { dark_light: 0.8, cerebral_escapist: 0.6 },
    gradient: "from-amber-300 to-rose-300",
    emoji: "☕",
  },
  {
    slug: "dark-academia",
    name: "Dark academia",
    blurb: "Old libraries, secrets, obsession",
    query: "dark academia elite university secret society obsession murder",
    sliders: { dark_light: -0.6, cerebral_escapist: -0.5 },
    gradient: "from-stone-600 to-emerald-900",
    emoji: "🕯️",
  },
  {
    slug: "page-turner",
    name: "Can't-put-down thrillers",
    blurb: "Twists, cliffhangers, one more chapter",
    query: "gripping twisty psychological thriller shocking twist",
    sliders: { pacing: -0.9, dark_light: -0.4 },
    gradient: "from-slate-700 to-red-700",
    emoji: "⚡",
  },
  {
    slug: "epic-fantasy",
    name: "Epic worlds",
    blurb: "Magic systems, maps, sprawling sagas",
    query: "epic fantasy world building magic system quest kingdoms",
    sliders: { length_scale: 0.8 },
    gradient: "from-indigo-600 to-fuchsia-600",
    emoji: "🐉",
  },
  {
    slug: "big-ideas",
    name: "Big ideas",
    blurb: "Books that rewire how you think",
    query: "thought-provoking ideas about humanity society mind and the future",
    sliders: { cerebral_escapist: -0.9 },
    gradient: "from-sky-600 to-cyan-400",
    emoji: "🧠",
  },
  {
    slug: "good-cry",
    name: "A good cry",
    blurb: "Grief, love and quiet devastation",
    query: "heartbreaking emotional story of love loss and grief",
    sliders: { pacing: 0.6 },
    gradient: "from-blue-400 to-violet-500",
    emoji: "🌧️",
  },
  {
    slug: "quick-reads",
    name: "Short & sharp",
    blurb: "Finish it in a weekend",
    query: "short powerful novel brilliant concise",
    sliders: { length_scale: -0.9 },
    gradient: "from-lime-400 to-emerald-500",
    emoji: "⏱️",
  },
  {
    slug: "spooky",
    name: "Spine-chilling",
    blurb: "Haunted houses and creeping dread",
    query: "haunted house horror creeping dread ghost terrifying",
    sliders: { dark_light: -0.9 },
    gradient: "from-zinc-800 to-purple-900",
    emoji: "👻",
  },
  {
    slug: "swoon",
    name: "Swoon-worthy romance",
    blurb: "Banter, slow burns, happy endings",
    query: "romantic comedy banter slow burn love story happy ending",
    sliders: { dark_light: 0.7, cerebral_escapist: 0.7 },
    gradient: "from-pink-400 to-rose-500",
    emoji: "💌",
  },
  {
    slug: "true-stories",
    name: "Stranger than fiction",
    blurb: "Memoirs and history that read like novels",
    query: "gripping true story narrative nonfiction memoir history",
    sliders: {},
    gradient: "from-orange-500 to-amber-700",
    emoji: "📜",
  },
  {
    slug: "space",
    name: "Lost in space",
    blurb: "Starships, first contact, far futures",
    query: "space opera starship first contact alien civilization far future",
    sliders: {},
    gradient: "from-violet-800 to-sky-500",
    emoji: "🚀",
  },
  {
    slug: "mythic",
    name: "Myths retold",
    blurb: "Gods, legends and fairy tales reimagined",
    query: "retelling of greek mythology gods legends fairy tale reimagined",
    sliders: {},
    gradient: "from-yellow-500 to-teal-600",
    emoji: "🏛️",
  },
];

export const EXAMPLE_QUERIES = [
  "a slow, melancholic novel about leaving home, nothing too long",
  "like The Martian but with more humor and less science",
  "cozy mystery set in a bookshop, published after 2010",
  "sweeping historical fiction about women in WWII rated over 4",
  "mind-bending sci-fi under 300 pages",
  "a dark fairy tale retelling for adults",
  "nonfiction that explains how the brain works",
  "a funny, warm fantasy with found family",
];
