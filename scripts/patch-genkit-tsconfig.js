const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'node_modules', '@genkit-ai');
const targets = [
  path.join(baseDir, 'ai', 'tsconfig.json'),
  path.join(baseDir, 'core', 'tsconfig.json'),
];

function ensureJson(filePath, obj) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

// Ensure a base tsconfig exists to satisfy resolvers
try {
  const baseTsconfig = path.join(baseDir, 'tsconfig.json');
  if (!fs.existsSync(baseTsconfig)) {
    ensureJson(baseTsconfig, {
      compilerOptions: {
        strict: true,
        forceConsistentCasingInFileNames: true,
      },
    });
    console.log(`[patch-genkit] Created ${baseTsconfig}`);
  }
} catch (err) {
  console.warn('[patch-genkit] Could not create base tsconfig:', err.message);
}

for (const file of targets) {
  try {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    let json;
    try {
      json = JSON.parse(content);
    } catch (e) {
      // Last resort: drop any extends with a safe regex
      const fixed = content.replace(/"extends"\s*:\s*"\.\.\/tsconfig\.json",?\s*/g, '');
      fs.writeFileSync(file, fixed, 'utf8');
      console.log(`[patch-genkit] Stripped extends in ${file}`);
      continue;
    }
    if (json.extends) delete json.extends;
    json.compilerOptions = json.compilerOptions || {};
    json.compilerOptions.strict = true;
    json.compilerOptions.forceConsistentCasingInFileNames = true;
    fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
    console.log(`[patch-genkit] Normalized ${file}`);
  } catch (err) {
    console.warn(`[patch-genkit] Skipped ${file}:`, err.message);
  }
}
