import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculateDose } from '../lib/doses';
import { demoPatientActions, initialState, MEDICATIONS, reducer, scenarioState, type Action, type AppState } from '../lib/model';
import { DEMO_STEPS, demoSnapshot, stepStart, TOTAL_DEMO_MS } from '../lib/demo';
import { DoseDetails, Medications, Resuscitation, SessionActivity } from '../components/clinical';

const apply = (actions: Action[], state: AppState = initialState(0)) => actions.reduce(reducer, state);
const patientState = () => apply(demoPatientActions);
const patient = () => patientState().patient!;
const acknowledge: Action[] = [{ type: 'OPEN_REVIEW' }, { type: 'CLOSE_DIALOG' }, ...['identity', 'weight', 'simulation'].map(value => ({ type: 'CHECK' as const, value })), { type: 'OPEN_RECORD' }, { type: 'RECORD' }];
const dispatch = () => {};

describe('reference arithmetic', () => {
  it.each([['epinephrine', 0.18], ['amiodarone', 90], ['adenosine', 1.8], ['atropine', 0.36], ['salbutamol', 2.5]] as const)('%s calculates the expected 4-year, 18 kg example', (id, expected) => {
    const medicine = MEDICATIONS.find(item => item.id === id)!;
    const result = calculateDose(patient(), id, medicine.route);
    expect(result.dose?.amountMg).toBeCloseTo(expected);
    expect(result.dose?.sourceUrl).toMatch(/^https:\/\//);
    expect(result.dose?.indication).not.toBe('');
    expect(result.dose?.simulationOnly).toBe(true);
    expect(result.dose?.formula).not.toContain('NaN');
  });
  it.each([['epinephrine', 1], ['amiodarone', 300], ['adenosine', 6], ['atropine', 0.5]] as const)('%s applies its single-dose maximum', (id, expected) => {
    const result = calculateDose({ ...patient(), weight: 120 }, id, id === 'adenosine' ? 'IV' : 'IV / IO');
    expect(result.dose?.amountMg).toBe(expected);
    expect(result.dose?.adjustment).toContain('Maximum applied');
  });
  it('applies the atropine minimum without hiding the unbounded calculation', () => {
    const result = calculateDose({ ...patient(), age: 2, ageUnit: 'months', weight: 4 }, 'atropine', 'IV');
    expect(result.dose).toMatchObject({ rawMg: 0.08, amountMg: 0.1 });
    expect(result.dose?.adjustment).toContain('Minimum applied');
  });
  it.each([['years', 6], ['months', 72], ['days', 2191.5]] as const)('normalises salbutamol age from %s at the six-year boundary', (ageUnit, age) => {
    expect(calculateDose({ ...patient(), ageUnit, age }, 'salbutamol', 'Inhaled').dose?.amountMg).toBe(5);
    expect(calculateDose({ ...patient(), ageUnit, age: age - 0.01 }, 'salbutamol', 'Inhaled').dose?.amountMg).toBe(2.5);
  });
  it('uses weight for cardiac examples and age bands for salbutamol', () => {
    expect(calculateDose({ ...patient(), age: 6 }, 'epinephrine', 'IV').dose?.amountMg).toBe(0.18);
    expect(calculateDose({ ...patient(), age: 6 }, 'salbutamol', 'Inhaled').dose?.amountMg).toBe(5);
    expect(calculateDose({ ...patient(), weight: 20 }, 'epinephrine', 'IV').dose?.amountMg).toBe(0.2);
    expect(calculateDose({ ...patient(), weight: 20 }, 'salbutamol', 'Inhaled').dose?.amountMg).toBe(2.5);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid weight %s', weight => {
    expect(calculateDose({ ...patient(), weight }, 'epinephrine', 'IV').dose).toBeUndefined();
  });
  it.each([{ age: 27, ageUnit: 'days' }, { age: 19, ageUnit: 'years' }, { age: NaN, ageUnit: 'years' }, { age: 4, ageUnit: 'weeks' }])('rejects unsupported patient age $age $ageUnit', age => {
    expect(calculateDose({ ...patient(), ...age }, 'epinephrine', 'IV').dose).toBeUndefined();
  });
  it('includes the prototype age boundaries and the narrower salbutamol scope', () => {
    expect(calculateDose({ ...patient(), age: 28, ageUnit: 'days' }, 'epinephrine', 'IO').dose).toBeDefined();
    expect(calculateDose({ ...patient(), age: 18 }, 'epinephrine', 'IO').dose).toBeDefined();
    for (const age of [0.5, 16]) expect(calculateDose({ ...patient(), age }, 'salbutamol', 'Inhaled').dose).toBeUndefined();
    for (const age of [1, 15.99]) expect(calculateDose({ ...patient(), age }, 'salbutamol', 'Inhaled').dose).toBeDefined();
  });
  it('returns reasons for missing patients, unsupported routes, and missing references', () => {
    expect(calculateDose(null, 'epinephrine', 'IV').reason).toContain('Add a patient');
    expect(calculateDose(patient(), 'unknown', 'IV').reason).toContain('No dose example');
    expect(calculateDose(patient(), 'epinephrine', 'Inhaled').dose).toBeUndefined();
    expect(calculateDose(patient(), 'salbutamol', 'Inhaled', true).dose).toBeUndefined();
  });
});

describe('dose details across the complete journey', () => {
  it.each(MEDICATIONS)('$name records the same reviewed dose with patient, route, formula, and source', medicine => {
    const selected = reducer(patientState(), { type: 'SELECT_MEDICATION', id: medicine.id });
    const opened = reducer(selected, { type: 'OPEN_REVIEW' });
    const recorded = apply(acknowledge, selected);
    const event = recorded.events.at(-1)!;
    expect(recorded.reviewRecorded).toBe(true);
    expect(event.dose).toEqual(opened.reviewDose);
    expect(event.dose?.patient).toMatchObject({ id: 'DEMO-001', age: 4, weight: 18, revision: 1 });
    expect(event.detail).toContain(event.dose!.formula);
    expect(event.detail).toContain(event.dose!.route);
    const roundTrip = JSON.parse(JSON.stringify({ events: recorded.events }));
    expect(roundTrip.events.at(-1).dose).toEqual(event.dose);
    const html = renderToStaticMarkup(<><Medications state={selected} dispatch={dispatch} /><DoseDetails dose={opened.reviewDose!} /><SessionActivity state={recorded} dispatch={dispatch} /></>);
    expect(renderToStaticMarkup(<DoseDetails dose={opened.reviewDose!} />)).toContain(`<h3>${medicine.name}</h3>`);
    expect(html).toContain('EDUCATIONAL DOSE EXAMPLE');
    expect(html).toContain('View saved dose details');
    expect(html).toContain('SAVED DOSE SNAPSHOT');
    expect(html).toContain(event.dose!.sourceUrl);
    expect(html).not.toContain('NaN');
  });
  it('recalculates after patient edits while preserving the old recorded snapshot after completion', () => {
    let state = apply(acknowledge, patientState());
    const saved = state.events.at(-1)!.dose!;
    state = apply([{ type: 'OPEN_PATIENT' }, { type: 'FORM', field: 'weight', value: '20' }, { type: 'SUBMIT_PATIENT' }], state);
    expect(state.staleReview).toBe(true);
    expect(state.reviewDose).toBeNull();
    expect(state.events.at(-1)?.dose?.amountMg).toBe(0.2);
    expect(state.events.find(event => event.title === 'Simulated medication review recorded')?.dose).toEqual(saved);
    expect(saved.patient.weight).toBe(18);
    expect(reducer(state, { type: 'RECORD' })).toEqual(state);
    state = apply(acknowledge, state);
    expect(state.events.at(-1)?.dose?.amountMg).toBe(0.2);
    state = apply([{ type: 'END_REQUEST' }, { type: 'END_CONFIRM' }], state);
    const recordings = state.events.filter(event => event.title === 'Simulated medication review recorded');
    expect(recordings.map(event => event.dose!.patient.weight)).toEqual([18, 20]);
    expect(recordings.map(event => event.dose!.amountMg)).toEqual([0.18, 0.2]);
  });
  it('blocks recording a missing reference and recovers by selecting a different medicine', () => {
    let state = apply(acknowledge, scenarioState('missing', 0));
    expect(state.reviewRecorded).toBe(false);
    expect(state.checks).toEqual([]);
    expect(state.reviewDose).toBeNull();
    state = apply([{ type: 'SELECT_MEDICATION', id: 'epinephrine' }, ...acknowledge], state);
    expect(state.reviewRecorded).toBe(true);
    expect(calculateDose(patient(), 'salbutamol', 'Inhaled').dose).toBeDefined();
  });
  it('blocks acknowledgement and recording for unsupported ages', () => {
    const state = apply([{ type: 'OPEN_PATIENT' }, { type: 'FORM', field: 'age', value: '0' }, { type: 'SUBMIT_PATIENT' }, ...acknowledge], patientState());
    expect(state.reviewDose).toBeNull();
    expect(state.reviewRecorded).toBe(false);
    expect(state.checks).toEqual([]);
  });
  it('retains estimation provenance and uses the same offline arithmetic', () => {
    const estimated = apply([{ type: 'OPEN_PATIENT' }, { type: 'FORM', field: 'method', value: 'length' }, { type: 'FORM', field: 'length', value: '137' }, { type: 'FORM', field: 'mac', value: '26' }, { type: 'SUBMIT_PATIENT' }, ...acknowledge], patientState());
    expect(estimated.reviewDose?.patient.estimation).toMatchObject({ lengthCm: 137, macCm: 26, weightKg: 42 });
    const online = apply(acknowledge, patientState());
    const offline = apply([{ type: 'OFFLINE', value: true }, ...acknowledge], patientState());
    expect(offline.reviewDose).toEqual(online.reviewDose);
  });
  it('shows related numeric examples in every resuscitation category', () => {
    for (const reference of ['Cardiac arrest', 'Bradycardia', 'Tachycardia', 'Respiratory emergencies']) {
      const html = renderToStaticMarkup(<Resuscitation state={{ ...patientState(), reference }} dispatch={dispatch} />);
      expect(html).toContain('Related medicine examples');
      expect(html).toContain(' mg');
    }
  });
  it('runs all five medicines in the guided demo and keeps the old dose after the weight edit', () => {
    expect(DEMO_STEPS).toHaveLength(10);
    const state = demoSnapshot(TOTAL_DEMO_MS, 0).state;
    expect(state.events.filter(event => event.title === 'Medication reference opened').map(event => event.dose?.medicineId).sort()).toEqual(MEDICATIONS.map(item => item.id).sort());
    expect(state.events.find(event => event.title === 'Simulated medication review recorded')?.dose?.amountMg).toBe(0.18);
    expect(state.events.find(event => event.title === 'Dose example recalculated')?.dose?.amountMg).toBe(0.2);
    const paused = demoSnapshot(stepStart(5) + 1000, 0).state;
    expect(paused.dialog).toBe('review');
    expect(paused.reviewDose?.amountMg).toBe(0.18);
  });
});
