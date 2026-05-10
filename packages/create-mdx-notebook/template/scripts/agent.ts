console.log("--- Step 1 ---");
console.log("Looking up weather for Tokyo");
console.log("--- Step 2 ---");
console.log("Composing response");

export default async function () {
  return {
    steps: 2,
    finalResponse: "Pack a light jacket — Tokyo is mild today.",
    toolCalls: [
      { tool: "getWeather", input: { city: "Tokyo" }, result: { temp: 18, condition: "mild" } }
    ]
  };
}
