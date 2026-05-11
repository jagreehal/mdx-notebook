export interface LessonMeta {
  slug: string;
  title: string;
  blurb?: string;
  group: string;
  /** Estimated minutes to complete. */
  durationMin?: number;
  /** Difficulty level. */
  level?: "beginner" | "intermediate" | "advanced";
  /** Slugs of lessons that should be done first. */
  prereqs?: string[];
}

export interface TutorialGroup {
  name: string;
  description?: string;
  order: number;
}

export const groups: TutorialGroup[] = [
  { name: "Foundations", description: "Core mdx-notebook concepts.", order: 1 },
  { name: "Patterns", description: "Real-world authoring patterns.", order: 2 },
  { name: "AI", description: "Patterns for AI tutorials.", order: 3 },
  { name: "Reference", order: 4 }
];

export const lessons: LessonMeta[] = [
  {
    slug: "01-getting-started",
    title: "Getting started",
    blurb: "Three cell forms — inline code, file references, and Jupyter notebooks.",
    group: "Foundations",
    durationMin: 5,
    level: "beginner"
  },
  {
    slug: "02-agents",
    title: "AI agents with tool use",
    blurb: "Capture an agent's tool-call timeline and step-by-step reasoning.",
    group: "AI",
    durationMin: 10,
    level: "intermediate",
    prereqs: ["01-getting-started"]
  },
  {
    slug: "03-streaming",
    title: "Streaming token output",
    blurb: "Replay captured stdout as it would have streamed, live in the browser.",
    group: "AI",
    durationMin: 5,
    level: "intermediate",
    prereqs: ["02-agents"]
  },
  {
    slug: "04-comparing-models",
    title: "Comparing models",
    blurb: "Run the same prompt against two configurations and view results side-by-side.",
    group: "AI",
    durationMin: 5,
    level: "intermediate",
    prereqs: ["02-agents"]
  },
  {
    slug: "05-crash-resume",
    title: "Crash and resume — run matrix",
    blurb: "Run the same script with different env vars; capture all variants in one cell. Compare with DiffRuns.",
    group: "Patterns",
    durationMin: 8,
    level: "intermediate",
    prereqs: ["02-agents"]
  },
  {
    slug: "06-build-an-ai-agent",
    title: "Build an AI agent with tool use",
    blurb: "Step-by-step guide to building an agent with the Vercel AI SDK and Google Gemini, with every tool call captured and visualized.",
    group: "AI",
    durationMin: 15,
    level: "intermediate",
    prereqs: ["02-agents"]
  }
];

/** Convenience getter that returns lessons grouped + sorted by `groups[].order`. */
export function getLessonsByGroup(): Array<{ group: TutorialGroup; lessons: LessonMeta[] }> {
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  return sortedGroups.map((g) => ({
    group: g,
    lessons: lessons.filter((l) => l.group === g.name)
  }));
}

/** Returns prev/next lessons in flat ordering of all lessons. */
export function getAdjacent(slug: string): { prev?: LessonMeta; next?: LessonMeta } {
  const flat = getLessonsByGroup().flatMap((g) => g.lessons);
  const i = flat.findIndex((l) => l.slug === slug);
  if (i < 0) return {};
  return {
    prev: i > 0 ? flat[i - 1] : undefined,
    next: i < flat.length - 1 ? flat[i + 1] : undefined
  };
}

export function getLesson(slug: string): LessonMeta | undefined {
  return lessons.find((l) => l.slug === slug);
}
