import { useEffect, useState, type Dispatch, type ReactNode } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronRight, CircleCheck, Clock3, FileClock, HeartPulse, Info, Pause, Play, Plus, RotateCcw, Search, ShieldCheck, TriangleAlert, UserRound, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { filteredMedications, formatTimer, MEDICATIONS, REFERENCES, type Action, type AppState } from '../lib/model';
import { evaluatePawper, PAWPER_REFERENCE } from '../lib/pawper';
import { MEDICINE_OVERVIEWS, RESUSCITATION_OVERVIEWS } from '../lib/education';
import { calculateDose, formatDose, type DoseSnapshot } from '../lib/doses';

type Props = { state: AppState; dispatch: Dispatch<Action> };

export function Alert({ tone = 'warning', title, children, action, id }: {
  tone?: 'warning' | 'danger' | 'info' | 'success'; title: string;
  children?: ReactNode; action?: ReactNode; id?: string;
}) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'info' ? Info : TriangleAlert;
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'} data-focus={id}>
      <Icon size={20} /><div><strong>{title}</strong>{children && <p>{children}</p>}</div>{action}
    </div>
  );
}

export function PageTitle({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div><span className="eyebrow">{eyebrow}</span><h1 tabIndex={-1} data-page-heading>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

export function PatientStrip({ state, dispatch }: Props) {
  const patient = state.patient;
  return (
    <section className={`patient-strip ${patient ? 'has-patient' : ''}`} data-focus="patient-strip" aria-label="Current patient" inert={!!state.dialog}>
      <span className="patient-avatar"><UserRound size={23} /></span>
      <div className="patient-identification"><span className="micro-label">{patient ? 'PATIENT' : 'PATIENT SESSION'}</span><strong>{patient?.id ?? 'No active patient'}</strong>{!patient && <small>Add patient details to begin a review.</small>}</div>
      {patient && <>
        <div className="patient-measurement"><span className="micro-label">AGE</span><strong>{patient.age} <small>{patient.ageUnit}</small></strong></div>
        <div className="patient-measurement weight-measurement"><span className="micro-label">WEIGHT</span><strong>{patient.weight} <small>kg</small></strong></div>
        <span className={`tag ${patient.method === 'measured' ? 'tag-sage' : 'tag-warning'}`} title={patient.method === 'length' ? 'Estimated using PAWPER XL-MAC' : `${patient.method} weight`}>
          {patient.method === 'measured' ? <Check size={14} /> : <TriangleAlert size={14} />}{patient.method === 'measured' ? 'Measured' : 'Estimated'}
        </span>
      </>}
      <div className="patient-strip-actions">
        <Button variant="secondary" size="small" onClick={() => dispatch({ type: 'OPEN_PATIENT' })}>{patient ? 'Edit patient' : 'Add patient'}</Button>
        {patient && <button className="end-session-button" onClick={() => dispatch({ type: 'END_REQUEST' })}>End session</button>}
      </div>
    </section>
  );
}

function WeightNotice({ state, dispatch }: Props) {
  if (!state.patient || state.patient.method === 'measured') return null;
  return <Alert title="Estimated patient weight" action={<Button variant="secondary" size="small" onClick={() => dispatch({ type: 'OPEN_PATIENT' })}>Update weight</Button>}>Using {state.patient.weight} kg{state.patient.method === 'length' ? ' from PAWPER XL-MAC' : ' from a manual estimate'}. Replace with a measured weight when available.</Alert>;
}

export function Dashboard({ state, dispatch }: Props) {
  const patient = state.patient;
  const navigate = (screen: 'medications' | 'resuscitation' | 'activity') => dispatch({ type: 'NAVIGATE', screen });
  return (
    <>
      <PageTitle eyebrow="PATIENT WORKSPACE" title={state.completed ? 'Session complete.' : patient ? 'What do you need to do?' : 'Start with the patient.'}
        description={state.completed ? 'The activity record is saved for this visit.' : patient ? 'Patient details are confirmed. Choose a task below.' : 'Enter the patient’s identity, age, and weight. Then choose your task.'} />
      {state.completed ? (
        <section className="completion-card">
          <span className="completion-icon"><CheckCheck size={30} /></span>
          <div><span className="eyebrow">SESSION ENDED</span><h2>{state.lastPatient?.id}</h2><p>{state.events.length} recorded events. No medication administered.</p></div>
          <Button variant="secondary" onClick={() => navigate('activity')}>View session record<ArrowRight size={16} /></Button>
        </section>
      ) : !patient ? (
        <section className="patient-start-panel">
          <span className="task-symbol"><UserRound size={28} strokeWidth={1.6} /></span>
          <div><h2>New patient session</h2><p>Keep the correct patient and weight attached to every review.</p></div>
          <Button onClick={() => dispatch({ type: 'OPEN_PATIENT' })}><Plus size={18} />Start emergency session<ArrowRight size={17} /></Button>
        </section>
      ) : (
        <section className="patient-ready" role="status"><CircleCheck size={22} /><div><strong>Patient details confirmed</strong><span>{patient.id} · {patient.age} {patient.ageUnit} · {patient.weight} kg</span></div><button className="text-button" onClick={() => dispatch({ type: 'OPEN_PATIENT' })}>Check details<ChevronRight size={16} /></button></section>
      )}
      <WeightNotice state={state} dispatch={dispatch} />
      {state.staleReview && <Alert tone="danger" title="Patient changed — previous review invalidated" id="stale-warning" action={<Button variant="secondary" size="small" onClick={() => navigate('medications')}>Repeat review</Button>}>The earlier review used different patient details. Review the current details before recording again.</Alert>}
      <ol className="workflow-path" aria-label="Patient review workflow">
        <li className={patient || state.completed ? 'done' : 'current'}><span>{patient || state.completed ? <Check size={14} /> : '1'}</span><div><strong>Add patient</strong><small>Identity & weight</small></div></li>
        <li className={patient && !state.completed ? 'current' : ''}><span>2</span><div><strong>Choose a task</strong><small>Medicine or resuscitation</small></div></li>
        <li className={state.reviewRecorded || state.completed ? 'done' : ''}><span>{state.reviewRecorded || state.completed ? <Check size={14} /> : '3'}</span><div><strong>Review & record</strong><small>Visible safety checks</small></div></li>
      </ol>
      <div className="section-label"><span>CHOOSE A TASK</span>{!patient && <span>You can browse before adding a patient.</span>}</div>
      <div className="clinical-task-grid">
        <button className={`clinical-task ${patient ? 'recommended' : ''}`} onClick={() => navigate('medications')}>
          <span className="task-icon"><BookOpen size={24} /></span><span className="task-body"><strong>Find a medicine</strong><small>Search by name and review patient safety checks.</small></span><ArrowRight size={20} />
        </button>
        <button className="clinical-task" onClick={() => navigate('resuscitation')}>
          <span className="task-icon"><HeartPulse size={24} /></span><span className="task-body"><strong>Open resuscitation</strong><small>Reference categories and an independent timer.</small></span><ArrowRight size={20} />
        </button>
        <button className="clinical-task" onClick={() => navigate('activity')}>
          <span className="task-icon"><FileClock size={24} /></span><span className="task-body"><strong>View session activity</strong><small>Review recorded actions, warnings, and changes.</small></span><ArrowRight size={20} />
        </button>
      </div>
      {patient?.estimation && <details className="measurement-details"><summary>Weight estimate details<ChevronRight size={16} /></summary><p>PAWPER XL-MAC · {patient.estimation.lengthCm} cm body length · {patient.estimation.macCm} cm mid-arm circumference · HS{patient.estimation.habitusScore}. The {patient.weight} kg result is an estimate.</p></details>}
      <div className="clinical-note"><ShieldCheck size={17} /><p>Educational simulation. Dose examples illustrate reference arithmetic for fictional patients; clinical use requires an approved protocol.</p></div>
    </>
  );
}

const CHECKS = [
  { id: 'identity', label: 'Patient identity matches this review' },
  { id: 'weight', label: 'Age, weight in kg, and weight source checked' },
  { id: 'simulation', label: 'Dose example, route, and limits reviewed — simulation only' },
];

export function DoseDetails({ dose, offline = false, historical = false }: { dose: DoseSnapshot; offline?: boolean; historical?: boolean }) {
  return <section className="dose-card" aria-label={`${dose.medicineName} ${historical ? 'saved ' : ''}dose example`} data-focus={historical ? undefined : 'dose-details'}>
    <div className="dose-heading"><span className="eyebrow">{historical ? 'SAVED DOSE SNAPSHOT' : 'EDUCATIONAL DOSE EXAMPLE'}</span><span className="tag tag-warning">Simulation only</span></div>
    <h3>{dose.medicineName}</h3>
    <div className="dose-result"><strong>{formatDose(dose.amountMg)} <small>mg</small></strong><span>{dose.route === 'Inhaled' ? 'Inhaled · nebuliser' : dose.route}</span></div>
    <p className="dose-indication">{dose.indication}</p>
    <p className="dose-patient">{dose.patient.id} · {dose.patient.age} {dose.patient.ageUnit} · {dose.patient.weight} kg · {dose.patient.method === 'measured' ? 'Measured' : 'Estimated'} weight · Revision {dose.patient.revision}</p>
    <div className="dose-formula"><span className="micro-label">{dose.medicineId === 'salbutamol' ? 'AGE BAND' : 'CALCULATION'}</span><p>{dose.formula}</p><p>{dose.limits}</p><strong>{dose.adjustment}</strong></div>
    <details className="dose-source"><summary>Age logic, source & scope<ChevronRight size={15} /></summary><p>{dose.ageBasis}</p>{dose.patient.estimation && <p>PAWPER XL-MAC: {dose.patient.estimation.lengthCm} cm length · {dose.patient.estimation.macCm} cm MAC · HS{dose.patient.estimation.habitusScore}.</p>}<p>{dose.ruleVersion}. Single-dose arithmetic only. No repeat schedule, preparation, concentration, or administration volume is supplied. This example does not assess whether the medicine is appropriate.</p>{offline ? <p>{dose.source} · saved reference; external link needs a connection.</p> : <a href={dose.sourceUrl} target="_blank" rel="noreferrer">{dose.source}<ArrowUpRight size={13} /><span className="sr-only"> (opens in a new tab)</span></a>}</details>
    <p className="dose-disclaimer">For the HCI demonstration only. Not a prescription or a clinically validated calculator.</p>
  </section>;
}

export function Medications({ state, dispatch }: Props) {
  const medication = MEDICATIONS.find(item => item.id === state.selectedMedication)!;
  const overview = MEDICINE_OVERVIEWS[medication.id];
  const results = filteredMedications(state.search, state.category);
  const result = calculateDose(state.patient, medication.id, state.route, state.missingReference === medication.id);
  const canCheck = !!state.patient && !!result.dose && !!state.reviewDose && state.reviewedRevision === state.patient.revision && state.reviewAttempted && !state.staleReview && !state.reviewRecorded;
  const remaining = CHECKS.length - state.checks.length;
  return (
    <>
      <PageTitle eyebrow="MEDICINE WORKSPACE" title="Find & review a medicine" description="Choose a medicine, check the patient, then record the simulation review." />
      {state.offline && <Alert title="Connection exercise: offline" action={<Button size="small" variant="secondary" onClick={() => dispatch({ type: 'OFFLINE', value: false })}>Restore connection</Button>}>Saved study summaries, dose examples, and the checklist still work. External source pages need a connection.</Alert>}
      {state.staleReview && <Alert tone="danger" title="Patient changed — previous review invalidated" id="stale-warning" action={<Button size="small" variant="secondary" onClick={() => dispatch({ type: 'OPEN_REVIEW' })}>Repeat review</Button>}>Review the current patient details and {state.patient?.weight} kg weight. Your earlier checks have been cleared.</Alert>}
      <WeightNotice state={state} dispatch={dispatch} />
      <div className="medication-workspace">
        <aside className="medication-browser" aria-label="Choose a medicine">
          <h2><span className="step-index">1</span>Choose medicine</h2>
          <label className="search-field" data-focus="medication-search"><Search size={19} /><input aria-label="Search medications" placeholder="Type a medicine name" value={state.search} onChange={event => dispatch({ type: 'SEARCH', value: event.target.value })} />{state.search && <button aria-label="Clear search" onClick={() => dispatch({ type: 'SEARCH', value: '' })}><X size={16} /></button>}</label>
          <label className="category-label">Category<select aria-label="Medication category" className="category-select" value={state.category} onChange={event => dispatch({ type: 'CATEGORY', value: event.target.value })}>{['All', 'Resuscitation', 'Cardiovascular', 'Respiratory'].map(category => <option key={category} value={category}>{category === 'All' ? 'All categories' : category}</option>)}</select></label>
          <p className="result-count" role="status">{results.length} medicine{results.length !== 1 ? 's' : ''} found</p>
          <div className="medication-list">{results.length ? results.map(item => <button className={`medication-item ${item.id === state.selectedMedication ? 'selected' : ''}`} key={item.id} aria-pressed={item.id === state.selectedMedication} onClick={() => dispatch({ type: 'SELECT_MEDICATION', id: item.id })}><span><strong>{item.name}</strong><small>{item.category}</small></span>{item.id === state.selectedMedication ? <Check size={18} /> : <ChevronRight size={18} />}</button>) : <div className="empty-search"><Search size={28} /><strong>No medications found</strong><p>Check the spelling or choose another category.</p><Button variant="secondary" size="small" onClick={() => { dispatch({ type: 'SEARCH', value: '' }); dispatch({ type: 'CATEGORY', value: 'All' }); }}>Clear search & filters</Button></div>}</div>
        </aside>
        <section className="medication-detail" data-focus="medication-detail" aria-label="Medicine review">
          <div className="reference-heading"><div><span className="eyebrow">2 · PATIENT & SAFETY REVIEW</span><h2>{medication.name}</h2></div><span className="tag tag-neutral"><BookOpen size={13} />Study summary</span></div>
          <section className="study-overview" aria-label={`${medication.name} educational overview`}>
            <h3>{overview.family}</h3><p>{overview.summary}</p>
            <details><summary>Review considerations & source<ChevronRight size={15} /></summary><p>{overview.focus}</p>{state.offline ? <p>External source requires a connection.</p> : <a href={overview.url} target="_blank" rel="noreferrer">{overview.source}<ArrowUpRight size={13} /><span className="sr-only"> (opens in a new tab)</span></a>}</details>
          </section>
          <div className="reference-context"><UserRound size={17} /><span>{state.patient ? <><strong>{state.patient.id}</strong> · {state.patient.weight} kg · {state.patient.method === 'measured' ? 'Measured' : 'Estimated'}</> : 'No patient attached to this review'}</span></div>
          <label className="route-label">Example route to review<select value={state.route} onChange={event => dispatch({ type: 'ROUTE', value: event.target.value })}>{Array.from(new Set([medication.route, ...medication.route.split(' / ')])).map(route => <option key={route}>{route}</option>)}</select></label>
          {result.dose ? <DoseDetails dose={result.dose} offline={state.offline} /> : <Alert tone="info" title={state.missingReference === medication.id ? 'Medication reference unavailable — example scenario' : state.patient ? 'Dose example unavailable for this patient' : 'Dose example needs patient details'}>{result.reason}</Alert>}
          <ol className="review-progress" aria-label="Medicine review progress">
            <li className="done"><Check size={14} />Selected</li><li className={state.reviewRecorded ? 'done' : 'current'} aria-current={!state.reviewRecorded ? 'step' : undefined}>{state.reviewRecorded ? <Check size={14} /> : '2'} Safety checks</li><li className={state.reviewRecorded ? 'done' : ''}>{state.reviewRecorded ? <Check size={14} /> : '3'} Recorded</li>
          </ol>
          {!state.patient ? <div className="next-action-panel"><div><strong>Add a patient to review</strong><p>Patient identity and weight are required before the checks can begin.</p></div><Button onClick={() => dispatch({ type: 'OPEN_PATIENT' })}><Plus size={16} />Add patient</Button></div> : state.reviewRecorded ? <div className="review-success" role="status"><CircleCheck size={24} /><div><strong>Simulation review recorded</strong><p>Your entry is in session activity. No medication was administered.</p></div><Button variant="secondary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'activity' })}>View activity<ArrowRight size={16} /></Button><button className="text-button" onClick={() => dispatch({ type: 'OPEN_REVIEW' })}>Start another review</button></div> : <>
            {canCheck && <fieldset className="verification-checklist"><legend>Safety checklist <span>{state.checks.length} / {CHECKS.length}</span></legend>{CHECKS.map(item => <label key={item.id} className={state.checks.includes(item.id) ? 'checked' : ''}><input type="checkbox" checked={state.checks.includes(item.id)} disabled={!canCheck} onChange={() => dispatch({ type: 'CHECK', value: item.id })} /><span>{item.label}</span>{state.checks.includes(item.id) && <Check size={16} />}</label>)}</fieldset>}
            <div className="next-action-panel" aria-live="polite">
              {!canCheck ? <><div><strong>{state.staleReview ? 'Repeat the patient review' : 'Next: review patient & safety'}</strong><p>{result.dose ? 'Open the review to unlock the checklist.' : result.reason}</p></div><Button disabled={!result.dose} onClick={() => dispatch({ type: 'OPEN_REVIEW' })}><ShieldCheck size={17} />Review safety<ArrowRight size={16} /></Button></> : <><div><strong>{remaining ? `${remaining} check${remaining !== 1 ? 's' : ''} remaining` : 'All checks acknowledged'}</strong><p>{remaining ? 'Complete the checklist above to record your review.' : 'Record this educational review in session activity.'}</p></div><Button disabled={remaining > 0} onClick={() => dispatch({ type: 'OPEN_RECORD' })}><FileClock size={17} />Record review<ArrowRight size={16} /></Button></>}
            </div>
          </>}
        </section>
      </div>
    </>
  );
}

export function Resuscitation({ state, dispatch }: Props) {
  const overview = RESUSCITATION_OVERVIEWS[state.reference];
  const exampleIds: Record<string, string[]> = { 'Cardiac arrest': ['epinephrine', 'amiodarone'], Bradycardia: ['epinephrine', 'atropine'], Tachycardia: ['adenosine'], 'Respiratory emergencies': ['salbutamol'] };
  return (
    <>
      <PageTitle eyebrow="RESUSCITATION WORKSPACE" title="Learn, review & keep time" description="Choose a topic for a study overview. Use the independent timer to practise the workflow." />
      {state.offline && <Alert title="Connection exercise: offline" action={<Button size="small" variant="secondary" onClick={() => dispatch({ type: 'OFFLINE', value: false })}>Restore connection</Button>}>Saved overviews and the timer remain available. External source pages need a connection.</Alert>}
      <div className="resuscitation-layout">
        <nav className="reference-categories" aria-label="Resuscitation categories">{REFERENCES.map(reference => <button key={reference} className={state.reference === reference ? 'selected' : ''} aria-pressed={state.reference === reference} onClick={() => dispatch({ type: 'REFERENCE', value: reference })}>{reference}{state.reference === reference && <Check size={16} />}</button>)}</nav>
        <div className="resuscitation-content">
          <section className="reference-document" aria-label={`${state.reference} educational overview`}>
            <span className="eyebrow">EDUCATIONAL OVERVIEW</span><h2>{state.reference}</h2>
            <p className="topic-summary">{overview.summary}</p>
            <ul className="topic-concepts">{overview.concepts.map(concept => <li key={concept}>{concept}</li>)}</ul>
            <section className="resuscitation-dose-examples" aria-label="Related dose examples"><h3>Related medicine examples · simulation only</h3><p>Inspect a scoped calculation in Medicines. These examples do not select a treatment.</p>{exampleIds[state.reference].map(id => {
              const medicine = MEDICATIONS.find(item => item.id === id)!;
              const result = calculateDose(state.patient, id, medicine.route, state.missingReference === id);
              return <button key={id} onClick={() => { dispatch({ type: 'SELECT_MEDICATION', id }); dispatch({ type: 'NAVIGATE', screen: 'medications' }); }}><span><strong>{medicine.name}{result.dose ? ` · ${formatDose(result.dose.amountMg)} mg` : ''}</strong><small>{result.dose ? result.dose.indication : result.reason}</small></span><ArrowRight size={17} /></button>;
            })}</section>
            <div className="practice-task"><span className="micro-label">TRY THE WORKFLOW</span><p>{overview.task}</p></div>
            <div className="reference-shortcuts"><Button size="small" variant="secondary" onClick={() => dispatch({ type: 'OPEN_PATIENT' })}><UserRound size={15} />{state.patient ? 'Check patient' : 'Add patient'}</Button><Button size="small" variant="secondary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'activity' })}><FileClock size={15} />View activity</Button><Button size="small" variant="secondary" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'medications' })}><BookOpen size={15} />Browse medicines</Button></div>
            {state.offline ? <p className="source-offline">External source requires a connection.</p> : <a className="study-source" href={overview.url} target="_blank" rel="noreferrer">{overview.source}<ArrowUpRight size={13} /><span className="sr-only"> (opens in a new tab)</span></a>}
            <button className="expand-reference" aria-expanded={state.expandedReference} aria-controls="reference-scope" onClick={() => dispatch({ type: 'EXPAND_REFERENCE' })}><Info size={17} />About this study overview<ChevronRight size={16} /></button>{state.expandedReference && <p className="reference-expanded" id="reference-scope">These general concepts are for study. A hospital-approved pediatric treatment pathway has not been connected. No diagnosis, treatment sequence, or clinical interval is supplied. Opening a source does not validate this prototype.</p>}
          </section>
          <section className="timer-card" data-focus="timer" aria-label="Demonstration timer"><div className="timer-heading"><h2><Clock3 size={19} />Demonstration timer</h2><span className={`tag ${state.timer.running ? 'tag-sage' : 'tag-neutral'}`}>{state.timer.running ? 'Running' : state.timer.elapsed ? 'Paused' : 'Ready'}</span></div><div className={`timer-display ${state.timer.running ? 'is-running' : ''}`} aria-label={`Elapsed time ${formatTimer(state.timer.elapsed)}`}>{formatTimer(state.timer.elapsed)}<span>ELAPSED TIME</span></div><div className="timer-controls"><Button onClick={() => dispatch({ type: 'TIMER_TOGGLE' })}>{state.timer.running ? <Pause size={19} /> : <Play size={19} />}{state.timer.running ? 'Pause timer' : state.timer.elapsed ? 'Resume timer' : 'Start timer'}</Button><Button variant="secondary" disabled={!state.timer.elapsed && !state.timer.running} onClick={() => dispatch({ type: 'TIMER_RESET_REQUEST' })}><RotateCcw size={18} />Reset</Button></div><p>No clinical interval is prescribed. Reset asks for confirmation.</p></section>
        </div>
      </div>
    </>
  );
}

export function SessionActivity({ state, dispatch }: Props) {
  const [warningsOnly, setWarningsOnly] = useState(false);
  const patient = state.patient ?? state.lastPatient;
  const events = state.events.filter(event => !warningsOnly || event.kind === 'warning');
  const warnings = state.events.filter(event => event.kind === 'warning').length;
  function exportActivity() {
    const blob = new Blob([JSON.stringify({ simulationOnly: true, patient, events: state.events }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'pedirescue-simulation-activity.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <PageTitle eyebrow="SESSION RECORD" title="Session activity" description="See what happened, what changed, and which checks need attention." action={<Button size="small" variant="secondary" disabled={!state.events.length} onClick={exportActivity}><ArrowDownToLine size={16} />Export record</Button>} />
      <div className="activity-summary"><div><span className="micro-label">PATIENT</span><strong>{patient?.id ?? 'Not set'}</strong></div><div><span className="micro-label">EVENTS</span><strong>{state.events.length}</strong></div><div><span className="micro-label">STATUS</span><span className={`tag ${state.completed ? 'tag-sage' : 'tag-neutral'}`}>{state.completed ? <CheckCheck size={15} /> : <Activity size={15} />}{state.completed ? 'Completed' : state.patient ? 'Active session' : 'No active session'}</span></div></div>
      <div className="activity-filter" aria-label="Activity filter"><button aria-pressed={!warningsOnly} className={!warningsOnly ? 'selected' : ''} onClick={() => setWarningsOnly(false)}>All events<span>{state.events.length}</span></button><button aria-pressed={warningsOnly} className={warningsOnly ? 'selected' : ''} onClick={() => setWarningsOnly(true)}><TriangleAlert size={16} />Warnings<span>{warnings}</span></button></div>
      <div className="timeline" data-focus="activity-timeline">{events.length ? [...events].reverse().map(event => <article className="timeline-event" key={event.id}><span className={`timeline-marker ${event.kind}`}>{event.kind === 'warning' ? <TriangleAlert size={17} /> : event.kind === 'success' ? <Check size={18} /> : <Activity size={17} />}</span><div><div className="timeline-event-heading"><h2>{event.title}</h2><time dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div><p>{event.detail}</p>{event.dose && <details className="activity-dose-details"><summary>View saved dose details · {formatDose(event.dose.amountMg)} mg<ChevronRight size={15} /></summary><DoseDetails dose={event.dose} offline={state.offline} historical /></details>}</div></article>) : <div className="empty-activity"><FileClock size={34} strokeWidth={1.5} /><h2>{warningsOnly ? 'No warnings to show' : 'No activity yet'}</h2><p>{warningsOnly ? 'Warnings from this session will appear here.' : 'Start a patient session to create a review record.'}</p>{!warningsOnly && <Button variant="secondary" onClick={() => dispatch({ type: 'OPEN_PATIENT' })}><Plus size={17} />Add patient</Button>}</div>}</div>
      {state.patient && <div className="activity-end"><div><strong>Ready to end this session?</strong><p>The activity record stays available after ending.</p></div><Button variant="secondary" onClick={() => dispatch({ type: 'END_REQUEST' })}>End session<ArrowRight size={16} /></Button></div>}
    </>
  );
}

export function PawperFields({ state, dispatch }: Props) {
  const { estimate, errors } = evaluatePawper(state.form.length, state.form.mac);
  return <div className="pawper-fields">
    <div className="pawper-intro"><strong>PAWPER XL-MAC</strong><p>Enter head-to-heel body length and mid-arm circumference (MAC). Use cm with at most one decimal place. For fictional patients aged 0–18 years.</p></div>
    <div className="form-row">{([
      ['length', 'Body length (cm)', '137', '43–180 cm; recumbent head-to-heel length.'],
      ['mac', 'Mid-arm circumference (cm)', '26', 'Circumference at the midpoint of the upper arm.']
    ] as const).map(([field, label, placeholder, help]) => {
      const error = state.errors[field] || (state.form[field].trim() ? errors[field] : undefined);
      return <label className="form-field" key={field} htmlFor={`patient-${field}`}>{label}<input id={`patient-${field}`} inputMode="decimal" autoComplete="off" placeholder={placeholder} value={state.form[field]} aria-invalid={!!error} aria-describedby={`${field}-help${error ? ` ${field}-error` : ''}`} data-focus={`field-${field}`} onChange={event => dispatch({ type: 'FORM', field, value: event.target.value })} />{error && <span className="field-error" role="alert" id={`${field}-error`}>{error}</span>}<span className="field-help" id={`${field}-help`}>{help}</span></label>;
    })}</div>
    <div className="pawper-result" role="status" aria-live="polite" aria-atomic="true">
      {estimate ? <><div className="pawper-result-heading"><div><span className="micro-label">ESTIMATED TOTAL BODY WEIGHT</span><strong>{estimate.weightKg}<small> kg</small></strong></div><span className="tag tag-warning">HS{estimate.habitusScore} · Estimated</span></div><p>Length band {estimate.bandMinCm}–{estimate.bandMaxCm} cm · {estimate.lengthCm} cm length + {estimate.macCm} cm MAC</p></> : <p>Enter valid length and MAC measurements to preview the estimated weight.</p>}
    </div>
    {estimate && <Alert title="Estimated weight — verification needed">This estimate stays labelled throughout the session. {estimate.habitusScore === 1 || estimate.habitusScore === 7 ? 'An extreme habitus category needs particular caution. ' : ''}Verify a measured weight before clinical decisions.</Alert>}
    <p className="pawper-source"><a href={PAWPER_REFERENCE.url} target="_blank" rel="noreferrer">2017 published reference · Table 2 <ArrowUpRight size={11} /></a><span>Educational weight lookup</span></p>
  </div>;
}

export function ClinicalDialogs({ state, dispatch, container }: Props & { container: HTMLElement | null }) {
  const medication = MEDICATIONS.find(item => item.id === state.selectedMedication)!;
  const errors = Object.values(state.errors).filter(Boolean);
  const activeDialog = state.dialog;
  useEffect(() => {
    if (activeDialog !== 'patient' || state.events.at(-1)?.title !== 'Invalid patient input detected') return;
    const field = Object.keys(state.errors).find(key => state.errors[key]);
    if (!field) return;
    const target = container?.querySelector<HTMLElement>(`#patient-${field}`) ?? container?.querySelector<HTMLElement>('[aria-invalid="true"]');
    target?.focus();
  }, [state.events.length, activeDialog, container]);
  const close = () => dispatch({ type: 'CLOSE_DIALOG' });
  const estimate = state.form.method === 'length' ? evaluatePawper(state.form.length, state.form.mac).estimate : null;
  const previewWeight = state.form.method === 'length' ? estimate?.weightKg ?? NaN : Number(state.form.weight);
  const validPreview = Number.isFinite(previewWeight) && previewWeight > 0;
  const methodDescription = state.form.method === 'measured' ? 'Enter the reading from a scale, in kilograms.' : state.form.method === 'estimated' ? 'Enter an existing estimate. It will stay labelled as estimated.' : 'Enter both measurements. PAWPER XL-MAC estimates total body weight.';
  return <>
    <Dialog open={state.dialog === 'patient'} title={state.patient ? 'Edit patient details' : 'Add a patient'} description="Confirm identity and weight before starting a medicine review." container={container} onClose={close} name="patient-dialog">
      <form className="patient-form" onSubmit={event => { event.preventDefault(); dispatch({ type: 'SUBMIT_PATIENT' }); }} noValidate>
        {errors.length > 0 && <div className="form-error-summary" role="alert"><TriangleAlert size={18} /><div><strong>Check the highlighted fields</strong><span>Your entries have been kept. Correct the fields below to continue.</span></div></div>}
        <div className="form-section-title"><span className="step-index">1</span><h3>Patient identity</h3></div>
        <div className="form-row">
          <label className="form-field" htmlFor="patient-id">Patient ID<input id="patient-id" autoComplete="off" placeholder="e.g. DEMO-001" maxLength={40} value={state.form.id} aria-invalid={!!state.errors.id} aria-describedby={state.errors.id ? 'error-id' : undefined} data-focus="field-id" onChange={event => dispatch({ type: 'FORM', field: 'id', value: event.target.value })} />{state.errors.id && <span className="field-error" id="error-id">{state.errors.id}</span>}</label>
          <div className="form-field"><label htmlFor="patient-age">Age</label><div className="input-group"><input id="patient-age" inputMode="decimal" autoComplete="off" placeholder="e.g. 4" value={state.form.age} aria-invalid={!!state.errors.age} aria-describedby={state.errors.age ? 'error-age' : undefined} data-focus="field-age" onChange={event => dispatch({ type: 'FORM', field: 'age', value: event.target.value })} /><select aria-label="Age unit" value={state.form.ageUnit} onChange={event => dispatch({ type: 'FORM', field: 'ageUnit', value: event.target.value })}>{['years', 'months', 'days'].map(unit => <option key={unit}>{unit}</option>)}</select></div>{state.errors.age && <span className="field-error" id="error-age">{state.errors.age}</span>}</div>
        </div>
        <fieldset className="measurement-method"><legend><span className="step-index">2</span>Patient weight</legend><div className="segmented-control">{([
          { id: 'measured', label: 'Measured weight', detail: 'From a scale' },
          { id: 'estimated', label: 'Manual estimate', detail: 'Enter an estimate' },
          { id: 'length', label: 'Length + MAC', detail: 'PAWPER XL-MAC' },
        ] as const).map(method => <button type="button" key={method.id} aria-pressed={state.form.method === method.id} className={state.form.method === method.id ? 'selected' : ''} onClick={() => dispatch({ type: 'FORM', field: 'method', value: method.id })}><span>{state.form.method === method.id && <Check size={15} />}{method.label}</span><small>{method.detail}</small></button>)}</div><p className="method-description">{methodDescription}</p></fieldset>
        {state.form.method === 'length' ? <PawperFields state={state} dispatch={dispatch} /> : <div className="form-field"><label htmlFor="patient-weight">{state.form.method === 'measured' ? 'Measured' : 'Estimated'} weight</label><div className={`input-group weight-input ${state.errors.weight || state.errors.unit ? 'input-invalid' : ''}`}><input id="patient-weight" inputMode="decimal" autoComplete="off" placeholder="e.g. 18" value={state.form.weight} aria-invalid={!!state.errors.weight || !!state.errors.unit} aria-describedby={`weight-help${state.errors.weight ? ' weight-error' : ''}${state.errors.unit ? ' unit-error' : ''}`} data-focus="field-weight" onChange={event => dispatch({ type: 'FORM', field: 'weight', value: event.target.value })} /><select id="patient-unit" aria-label="Weight unit" value={state.form.unit} aria-invalid={!!state.errors.unit} onChange={event => dispatch({ type: 'FORM', field: 'unit', value: event.target.value })}><option value="kg">kg</option><option value="lb">lb</option></select></div>{state.errors.weight && <span className="field-error" id="weight-error"><TriangleAlert size={16} />{state.errors.weight}</span>}{state.errors.unit && <span className="field-error" id="unit-error">{state.errors.unit}</span>}<span className="field-help" id="weight-help">Kilograms only. Values are never silently converted.</span></div>}
        {state.form.method === 'estimated' && <Alert title="Estimated weight requires verification">The estimate will stay visible in the patient banner. Replace it with a measured weight when available.</Alert>}
        {state.patient && <p className="edit-impact"><Info size={16} />Changing patient details clears any previous review checks.</p>}
        <div className="patient-confirm-preview" aria-label="Patient details to confirm"><span className="micro-label">CONFIRM BEFORE CONTINUING</span><div><strong>{state.form.id.trim() || 'Patient ID required'}</strong><span>{state.form.age.trim() ? `${state.form.age} ${state.form.ageUnit}` : 'Age required'}</span><strong>{validPreview ? `${previewWeight} ${state.form.method === 'length' ? 'kg' : state.form.unit}` : 'Weight required'}</strong><span className={`tag ${state.form.method === 'measured' ? 'tag-sage' : 'tag-warning'}`}>{state.form.method === 'measured' ? 'Measured' : 'Estimated'}</span></div></div>
        <div className="dialog-actions"><span className="dialog-simulation-label">Fictional patient data only</span><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button type="submit">{state.patient ? 'Save patient details' : 'Confirm patient'}<ArrowRight size={17} /></Button></div>
      </form>
    </Dialog>
    <Dialog open={state.dialog === 'discard-patient'} title="Keep your patient entries?" description="The patient form has unsaved changes. Return to the form to continue, or discard these entries." container={container} onClose={() => dispatch({ type: 'RETURN_TO_PATIENT' })}>
      <Alert tone="info" title="No patient details have been changed">Your current session remains as it was until you confirm the form.</Alert><div className="dialog-actions"><Button variant="secondary" onClick={() => dispatch({ type: 'DISCARD_PATIENT' })}>Discard entries</Button><Button onClick={() => dispatch({ type: 'RETURN_TO_PATIENT' })}>Keep editing<ArrowRight size={17} /></Button></div>
    </Dialog>
    <Dialog open={state.dialog === 'review'} title="Check the patient & reference" description={`${medication.name} · ${state.route} · educational review only`} container={container} onClose={close} name="review-dialog">
      <div className="review-patient-card"><UserRound size={25} /><div><span className="micro-label">PATIENT</span><strong>{state.patient?.id}</strong><span>{state.patient?.age} {state.patient?.ageUnit}</span></div><div><span className="micro-label">WEIGHT</span><strong>{state.patient?.weight} kg</strong><span>{state.patient?.method === 'measured' ? 'Measured' : 'Estimated'}</span></div></div>
      {state.reviewDose ? <DoseDetails dose={state.reviewDose} offline={state.offline} /> : <Alert title="Dose example unavailable">{calculateDose(state.patient, medication.id, state.route, state.missingReference === medication.id).reason}</Alert>}
      <p className="dialog-footnote">Continue to acknowledge the simulation limits. This does not verify a clinical reference or authorize administration.</p><div className="dialog-actions"><Button onClick={close}>Continue to checklist<ArrowRight size={17} /></Button></div>
    </Dialog>
    <Dialog open={state.dialog === 'record'} title="Record this simulation review?" description="This adds an educational review to session activity. It does not record medication administration." container={container} onClose={close}>
      {state.reviewDose && <DoseDetails dose={state.reviewDose} offline={state.offline} />}<label className="form-field">Optional note<textarea rows={3} maxLength={400} placeholder="Add an observation about this review" value={state.recordNote} onChange={event => dispatch({ type: 'RECORD_NOTE', value: event.target.value })} /></label><div className="dialog-actions"><Button variant="secondary" onClick={close}>Back to review</Button><Button disabled={!state.reviewDose} onClick={() => dispatch({ type: 'RECORD' })}><Check size={18} />Record review</Button></div>
    </Dialog>
    <Dialog open={state.dialog === 'timer-reset'} title="Reset the demonstration timer?" description="The elapsed time will be cleared. You can keep the timer instead." container={container} onClose={close}>
      <div className="reset-preview"><Clock3 size={24} /><strong>{formatTimer(state.timer.elapsed)}</strong><ArrowRight size={20} /><strong>00:00</strong></div><div className="dialog-actions"><Button variant="secondary" onClick={close}>Keep timer</Button><Button onClick={() => dispatch({ type: 'TIMER_RESET' })}><RotateCcw size={18} />Confirm reset</Button></div>
    </Dialog>
    <Dialog open={state.dialog === 'end'} title="End this patient session?" description="The active patient will be cleared and the timer will stop. Your activity record will stay available." container={container} onClose={close}>
      <div className="end-summary"><UserRound size={26} /><div><strong>{state.patient?.id}</strong><span>{state.patient?.weight} kg · {state.events.length} recorded events</span></div></div><p className="dialog-footnote">If you tapped End session by mistake, choose Continue session to return without losing your progress.</p><div className="dialog-actions"><Button variant="secondary" onClick={close}>Continue session</Button><Button variant="destructive" onClick={() => dispatch({ type: 'END_CONFIRM' })}>Confirm end session<ArrowRight size={17} /></Button></div>
    </Dialog>
  </>;
}
