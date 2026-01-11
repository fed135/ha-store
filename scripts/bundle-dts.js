#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, unlinkSync, rmdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');

// Read the main index.d.ts
const indexPath = join(distDir, 'index.d.ts');
let indexContent = readFileSync(indexPath, 'utf-8');

// Remove import statements for internal modules (they're no longer needed)
indexContent = indexContent.replace(/^import .* from '\.\/.+\.js';?\n?/gm, '');

// Remove the sourcemap reference
indexContent = indexContent.replace(/\/\/# sourceMappingURL=.*$/gm, '');

// Write back the cleaned index.d.ts
writeFileSync(indexPath, indexContent.trim() + '\n');

// Delete all other .d.ts and .d.ts.map files, and empty subdirectories
function deleteDeclarationFiles(dir, isRoot = true) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      deleteDeclarationFiles(fullPath, false);
      // Try to remove directory if empty
      try {
        rmdirSync(fullPath);
        console.log(`Deleted empty directory: ${fullPath}`);
      } catch (e) {
        // Directory not empty or can't be deleted, that's okay
      }
    } else if ((!isRoot || entry.name !== 'index.d.ts') && (entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.ts.map'))) {
      unlinkSync(fullPath);
      console.log(`Deleted: ${fullPath}`);
    }
  }
}

// Keep only index.d.ts, remove all others
deleteDeclarationFiles(distDir);

console.log('✓ Declaration files bundled into single index.d.ts');
