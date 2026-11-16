import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Dashboard, Medications, PatientStrip, Resuscitation } from '../components/clinical';
import { HciNotes } from '../components/hci-notes';
import { demoPatientActions, initialState, MEDICATIONS, REFERENCES, reducer, type Action, type AppState } from '../lib/model';
import { MEDICINE_OVERVIEWS, RESUSCITATION_OVERVIEWS } from '../lib/education';

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
  it.each(MEDICATIONS)('shows the matching study content and source for $name', medicine => {
    const state = reducer(initialState(0), { type: 'SELECT_MEDICATION', id: medicine.id });
    const html = renderToStaticMarkup(<Medications state={state} dispatch={dispatch} />);
    expect(html).toContain(MEDICINE_OVERVIEWS[medicine.id].summary);
    expect(html).toContain(MEDICINE_OVERVIEWS[medicine.id].url);
    expect(html).toContain('Dosing is not included');
    if (medicine.route !== 'Inhaled') expect(html).not.toContain('<option>Inhaled</option>');
  });
  it('rejects an unrelated route and supports returning to the combined example route', () => {
    const state = reviewed();
    expect(reducer(state, { type: 'ROUTE', value: 'Inhaled' })).toEqual(state);
    const changed = reducer(state, { type: 'ROUTE', value: 'IO' });
    expect(changed.checks).toEqual([]);
    expect(reducer(changed, { type: 'ROUTE', value: 'IV / IO' }).route).toBe('IV / IO');
    const inhaled = reducer(state, { type: 'SELECT_MEDICATION', id: 'salbutamol' });
    expect(reducer(inhaled, { type: 'ROUTE', value: 'IV' })).toEqual(inhaled);
  });
  it('requires fresh acknowledgements when starting another review', () => {
    const recorded = reducer(reviewed(), { type: 'RECORD' });
    expect(reducer(recorded, { type: 'CHECK', value: 'identity' })).toEqual(recorded);
    const restarted = reducer(recorded, { type: 'OPEN_REVIEW' });
    expect(restarted.checks).toEqual([]);
    expect(reducer(restarted, { type: 'RECORD' })).toEqual(restarted);
  });
  it('ignores checks outside an active review and rejects unknown check identifiers', () => {
    const state = patient();
    expect(reducer(state, { type: 'CHECK', value: 'identity' })).toEqual(state);
    const active = reducer(state, { type: 'OPEN_REVIEW' });
    expect(reducer(active, { type: 'CHECK', value: 'unrelated' })).toEqual(active);
  });
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

describe('useful resuscitation content and presentation notes', () => {
  it.each(REFERENCES)('shows the matching overview when selecting %s without resetting the timer', reference => {
    const running = apply([{ type: 'TIMER_TOGGLE' }, { type: 'TIMER_TICK', ms: 3000 }], patient());
    const state = reducer(running, { type: 'REFERENCE', value: reference });
    const html = renderToStaticMarkup(<Resuscitation state={state} dispatch={dispatch} />);
    expect(html).toContain(RESUSCITATION_OVERVIEWS[reference].summary);
    expect(html).toContain(RESUSCITATION_OVERVIEWS[reference].url);
    expect(state.timer).toEqual(running.timer);
    expect(state.patient).toEqual(running.patient);
  });
  it('keeps saved content and timer controls available in the offline exercise without offering external links', () => {
    const state = { ...patient(), offline: true };
    const html = renderToStaticMarkup(<><Medications state={state} dispatch={dispatch} /><Resuscitation state={state} dispatch={dispatch} /></>);
    expect(html).toContain(MEDICINE_OVERVIEWS.epinephrine.summary);
    expect(html).toContain('Start timer');
    expect(html).toContain('Restore connection');
    expect(html).not.toContain('target="_blank"');
  });
  it('connects the current screen to named Norman concepts and all ten Nielsen heuristics', () => {
    const html = renderToStaticMarkup(<HciNotes screen="resuscitation" principle="Visibility of system status" />);
    for (const text of ['Don Norman', 'Jakob Nielsen', 'Affordances', 'Signifiers', 'Constraints', '10. Help and documentation', 'Category buttons change the matching overview']) expect(html).toContain(text);
    expect(html).toContain('class="principle-box hci-notes"');
    expect(html).not.toContain('<details open');
    expect(html).not.toContain('<button');
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
