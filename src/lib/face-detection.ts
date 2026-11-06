/**
 * Advanced Client-Side Human Face Verification Engine
 *
 * Designed to strictly reject:
 * - Furniture (desks, cabinets, bookshelves, wood surfaces, tables)
 * - Objects (shoes, clothes, phones, controllers, bottles)
 * - Blank / architectural backgrounds (walls, floors, screens)
 *
 * While reliably accepting:
 * - Natural human selfies across all skin tones and ethnicities
 * - Handheld and mirror selfies with natural room backgrounds, hair/bangs, and selfie tilt angles
 * - Native Browser FaceDetector (Shape Detection API) with skin confirmation
 */

export interface FaceVerificationResult {
  isValidFace: boolean;
  confidence: number;
  message: string;
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Validates whether an RGB pixel matches human skin chrominance.
 * Incorporates hemoglobin absorption signature:
 * Human skin displays strong red-dominant absorption: (R - G) / (R + 1) >= 0.12.
 * Wood/laminate finishes have low hemoglobin contrast ((R - G) / R < 0.11).
 * Also enforces the YCbCr skin ellipse and Cr > Cb + 10 constraint.
 */
export function isHumanSkinPixel(r: number, g: number, b: number): boolean {
  // Hemoglobin reflectance curve (tolerant of indoor lighting while strictly rejecting wood/paper/walls)
  const hemoRatio = (r - g) / (r + 1);
  if (hemoRatio < 0.12 || r <= g || g < b * 0.75) {
    return false;
  }

  // Canonical YCbCr conversion (ITU-R BT.601)
  const Y = 0.299 * r + 0.587 * g + 0.114 * b;
  const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  // Redness constraint: human blood/skin chrominance requires Cr > Cb + 10
  if (Cr <= Cb + 10) {
    return false;
  }

  // YCbCr skin ellipse: supports both tight prompt ellipse and canonical skin cluster
  const ellipseStd = Math.pow(Cr - 150, 2) / 650 + Math.pow(Cb - 117, 2) / 420;
  const ellipsePrompt = Math.pow(Cr - 128, 2) / 520 + Math.pow(Cb - 128, 2) / 340;
  if (ellipseStd > 1.4 && ellipsePrompt > 1.2) {
    return false;
  }

  // Luminance and minimum intensity bounds
  if (Y < 25 || Y > 250 || r < 32) {
    return false;
  }

  return true;
}

/**
 * Analyzes pixel data from a square (e.g. 160x160) canvas to verify
 * presence of a real human face.
 */
export function analyzeFacePixels(
  data: Uint8ClampedArray | Uint8Array,
  targetSize: number = 160
): FaceVerificationResult {
  const totalPixels = targetSize * targetSize;

  // ---------------------------------------------------------
  // 1. Extreme Flat / Blank / Screenshot Check
  // ---------------------------------------------------------
  let nearWhitePixels = 0;
  let nearBlackPixels = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (r > 240 && g > 240 && b > 240) nearWhitePixels++;
    if (r < 18 && g < 18 && b < 18) nearBlackPixels++;
  }

  const nearWhiteRatio = nearWhitePixels / totalPixels;
  const nearBlackRatio = nearBlackPixels / totalPixels;

  if (nearWhiteRatio > 0.70 || nearBlackRatio > 0.85) {
    return {
      isValidFace: false,
      confidence: 0,
      message: 'Photo appears to be a blank image or solid screenshot. Please take a real photo.',
    };
  }

  // ---------------------------------------------------------
  // 2. Central Face Zone Skin Chromaticity Distribution
  // ---------------------------------------------------------
  const minX = Math.floor(targetSize * 0.18);
  const maxX = Math.floor(targetSize * 0.82);
  const minY = Math.floor(targetSize * 0.12);
  const maxY = Math.floor(targetSize * 0.88);

  const lums = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    lums[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  let centerTotalPixels = 0;
  let centerSkinPixels = 0;
  let outerTotalPixels = 0;
  let outerSkinPixels = 0;
  let centerLumSum = 0;
  const centerLuminances: number[] = [];

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const isSkin = isHumanSkinPixel(r, g, b);
      const Y = lums[y * targetSize + x];

      const inCenter = x >= minX && x <= maxX && y >= minY && y <= maxY;
      if (inCenter) {
        centerTotalPixels++;
        centerLumSum += Y;
        centerLuminances.push(Y);
        if (isSkin) centerSkinPixels++;
      } else {
        outerTotalPixels++;
        if (isSkin) outerSkinPixels++;
      }
    }
  }

  const centerSkinRatio = centerSkinPixels / Math.max(1, centerTotalPixels);

  if (centerSkinRatio < 0.15 || centerSkinRatio > 0.99) {
    return {
      isValidFace: false,
      confidence: 0.15,
      message:
        'No centered human face detected. Please ensure your face is clearly centered in frame (not furniture, objects, or background).',
    };
  }

  // ---------------------------------------------------------
  // 3. Rejection of Architecture / Furniture / Grids
  // ---------------------------------------------------------
  // Calculate horizontal and vertical Sobel gradients across luminance.
  // Real faces have soft curved contours. Bookshelves, desks, cabinets, and rooms
  // have long straight horizontal lines (shelves) and long vertical lines (cabinet edges).
  const zoneWidth = maxX - minX;
  const zoneHeight = maxY - minY;

  const gx = new Float32Array(totalPixels);
  const gy = new Float32Array(totalPixels);

  for (let y = 1; y < targetSize - 1; y++) {
    for (let x = 1; x < targetSize - 1; x++) {
      const idx = y * targetSize + x;
      // Sobel horizontal
      gx[idx] =
        -lums[(y - 1) * targetSize + (x - 1)] +
        lums[(y - 1) * targetSize + (x + 1)] -
        2 * lums[y * targetSize + (x - 1)] +
        2 * lums[y * targetSize + (x + 1)] -
        lums[(y + 1) * targetSize + (x - 1)] +
        lums[(y + 1) * targetSize + (x + 1)];
      // Sobel vertical
      gy[idx] =
        -lums[(y - 1) * targetSize + (x - 1)] -
        2 * lums[(y - 1) * targetSize + x] -
        lums[(y - 1) * targetSize + (x + 1)] +
        lums[(y + 1) * targetSize + (x - 1)] +
        2 * lums[(y + 1) * targetSize + x] +
        lums[(y + 1) * targetSize + (x + 1)];
    }
  }

  // Detect straight horizontal edge runs (shelves, desk tops)
  const minHorizRunLength = Math.floor(zoneWidth * 0.40);
  const horizontalRowsWithRun: number[] = [];
  for (let y = minY; y <= maxY; y++) {
    let currentRun = 0;
    let maxRunInRow = 0;
    for (let x = minX; x <= maxX; x++) {
      const idx = y * targetSize + x;
      const magY = Math.abs(gy[idx]);
      const magX = Math.abs(gx[idx]);
      if (magY > 90 && magY > 2.0 * magX) {
        currentRun++;
        if (currentRun > maxRunInRow) maxRunInRow = currentRun;
      } else {
        currentRun = 0;
      }
    }
    if (maxRunInRow >= minHorizRunLength) {
      horizontalRowsWithRun.push(y);
    }
  }

  let distinctHorizontalLines = 0;
  let lastGroupedRow = -999;
  for (const row of horizontalRowsWithRun) {
    if (row > lastGroupedRow + 4) {
      distinctHorizontalLines++;
      lastGroupedRow = row;
    }
  }

  // Detect straight vertical edge runs (cabinet edges, doors, pillars)
  const minVertRunLength = Math.floor(zoneHeight * 0.35);
  const verticalColsWithRun: number[] = [];
  for (let x = minX; x <= maxX; x++) {
    let currentRun = 0;
    let maxRunInCol = 0;
    for (let y = minY; y <= maxY; y++) {
      const idx = y * targetSize + x;
      const magX = Math.abs(gx[idx]);
      const magY = Math.abs(gy[idx]);
      if (magX > 90 && magX > 2.0 * magY) {
        currentRun++;
        if (currentRun > maxRunInCol) maxRunInCol = currentRun;
      } else {
        currentRun = 0;
      }
    }
    if (maxRunInCol >= minVertRunLength) {
      verticalColsWithRun.push(x);
    }
  }

  let distinctVerticalLines = 0;
  let lastGroupedCol = -999;
  for (const col of verticalColsWithRun) {
    if (col > lastGroupedCol + 4) {
      distinctVerticalLines++;
      lastGroupedCol = col;
    }
  }

  const totalStraightRuns = distinctHorizontalLines + distinctVerticalLines;
  // Strictly reject objects/furniture when straight lines dominate AND skin is minimal,
  // or when straight lines form an extensive grid (bookshelf/cabinet)
  if (
    (centerSkinRatio < 0.25 && (totalStraightRuns >= 2 || distinctVerticalLines >= 2)) ||
    totalStraightRuns >= 5
  ) {
    return {
      isValidFace: false,
      confidence: 0.1,
      message:
        'Furniture, architectural edges, or objects detected. Please upload a clear photo of your face, not furniture or room interiors.',
    };
  }

  // ---------------------------------------------------------
  // 4. Anatomical Facial Geometry (Eye-Nose-Mouth Triad)
  // ---------------------------------------------------------

  // 1) Forehead (y = 15%..30%, x = 32%..68%): Must contain skin tone
  const fhY1 = Math.floor(targetSize * 0.15);
  const fhY2 = Math.floor(targetSize * 0.30);
  const fhX1 = Math.floor(targetSize * 0.30);
  const fhX2 = Math.floor(targetSize * 0.70);
  let fhPixels = 0;
  let fhSkin = 0;
  let fhLumSum = 0;
  const fhLums: number[] = [];

  for (let y = fhY1; y <= fhY2; y++) {
    for (let x = fhX1; x <= fhX2; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const Y = lums[y * targetSize + x];
      fhPixels++;
      if (isHumanSkinPixel(r, g, b)) fhSkin++;
      fhLumSum += Y;
      fhLums.push(Y);
    }
  }

  const fhAvgLum = fhLumSum / Math.max(1, fhPixels);
  const fhVariance =
    fhLums.reduce((acc, v) => acc + Math.pow(v - fhAvgLum, 2), 0) / Math.max(1, fhPixels);
  const fhStdDev = Math.sqrt(fhVariance);
  const fhSkinRatio = fhSkin / Math.max(1, fhPixels);

  // Relaxed to accommodate bangs, styled hair, or hats while still rejecting inanimate flat objects
  if (fhSkinRatio < 0.12 || fhStdDev > 65) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message: 'Could not detect a clear forehead. Please ensure your face is facing the camera directly.',
    };
  }

  // 2) Eyes (y = 30%..52%): Detect darker ocular cavities separated horizontally
  const eyeY1 = Math.floor(targetSize * 0.30);
  const eyeY2 = Math.floor(targetSize * 0.52);
  const leftEyeX1 = Math.floor(targetSize * 0.18);
  const leftEyeX2 = Math.floor(targetSize * 0.48);
  const rightEyeX1 = Math.floor(targetSize * 0.52);
  const rightEyeX2 = Math.floor(targetSize * 0.82);

  const eyeDarkThreshold = fhAvgLum * 0.88;
  let leftDark = 0;
  let leftTotal = 0;
  let leftDarkSumX = 0;
  let rightDark = 0;
  let rightTotal = 0;
  let rightDarkSumX = 0;

  for (let y = eyeY1; y <= eyeY2; y++) {
    for (let x = leftEyeX1; x <= leftEyeX2; x++) {
      const idx = y * targetSize + x;
      leftTotal++;
      if (lums[idx] < eyeDarkThreshold) {
        leftDark++;
        leftDarkSumX += x;
      }
    }
    for (let x = rightEyeX1; x <= rightEyeX2; x++) {
      const idx = y * targetSize + x;
      rightTotal++;
      if (lums[idx] < eyeDarkThreshold) {
        rightDark++;
        rightDarkSumX += x;
      }
    }
  }

  const minRequiredDark = Math.max(4, Math.floor(leftTotal * 0.025));
  if (leftDark < minRequiredDark || rightDark < minRequiredDark) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message: 'Could not detect bilateral eyes. Please face the camera directly with both eyes clearly visible.',
    };
  }

  const leftCentroidX = leftDarkSumX / leftDark;
  const rightCentroidX = rightDarkSumX / rightDark;
  const eyeSeparation = (rightCentroidX - leftCentroidX) / targetSize;
  const eyeCenter = (leftCentroidX + rightCentroidX) / 2;
  const symmetryOffset = Math.abs(eyeCenter - targetSize / 2) / targetSize;

  // Tolerates natural selfie angle tilts up to 25% offset
  if (eyeSeparation < 0.08 || symmetryOffset > 0.30) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message: 'Could not detect bilateral eyes. Please face the camera directly with both eyes clearly visible.',
    };
  }

  // 3) Cheeks (y = 48%..68% left and right of center)
  const chY1 = Math.floor(targetSize * 0.48);
  const chY2 = Math.floor(targetSize * 0.68);
  const chLeftX1 = Math.floor(targetSize * 0.18);
  const chLeftX2 = Math.floor(targetSize * 0.44);
  const chRightX1 = Math.floor(targetSize * 0.56);
  const chRightX2 = Math.floor(targetSize * 0.82);

  let chLTotal = 0, chLSkin = 0, chLSum = 0;
  const chLLums: number[] = [];
  let chRTotal = 0, chRSkin = 0, chRSum = 0;
  const chRLums: number[] = [];

  for (let y = chY1; y <= chY2; y++) {
    for (let x = chLeftX1; x <= chLeftX2; x++) {
      const idx = (y * targetSize + x) * 4;
      chLTotal++;
      if (isHumanSkinPixel(data[idx], data[idx + 1], data[idx + 2])) chLSkin++;
      const Y = lums[y * targetSize + x];
      chLSum += Y;
      chLLums.push(Y);
    }
    for (let x = chRightX1; x <= chRightX2; x++) {
      const idx = (y * targetSize + x) * 4;
      chRTotal++;
      if (isHumanSkinPixel(data[idx], data[idx + 1], data[idx + 2])) chRSkin++;
      const Y = lums[y * targetSize + x];
      chRSum += Y;
      chRLums.push(Y);
    }
  }

  const chLSkinRatio = chLSkin / Math.max(1, chLTotal);
  const chRSkinRatio = chRSkin / Math.max(1, chRTotal);
  const chLAvg = chLSum / Math.max(1, chLTotal);
  const chRAvg = chRSum / Math.max(1, chRTotal);
  const chLStdDev = Math.sqrt(
    chLLums.reduce((acc, v) => acc + Math.pow(v - chLAvg, 2), 0) / Math.max(1, chLTotal)
  );
  const chRStdDev = Math.sqrt(
    chRLums.reduce((acc, v) => acc + Math.pow(v - chRAvg, 2), 0) / Math.max(1, chRTotal)
  );

  // In mirror selfies, a hand or phone may occlude one cheek; require at least one clear cheek zone
  if (
    Math.max(chLSkinRatio, chRSkinRatio) < 0.16 ||
    (chLStdDev > 60 && chRStdDev > 60)
  ) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message: 'Facial structure not detected. Please upload a clear, centered portrait photo of your face.',
    };
  }

  // 4) Mouth (y = 64%..84%): Horizontal mouth contour or distinct lip chrominance
  const mY1 = Math.floor(targetSize * 0.64);
  const mY2 = Math.floor(targetSize * 0.84);
  const mX1 = Math.floor(targetSize * 0.28);
  const mX2 = Math.floor(targetSize * 0.72);

  let mHighCrCount = 0;
  let maxHorizDarkRun = 0;

  for (let y = mY1; y <= mY2; y++) {
    let rowDarkRun = 0;
    for (let x = mX1; x <= mX2; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const Y = lums[y * targetSize + x];
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;

      const isMouthDark = Y < fhAvgLum * 0.88;
      const isLipColor = Cr > 142 && Cr > Cb + 12;

      if (isMouthDark) {
        rowDarkRun++;
        if (rowDarkRun > maxHorizDarkRun) maxHorizDarkRun = rowDarkRun;
      } else {
        rowDarkRun = 0;
      }

      if (isLipColor) {
        mHighCrCount++;
      }
    }
  }

  if (maxHorizDarkRun < 5 && mHighCrCount < 6) {
    return {
      isValidFace: false,
      confidence: 0.25,
      message: 'Could not detect mouth and facial features. Please ensure your full face is visible.',
    };
  }

  // ---------------------------------------------------------
  // 5. Organic Texture Variance Check
  // ---------------------------------------------------------
  const centerVar =
    centerLuminances.reduce((acc, val) => acc + Math.pow(val - (centerLumSum / centerTotalPixels), 2), 0) /
    Math.max(1, centerLuminances.length);
  const centerLumStdDev = Math.sqrt(centerVar);

  if (centerLumStdDev < 10) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message: 'Image lacks natural facial texture. Please upload a real camera photo of your face (not flat artwork or solid objects).',
    };
  }

  const confidence = Math.min(0.98, Math.max(0.85, 0.70 + centerSkinRatio * 0.30));
  return {
    isValidFace: true,
    confidence,
    message: 'Human face verified successfully.',
  };
}

/**
 * Canvas-based Face Extraction & Multi-Stage Verification
 */
export function analyzeCanvasForHumanFace(
  img: HTMLImageElement,
  faceBox?: FaceBoundingBox
): FaceVerificationResult {
  const canvas = document.createElement('canvas');
  const targetSize = 160;
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return { isValidFace: false, confidence: 0, message: 'Canvas context unavailable for verification' };
  }

  const imgW = img.naturalWidth || img.width || targetSize;
  const imgH = img.naturalHeight || img.height || targetSize;

  if (faceBox && faceBox.width > 20 && faceBox.height > 20) {
    // Crop around the detected face with a 15% margin
    const padX = faceBox.width * 0.15;
    const padY = faceBox.height * 0.15;
    const sx = Math.max(0, faceBox.x - padX);
    const sy = Math.max(0, faceBox.y - padY);
    const sw = Math.min(imgW - sx, faceBox.width + padX * 2);
    const sh = Math.min(imgH - sy, faceBox.height + padY * 2);

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetSize, targetSize);
  } else {
    // Center-crop the image to square
    const minDim = Math.min(imgW, imgH);
    const sx = (imgW - minDim) / 2;
    const sy = (imgH - minDim) / 2;
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
  }

  const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
  return analyzeFacePixels(imgData.data, targetSize);
}

/**
 * Main Face Verification Entrypoint
 * Checks dimensions, queries browser FaceDetector if present, and executes
 * full multi-stage skin, furniture edge, and facial geometry analysis.
 */
export async function verifyHumanFace(
  imageSource: string | HTMLImageElement
): Promise<FaceVerificationResult> {
  let img: HTMLImageElement;

  if (typeof imageSource === 'string') {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load image for verification'));
      el.src = imageSource;
    });
  } else {
    img = imageSource;
  }

  // Minimum dimensions check
  const naturalWidth = img.naturalWidth || img.width || 0;
  const naturalHeight = img.naturalHeight || img.height || 0;
  if (naturalWidth < 80 || naturalHeight < 80) {
    return {
      isValidFace: false,
      confidence: 0,
      message: 'Image is too small. Please upload a clear photo (at least 80x80px).',
    };
  }

  // 1. Browser Native FaceDetector integration (Shape Detection API)
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detector = new (window as any).FaceDetector({
        fastMode: false,
        maxDetectedFaces: 4,
      });
      const detectedFaces = await detector.detect(img);

      if (!detectedFaces || detectedFaces.length === 0) {
        return {
          isValidFace: false,
          confidence: 0.1,
          message: 'No human face detected. Please upload a clear photo of your face (not shoes, clothes, or objects).',
        };
      }

      // Check candidate bounding box
      const minW = naturalWidth * 0.10;
      const minH = naturalHeight * 0.10;
      const validFaces = detectedFaces.filter((face: any) => {
        const bb = face?.boundingBox;
        return !bb || (bb.width >= minW && bb.height >= minH);
      });

      if (validFaces.length === 0) {
        return {
          isValidFace: false,
          confidence: 0.15,
          message: 'Detected face is too small or unclear. Please upload a closer portrait photo.',
        };
      }

      // Sample pixels in detected face region to ensure genuine skin presence (not flat drawing or poster)
      const faceBox = validFaces[0]?.boundingBox;
      const canvasResult = analyzeCanvasForHumanFace(img, faceBox);

      // If the face detector found a face, verify that the cropped box has real human skin tone
      // and isn't a blank or furniture screenshot
      if (canvasResult.isValidFace) {
        return {
          isValidFace: true,
          confidence: Math.max(0.96, canvasResult.confidence),
          message: 'Human face verified successfully.',
        };
      }

      // If heuristics were tripped by lighting/bangs/pose, but browser native ML FaceDetector
      // confidently located the face, verify basic skin chromaticity in the detected region:
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx && faceBox) {
        ctx.drawImage(img, faceBox.x, faceBox.y, faceBox.width, faceBox.height, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        let skinCount = 0;
        for (let i = 0; i < 64 * 64; i++) {
          if (isHumanSkinPixel(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])) {
            skinCount++;
          }
        }
        const skinFraction = skinCount / (64 * 64);
        if (skinFraction >= 0.10) {
          return {
            isValidFace: true,
            confidence: 0.95,
            message: 'Human face verified successfully.',
          };
        }
      }

      return canvasResult;
    } catch {
      // Fallback to Canvas Chrominance, Proportion, Symmetry & Texture Analyzer
    }
  }

  // 2. Canvas-based Facial Chrominance, Proportion, Symmetry & Texture Analyzer
  return analyzeCanvasForHumanFace(img);
}
