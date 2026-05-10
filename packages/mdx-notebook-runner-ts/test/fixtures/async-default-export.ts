export default async function () {
  await new Promise((r) => setTimeout(r, 10));
  return [1, 2, 3];
}
