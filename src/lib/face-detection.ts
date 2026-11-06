/**
 * Human Face Verification Utility
 * Detects real human faces and rejects objects (shoes, cars, scenery, text, animals, furniture, screenshots).
 * Uses native browser FaceDetector when available, with an intelligent
 * YCbCr skin chrominance + bilateral facial feature, proportion & texture analyzer fallback.
 */

export interface FaceVerificationResult {
  isValidFace: boolean;
  confidence: number;
  message: string;
}

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
  if (img.naturalWidth < 80 || img.naturalHeight < 80) {
    return {
      isValidFace: false,
      confidence: 0,
      message: 'Image is too small. Please upload a clear photo (at least 80x80px).',
    };
  }

  // 1. Try Native Browser FaceDetector (Shape Detection API in Chromium/Android/Edge)
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detector = new (window as any).FaceDetector({
        fastMode: false,
        maxDetectedFaces: 4,
      });
      const detectedFaces = await detector.detect(img);

      if (detectedFaces && detectedFaces.length > 0) {
        // Sanity check that the detected face box is at least 12% of image width/height
        const imgW = img.naturalWidth || img.width || 100;
        const imgH = img.naturalHeight || img.height || 100;
        const minW = imgW * 0.12;
        const minH = imgH * 0.12;

        const hasSubstantialFace = detectedFaces.some((face: any) => {
          const bb = face?.boundingBox;
          if (!bb) return true;
          return bb.width >= minW && bb.height >= minH;
        });

        if (hasSubstantialFace) {
          return {
            isValidFace: true,
            confidence: 0.98,
            message: 'Human face verified successfully.',
          };
        }
      }

      return {
        isValidFace: false,
        confidence: 0.1,
        message: 'No human face detected. Please upload a clear photo of your face (not shoes, clothes, or objects).',
      };
    } catch {
      // Fallback to Canvas Chrominance, Proportion & Symmetry Analyzer
    }
  }

  // 2. Canvas-based Facial Chrominance, Proportion, Symmetry & Texture Analyzer
  return analyzeCanvasForHumanFace(img);
}

export function analyzeCanvasForHumanFace(img: HTMLImageElement): FaceVerificationResult {
  const canvas = document.createElement('canvas');
  const targetSize = 160;
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return { isValidFace: false, confidence: 0, message: 'Canvas context unavailable for verification' };
  }

  ctx.drawImage(img, 0, 0, targetSize, targetSize);
  const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
  const data = imgData.data;
  const totalPixels = targetSize * targetSize;

  // 1. Screenshot / Web Page / Document / Solid Graphic Rejection
  let nearWhitePixels = 0;
  let flatUIPixels = 0;

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const isNearWhite = r > 238 && g > 238 && b > 238;
      const isFlatGray =
        Math.abs(r - g) <= 2 &&
        Math.abs(g - b) <= 2 &&
        (r > 210 || r < 25);

      if (isNearWhite) {
        nearWhitePixels++;
      }

      // Check straight horizontal/vertical identical-color runs (UI boxes/frames)
      let isIdenticalRun = false;
      if (x > 0) {
        const leftIdx = (y * targetSize + (x - 1)) * 4;
        if (r === data[leftIdx] && g === data[leftIdx + 1] && b === data[leftIdx + 2]) {
          isIdenticalRun = true;
        }
      }
      if (y > 0) {
        const topIdx = ((y - 1) * targetSize + x) * 4;
        if (r === data[topIdx] && g === data[topIdx + 1] && b === data[topIdx + 2]) {
          isIdenticalRun = true;
        }
      }

      if (isNearWhite || isFlatGray || isIdenticalRun) {
        flatUIPixels++;
      }
    }
  }

  const nearWhiteRatio = nearWhitePixels / totalPixels;
  const flatUIRatio = flatUIPixels / totalPixels;

  if (nearWhiteRatio > 0.22 || flatUIRatio > 0.45) {
    return {
      isValidFace: false,
      confidence: 0.05,
      message: 'Screenshots, web pages, and graphics are not allowed. Please upload a real camera photo of your face.',
    };
  }

  // 2. Central Face Zone vs Outer Border Zone Skin Distribution
  // Central face zone (x: 25%..75%, y: 18%..82%)
  const minCenterX = Math.floor(targetSize * 0.25);
  const maxCenterX = Math.floor(targetSize * 0.75);
  const minCenterY = Math.floor(targetSize * 0.18);
  const maxCenterY = Math.floor(targetSize * 0.82);

  let centerTotalPixels = 0;
  let centerSkinPixels = 0;
  let outerTotalPixels = 0;
  let outerSkinPixels = 0;

  const centerLuminances: number[] = [];
  let centerLumSum = 0;

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Convert RGB to YCbCr standard (ITU-R BT.601)
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Universal human skin chromaticity range across diverse skin tones
      const isSkin =
        Cb >= 77 &&
        Cb <= 128 &&
        Cr >= 132 &&
        Cr <= 175 &&
        r > g &&
        r > b &&
        r > 40 &&
        Y > 30;

      const inCenter =
        x >= minCenterX &&
        x <= maxCenterX &&
        y >= minCenterY &&
        y <= maxCenterY;

      if (inCenter) {
        centerTotalPixels++;
        centerLuminances.push(Y);
        centerLumSum += Y;
        if (isSkin) centerSkinPixels++;
      } else {
        outerTotalPixels++;
        if (isSkin) outerSkinPixels++;
      }
    }
  }

  const centerSkinRatio = centerSkinPixels / Math.max(1, centerTotalPixels);
  const outerSkinRatio = outerSkinPixels / Math.max(1, outerTotalPixels);

  // Require center skin ratio between 0.22 and 0.78 AND centered > outer * 1.25
  if (
    centerSkinRatio < 0.22 ||
    centerSkinRatio > 0.78 ||
    centerSkinRatio <= outerSkinRatio * 1.25
  ) {
    return {
      isValidFace: false,
      confidence: 0.15,
      message:
        'No centered human face detected. Please ensure your face is clearly centered in frame (not furniture, objects, or background).',
    };
  }

  // 3. Bilateral Eye/Brow Feature Check
  const centerAvgLum = centerLumSum / Math.max(1, centerTotalPixels);

  // Sample left eye box (x: 30%..46%, y: 30%..48%)
  const minLeftEyeX = Math.floor(targetSize * 0.30);
  const maxLeftEyeX = Math.floor(targetSize * 0.46);
  // Sample right eye box (x: 54%..70%, y: 30%..48%)
  const minRightEyeX = Math.floor(targetSize * 0.54);
  const maxRightEyeX = Math.floor(targetSize * 0.70);
  const minEyeY = Math.floor(targetSize * 0.30);
  const maxEyeY = Math.floor(targetSize * 0.48);

  const leftEyeLums: number[] = [];
  let leftDarkCount = 0;
  const rightEyeLums: number[] = [];
  let rightDarkCount = 0;

  const darkFeatureThreshold = centerAvgLum * 0.72;

  for (let y = minEyeY; y <= maxEyeY; y++) {
    for (let x = minLeftEyeX; x <= maxLeftEyeX; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      leftEyeLums.push(Y);
      if (Y < darkFeatureThreshold) {
        leftDarkCount++;
      }
    }
    for (let x = minRightEyeX; x <= maxRightEyeX; x++) {
      const idx = (y * targetSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      rightEyeLums.push(Y);
      if (Y < darkFeatureThreshold) {
        rightDarkCount++;
      }
    }
  }

  const leftEyeLum =
    leftEyeLums.reduce((acc, val) => acc + val, 0) / Math.max(1, leftEyeLums.length);
  const rightEyeLum =
    rightEyeLums.reduce((acc, val) => acc + val, 0) / Math.max(1, rightEyeLums.length);

  const leftEyeVar =
    leftEyeLums.reduce((acc, val) => acc + Math.pow(val - leftEyeLum, 2), 0) /
    Math.max(1, leftEyeLums.length);
  const leftEyeStdDev = Math.sqrt(leftEyeVar);

  const rightEyeVar =
    rightEyeLums.reduce((acc, val) => acc + Math.pow(val - rightEyeLum, 2), 0) /
    Math.max(1, rightEyeLums.length);
  const rightEyeStdDev = Math.sqrt(rightEyeVar);

  const minRequiredDarkPixels = Math.max(2, Math.floor(leftEyeLums.length * 0.02));

  if (
    leftDarkCount < minRequiredDarkPixels ||
    rightDarkCount < minRequiredDarkPixels ||
    Math.abs(leftEyeLum - rightEyeLum) >= 32 ||
    leftEyeStdDev <= 14 ||
    rightEyeStdDev <= 14
  ) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message:
        'Could not detect bilateral facial features (eyes and eyebrows). Please look directly at the camera with clear lighting.',
    };
  }

  // 4. Organic Texture Variance Check across Center Region
  const centerVar =
    centerLuminances.reduce((acc, val) => acc + Math.pow(val - centerAvgLum, 2), 0) /
    Math.max(1, centerLuminances.length);
  const centerLumStdDev = Math.sqrt(centerVar);

  if (centerLumStdDev < 18) {
    return {
      isValidFace: false,
      confidence: 0.2,
      message:
        'Image lacks natural facial texture. Please upload a real camera photo of your face (not flat artwork or solid objects).',
    };
  }

  return {
    isValidFace: true,
    confidence: Math.min(0.96, Math.max(0.75, 0.5 + centerSkinRatio * 0.5)),
    message: 'Human face verified successfully.',
  };
}
