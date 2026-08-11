# AI Agent Instruction: Build LIKOM Web App + Chrome Extension

You are an expert Full-Stack Developer and Chrome Extension Creator. Your task is to build a two-part Semi-Automated LIKOM (Like & Comment) system based on `prd.md`, `planning.md`, and `design.md`.

## Context & Architecture
To avoid Instagram banning the user's account, we will NOT fully automate the browser. 
1. **Next.js Web App:** Parses raw text, generates comments via LLM (OpenAI/Gemini), and displays a list.
2. **Chrome Extension (Manifest V3):** Only fills the input field on Instagram. No auto-clicking "Post" or "Like".
Communication between the two is done strictly via URL Parameters (e.g., appending `?auto_comment=text` to the IG link).

## Execution Steps

### STEP 1: Build the Web App (Next.js 14+ App Router)
- Setup Next.js with Tailwind and Shadcn UI.
- Create an API route `POST /api/generate` for the LLM integration (keep it as a mock function returning a 2-word string for now, but structure it properly).
- Build the Parser function to extract IG links and bracketed instructions from a messy block of text.
- UI: Main page with textarea, "Process" button, and a list of Result Cards.
- In the Result Card, the "Execute" button should open a new tab: `original_ig_link + "?auto_comment=" + encodeURIComponent(generated_comment)`.

### STEP 2: Build the Chrome Extension
- Create a new folder `chrome-extension/` in the root.
- Write `manifest.json` (V3) with `content_scripts` targeting `*://*.instagram.com/*`.
- Write `content.js`. 
  - **CRITICAL DOM INSTRUCTION FOR INSTAGRAM:** Instagram uses React. You cannot just set `element.value = text`. You must find the comment box (often a `div[contenteditable="true"]` or `textarea`), insert the text, and dispatch native React events (like `InputEvent`) so the "Post" button becomes clickable.
  - Wait for the page to fully load before injecting. Use a MutationObserver or interval to wait for the comment box to appear in the DOM.
  - Read `URLSearchParams(window.location.search).get('auto_comment')` and inject it.

Please start with Step 1 (Web App). Write clean, modular, and fast code. Ask for confirmation before moving to Step 2.