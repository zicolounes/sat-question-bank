/**
 * Placeholder learner analytics for the student dashboard.
 * Replace with Firestore / localStorage / computed stats when available.
 */
export const mockStudentDashboard = {
  headline: "Today's SAT Practice",
  subtitle: 'Your daily goal is 15 questions. Stats update as you practice.',
  dailyProgress: { completed: 8, goal: 15 },
  todayAccuracyPct: 82,
  weekAccuracyPct: 79,
  currentStreak: 4,
  longestStreak: 12,
  /** Monday → Sunday: true if practiced that day */
  weekPracticeDays: [true, true, true, false, true, false, false],
  dailyPlan: {
    math: 5,
    readingWriting: 5,
    mixed: 5,
    completedInPlan: 8,
    totalInPlan: 15,
    difficultySplit: { easy: 5, medium: 6, hard: 4 },
    progressToday: { math: 3, readingWriting: 4, mixed: 1 },
  },
  bestTopics: [
    { label: 'Linear equations', pct: 92, subject: 'Math', skill: 'Linear equations in one variable' },
    { label: 'Words in Context', pct: 88, subject: 'English', skill: 'Words in Context' },
    { label: 'Grammar boundaries', pct: 84, subject: 'English', skill: 'Boundaries' },
  ],
  weakTopics: [
    { label: 'Quadratics', pct: 56, subject: 'Math', skill: 'Nonlinear functions' },
    { label: 'Command of Evidence', pct: 61, subject: 'English', skill: 'Command of Evidence' },
    { label: 'Inferences', pct: 64, subject: 'English', skill: 'Inferences' },
  ],
  challenges: [
    {
      id: 'c1',
      title: 'Hard-mode run',
      description: 'Answer 5 Hard questions correctly in a row.',
      current: 3,
      target: 5,
      xp: 40,
      status: 'in_progress',
    },
    {
      id: 'c2',
      title: 'Daily volume',
      description: 'Complete 15 questions today across any topics.',
      current: 8,
      target: 15,
      xp: 25,
      status: 'in_progress',
    },
    {
      id: 'c3',
      title: 'Algebra mastery',
      description: 'Score 80%+ on a focused Algebra set.',
      current: 0,
      target: 1,
      xp: 30,
      status: 'locked',
    },
    {
      id: 'c4',
      title: 'Mistake mop-up',
      description: 'Review 3 questions you missed recently.',
      current: 3,
      target: 3,
      xp: 15,
      status: 'complete',
    },
    {
      id: 'c5',
      title: 'R&W drill',
      description: 'Finish one Reading & Writing timed drill.',
      current: 0,
      target: 1,
      xp: 20,
      status: 'locked',
    },
  ],
  recentActivity: [
    { id: 'a1', kind: 'practice', text: 'Completed 10 Algebra questions', timeLabel: 'Today' },
    { id: 'a2', kind: 'review', text: 'Reviewed 4 missed questions', timeLabel: 'Yesterday' },
    { id: 'a3', kind: 'challenge', text: 'Started a Hard difficulty challenge', timeLabel: 'Yesterday' },
    { id: 'a4', kind: 'score', text: 'Improved Reading & Writing accuracy by 6%', timeLabel: '2 days ago' },
  ],
};
