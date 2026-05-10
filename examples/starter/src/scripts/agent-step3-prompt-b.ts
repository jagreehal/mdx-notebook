import { generateText, tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const PROMPT = "I'm flying to Tokyo next week, then on to London. What should I pack? Use the weather tool.";

interface ToolCallEntry {
  name: string;
  input: unknown;
  output?: unknown;
  durationMs?: number;
  status?: "ok" | "error";
}

interface Result {
  prompt: string;
  text: string;
  steps: number;
  toolCalls: ToolCallEntry[];
  mocked?: boolean;
  note?: string;
}

const WEATHER: Record<string, { temp: number; condition: string }> = {
  tokyo: { temp: 18, condition: "mild" },
  london: { temp: 12, condition: "overcast" },
  "new york": { temp: 22, condition: "sunny" }
};

const mocked = (note: string): Result => ({
  mocked: true,
  note,
  prompt: PROMPT,
  text: "Tokyo will be mild (18°C); London will be cool and overcast (12°C). Pack a light jacket and an umbrella for both cities.",
  steps: 3,
  toolCalls: [
    { name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18, condition: "mild" }, durationMs: 220, status: "ok" },
    { name: "getWeather", input: { city: "London" }, output: { temp: 12, condition: "overcast" }, durationMs: 235, status: "ok" }
  ]
});

export default async function (): Promise<Result> {
  if (!process.env.GOOGLE_API_KEY) {
    console.log("[mdx-notebook] mocked (GOOGLE_API_KEY not set)");
    return mocked("Set GOOGLE_API_KEY to run against Gemini.");
  }
  try {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
    const tools = {
      getWeather: tool({
        description: "Get current weather for a city.",
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }: { city: string }) => {
          return WEATHER[city.toLowerCase()] ?? { temp: 20, condition: "mild" };
        }
      })
    };
    const result = await generateText({
      model: google("gemini-2.5-flash"),
      tools,
      maxSteps: 5,
      messages: [{ role: "user", content: PROMPT }]
    });
    const toolCalls: ToolCallEntry[] = [];
    for (const step of result.steps) {
      for (const [i, tc] of (step.toolCalls ?? []).entries()) {
        toolCalls.push({
          name: tc.toolName,
          input: tc.args,
          output: (step.toolResults?.[i] as { result?: unknown })?.result,
          status: "ok"
        });
      }
    }
    console.log(`[mdx-notebook] Real Gemini: ${result.steps.length} step(s), ${toolCalls.length} tool call(s)`);
    return { prompt: PROMPT, text: result.text, steps: result.steps.length, toolCalls };
  } catch (err) {
    return mocked(`Real call failed: ${(err as Error).message}`);
  }
}
