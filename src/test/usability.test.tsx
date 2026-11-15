import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Dashboard, Medications, PatientStrip } from '../components/clinical';
import { demoPatientActions, initialState, reducer, type Action, type AppState } from '../lib/model';

const dispatch = () => {};
const apply = (actions: Action[], state: AppState = initialState(0)) => actions.reduce(reducer, state);
const patient = () => apply(demoPatientActions);
const reviewed = () => apply([{ type: 'OPEN_REVIEW' }, { type: 'CLOSE_DIALOG' }, ...['identity', 'weight', 'simulation'].map(value => ({ type: 'CHECK' as const, value }))], patient());

describe('recoverable patient entry', () => {
  it('protects a new patient draft when Cancel or Close is used', () => {
    const draft = apply([{ type: 'OPEN_PATIENT' }, { type: 'FORM', field: 'id', value: 'PATIENT-A' }, { type: 'FORM', field: 'weight', value: '12' }]);
    const closed = reducer(draft, { type: 'CLOSE_DIALOG' });
    expect(closed.dialog).toBe('discard-patient');
    expect(closed.patient).toBeNull();
    const returned = reducer(closed, { type: 'RETURN_TO_PATIENT' });
    expect(returned.dialog).toBe('patient');
    expect(returned.form).toEqual(draft.form);
  });
  it('closes an untouched patient form without an unnecessary confirmation', () => {
    expect(apply([{ type: 'OPEN_PATIENT' }, { type: 'CLOSE_DIALOG' }]).dialog).toBeNull();
    expect(apply([{ type: 'OPEN_PATIENT' }, { type: 'CLOSE_DIALOG' }], patient()).dialog).toBeNull();
  });
  it('discards edits without changing the confirmed patient', () => {
    const original = patient();
    const state = apply([{ type: 'OPEN_PATIENT' }, { type: 'FORM', field: 'weight', value: '25' }, { type: 'CLOSE_DIALOG' }, { type: 'DISCARD_PATIENT' }], original);
    expect(state.patient).toEqual(original.patient);
    expect(state.dialog).toBeNull();
    expect(reducer(state, { type: 'OPEN_PATIENT' }).form.weight).toBe('18');
  });
  it('Escape on the discard prompt returns to the draft rather than losing it', () => {
    const state = apply([{ type: 'OPEN_PATIENT' }, { type: 'FORM', field: 'age', value: '4' }, { type: 'CLOSE_DIALOG' }, { type: 'CLOSE_DIALOG' }]);
    expect(state.dialog).toBe('patient'); expect(state.form.age).toBe('4');
  });
  it('changing measurement method removes irrelevant measurement errors and preserves entries', () => {
    const state = apply([{ type: 'OPEN_PATIENT' }, { type: 'FORM', field: 'weight', value: '-2' }, { type: 'SUBMIT_PATIENT' }, { type: 'FORM', field: 'method', value: 'length' }]);
    expect(state.errors.weight).toBeUndefined();
    expect(state.errors.id).toBeTruthy();
    expect(state.form.weight).toBe('-2');
  });
});

describe('a clear medication review journey', () => {
  it('explains the next action instead of showing an inaccessible checklist', () => {
    const html = renderToStaticMarkup(<Medications state={patient()} dispatch={dispatch} />);
    expect(html).toContain('Next: review patient &amp; safety');
    expect(html).not.toContain('type="checkbox"');
  });
  it('shows a checklist and explains why recording is still unavailable', () => {
    const state = apply([{ type: 'OPEN_REVIEW' }, { type: 'CLOSE_DIALOG' }], patient());
    const html = renderToStaticMarkup(<Medications state={state} dispatch={dispatch} />);
    expect(html).toContain('3 checks remaining');
    expect((html.match(/type="checkbox"/g) ?? []).length).toBe(3);
    expect(html).toContain('disabled=""');
  });
  it('gives visible confirmation after recording and prevents duplicate entries', () => {
    const state = reducer(reviewed(), { type: 'RECORD' });
    expect(state.reviewRecorded).toBe(true);
    expect(renderToStaticMarkup(<Medications state={state} dispatch={dispatch} />)).toContain('Simulation review recorded');
    expect(reducer(state, { type: 'RECORD' })).toEqual(state);
    expect(reducer(state, { type: 'OPEN_RECORD' }).dialog).toBeNull();
  });
  it('invalidates confirmation after an age change as well as a weight change', () => {
    const recorded = reducer(reviewed(), { type: 'RECORD' });
    const changed = apply([{ type: 'OPEN_PATIENT' }, { type: 'FORM', field: 'age', value: '5' }, { type: 'SUBMIT_PATIENT' }], recorded);
    expect(changed.staleReview).toBe(true);
    expect(changed.reviewRecorded).toBe(false);
    expect(changed.checks).toEqual([]);
  });
  it('removes an abandoned note when another medicine is selected', () => {
    const state = apply([{ type: 'RECORD_NOTE', value: 'A note about the previous selection' }, { type: 'SELECT_MEDICATION', id: 'amiodarone' }], patient());
    expect(state.recordNote).toBe('');
  });
});

describe('recognition and patient visibility', () => {
  it('shows the same patient and weight with direct edit and end actions', () => {
    const html = renderToStaticMarkup(<PatientStrip state={patient()} dispatch={dispatch} />);
    expect(html).toContain('DEMO-001'); expect(html).toContain('18');
    for (const label of ['WEIGHT', 'Measured', 'Edit patient', 'End session']) expect(html).toContain(label);
  });
  it('offers concrete tasks without requiring the user to memorize navigation', () => {
    const html = renderToStaticMarkup(<Dashboard state={patient()} dispatch={dispatch} />);
    for (const label of ['Find a medicine', 'Open resuscitation', 'View session activity', 'Patient details confirmed']) expect(html).toContain(label);
  });
});
