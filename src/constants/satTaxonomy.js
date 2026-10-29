export const SUBJECTS = /** @type {const} */ (['Math', 'English']);

export const SAT_TAXONOMY = {
  Math: {
    Algebra: [
      'Linear equations in one variable',
      'Linear functions',
      'Linear equations in two variables',
      'Systems of two linear equations in two variables',
      'Linear inequalities in one or two variables',
    ],
    'Advanced Math': [
      'Nonlinear functions',
      'Nonlinear equations in one variable and systems of equations in two variables',
      'Equivalent expressions',
    ],
    'Problem-Solving and Data Analysis': [
      'Ratios, rates, proportional relationships, and units',
      'Percentages',
      'One-variable data: Distributions and measures of center and spread',
      'Two-variable data: Models and scatterplots',
      'Probability and conditional probability',
      'Inference from sample statistics and margin of error',
      'Evaluating statistical claims: Observational studies and experiments',
    ],
    'Geometry and Trigonometry': [
      'Area and volume',
      'Lines, angles, and triangles',
      'Right triangles and trigonometry',
      'Circles',
    ],
  },
  English: {
    'Information and Ideas': [
      'Central Ideas and Details',
      'Inferences',
      'Command of Evidence',
    ],
    'Craft and Structure': [
      'Words in Context',
      'Text Structure and Purpose',
      'Cross-Text Connections',
    ],
    'Expression of Ideas': ['Rhetorical Synthesis', 'Transitions'],
    'Standard English Conventions': ['Boundaries', 'Form, Structure, and Sense'],
  },
};

export const DIFFICULTIES = /** @type {const} */ (['Easy', 'Medium', 'Hard']);
export const TIERS = /** @type {const} */ (['1', '2', '3']);

export const ANSWER_CHOICES = /** @type {const} */ (['A', 'B', 'C', 'D']);

export function getDomainsForSubject(subject) {
  if (!subject || !SAT_TAXONOMY[subject]) return [];
  return Object.keys(SAT_TAXONOMY[subject]);
}

export function getSkillsForSubjectDomain(subject, domain) {
  if (!subject || !domain) return [];
  const subjectDomains = SAT_TAXONOMY[subject];
  if (!subjectDomains || !subjectDomains[domain]) return [];
  return subjectDomains[domain];
}

/** Domain key under `subject` that lists this skill, or null if not found. */
export function findDomainForSkill(subject, skill) {
  if (!subject || !skill || !SAT_TAXONOMY[subject]) return null;
  const subj = SAT_TAXONOMY[subject];
  for (const [domain, skills] of Object.entries(subj)) {
    if (Array.isArray(skills) && skills.includes(skill)) return domain;
  }
  return null;
}

/** First subject (Math or English) whose taxonomy lists this skill. */
export function findSubjectAndDomainForSkill(skill) {
  if (!skill) return null;
  for (const subject of SUBJECTS) {
    const domain = findDomainForSkill(subject, skill);
    if (domain) return { subject, domain };
  }
  return null;
}

/** Which subject (Math or English) owns this domain name in the taxonomy, or null. */
export function findSubjectForDomain(domain) {
  if (!domain) return null;
  for (const subject of SUBJECTS) {
    const domains = SAT_TAXONOMY[subject];
    if (domains && Object.prototype.hasOwnProperty.call(domains, domain)) return subject;
  }
  return null;
}

