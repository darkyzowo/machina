#!/usr/bin/env node
// machina-advance.js — mechanical phase advance (used by /machina next)

const path = require('path');
const { findProjectRoot, readState, advancePhase } = require('./harness-lib');

function parseArgs(argv) {
  const out = { skipUx: null, root: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--skip-ux' && argv[i + 1]) {
      out.skipUx = argv[++i];
    } else if (argv[i] === '--root' && argv[i + 1]) {
      out.root = argv[++i];
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const projectRoot = findProjectRoot(args.root);
  const state = readState(projectRoot);

  if (state.phase === 'ux_gate' && args.skipUx) {
    const { skipUxGate } = require('./harness-lib');
    const r = skipUxGate(projectRoot, state, args.skipUx);
    if (!r.ok) {
      process.stderr.write(`MACHINA ADVANCE — blocked.\n  ${r.reason}\n`);
      process.exit(1);
    }
    const adv = advancePhase(projectRoot, readState(projectRoot), {});
    if (!adv.ok) {
      process.stderr.write(`MACHINA ADVANCE — blocked.\n  ${adv.reason}\n`);
      process.exit(1);
    }
    process.stdout.write(adv.message + '\n');
    process.exit(0);
  }

  const result = advancePhase(projectRoot, state, { skipUx: args.skipUx });
  if (!result.ok) {
    process.stderr.write(`MACHINA ADVANCE — blocked.\n  ${result.reason}\n`);
    process.exit(1);
  }
  process.stdout.write(result.message + '\n');
}

main();
