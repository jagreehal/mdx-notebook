async function delay(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

const text = `Hello! I'm an AI assistant.

I can help with code, explain concepts, draft text, and more.

For this demo, I'm streaming this response one chunk at a time so you can see how mdx-notebook captures and replays the cadence.

Each line you see was emitted with a small delay — the captured timestamps drive the replay animation in the browser.`;

for (const line of text.split("\n")) {
  console.log(line);
  await delay(120);
}

export default function () {
  return { totalLines: text.split("\n").length };
}
