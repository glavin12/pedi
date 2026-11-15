import { evaluatePawper, type PawperEstimate } from './pawper';

export type Screen = 'dashboard' | 'medications' | 'resuscitation' | 'activity';
export type Dialog = 'patient' | 'discard-patient' | 'review' | 'record' | 'timer-reset' | 'end' | null;
export type Method = 'measured' | 'estimated' | 'length';
export interface Patient {
  id: string;
  age: number;
  ageUnit: string;
  weight: number;
  method: Method;
  revision: number;
  estimation?: PawperEstimate;
}
export interface PatientForm {
  id: string;
  age: string;
  ageUnit: string;
  weight: string;
  unit: string;
  method: Method;
  length: string;
  mac: string;
}
export interface Activity {
  id: number;
  at: number;
  kind: 'info' | 'warning' | 'success';
  title: string;
  detail: string;
}
export interface Medication {
  id: string;
  name: string;
  category: string;
  available: boolean;
  route: string;
}
export const MEDICATIONS: Medication[] = [{
  id: 'epinephrine',
  name: 'Epinephrine',
  category: 'Resuscitation',
  available: true,
  route: 'IV / IO'
}, {
  id: 'amiodarone',
  name: 'Amiodarone',
  category: 'Resuscitation',
  available: true,
  route: 'IV / IO'
}, {
  id: 'adenosine',
  name: 'Adenosine',
  category: 'Cardiovascular',
  available: true,
  route: 'IV'
}, {
  id: 'atropine',
  name: 'Atropine',
  category: 'Cardiovascular',
  available: true,
  route: 'IV / IO'
}, {
  id: 'salbutamol',
  name: 'Salbutamol',
  category: 'Respiratory',
  available: false,
  route: 'Inhaled'
}];
export const REFERENCES = ['Cardiac arrest', 'Bradycardia', 'Tachycardia', 'Respiratory emergencies'];
export interface AppState {
  screen: Screen;
  patient: Patient | null;
  form: PatientForm;
  errors: Record<string, string>;
  dialog: Dialog;
  events: Activity[];
  baseTime: number;
  completed: boolean;
  lastPatient: Patient | null;
  offline: boolean;
  search: string;
  category: string;
  selectedMedication: string;
  route: string;
  checks: string[];
  reviewedRevision: number | null;
  reviewAttempted: boolean;
  reviewRecorded: boolean;
  staleReview: boolean;
  recordNote: string;
  reference: string;
  expandedReference: boolean;
  timer: {
    elapsed: number;
    running: boolean;
  };
}
export const emptyForm = (): PatientForm => ({
  id: '',
  age: '',
  ageUnit: 'years',
  weight: '',
  unit: 'kg',
  method: 'measured',
  length: '',
  mac: ''
});
export function initialState(baseTime = Date.now()): AppState {
  return {
    screen: 'dashboard',
    patient: null,
    form: emptyForm(),
    errors: {},
    dialog: null,
    events: [],
    baseTime,
    completed: false,
    lastPatient: null,
    offline: false,
    search: '',
    category: 'All',
    selectedMedication: 'epinephrine',
    route: 'IV / IO',
    checks: [],
    reviewedRevision: null,
    reviewAttempted: false,
    reviewRecorded: false,
    staleReview: false,
    recordNote: '',
    reference: REFERENCES[0],
    expandedReference: false,
    timer: {
      elapsed: 0,
      running: false
    }
  };
}
export type Action = ({
  type: 'NAVIGATE';
  screen: Screen;
} | {
  type: 'OPEN_PATIENT';
} | {
  type: 'FORM';
  field: keyof PatientForm;
  value: string;
} | {
  type: 'SUBMIT_PATIENT';
} | {
  type: 'CLOSE_DIALOG';
} | {
  type: 'DISCARD_PATIENT';
} | {
  type: 'RETURN_TO_PATIENT';
} | {
  type: 'SEARCH';
  value: string;
} | {
  type: 'CATEGORY';
  value: string;
} | {
  type: 'SELECT_MEDICATION';
  id: string;
} | {
  type: 'ROUTE';
  value: string;
} | {
  type: 'OPEN_REVIEW';
} | {
  type: 'CHECK';
  value: string;
} | {
  type: 'OPEN_RECORD';
} | {
  type: 'RECORD_NOTE';
  value: string;
} | {
  type: 'RECORD';
} | {
  type: 'REFERENCE';
  value: string;
} | {
  type: 'EXPAND_REFERENCE';
} | {
  type: 'TIMER_TOGGLE';
} | {
  type: 'TIMER_TICK';
  ms: number;
} | {
  type: 'TIMER_RESET_REQUEST';
} | {
  type: 'TIMER_RESET';
} | {
  type: 'OFFLINE';
  value: boolean;
} | {
  type: 'END_REQUEST';
} | {
  type: 'END_CONFIRM';
}) & {
  now?: number;
};
export function validatePatient(form: PatientForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.id.trim()) errors.id = 'Enter a fictional patient identifier.';
  if (!form.age.trim() || !Number.isFinite(Number(form.age)) || Number(form.age) < 0) errors.age = 'Enter a valid, non-negative age.';
  if (form.method === 'length') {
    Object.assign(errors, evaluatePawper(form.length, form.mac).errors);
    const age = Number(form.age);
    const ageYears = form.ageUnit === 'months' ? age / 12 : form.ageUnit === 'days' ? age / 365.25 : age;
    if (ageYears > 18) errors.age = 'PAWPER XL-MAC is limited to ages 0–18 years in this pediatric simulator. Enter a measured weight.';
  } else {
    if (!form.weight.trim()) errors.weight = 'Weight is required. Enter the patient’s weight in kg.';
    else if (!Number.isFinite(Number(form.weight)) || Number(form.weight) <= 0) errors.weight = 'Weight must be a number greater than 0. Check the measurement and try again.';
    if (form.unit !== 'kg') errors.unit = 'Only kilograms (kg) are supported. Verify and re-enter the measurement in kg; no automatic conversion is applied.';
  }
  return errors;
}
function log(state: AppState, action: Action, kind: Activity['kind'], title: string, detail = ''): AppState {
  return {
    ...state,
    events: [...state.events, {
      id: state.events.length + 1,
      at: action.now ?? state.baseTime,
      kind,
      title,
      detail
    }]
  };
}
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return {
        ...state,
        screen: action.screen,
        dialog: null
      };
    case 'OPEN_PATIENT':
      {
        const patient = state.patient;
        return {
          ...state,
          dialog: 'patient',
          errors: {},
          form: patient ? {
            id: patient.id,
            age: String(patient.age),
            ageUnit: patient.ageUnit,
            weight: String(patient.weight),
            method: patient.method,
            unit: 'kg',
            length: patient.estimation ? String(patient.estimation.lengthCm) : '',
            mac: patient.estimation ? String(patient.estimation.macCm) : ''
          } : emptyForm()
        };
      }
    case 'FORM':
      return {
        ...state,
        form: {
          ...state.form,
          [action.field]: action.value
        },
        errors: action.field === 'method'
          ? Object.fromEntries(Object.entries(state.errors).filter(([field]) => !['weight', 'unit', 'length', 'mac'].includes(field)))
          : { ...state.errors, [action.field]: '' }
      };
    case 'SUBMIT_PATIENT':
      {
        const errors = validatePatient(state.form);
        if (Object.keys(errors).length) return log({
          ...state,
          errors
        }, action, 'warning', 'Invalid patient input detected', Object.values(errors).join(' '));
        const existing = state.patient;
        const estimation = state.form.method === 'length' ? evaluatePawper(state.form.length, state.form.mac).estimate : undefined;
        const weight = estimation?.weightKg ?? Number(state.form.weight);
        const changed = !!existing && (existing.weight !== weight || existing.method !== state.form.method || existing.id !== state.form.id.trim() || existing.age !== Number(state.form.age) || existing.ageUnit !== state.form.ageUnit || existing.estimation?.lengthCm !== estimation?.lengthCm || existing.estimation?.macCm !== estimation?.macCm);
        const patient: Patient = {
          id: state.form.id.trim(),
          age: Number(state.form.age),
          ageUnit: state.form.ageUnit,
          weight,
          method: state.form.method,
          estimation,
          revision: (existing?.revision ?? 0) + (changed || !existing ? 1 : 0)
        };
        let next: AppState = {
          ...state,
          patient,
          dialog: null,
          errors: {},
          completed: false,
          checks: changed ? [] : state.checks,
          reviewRecorded: changed ? false : state.reviewRecorded,
          staleReview: changed && state.reviewedRevision !== null ? true : state.staleReview,
          events: state.completed ? [] : state.events
        };
        if (!existing) next = log(log(next, action, 'success', 'Emergency session started', `Fictional patient ${patient.id}.`), action, 'info', 'Patient details confirmed', `${patient.age} ${patient.ageUnit} · ${patient.weight} kg · ${patient.method} weight.`);else next = log(next, action, changed ? 'warning' : 'info', changed ? 'Patient weight or identity edited' : 'Patient details updated', `${patient.weight} kg · ${patient.method} weight.`);
        if (changed && state.reviewedRevision !== null) next = log(next, action, 'warning', 'Previous medication review invalidated', 'Patient details changed. Repeat all patient-dependent checks.');
        if (estimation) next = log(next, action, 'info', 'PAWPER XL-MAC weight estimated', `${estimation.lengthCm} cm length · ${estimation.macCm} cm MAC · HS${estimation.habitusScore} · ${weight} kg estimated total body weight · ${estimation.reference}.`);
        if (patient.method !== 'measured') next = log(next, action, 'warning', 'Estimated weight warning', 'Confirm a measured weight before any real clinical decision.');
        return next;
      }
    case 'CLOSE_DIALOG':
      if (state.dialog === 'discard-patient') return { ...state, dialog: 'patient' };
      if (state.dialog === 'patient') {
        const original = reducer(state, { type: 'OPEN_PATIENT' }).form;
        const dirty = (Object.keys(state.form) as (keyof PatientForm)[]).some(key => state.form[key] !== original[key]);
        if (dirty) return { ...state, dialog: 'discard-patient' };
      }
      return {
        ...state,
        dialog: null
      };
    case 'DISCARD_PATIENT':
      return { ...state, dialog: null, form: emptyForm(), errors: {} };
    case 'RETURN_TO_PATIENT':
      return { ...state, dialog: 'patient' };
    case 'SEARCH':
      return {
        ...state,
        search: action.value
      };
    case 'CATEGORY':
      return {
        ...state,
        category: action.value
      };
    case 'SELECT_MEDICATION':
      {
        const medication = MEDICATIONS.find(item => item.id === action.id);
        if (!medication) return state;
        return log({
          ...state,
          selectedMedication: action.id,
          route: medication.route,
          checks: [],
          reviewedRevision: null,
          reviewAttempted: false,
          reviewRecorded: false,
          recordNote: '',
          staleReview: false
        }, action, 'info', 'Medication reference opened', `${medication.name}. Educational placeholder; no verified dosing content.`);
      }
    case 'ROUTE':
      return {
        ...state,
        route: action.value,
        checks: [],
        reviewedRevision: null,
        reviewAttempted: false,
        reviewRecorded: false,
        recordNote: ''
      };
    case 'OPEN_REVIEW':
      {
        if (!state.patient) return reducer(state, {
          type: 'OPEN_PATIENT'
        });
        return log({
          ...state,
          dialog: 'review',
          reviewAttempted: true,
          reviewRecorded: false,
          reviewedRevision: state.patient.revision,
          staleReview: false
        }, action, 'warning', 'Safety check blocked clinical calculation', 'Reference and concentration are unverified. No dose or administration volume was calculated.');
      }
    case 'CHECK':
      return {
        ...state,
        checks: state.checks.includes(action.value) ? state.checks.filter(item => item !== action.value) : [...state.checks, action.value]
      };
    case 'OPEN_RECORD':
      return state.patient && !state.staleReview && !state.reviewRecorded && state.reviewAttempted && state.checks.length === 3 ? {
        ...state,
        dialog: 'record'
      } : state;
    case 'RECORD_NOTE':
      return {
        ...state,
        recordNote: action.value
      };
    case 'RECORD':
      {
        if (!state.patient || state.staleReview || state.reviewRecorded || !state.reviewAttempted || state.checks.length !== 3 || state.reviewedRevision !== state.patient.revision) return state;
        return log({
          ...state,
          dialog: null,
          recordNote: '',
          reviewRecorded: true
        }, action, 'info', 'Simulated medication review recorded', `${MEDICATIONS.find(m => m.id === state.selectedMedication)?.name}. Unverified references acknowledged. No medication administered.${state.recordNote.trim() ? ` Note: ${state.recordNote.trim()}` : ''}`);
      }
    case 'REFERENCE':
      return {
        ...state,
        reference: action.value,
        expandedReference: false
      };
    case 'EXPAND_REFERENCE':
      return {
        ...state,
        expandedReference: !state.expandedReference
      };
    case 'TIMER_TOGGLE':
      return log({
        ...state,
        timer: {
          ...state.timer,
          running: !state.timer.running
        }
      }, action, 'info', state.timer.running ? 'Demonstration timer paused' : state.timer.elapsed ? 'Demonstration timer resumed' : 'Demonstration timer started', 'Educational timer only; no treatment interval is prescribed.');
    case 'TIMER_TICK':
      return state.timer.running ? {
        ...state,
        timer: {
          ...state.timer,
          elapsed: state.timer.elapsed + Math.max(0, action.ms)
        }
      } : state;
    case 'TIMER_RESET_REQUEST':
      return {
        ...state,
        dialog: 'timer-reset'
      };
    case 'TIMER_RESET':
      return log({
        ...state,
        dialog: null,
        timer: {
          elapsed: 0,
          running: false
        }
      }, action, 'info', 'Demonstration timer reset', 'Reset confirmed by the user.');
    case 'OFFLINE':
      return log({
        ...state,
        offline: action.value
      }, action, action.value ? 'warning' : 'info', action.value ? 'Offline reference unavailable' : 'Reference connection restored', action.value ? 'No verified offline reference is available. Calculation remains blocked.' : 'Simulation placeholders remain unverified.');
    case 'END_REQUEST':
      return state.patient ? {
        ...state,
        dialog: 'end'
      } : state;
    case 'END_CONFIRM':
      {
        if (!state.patient) return state;
        return log({
          ...state,
          lastPatient: state.patient,
          patient: null,
          dialog: null,
          screen: 'dashboard',
          completed: true,
          timer: {
            elapsed: 0,
            running: false
          },
          checks: [],
          reviewedRevision: null,
          staleReview: false,
          reviewAttempted: false,
          reviewRecorded: false
        }, action, 'success', 'Session completed', 'Educational simulation ended. No medication administered.');
      }
  }
}
export function filteredMedications(search: string, category: string) {
  return MEDICATIONS.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase()) && (category === 'All' || item.category === category));
}
export function formatTimer(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
export const demoPatientActions: Action[] = [{
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
  value: '18'
}, {
  type: 'SUBMIT_PATIENT'
}];
export type Scenario = 'invalid' | 'estimated' | 'missing' | 'offline' | 'weight' | 'end';
export function scenarioState(scenario: Scenario, now = Date.now()): AppState {
  let state = initialState(now);
  const apply = (actions: Action[]) => {
    for (const action of actions) state = reducer(state, {
      ...action,
      now
    });
  };
  if (scenario === 'invalid') {
    apply(demoPatientActions.slice(0, -2));
    apply([{
      type: 'FORM',
      field: 'weight',
      value: '0'
    }, {
      type: 'SUBMIT_PATIENT'
    }]);
  } else {
    apply(demoPatientActions);
    if (scenario === 'estimated') apply([{
      type: 'OPEN_PATIENT'
    }, {
      type: 'FORM',
      field: 'method',
      value: 'estimated'
    }, {
      type: 'SUBMIT_PATIENT'
    }]);
    if (scenario === 'missing') apply([{
      type: 'NAVIGATE',
      screen: 'medications'
    }, {
      type: 'SELECT_MEDICATION',
      id: 'salbutamol'
    }]);
    if (scenario === 'offline') apply([{
      type: 'NAVIGATE',
      screen: 'medications'
    }, {
      type: 'OFFLINE',
      value: true
    }]);
    if (scenario === 'weight') apply([{
      type: 'NAVIGATE',
      screen: 'medications'
    }, {
      type: 'OPEN_REVIEW'
    }, {
      type: 'CLOSE_DIALOG'
    }, {
      type: 'OPEN_PATIENT'
    }, {
      type: 'FORM',
      field: 'weight',
      value: '20'
    }, {
      type: 'SUBMIT_PATIENT'
    }]);
    if (scenario === 'end') apply([{
      type: 'END_REQUEST'
    }]);
  }
  return state;
}
