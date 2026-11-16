import { describe, expect, it } from 'vitest';
import { demoPatientActions, emptyForm, filteredMedications, formatTimer, initialState, reducer, scenarioState, validatePatient, type Action, type AppState, type Scenario } from '../lib/model';
import { DEMO_STEPS, demoPosition, demoSnapshot, stepStart, TOTAL_DEMO_MS } from '../lib/demo';
const baseTime = 1_800_000_000_000;
function apply(actions: Action[], state: AppState = initialState(baseTime)) {
  return actions.reduce(reducer, state);
}
function patientState() {
  return apply(demoPatientActions);
}
const validForm = {
  ...emptyForm(),
  id: 'DEMO-001',
  age: '4',
  weight: '18'
};
describe('patient validation and recovery', () => {
  it.each(['', '0', '-2', 'not a number', 'NaN', 'Infinity'])('rejects invalid weight %j without creating a patient', weight => {
    const state = apply([{
      type: 'FORM',
      field: 'weight',
      value: weight
    }, {
      type: 'SUBMIT_PATIENT'
    }], {
      ...initialState(baseTime),
      form: validForm
    });
    expect(state.patient).toBeNull();
    expect(state.errors.weight).toBeTruthy();
    expect(state.form.id).toBe('DEMO-001');
  });
  it('rejects lb without converting a valid numeric weight', () => {
    expect(validatePatient({
      ...validForm,
      unit: 'lb'
    }).unit).toContain('no automatic conversion');
  });
  it('requires MAC as well as length for a PAWPER XL-MAC estimate', () => {
    expect(validatePatient({
      ...validForm,
      method: 'length',
      length: '100'
    }).mac).toContain('greater than 0');
  });
  it('requires an identifier and nonnegative numeric age', () => {
    expect(validatePatient({
      ...validForm,
      id: ' ',
      age: '-1'
    })).toMatchObject({
      id: expect.any(String),
      age: expect.any(String)
    });
    expect(validatePatient({
      ...validForm,
      age: '0'
    })).toEqual({});
  });
  it('preserves form data and recovers after invalid submission', () => {
    let state = apply([{
      type: 'OPEN_PATIENT'
    }, {
      type: 'FORM',
      field: 'id',
      value: 'DEMO-001'
    }, {
      type: 'FORM',
      field: 'age',
      value: '4'
    }, {
      type: 'FORM',
      field: 'weight',
      value: '0'
    }, {
      type: 'SUBMIT_PATIENT'
    }]);
    expect(state.dialog).toBe('patient');
    expect(state.events[0].title).toContain('Invalid');
    state = apply([{
      type: 'FORM',
      field: 'weight',
      value: '18'
    }, {
      type: 'SUBMIT_PATIENT'
    }], state);
    expect(state.patient).toMatchObject({
      id: 'DEMO-001',
      weight: 18,
      revision: 1
    });
    expect(state.errors).toEqual({});
    expect(state.dialog).toBeNull();
  });
  it('marks estimated weight throughout the session', () => {
    const state = scenarioState('estimated', baseTime);
    expect(state.patient?.method).toBe('estimated');
    expect(state.events.some(e => e.title === 'Estimated weight warning')).toBe(true);
  });
});
describe('reference safety and activity integrity', () => {
  it('filters generic names and category, including a genuine empty result', () => {
    expect(filteredMedications(' EPINE ', 'All').map(m => m.id)).toEqual(['epinephrine']);
    expect(filteredMedications('epine', 'Respiratory')).toEqual([]);
    expect(filteredMedications('unfindable', 'All')).toEqual([]);
    expect(filteredMedications('', 'Cardiovascular')).toHaveLength(2);
  });
  it('cannot record an unchecked or outdated review', () => {
    expect(reducer(patientState(), {
      type: 'RECORD'
    })).toEqual(patientState());
    let state = apply([{
      type: 'OPEN_REVIEW'
    }, {
      type: 'CLOSE_DIALOG'
    }, ...['identity', 'weight', 'simulation'].map(value => ({
      type: 'CHECK' as const,
      value
    }))], patientState());
    expect(reducer(state, {
      type: 'RECORD'
    }).events.at(-1)?.title).toBe('Simulated medication review recorded');
    state = apply([{
      type: 'OPEN_PATIENT'
    }, {
      type: 'FORM',
      field: 'weight',
      value: '20'
    }, {
      type: 'SUBMIT_PATIENT'
    }], state);
    expect(state.staleReview).toBe(true);
    expect(state.checks).toEqual([]);
    expect(state.patient?.revision).toBe(2);
    expect(reducer(state, {
      type: 'RECORD'
    })).toEqual(state);
    state = reducer(state, {
      type: 'OPEN_REVIEW'
    });
    expect(state.staleReview).toBe(false);
    expect(state.reviewedRevision).toBe(2);
  });
  it('changing medication or route clears dependent checks', () => {
    const state = {
      ...patientState(),
      checks: ['identity'],
      reviewedRevision: 1,
      reviewAttempted: true
    };
    expect(reducer(state, {
      type: 'SELECT_MEDICATION',
      id: 'amiodarone'
    }).checks).toEqual([]);
    expect(reducer(state, {
      type: 'ROUTE',
      value: 'IO'
    }).reviewedRevision).toBeNull();
  });
  it('blocks a review without an active patient', () => {
    const state = reducer(initialState(baseTime), {
      type: 'OPEN_REVIEW'
    });
    expect(state.dialog).toBe('patient');
    expect(state.reviewAttempted).toBe(false);
  });
  it('captures a scoped simulation dose when the review opens', () => {
    const state = reducer(patientState(), {
      type: 'OPEN_REVIEW'
    });
    expect(state.events.at(-1)?.detail).toContain('Simulation only');
    expect(state.reviewDose).toMatchObject({ amountMg: 0.18, simulationOnly: true });
    expect(state.events.at(-1)?.dose).toEqual(state.reviewDose);
    expect(state).not.toHaveProperty('volume');
  });
  it('cancelling session termination preserves patient and timer', () => {
    const state = apply([{
      type: 'TIMER_TOGGLE'
    }, {
      type: 'TIMER_TICK',
      ms: 3000
    }, {
      type: 'END_REQUEST'
    }, {
      type: 'CLOSE_DIALOG'
    }], patientState());
    expect(state.patient?.id).toBe('DEMO-001');
    expect(state.timer).toEqual({
      running: true,
      elapsed: 3000
    });
  });
  it('completion clears active context, stops timer, and preserves history', () => {
    const state = apply([{
      type: 'TIMER_TOGGLE'
    }, {
      type: 'END_REQUEST'
    }, {
      type: 'END_CONFIRM'
    }], patientState());
    expect(state.patient).toBeNull();
    expect(state.completed).toBe(true);
    expect(state.lastPatient?.id).toBe('DEMO-001');
    expect(state.timer).toEqual({
      running: false,
      elapsed: 0
    });
    expect(state.events.at(-1)?.title).toBe('Session completed');
    const next = apply(demoPatientActions, state);
    expect(next.events).toHaveLength(2);
    expect(next.completed).toBe(false);
  });
});
describe('timer', () => {
  it('starts, pauses, resumes, and resets only after confirmation', () => {
    let state = apply([{
      type: 'TIMER_TOGGLE'
    }, {
      type: 'TIMER_TICK',
      ms: 2500
    }, {
      type: 'TIMER_TOGGLE'
    }, {
      type: 'TIMER_TICK',
      ms: 1000
    }]);
    expect(state.timer.elapsed).toBe(2500);
    state = apply([{
      type: 'TIMER_TOGGLE'
    }, {
      type: 'TIMER_TICK',
      ms: 1500
    }, {
      type: 'TIMER_RESET_REQUEST'
    }], state);
    expect(state.timer.elapsed).toBe(4000);
    expect(state.dialog).toBe('timer-reset');
    state = reducer(state, {
      type: 'TIMER_RESET'
    });
    expect(state.timer).toEqual({
      elapsed: 0,
      running: false
    });
  });
  it('formats elapsed time without wrapping minutes at 60', () => {
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(61_000)).toBe('01:01');
    expect(formatTimer(3_661_000)).toBe('61:01');
  });
});
describe('deterministic guided demonstration', () => {
  it('runs the complete ten-step flow and creates the actual event history', () => {
    expect(DEMO_STEPS).toHaveLength(10);
    const state = demoSnapshot(TOTAL_DEMO_MS, baseTime).state;
    expect(state.completed).toBe(true);
    expect(state.patient).toBeNull();
    expect(state.timer.running).toBe(false);
    const titles = state.events.map(event => event.title);
    for (const title of ['Invalid patient input detected', 'Emergency session started', 'Patient details confirmed', 'Medication reference opened', 'Educational safety review opened', 'Simulated medication review recorded', 'Demonstration timer started', 'Demonstration timer reset', 'Patient weight or identity edited', 'Previous medication review invalidated', 'Session completed']) expect(titles).toContain(title);
  });
  it('seeking backwards and replaying repeatedly produces identical states', () => {
    const expected = demoSnapshot(TOTAL_DEMO_MS, baseTime);
    for (let iteration = 0; iteration < 3; iteration++) {
      for (let index = 9; index >= 0; index--) {
        const time = stepStart(index) + 120;
        expect(demoPosition(time).index).toBe(index);
        expect(demoSnapshot(time, baseTime)).toEqual(demoSnapshot(time, baseTime));
      }
      expect(demoSnapshot(TOTAL_DEMO_MS, baseTime)).toEqual(expected);
    }
  });
  it('a frozen playhead cannot advance the timer', () => {
    const time = stepStart(6) + 2500;
    const snapshot = demoSnapshot(time, baseTime);
    expect(snapshot.state.timer.running).toBe(true);
    expect(snapshot.state.timer.elapsed).toBe(1700);
    expect(demoSnapshot(time, baseTime).state.timer).toEqual(snapshot.state.timer);
  });
  it('step 3 blocks the invalid patient and step 4 recovers', () => {
    const invalid = demoSnapshot(stepStart(3) - 1, baseTime).state;
    expect(invalid.patient).toBeNull();
    expect(invalid.errors.weight).toBeTruthy();
    const valid = demoSnapshot(stepStart(4) - 1, baseTime).state;
    expect(valid.patient?.weight).toBe(18);
    expect(valid.dialog).toBeNull();
  });
  it('step 8 invalidates the earlier recorded review at 20 kg', () => {
    const state = demoSnapshot(stepStart(8) - 1, baseTime).state;
    expect(state.patient?.weight).toBe(20);
    expect(state.staleReview).toBe(true);
    expect(state.checks).toEqual([]);
  });
});
describe('presentation scenarios', () => {
  it.each(['invalid', 'estimated', 'missing', 'offline', 'weight', 'end'] as Scenario[])('%s prepares a genuine recoverable UI state', scenario => {
    const state = scenarioState(scenario, baseTime);
    expect(state.events.length).toBeGreaterThan(0);
    if (scenario === 'invalid') expect(state.errors.weight).toBeTruthy();
    if (scenario === 'estimated') expect(state.patient?.method).toBe('estimated');
    if (scenario === 'missing') expect(state.selectedMedication).toBe('salbutamol');
    if (scenario === 'offline') expect(state.offline).toBe(true);
    if (scenario === 'weight') expect(state.staleReview).toBe(true);
    if (scenario === 'end') expect(state.dialog).toBe('end');
  });
});
