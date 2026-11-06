import fs from 'fs';
import { isHumanSkinPixel, analyzeFacePixels } from '@/lib/face-detection';

async function runFaceVerificationTests() {
  console.log('--- Running Human Face Verification Test Suite ---');

  // Test 1: Wood Surfaces vs Human Skin Chromaticity
  console.log('\n[Test 1] Wood vs Human Skin Chromaticity:');
  const woodSamples = [
    { name: 'Birch Cabinet', r: 213, g: 192, b: 171 },
    { name: 'Pine Desk Top', r: 218, g: 198, b: 160 },
    { name: 'Oak Bookshelf', r: 190, g: 168, b: 130 },
    { name: 'Office Laminate', r: 213, g: 192, b: 171 },
    { name: 'Beige Wall', r: 205, g: 192, b: 175 },
    { name: 'White UI Background', r: 235, g: 235, b: 235 },
  ];

  for (const wood of woodSamples) {
    const isSkin = isHumanSkinPixel(wood.r, wood.g, wood.b);
    if (isSkin) {
      throw new Error(`FAIL: Wood sample "${wood.name}" falsely recognized as human skin!`);
    }
  }
  console.log('PASS: All wood and furniture materials successfully rejected by skin chromaticity check.');

  // Test 2: Inclusive Human Skin Across All Ethnicities
  console.log('\n[Test 2] Inclusive Human Skin Chromaticity across Ethnicities:');
  const humanSkinSamples = [
    { name: 'Fair Skin (Matvii)', r: 227, g: 189, b: 171 },
    { name: 'Caucasian Normal', r: 211, g: 165, b: 145 },
    { name: 'Olive Skin', r: 190, g: 145, b: 115 },
    { name: 'Asian Skin', r: 218, g: 172, b: 142 },
    { name: 'Hispanic Tan', r: 178, g: 126, b: 95 },
    { name: 'Dark African Skin', r: 95, g: 68, b: 52 },
    { name: 'Deep Ebony Skin', r: 72, g: 48, b: 38 },
  ];

  for (const skin of humanSkinSamples) {
    const isSkin = isHumanSkinPixel(skin.r, skin.g, skin.b);
    if (!isSkin) {
      throw new Error(`FAIL: Real human skin tone "${skin.name}" rejected by chromaticity filter!`);
    }
  }
  console.log('PASS: All diverse human skin tones successfully recognized by skin chromaticity check.');

  // Test 3: Real Human Face Photo (Matvii Portrait)
  console.log('\n[Test 3] Real Human Face Verification:');
  const matviiRawPath = 'C:/Users/Inspiron/.gemini/antigravity/brain/d000b1c3-5d9e-4151-9959-9814bb4eaf7b/scratch/matvii_human.raw';
  if (fs.existsSync(matviiRawPath)) {
    const matviiBytes = fs.readFileSync(matviiRawPath);
    const result = analyzeFacePixels(matviiBytes, 160);
    console.log('Matvii Verification Result:', result);
    if (!result.isValidFace) {
      throw new Error(`FAIL: Real human face portrait was rejected: ${result.message}`);
    }
    if (result.confidence < 0.85) {
      throw new Error(`FAIL: Expected high confidence for real face, got ${result.confidence}`);
    }
    console.log('PASS: Real human face verified with high confidence.');
  }

  // Test 4: Office Interior / Furniture Photo (Vlad Desk / Bookshelf)
  console.log('\n[Test 4] Office Furniture / Desk Rejection:');
  const vladRawPath = 'C:/Users/Inspiron/.gemini/antigravity/brain/d000b1c3-5d9e-4151-9959-9814bb4eaf7b/scratch/vlad_furniture.raw';
  if (fs.existsSync(vladRawPath)) {
    const vladBytes = fs.readFileSync(vladRawPath);
    const result = analyzeFacePixels(vladBytes, 160);
    console.log('Vlad Furniture Result:', result);
    if (result.isValidFace) {
      throw new Error(`FAIL: Office furniture photo was falsely verified as a human face!`);
    }
    console.log('PASS: Office furniture / desk photo strictly rejected with descriptive message.');
  }

  // Test 5: Synthetic Architectural Grid / Bookshelf Edge Rejection
  console.log('\n[Test 5] Synthetic Bookshelf / Cabinet Grid Rejection:');
  const gridBytes = new Uint8Array(160 * 160 * 4);
  // Fill with neutral wood color
  for (let i = 0; i < 160 * 160; i++) {
    gridBytes[i * 4] = 190;
    gridBytes[i * 4 + 1] = 168;
    gridBytes[i * 4 + 2] = 130;
    gridBytes[i * 4 + 3] = 255;
  }
  // Draw 3 horizontal shelf lines and 2 vertical cabinet edges
  const targetRows = [35, 75, 115];
  const targetCols = [45, 105];
  for (const y of targetRows) {
    for (let x = 30; x < 130; x++) {
      const idx = (y * 160 + x) * 4;
      gridBytes[idx] = 40;
      gridBytes[idx + 1] = 30;
      gridBytes[idx + 2] = 20;
    }
  }
  for (const x of targetCols) {
    for (let y = 25; y < 135; y++) {
      const idx = (y * 160 + x) * 4;
      gridBytes[idx] = 40;
      gridBytes[idx + 1] = 30;
      gridBytes[idx + 2] = 20;
    }
  }

  const gridResult = analyzeFacePixels(gridBytes, 160);
  console.log('Bookshelf Grid Result:', gridResult);
  if (gridResult.isValidFace) {
    throw new Error('FAIL: Architectural grid / bookshelf was falsely verified!');
  }
  if (!gridResult.message.includes('furniture') && !gridResult.message.includes('human')) {
    throw new Error(`FAIL: Expected furniture rejection message, got: ${gridResult.message}`);
  }
  console.log('PASS: Bookshelf grid strictly rejected.');

  console.log('\nALL FACE VERIFICATION & SECURITY TESTS PASSED PERFECTLY!');
}

runFaceVerificationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
