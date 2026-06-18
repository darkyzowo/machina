#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CWD = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const REFS_DIR = path.join(CLAUDE_DIR, 'security-audit-references', 'frameworks');

const DETECTORS = [
  {
    file: 'package.json',
    detect(content) {
      const c = content.toLowerCase();
      if (c.includes('"next"')) return 'nextjs';
      if (c.includes('"nuxt"')) return 'nuxtjs';
      if (c.includes('"@sveltejs/kit"')) return 'sveltekit';
      if (c.includes('"express"')) return 'express';
      if (c.includes('"laravel"')) return 'laravel';
      return null;
    },
  },
  {
    file: 'requirements.txt',
    detect(content) {
      const c = content.toLowerCase();
      if (c.includes('django')) return 'django';
      if (c.includes('fastapi')) return 'fastapi';
      if (c.includes('flask')) return 'flask';
      return null;
    },
  },
  { file: 'go.mod',    detect: () => 'go' },
  { file: 'Gemfile',   detect: (c) => c.toLowerCase().includes('rails') ? 'rails' : null },
  { file: 'pom.xml',   detect: (c) => c.toLowerCase().includes('spring') ? 'spring-boot' : null },
];

const SECURITY_SURFACE_SIGNALS = [
  'app/api', 'pages/api', 'src/routes', 'src/api',
  'middleware.ts', 'middleware.js',
  'auth', 'login', 'signup',
  '.machina/security.md',
];

function detectFrameworks() {
  const found = [];
  for (const { file, detect } of DETECTORS) {
    const p = path.join(CWD, file);
    if (!fs.existsSync(p)) continue;
    const result = detect(fs.readFileSync(p, 'utf8'));
    if (result && !found.includes(result)) found.push(result);
  }
  return found;
}

function hasSecuritySurface() {
  return SECURITY_SURFACE_SIGNALS.some(s => fs.existsSync(path.join(CWD, s)));
}

function buildSkeleton(frameworks) {
  const stackLine = frameworks.length ? frameworks.join(', ') : 'unknown';
  const refLine = frameworks.map(f => `${f}.md`).join(', ') || 'none';
  const watchItems = [];
  if (frameworks.includes('nextjs')) {
    watchItems.push('- Middleware-only auth bypass (CVE-2025-29927) — always add handler-level check');
    watchItems.push('- RLS must be enabled separately on each Supabase table');
  }
  if (frameworks.includes('django')) {
    watchItems.push('- CSRF middleware must be in MIDDLEWARE list');
    watchItems.push('- Use django ORM — never raw SQL with user input');
  }
  if (frameworks.includes('flask') || frameworks.includes('fastapi')) {
    watchItems.push('- No built-in CSRF protection — add flask-wtf or equivalent');
    watchItems.push('- Rate limiting not built-in — add slowapi / flask-limiter');
  }

  return [
    '# Security Context',
    `**Stack:** ${stackLine}`,
    `**Framework refs loaded:** ${refLine}`,
    '**Last audit:** not run yet',
    '',
    '## Custom Limits (overrides machina defaults)',
    '<!-- Add project-specific overrides here, e.g.: -->',
    '<!-- LLM rate limit: 10 req/min per user -->',
    '<!-- Max file upload: 5 MB -->',
    '',
    '## Confirmed Findings (resolved)',
    '<!-- APPEND ONLY — never regenerate this section -->',
    '<!-- Format: YYYY-MM-DD: <description> — FIXED. <how> -->',
    '',
    '## Watch List (recurring patterns for this stack)',
    ...(watchItems.length ? watchItems : ['<!-- No stack-specific watch items detected -->']),
    '',
  ].join('\n');
}

function loadRefExcerpt(framework) {
  const p = path.join(REFS_DIR, `${framework}.md`);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').split('\n').slice(0, 40).join('\n');
}

const frameworks = detectFrameworks();

if (!hasSecuritySurface() && frameworks.length === 0) {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

const briefDir  = path.join(CWD, '.machina');
const briefPath = path.join(briefDir, 'security.md');

if (!fs.existsSync(briefPath)) {
  if (!fs.existsSync(briefDir)) fs.mkdirSync(briefDir, { recursive: true });
  fs.writeFileSync(briefPath, buildSkeleton(frameworks), 'utf8');
}

const brief = fs.readFileSync(briefPath, 'utf8');

const refExcerpts = frameworks
  .map(f => loadRefExcerpt(f))
  .filter(Boolean)
  .join('\n\n---\n\n');

const injected = [
  '<security-context>',
  brief,
  refExcerpts ? `\n## Framework Security Reference (top risks)\n\n${refExcerpts}` : '',
  '</security-context>',
].join('\n');

process.stdout.write(JSON.stringify({
  continue: true,
  suppressOutput: false,
  content: injected,
}));