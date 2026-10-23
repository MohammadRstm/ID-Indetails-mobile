# Decisions

The answers to the Phase 0 plan's "Decisions needed" ([phase-0-plan.md](phase-0-plan.md#decisions-needed)). The plan was approved on 8 Oct 2026, with the instruction to build every phase.

Where the approval didn't answer a question, the plan's proposed default applies. Each one is marked **default**. All of them can still be changed; the ones that become permanent are marked.

| # | Question | Answer |
|---|---|---|
| 1 | App name and id | Store name **ID InDetails**. Base id **`com.indetails.app`** (**default; confirm before the first store upload**, after which it can't change). Deep-link scheme `idindetails` |
| 2 | Database changes | **DB-1 to DB-4 approved** with the plan. **DB-5 (material receipts) is not built** until asked for (decision 13). No migration is applied to any shared or production database without a separate go-ahead |
| 3 | Mobile session | 30 days since last use, no absolute cap; refresh replay grace 5 minutes; a stale replay ends only that session (**default**) |
| 4 | Project titles in non-money pushes | Allowed (**default**) |
| 5 | Message pushes | Sender and a short preview (**default**) |
| 6 | Quiet hours | 22:00–07:00 company time, delivered silently; per-person settings (DB-4) in V1 (**default**) |
| 7 | Reminders | Log your hours: in the hour before the person's working day ends, when they have logged less than the day requires. Labour week: Saturday from 15:00, to Execution people with `labour_report:create` who recorded anything on a site in the last 4 weeks whose current week isn't reported yet (**default**) |
| 8 | Date of offline materials | (a) the server's time: no change (**default**; the safer choice, since it doesn't trust a phone's date for money) |
| 9 | Preview builds | Point at the production API (**default**) |
| 10 | Store distribution | Not needed for code; decided before the first store upload |
| 11 | Biometric relock | After 5 minutes in the background (**default**) |
| 12 | Theme | Follow the phone's light/dark setting by default, with Light / Dark / System in the app (**default**) |
| 13 | Material receipts | Not built (see 2) |
| 14 | Timer on sign-out | Keep a stopped but not-yet-logged timer run for that person, so their time isn't lost (decided 8 Oct 2026; the plan's "clear the timer" no longer applies to unlogged runs) |
| 15 | Log work's "Use a timer instead" while a timer runs | Not offered: the running timer is stopped first, on Today, so its time is kept (decided 23 Oct 2026; the web replaces the running timer) |
| 16 | A comma typed in a number field | A lone comma is the decimal mark, as the decimal keypad types it in regions that write 12,5; beside a dot, or several, commas group thousands. Whole-number fields read commas as thousands (decided 23 Oct 2026; the web drops every comma) |
