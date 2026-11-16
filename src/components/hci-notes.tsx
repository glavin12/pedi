import { ArrowUpRight, ChevronRight, ShieldCheck } from 'lucide-react';
import type { Screen } from '../lib/model';

const SCREEN_EXAMPLES: Record<Screen, string> = {
  dashboard: 'Patient → task → review maps the screen to the user’s goal. The patient banner keeps identity and weight visible across tasks.',
  medications: 'The selected medicine, patient context, checklist count, and recorded confirmation show the current stage and the next action.',
  resuscitation: 'Category buttons change the matching overview. Start, Pause, and Resume describe the timer’s action; Ready, Running, and Paused describe its state.',
  activity: 'The activity trail makes the result of an action inspectable. Filters and export help users find and retain the current session record.',
};

const NIELSEN = [
  ['Visibility of system status', 'Current-section marker, timer state, remaining checks, and recorded confirmation.'],
  ['Match with the real world', 'Patient, Medicines, Resuscitation, kg, and measured/estimated labels.'],
  ['User control and freedom', 'Keep editing, Continue session, and timer pause/resume.'],
  ['Consistency and standards', 'The same navigation, patient banner, button styles, and units across screens.'],
  ['Error prevention', 'Reject invalid weight, constrain example routes, and clear outdated review checks.'],
  ['Recognition rather than recall', 'Visible task choices and patient context instead of memorised details.'],
  ['Flexibility and efficiency', 'Name search, category filters, task shortcuts, and controllable demo playback.'],
  ['Aesthetic and minimalist design', 'Study summaries first; source details and prototype limits expand on demand.'],
  ['Error recognition and recovery', 'Field-specific explanations preserve entries and identify the correction.'],
  ['Help and documentation', 'Workspace Help, study-source links, and a next action beside each task.'],
];

const NORMAN = [
  ['Affordances', 'Native buttons, editable inputs, and checkboxes support touch and keyboard actions.'],
  ['Signifiers', 'Labelled buttons, selected checks, and arrows indicate where to act.'],
  ['Discoverability & visibility', 'Persistent navigation and patient context make available tasks and current details visible.'],
  ['Mapping', 'Patient setup → medicine selection → safety checks → recorded activity follows the task.'],
  ['Feedback', 'A confirmed patient, remaining-check count, timer state, and recorded entry reveal outcomes.'],
  ['Constraints', 'Input validation and recording guards prevent proceeding with incomplete or outdated checks.'],
  ['Conceptual model', 'One patient session connects the four workspaces; the same dose example follows the safety review into Activity.'],
];

export function HciNotes({ screen, principle }: { screen: Screen; principle: string }) {
  return <details className="principle-box hci-notes">
    <summary aria-label={`HCI design notes: ${principle}`}><span><span className="micro-label">HCI PRINCIPLE IN FOCUS</span><span className="principle-name"><ShieldCheck size={15} />{principle}</span></span><ChevronRight size={15} /></summary>
    <div className="hci-notes-body">
      <p className="hci-current"><strong>On the current screen</strong>{SCREEN_EXAMPLES[screen]}</p>
      <h3>Don Norman · design concepts</h3>
      <dl>{NORMAN.map(([name, example]) => <div key={name}><dt>{name}</dt><dd>{example}</dd></div>)}</dl>
      <h3>Jakob Nielsen · 10 heuristics</h3>
      <dl>{NIELSEN.map(([name, example], index) => <div key={name}><dt>{index + 1}. {name}</dt><dd>{example}</dd></div>)}</dl>
      <p>These are design choices to evaluate, not evidence of usability testing with medical staff.</p>
      <div className="hci-sources"><a href="https://www.nngroup.com/articles/ten-usability-heuristics/" target="_blank" rel="noreferrer">Nielsen’s original heuristics<ArrowUpRight size={12} /><span className="sr-only"> (opens in a new tab)</span></a><a href="https://jnd.org/signifiers-not-affordances/" target="_blank" rel="noreferrer">Norman on signifiers<ArrowUpRight size={12} /><span className="sr-only"> (opens in a new tab)</span></a></div>
    </div>
  </details>;
}
