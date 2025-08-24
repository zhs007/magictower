import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const gamedataDir = path.join(repoRoot, 'gamedata');
const mapdataDir = path.join(repoRoot, 'mapdata');
const assetsDir = path.join(repoRoot, 'assets');

function collectJsonFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...collectJsonFiles(full));
    else if (e.isFile() && full.endsWith('.json')) results.push(full);
  }
  return results;
}

function getAssetCandidates(assetId) {
  // common image extensions
  return ['.png', '.jpg', '.jpeg', '.webp'].map(ext => assetId + ext);
}

// Build alias map from assets directory using same rule as renderer:
// alias = <folder>_<filename> if file is in a subfolder of assets, otherwise filename
function collectAssetFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...collectAssetFiles(full));
    else if (e.isFile() && /\.(png|jpe?g|webp)$/i.test(e.name)) results.push(full);
  }
  return results;
}

const assetFiles = collectAssetFiles(assetsDir);
const aliasMap = new Map();
for (const af of assetFiles) {
  const rel = path.relative(assetsDir, af).replace(/\\/g, '/');
  const parts = rel.split('/');
  const filenameWithExt = parts[parts.length - 1];
  const filename = filenameWithExt.replace(/\.[^.]+$/, '');
  const folder = parts.length >= 2 ? parts[parts.length - 2] : '';
  const alias = folder ? `${folder}_${filename}` : filename;
  aliasMap.set(alias, af);
}

const gamedataJsonFiles = collectJsonFiles(gamedataDir);
const mapdataJsonFiles = collectJsonFiles(mapdataDir);
const missing = [];

// Check gamedata files
for (const jf of gamedataJsonFiles) {
  const raw = fs.readFileSync(jf, 'utf8');
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    console.error('invalid json', jf, e.message);
    continue;
  }
  const assetId = obj.assetId || obj.id;
  if (!assetId) continue;
  if (!aliasMap.has(assetId)) {
    missing.push({ file: jf, assetId });
  }
}

// Check mapdata files for tileAssets
for (const jf of mapdataJsonFiles) {
    const raw = fs.readFileSync(jf, 'utf8');
    let obj;
    try {
        obj = JSON.parse(raw);
    } catch (e) {
        console.error('invalid json', jf, e.message);
        continue;
    }

    if (obj.tileAssets && typeof obj.tileAssets === 'object') {
        for (const tileValue in obj.tileAssets) {
            const assetId = obj.tileAssets[tileValue];
            if (assetId && !aliasMap.has(assetId)) {
                missing.push({ file: jf, assetId: assetId, context: `tileAssets[${tileValue}]` });
            }
        }
    }
}

if (missing.length === 0) {
  console.log('All gamedata assetIds mapped to assets.');
  process.exit(0);
}

console.log('Missing assets:');
for (const m of missing) {
  console.log('-', m.assetId, 'from', m.file);
}
process.exit(1);
