/**
 * Human Face Verification Utility
 * Detects real human faces and strictly rejects objects, architecture, furniture,
 * bookshelves, desks, clothing, screenshots, and artwork.
 *
 * Implements a rigorous multi-stage verification pipeline:
 * 1. Flat UI & Screenshot Rejection (detects uniform backgrounds, documents, graphics)
 * 2. Architecture / Furniture / Grid Rejection (Sobel horizontal & vertical edge runs)
 * 3. Strict Human Skin Chromaticity Check (Hemoglobin curve + YCbCr skin ellipse)
 * 4. Anatomical Facial Geometry (Eye-Nose-Mouth Triad: forehead, bilateral eyes, cheeks, mouth slit)
 * 5. Browser FaceDetector Integration with mandatory skin and edge validation
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
 * Strict Human Skin Chromaticity Check
 * Human skin across all ethnicities has a tight hemoglobin reflectance curve:
 * (r - g) / (r + 1) >= 0.155 AND r > g && g >= b * 0.84
 * Wood (oak, birch, pine, laminate) has high green/yellow content and fails this ratio.
 * Also enforces the YCbCr skin ellipse and Cr > Cb + 12 constraint.
 */
export function isHumanSkinPixel(r: number, g: number, b: number): boolean {
  // Hemoglobin reflectance curve
  const hemoRatio = (r - g) / (r + 1);
  if (hemoRatio < 0.155 || r <= g || g < b * 0.84) {
    return false;
  }

  // YCbCr BT.601 standard conversion
  const Y = 0.299 * r + 0.587 * g + 0.114 * b;
  const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  // Strict redness constraint: human blood/skin chrominance requires Cr > Cb + 12
  if (Cr <= Cb + 12) {
    return false;
  }

  // Tight YCbCr skin ellipse: supports both tight prompt ellipse and canonical skin cluster
  const ellipseStd = Math.pow(Cr - 150, 2) / 450 + Math.pow(Cb - 117, 2) / 280;
  const ellipsePrompt = Math.pow(Cr - 128, 2) / 360 + Math.pow(Cb - 128, 2) / 200;
  if (ellipseStd > 1.25 && ellipsePrompt > 1.0) {
    return false;
  }

  // Luminance and minimum intensity bounds
  if (Y < 30 || Y > 248 || r < 38) {
    return false;
  }

  return true;
}

/**
 * Pure Pixel Buffer Face Analyzer
 * Operates on RGBA pixel array of targetSize x targetSize
 */
export function analyzeFacePixels(
  data: Uint8Array | Uint8ClampedArray,
  targetSize = 160
): FaceVerificationResult {
  const totalPixels = targetSize * targetSize;

  // ---------------------------------------------------------
  // 1. Screenshot / Flat UI / Web Page / Graphic Rejection
  // ---------------------------------------------------------
  let nearWhitePixels = 0;
  let flatGrayPixels = 0;

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (r > 240 && g > 240 && b > 240) {
        nearWhitePixels++;
      }
      if (Math.abs(r - g) <= 2 && Math.abs(g - b) <= 2 && (r > 210 || r < 25)) {
        flatGrayPixels++;
      }
    }
  }

  const nearWhiteRatio = nearWhitePixels / totalPixels;
  const flatGrayRatio = flatGrayPixels / totalPixels;
  if (nearWhiteRatio > 0.25 || nearWhiteRatio + flatGrayRatio > 0.45) {
    return {
      isValidFace: false,
      confidence: 0.05,
      message: 'Screenshots, web pages, and graphics are not allowed. Please upload a real camera photo of your face.',
    };
  }

  // ---------------------------------------------------------
  // 2. Rejection of Architecture / Furniture / Grids
  // ---------------------------------------------------------
  // Calculate horizontal and vertical Sobel gradients across luminance.
  // Real faces have soft curved contours. Bookshelves, desks, cabinets, and rooms
  // have long straight horizontal lines (shelves) and long vertical lines (cabinet edges).
  const minX = Math.floor(targetSize * 0.20);
  const maxX = Math.floor(targetSize * 0.80);
  const minY = Math.floor(targetSize * 0.15);
  const maxY = Math.floor(targetSize * 0.85);
  const zoneWidth = maxX - minX;
  const zoneHeight = maxY - minY;

  const lums = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    lums[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  const gx = new Float32Array(totalPixels);
  const gy = new Float32Array(totalPixels);

  for (let y = 1; y < targetSize - 1; y++) {
    for (let x = 1; x < targetSize - 1; x++) {
      const idx = y * targetSize + x;
      gy[idx] =
        -1 * lums[(y - 1) * targetSize + (x - 1)] - 2 * lums[(y - 1) * targetSize + x] - 1 * lums[(y - 1) * targetSize + (x + 1)] +
        +1 * lums[(y + 1) * targetSize + (x - 1)] + 2 * lums[(y + 1) * targetSize + x] + 1 * lums[(y + 1) * targetSize + (x + 1)];
      gx[idx] =
        -1 * lums[(y - 1) * targetSize + (x - 1)] + 1 * lums[(y - 1) * targetSize + (x + 1)] +
        -2 * lums[y * targetSize + (x - 1)]       + 2 * lums[y * targetSize + (x + 1)] +
        -1 * lums[(y + 1) * targetSize + (x - 1)] + 1 * lums[(y + 1) * targetSize + (x + 1)];
    }
  }

  // Detect straight horizontal edge runs (shelves, desk tops)
  const minHorizRunLength = Math.floor(zoneWidth * 0.38); // >= 36 px
  const horizontalRowsWithRun: number[] = [];
  for (let y = minY; y <= maxY; y++) {
    let currentRun = 0;
    let maxRunInRow = 0;
    for (let x = minX; x <= maxX; x++) {
      const idx = y * targetSize + x;
      const magY = Math.abs(gy[idx]);
      const magX = Math.abs(gx[idx]);
      if (magY > 85 && magY > 1.8 * magX) {
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

  // Group adjacent rows into distinct physical horizontal lines
  let distinctHorizontalLines = 0;
  let lastGroupedRow = -999;
  for (const row of horizontalRowsWithRun) {
    if (row - lastGroupedRow > 3) {
      distinctHorizontalLines++;
    }
    lastGroupedRow = row;
  }

  // Detect straight vertical edge runs (cabinet edges, doors, pillars)
  const minVertRunLength = Math.floor(zoneHeight * 0.32); // >= 35 px
  const verticalColsWithRun: number[] = [];
  for (let x = minX; x <= maxX; x++) {
    let currentRun = 0;
    let maxRunInCol = 0;
    for (let y = minY; y <= maxY; y++) {
      const idx = y * targetSize + x;
      const magX = Math.abs(gx[idx]);
      const magY = Math.abs(gy[idx]);
      if (magX > 85 && magX > 1.8 * magY) {
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

  // Group adjacent columns into distinct physical vertical lines
  let distinctVerticalLines = 0;
  let lastGroupedCol = -999;
  for (const col of verticalColsWithRun) {
    if (col - lastGroupedCol > 3) {
      distinctVerticalLines++;
    }
    lastGroupedCol = col;
  }

  const totalStraightRuns = distinctHorizontalLines + distinctVerticalLines;
  if (totalStraightRuns > 2 || distinctVerticalLines >= 2) {
    return {
      isValidFace: false,
      confidence: 0.1,
      message: 'Objects, furniture, and room photos are not allowed. Please upload a clear photo of your face.',
    };
  }

  // ---------------------------------------------------------
  // 3. Central Face Zone Skin Chromaticity Distribution
  // ---------------------------------------------------------
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
  const outerSkinRatio = outerSkinPixels / Math.max(1, outerTotalPixels);

  if (centerSkinRatio < 0.28 || centerSkinRatio > 0.98 || centerSkinRatio <= outerSkinRatio * 1.15) {
    return {
      isValidFace: false,
      confidence: 0.15,
      message:
        'No centered human face detected. Please ensure your face is clearly centered in frame (not furniture, objects, or background).',
    };
  }

  // ---------------------------------------------------------
  // 4. Anatomical Facial Geometry (Eye-Nose-Mouth Triad)
  // ---------------------------------------------------------

  // 1) Forehead (y = 15%..30%, x = 32%..68%): Must be smooth skin tone with low variance
  const fhY1 = Math.floor(targetSize * 0.15);
  const fhY2 = Math.floor(targetSize * 0.30);
  const fhX1 = Math.floor(targetSize * 0.32);
  const fhX2 = Math.floor(targetSize * 0.68);
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

  if (fhSkinRatio < 0.35 || fhStdDev > 35) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message: 'Could not detect a clear forehead. Please ensure your face is facing the camera directly.',
    };
  }

  // 2) Eyes (y = 32%..48%): Must have TWO distinct darker regions horizontally separated by at least 15% of width, symmetrically positioned around center
  const eyeY1 = Math.floor(targetSize * 0.32);
  const eyeY2 = Math.floor(targetSize * 0.48);
  const leftEyeX1 = Math.floor(targetSize * 0.22);
  const leftEyeX2 = Math.floor(targetSize * 0.46);
  const rightEyeX1 = Math.floor(targetSize * 0.54);
  const rightEyeX2 = Math.floor(targetSize * 0.78);

  const eyeDarkThreshold = fhAvgLum * 0.82;
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

  const minRequiredDark = Math.max(8, Math.floor(leftTotal * 0.05));
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

  if (eyeSeparation < 0.15 || symmetryOffset > 0.14) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message: 'Could not detect bilateral eyes. Please face the camera directly with both eyes clearly visible.',
    };
  }

  // 3) Cheeks (y = 48%..65% left and right of center): Must be smooth skin with low local variance
  const chY1 = Math.floor(targetSize * 0.48);
  const chY2 = Math.floor(targetSize * 0.65);
  const chLeftX1 = Math.floor(targetSize * 0.20);
  const chLeftX2 = Math.floor(targetSize * 0.42);
  const chRightX1 = Math.floor(targetSize * 0.58);
  const chRightX2 = Math.floor(targetSize * 0.80);

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

  if (chLSkinRatio < 0.35 || chRSkinRatio < 0.35 || chLStdDev > 40 || chRStdDev > 40) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message: 'Facial structure not detected. Please upload a clear, centered portrait photo of your face.',
    };
  }

  // 4) Mouth (y = 66%..82%): Must have a horizontal mouth slit or distinct lip color, centered horizontally
  const mY1 = Math.floor(targetSize * 0.66);
  const mY2 = Math.floor(targetSize * 0.82);
  const mX1 = Math.floor(targetSize * 0.32);
  const mX2 = Math.floor(targetSize * 0.68);

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

      const isMouthDark = Y < fhAvgLum * 0.82;
      const isLipColor = Cr > 150 && Cr > Cb + 16;

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

  if (maxHorizDarkRun < 10 && mHighCrCount < 15) {
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

  if (centerLumStdDev < 16) {
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
  // Even if browser FaceDetector finds faces, we STILL enforce full skin chromaticity
  // and furniture/straight-edge rejection to eliminate any false positives!
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
      const minW = naturalWidth * 0.12;
      const minH = naturalHeight * 0.12;
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

      // Pass the detected face region through strict skin and furniture edge tests
      const faceBox = validFaces[0]?.boundingBox;
      const canvasResult = analyzeCanvasForHumanFace(img, faceBox);
      if (!canvasResult.isValidFace) {
        return canvasResult;
      }

      return {
        isValidFace: true,
        confidence: Math.max(0.96, canvasResult.confidence),
        message: 'Human face verified successfully.',
      };
    } catch {
      // Fallback to Canvas Chrominance, Proportion, Symmetry & Texture Analyzer
    }
  }

  // 2. Canvas-based Facial Chrominance, Proportion, Symmetry & Texture Analyzer
  return analyzeCanvasForHumanFace(img);
}
