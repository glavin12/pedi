// General study summaries only. These sources do not validate this simulator or supply a pediatric dosing protocol.
export const MEDICINE_OVERVIEWS: Record<string, { family: string; summary: string; focus: string; source: string; url: string }> = {
  epinephrine: {
    family: 'Adrenergic agonist · also called adrenaline',
    summary: 'Epinephrine acts on the airways and blood vessels. It is used in emergency medicine, including severe allergic reactions.',
    focus: 'Different indications use different preparations and routes. The selected route here is a review example, not an instruction.',
    source: 'MedlinePlus · Epinephrine injection',
    url: 'https://medlineplus.gov/druginfo/meds/a603002.html',
  },
  amiodarone: {
    family: 'Antiarrhythmic medicine',
    summary: 'Amiodarone is used for certain serious abnormal heart rhythms. Its use requires professional assessment and monitoring.',
    focus: 'The rhythm, formulation, interactions, and monitoring requirements belong in an approved clinical reference.',
    source: 'MedlinePlus · Amiodarone',
    url: 'https://medlineplus.gov/druginfo/meds/a687009.html',
  },
  adenosine: {
    family: 'Antiarrhythmic medicine',
    summary: 'Adenosine affects electrical conduction through the heart’s AV node. It is used for certain supraventricular tachycardias.',
    focus: 'A fast heart rate alone does not determine treatment. Rhythm assessment and an approved protocol are required.',
    source: 'emc · Adenosine product information',
    url: 'https://www.medicines.org.uk/emc/product/3337/smpc',
  },
  atropine: {
    family: 'Antimuscarinic medicine',
    summary: 'Atropine blocks muscarinic effects of acetylcholine. Some emergency uses involve particular causes of a slow heart rate.',
    focus: 'The cause of a slow heart rate matters. This library does not select a treatment for the patient.',
    source: 'emc · Atropine product information',
    url: 'https://www.medicines.org.uk/emc/product/8790/smpc',
  },
  salbutamol: {
    family: 'Bronchodilator · also called albuterol',
    summary: 'Salbutamol relaxes airway muscles to help relieve symptoms such as wheezing and breathlessness in conditions including asthma.',
    focus: 'Inhalers and nebulisers are different delivery systems. Product-specific instructions are outside this demonstration.',
    source: 'NHS · About salbutamol inhalers',
    url: 'https://www.nhs.uk/medicines/salbutamol-inhaler/about-salbutamol-inhalers/',
  },
};

export const RESUSCITATION_OVERVIEWS: Record<string, { summary: string; concepts: string[]; task: string; source: string; url: string }> = {
  'Cardiac arrest': {
    summary: 'Cardiac arrest means the heart is no longer pumping blood effectively. It is different from a heart attack.',
    concepts: ['Cardiac and respiratory arrest are different conditions.', 'This overview does not assess a patient or provide a resuscitation algorithm.'],
    task: 'Start the timer, pause it, then find the timer events in Activity.',
    source: 'American Heart Association · Cardiac arrest',
    url: 'https://www.heart.org/en/health-topics/cardiac-arrest/about-cardiac-arrest',
  },
  Bradycardia: {
    summary: 'Bradycardia describes a heart rate that is slower than expected. Interpretation depends on age and the person’s condition.',
    concepts: ['Adult heart-rate thresholds must not be assumed to apply to children.', 'A category selection is not a diagnosis or treatment recommendation.'],
    task: 'Check the age in the patient banner. Edit the patient if the details need correcting.',
    source: 'American Heart Association · Bradycardia',
    url: 'https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/bradycardia--slow-heart-rate',
  },
  Tachycardia: {
    summary: 'Tachycardia describes a heart rate that is faster than expected. Different rhythms and causes require different assessments.',
    concepts: ['Age, activity, and clinical condition affect the interpretation of heart rate.', 'This prototype does not interpret an ECG or choose a treatment.'],
    task: 'Browse the medicine library, then return here. The patient and timer stay in view or retain their state.',
    source: 'American Heart Association · Tachycardia',
    url: 'https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/tachycardia--fast-heart-rate',
  },
  'Respiratory emergencies': {
    summary: 'Respiratory arrest means breathing has stopped. Breathing problems and cardiac arrest are related but are not the same condition.',
    concepts: ['Respiratory arrest can lead to cardiac arrest.', 'This overview does not assess breathing or provide ventilation instructions.'],
    task: 'Switch between reference categories. The selected title and overview change together; the timer is independent.',
    source: 'American Heart Association · Respiratory and cardiac arrest',
    url: 'https://www.heart.org/en/health-topics/cardiac-arrest/about-cardiac-arrest',
  },
};
