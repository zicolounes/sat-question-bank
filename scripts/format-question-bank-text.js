/**
 * Normalizes question_text / choices / explanations for FormattedText (newlines + whitespace-pre-wrap).
 */
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', 'questions.json');
const FIELDS = ['question_text', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'explanation'];

/**
 * If a line has "... = <math tail> <The/In/Which/What...>", split so prose starts its own paragraph.
 * Uses last '=' on the line to separate "prefix + RHS" from accidental prose glue.
 */
function splitEquationTailFromProseLine(line) {
  const idx = line.lastIndexOf('=');
  if (idx === -1) return line;
  const prefix = line.slice(0, idx + 1);
  const rhs = line.slice(idx + 1).trimStart();
  const m = rhs.match(/^(.+?)\s+((?:The|In|Which|What)(?:\s|\.|,).+)$/i);
  if (!m) return line;
  const tail = m[1].trimEnd();
  const prose = m[2].trimStart();
  if (prose.length < 6) return line;
  const head = prose.slice(0, 48).toLowerCase();
  const ok =
    head.startsWith('the ') ||
    head.startsWith('in the') ||
    head.startsWith('which ') ||
    head.startsWith('what ') ||
    head.startsWith('if (');
  if (!ok) return line;
  return `${prefix} ${tail}\n\n${prose}`;
}

/** "(4, y). What is" → line break before What */
function splitParenPeriodProse(line) {
  return line.replace(/\)\s*\.\s+(What is the value\b)/gi, ').\n\n$1');
}

/** Exactly two '=' and the word "and" → treat as two stacked equations. */
function splitAndBetweenEquations(line) {
  const eq = (line.match(/=/g) || []).length;
  if (eq !== 2 || !/\sand\s/i.test(line)) return line;
  return line.replace(/\s+and\s+/i, '\n');
}

function formatRomanClauses(s) {
  if (!/\bI\./.test(s) || !/\bII\./.test(s)) return s;
  let t = s;
  t = t.replace(/([?.])\s*(I\.)\s+/g, '$1\n$2 ');
  t = t.replace(/([^\n])\s+(II\.)\s+/g, '$1\n$2 ');
  if (/\bIII\./.test(t)) t = t.replace(/([^\n])\s+(III\.)\s+/g, '$1\n$2 ');
  return t;
}

function splitSemicolonSystems(s, field) {
  if (!/^choice_[abcd]$/.test(field)) return s;
  if (!/=.*;\s*[^=]+=/.test(s)) return s;
  return s.replace(/;\s+/g, '\n');
}

function normalizeField(s, field) {
  let t = String(s ?? '');
  if (!t) return t;

  const lines = t.split(/\r?\n/);
  const out = lines.map((line) => {
    let L = splitAndBetweenEquations(line);
    L = splitEquationTailFromProseLine(L);
    L = splitParenPeriodProse(L);
    return L;
  });
  t = out.join('\n');

  t = formatRomanClauses(t);
  t = splitSemicolonSystems(t, field);
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

function main() {
  const qs = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  let n = 0;
  for (const q of qs) {
    for (const f of FIELDS) {
      if (!(f in q)) continue;
      const next = normalizeField(q[f], f);
      if (next !== q[f]) {
        q[f] = next;
        n += 1;
      }
    }
  }
  fs.writeFileSync(JSON_PATH, JSON.stringify(qs, null, 4) + '\n', 'utf8');
  console.log('fields changed:', n, 'questions:', qs.length);
}

main();
