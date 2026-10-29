export function isFrq(question) {
  const a = (question?.choice_a ?? '').trim();
  const b = (question?.choice_b ?? '').trim();
  const c = (question?.choice_c ?? '').trim();
  const d = (question?.choice_d ?? '').trim();
  if (a || b || c || d) return false;
  const ca = String(question?.correct_answer ?? '').trim().toUpperCase();
  if (ca === 'A' || ca === 'B' || ca === 'C' || ca === 'D') return false;
  return true;
}

export function normalizeFrqCorrectAnswerText(text) {
  return String(text ?? '').trim();
}

export function frqMatches(expected, userInput) {
  const expectedRaw = String(expected ?? '').trim();
  const inputRaw = String(userInput ?? '').trim();
  if (!expectedRaw) return false;
  if (!inputRaw) return false;

  // Allow multiple acceptable answers separated by "||"
  const acceptable = expectedRaw
    .split('||')
    .map((s) => s.trim())
    .filter(Boolean);

  const normalizedInput = inputRaw.toLowerCase();
  return acceptable.some((ans) => ans.toLowerCase() === normalizedInput);
}

export function tierFromDifficultyWord(difficulty) {
  const d = String(difficulty ?? '').trim().toLowerCase();
  if (d === 'easy') return '1';
  if (d === 'medium') return '2';
  if (d === 'hard') return '3';
  return '';
}

