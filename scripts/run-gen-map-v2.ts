/**
 * @fileoverview Runner script for the V2 map generator.
 *
 * This script imports the generator, provides it with parameters,
 * and writes the output to a JSON file.
 */
import * as fs from 'fs';
import * as path from 'path';
import { generateMapV2 } from './gen-map-v2.js';
import type { GenMapV2Params, RoomTemplate, TemplateConstraint } from './gen-map-v2.js';

// --- Load the templates ---
const templatesPath = path.join(path.dirname(import.meta.url.replace('file://', '')), 'genmap2-templates.json');
const templatesFile = fs.readFileSync(templatesPath, 'utf-8');
const templates: RoomTemplate[] = JSON.parse(templatesFile);

// --- Define the constraints for template placement ---
// Each inner array is a constraint: [minW, minH, maxW, maxH, minRoomNum, maxRoomNum]
// The generator will iterate through this list and place one template per constraint.
const templateData: TemplateConstraint[] = [
    // Place a big 5x5 room
    [5, 5, 5, 5, 1, 1],
    // Place another big 5x5 room
    [5, 5, 5, 5, 1, 1],
    // Place a smaller 3x3 room
    [3, 3, 3, 3, 1, 1],
    // Place any template
    [1, 1, 99, 99, 1, 99],
    [1, 1, 99, 99, 1, 99],
    [1, 1, 99, 99, 1, 99],
];


// --- Parameters for the map generation ---
const params: GenMapV2Params = {
  Width: 20,
  Height: 20,
  templates: templates,
  templateData: templateData,
  forceFloorPos: [
    [2, 2], // Example: ensure this tile is a floor
  ],
  outputFilename: 'mapdata/generated_map_v2.json',
  seed: 12345, // Use a fixed seed for verification
  doorDensity: 0.6,
};

function run() {
  console.log(`Running V2 map generator with seed: ${params.seed}`);

  const { layout } = generateMapV2(params);

  const output = {
    ...params,
    generationDate: new Date().toISOString(),
    layout: layout,
  };

  // Clean up the output object to only include essential metadata and the layout.
  delete (output as any).templates;
  delete (output as any).outputFilename;
  delete (output as any).forceFloorPos;
  delete (output as any).templateData;

  const outputString = JSON.stringify(output, null, 2); // Pretty print JSON

  // Ensure the directory exists
  const outputDir = path.dirname(params.outputFilename);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(params.outputFilename, outputString);

  console.log(`Map generated successfully and saved to ${params.outputFilename}`);
}

// Execute the script
run();
