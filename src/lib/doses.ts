import type { Patient } from './model';

const AHA_BASE = 'https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/';
const RULES: Record<string, { name: string; indication: string; rate?: number; minimum?: number; maximum: number; routes: string[]; source: string; url: string }> = {
  epinephrine: { name: 'Epinephrine', indication: 'Cardiac arrest · single IV/IO dose example (not anaphylaxis)', rate: 0.01, maximum: 1, routes: ['IV / IO', 'IV', 'IO'], source: 'AHA/AAP 2025 · Pediatric cardiac arrest', url: `${AHA_BASE}Algorithm-PALS-CA-250123.pdf` },
  amiodarone: { name: 'Amiodarone', indication: 'Shock-refractory VF/pulseless VT · initial dose only', rate: 5, maximum: 300, routes: ['IV / IO', 'IV', 'IO'], source: 'AHA/AAP 2025 · Pediatric cardiac arrest', url: `${AHA_BASE}Algorithm-PALS-CA-250123.pdf` },
  adenosine: { name: 'Adenosine', indication: 'Supraventricular tachycardia · first dose only', rate: 0.1, maximum: 6, routes: ['IV'], source: 'AHA/AAP 2025 · Pediatric tachyarrhythmia', url: `${AHA_BASE}Algorithm-PALS-Tachyarrhythmia-250117.pdf` },
  atropine: { name: 'Atropine', indication: 'Bradycardia with increased vagal tone or primary AV block · single dose', rate: 0.02, minimum: 0.1, maximum: 0.5, routes: ['IV / IO', 'IV', 'IO'], source: 'AHA/AAP 2025 · Pediatric bradycardia', url: `${AHA_BASE}Algorithm-PALS-Bradycardia-250121.pdf` },
  salbutamol: { name: 'Salbutamol', indication: 'Severe asthma · intermittent nebulised dose example (not inhaler puffs)', maximum: 5, routes: ['Inhaled'], source: 'NSW Health ECAT · Wheeze (May 2024)', url: 'https://aci.health.nsw.gov.au/ecat/paediatric/wheeze' },
};

export interface DoseSnapshot {
  simulationOnly: true;
  medicineId: string;
  medicineName: string;
  patient: Patient;
  route: string;
  indication: string;
  amountMg: number;
  rawMg: number;
  formula: string;
  limits: string;
  adjustment: string;
  ageBasis: string;
  source: string;
  sourceUrl: string;
  ruleVersion: string;
}
export type DoseResult = { dose: DoseSnapshot; reason?: never } | { dose?: never; reason: string };
export const formatDose = (value: number) => String(Number(value.toPrecision(8)));

// These are scoped reference arithmetic examples, never a treatment selector or preparation calculator.
export function calculateDose(patient: Patient | null, medicineId: string, route: string, missingReference = false): DoseResult {
  if (!patient) return { reason: 'Add a patient with age and weight to see the dose example.' };
  const rule = RULES[medicineId];
  if (!rule) return { reason: 'No dose example is available for this medicine.' };
  if (missingReference) return { reason: 'The reference is disabled for this exercise. Choose another medicine or reset the workspace.' };
  if (!rule.routes.includes(route)) return { reason: 'Choose a supported route for this dose example.' };
  if (!['years', 'months', 'days'].includes(patient.ageUnit) || !Number.isFinite(patient.age) || patient.age < 0 || !Number.isFinite(patient.weight) || patient.weight <= 0) return { reason: 'Confirm a valid age and a weight greater than 0 kg.' };
  const ageYears = patient.age / (patient.ageUnit === 'months' ? 12 : patient.ageUnit === 'days' ? 365.25 : 1);
  if (ageYears < 28 / 365.25 || ageYears > 18) return { reason: 'This prototype supports dose examples from 28 days to 18 years only. Neonatal and adult examples are unavailable.' };
  if (medicineId === 'salbutamol' && (ageYears < 1 || ageYears >= 16)) return { reason: 'This salbutamol example covers ages 1 to 15 years only, matching the selected reference.' };
  const rawMg = rule.rate ? patient.weight * rule.rate : ageYears < 6 ? 2.5 : 5;
  if (!Number.isFinite(rawMg) || rawMg <= 0) return { reason: 'The measurement cannot be used for this calculation. Check the weight.' };
  const amountMg = Math.min(rule.maximum, Math.max(rule.minimum ?? 0, rawMg));
  const limits = rule.rate ? `${rule.minimum ? `Minimum ${rule.minimum} mg · ` : ''}Maximum ${rule.maximum} mg for this example` : '1 to under 6 years: 2.5 mg · 6 to 15 years: 5 mg';
  return { dose: {
    simulationOnly: true,
    medicineId,
    medicineName: rule.name,
    patient: { ...patient },
    route,
    indication: rule.indication,
    rawMg,
    amountMg,
    formula: rule.rate ? `${formatDose(patient.weight)} kg × ${rule.rate} mg/kg = ${formatDose(rawMg)} mg` : `${patient.age} ${patient.ageUnit} → ${ageYears < 6 ? 'under 6 years' : '6 years or older'} → ${amountMg} mg (age band)`,
    limits,
    adjustment: amountMg < rawMg ? `Maximum applied: ${rule.maximum} mg` : amountMg > rawMg ? `Minimum applied: ${rule.minimum} mg` : 'Within the reference limits',
    ageBasis: rule.rate ? 'Prototype range: 28 days to 18 years. Age checks eligibility; this formula uses weight, without an extra age multiplier.' : 'Prototype range: 1 to 15 years. Age selects the nebulised dose band; weight is retained as patient context.',
    source: rule.source,
    sourceUrl: rule.url,
    ruleVersion: medicineId === 'salbutamol' ? 'NSW-ECAT-2024-05 / demo-v1' : 'AHA-AAP-2025 / demo-v1',
  } };
}

export function doseSummary(dose: DoseSnapshot) {
  return `${dose.medicineName} · ${formatDose(dose.amountMg)} mg · ${dose.route} · ${dose.patient.id}, ${dose.patient.age} ${dose.patient.ageUnit}, ${dose.patient.weight} kg (${dose.patient.method === 'measured' ? 'measured' : 'estimated'}), revision ${dose.patient.revision}. ${dose.indication}. ${dose.formula}. ${dose.limits}. ${dose.adjustment}. ${dose.source} · ${dose.ruleVersion}. Simulation only; no medication administered.`;
}
