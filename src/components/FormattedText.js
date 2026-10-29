import React from 'react';

function splitLines(text) {
  return String(text ?? '').split(/\r?\n/);
}

let nodeKey = 0;
function nextKey() {
  nodeKey += 1;
  return `caret-${nodeKey}`;
}

/**
 * Parse ^exponent into <sup>…</sup>. Supports:
 * - x^2, 10^-3 (digits and + - * / in bare exponent)
 * - x^(n+1) parentheses
 * - x^{n+1} or 2^{10} LaTeX-style braces (nested braces OK)
 * - x^n single-letter exponent
 * Recurses so exponents can contain further ^ if needed.
 */
function parseCaretsToNodes(segment) {
  if (segment == null || segment === '') return [];
  const str = String(segment).replace(/\uFF3E/g, '^');
  const nodes = [];
  let i = 0;

  while (i < str.length) {
    const caret = str.indexOf('^', i);
    if (caret === -1) {
      if (i < str.length) nodes.push(str.slice(i));
      break;
    }

    if (caret > i) nodes.push(str.slice(i, caret));

    let j = caret + 1;
    if (j >= str.length) {
      nodes.push('^');
      break;
    }

    const ch = str[j];

    if (ch === '{') {
      let depth = 1;
      let k = j + 1;
      while (k < str.length && depth > 0) {
        if (str[k] === '{') depth += 1;
        else if (str[k] === '}') depth -= 1;
        k += 1;
      }
      if (depth !== 0) {
        nodes.push(str.slice(caret));
        break;
      }
      const inner = str.slice(j + 1, k - 1);
      nodes.push(
        <sup key={nextKey()} className="text-[0.85em] leading-none">
          {parseCaretsToNodes(inner)}
        </sup>
      );
      j = k;
    } else if (ch === '(') {
      const close = str.indexOf(')', j);
      if (close === -1) {
        nodes.push(str.slice(caret));
        break;
      }
      const inner = str.slice(j + 1, close);
      nodes.push(
        <sup key={nextKey()} className="text-[0.85em] leading-none">
          {parseCaretsToNodes(inner)}
        </sup>
      );
      j = close + 1;
    } else if (/[0-9]/.test(ch) || ch === '+' || ch === '-') {
      let inner = '';
      while (j < str.length) {
        const c = str[j];
        if (/[0-9+\-*/]/.test(c)) {
          inner += c;
          j += 1;
          continue;
        }
        if (c === '.' && /[0-9]/.test(str[j + 1] || '')) {
          inner += c;
          j += 1;
          continue;
        }
        break;
      }
      if (inner) {
        nodes.push(
          <sup key={nextKey()} className="text-[0.85em] leading-none">
            {inner}
          </sup>
        );
      } else {
        nodes.push('^');
      }
    } else if (/[a-zA-Z]/.test(ch)) {
      nodes.push(
        <sup key={nextKey()} className="text-[0.85em] leading-none">
          {ch}
        </sup>
      );
      j += 1;
    } else {
      nodes.push('^');
      i = caret + 1;
      continue;
    }

    i = j;
  }

  return nodes;
}

/**
 * Parse root notation:
 * - root[n](expr)  -> ⁿ√(expr) with a vinculum over expr
 * - sqrt(expr)     -> √(expr) with a vinculum over expr
 *
 * This is intentionally lightweight (not full LaTeX). It’s meant for question bank text.
 */
function parseRootsToNodes(input) {
  const str = String(input ?? '');
  const nodes = [];
  let i = 0;

  function parseParensExpression(startIdx) {
    // startIdx points at '('
    let depth = 1;
    let k = startIdx + 1;
    while (k < str.length && depth > 0) {
      if (str[k] === '(') depth += 1;
      else if (str[k] === ')') depth -= 1;
      k += 1;
    }
    if (depth !== 0) return null;
    return { inner: str.slice(startIdx + 1, k - 1), end: k };
  }

  while (i < str.length) {
    const nextRoot = str.indexOf('root[', i);
    const nextSqrt = str.indexOf('sqrt(', i);
    const next =
      nextRoot === -1
        ? nextSqrt
        : nextSqrt === -1
          ? nextRoot
          : Math.min(nextRoot, nextSqrt);

    if (next === -1) {
      if (i < str.length) nodes.push(str.slice(i));
      break;
    }

    if (next > i) nodes.push(str.slice(i, next));

    if (next === nextSqrt) {
      const parsed = parseParensExpression(next + 4);
      if (!parsed) {
        nodes.push(str.slice(next));
        break;
      }
      const innerNodes = parseCaretsToNodes(parsed.inner);
      nodes.push(
        <span key={nextKey()} className="inline-flex items-end gap-0.5 align-bottom">
          <span className="text-[1.05em] leading-none">√</span>
          <span className="border-t border-current px-0.5 leading-none">
            {innerNodes}
          </span>
        </span>
      );
      i = parsed.end;
      continue;
    }

    // root[n](...)
    const closeBracket = str.indexOf(']', next + 5);
    if (closeBracket === -1) {
      nodes.push(str.slice(next));
      break;
    }
    const indexText = str.slice(next + 5, closeBracket);
    if (str[closeBracket + 1] !== '(') {
      nodes.push(str.slice(next, closeBracket + 1));
      i = closeBracket + 1;
      continue;
    }
    const parsed = parseParensExpression(closeBracket + 1);
    if (!parsed) {
      nodes.push(str.slice(next));
      break;
    }

    const innerNodes = parseCaretsToNodes(parsed.inner);
    nodes.push(
      <span key={nextKey()} className="inline-flex items-end gap-0.5 align-bottom">
        <sup key={nextKey()} className="-mr-0.5 text-[0.65em] leading-none">
          {parseCaretsToNodes(indexText)}
        </sup>
        <span className="text-[1.05em] leading-none">√</span>
        <span className="border-t border-current px-0.5 leading-none">
          {innerNodes}
        </span>
      </span>
    );
    i = parsed.end;
  }

  return nodes;
}

/**
 * Renders plain text with caret exponents as superscripts.
 * Keeps line breaks via whitespace-pre-wrap on the parent.
 */
export function FormattedText({ text, className }) {
  const lines = splitLines(text);

  return (
    <span className={className}>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 ? '\n' : null}
          {parseRootsToNodes(line).flatMap((node) =>
            typeof node === 'string' ? parseCaretsToNodes(node) : node
          )}
        </React.Fragment>
      ))}
    </span>
  );
}
