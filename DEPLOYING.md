# Deploying the starter

`examples/starter` is a fully working Astro site. Deploying it gives you a live demo of mdx-notebook.

## Quick deploy — Vercel

From the repo root:

```bash
npx vercel --cwd examples/starter
```

The first run prompts you to link a project and pick a Vercel team. Follow the prompts. Subsequent deploys are `npx vercel --cwd examples/starter --prod`.

The included [`examples/starter/vercel.json`](examples/starter/vercel.json) tells Vercel to install workspace dependencies from the repo root and then build the starter — so the workspace deps (`mdx-notebook-core`, `mdx-notebook-react`, etc.) resolve correctly.

### Optional: real LLM tutorial

Tutorial 02 ("AI agents with tool use") will call Anthropic Claude for real if `ANTHROPIC_API_KEY` is set in the deployment environment. Without it, the page renders a mocked agent loop that has the same data shape — useful for offline / preview environments.

In the Vercel dashboard:

1. Project → Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY` with your key from <https://console.anthropic.com/settings/keys>
3. Redeploy: `npx vercel --cwd examples/starter --prod`

## Quick deploy — Netlify

From the repo root:

```bash
npx netlify deploy --build --dir=examples/starter/dist
```

The included [`examples/starter/netlify.toml`](examples/starter/netlify.toml) sets the base directory and build command.

## Quick deploy — Cloudflare Pages

Cloudflare Pages auto-detects Astro. In the Pages UI:

- **Framework preset:** Astro
- **Build command:** `cd ../.. && pnpm install --frozen-lockfile && pnpm build && cd examples/starter && pnpm build`
- **Build output directory:** `examples/starter/dist`
- **Root directory:** `examples/starter`
- **Environment variables (optional):** `ANTHROPIC_API_KEY`, `NODE_VERSION=20`

## Static export

`pnpm --filter mdx-notebook-starter build` produces a static `dist/` folder you can serve from any static host.

```bash
cd examples/starter
pnpm build
npx serve -l 8080 dist
```

Open <http://localhost:8080>.

## Sub-path deploys

If you're deploying under a path prefix (e.g. `https://docs.example.com/notebooks`), set Astro's `base` in `examples/starter/astro.config.mjs`:

```js
export default defineConfig({
  site: "https://docs.example.com",
  base: "/notebooks",
  // ...
});
```

Cell `src` paths in `.mdx` files are resolved at build time relative to the MDX file, so they're unaffected by the URL base.
