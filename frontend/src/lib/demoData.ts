export const DEMO_OBSERVATIONS = [
  { signal: 'Focus difficulty', category: 'cognitive', severity: 'moderate', impact: 2, observed_at: 'Sep 07', note: 'Today felt scattered.' },
  { signal: 'Headache', category: 'physical', severity: 'mild', impact: 1, observed_at: 'Sep 07', note: 'Mild, morning.' },
  { signal: 'Sleep disruption', category: 'sleep', severity: 'moderate', impact: 2, observed_at: 'Sep 06', note: 'Restless night.' },
  { signal: 'Forgetfulness', category: 'cognitive', severity: 'moderate', impact: 2, observed_at: 'Sep 06', note: 'Lost train of thought.' },
  { signal: 'Focus difficulty', category: 'cognitive', severity: 'moderate', impact: 2, observed_at: 'Sep 05', note: 'Needed lists.' },
  { signal: 'Sleep disruption', category: 'sleep', severity: 'moderate', impact: 2, observed_at: 'Sep 02', note: 'Late screen time.' },
  { signal: 'Focus difficulty', category: 'cognitive', severity: 'moderate', impact: 2, observed_at: 'Sep 03', note: 'Meetings felt foggy.' },
  { signal: 'Forgetfulness', category: 'cognitive', severity: 'mild', impact: 1, observed_at: 'Sep 01', note: 'Forgot keys.' },
];

export const DEMO_INSIGHT = {
  summary: 'Your recent observations show a recurring relationship between reduced focus and poor sleep. This does not establish a cause, but the pattern may be useful to monitor.',
  patterns: [
    { title: 'Focus difficulty — rising trend', why_it_matters: 'Repeated concentration difficulties can be worth monitoring when they persist or interfere with daily activities.', observed: '6 observation(s) over 12 day(s). Avg severity 1.8/3.', influences: ['Sleep', 'Stress', 'Medication', 'Lifestyle', 'Other health factors'] },
    { title: 'Sleep disruption — stable trend', why_it_matters: 'Repeated sleep disruption can be worth monitoring when it persists or affects daily life.', observed: '4 observation(s) over 12 day(s). Avg severity 1.8/3.', influences: ['Sleep', 'Stress', 'Medication', 'Lifestyle', 'Other health factors'] },
    { title: 'Forgetfulness — stable trend', why_it_matters: 'Repeated forgetfulness can be worth monitoring when it persists or affects daily life.', observed: '3 observation(s) over 11 day(s). Avg severity 1.3/3.', influences: ['Sleep', 'Stress', 'Medication', 'Lifestyle', 'Other health factors'] },
  ],
  possible_context: ['Sleep disruption', 'Stress', 'Medications or recent changes in routine', 'Lifestyle factors (caffeine, screen time, exercise)', 'Other health factors'],
  questions_for_clinician: [
    'Which of these observations would be most useful for me to keep tracking?',
    'Could everyday factors like sleep or stress be contributing?',
    'What changes should prompt me to follow up sooner?',
  ],
  monitoring_suggestions: ['Sleep quality and duration', 'Focus and concentration', 'Impact on daily activities'],
  uncertainty: 'This analysis is based only on self-reported observations and cannot establish a medical diagnosis. A healthcare professional can help determine the cause.',
  safety_message: null,
};
