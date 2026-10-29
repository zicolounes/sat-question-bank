export function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean);
}

export function includesInsensitive(haystack, needle) {
  if (!needle) return true;
  return String(haystack ?? '')
    .toLowerCase()
    .includes(String(needle).toLowerCase());
}

export function filterQuestions(questions, filters) {
  const {
    subject = 'Both',
    domains = [],
    skills = [],
    difficulties = [],
    tiers = [],
    keyword = '',
  } = filters ?? {};

  const domainSet = new Set(domains);
  const skillSet = new Set(skills);
  const diffSet = new Set(difficulties);
  const tierSet = new Set(tiers.map(String));

  return (questions ?? []).filter((q) => {
    if (subject !== 'Both' && q.subject !== subject) return false;
    if (domainSet.size && !domainSet.has(q.domain)) return false;
    if (skillSet.size && !skillSet.has(q.skill)) return false;
    if (diffSet.size && !diffSet.has(q.difficulty)) return false;
    if (tierSet.size && !tierSet.has(String(q.difficulty_tier))) return false;
    if (keyword && !includesInsensitive(q.question_text, keyword)) return false;
    return true;
  });
}

