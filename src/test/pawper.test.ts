import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import table from './fixtures/pawper-2017-table2.json';
import { evaluatePawper } from '../lib/pawper';
import { emptyForm, initialState, reducer, validatePatient, type AppState, type PatientForm } from '../lib/model';
import { Dashboard, Medications, PatientStrip, PawperFields, SessionActivity } from '../components/clinical';

// Independently extracted from the original PDF, p. 1018, Table 2 (not the production arrays).
// Each row: length min/max, IBW, HS1 TBW/upper MAC, HS2–6 TBW/lower/upper MAC, HS7 TBW/lower MAC.
describe('PAWPER XL-MAC 2017 published reference', () => {
  it.each(table)('matches all seven habitus categories for the %s–%s cm band', (...row) => {
    const [min, max] = row;
    const weights = [3, 5, 8, 11, 14, 17, 20].map(index => row[index]);
    const ranges = [
      [(Math.round(row[4] * 10) - 1) / 10],
      [row[6], row[7]], [row[9], row[10]], [row[12], row[13]],
      [row[15], row[16]], [row[18], row[19]], [row[21], row[21] + 1]
    ];
    for (const length of [min, max]) for (const [index, macs] of ranges.entries()) for (const mac of macs) {
      expect(evaluatePawper(String(length), String(mac)).estimate).toMatchObject({
        weightKg: weights[index], habitusScore: index + 1, bandMinCm: min, bandMaxCm: max
      });
    }
  });

  it('reproduces the worked example from the paper', () => {
    expect(evaluatePawper('137', '26').estimate).toMatchObject({ weightKg: 42, habitusScore: 6 });
  });

  it.each(['', '0', '-1', 'NaN', 'Infinity', 'abc', '15 cm', '0x10', '1e2', '12.34'])('rejects invalid MAC %j', mac => {
    const result = evaluatePawper('100', mac);
    expect(result.estimate).toBeUndefined();
    expect(result.errors.mac).toBeTruthy();
  });

  it.each(['', '0', '-1', 'NaN', 'Infinity', 'abc', '42.9', '180.1', '200', '49.35', '1e2'])('rejects unsupported length %j without extrapolation or rounding', length => {
    expect(evaluatePawper(length, '16').estimate).toBeUndefined();
    expect(evaluatePawper(length, '16').errors.length).toBeTruthy();
  });
});

const form: PatientForm = { ...emptyForm(), id: 'PAWPER-DEMO', age: '10', method: 'length', length: '137', mac: '26', weight: '999', unit: 'lb' };
function start() {
  return reducer({ ...initialState(0), dialog: 'patient', form }, { type: 'SUBMIT_PATIENT', now: 0 });
}
function update(state: AppState, field: keyof PatientForm, value: string) {
  return reducer(state, { type: 'FORM', field, value });
}
describe('patient integration', () => {
  it('uses the lookup instead of stale manual weight/unit and preserves provenance', () => {
    const state = start();
    expect(state.patient).toMatchObject({ method: 'length', weight: 42, estimation: { lengthCm: 137, macCm: 26, habitusScore: 6 } });
    expect(state.events.some(e => e.title === 'Estimated weight warning')).toBe(true);
    expect(state.events.find(e => e.title === 'PAWPER XL-MAC weight estimated')?.detail).toContain('2017 Table 2');
    const edited = reducer(state, { type: 'OPEN_PATIENT' });
    expect(edited.form).toMatchObject({ length: '137', mac: '26', method: 'length' });
    expect(reducer(edited, { type: 'SUBMIT_PATIENT' }).patient?.revision).toBe(1);
  });

  it('blocks incomplete inputs while keeping the form available for recovery', () => {
    const state = reducer({ ...initialState(0), dialog: 'patient', form: { ...form, mac: '' } }, { type: 'SUBMIT_PATIENT' });
    expect(state.patient).toBeNull();
    expect(state.dialog).toBe('patient');
    expect(state.errors.mac).toBeTruthy();
    expect(reducer(update(state, 'mac', '26'), { type: 'SUBMIT_PATIENT' }).patient?.weight).toBe(42);
  });

  it.each([['years', '18', '18.1'], ['months', '216', '217'], ['days', '6574', '6575']])('enforces the pediatric age limit in %s', (ageUnit, allowed, blocked) => {
    expect(validatePatient({ ...form, ageUnit, age: allowed })).toEqual({});
    expect(validatePatient({ ...form, ageUnit, age: blocked }).age).toContain('0–18');
  });

  it.each([['length', '137.1'], ['mac', '26.1']] as const)('invalidates a review when %s changes even if the estimated kg is unchanged', (field, value) => {
    let state = start();
    state = reducer(state, { type: 'OPEN_REVIEW' });
    state = { ...state, checks: ['identity', 'weight', 'simulation'] };
    state = reducer(state, { type: 'OPEN_PATIENT' });
    state = reducer(update(state, field, value), { type: 'SUBMIT_PATIENT' });
    expect(state.patient?.weight).toBe(42);
    expect(state.patient?.revision).toBe(2);
    expect(state.staleReview).toBe(true);
    expect(state.checks).toEqual([]);
  });

  it('clears estimation provenance when replaced by a measured weight', () => {
    let state = reducer(start(), { type: 'OPEN_PATIENT' });
    state = update(state, 'method', 'measured');
    state = update(state, 'weight', '41');
    state = reducer(state, { type: 'SUBMIT_PATIENT' });
    expect(state.patient).toMatchObject({ method: 'measured', weight: 41, revision: 2 });
    expect(state.patient?.estimation).toBeUndefined();
  });

  it('renders the live result, source, estimated badges, and history in actual components', () => {
    const state = start();
    const dispatch = () => {};
    const html = renderToStaticMarkup(createElement('div', null,
      ...[PawperFields, PatientStrip, Dashboard, Medications, SessionActivity].map(component => createElement(component, { state, dispatch }))
    ));
    for (const text of ['Body length (cm)', 'Mid-arm circumference (cm)', 'ESTIMATED TOTAL BODY WEIGHT', 'HS6', '42', '2017 published reference', 'PAWPER XL-MAC', 'Estimated patient weight', 'PAWPER XL-MAC weight estimated']) expect(html).toContain(text);
    expect(html).not.toContain('Validated estimation reference unavailable');
  });
});
