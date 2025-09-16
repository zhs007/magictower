import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

// Determine package name from current working directory's package.json
let pkgName = 'unknown-package';
try {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkgName = pkg.name || pkgName;
  }
} catch (e) {
  // ignore
}

const outDir = path.join(process.cwd(), 'test-results');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const safeName = pkgName.replace(/[^a-z0-9_.-]/gi, '_');
const outputFile = path.join(outDir, `${safeName}-junit.xml`);

export default defineConfig({
  test: {
    reporters: [['default'], ['junit', { outputFile }]],
    // Use jsdom and enable globals so browser-oriented tests can access
    // `window` and vitest globals like `describe`, `it`, and `vi`.
    environment: 'jsdom',
    globals: true,
    // Enforce coverage thresholds in CI. Adjust percentages as desired.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Minimum acceptable coverage percentages. CI will fail if any
      // metric is below these thresholds.
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
      // Exclude test helper files and node_modules from coverage.
      exclude: ['**/node_modules/**', '**/test-results/**', '**/src/tests/**']
    }
  },
});
