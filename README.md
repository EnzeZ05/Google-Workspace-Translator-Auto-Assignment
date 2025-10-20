# Translator Auto-Assignment (Apps Script)

Auto-assigns translators to Google Calendar events and mirrors status in Google Sheets.

## What It Does
- Detects **language** from event **description** (Chinese/Korean/Thai variants included).
- Picks an **available translator** via per-language **priority queues** (`frequency` drives order).
- Writes assignments to **TranslatorsList** and a compact **MeetingList** dashboard.
- Frees translators when events **end**, are **declined/canceled**, or **deleted**.
- Persists state via `PropertiesService`.

## Sheets Setup
Create **three tabs** with these columns:

### `TranslatorsList`

| Language | Name | Gmail | Status | Frequency | Calendar | Event |
|---|---|---|---|---|---|---|
| Chinese | Leo | leo@example.com | Available | 0 |  |  |

> Only rows with `Status = Available` are eligible.

### `CalendarList`

| Index | CalendarID |
|---|---|
| 1 | teacher1@domain.com |

### `MeetingList`
One row per calendar; script fills: **CalendarID**, **Translator email**, **Start**, **End**.

## Install
1. In your Sheet: **Extensions → Apps Script** → paste the code.
2. Update `langVariation()` if needed (add synonyms/languages).
3. Populate **TranslatorsList** and **CalendarList**.
4. Add a **time-driven trigger** for `myFunction` (e.g., every 5 minutes).

## How It Matches
- Scans events from **now − 30 min** forward.
- For events starting within **30 minutes**:
  - Lowercase description → match language token → canonical key.
  - Pop a translator from that language’s priority queue.
  - Write status/IDs to **TranslatorsList** and **MeetingList**.
- On end/cancel/delete, returns translator to **Available** and increments **Frequency** (on finish).

## Customize
- Priority policy: edit `compareByPriority` (e.g., least-used first).
- Language detection: extend synonyms or use regex/word boundaries.
- Lead time: change the **30-minute** window.
- Notifications: add email/Slack on (un)assignment.

## Notes
- `getStatue()` checks guest declines; consider renaming to `getStatus()`.
- In `initializeTranslators()`, dedupe by iterating `map[language].data`.
- `updateTimestamp()` keeps only the **earliest** upcoming event assigned per calendar.

## Permissions
`SpreadsheetApp`, `CalendarApp`, `PropertiesService`.

## License
MIT.
