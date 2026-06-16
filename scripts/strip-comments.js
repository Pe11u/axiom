#!/usr/bin/env node
/**
 * strip-comments  —  remove non-essential comment lines from source files
 *
 * Usage:
 *   node scripts/strip-comments.js [--dry-run] [path...]
 *
 * Defaults to scanning: frontend/src, internal, app.go, main.go
 * Handles: .ts .tsx .js .go .css
 *
 * Keeps:
 *   - go:generate / go:build / go:embed directives
 *   - @ts-ignore / @ts-expect-error / eslint-disable
 *   - Lines that contain only a comment delimiter (section dividers) are removed
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const KEEP_PATTERNS = [
  /go:(generate|build|embed|noescape|nosplit|linkname)\b/,
  /@ts-(ignore|expect-error|nocheck)/,
  /eslint-disable/,
  /nolint:/,
  /prettier-ignore/,
  /^\/\/\//,
];

const DEFAULT_PATHS = [
  'frontend/src',
  'internal',
  'app.go',
  'main.go',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.go', '.css']);

const dryRun = process.argv.includes('--dry-run');
const userPaths = process.argv.slice(2).filter(a => !a.startsWith('--'));
const scanPaths = userPaths.length ? userPaths.map(p => join(ROOT, p)) : DEFAULT_PATHS.map(p => join(ROOT, p));

function shouldKeepComment(line) {
  return KEEP_PATTERNS.some(re => re.test(line));
}

function stripTS(src) {
  const lines = src.split('\n');
  const out = [];
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (inBlock) {
      if (trimmed.includes('*/')) {
        inBlock = false;
        const after = raw.slice(raw.indexOf('*/') + 2).trim();
        if (after) out.push(raw.slice(raw.indexOf('*/') + 2));
      }
      continue;
    }

    // JSX comment: {/* ... */} on its own line
    if (/^\{\/\*[\s\S]*?\*\/\}$/.test(trimmed)) {
      if (!shouldKeepComment(trimmed)) continue;
    }

    // block comment start
    if (trimmed.startsWith('/*')) {
      if (shouldKeepComment(trimmed)) { out.push(raw); continue; }
      if (trimmed.includes('*/')) {
        const before = raw.slice(0, raw.indexOf('/*')).trim();
        if (before) out.push(raw.slice(0, raw.indexOf('/*')));
        continue;
      }
      inBlock = true;
      continue;
    }

    // line comment
    const slashIdx = raw.indexOf('//');
    if (slashIdx !== -1) {
      // make sure it's not inside a string (simple heuristic: count unescaped quotes before it)
      const before = raw.slice(0, slashIdx);
      const singleQuotes = (before.match(/(?<!\\)'/g) || []).length;
      const doubleQuotes = (before.match(/(?<!\\)"/g) || []).length;
      const backticks   = (before.match(/(?<!\\)`/g) || []).length;
      const inString = (singleQuotes % 2 !== 0) || (doubleQuotes % 2 !== 0) || (backticks % 2 !== 0);

      if (!inString) {
        const commentText = raw.slice(slashIdx);
        if (shouldKeepComment(commentText)) { out.push(raw); continue; }
        const codePart = raw.slice(0, slashIdx).trimEnd();
        if (codePart) out.push(codePart); // keep code, drop comment
        // else: pure comment line — drop entirely
        continue;
      }
    }

    out.push(raw);
  }

  // collapse 3+ consecutive blank lines to 2
  const collapsed = [];
  let blanks = 0;
  for (const line of out) {
    if (line.trim() === '') { blanks++; if (blanks <= 2) collapsed.push(line); }
    else { blanks = 0; collapsed.push(line); }
  }
  return collapsed.join('\n');
}

function stripCSS(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    if (KEEP_PATTERNS.some(re => re.test(match))) return match;
    return '';
  }).replace(/\n{3,}/g, '\n\n');
}

function collectFiles(p) {
  const files = [];
  try {
    const stat = statSync(p);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(p)) {
        if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
        files.push(...collectFiles(join(p, entry)));
      }
    } else if (EXTENSIONS.has(extname(p))) {
      files.push(p);
    }
  } catch { /* skip unreadable */ }
  return files;
}

let changed = 0, skipped = 0;
const files = scanPaths.flatMap(collectFiles);

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const ext = extname(file);
  const stripped = ext === '.css' ? stripCSS(src) : stripTS(src);

  if (stripped === src) { skipped++; continue; }

  const rel = relative(ROOT, file);
  if (dryRun) {
    const removedLines = src.split('\n').length - stripped.split('\n').length;
    console.log(`[dry-run] ${rel}  (${removedLines > 0 ? '-' : '+'}${Math.abs(removedLines)} lines)`);
  } else {
    writeFileSync(file, stripped, 'utf8');
    console.log(`stripped  ${rel}`);
  }
  changed++;
}

console.log(`\n${dryRun ? '[dry-run] ' : ''}${changed} file(s) modified, ${skipped} unchanged.`);
