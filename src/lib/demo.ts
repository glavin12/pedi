import { initialState, reducer, type Action, type AppState } from './model';
interface Cue {
  at: number;
  action: Action;
  focus?: string;
}
interface Step {
  title: string;
  description: string;
  principle: string;
  duration: number;
  cues: Cue[];
}
const cue = (at: number, action: Action, focus?: string): Cue => ({
  at,
  action,
  focus
});
const typeText = (start: number, field: 'id' | 'age' | 'weight', value: string): Cue[] => value.split('').map((_, index) => cue(start + index * 170, {
  type: 'FORM',
  field,
  value: value.slice(0, index + 1)
}, `field-${field}`));
export const DEMO_STEPS: Step[] = [{
  title: 'Begin an emergency session',
  description: 'A clear starting point keeps the first action simple and predictable.',
  principle: 'Recognition rather than recall',
  duration: 3000,
  cues: [cue(300, {
    type: 'OPEN_PATIENT'
  }, 'patient-dialog')]
}, {
  title: 'Identify the patient',
  description: 'Enter fictional patient details. Units stay visible beside each measurement.',
  principle: 'Consistency and standards',
  duration: 4000,
  cues: [...typeText(200, 'id', 'DEMO-001'), ...typeText(2200, 'age', '4')]
}, {
  title: 'Catch an invalid measurement',
  description: 'A weight of 0 kg is rejected. The error explains how to recover without losing the form.',
  principle: 'Error prevention',
  duration: 4500,
  cues: [cue(200, {
    type: 'FORM',
    field: 'weight',
    value: '0'
  }, 'field-weight'), cue(700, {
    type: 'SUBMIT_PATIENT'
  }, 'field-weight')]
}, {
  title: 'Correct and confirm',
  description: 'Correct the weight to 18 kg. The patient summary becomes visible throughout the workspace.',
  principle: 'Error recognition and recovery',
  duration: 4000,
  cues: [...typeText(300, 'weight', '18'), cue(1400, {
    type: 'SUBMIT_PATIENT'
  }, 'patient-strip')]
}, {
  title: 'Explore all five dose examples',
  description: 'Browse each medicine, then find Epinephrine. The 18 kg example shows 0.18 mg with its formula, route, and limits.',
  principle: 'Recognition rather than recall',
  duration: 10000,
  cues: [cue(100, {
    type: 'NAVIGATE',
    screen: 'medications'
  }), ...['amiodarone', 'adenosine', 'atropine', 'salbutamol'].map((id, index) => cue(800 + index * 1400, { type: 'SELECT_MEDICATION', id }, 'dose-details')), ...'Epinephrine'.split('').map((_, index) => cue(6500 + index * 120, {
    type: 'SEARCH',
    value: 'Epinephrine'.slice(0, index + 1)
  }, 'medication-search')), cue(8200, {
    type: 'SELECT_MEDICATION',
    id: 'epinephrine'
  }, 'dose-details')]
}, {
  title: 'Review safely in study mode',
  description: 'The review and record dialogs show the same 0.18 mg example. Acknowledge three checks, then inspect the saved dose in Activity.',
  principle: 'Error prevention',
  duration: 11000,
  cues: [cue(300, {
    type: 'OPEN_REVIEW'
  }, 'review-dialog'), cue(3500, {
    type: 'CLOSE_DIALOG'
  }), cue(4000, {
    type: 'CHECK',
    value: 'identity'
  }), cue(4300, {
    type: 'CHECK',
    value: 'weight'
  }), cue(4600, {
    type: 'CHECK',
    value: 'simulation'
  }), cue(5100, {
    type: 'OPEN_RECORD'
  }), cue(7000, {
    type: 'RECORD'
  }), cue(8300, { type: 'NAVIGATE', screen: 'activity' }, 'activity-timeline')]
}, {
  title: 'Use the demonstration timer',
  description: 'Start, pause, and reset the real timer. Reset requires an explicit confirmation.',
  principle: 'User control and freedom',
  duration: 8500,
  cues: [cue(100, {
    type: 'NAVIGATE',
    screen: 'resuscitation'
  }), cue(400, {
    type: 'REFERENCE',
    value: 'Cardiac arrest'
  }), cue(800, {
    type: 'TIMER_TOGGLE'
  }, 'timer'), cue(3800, {
    type: 'TIMER_TOGGLE'
  }, 'timer'), cue(4300, {
    type: 'TIMER_RESET_REQUEST'
  }), cue(6600, {
    type: 'TIMER_RESET'
  })]
}, {
  title: 'Invalidate an outdated review',
  description: 'Change 18 kg to 20 kg: the example updates from 0.18 mg to 0.2 mg and the old checks clear. The saved 18 kg review remains unchanged in Activity.',
  principle: 'Visibility of system status',
  duration: 5000,
  cues: [cue(100, {
    type: 'NAVIGATE',
    screen: 'medications'
  }), cue(400, {
    type: 'OPEN_PATIENT'
  }), cue(1300, {
    type: 'FORM',
    field: 'weight',
    value: '20'
  }, 'field-weight'), cue(2300, {
    type: 'SUBMIT_PATIENT'
  }, 'stale-warning')]
}, {
  title: 'Inspect the activity trail',
  description: 'Review the actual events created by the demonstration, including validation failures and safety blocks.',
  principle: 'Visibility of system status',
  duration: 5000,
  cues: [cue(100, {
    type: 'NAVIGATE',
    screen: 'activity'
  }, 'activity-timeline')]
}, {
  title: 'End the session deliberately',
  description: 'An explicit confirmation prevents accidental termination. The completed summary stays available.',
  principle: 'User control and freedom',
  duration: 5000,
  cues: [cue(300, {
    type: 'END_REQUEST'
  }), cue(3000, {
    type: 'END_CONFIRM'
  })]
}];
export const TOTAL_DEMO_MS = DEMO_STEPS.reduce((sum, step) => sum + step.duration, 0);
export function stepStart(index: number) {
  return DEMO_STEPS.slice(0, index).reduce((sum, step) => sum + step.duration, 0);
}
export function demoPosition(time: number) {
  let offset = 0;
  for (let index = 0; index < DEMO_STEPS.length; index++) {
    if (time < offset + DEMO_STEPS[index].duration) return {
      index,
      elapsed: time - offset
    };
    offset += DEMO_STEPS[index].duration;
  }
  return {
    index: DEMO_STEPS.length - 1,
    elapsed: DEMO_STEPS.at(-1)!.duration
  };
}
// Replay the same reducer actions used by manual controls. Seeking never relies on stale UI state.
export function demoSnapshot(time: number, baseTime: number): {
  state: AppState;
  focus: string | undefined;
} {
  let state = initialState(baseTime);
  let offset = 0;
  let previousTime = 0;
  let focus: string | undefined;
  const advanceTimer = (nextTime: number) => {
    state = reducer(state, {
      type: 'TIMER_TICK',
      ms: nextTime - previousTime
    });
    previousTime = nextTime;
  };
  for (const step of DEMO_STEPS) {
    for (const item of step.cues) {
      const at = offset + item.at;
      if (at > time) {
        advanceTimer(time);
        return {
          state,
          focus
        };
      }
      advanceTimer(at);
      state = reducer(state, {
        ...item.action,
        now: baseTime + at
      });
      focus = item.focus;
    }
    offset += step.duration;
  }
  advanceTimer(time);
  return {
    state,
    focus
  };
}
