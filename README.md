# PediRescue

A working pediatric emergency **HCI simulation**, presented inside a landscape tablet. Fictional data only. Not for clinical use.

## Run locally

Requires Node.js **24.x** and npm. The application is at the repository root.

```sh
git clone https://github.com/glavin12/pedi.git
cd pedi
npm ci
npm run dev
```

Open **http://localhost:5173**. No environment variables, API keys, database, or backend are needed. With nvm installed, run `nvm use` before installing dependencies.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import **glavin12/pedi**.
2. Keep the root directory as **./**. The checked-in configuration supplies these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 24.x, selected by `package.json` |
| Environment variables | None |

3. Choose **Deploy**. Vercel builds from source; generated `dist/` files do not need to be committed.

The UI uses local React state instead of URL-based routes. All four workspaces are available from the deployed root page. A refresh starts a new in-memory simulation.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Present the prototype

Choose **Start guided demo** for the ten-step walkthrough. The walkthrough is about 60 seconds at 1×. It browses all five medicine examples, shows the same calculated dose in both review dialogs, records it in Activity, and demonstrates recalculation after a weight edit. The controls support pause/resume, previous/next, restart, exit, and 1.5× speed. Clicking inside the tablet pauses playback. The six scenario shortcuts prepare genuine application states for inspection and recovery. Reset workspace returns to standby.

### Give the demo yourself (about 3 minutes)

1. Choose **Reset workspace**, then **Start emergency session**. Use fictional ID **DEMO-001**, age **4 years**, and measured weight **18 kg**. To show error recovery, first submit **0 kg**, then correct it to **18 kg** and confirm.
2. Open **Medicines → Epinephrine**. Point out **0.18 mg**, the **18 kg × 0.01 mg/kg** calculation, the cardiac-arrest indication, route, and limit. Expand **Age logic, source & scope**. Explain that age checks eligibility; it is not an extra multiplier for this formula.
3. Select **Review safety**. The dialog repeats the same dose and patient context. Choose **Continue to checklist**, acknowledge all three checks, then **Record review**. The confirmation shows the dose again. Add an optional observation and select **Record review** to save it.
4. Open **Activity** and expand **View saved dose details** on the recorded review. Show the patient, dose, route, formula, limits, source, and revision. The entry is a simulation review, not medication administration.
5. Choose **Edit patient**, change weight to **20 kg**, and save. Return to **Medicines**: the example is now **0.2 mg**, old checks have cleared, and a warning asks for a fresh review. In **Activity**, the earlier recording still shows **18 kg / 0.18 mg**. You can repeat the review to save the new value too.
6. Clear the medicine search to browse the other medicines. For an age-dependent example, choose **Salbutamol**: age **4 years** shows **2.5 mg** in the nebulised example; change the age to **6 years** to show **5 mg** and cleared checks. This example covers ages 1–15 only.
7. Open **Resuscitation**. Switch categories, inspect the related medicine examples, and start/pause/reset the timer. Return to **Activity** to show these events. Finish with **End session → Confirm end session**; the completed record remains available for export.

For hands-free playback, use **Start guided demo**. Pause while explaining; use numbered steps or Previous/Next to revisit a stage. Clicking inside the tablet pauses playback. **Resume** returns to the scripted state at that playhead; exit the demo to keep exploring manually. Refreshing clears the in-memory session, so export before refreshing if you need the record.

Fullscreen tablet hides the presentation panel. Use the exit icon in the tablet header or Escape to return. All four sections remain usable manually.

Expand the existing **HCI principle in focus** strip to see examples of Norman’s seven design concepts and Nielsen’s ten heuristics. The notes follow the current workspace and stay collapsed by default. The palette, typography, tablet frame, and four-section layout are retained. Workspace Help supports keyboard focus, Escape dismissal, and returning focus to its button.

## Develop

```sh
npm test
npm run build
npm run standalone
```

The production web build is in `dist/`. After building, the standalone command generates **PediRescue.html**: one file that can be opened directly in Chrome, Edge, or Firefox without a server or internet. Its JavaScript, CSS, icons, and font are embedded. Generated builds, standalone HTML, and ZIP archives are ignored by Git; teammates regenerate them with the commands above.

## What works

- Task-focused tablet interface: **Patient → Medicines → Resuscitation → Activity**, with visible patient context, readable type, and large touch controls. The four navigation buttons stay outside the scrolling content, show a large icon and label, and mark the current section with a solid blue background, text, and a check.
- Clear next actions and progressive disclosure: choose a medicine, open its safety review, complete a checklist with a remaining-check count, and receive visible recorded confirmation.
- Patient-form cancellation protects unsaved entries. Duplicate recording is blocked, and patient age changes invalidate dependent reviews as well as weight/source changes.
- Four clinical workspaces: emergency dashboard, medication references, resuscitation, and session activity.
- Medicines and all four resuscitation categories include sourced study summaries. Source details and scope explanations expand on demand; the timer remains visible when switching tasks.
- Patient setup and editing with missing, zero, negative, nonnumeric, and incorrect-unit validation. Invalid data stays in the form for correction.
- Explicit measured/estimated weight sources. The Length-based option uses the original PAWPER XL-MAC 2017 Table 2 lookup with body length and mid-arm circumference (MAC), a live estimated weight, and retained source measurements.
- Medication name search, category filtering, empty results, route selection, reference-based dose examples for all five medicines, safety review, verification checks, and educational activity recording with saved dose snapshots.
- Missing-reference and simulated-offline recovery. No reference becomes clinically verified through acknowledgement.
- A real start/pause/resume timer, with confirmed reset and activity events.
- Patient-context revisions invalidate dependent reviews and clear their checks.
- Session completion requires confirmation; completed history remains readable and exportable. Starting another session begins a fresh activity trail.
- Deterministic ten-step demo with visible typing, validation, real activity history, timer use, weight-change invalidation, and session completion.
- Six recoverable HCI scenarios, keyboard focus states, reduced-motion support, responsive mobile navigation, and fullscreen tablet mode.

## Design and implementation

React, TypeScript, Vite, Tailwind CSS, Lucide, and Radix-backed shadcn-style local UI components. Restrained CSS transitions respect reduced-motion preferences. Noto Sans is embedded locally under the included font license. Motion and external font downloads were omitted because the build environment had no network access; the complete interaction behavior works offline.

`src/lib/doses.ts` contains the shared dose arithmetic. `src/lib/model.ts` contains the shared application reducer and validation. Both manual controls and the demo invoke these actions. `src/lib/demo.ts` reconstructs the app from a virtual playhead, so seeking and restarting cannot inherit stale timers, checks, or patient data. Demo pause freezes virtual time. Manual timers use elapsed wall-clock deltas and clean up their interval when stopped.

Tablet dialogs deliberately remain modeless relative to the outer demonstration controls, so the professor can pause, seek, or reset while inspecting a dialog. Inside the tablet, an overlay blocks accidental interaction with the workspace. Dialogs have accessible names, descriptions, Escape handling, and close controls.

## Clinical boundaries

The medicine workspace includes scoped, reference-based **single-dose arithmetic examples** for fictional patients. It does not choose treatment, assess contraindications, or supply clinical concentrations, administration volumes, preparation instructions, repeat-dose schedules, treatment algorithms, or medical timing recommendations. The PAWPER XL-MAC weight estimate is an educational implementation of published numerical reference data; this software has not been clinically validated. Every example shows its specific indication, route, age and weight context, formula, minimum/maximum where applicable, source, and reference version. Cardiac examples use weight and an age eligibility check; salbutamol uses an age band rather than an invented weight multiplier. All five examples work in the normal workspace; only the explicit Missing reference scenario disables salbutamol. An educational review never represents medication administration, clinical approval, or reference verification.

### PAWPER XL-MAC

Choose **Start emergency session → Length-based** and enter body length and MAC in centimetres, with at most one decimal place. The supported length range is **43.0–180.0 cm**, inclusive, for fictional pediatric patients aged 0–18 years. Length-only estimation, interpolation, extrapolation, and silent rounding are unavailable. The table's first and last habitus categories have open MAC tails; these categories display an additional caution. This lookup does not establish whether an entered measurement is physiologically plausible.

The result is estimated **total body weight**, with its length band, habitus score, source version, and original measurements. For the paper's worked example, **137 cm + 26 cm MAC → 42 kg (HS6)**. All workspaces retain the estimated label. Editing either source measurement invalidates a previous medication review even if the estimated kilograms stay the same. Replacing the estimate with a measured weight removes active estimator provenance while keeping the session history.

Source: Wells M, Goldstein LN, Bentley A. *South African Medical Journal* 2017;107(11):1015–1021, **Table 2, p. 1018**. [Original article and table](https://www.scielo.org.za/scielo.php?script=sci_arttext&pid=S0256-95742017001100022), [DOI](https://doi.org/10.7196/SAMJ.2017.v107i11.12505). Original article: CC BY-NC 4.0. This educational adaptation transcribes numerical data and implements the inclusive, one-decimal ranges printed in that table.

The later 2019 PLOS ONE supplementary spreadsheet (DOI: 10.1371/journal.pone.0210332.s001) disagrees with the original table on several MAC cut-offs, boundary handling, and its final length limit (200 cm rather than the original 180 cm). It also contains a 221.5 cm MAC cut-off in the 96.9–100.6 cm band. This implementation consistently follows the **original 2017 table**, without combining the two versions. It does not claim to reproduce later commercial tape revisions.

Session state is held in memory and clears on refresh. Export includes only the current fictional session. No patient data is sent anywhere.

## Verification

See **[USABILITY.md](USABILITY.md)** for the design rationale, five concrete observation tasks, and a blank results sheet. These are proposed tests, not fabricated participant results. The revised interface is a design hypothesis that still needs observation with representative medical users.

Automated checks cover validation/recovery, unit rejection, estimated weight, reference search, review invalidation, guarded activity recording, timer controls, confirmation cancellation, session completion, all six scenarios, deterministic backward seeking, repeated demos, frozen-playhead timing, and server rendering of the actual screen components. PAWPER-specific tests compare all 34 length bands and seven habitus categories against an independently extracted fixture from the original Table 2, including category boundaries, the published worked example, invalid measurements, pediatric age limits, estimate provenance, and review invalidation after measurement edits. Passing these tests checks software behavior, not clinical validity.

The production build and automated checks cover dose arithmetic, age and route constraints, dose limits, all five recording journeys, retained estimation provenance, saved history after patient edits and session completion, missing-reference recovery, offline arithmetic, and deterministic demo replay. Passing these checks establishes software behavior, not clinical validation. See the task report for the current test count and live-preview status.

An earlier live desktop check at localhost:5173 covered fullscreen navigation, invalid-weight rejection and recovery, patient confirmation, medication safety review, checklist completion, recorded-review feedback, review invalidation after a weight edit, and recovery of an accidentally closed patient draft. Mobile touch behavior, the remaining live scenarios, and observation with representative medical users still need verification. No claim of clinical usability validation or audited accessibility conformance is made.
