import { generateText, tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

interface ToolCallEntry {
  name: string;
  input: unknown;
  output?: unknown;
  durationMs?: number;
  status?: "ok" | "error";
}

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: { name: string; input: unknown; output?: unknown; durationMs?: number }[];
}

interface Result {
  messages: Message[];
  toolCalls: ToolCallEntry[];
  totalSteps: number;
  mocked?: boolean;
  note?: string;
}

const WEATHER_DATA: Record<string, { temp: number; condition: string; humidity: number }> = {
  tokyo: { temp: 18, condition: "mild", humidity: 65 },
  london: { temp: 12, condition: "overcast", humidity: 78 },
  "new york": { temp: 22, condition: "sunny", humidity: 50 },
  sydney: { temp: 26, condition: "warm", humidity: 60 }
};

async function runWithLLM(): Promise<Result> {
  const userMessage = "What's the weather in Tokyo, and what should I pack for a trip there?";

  const toolCallLog: ToolCallEntry[] = [];

  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });

  const startedAt = Date.now();
  const result = await generateText({
    model: google("gemini-2.5-flash"),
    tools: {
      getWeather: tool({
        description: "Get current weather for a city.",
        parameters: z.object({
          city: z.string().describe("Name of the city")
        }),
        execute: async ({ city }) => {
          const t0 = Date.now();
          const data = WEATHER_DATA[city.toLowerCase()] ?? { temp: 20, condition: "mild", humidity: 60 };
          const durationMs = Date.now() - t0;
          toolCallLog.push({ name: "getWeather", input: { city }, output: data, durationMs, status: "ok" });
          return data;
        }
      })
    },
    maxSteps: 5,
    messages: [{ role: "user", content: userMessage }]
  });

  const totalDuration = Date.now() - startedAt;
  console.log(`Total duration: ${totalDuration}ms across ${result.steps.length} step(s)`);

  // Build messages array shaped for <MessageThread>
  const messages: Message[] = [{ role: "user", content: userMessage }];
  for (const step of result.steps) {
    if (step.text) {
      const stepToolCalls = (step.toolCalls ?? []).map((tc, i) => ({
        name: tc.toolName,
        input: tc.args,
        output: (step.toolResults?.[i] as { result?: unknown })?.result,
        durationMs: undefined
      }));
      messages.push({
        role: "assistant",
        content: step.text,
        ...(stepToolCalls.length > 0 ? { toolCalls: stepToolCalls } : {})
      });
    }
  }

  return {
    messages,
    toolCalls: toolCallLog,
    totalSteps: result.steps.length
  };
}

function mockedResult(reason: string): Result {
  console.log("--- Step 1 ---");
  console.log("User: What's the weather in Tokyo, and what should I pack?");
  console.log("Agent: I'll check the weather first.");
  console.log("--- Step 2 ---");
  console.log("Tool: getWeather({ city: 'Tokyo' })");
  console.log("-> { temp: 18, condition: 'mild', humidity: 65 }");
  console.log("--- Step 3 ---");
  console.log("Agent: Composing response based on weather data.");

  return {
    mocked: true,
    note: reason,
    messages: [
      { role: "user", content: "What's the weather in Tokyo, and what should I pack for a trip there?" },
      {
        role: "assistant",
        content: "Let me check the weather first.",
        toolCalls: [{ name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18, condition: "mild", humidity: 65 }, durationMs: 240 }]
      },
      { role: "tool", content: '{ "temp": 18, "condition": "mild", "humidity": 65 }' },
      { role: "assistant", content: "Tokyo is mild today at 18°C with 65% humidity. Pack a light jacket — the evenings can be cool. A small umbrella wouldn't hurt either." }
    ],
    toolCalls: [
      { name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18, condition: "mild", humidity: 65 }, durationMs: 240, status: "ok" }
    ],
    totalSteps: 3
  };
}

export default async function (): Promise<Result> {
  if (!process.env.GOOGLE_API_KEY) {
    console.log("[mdx-notebook] GOOGLE_API_KEY not set — using mocked agent output.");
    return mockedResult("Set GOOGLE_API_KEY in .env to run against Google Gemini.");
  }

  try {
    const real = await runWithLLM();
    console.log(`[mdx-notebook] Real Gemini response captured: ${real.messages.length} messages, ${real.toolCalls.length} tool calls.`);
    return real;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mdx-notebook] Real LLM call failed: ${message}`);
    return mockedResult(`Real call failed: ${message}`);
  }
}
