#!/usr/bin/env node
import('../dist/cli/index.js').catch((error) => {
  console.error('Coder Agent CLI is not built yet. Run `npm run build` first.', error);
  process.exit(1);
});
