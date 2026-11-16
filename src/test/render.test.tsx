import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../App';
import { Dashboard, Medications, Resuscitation, SessionActivity } from '../components/clinical';
import { scenarioState, initialState, type Scenario } from '../lib/model';
import { demoSnapshot, TOTAL_DEMO_MS } from '../lib/demo';
const dispatch = () => {};
describe('rendering the real application components', () => {
  it('renders the presentation, all four navigation sections, and six scenario controls', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Start guided demo');
    expect(html).toContain('Start emergency session');
    expect(html).toContain('Clinical workspace');
    expect(html).toContain('SIMULATION ONLY');
    expect((html.match(/class="scenario-number"/g) ?? []).length).toBe(6);
    expect(html).toContain('class="principle-box hci-notes"');
    expect(html).toContain('aria-label="HCI design notes: Recognition rather than recall"');
    expect(html).not.toContain('class="help-popover"');
  });
  it.each(['invalid', 'estimated', 'missing', 'offline', 'weight', 'end'] as Scenario[])('renders %s with real state and useful recovery information', scenario => {
    const state = scenarioState(scenario, 0);
    const html = renderToStaticMarkup(<><Dashboard state={state} dispatch={dispatch} /><Medications state={state} dispatch={dispatch} /></>);
    expect(html).not.toContain('NaN');
    expect(html).toContain('Dosing is not included');
    if (scenario === 'offline') expect(html).toContain('Restore connection');
    if (scenario === 'weight') expect(html).toContain('previous review invalidated');
    if (scenario === 'missing') expect(html).toContain('Medication reference unavailable');
    if (scenario === 'estimated') expect(html).toContain('Estimated patient weight');
  });
  it('renders a real no-results state for medication search', () => {
    const state = {
      ...initialState(0),
      search: 'no such medication'
    };
    expect(renderToStaticMarkup(<Medications state={state} dispatch={dispatch} />)).toContain('No medications found');
  });
  it('renders all resuscitation categories and a functioning timer interface', () => {
    const html = renderToStaticMarkup(<Resuscitation state={initialState(0)} dispatch={dispatch} />);
    for (const text of ['Cardiac arrest', 'Bradycardia', 'Tachycardia', 'Respiratory emergencies', '00:00', 'Start timer', 'Reset']) expect(html).toContain(text);
    expect(html).toContain('heart is no longer pumping blood effectively');
    expect(html).not.toContain('Clinical reference unavailable');
  });
  it('renders completion and actual history from the complete demo', () => {
    const state = demoSnapshot(TOTAL_DEMO_MS, 0).state;
    const html = renderToStaticMarkup(<><Dashboard state={state} dispatch={dispatch} /><SessionActivity state={state} dispatch={dispatch} /></>);
    expect(html).toContain('Session complete.');
    expect(html).toContain('Simulated medication review recorded');
    expect(html).toContain('Session completed');
  });
});
