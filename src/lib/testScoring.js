/**
 * IRT-based SAT scoring system.
 * Estimates theta using 3PL model, converts to section scores with uncertainty.
 */

/**
 * Get default IRT parameters based on difficulty.
 * @param {object} question - Question object with difficulty field
 * @returns {{ a: number, b: number, c: number }}
 */
export function getIrtParams(question) {
  const diff = (question.difficulty || '').toLowerCase();
  const hasChoices = question.choice_a || question.choice_b || question.choice_c || question.choice_d;
  
  // Discrimination (a) - default 1.0
  const a = question.irt_a ?? 1.0;
  
  // Difficulty (b) - based on difficulty label
  let b;
  if (question.irt_b != null) {
    b = question.irt_b;
  } else if (diff === 'easy') {
    b = -1.0;
  } else if (diff === 'hard') {
    b = 1.0;
  } else {
    b = 0.0; // Medium or unknown
  }
  
  // Guessing (c) - 0.25 for MCQ, 0.05 for FRQ
  let c;
  if (question.irt_c != null) {
    c = question.irt_c;
  } else {
    c = hasChoices ? 0.25 : 0.05;
  }
  
  return { a, b, c };
}

/**
 * 3PL probability of correct response.
 * P(correct) = c + (1 - c) / (1 + exp(-a * (theta - b)))
 */
function prob3PL(theta, a, b, c) {
  const exp = Math.exp(-a * (theta - b));
  return c + (1 - c) / (1 + exp);
}

/**
 * Calculate log-likelihood of answer pattern given theta.
 * @param {number} theta - Ability estimate
 * @param {Array} questions - Questions answered
 * @param {object} answers - { questionId: { correct: boolean } }
 * @returns {number} Log-likelihood (higher is better fit)
 */
function logLikelihood(theta, questions, answers) {
  let ll = 0;
  for (const q of questions) {
    const ans = answers[q.id];
    const { a, b, c } = getIrtParams(q);
    const p = prob3PL(theta, a, b, c);
    
    // Clamp probability to avoid log(0)
    const pClamped = Math.max(0.0001, Math.min(0.9999, p));
    
    // IMPORTANT: For full-length tests, unanswered questions should count as incorrect.
    // Otherwise, answering only 1 item can produce an unrealistically high theta.
    const isCorrect = ans?.correct === true;

    if (isCorrect) {
      ll += Math.log(pClamped);
    } else {
      ll += Math.log(1 - pClamped);
    }
  }
  return ll;
}

/**
 * Estimate theta using maximum likelihood.
 * Searches theta from -4 to 4 in small increments.
 * @param {Array} questions - Questions answered
 * @param {object} answers - { questionId: { correct: boolean } }
 * @returns {number} Estimated theta
 */
export function estimateTheta(questions, answers) {
  if (!questions || questions.length === 0) return 0;
  
  let bestTheta = 0;
  let bestLL = -Infinity;
  
  // Search theta values
  for (let theta = -4; theta <= 4; theta += 0.02) {
    const ll = logLikelihood(theta, questions, answers);
    if (ll > bestLL) {
      bestLL = ll;
      bestTheta = theta;
    }
  }
  
  return bestTheta;
}

/**
 * Convert theta to section score (200-800).
 * Score = 500 + 120 * theta, rounded to nearest 10, clamped.
 */
export function thetaToScore(theta) {
  const raw = 500 + 120 * theta;
  const rounded = Math.round(raw / 10) * 10;
  return Math.max(200, Math.min(800, rounded));
}

/**
 * Apply soft cap for easier Module 2 route.
 * Scores above cap are compressed toward the cap.
 */
export function applyRouteAdjustment(score, section, isHarderRoute) {
  if (isHarderRoute) return score;
  
  const cap = section === 'rw' ? 610 : 620;
  if (score <= cap) return score;
  
  // Soft cap: compress scores above cap
  const adjusted = cap + (score - cap) * 0.35;
  return Math.round(adjusted / 10) * 10;
}

/**
 * Calculate score range with uncertainty.
 * @param {number} score - Estimated section score
 * @param {number} questionCount - Number of questions answered
 * @param {boolean} hasRealIrtParams - Whether questions have real IRT params
 * @returns {{ low: number, high: number }}
 */
export function calculateScoreRange(score, questionCount, hasRealIrtParams = false) {
  // Base uncertainty
  let uncertainty = 30;
  
  // Increase uncertainty for small pools or default params
  if (questionCount < 40 || !hasRealIrtParams) {
    uncertainty = 40;
  }
  
  const low = Math.max(200, Math.round((score - uncertainty) / 10) * 10);
  const high = Math.min(800, Math.round((score + uncertainty) / 10) * 10);
  
  return { low, high };
}

/**
 * Score a complete practice test.
 * @param {object} testAttempt - Full test attempt data
 * @returns {object} Scoring results
 */
export function scorePracticeTest(testAttempt) {
  const { modules, answers } = testAttempt;
  
  // Combine questions by section
  const rwQuestions = [
    ...(modules.rw1?.questions || []),
    ...(modules.rw2?.questions || []),
  ];
  const mathQuestions = [
    ...(modules.math1?.questions || []),
    ...(modules.math2?.questions || []),
  ];
  
  // Calculate raw scores
  const rwRaw = {
    m1: countCorrect(modules.rw1?.questions || [], answers),
    m2: countCorrect(modules.rw2?.questions || [], answers),
  };
  rwRaw.total = rwRaw.m1 + rwRaw.m2;
  
  const mathRaw = {
    m1: countCorrect(modules.math1?.questions || [], answers),
    m2: countCorrect(modules.math2?.questions || [], answers),
  };
  mathRaw.total = mathRaw.m1 + mathRaw.m2;
  
  // Estimate theta for each section
  const rwTheta = estimateTheta(rwQuestions, answers);
  const mathTheta = estimateTheta(mathQuestions, answers);
  
  // Convert to section scores
  let rwScore = thetaToScore(rwTheta);
  let mathScore = thetaToScore(mathTheta);
  
  // Apply route adjustments
  rwScore = applyRouteAdjustment(rwScore, 'rw', modules.rw2?.isHarder ?? true);
  mathScore = applyRouteAdjustment(mathScore, 'math', modules.math2?.isHarder ?? true);
  
  // Calculate ranges
  const rwRange = calculateScoreRange(rwScore, rwQuestions.length);
  const mathRange = calculateScoreRange(mathScore, mathQuestions.length);
  
  const totalRange = {
    low: Math.max(400, rwRange.low + mathRange.low),
    high: Math.min(1600, rwRange.high + mathRange.high),
  };
  
  // Domain breakdown
  const domainBreakdown = calculateDomainBreakdown(
    [...rwQuestions, ...mathQuestions],
    answers
  );
  
  // Difficulty breakdown
  const difficultyBreakdown = calculateDifficultyBreakdown(
    [...rwQuestions, ...mathQuestions],
    answers
  );
  
  return {
    rw: {
      raw: rwRaw,
      theta: rwTheta,
      score: rwScore,
      range: rwRange,
      isHarderRoute: modules.rw2?.isHarder ?? false,
    },
    math: {
      raw: mathRaw,
      theta: mathTheta,
      score: mathScore,
      range: mathRange,
      isHarderRoute: modules.math2?.isHarder ?? false,
    },
    total: {
      raw: rwRaw.total + mathRaw.total,
      maxRaw: rwQuestions.length + mathQuestions.length,
      range: totalRange,
    },
    domainBreakdown,
    difficultyBreakdown,
  };
}

function countCorrect(questions, answers) {
  return questions.filter(q => answers[q.id]?.correct).length;
}

function calculateDomainBreakdown(questions, answers) {
  const breakdown = {};
  for (const q of questions) {
    const key = `${q.subject} - ${q.domain}`;
    if (!breakdown[key]) {
      breakdown[key] = { correct: 0, total: 0, subject: q.subject, domain: q.domain };
    }
    breakdown[key].total++;
    if (answers[q.id]?.correct) {
      breakdown[key].correct++;
    }
  }
  return breakdown;
}

function calculateDifficultyBreakdown(questions, answers) {
  const breakdown = { Easy: { correct: 0, total: 0 }, Medium: { correct: 0, total: 0 }, Hard: { correct: 0, total: 0 } };
  for (const q of questions) {
    const diff = q.difficulty || 'Medium';
    if (!breakdown[diff]) breakdown[diff] = { correct: 0, total: 0 };
    breakdown[diff].total++;
    if (answers[q.id]?.correct) {
      breakdown[diff].correct++;
    }
  }
  return breakdown;
}

/**
 * Get all missed questions with details.
 * @param {Array} questions - All questions
 * @param {object} answers - Answer map
 * @returns {Array} Missed questions with student answer, correct answer, etc.
 */
export function getMissedQuestions(questions, answers) {
  const missed = [];
  for (const q of questions) {
    const ans = answers[q.id];
    if (ans && !ans.correct) {
      missed.push({
        id: q.id,
        subject: q.subject,
        domain: q.domain,
        skill: q.skill,
        difficulty: q.difficulty,
        question_text: q.question_text,
        studentAnswer: ans.selected,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        choice_a: q.choice_a,
        choice_b: q.choice_b,
        choice_c: q.choice_c,
        choice_d: q.choice_d,
      });
    }
  }
  return missed;
}
