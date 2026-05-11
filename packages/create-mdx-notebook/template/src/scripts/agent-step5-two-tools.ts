import { generateText, tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const PROMPT = "I want to know if I should pack an umbrella for a 5-day trip to Tokyo starting Monday.";

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

const mocked = (note: string): Result => ({
  mocked: true,
  note,
  prompt: PROMPT,
  text: "5-day Tokyo forecast: rain expected on days 2 and 4. Pack an umbrella.",
  steps: 2,
  toolCalls: [{ name: "getForecast", input: { city: "Tokyo", days: 5 }, output: { rainOnDays: [2, 4], avgTemp: 17 }, durationMs: 280, status: "ok" }]
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
        description: "Get the CURRENT weather for a city. Use this for 'right now' questions only.",
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }: { city: string }) => ({ city, temp: 18, condition: "mild" })
      }),
      getForecast: tool({
        description: "Get a multi-day weather forecast for a city. Use this for 'this week' / 'next N days' questions.",
        parameters: z.object({ city: z.string(), days: z.number().min(1).max(14) }),
        execute: async ({ city, days }: { city: string; days: number }) => ({ city, days, rainOnDays: [2, 4], avgTemp: 17 })
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
