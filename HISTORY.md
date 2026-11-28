# WiseSpend — build history

A chronological record of how this app was built: what was shipped, why each change
was made, where the bugs were, and how every release was verified.

Scope: everything in this repository, from the first `Sable 1.0.0` commit on
**2026-11-27** to the **WiseSpend 2.1.0** release on **2026-11-28**. It covers the
product, the architecture, the data migration, the release pipeline, what has been
proven by testing and what has not. Sections 1–14 describe the 2.0 line as it was
built; [§15](#15-210--the-planning-release) covers everything 2.1 added.

---

## Contents

1. [In one page](#1-in-one-page)
2. [Timeline](#2-timeline)
3. [Phase 0 — Sable 1.0.0](#3-phase-0--sable-100)
4. [Phase 1 — the 2.0 redesign and the rename](#4-phase-1--the-20-redesign-and-the-rename)
5. [Phase 2 — the upgrade bug and the migration layer](#5-phase-2--the-upgrade-bug-and-the-migration-layer)
6. [Phase 3 — 2.0.2, the dead button](#6-phase-3--202-the-dead-button)
7. [Phase 4 — 2.0.3, don't burn the marker](#7-phase-4--203-dont-burn-the-marker)
8. [Architecture as it stands](#8-architecture-as-it-stands)
9. [Release pipeline](#9-release-pipeline)
10. [Release log](#10-release-log)
11. [How things were verified](#11-how-things-were-verified)
12. [Known issues and debt](#12-known-issues-and-debt)
13. [Roadmap](#13-roadmap)
14. [Appendix — commands that work](#14-appendix--commands-that-work)
15. [2.1.0 — the planning release](#15-210--the-planning-release)

---

## 1. In one page

- **Built:** a local-only personal finance tracker for Windows and macOS — income,
  expenses, transfers, accounts, categories, six-month cash-flow chart — as one
  `index.html` of vanilla JS inside an Electron wrapper. No backend, no account, no
  network calls, data in `localStorage`.
- **Shipped twice as Sable 1.x**, then redesigned as **WiseSpend 2.0** (black `#08080A`
  canvas, lime `#CDEF6E` accent, champagne-gold heritage thread, Space Grotesk + Inter)
  and renamed the app, the bundle id (`com.wisespend.finance`), the installers and the
  GitHub repository.
- **The rename broke upgrades.** Renaming an Electron app moves `app.getPath('userData')`
  from `%APPDATA%/Sable` to `%APPDATA%/WiseSpend`, so every existing user opened 2.0 to an
  empty app. That was the central engineering problem of the whole project and produced
  the migration layer described in [§5](#5-phase-2--the-upgrade-bug-and-the-migration-layer).
- **Three correctness bugs were found after shipping**, two of them by review rather
  than by users: the probe window quitting the app mid-migration (2.0.1), the "Got it"
  button on the recovery banner doing nothing (2.0.2), and the migration being marked
  complete even when the old store could not be read (2.0.3).
- **Releases are automatic:** pushing a `v*` tag runs a two-job GitHub Actions workflow
  that builds `WiseSpend-Setup-<version>.exe` plus x64 and arm64 `.dmg` files and
  attaches them to the release. Seven releases exist; **2.1.0** is the current one
  (see [§15](#15-210--the-planning-release)).
- **What is not done:** installers are unsigned, the macOS `.dmg` has never been
  installed on a Mac, the NSIS uninstaller hangs silently, and the test suite does not
  run in CI yet.

---

## 2. Timeline

| When (UTC) | What | Version / artefact |
|---|---|---|
| 2026-11-27 16:49 | First commit: Sable 1.0.0 — black minimal finance tracker, Electron wrapper, release workflow | `d67f5cc` |
| 2026-11-27 ~17:08 | Brand pass: logo, app icon, README screenshots | `7bde1f4` |
| 2026-11-27 ~17:13 | Icon wired into window, installer and taskbar | `11be491` |
| 2026-11-27 16:57 | Release `v1.0.0` | exe + dmg |
| 2026-11-27 17:15 | Release `v1.0.1` | exe + dmg |
| 2026-11-27 20:09 | WiseSpend 2.0 — lime redesign, gold thread, rename, new screenshots | `6d76967` |
| 2026-11-27 20:11 | Release `v2.0.0` | WiseSpend installers |
| 2026-11-27 20:33 | 2.0.1 — read and adopt the Sable store, probe-window quit fix, more gold | `7700818` |
| 2026-11-27 20:34 | Release `v2.0.1` | carries the data across |
| 2026-11-27 20:42 | 2.0.2 — make the recovery banner dismissable | `a8a4169` |
| 2026-11-27 20:42 | Release `v2.0.2` | `WiseSpend-Setup-2.0.2.exe` |
| 2026-11-28 02:2x | 2.0.3 — retry an unreadable Sable store on the next launch | `d6edb57` |
| 2026-11-27 21:03 | Release `v2.0.3` | `WiseSpend-Setup-2.0.3.exe`, arm64 + x64 `.dmg` |

(Times are UTC from the GitHub API; commit dates are the committer's local +05:30
timestamps, which is why 2.0.x commits read as 2026-11-28.)

---

## 3. Phase 0 — Sable 1.0.0

**Goal:** a premium-looking personal finance tracker that works entirely offline.

**What was built in the first commit** (`d67f5cc`, 6,109 lines added):

- `index.html` — the entire app in **593 lines**: inline CSS, inline SVG icons, vanilla
  JS, `localStorage` persistence. Views for Overview, Transactions, Accounts and
  Categories, plus a sheet for adding an expense, income or transfer.
- `main.js` — **22 lines**: one 1280×880 `BrowserWindow`, no menu, loads `index.html`.
- `package.json` — Electron `^33`, electron-builder `^25`, `appId`, NSIS target for
  Windows, `dmg` for x64 and arm64, artifact names.
- `.github/workflows/release.yml` — the release pipeline, from the very first commit.
- `README.md`, `LICENSE` (MIT), `.gitignore`, `package-lock.json`.

**Design of 1.x:** black canvas with a **champagne gold** accent (`#E8D3A9`), three
selectable accents (champagne, jade, iris), black and light themes, Indian Rupee
formatting. Numeric rules: an account balance is opening balance + income − expenses −
transfers out + transfers in.

**Brand pass** (`7bde1f4`, `11be491`): `assets/logo.png`, `assets/icon.png`, five
README screenshots, and the icon wired into the window, the installer and the taskbar.

**Released:** `v1.0.0` and `v1.0.1` the same afternoon — the first real test of the
tag-triggered workflow.

---

## 4. Phase 1 — the 2.0 redesign and the rename

**Goal:** a distinct identity rather than a gold-on-black fintech skin, plus a rename
away from "Sable".

**Design system introduced** (`6d76967`, 669 lines changed in `index.html`): a fixed
token set, documented in the README so nothing drifts off-palette.

| Token | Value | Meaning in the app |
|---|---|---|
| Canvas | `#08080A` | app background |
| Surface | `#101014` / `#15151A` / `#1B1B21` | cards, inputs, pressed states |
| Lime | `#CDEF6E` (deep `#A9CE3F`) | primary actions, active nav, focus |
| Jade | `#79E2AF` | **money in** |
| Coral | `#FF8F7B` | **money out**, destructive actions |
| Lilac | `#BCA9FF` | **transfers** |
| Champagne gold | `#E8D3A9` | **money kept**, brand gradient, legacy accent |
| Text | `#F4F3EE` → `#65646D` | primary → faint |

Colour became semantic and non-negotiable: jade only ever means income, coral only ever
means expense, lilac only ever means a transfer, gold only ever means savings.

**Typography:** Space Grotesk for display, balances and every figure (tabular numerals);
Inter for navigation and body. Hero balance 58px/−0.035em, page headings 30px/−0.028em,
eyebrows 10px/0.19em uppercase.

**Shape and motion:** 26px hero radius, 20px cards, 16px tiles, 11px inputs, hairline
borders at 7.5% white, elevation from surface contrast instead of shadows, 160–180ms
transitions.

**The gold thread** — the decision that kept 1.x recognisable: the brand mark is a
lime→gold gradient, the hero hairline fades lime into gold, "Saved this month" is gold,
the Savings account glows gold, and **Gold** remains a selectable accent.

**New functionality:** six-month money-flow chart on the Overview, savings-rate chip,
per-account accent colours, richer category tiles with emoji.

**Rename:** `productName` → `WiseSpend`, `appId` → `com.wisespend.finance`, artifacts
`WiseSpend-Setup-${version}.exe` and `WiseSpend-${version}-${arch}.dmg`, new icon and
wordmark, repository renamed to `innovation-workslmt/WiseSpend` (GitHub redirects the old
URL), README rewritten around the new system.

**Released:** `v2.0.0`.

**The consequence nobody saw at the time:** `app.getPath('userData')` is derived from
the product name, so the rename silently relocated the data folder. Every 1.x user's
ledger was still on disk, in `%APPDATA%/Sable`, where 2.0 never looked.

---

## 5. Phase 2 — the upgrade bug and the migration layer

**Symptom:** after installing 2.0, the app opened empty. Nothing was deleted — the old
profile folder still existed — but the new profile had no `localStorage` key of its own.

**Diagnosis:** two independent address changes had happened at once.

| | 1.x (Sable) | 2.x (WiseSpend) |
|---|---|---|
| Data folder | `%APPDATA%/Sable` | `%APPDATA%/WiseSpend` |
| `localStorage` key | `sable-v1` | `wisespend-v2` |

**Design constraints for the fix.** The user's data could not be moved blindly: 2.0.0
had already been released, so some profiles already had entries of their own and must be
merged rather than overwritten. And the read had to be robust — Sable might still be
running, and its LevelDB store would be locked.

**The migration as built** (`7700818`):

```mermaid
flowchart TD
  A[app.whenReady] --> B{marker<br/>.legacy-store-checked?}
  B -- exists --> Z[open normally]
  B -- absent --> C{any Sable profile<br/>with a non-empty<br/>Local Storage/leveldb?}
  C -- none --> D[write marker<br/>recovered:false] --> Z
  C -- found --> E[copy its Local Storage into<br/>userData/Partitions/sable-legacy]
  E --> F[hidden probe BrowserWindow<br/>on partition persist:sable-legacy<br/>loads legacy-read.html]
  F --> G[executeJavaScript:<br/>localStorage.getItem('sable-v1')]
  G -- read failed --> H[log, write NO marker,<br/>retry next launch] --> Z
  G -- null --> I[write marker<br/>recovered:false] --> Z
  G -- store --> J[write sable-recovered.json,<br/>pass --legacy-store=... via preload] --> K[renderer adopts]
  K -- "empty profile: replace" --> L[save as wisespend-v2]
  K -- "profile has entries: merge by id" --> L
  L --> M[IPC legacy-store-adopted]
  M --> N[delete sable-recovered.json,<br/>write marker recovered:true]
```

Key pieces:

- **`legacy-read.html`** — a blank page loaded in a throwaway partition. Reading
  `localStorage` through a real renderer is the only reliable way to decode a LevelDB
  store without adding a dependency.
- **`persist:sable-legacy`** — the partition the old store is copied into, so the
  original Sable profile is never opened for writing. **Sable itself is left untouched.**
- **`preload.js`** — `contextBridge` exposes `window.wisespendLegacy` (the staged JSON,
  handed over as `--legacy-store=<path>` in `additionalArguments`) and, since 2.0.3,
  `window.wisespendLegacyAdopted`.
- **`adoptLegacyStore()`** in `index.html` — if the new store is untouched it *replaces*
  accounts, categories, transactions and prefs; otherwise it *merges by id*, so running
  the import twice cannot duplicate a transaction.
- **Accent mapping** — `champagne → gold`, `iris → jade`, unknown → `lime`.
- **Recovery banner** — one-time "Recovered from Sable · N transactions, N accounts and N
  categories carried over", driven by `prefs.importedAt / importedCount / importedSeen`.

**Bug found while testing this phase:** closing the probe window fired
`window-all-closed`, and Electron quit the app before the real window existed. Fixed with
a `migrating` flag — `window-all-closed` only quits once the migration has finished. This
is why `main.js` carries that flag and the comment above it.

**Released:** `v2.0.1`.

---

## 6. Phase 3 — 2.0.2, the dead button

The recovery banner's **Got it** button did nothing, so a user who saw the banner could
never dismiss it — a permanent notification over their Overview. The dismiss handler did
not match the rendered `data-dismiss-note` attribute. Two-line fix in `index.html`,
version bumped, README changelog entry added, `v2.0.2` released ~8 minutes later.

The lesson that carried into the next phase: **the recovery path was the least-tested
code in the app, and both bugs lived there.**

---

## 7. Phase 4 — 2.0.3, don't burn the marker

**Finding (from review, not from users):** `.legacy-store-checked` was written even when
reading the old store **failed**. The marker is the only thing that makes the migration
one-time, so a single failed read — Sable open and holding its store, a locked or
corrupt LevelDB, an antivirus lock — permanently closed the upgrade path. The user would
keep an empty app and never be offered the import again.

**The fix** (`d6edb57`), built around one rule — *the marker means "we are done", so it
may only be written in three situations*:

1. **No Sable profile exists** → nothing to carry over, `recovered: false`.
2. **The profile exists but never stored `sable-v1`** → nothing to import,
   `recovered: false`.
3. **The renderer confirms adoption** → the staged file is deleted and the marker is
   written with `recovered: true`.

A failed or unreadable store now writes **no marker at all**, logs
`the Sable store could not be read; retrying on the next launch`, and the next launch
tries again. Retrying is safe precisely because the merge path dedupes by id.

Three supporting changes made that contract honest:

- **`readLegacyStore()`** now returns `{ ok, value }` from its probe instead of a bare
  string, so "read failed" and "read succeeded but empty" are distinguishable — they lead
  to opposite decisions about the marker.
- **`adoptLegacyStore()` returns `null`** for missing/unparseable/unusable input, because
  `0` is also the legitimate result "valid store, nothing new to merge". The renderer
  acknowledges adoption only when the result is not `null`.
- **IPC acknowledgment:** main keeps `stagedSource` and `migrationPending`; on
  `legacy-store-adopted` it deletes `sable-recovered.json` and writes the final marker.
  This also removed the leftover staged copy that used to sit in the data folder forever.

README updated: the marker appears only after a successful import or when there is no
Sable profile, and the staged copy is removed once adopted.

**Verified** with a throwaway profile and a synthetic `%APPDATA%/Sable` (2 accounts, 2
categories, 3 transactions, `accent: 'champagne'`), driven over the Chrome DevTools
protocol — **12/12 assertions** across three launches:

| Launch | Store state | Result |
|---|---|---|
| 1 | Sable store locked | no marker, no staged file, empty default store |
| 2 | store read succeeds | 3 tx / 2 accounts / 2 categories, accent `gold`, banner shown, marker `{recovered:true}`, staged file gone |
| 3 | marker present | 3 tx (no duplicates), staged file still absent |

**Released:** `v2.0.3` (details in [§9](#9-release-pipeline) and [§11](#11-how-things-were-verified)).

---

## 8. Architecture as it stands

No framework, no bundler, no server, no network access.

| File | Role |
|---|---|
| `index.html` | the entire app — 923 lines: markup, inline CSS, state, views, charts, migration adoption |
| `main.js` | 160 lines: window, menu removal, external-link guard, the Sable read/stage/marker logic, adopted-IPC |
| `preload.js` | 19 lines: `wisespendLegacy` (staged store) and `wisespendLegacyAdopted` (ack) over `contextBridge` |
| `legacy-read.html` | blank page used to read the old profile in a throwaway partition |
| `package.json` | app metadata, Electron/electron-builder config, artifact names, file allowlist |
| `.github/workflows/release.yml` | tag-driven Windows + macOS build and release |
| `assets/` | `icon.png`, `logo.png`, five screenshots |
| `README.md` | pitch, screenshots, design system, upgrade notes, build/release instructions, changelog |

**Process model:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`
(the preload must touch the filesystem), production menu removed, `window.open` routed to
the system browser.

**Storage:** one `localStorage` key, `wisespend-v2`, holding:

```
{ v, accounts:[{id,name,kind,opening,color,createdAt}],
       cats:[{id,name,type,emoji,color}],
       tx:[{id,type,amount,date,acct,cat,note,to,createdAt}],
       prefs:{ theme, accent, importedAt, importedCount, importedSeen, … } }
```

`prefs.imported*` exists only to drive the one-time recovery banner.

**Startup sequence:** `app.whenReady` → `readLegacyStore()` (marker check → profile probe
→ probe window → stage JSON) → `createWindow(recoveryPath)` → preload hands the JSON to
the page → `index.html` adopts it, saves, acks over IPC. `VERSION` reaches the renderer as
`?v=` from `app.getVersion()`, which is why the sidebar reads `WiseSpend v2.0.3`.

---

## 9. Release pipeline

`.github/workflows/release.yml`, unchanged since the first commit:

- **Trigger:** push of any `v*` tag, or manual `workflow_dispatch`.
- **Jobs:** matrix over `windows-latest` and `macos-latest`, Node 20, `npm install`.
- **Windows:** `npx electron-builder --win --publish never` → NSIS `WiseSpend-Setup-<version>.exe`.
- **macOS:** `npx electron-builder --mac --publish never` with `CSC_IDENTITY_AUTO_DISCOVERY=false`
  → x64 and arm64 `.dmg`.
- **Publish:** `softprops/action-gh-release@v2` attaches `dist/*.exe` and `dist/*.dmg`
  and generates notes; requires `contents: write`.

**How 2.0.3 was released:** bump `package.json` → changelog in README → commit → push
`main` → annotated tag `v2.0.3` → push tag → watch run `46067587582` (both jobs green) → retitle/annotate the release via `gh release edit`. CI annotations note that
Node 20 is deprecated for the pinned actions; harmless today, worth bumping.

---

## 10. Release log

| Tag | Published (UTC) | Contents |
|---|---|---|
| `v1.0.0` | 2026-11-27 16:57 | Sable 1.0.0, first public build |
| `v1.0.1` | 2026-11-27 17:15 | Sable 1.0.1 |
| `v2.0.0` | 2026-11-27 20:11 | WiseSpend 2.0 redesign and rename |
| `v2.0.1` | 2026-11-27 20:34 | carries Sable data across the rename; more gold |
| `v2.0.2` | 2026-11-27 20:42 | dismissable recovery banner |
| `v2.0.3` | 2026-11-27 21:03 | **current** — retry an unreadable Sable store |

2.0.3 assets: `WiseSpend-Setup-2.0.3.exe` (82.3 MB), `WiseSpend-2.0.3-arm64.dmg`
(100.4 MB), `WiseSpend-2.0.3-x64.dmg` (105.1 MB). All releases are public, unsigned and
carry the same three-platform set.

---

## 11. How things were verified

Verification was manual and increasingly automated, because nothing in this repo has
tests.

**Syntax:** `node --check main.js`, `node --check preload.js` — cheap gate before every
commit.

**Behaviour, over CDP.** Launch a disposable copy in a throwaway profile and drive it:

```
node_modules/electron/dist/electron.exe . \
  --user-data-dir=<temp> --remote-debugging-port=<port>
```

then a Node script reads `http://127.0.0.1:<port>/json/list` with `http.get` and talks
to the page's WebSocket (`Runtime.evaluate`). Notes learned the hard way: plain `fetch` to
`/json` can fail with `ECONNREFUSED` while the port is still binding, and the app must be
closed with `window.close()` (not a kill) so `localStorage` flushes.

**Seeding a fake 1.x install** for the migration tests: run Electron once with a script
that calls `app.setPath('userData', <dir>)` and writes `localStorage.setItem('sable-v1', …)`,
then let the real app find that folder under `%APPDATA%`.

**Packaged-artifact check, 2.0.3.** Rather than trusting "the workflow went green", the
published installer was downloaded, unpacked with the `7za` binary that already ships in
`node_modules/7zip-bin` (no install, no footprint), and inspected:

- `resources/app.asar` contains `legacy-store-adopted` (×2), `wisespendLegacyAdopted` (×2),
  `sable-recovered.json`, and `"version": "2.0.3"`.
- `WiseSpend.exe` metadata: ProductVersion `2.0.3.0`, FileVersion `2.0.3`.
- The unpacked app launched in a throwaway profile and loaded
  `app.asar/index.html?v=2.0.3` — the bundle runs and reports its own version.

**Not verified, at any point:**

- The macOS `.dmg` has never been mounted, installed or launched on a Mac.
- The 2.0.3 installer's interactive install/uninstall flow was not re-run end to end;
  earlier installer tests are described below.
- Behaviour under SmartScreen / Gatekeeper beyond the documented bypass steps.
- Anything under real user data volumes or a non-Indian locale.

**Earlier installer findings (2.0.1 era):** silent install (`/S`) worked and produced a
working app, but the silent uninstall hangs — `Un_A.exe` / `Un_B.exe` are left running and
files plus the registry entry survive. Uninstall had to be completed by hand. This has not
been diagnosed or fixed.

---

## 12. Known issues and debt

Ranked by value; none of these are started.

1. **Markers burned by 2.0.1/2.0.2 are never revisited.** Anyone who ran those builds
   against an unreadable Sable store has `recovered: false` on disk and 2.0.3 will skip
   them. The fix is small: treat `recovered: false` with a populated Sable profile as "not
   done" and retry once.
2. **The NSIS uninstaller hangs silently** and leaves files, shortcuts and a registry
   entry behind — the worst kind of first impression for a finance app, and a blocker for
   clean reinstall.
3. **No export, import or backup.** Every account, category and transaction lives in one
   `localStorage` LevelDB inside one profile folder; losing that folder loses the ledger.
   JSON export plus a rotating on-launch backup is the cheapest real safety net.
4. **The macOS `.dmg` is untested.** Two releases publish a build nobody has opened.
5. **Unsigned builds.** Authenticode and Developer ID + notarization would remove the
   SmartScreen and Gatekeeper warnings, and would unblock macOS auto-update.
6. **No auto-update.** Three 2.0.x re-releases have each required a manual reinstall;
   `electron-updater` against the existing GitHub releases would fix distribution.
7. **A failed migration is silent.** The app opens empty with no explanation. One line of
   UI ("we couldn't read your Sable data, we'll try again next launch") converts a
   mystery into an instruction.
8. **No tests in CI.** Both 2.0.x bugs were in the migration path and would have been
   caught by a 20-line headless check.
9. **Housekeeping:** no `.ico`/`.icns` (icons are derived from a PNG), CI uses
   `npm install` rather than `npm ci`, the `VERSION` fallback in `index.html` still reads
   `'2.0.1'` when `?v=` is absent, there is no `CHANGELOG.md`, and the workflow still
   pins Node 20.
10. **Product gaps** are documented in the README roadmap rather than tracked as issues.

---

## 13. Roadmap

What used to be listed here — edit/find, CSV and JSON import/export, budgets and goals —
ship in 2.1.0 ([§15](#15-210--the-planning-release)). What is left is in the README's
roadmap: multi-currency accounts, an app lock, reorderable Overview cards and desktop
notifications for reminders.

---

## 14. Appendix — commands that work

```bash
# run from source
npm install
npm start

# build installers locally
npm run dist:win     # .exe
npm run dist:mac     # .dmg, must run on a Mac

# release (this is all it takes)
#   bump "version" in package.json, update README changelog, then:
git commit -am "WiseSpend X.Y.Z — summary"
git push origin main
git tag -a vX.Y.Z -m "WiseSpend X.Y.Z"
git push origin vX.Y.Z
gh run watch <run-id> --exit-status

# inspect a published installer without installing it
node_modules/7zip-bin/win/x64/7za.exe x WiseSpend-Setup-X.Y.Z.exe -o/tmp/out -y
grep -a -c 'legacy-store-adopted' /tmp/out/resources/app.asar
```

**House rules that came out of this history:** the migration marker is written only on a
confirmed import or when there is no Sable profile; the staged copy is deleted as soon as
it is adopted; a migration failure must log and retry rather than mark itself done; and
the app never writes to the Sable profile.

---

## 15. 2.1.0 — the planning release

2.0.3 could record money. 2.1 can plan it. Everything below is in the single
`index.html`/Electron shell; the state key, the Sable import and the release pipeline are
untouched.

**What was added:** editing, duplicating and deleting transactions with a six-second undo;
search plus type / account / category / month / date-range filters and four sorts; CSV
export and import and JSON backup and restore with duplicate detection, under five rotating
local snapshots; monthly budgets (overall and per category) with copy-forward; savings goals
with progress rings, required monthly amount and contribute/withdraw that writes a matching
transaction; recurring items on five cadences with subscription totals and the next 30 days;
insights, a six-month chart and an essential-vs-discretionary split; a 30/60/90-day forecast;
net worth with assets, liabilities, loans, credit card outstanding and reconciliation; a
calendar of recurring payments, goal deadlines and reminders; and a settings view with
theme, accent, currency, locale and essential labels.

**The money maths moved out of the page.** `calc.js` is a plain UMD module that `index.html`
loads before its inline script, so balances, monthly totals, budgets, goals, recurring
cadence, forecast and net worth are one implementation, not two. `test/calc.test.js` runs it
under `node --test` — 18 tests, no new dependencies.

**Bugs found and fixed by the review pass:**

- the Budgets view crashed on a `warn` variable that no longer existed;
- the goal "on track" test was inverted, and its expected saving ignored when the goal was set;
- the forecast copy promised recurring items but the maths never used them; the first fix
  added them on top of a 90-day average that already contains those payments, which
  counted every subscription twice. The forecast now takes the history as the only source
  for recurring spending (and the app says so on the card). The regression test seeds a
  ₹450 monthly charge, three times in the window, and asserts the projection subtracts it
  once;
- a forecast date filter compared a UTC-parsed date with local dates, shifting the window
  by a day;
- every keystroke in the transaction search re-rendered the view and dropped focus, so only
  one character ever landed. The handler now restores focus and the caret after the render.
  Found while taking the release screenshots, not by a user;
- smaller display fixes: the insights chart said "last 12 months" while drawing six, the
  average savings rate divided by empty months, and the settings currency fields fell back
  to unstyled browser inputs because they had no `type` attribute.

**Version.** The unreleased work was labelled 2.1–2.7 internally while it was being built.
The last published release is 2.0.3, so all of it ships as one minor release, **2.1.0** —
the version now reported by the app, the window, the installer metadata and the sidebar.

**Released:** `v2.1.0` — `WiseSpend-Setup-2.1.0.exe`, `WiseSpend-2.1.0-arm64.dmg`,
`WiseSpend-2.1.0-x64.dmg`, built by the same tag-triggered workflow.

**Verified:** `npm test` 18/18; the packaged Windows build launched with no page errors,
reported `WiseSpend v2.1.0`, loaded `Calc` from the asar and rendered all 12 views; the
screenshots in `assets/` were captured from that build against a sample month of data.
Not verified: the macOS installers, and the same code signed.
