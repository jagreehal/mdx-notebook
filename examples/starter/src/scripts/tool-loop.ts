console.log("--- Step 1 ---");
console.log("User: What's the weather in Tokyo, and what should I pack?");
console.log("Agent: I'll check the weather first.");

console.log("--- Step 2 ---");
console.log("Tool: getWeather({ city: 'Tokyo' })");
console.log("-> { temp: 18, condition: 'mild', humidity: 65 }");

console.log("--- Step 3 ---");
console.log("Agent: Composing response based on weather data.");

const messages = [
  { role: "user" as const, content: "What's the weather in Tokyo, and what should I pack?" },
  {
    role: "assistant" as const,
    content: "Let me check the weather first.",
    toolCalls: [
      { name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18, condition: "mild", humidity: 65 }, durationMs: 240 }
    ]
  },
  { role: "tool" as const, content: '{ "temp": 18, "condition": "mild", "humidity": 65 }' },
  { role: "assistant" as const, content: "Tokyo is mild today at 18C with 65% humidity. Pack a light jacket — the evenings can be cool. A small umbrella wouldn't hurt either." }
];

const toolCalls = [
  { name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18, condition: "mild", humidity: 65 }, durationMs: 240, status: "ok" as const }
];

export default function () {
  return { messages, toolCalls, totalSteps: 3 };
}
