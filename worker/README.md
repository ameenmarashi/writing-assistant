# AI proxy (Cloudflare Worker)

The web app is a static site with no server, so it can't safely hold an
OpenRouter API key — anything shipped to the browser is visible to anyone
who opens dev tools. This tiny Worker holds the key server-side instead: the
app calls the Worker, and the Worker calls OpenRouter's free DeepSeek
endpoint (`deepseek/deepseek-chat-v3.1:free`) on its behalf.

## One-time setup

1. **Get a free OpenRouter API key**
   - Sign up at https://openrouter.ai
   - Go to https://openrouter.ai/keys and create a key (starts with `sk-or-...`)

2. **Get a free Cloudflare account** (if you don't have one): https://dash.cloudflare.com/sign-up

3. **Deploy the Worker**

   Easiest path — Cloudflare dashboard, no CLI install:
   - Go to Workers & Pages → Create → Create Worker
   - Give it any name (e.g. `writing-assistant-ai-proxy`), click Deploy
   - Click "Edit code", delete the placeholder, paste in the contents of
     `worker/src/index.js` from this repo, click "Deploy"
   - Go to Settings → Variables and Secrets → add a secret:
     - Name: `OPENROUTER_API_KEY`
     - Value: the `sk-or-...` key from step 1
   - (Optional) add another secret `ALLOWED_ORIGIN` set to
     `https://ameenmarashi.github.io` to restrict which sites can use it

   Or with the CLI (`npm install -g wrangler`, from this `worker/` directory):
   ```bash
   wrangler deploy
   wrangler secret put OPENROUTER_API_KEY
   ```

4. **Copy the Worker's URL** — shown on the Worker's overview page, looks
   like `https://writing-assistant-ai-proxy.<your-subdomain>.workers.dev`.

5. **Wire it into the app** — set that URL as `VITE_AI_PROXY_URL` in the
   app's `.env.production` file (repo root, not this `worker/` folder), then
   rebuild and redeploy the site.

## Notes

- Cloudflare Workers' free plan allows 100,000 requests/day — far more than
  a personal writing app needs, so this stays free.
- The Worker URL itself isn't secret (it's fine if it ends up in the app's
  public JS bundle) — only `OPENROUTER_API_KEY` needs to stay server-side,
  which the Worker secret mechanism handles.
- Setting `ALLOWED_ORIGIN` doesn't provide real security (anyone can still
  call the Worker URL directly with a forged header), it only stops the
  Worker from serving CORS headers to other origins. If the free OpenRouter
  quota ever gets abused, rotate the key.
