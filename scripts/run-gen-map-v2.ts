/**
 * @fileoverview Runner script for the V2 map generator.
 *
 * This script imports the generator, provides it with parameters,
 * and writes the output to a JSON file.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateMapV2 } from './gen-map-v2.js';
import type { GenMapV2Params, RoomTemplate, TemplateConstraint } from './gen-map-v2.js';

// --- Load the templates using robust path resolution ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesPath = path.join(__dirname, 'genmap2-templates.json');
const templatesFile = fs.readFileSync(templatesPath, 'utf-8');
const templates: RoomTemplate[] = JSON.parse(templatesFile);

// --- Define the constraints for template placement ---
const templateData: TemplateConstraint[] = [
    [5, 5, 5, 5, 1, 1], [5, 5, 5, 5, 1, 1], [3, 3, 3, 3, 1, 1],
    [1, 1, 99, 99, 1, 99], [1, 1, 99, 99, 1, 99], [1, 1, 99, 99, 1, 99],
];

// --- Parameters for the map generation ---
const params: GenMapV2Params = {
  Width: 16,
  Height: 16,
  templates: templates,
  templateData: templateData,
  forceFloorPos: [],
  outputFilename: 'mapdata/generated_map_v2.json',
  seed: 12345,
  doorDensity: 0.6,
};

/**
 * A robust custom stringifier to format the layout array with each row on a single line.
 * @param {object} data The object to stringify.
 * @returns {string} The formatted JSON string.
 */
function formatMapJson(data: any): string {
    const metaParts = [];
    for (const key in data) {
        if (key === 'layout') continue;
        const valueString = JSON.stringify(data[key]);
        metaParts.push(`  "${key}": ${valueString}`);
    }

    const layoutRows = [];
    for (const row of data.layout) {
        layoutRows.push(`    [${row.join(', ')}]`);
    }
    const layoutString = `  "layout": [\n${layoutRows.join(',\n')}\n  ]`;
    metaParts.push(layoutString);

    return `{\n${metaParts.join(',\n')}\n}`;
}

function run() {
  console.log(`Running V2 map generator with seed: ${params.seed}`);

  const { layout } = generateMapV2(params);

  const output = {
    ...params,
    generationDate: new Date().toISOString(),
    layout: layout,
  };

  // Clean up the output object
  delete (output as any).templates;
  delete (output as any).outputFilename;
  delete (output as any).forceFloorPos;
  delete (output as any).templateData;

  const outputString = formatMapJson(output);

  const outputDir = path.dirname(params.outputFilename);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(params.outputFilename, outputString);

  console.log(`Map generated successfully and saved to ${params.outputFilename}`);
}

// Execute the script
try {
  run();
} catch (e) {
  console.error("An error occurred during script execution:");
  console.error(e);
  process.exit(1);
}
