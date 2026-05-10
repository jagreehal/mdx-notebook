const prompt = "Summarize the plot of Hamlet in two sentences.";

const fast = {
  model: "fast-3.5",
  text: "Hamlet is a Danish prince who, after his father's death and his mother's hasty remarriage to his uncle, is visited by a ghost claiming his uncle is the murderer. The play traces his descent into vengeance, doubt, and tragedy as the court collapses around him.",
  latencyMs: 380,
  tokensOut: 64
};

const careful = {
  model: "careful-4",
  text: "Prince Hamlet returns to Denmark to find his father dead, his mother remarried to his uncle Claudius, and a ghost demanding revenge. Torn between duty, grief, and philosophical doubt, he stages a play to expose the murderer — and the resulting chain of events brings down the entire royal household.",
  latencyMs: 1240,
  tokensOut: 89
};

console.log(`Prompt: ${prompt}`);
console.log(`Comparing two configurations: ${fast.model} vs ${careful.model}`);

export default function () {
  return { prompt, fast, careful };
}
