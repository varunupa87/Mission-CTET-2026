# CTET Paper II — Study & Mock Tests

A mobile-friendly, single-login practice site for CTET Paper II (Classes VI–VIII), with
two sections:

- **📘 Study Material** — the crisp, subject-wise revision notes, rendered right in the app.
- **📝 Mock Tests** — timed, full-length-style mock papers with instant right/wrong feedback
  and a pass/fail result at the end.

## What's in here
```
index.html                 — the whole app (login, both sections, quiz, result screens)
style.css                  — visual design, incl. mobile layout (bottom tab bar under 760px)
script.js                  — app logic (login, tab switching, study loader, timer, scoring)
questions.js               — the mock-test question bank
notes/
  01_Child_Development_and_Pedagogy.md
  02_Mathematics.md
  03_Science.md
  04_Social_Studies.md
  05_Language_I_and_II.md  — these five files power the Study Material tab
```

## ⚠️ Upload ALL of these files and folders — flat, not zipped
The most common setup mistake: uploading a `.zip` instead of the extracted files, or
uploading a subfolder instead of its contents. For the site to work, your GitHub repo's
**root** must directly contain `index.html`, `style.css`, `script.js`, `questions.js`,
and a `notes/` folder with the five `.md` files inside it — not nested one level deeper.

## Before you publish: change the login
Open `script.js` and edit the top of the file:
```js
const CREDENTIALS = { username: "student", password: "ctet2026" };
```
You can also do this directly on github.com: open `script.js` in your repo → click the
pencil (✏️) icon → edit the line → commit. Give GitHub Pages about a minute to rebuild,
then hard-refresh your site.

**Important:** this is a static site with no server or database, so this is a *soft
lock* to keep casual visitors out — not real security. Anyone who views the page
source (or your GitHub repo) can see the password. Don't reuse a real password here.

## Host it on GitHub Pages (free)
1. Create a **public** repository, e.g. `ctet-mock-tests`.
2. Upload every file and the `notes/` folder to the repo root (drag-and-drop on
   github.com, or `git add . && git commit -m "..." && git push`).
3. Repo → **Settings → Pages** → Source: `Deploy from a branch`, branch `main`,
   folder `/ (root)` → **Save**.
4. Your site goes live in ~1 minute at `https://<your-username>.github.io/<repo-name>/`.

## Mobile support
- Below 760px width, the top tab switcher is replaced by a bottom tab bar (Study / Mock
  Tests), like a typical mobile app.
- Inputs, buttons, and question cards are sized for touch and don't require zooming.
- The Study Material sidebar becomes a horizontally scrollable strip of subject tabs on
  small screens.

## Adding more mock papers or expanding existing ones
Open `questions.js`. It's a `PAPERS` array; each entry looks like:
```js
{ id:5, title:"Mock Test 5", track:"Maths & Science", questions:[
  {tag:"CDP", q:"Question text?", options:["A","B","C","D"], correct:0, exp:"Why A is correct."},
  ...
]}
```
For a passage-based Language question, add a `passage` field to the **first** question
of the group with the full passage text, and set `passage:"__SAME__"` on the following
questions that share it — the app automatically resolves `"__SAME__"` to the correct
passage text at load time. Add the new paper object to the `PAPERS` array and the
dashboard picks it up automatically.

## Adding or editing Study Material
Just edit the relevant `.md` file in `notes/` — the app fetches and renders it live
using [marked.js](https://github.com/markedjs/marked), so standard Markdown (headings,
bold, tables, lists) all work without touching any code.

## Notes on the content
- All study notes and mock-test questions were written specifically for this practice
  site based on official CTET syllabus topics — not copied from any past exam paper
  (real CTET papers are copyrighted).
- Pass mark is 60% by default (`PASS_PERCENT` in `script.js`) — CTET's actual qualifying
  cutoff varies by category/cycle, so treat this as a practice benchmark.
- Timer defaults to 45 seconds/question (`SECONDS_PER_QUESTION` in `script.js`).
