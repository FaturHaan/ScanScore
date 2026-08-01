/**
 * Image Preprocessor Module
 * 
 * Handles all pre-processing steps before answer detection:
 * 1. Grayscale conversion
 * 2. Gaussian blur (noise reduction)
 * 3. Adaptive thresholding (binarization)
 * 4. Morphological operations (clean up)
 * 
 * All operations work on raw pixel arrays (Uint8ClampedArray)
 * without requiring OpenCV WASM.
 */

import { ProcessingOptions, DEFAULT_PROCESSING_OPTIONS } from './types';

/**
 * Simple image representation for processing.
 */
export interface GrayscaleImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface BinaryImage {
  data: Uint8Array;  // 0 or 255 per pixel
  width: number;
  height: number;
}

export interface RGBAImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Run full preprocessing pipeline on an RGBA image.
 */
export function preprocess(
  image: RGBAImage,
  options: Partial<ProcessingOptions> = {}
): BinaryImage {
  const opts = { ...DEFAULT_PROCESSING_OPTIONS, ...options };

  // Step 1: Convert to grayscale
  const gray = toGrayscale(image);

  // Step 2: Gaussian blur
  const blurred = gaussianBlur(gray, opts.blurKernelSize);

  // Step 3: Adaptive threshold (handles shadows & uneven lighting)
  const binary = adaptiveThreshold(
    blurred,
    opts.adaptiveBlockSize,
    opts.adaptiveC
  );

  // Step 4: Morphological close (fill small gaps in marks)
  const cleaned = morphClose(binary, opts.morphKernelSize);

  return cleaned;
}

/**
 * Convert RGBA image to grayscale using luminosity method.
 * Formula: Gray = 0.299R + 0.587G + 0.114B
 */
export function toGrayscale(image: RGBAImage): GrayscaleImage {
  const { data, width, height } = image;
  const gray = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const ri = i * 4;
    gray[i] = Math.round(
      0.299 * data[ri] +
      0.587 * data[ri + 1] +
      0.114 * data[ri + 2]
    );
  }

  return { data: gray, width, height };
}

/**
 * Apply Gaussian blur for noise reduction.
 * Uses a separable 2-pass approach for efficiency.
 */
export function gaussianBlur(
  image: GrayscaleImage,
  kernelSize: number = 5
): GrayscaleImage {
  // Generate 1D Gaussian kernel
  const kernel = generateGaussianKernel(kernelSize);
  const { data, width, height } = image;
  const temp = new Uint8Array(width * height);
  const result = new Uint8Array(width * height);
  const halfK = Math.floor(kernelSize / 2);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;
      for (let k = -halfK; k <= halfK; k++) {
        const sx = Math.min(Math.max(x + k, 0), width - 1);
        const w = kernel[k + halfK];
        sum += data[y * width + sx] * w;
        weightSum += w;
      }
      temp[y * width + x] = Math.round(sum / weightSum);
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;
      for (let k = -halfK; k <= halfK; k++) {
        const sy = Math.min(Math.max(y + k, 0), height - 1);
        const w = kernel[k + halfK];
        sum += temp[sy * width + x] * w;
        weightSum += w;
      }
      result[y * width + x] = Math.round(sum / weightSum);
    }
  }

  return { data: result, width, height };
}

/**
 * Adaptive thresholding using Gaussian-weighted neighborhood mean.
 * Much better than global thresholding for handling shadows and
 * uneven lighting conditions typical of phone camera captures.
 * 
 * For each pixel:
 *   threshold = local_mean - C
 *   output = pixel < threshold ? 255 : 0   (THRESH_BINARY_INV)
 */
export function adaptiveThreshold(
  image: GrayscaleImage,
  blockSize: number = 15,
  C: number = 8
): BinaryImage {
  const { data, width, height } = image;
  
  // Compute integral image for fast local mean calculation
  const integral = computeIntegralImage(data, width, height);
  
  const result = new Uint8Array(width * height);
  const halfBlock = Math.floor(blockSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate local mean using integral image
      const x1 = Math.max(x - halfBlock, 0);
      const y1 = Math.max(y - halfBlock, 0);
      const x2 = Math.min(x + halfBlock, width - 1);
      const y2 = Math.min(y + halfBlock, height - 1);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = getIntegralSum(integral, width, x1, y1, x2, y2);
      const localMean = sum / count;

      // THRESH_BINARY_INV: dark pixels (marks) become white (255)
      result[y * width + x] = data[y * width + x] < (localMean - C) ? 255 : 0;
    }
  }

  return { data: result, width, height };
}

/**
 * Morphological closing operation (dilation then erosion).
 * Closes small gaps in marks (useful for cross marks that have thin lines).
 */
export function morphClose(
  image: BinaryImage,
  kernelSize: number = 3
): BinaryImage {
  const dilated = dilate(image, kernelSize);
  const closed = erode(dilated, kernelSize);
  return closed;
}

/**
 * Morphological dilation — expands white regions.
 */
export function dilate(image: BinaryImage, kernelSize: number = 3): BinaryImage {
  const { data, width, height } = image;
  const result = new Uint8Array(width * height);
  const halfK = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      for (let ky = -halfK; ky <= halfK; ky++) {
        for (let kx = -halfK; kx <= halfK; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            maxVal = Math.max(maxVal, data[ny * width + nx]);
          }
        }
      }
      result[y * width + x] = maxVal;
    }
  }

  return { data: result, width, height };
}

/**
 * Morphological erosion — shrinks white regions.
 */
export function erode(image: BinaryImage, kernelSize: number = 3): BinaryImage {
  const { data, width, height } = image;
  const result = new Uint8Array(width * height);
  const halfK = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 255;
      for (let ky = -halfK; ky <= halfK; ky++) {
        for (let kx = -halfK; kx <= halfK; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            minVal = Math.min(minVal, data[ny * width + nx]);
          }
        }
      }
      result[y * width + x] = minVal;
    }
  }

  return { data: result, width, height };
}

// ---- Helper Functions ----

function generateGaussianKernel(size: number): number[] {
  const sigma = size / 6;
  const kernel: number[] = [];
  const half = Math.floor(size / 2);

  for (let i = -half; i <= half; i++) {
    kernel.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  }

  // Normalize
  const sum = kernel.reduce((a, b) => a + b, 0);
  return kernel.map(v => v / sum);
}

function computeIntegralImage(
  data: Uint8Array,
  width: number,
  height: number
): Float64Array {
  const integral = new Float64Array((width + 1) * (height + 1));
  const w1 = width + 1;

  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    for (let x = 1; x <= width; x++) {
      rowSum += data[(y - 1) * width + (x - 1)];
      integral[y * w1 + x] = integral[(y - 1) * w1 + x] + rowSum;
    }
  }

  return integral;
}

function getIntegralSum(
  integral: Float64Array,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const w1 = width + 1;
  return (
    integral[(y2 + 1) * w1 + (x2 + 1)] -
    integral[y1 * w1 + (x2 + 1)] -
    integral[(y2 + 1) * w1 + x1] +
    integral[y1 * w1 + x1]
  );
}
