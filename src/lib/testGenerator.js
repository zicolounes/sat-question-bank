/**
 * Full-length SAT practice test generator.
 * Generates modules with proper domain/difficulty distribution.
 */

/** Module configuration */
export const TEST_CONFIG = {
  rw: {
    module1Questions: 27,
    module2Questions: 27,
    module1Minutes: 32,
    module2Minutes: 32,
    hardRouteThreshold: 18, // out of 27
    domains: {
      'Craft and Structure': { total: 14, m1Target: 7 },
      'Information and Ideas': { total: 13, m1Target: 7 },
      'Standard English Conventions': { total: 15, m1Target: 8 },
      'Expression of Ideas': { total: 12, m1Target: 5 },
    },
    domainOrder: [
      'Craft and Structure',
      'Information and Ideas',
      'Standard English Conventions',
      'Expression of Ideas',
    ],
  },
  math: {
    module1Questions: 22,
    module2Questions: 22,
    module1Minutes: 35,
    module2Minutes: 35,
    hardRouteThreshold: 15, // out of 22
    domains: {
      'Algebra': { total: 15, m1Target: 8 },
      'Advanced Math': { total: 15, m1Target: 7 },
      'Problem-Solving and Data Analysis': { total: 7, m1Target: 4 },
      'Geometry and Trigonometry': { total: 7, m1Target: 3 },
    },
  },
  breakMinutes: 10,
};

/** Difficulty distributions by module type */
const DIFFICULTY_DIST = {
  module1: { Easy: 0.25, Medium: 0.50, Hard: 0.25 },
  easierModule2: { Easy: 0.40, Medium: 0.45, Hard: 0.15 },
  harderModule2: { Easy: 0.10, Medium: 0.45, Hard: 0.45 },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidQuestion(q) {
  if (!q || !q.id) return false;
  if (!q.subject || !q.domain || !q.difficulty) return false;
  const hasChoices = q.choice_a || q.choice_b || q.choice_c || q.choice_d;
  const hasFrqAnswer = q.correct_answer && !hasChoices;
  if (!hasChoices && !hasFrqAnswer) return false;
  if (!q.correct_answer) return false;
  return true;
}

function selectByDifficulty(questions, targetCount, diffDist) {
  const byDiff = { Easy: [], Medium: [], Hard: [] };
  for (const q of questions) {
    const d = q.difficulty;
    if (byDiff[d]) byDiff[d].push(q);
  }
  
  const result = [];
  const targets = {
    Easy: Math.round(targetCount * diffDist.Easy),
    Medium: Math.round(targetCount * diffDist.Medium),
    Hard: Math.round(targetCount * diffDist.Hard),
  };
  
  // Adjust for rounding
  const sum = targets.Easy + targets.Medium + targets.Hard;
  if (sum < targetCount) targets.Medium += targetCount - sum;
  if (sum > targetCount) targets.Medium -= sum - targetCount;
  
  for (const diff of ['Easy', 'Medium', 'Hard']) {
    const pool = shuffle(byDiff[diff]);
    const take = Math.min(targets[diff], pool.length);
    result.push(...pool.slice(0, take));
  }
  
  // If we couldn't fill with target distribution, fill from any remaining
  if (result.length < targetCount) {
    const usedIds = new Set(result.map(q => q.id));
    const remaining = questions.filter(q => !usedIds.has(q.id));
    const shuffled = shuffle(remaining);
    result.push(...shuffled.slice(0, targetCount - result.length));
  }
  
  return result;
}

/**
 * Generate Module 1 for a section (RW or Math).
 * @param {Array} allQuestions - All questions from the bank
 * @param {string} subject - 'English' or 'Math'
 * @param {Set} usedIds - IDs already used in this test
 * @returns {{ questions: Array, warnings: string[] }}
 */
export function generateModule1(allQuestions, subject, usedIds = new Set()) {
  const config = subject === 'Math' ? TEST_CONFIG.math : TEST_CONFIG.rw;
  const targetCount = config.module1Questions;
  const warnings = [];
  
  // Filter to valid questions for this subject, not already used
  const pool = allQuestions.filter(q => 
    isValidQuestion(q) && 
    q.subject === subject && 
    !usedIds.has(q.id)
  );
  
  if (pool.length < targetCount) {
    warnings.push(`${subject} pool has only ${pool.length} questions (need ${targetCount})`);
  }
  
  // Group by domain
  const byDomain = {};
  for (const q of pool) {
    if (!byDomain[q.domain]) byDomain[q.domain] = [];
    byDomain[q.domain].push(q);
  }
  
  const selected = [];
  const domains = config.domains;
  
  // Select target count per domain with Module 1 difficulty distribution
  for (const [domain, conf] of Object.entries(domains)) {
    const domainPool = byDomain[domain] || [];
    const target = conf.m1Target;
    
    if (domainPool.length < target) {
      warnings.push(`${subject}/${domain}: only ${domainPool.length} questions (target ${target})`);
    }
    
    const picked = selectByDifficulty(domainPool, Math.min(target, domainPool.length), DIFFICULTY_DIST.module1);
    selected.push(...picked);
  }
  
  // Fill remaining slots if domain targets couldn't be met
  if (selected.length < targetCount) {
    const usedInModule = new Set(selected.map(q => q.id));
    const remaining = pool.filter(q => !usedInModule.has(q.id));
    const filler = selectByDifficulty(remaining, targetCount - selected.length, DIFFICULTY_DIST.module1);
    selected.push(...filler);
  }
  
  // Order questions (for RW, group by domain order; for Math, shuffle)
  let ordered;
  if (subject === 'English' && config.domainOrder) {
    ordered = [];
    for (const domain of config.domainOrder) {
      const domainQs = shuffle(selected.filter(q => q.domain === domain));
      ordered.push(...domainQs);
    }
    // Add any that didn't match domain order
    const orderedIds = new Set(ordered.map(q => q.id));
    ordered.push(...selected.filter(q => !orderedIds.has(q.id)));
  } else {
    ordered = shuffle(selected);
  }
  
  return { questions: ordered.slice(0, targetCount), warnings };
}

/**
 * Generate Module 2 (adaptive based on Module 1 score).
 * @param {Array} allQuestions - All questions from the bank
 * @param {string} subject - 'English' or 'Math'
 * @param {number} module1Correct - Raw score from Module 1
 * @param {Set} usedIds - IDs already used in this test
 * @returns {{ questions: Array, isHarder: boolean, warnings: string[] }}
 */
export function generateModule2(allQuestions, subject, module1Correct, usedIds = new Set()) {
  const config = subject === 'Math' ? TEST_CONFIG.math : TEST_CONFIG.rw;
  const targetCount = config.module2Questions;
  const isHarder = module1Correct >= config.hardRouteThreshold;
  const diffDist = isHarder ? DIFFICULTY_DIST.harderModule2 : DIFFICULTY_DIST.easierModule2;
  const warnings = [];
  
  // Filter to valid questions for this subject, not already used
  const pool = allQuestions.filter(q => 
    isValidQuestion(q) && 
    q.subject === subject && 
    !usedIds.has(q.id)
  );
  
  if (pool.length < targetCount) {
    warnings.push(`${subject} Module 2 pool has only ${pool.length} questions (need ${targetCount})`);
  }
  
  // Group by domain
  const byDomain = {};
  for (const q of pool) {
    if (!byDomain[q.domain]) byDomain[q.domain] = [];
    byDomain[q.domain].push(q);
  }
  
  const selected = [];
  const domains = config.domains;
  
  // Module 2 gets remainder after Module 1 targets
  for (const [domain, conf] of Object.entries(domains)) {
    const domainPool = byDomain[domain] || [];
    const target = conf.total - conf.m1Target;
    
    if (domainPool.length < target) {
      warnings.push(`${subject}/${domain} M2: only ${domainPool.length} questions (target ${target})`);
    }
    
    const picked = selectByDifficulty(domainPool, Math.min(target, domainPool.length), diffDist);
    selected.push(...picked);
  }
  
  // Fill remaining slots
  if (selected.length < targetCount) {
    const usedInModule = new Set(selected.map(q => q.id));
    const remaining = pool.filter(q => !usedInModule.has(q.id));
    const filler = selectByDifficulty(remaining, targetCount - selected.length, diffDist);
    selected.push(...filler);
  }
  
  // Order questions
  let ordered;
  if (subject === 'English' && config.domainOrder) {
    ordered = [];
    for (const domain of config.domainOrder) {
      const domainQs = shuffle(selected.filter(q => q.domain === domain));
      ordered.push(...domainQs);
    }
    const orderedIds = new Set(ordered.map(q => q.id));
    ordered.push(...selected.filter(q => !orderedIds.has(q.id)));
  } else {
    ordered = shuffle(selected);
  }
  
  return { questions: ordered.slice(0, targetCount), isHarder, warnings };
}

/**
 * Check if question pool is sufficient for a full test.
 * @param {Array} allQuestions - All questions from the bank
 * @returns {{ canGenerate: boolean, warnings: string[], counts: object }}
 */
export function checkPoolSufficiency(allQuestions, scope = 'full') {
  const valid = allQuestions.filter(isValidQuestion);
  const warnings = [];
  
  const rwQuestions = valid.filter(q => q.subject === 'English');
  const mathQuestions = valid.filter(q => q.subject === 'Math');
  
  const rwNeeded = TEST_CONFIG.rw.module1Questions + TEST_CONFIG.rw.module2Questions;
  const mathNeeded = TEST_CONFIG.math.module1Questions + TEST_CONFIG.math.module2Questions;
  const rwOk = rwQuestions.length >= rwNeeded * 0.7;
  const mathOk = mathQuestions.length >= mathNeeded * 0.7;
  
  if (rwQuestions.length < rwNeeded) {
    warnings.push(`Need ${rwNeeded} Reading & Writing questions, have ${rwQuestions.length}`);
  }
  if (mathQuestions.length < mathNeeded) {
    warnings.push(`Need ${mathNeeded} Math questions, have ${mathQuestions.length}`);
  }
  
  // Check domains
  for (const [domain, conf] of Object.entries(TEST_CONFIG.rw.domains)) {
    const count = rwQuestions.filter(q => q.domain === domain).length;
    if (count < conf.total) {
      warnings.push(`RW/${domain}: have ${count}, need ${conf.total}`);
    }
  }
  for (const [domain, conf] of Object.entries(TEST_CONFIG.math.domains)) {
    const count = mathQuestions.filter(q => q.domain === domain).length;
    if (count < conf.total) {
      warnings.push(`Math/${domain}: have ${count}, need ${conf.total}`);
    }
  }
  
  let canGenerate = rwOk && mathOk;
  if (scope === 'rw') canGenerate = rwOk;
  if (scope === 'math') canGenerate = mathOk;

  return {
    canGenerate,
    canGenerateRw: rwOk,
    canGenerateMath: mathOk,
    warnings,
    counts: {
      totalValid: valid.length,
      rw: rwQuestions.length,
      math: mathQuestions.length,
      rwNeeded,
      mathNeeded,
    },
  };
}
