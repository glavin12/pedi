import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, FileClock, FlaskConical, HeartPulse, UserRound, Maximize2, Minimize2, MousePointer2, Pause, Play, Plus, RotateCcw, ShieldCheck, SlidersHorizontal, Square, Wifi, WifiOff } from 'lucide-react';
import { Button } from './components/ui/button';
import { ClinicalDialogs, Dashboard, Medications, PatientStrip, Resuscitation, SessionActivity } from './components/clinical';
import { HciNotes } from './components/hci-notes';
import { DEMO_STEPS, demoPosition, demoSnapshot, stepStart, TOTAL_DEMO_MS } from './lib/demo';
import { formatTimer, initialState, reducer, scenarioState, type Action, type Scenario, type Screen } from './lib/model';
const NAV = [{
  id: 'dashboard' as const,
  label: 'Patient',
  description: 'Details & weight',
  icon: UserRound
}, {
  id: 'medications' as const,
  label: 'Medicines',
  description: 'Search & review',
  icon: BookOpen
}, {
  id: 'resuscitation' as const,
  label: 'Resuscitation',
  description: 'References & timer',
  icon: HeartPulse
}, {
  id: 'activity' as const,
  label: 'Activity',
  description: 'Session record',
  icon: FileClock
}];
const SCENARIOS: {
  id: Scenario;
  title: string;
  subtitle: string;
  principle: string;
}[] = [{
  id: 'invalid',
  title: 'Invalid weight',
  subtitle: 'Reject 0 kg and recover',
  principle: 'Error prevention'
}, {
  id: 'estimated',
  title: 'Estimated weight',
  subtitle: 'Make uncertainty visible',
  principle: 'Visibility of system status'
}, {
  id: 'missing',
  title: 'Missing reference',
  subtitle: 'Explain an unavailable resource',
  principle: 'Error recognition and recovery'
}, {
  id: 'offline',
  title: 'Offline mode',
  subtitle: 'Show connection limits',
  principle: 'Visibility of system status'
}, {
  id: 'weight',
  title: 'Weight change',
  subtitle: 'Invalidate an outdated review',
  principle: 'Error prevention'
}, {
  id: 'end',
  title: 'Accidental end session',
  subtitle: 'Give the user a way back',
  principle: 'User control and freedom'
}];
const DEFAULT_DEMO = {
  active: false,
  running: false,
  time: 0,
  speed: 1,
  baseTime: 0,
  manual: false
};
function Brand({
  small = false
}: {
  small?: boolean;
}) {
  return <div className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-mark"><Plus size={small ? 19 : 23} strokeWidth={3} /></span><span>Pedi<span className="brand-light">Rescue</span><span className="brand-dot">.</span></span></div>;
}
export default function App() {
  const [state, setState] = useState(initialState);
  const [demo, setDemo] = useState(DEFAULT_DEMO);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string>();
  const [focusRect, setFocusRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>();
  const tabletRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const previousScreen = useRef(state.screen);
  const position = demoPosition(demo.time);
  const step = DEMO_STEPS[position.index];
  const principle = scenario ? SCENARIOS.find(item => item.id === scenario)!.principle : demo.active ? step.principle : {
    dashboard: 'Recognition rather than recall',
    medications: 'Feedback & error prevention',
    resuscitation: 'Visibility of system status',
    activity: 'Feedback & user control'
  }[state.screen];
  const dispatch = useCallback((action: Action) => {
    setShowHelp(false);
    setDemo(current => current.active ? {
      ...current,
      running: false,
      manual: true
    } : current);
    setFocusTarget(undefined);
    setState(current => reducer(current, {
      ...action,
      now: Date.now()
    }));
  }, []);
  useEffect(() => {
    if (!demo.active || !demo.running) return;
    let previous = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = now - previous;
      previous = now;
      setDemo(current => {
        const time = Math.min(TOTAL_DEMO_MS, current.time + delta * current.speed);
        return {
          ...current,
          time,
          running: time < TOTAL_DEMO_MS
        };
      });
    }, 80);
    return () => window.clearInterval(interval);
  }, [demo.active, demo.running]);
  useEffect(() => {
    if (!demo.active) return;
    const snapshot = demoSnapshot(demo.time, demo.baseTime);
    setState(snapshot.state);
    setFocusTarget(snapshot.focus);
  }, [demo.time, demo.baseTime, demo.active]);
  useEffect(() => {
    if (!state.timer.running || demo.active && !demo.manual) return;
    let previous = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const ms = now - previous;
      previous = now;
      setState(current => reducer(current, {
        type: 'TIMER_TICK',
        ms
      }));
    }, 100);
    return () => window.clearInterval(interval);
  }, [state.timer.running, demo.active, demo.manual]);
  useEffect(() => {
    contentRef.current?.scrollTo({
      top: 0
    });
    if (previousScreen.current !== state.screen) {
      contentRef.current?.querySelector<HTMLElement>('[data-page-heading]')?.focus({ preventScroll: true });
      previousScreen.current = state.screen;
    }
  }, [state.screen]);
  useEffect(() => {
    const scrollArea = state.dialog ? dialogContainer?.querySelector('.dialog-content') : contentRef.current;
    if (demo.active && focusTarget) scrollArea?.querySelector(`[data-focus="${focusTarget}"]`)?.scrollIntoView({
      block: 'nearest'
    });
    const update = () => {
      const target = tabletRef.current?.querySelector(`[data-focus="${focusTarget}"]`);
      const tablet = tabletRef.current;
      if (!demo.active || demo.manual || !target || !tablet) {
        setFocusRect(undefined);
        return;
      }
      const rect = target.getBoundingClientRect();
      const base = tablet.getBoundingClientRect();
      setFocusRect({
        left: rect.left - base.left - tablet.clientLeft,
        top: rect.top - base.top - tablet.clientTop,
        width: rect.width,
        height: rect.height
      });
    };
    const timeout = window.setTimeout(update, 130);
    window.addEventListener('resize', update);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', update);
    };
  }, [focusTarget, demo.active, demo.manual, state.dialog, state.screen, state.events.length, dialogContainer, fullscreen]);
  useEffect(() => {
    if (!showHelp) return;
    const help = helpRef.current;
    help?.focus({ preventScroll: true });
    function dismissOutside(event: Event) {
      if (event.target instanceof Node && !help?.contains(event.target) && !helpTriggerRef.current?.contains(event.target)) setShowHelp(false);
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      if (help?.contains(document.activeElement) || document.activeElement === document.body) helpTriggerRef.current?.focus({ preventScroll: true });
    };
  }, [showHelp]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !state.dialog) {
        if (showHelp) setShowHelp(false);
        else setFullscreen(false);
      }
    }
    document.addEventListener('keydown', keydown);
    document.body.classList.toggle('fullscreen-open', fullscreen);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.classList.remove('fullscreen-open');
    };
  }, [fullscreen, state.dialog, showHelp]);
  function startDemo() {
    setScenario(null);
    setShowHelp(false);
    setDemo({
      ...DEFAULT_DEMO,
      speed: demo.speed,
      active: true,
      running: true,
      baseTime: Date.now()
    });
  }
  function seek(index: number) {
    const time = stepStart(Math.max(0, Math.min(DEMO_STEPS.length - 1, index))) + 120;
    setDemo(current => ({
      ...current,
      time,
      running: false,
      manual: false
    }));
  }
  function exitDemo() {
    setDemo(current => ({
      ...current,
      active: false,
      running: false,
      manual: false
    }));
    setFocusTarget(undefined);
    setState(current => ({
      ...current,
      timer: {
        ...current.timer,
        running: false
      }
    }));
  }
  function resetScenario() {
    setShowHelp(false);
    setDemo(DEFAULT_DEMO);
    setScenario(null);
    setState(initialState());
    setFocusTarget(undefined);
  }
  function selectScenario(id: Scenario) {
    setShowHelp(false);
    setDemo(DEFAULT_DEMO);
    setScenario(id);
    setState(scenarioState(id));
    setFocusTarget(undefined);
  }
  function manualPause() {
    if (demo.running) setDemo(current => ({
      ...current,
      running: false,
      manual: true
    }));
  }
  const screenProps = {
    state,
    dispatch
  };
  const screens: Record<Screen, React.ReactNode> = {
    dashboard: <Dashboard {...screenProps} />,
    medications: <Medications {...screenProps} />,
    resuscitation: <Resuscitation {...screenProps} />,
    activity: <SessionActivity {...screenProps} />
  };
  return <div className={`presentation ${fullscreen ? 'is-fullscreen' : ''}`}>
    <header className="presentation-header"><div className="presentation-brand"><Brand /><span className="header-divider" /><span className="product-descriptor">Pediatric Emergency<br />Decision Support</span></div><div className="presentation-header-right"><span className="prototype-label"><span />HCI INTERACTIVE PROTOTYPE</span><Button variant="secondary" size="small" onClick={() => setFullscreen(true)}><Maximize2 size={14} />Fullscreen tablet</Button></div></header>
    <main className="presentation-main"><div className="presentation-intro"><div><span className="eyebrow"><span className="intro-line" />CLINICAL INTERACTION LAB</span><h2>Clarity. Care. Every interaction.</h2></div><p>An interactive exploration of safer workflows.<br /><span>Fictional patients. Real interactions.</span></p></div>
      <div className="showcase-layout"><div className="device-column"><div className="device" ref={tabletRef}><span className="device-camera" aria-hidden="true" /><div className="tablet-app" onPointerDownCapture={manualPause} onKeyDownCapture={event => {
              if (event.key !== 'Tab' && event.key !== 'Shift') manualPause();
            }}><header className="app-header" inert={!!state.dialog}>
            <div className="app-brand-area"><Brand small /><span>Emergency workspace</span></div>
            <div className="app-header-meta">
              {(state.timer.running || state.timer.elapsed > 0) && <button className="timer-return" aria-label={`${state.timer.running ? 'Running' : 'Paused'} timer ${formatTimer(state.timer.elapsed)}. Open Resuscitation`} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'resuscitation' })}><HeartPulse size={15} /><span>Timer {state.timer.running ? 'running' : 'paused'}</span><strong>{formatTimer(state.timer.elapsed)}</strong></button>}
              <span className={`connection-status ${state.offline ? 'offline' : ''}`} title={state.offline ? 'Simulated offline reference state' : 'Local educational simulation'}>{state.offline ? <WifiOff size={16} /> : <Wifi size={16} />}<span>{state.offline ? 'Offline' : 'Local simulation'}</span></span>
              <button ref={helpTriggerRef} className="help-button" aria-label="How to use this workspace" aria-controls={showHelp ? 'workspace-help' : undefined} aria-expanded={showHelp} onClick={() => setShowHelp(value => !value)}><CircleHelp size={20} /><span>Help</span></button>
              {fullscreen && <button className="help-button" aria-label="Exit fullscreen" onClick={() => setFullscreen(false)}><Minimize2 size={20} /></button>}
            </div>
          </header>
          <PatientStrip {...screenProps} />
          <div className="app-body" inert={!!state.dialog}>
            <nav className="app-navigation" aria-label="Clinical workspace">{NAV.map(({id, label, description, icon: Icon}) => <button key={id} type="button" className={`nav-item ${state.screen === id ? 'active' : ''}`} aria-label={label} aria-current={state.screen === id ? 'page' : undefined} onClick={() => dispatch({ type:'NAVIGATE', screen:id })}><Icon className="nav-icon" size={23} aria-hidden="true" /><span className="nav-item-copy"><span className="nav-item-label">{label}</span><small>{state.screen === id ? 'Current section' : description}</small></span>{state.screen === id && <Check className="nav-current" size={17} aria-hidden="true" />}{id === 'activity' && state.events.length > 0 && <span className="nav-count" aria-label={`${state.events.length} recorded events`}>{state.events.length}</span>}</button>)}</nav>
            <div className="screen-scroll" ref={contentRef} aria-label={`${NAV.find(item => item.id === state.screen)!.label} view`}><div key={state.screen} className="screen-content">{screens[state.screen]}</div></div>
          </div>
          <footer className="app-footer"><span><ShieldCheck size={14} />SIMULATION ONLY — NOT FOR CLINICAL USE</span><span>Fictional patient data</span></footer>
          <div className="home-indicator" aria-hidden="true" />
          {showHelp && <div ref={helpRef} id="workspace-help" className="help-popover" role="region" aria-label="Using this workspace" tabIndex={-1}><strong>Using this workspace</strong><p>Start in Patient to enter identity and weight. Choose Medicines for a safety review, or Resuscitation for the independent timer.</p><p>Activity shows your recorded actions. Patient details remain visible above every screen. All data is fictional; no medication can be administered.</p><Button size="small" variant="secondary" onClick={() => setShowHelp(false)}>Understood<Check size={13} /></Button></div>}
        <div className="dialog-layer" ref={setDialogContainer} /><ClinicalDialogs {...screenProps} container={dialogContainer} />
      </div>{focusRect && demo.active && <div className="demo-focus" style={focusRect} aria-hidden="true"><span><MousePointer2 size={12} />DEMO</span></div>}</div><div className="device-caption"><span><span className="caption-dot" />LIVE INTERACTIVE PROTOTYPE</span><span>Touch, click, or use your keyboard<MousePointer2 size={12} /></span></div></div>
      <aside className="presentation-panel"><section className="demo-panel"><div className="panel-heading"><span className="panel-icon"><Play size={16} /></span><div><h3>See the workflow.</h3><p>A guided, hands-free walkthrough.</p></div></div>{!demo.active ? <><div className="demo-preview"><span className="eyebrow">THE COMPLETE PATIENT JOURNEY</span><div className="demo-preview-route"><span>Patient</span><ArrowRight size={11} /><span>Safety checks</span><ArrowRight size={11} /><span>Review</span></div><div className="demo-meta"><span><span className="status-dot" />10 steps</span><span>~50 seconds</span></div></div><Button className="start-demo" onClick={startDemo}><Play size={15} fill="currentColor" />Start guided demo<ArrowRight size={15} /></Button><p className="demo-helper">Or interact with the tablet at your own pace.</p></> : <><div className="demo-step-status"><span className="tag tag-sage">{demo.running ? <span className="playing-bars"><i /><i /><i /></span> : demo.time >= TOTAL_DEMO_MS ? <Check size={12} /> : <Pause size={11} />}{demo.running ? 'Playing' : demo.time >= TOTAL_DEMO_MS ? 'Complete' : 'Paused'}</span><span className="mono">{String(position.index + 1).padStart(2, '0')} / 10</span></div><div className="demo-progress" role="progressbar" aria-label="Guided demo progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(demo.time / TOTAL_DEMO_MS * 100)}><span style={{
                  width: `${demo.time / TOTAL_DEMO_MS * 100}%`
                }} /></div><h4 className="demo-step-title" aria-live="polite">{step.title}</h4><p className="demo-step-description">{step.description}</p>{demo.manual && <div className="manual-notice"><MousePointer2 size={12} />Manual interaction paused the demo.</div>}<div className="playback-controls"><Button variant="secondary" size="icon" aria-label="Previous demo step" disabled={position.index === 0} onClick={() => seek(position.index - 1)}><ChevronLeft size={17} /></Button><Button className="pause-demo" onClick={() => {
                  if (demo.time >= TOTAL_DEMO_MS) startDemo();else setDemo(current => ({
                    ...current,
                    running: !current.running,
                    manual: false
                  }));
                }}>{demo.running ? <Pause size={14} /> : <Play size={14} />}{demo.running ? 'Pause' : demo.time >= TOTAL_DEMO_MS ? 'Replay' : 'Resume'}</Button><Button variant="secondary" size="icon" aria-label="Next demo step" disabled={position.index >= 9} onClick={() => seek(position.index + 1)}><ChevronRight size={17} /></Button></div><div className="demo-secondary-controls"><button onClick={startDemo}><RotateCcw size={12} />Restart</button><button onClick={exitDemo}><Square size={11} />Exit demo</button><select aria-label="Demo playback speed" value={demo.speed} onChange={event => setDemo(current => ({
                  ...current,
                  speed: Number(event.target.value)
                }))}><option value={1}>1× speed</option><option value={1.5}>1.5× speed</option></select></div><div className="demo-steps">{DEMO_STEPS.map((item, index) => <button key={item.title} className={index === position.index ? 'current' : index < position.index ? 'visited' : ''} aria-label={`Go to step ${index + 1}: ${item.title}`} title={item.title} onClick={() => seek(index)}>{index < position.index ? <Check size={10} /> : index + 1}</button>)}</div></>}
      <HciNotes screen={state.screen} principle={principle} /></section>
      <section className="scenario-panel"><div className="scenario-panel-heading"><span><SlidersHorizontal size={15} />Explore the edge cases</span><span className="scenario-count">06</span></div><p>Put the interface through its paces.</p><div className="scenario-list">{SCENARIOS.map((item, index) => <button key={item.id} className={scenario === item.id ? 'selected' : ''} onClick={() => selectScenario(item.id)}><span className="scenario-number">0{index + 1}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><ChevronRight size={14} /></button>)}</div><button className="reset-scenario" onClick={resetScenario}><RotateCcw size={13} />Reset workspace<span>Return to standby</span></button></section>
      <div className="presentation-note"><FlaskConical size={16} /><p>Built to explore usability.<br /><strong>Never for clinical decisions.</strong></p></div></aside></div>
    </main><footer className="presentation-footer"><span>PEDIRESCUE<span className="footer-separator">/</span>HUMAN–COMPUTER INTERACTION</span><span><ShieldCheck size={12} />An educational prototype, thoughtfully considered.</span></footer>
  </div>;
}
