import { tool } from "ai";
import { z } from "zod";

const getWeather = tool({
  description: "Get current weather for a city.",
  parameters: z.object({
    city: z.string().describe("City name, e.g. 'Tokyo' or 'San Francisco'")
  }),
  execute: async ({ city }) => {
    const data: Record<string, { temp: number; condition: string }> = {
      tokyo: { temp: 18, condition: "mild" },
      london: { temp: 12, condition: "overcast" },
      "new york": { temp: 22, condition: "sunny" }
    };
    return data[city.toLowerCase()] ?? { temp: 20, condition: "mild" };
  }
});

console.log("Tool defined: getWeather");
console.log("The LLM sees only the description and the Zod schema, not your TypeScript.");

export default () => ({
  tool: "getWeather",
  description: getWeather.description,
  parameters: { city: { type: "string", required: true } }
});
