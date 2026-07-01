# InkWell — a Grammarly-style writing assistant powered by Safari's Apple Intelligence

InkWell is a static, no-build web app that gives you a clean, word-processor-style
document to write in (a real "page" with margins and rich formatting — not a raw
Markdown/plain-text box). Its AI proofreading and rewriting come from **Safari's
built-in Writing Tools**, powered by Apple Intelligence, rather than a custom grammar
engine or API key.

## How it works

- Open the page in **Safari on a Mac (macOS Sequoia or later) or an iPhone/iPad**
  with **Apple Intelligence enabled**.
- Type or paste text into the document body.
- **Select any text** — Safari will offer the native **✨ Writing Tools** popover
  (or right‑click → *Writing Tools*) with Proofread, Rewrite, Summarize, tone changes,
  and more, applied directly to your selection.
- InkWell's own toolbar handles real rich-text formatting (bold, italic, underline,
  headings, quote, lists, alignment) so your document is genuinely formatted HTML,
  not markdown syntax.

Opening the app in a non-Safari browser still works for writing and formatting, but
the native Writing Tools popover won't be available — a banner explains this and
suggests switching to Safari.

## Features

- Word-processor page layout (margins, serif body font, page shadow) instead of a
  markdown/plain-text editor.
- Rich text formatting toolbar (bold/italic/underline/strikethrough, headings, quote,
  alignment, bulleted/numbered lists).
- Live word count, character count, and estimated reading time.
- Autosave to the browser's local storage (per-browser, no account/server needed).
- Export the document as a standalone `.html` file or plain `.txt`.
- 100% static and client-side — no backend, build step, or API keys.

## Running locally

No build step is required. Either:

```bash
# open directly
open index.html          # macOS
# or serve it (recommended, avoids some browser file:// restrictions)
python3 -m http.server 8000
```

Then visit `http://localhost:8000` (Safari recommended, to use Writing Tools).

## Project structure

- `index.html` — app shell: toolbar, Apple Intelligence hint banner, document page.
- `css/style.css` — word-processor styling for the toolbar, page/canvas, and status bar.
- `js/app.js` — formatting commands, Safari detection, word count, autosave, export.
