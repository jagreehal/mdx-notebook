// Tiny example agent. Used by Tutorial 01 (Getting started) and the HMR test.
// If GOOGLE_API_KEY is set, makes a real Gemini call. Otherwise returns a friendly mock.

interface Result {
  steps: number;
  finalResponse: string;
  toolCalls: { tool: string; input: unknown; result: unknown }[];
  mocked?: boolean;
}

const mock: Result = {
  steps: 2,
  finalResponse: "Pack a light jacket — Tokyo is mild today.",
  toolCalls: [{ tool: "getWeather", input: { city: "Tokyo" }, result: { temp: 18, condition: "mild" } }],
  mocked: true
};

console.log("--- Step 1 ---");
console.log("Looking up weather for Tokyo");
console.log("--- Step 2 ---");
console.log("Composing response");

export default async function (): Promise<Result> {
  if (!process.env.GOOGLE_API_KEY) return mock;

  try {
    const { generateText, tool } = await import("ai");
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const { z } = await import("zod");

    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });

    const tools = {
      getWeather: tool({
        description: "Get current weather for a city.",
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }: { city: string }) => {
          const data: Record<string, { temp: number; condition: string }> = {
            tokyo: { temp: 18, condition: "mild" },
            london: { temp: 12, condition: "overcast" },
            "new york": { temp: 22, condition: "sunny" }
          };
          return data[city.toLowerCase()] ?? { temp: 20, condition: "mild" };
        }
      })
    };

    const result = await generateText({
      model: google("gemini-2.5-flash"),
      tools,
      maxSteps: 5,
      messages: [{ role: "user", content: "Should I pack a jacket for Tokyo?" }]
    });

    const realToolCalls: { tool: string; input: unknown; result: unknown }[] = [];
    for (const step of result.steps) {
      for (const [i, tc] of (step.toolCalls ?? []).entries()) {
        realToolCalls.push({
          tool: tc.toolName,
          input: tc.args,
          result: (step.toolResults?.[i] as { result?: unknown })?.result
        });
      }
    }

    return {
      steps: result.steps.length,
      finalResponse: result.text,
      toolCalls: realToolCalls
    };
  } catch (err) {
    return mock;
  }
}
