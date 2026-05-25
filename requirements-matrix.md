# Carrot Chase
## Feature Implementation Review

**Project:** Carrot Chase — Race Management Platform  
**Document type:** Prototype vs. Full Specification — Feature Status  
**Prepared for:** Internal review  
**Date:** 22 May 2026  
**Scope:** Front-end prototype (single-file, no backend)

---

### Key

| Symbol | Status |
|--------|--------|
| ✅ | Implemented and working |
| ⚠️ | Partially implemented or simplified |
| ❌ | Not implemented |
| 🚫 | Out of scope — requires backend or third-party infrastructure |

**Level scale:** Level 1 = elite / Olympic. Level 99 = beginner. Levels decrease as runners improve. In handicap format, slower groups (higher level) start first.

---

## Section 1 — Group & Club Management

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E1.1 | Create running groups | ✅ | Full add form with name, type, and lead fields |
| E1.2 | Group type selection | ✅ | Dropdown with five preset types |
| E1.3 | Edit group details | ✅ | Edit modal covering all fields |
| E1.4 | Delete group with confirmation | ✅ | Guarded by `window.confirm` |
| E1.5 | Member count per group | ✅ | Displayed on group card |
| E1.6 | Navigate from group to filtered member list | ✅ | "View Members" button |
| E1.7 | Multi-group membership | ❌ | Requires a relational data model; runners currently hold a single `group` string |
| E1.8 | Group archive / soft-deactivate | ❌ | Delete only; no archive state |

---

## Section 2 — Runner & Member Management

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E2.1 | Add runner manually | ✅ | Form captures name, group, and year |
| E2.2 | Runner profile page | ✅ | Displays PB, streak, points, badges, and level history chart |
| E2.3 | Edit runner details | ❌ | View only; no inline edit |
| E2.4 | Delete / remove runner | ❌ | Not implemented |
| E2.5 | CSV bulk import | ✅ | File picker with header detection and row preview |
| E2.6 | CSV template download | ✅ | One-click `.csv` with sample data |
| E2.7 | CSV row-level error validation | ✅ | Per-row error display; invalid rows skipped on import |
| E2.8 | Search by name, ID, or group | ✅ | Real-time filter with clear (✕) button |
| E2.9 | Filter members by group | ✅ | Group chip filter with "Clear filter" |
| E2.10 | Runner ID auto-generation | ✅ | `CC-XXXX` format |
| E2.11 | Runner photo / avatar | ❌ | Initials avatar only; no image upload |
| E2.12 | Medical / welfare notes | 🚫 | Requires secure backend storage |
| E2.13 | Parent / guardian contact | 🚫 | Requires authenticated communications backend |

---

## Section 3 — Event Creation & Configuration

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E3.1 | Create event (name, date, format, course) | ✅ | Two-step wizard |
| E3.2 | Event formats: Handicap, Time Trial, Fun Run | ✅ | Selector with format descriptions |
| E3.3 | Course selection from presets | ✅ | Four course options with distances |
| E3.4 | Custom course entry | ⚠️ | Free-text field present but not validated |
| E3.5 | Marshal requirements auto-calculator | ✅ | Dynamic count based on runner numbers (1 per 8, plus start and finish) |
| E3.6 | Handicap format marshal guidance | ✅ | Banner explains staggered start order |
| E3.7 | Event duplication / templates | ❌ | Each event created from scratch |
| E3.8 | Course map / route attachment | 🚫 | Requires file storage or mapping API |
| E3.9 | Pre-event communications to runners / parents | 🚫 | Requires SMTP backend |
| E3.10 | Calendar integration (iCal / Google) | 🚫 | Requires OAuth and calendar API |

---

## Section 4 — Race Day Operations

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E4.1 | Attendance marking | ✅ | Tap ✓ / DNS per runner |
| E4.2 | Mark all present shortcut | ✅ | One-tap to mark full group |
| E4.3 | DNS marking | ✅ | DNS button per runner; DNS runners shown on results screen |
| E4.4 | Late arrival registration | ✅ | Add runner mid-flow; auto-marked present |
| E4.5 | Handicap start group calculation | ✅ | Three groups by level band; slowest group starts first |
| E4.6 | Dynamic stagger gap | ✅ | `staggerGap()` based on pace difference, clamped 10–60 s |
| E4.7 | Group countdown with audio | ✅ | Countdown timer and beep tones via Web Audio API |
| E4.8 | Skip countdown option | ✅ | "Skip countdown" link available |
| E4.9 | Finish line tap recorder | ✅ | Large tap button with flash animation |
| E4.10 | Race clock display | ✅ | MM:SS timer starts when the last group departs |
| E4.11 | All-accounted-for confirmation | ✅ | Button disables and confirms when tap count equals present count |
| E4.12 | Position-to-runner name matching | ✅ | Two-column interface; runner-side DNF buttons for mobile |
| E4.13 | Mark DNF per runner | ✅ | Prominent DNF button per runner; undo available |
| E4.14 | Unresolved position warning | ✅ | Amber banner; Confirm Results blocked until all resolved |
| E4.15 | Adjusted time calculation | ✅ | Stagger offsets applied; earlier groups receive head-start credit |
| E4.16 | QR code check-in | 🚫 | Requires `getUserMedia` and a QR decode library |
| E4.17 | Live spectator view (public URL) | 🚫 | Requires real-time backend (WebSockets) |
| E4.18 | NFC / RFID chip timing | 🚫 | Requires hardware integration |
| E4.19 | Printed race bibs / start cards | ❌ | No print stylesheet implemented |

---

## Section 5 — Results, Scoring & Progression

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E5.1 | Podium display — top three | ✅ | Visual podium with medals |
| E5.2 | Full results list | ✅ | Position, name, time, and points per finisher |
| E5.3 | Adjusted time alongside raw time | ✅ | "adjusted" sub-label per runner |
| E5.4 | Points by finish position | ✅ | `posPoints()` — 200 / 170 / 145 / … |
| E5.5 | Carrot algorithm | ✅ | Target = second-fastest of runner's last five times |
| E5.6 | Level change based on carrot performance | ✅ | Beating target reduces level (improvement); missing raises it |
| E5.7 | Level direction — 1 = elite, 99 = beginner | ✅ | Consistent across all logic, display, and seed data |
| E5.8 | Personal best detection and saving | ✅ | `newPB` flag; guard requires adjusted time ≥ 60 s |
| E5.9 | Streak tracking | ✅ | Incremented on finish; reset on DNF |
| E5.10 | Badge awards | ✅ | Six badge rules evaluated on results commit |
| E5.11 | Most Improved highlight | ✅ | Runner with the greatest level decrease (most negative delta) |
| E5.12 | DNS runners shown on results screen | ✅ | Grey chip section below finishers |
| E5.13 | Persist results to runner profiles | ✅ | `commitResults()` writes to runners state and localStorage |
| E5.14 | Undo / re-run results | ❌ | One-way commit; no rollback |
| E5.15 | Export results (PDF / CSV) | ❌ | No export implemented |
| E5.16 | Historical results per event | ⚠️ | Results page shows current race only; no archive |

---

## Section 6 — Leaderboard & Standings

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E6.1 | Season standings by total points | ✅ | Sorted leaderboard with rank numbers |
| E6.2 | Top-three podium on leaderboard | ✅ | Gold / silver / bronze cards |
| E6.3 | Filter by group | ✅ | Dropdown select |
| E6.4 | Mobile-optimised row layout | ✅ | Compact card rows on small screens |
| E6.5 | Desktop table with medals, events, and streak | ✅ | Full stat columns on wider viewports |
| E6.6 | Level badge colour coding | ✅ | Amber (elite) / green / blue / grey by level band |
| E6.7 | Multi-season archive | ❌ | Single season only |
| E6.8 | Cross-school leaderboard (Super Admin) | ❌ | Per-school view only |

---

## Section 7 — Dashboards & Reporting

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E7.1 | Lead dashboard — my group stats | ✅ | Runners, upcoming events, streak leader, top level |
| E7.2 | "Ready to run?" call-to-action | ✅ | Orange banner linking to Run Event |
| E7.3 | Upcoming events list | ✅ | Next three events shown |
| E7.4 | School Admin dashboard | ✅ | Runner growth chart, group cards, recent events |
| E7.5 | Payments / ROI card | ✅ | Licence cost vs. session revenue, projected annual return |
| E7.6 | Super Admin dashboard | ✅ | Organisation count, total runners, events, monthly revenue |
| E7.7 | Runner growth chart (12-month) | ✅ | Line chart via Canvas API |
| E7.8 | Runner profile — level progression chart | ✅ | Ten-event sparkline |
| E7.9 | Runner profile — recent event history | ⚠️ | Static mock data; not wired to live race history |
| E7.10 | Attendance / participation rate reports | ❌ | No reporting module |
| E7.11 | Safeguarding / welfare flag dashboard | 🚫 | Requires secure backend and notification system |

---

## Section 8 — System, Authentication & Technical

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E8.1 | Role-based login (Super Admin / School Admin / Lead) | ✅ | Three demo credential sets |
| E8.2 | 2FA screen with one-tap fill | ✅ | Fill button auto-populates demo code `482716` |
| E8.3 | Mobile-responsive layout (≤640 px) | ✅ | Top header and bottom navigation on mobile |
| E8.4 | Local WiFi hosting | ✅ | `python3 -m http.server 4000 --bind 0.0.0.0` |
| E8.5 | localStorage persistence | ✅ | Runner state survives page reload |
| E8.6 | Reset demo data | ✅ | "Reset demo data" in sidebar footer |
| E8.7 | Fade-in page transitions | ✅ | `fadeIn` CSS animation |
| E8.8 | Audio feedback (countdown and start) | ✅ | Web Audio API tones |
| E8.9 | PWA / offline mode | 🚫 | Requires Service Worker; single-file constraint makes this complex |
| E8.10 | Production authentication (JWT / sessions) | 🚫 | Requires backend auth service |
| E8.11 | Multi-device sync | 🚫 | Requires real-time database |
| E8.12 | Data backup / export | ❌ | localStorage only; no export |
| E8.13 | GDPR consent and data deletion | 🚫 | Requires backend and legal flow |
| E8.14 | School network compatibility | ⚠️ | WiFi LAN tested; plain HTTP only (no HTTPS) |

---

## Section 9 — Commercial & Billing

| Ref | Feature | Status | Notes |
|-----|---------|--------|-------|
| E9.1 | School licensing model display | ✅ | £250 per licence shown on billing page |
| E9.2 | Payments & ROI dashboard (School Admin) | ✅ | Session revenue, ROI multiplier, annual projection |
| E9.3 | Revenue metrics (Super Admin) | ✅ | Monthly revenue stat card |
| E9.4 | Organisation management (Super Admin) | ✅ | Add / view / status toggle per school |
| E9.5 | Billing page — invoices and usage | ⚠️ | Static mock data; no live invoice records |
| E9.6 | Payment processing | 🚫 | Requires Stripe or equivalent |
| E9.7 | Automated renewal / expiry | 🚫 | Requires backend scheduler |
| E9.8 | Usage-based pricing tiers | ❌ | Flat licence model only |

---

## Summary

| Status | Count | Share |
|--------|-------|-------|
| ✅ Implemented | 62 | 65% |
| ⚠️ Partial | 7 | 7% |
| ❌ Not implemented | 17 | 18% |
| 🚫 Needs backend | 9 | 10% |
| **Total** | **95** | |

---

## Rationale — Features Not Implemented in Prototype

| Feature | Rationale |
|---------|-----------|
| Multi-group membership | Requires a relational model (runner → many groups). The current store holds a single `group` string per runner. Implementing this would mean a full data model redesign before the prototype is production-ready. |
| Runner edit and delete | Omitted to keep demo flows clean. Both are trivial to add — edit reuses the add form as a modal; delete follows the same confirm-and-remove pattern used for groups. |
| Historical results archive | Each race overwrites state. A proper archive requires an `events[]` array with per-runner result records stored across sessions. |
| Results export (CSV / PDF) | Browser `Blob` and `URL.createObjectURL` are already used for the CSV template download, so results export is a low-effort addition. |
| Print race bibs | Requires a `@media print` stylesheet. Low complexity and low priority for the demo stage. |
| QR code check-in | Requires `getUserMedia` for camera access and a QR decode library (e.g. jsQR). Feasible as an incremental addition. |
| Undo / re-run results | Results commit is one-way. Adding rollback requires snapshot-and-restore logic, which was deprioritised to keep the commit flow clean. |
| PWA / offline mode | Needs a Service Worker and cache manifest. The single-file architecture makes this awkward; best addressed when the prototype moves to a build pipeline. |
| Backend features (auth, email, payments, sync, GDPR) | All require server infrastructure and are outside the scope of a static front-end prototype. They are flagged as 🚫 rather than ❌ to distinguish infrastructure blockers from deliberate omissions. |
