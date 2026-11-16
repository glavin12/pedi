# PediRescue: demonstrate the human experience

The intended audience is a medical professional using a tablet. The design hypothesis is that the patient, current task, and next action should be recognizable without explanation. This is a university prototype; usability with that audience has **not** yet been validated.

## What changed inside the tablet

| Usability problem | Interaction in this version | What to observe |
| --- | --- | --- |
| Small text and crowded navigation | Four persistent labelled navigation buttons, readable content, prominent weight, and large main controls | Can the participant find Medicines without help? |
| Unclear starting point | A single patient-start action and three concrete task choices | Do they know what to do first? |
| Having to remember patient details | Patient ID, age, kg weight, and measured/estimated source stay visible | Can they identify the current weight from another screen? |
| Disabled actions without an explanation | Medication review reveals its checklist when available and states the number of checks remaining | Do they understand why Record review is unavailable? |
| Too much information at once | Calculation status and estimator provenance use expandable details | Can they complete the main task without opening every detail? |
| No clear feedback after recording | A recorded state links to the actual activity entry; duplicate recording is blocked | Do they recognize that their action succeeded? |
| Lost entries after an accidental close | A dirty patient form offers Keep editing or Discard entries | Can they recover the draft? |
| Outdated patient context | Weight, source-measurement, identity, and age changes invalidate dependent review state | Do they notice that a fresh review is required? |

Clinical warnings stay inside the tablet. Academic HCI principles and scenario controls stay in the presentation panel.

## Five-task moderated test

Use fictional data. Give each task without describing the navigation. Ask the participant to think aloud. Do not guide them unless they become stuck; record any assistance.

| Task | Successful observable outcome |
| --- | --- |
| Add DEMO-001, age 4 years. Enter 0 kg, then correct it to 18 kg. | They recognize the error, preserve their other entries, and confirm the corrected patient. |
| Find Epinephrine and record an educational review. | They find the medicine, explain the simulation dose and its formula, complete the checklist, and find the same dose snapshot in Activity. They recognise that the example is not clinically validated. |
| Change the weight from 18 kg to 20 kg after reviewing. | They recognize the outdated-review warning and can begin another review. |
| Start, pause, and reset the demonstration timer. | They understand the timer state and the reset confirmation. |
| Begin editing the patient, close the form accidentally, and recover the entries. Then cancel an accidental End session action. | They recover the draft and keep the confirmed session active. |

For the PAWPER option, separately ask the participant to find Length + MAC, enter fictional measurements, and explain how they know the result is estimated. Keep the underlying reference version and its limitations visible.

## Record real observations

| Participant | Task | Completed without help? | Time | Wrong taps / errors | Help needed | Ease, 1–7 | Observation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |
| | | | | | | | |
| | | | | | | | |

Compare outcomes with the earlier interface if you retain a copy. Do not invent completion times, satisfaction scores, or clinical-user feedback. Automated software tests do not establish that the interface is easy for clinicians.

## Design references

- [W3C target size, enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced): 44 × 44 CSS pixels for pointer targets, subject to the criterion’s exceptions. The main tablet controls aim at 44–48 px; this is a design target, not a claim of audited WCAG conformance.
- [FDA human factors considerations](https://www.fda.gov/medical-devices/human-factors-and-medical-devices/human-factors-considerations): consider intended users, their environment, and the interface together. Used as design background; this prototype has no device approval or clinical validation.

Final visual checks, pointer interaction, keyboard traversal, and observation with representative participants remain necessary on the actual presentation device.
