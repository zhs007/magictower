/**
 * @fileoverview Runner script for the V2 map generator.
 *
 * This script imports the generator, provides it with parameters,
 * and writes the output to a JSON file.
 */
import * as fs from 'fs';
import * as path from 'path';
import { generateMapV2 } from './gen-map-v2.js';
import type { GenMapV2Params } from './gen-map-v2.js';

// --- Parameters for the map generation ---
const params: GenMapV2Params = {
  Width: 16,
  Height: 16,
  templateData: [], // Not used yet
  forceFloorPos: [
    [5, 5], // Example: ensure this tile is a floor
  ],
  outputFilename: 'mapdata/generated_map_v2.json',
  seed: Math.floor(Math.random() * 100000), // Use a random seed each time
  doorDensity: 0.6,
  maxPlacementAttempts: 200,
};

function run() {
  console.log(`Running V2 map generator with seed: ${params.seed}`);

  const { layout } = generateMapV2(params);

  // The user wants the layout to be easily human-readable in the JSON.
  const output = {
    meta: {
        ...params,
        generationDate: new Date().toISOString(),
    },
    layout: layout,
  };

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
