/**
 * Perspective Transform Module
 * 
 * Detects corner markers on the answer sheet and applies perspective
 * correction to produce a flat, aligned image for answer detection.
 * 
 * Steps:
 * 1. Find contours in binary image
 * 2. Filter for square-like contours (markers)
 * 3. Select the best 4 corners
 * 4. Order them: TL, TR, BR, BL
 * 5. Compute and apply perspective transform
 */

import { Point, MarkerInfo, ProcessingOptions, DEFAULT_PROCESSING_OPTIONS } from './types';
import { BinaryImage, GrayscaleImage, RGBAImage, toGrayscale, adaptiveThreshold } from './preprocessor';

export interface ContourInfo {
  points: Point[];
  center: Point;
  area: number;
  boundingRect: { x: number; y: number; width: number; height: number };
  aspectRatio: number;
  vertexCount: number;
}

/**
 * Detect the 4 corner markers from a binary image.
 * Returns ordered markers: [topLeft, topRight, bottomRight, bottomLeft]
 */
export function detectMarkers(
  binaryImage: BinaryImage,
  options: Partial<ProcessingOptions> = {}
): MarkerInfo[] | null {
  const opts = { ...DEFAULT_PROCESSING_OPTIONS, ...options };

  // Step 1: Find all contours
  const contours = findContours(binaryImage);

  // Step 2: Filter for square-like contours with appropriate area
  const candidates: ContourInfo[] = contours.filter(c => {
    // Must have ~4 vertices when approximated
    if (c.vertexCount < 4 || c.vertexCount > 8) return false;
    // Area within expected range
    if (c.area < opts.minMarkerArea || c.area > opts.maxMarkerArea) return false;
    // Aspect ratio close to 1:1 (square)
    if (c.aspectRatio < 0.7 || c.aspectRatio > 1.3) return false;
    return true;
  });

  if (candidates.length < 4) {
    console.warn(`[Perspective] Only found ${candidates.length} marker candidates, need 4`);
    return null;
  }

  // Step 3: Select the 4 best corners
  const corners = selectBestFourCorners(candidates, binaryImage.width, binaryImage.height);

  if (!corners) {
    console.warn('[Perspective] Could not identify 4 distinct corners');
    return null;
  }

  // Step 4: Order markers: TL, TR, BR, BL
  const ordered = orderPoints(corners);

  return ordered.map((c, i) => ({
    center: c.center,
    area: c.area,
    contourIndex: i,
  }));
}

/**
 * Find contours in a binary image using border tracing.
 * Simplified contour detection that finds external contours only.
 */
export function findContours(image: BinaryImage): ContourInfo[] {
  const { data, width, height } = image;
  const visited = new Uint8Array(width * height);
  const contours: ContourInfo[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (data[idx] === 255 && !visited[idx]) {
        // Found a white pixel, trace the contour
        const contour = traceContour(data, width, height, x, y, visited);
        if (contour.length >= 4) {
          const info = analyzeContour(contour);
          if (info.area > 50) { // Minimum area filter
            contours.push(info);
          }
        }
        // Flood fill to mark all pixels in this blob as visited
        floodFillMark(data, width, height, x, y, visited);
      }
    }
  }

  return contours;
}

/**
 * Trace contour border using Moore neighborhood tracing algorithm.
 */
function traceContour(
  data: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Uint8Array
): Point[] {
  const points: Point[] = [];
  // 8-connected directions: right, down-right, down, down-left, left, up-left, up, up-right
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  let cx = startX;
  let cy = startY;
  let dir = 0; // Start looking right
  let startDir = dir;
  let firstPoint = true;
  const maxSteps = width * height; // Safety limit
  let steps = 0;

  do {
    points.push({ x: cx, y: cy });
    visited[cy * width + cx] = 1;

    // Find next border pixel
    let found = false;
    const searchStart = (dir + 6) % 8; // Start searching from backtrack - 2

    for (let i = 0; i < 8; i++) {
      const d = (searchStart + i) % 8;
      const nx = cx + dx[d];
      const ny = cy + dy[d];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && data[ny * width + nx] === 255) {
        cx = nx;
        cy = ny;
        dir = d;
        found = true;
        break;
      }
    }

    if (!found) break;

    steps++;
    if (steps > maxSteps) break;

    if (firstPoint) {
      firstPoint = false;
      startDir = dir;
    }
  } while (cx !== startX || cy !== startY);

  return points;
}

/**
 * Flood fill to mark all connected white pixels as visited.
 */
function floodFillMark(
  data: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Uint8Array
): void {
  const stack: [number, number][] = [[startX, startY]];
  const maxPixels = 100000; // Safety limit
  let count = 0;

  while (stack.length > 0 && count < maxPixels) {
    const [x, y] = stack.pop()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] || data[idx] !== 255) continue;

    visited[idx] = 1;
    count++;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

/**
 * Analyze a contour to extract its properties.
 */
function analyzeContour(points: Point[]): ContourInfo {
  // Bounding rectangle
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    sumX += p.x;
    sumY += p.y;
  }

  const boundingRect = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  // Center (centroid)
  const center: Point = {
    x: sumX / points.length,
    y: sumY / points.length,
  };

  // Area using Shoelace formula
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  area = Math.abs(area) / 2;

  // Approximate polygon vertex count (Douglas-Peucker simplification)
  const perimeter = calculatePerimeter(points);
  const simplified = douglasPeucker(points, 0.04 * perimeter);

  return {
    points,
    center,
    area,
    boundingRect,
    aspectRatio: boundingRect.width / Math.max(boundingRect.height, 1),
    vertexCount: simplified.length,
  };
}

/**
 * Calculate perimeter of a polygon.
 */
function calculatePerimeter(points: Point[]): number {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

/**
 * Douglas-Peucker polygon simplification.
 */
function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  // Find the point farthest from the line between first and last
  let maxDist = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = pointToLineDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

/**
 * Perpendicular distance from a point to a line defined by two points.
 */
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / len;
}

/**
 * Select the 4 contours closest to the image corners.
 */
function selectBestFourCorners(
  candidates: ContourInfo[],
  imageWidth: number,
  imageHeight: number
): ContourInfo[] | null {
  const corners: Point[] = [
    { x: 0, y: 0 },                          // Top-left
    { x: imageWidth, y: 0 },                  // Top-right
    { x: imageWidth, y: imageHeight },          // Bottom-right
    { x: 0, y: imageHeight },                   // Bottom-left
  ];

  const selected: ContourInfo[] = [];
  const used = new Set<number>();

  for (const corner of corners) {
    let bestDist = Infinity;
    let bestIdx = -1;

    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue;
      const dist = distance(candidates[i].center, corner);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) return null;

    // Check that the marker is within a reasonable distance from the corner
    // (within 30% of the image diagonal)
    const maxDist = Math.sqrt(imageWidth * imageWidth + imageHeight * imageHeight) * 0.3;
    if (bestDist > maxDist) return null;

    selected.push(candidates[bestIdx]);
    used.add(bestIdx);
  }

  return selected;
}

/**
 * Order 4 points as: [topLeft, topRight, bottomRight, bottomLeft]
 */
function orderPoints(contours: ContourInfo[]): ContourInfo[] {
  const centers = contours.map(c => c.center);

  // Sum of x+y: smallest = top-left, largest = bottom-right
  // Diff of x-y: smallest = bottom-left, largest = top-right
  const sums = centers.map(p => p.x + p.y);
  const diffs = centers.map(p => p.x - p.y);

  const tlIdx = sums.indexOf(Math.min(...sums));
  const brIdx = sums.indexOf(Math.max(...sums));
  const trIdx = diffs.indexOf(Math.max(...diffs));
  const blIdx = diffs.indexOf(Math.min(...diffs));

  return [contours[tlIdx], contours[trIdx], contours[brIdx], contours[blIdx]];
}

/**
 * Apply perspective transform to warp the image to a flat rectangle.
 * Uses bilinear interpolation for smooth results.
 * 
 * @param image Source RGBA image
 * @param srcPoints 4 source points [TL, TR, BR, BL] in the original image
 * @param dstWidth Desired output width in pixels
 * @param dstHeight Desired output height in pixels
 */
export function perspectiveTransform(
  image: RGBAImage,
  srcPoints: Point[],
  dstWidth: number,
  dstHeight: number
): RGBAImage {
  // Compute the 3x3 perspective transform matrix
  const matrix = computePerspectiveMatrix(
    srcPoints,
    [
      { x: 0, y: 0 },
      { x: dstWidth, y: 0 },
      { x: dstWidth, y: dstHeight },
      { x: 0, y: dstHeight },
    ]
  );

  // Invert the matrix for backward mapping
  const invMatrix = invertMatrix3x3(matrix);
  if (!invMatrix) {
    throw new Error('Failed to compute inverse perspective matrix');
  }

  // Apply the transform with bilinear interpolation
  const result = new Uint8ClampedArray(dstWidth * dstHeight * 4);

  for (let dy = 0; dy < dstHeight; dy++) {
    for (let dx = 0; dx < dstWidth; dx++) {
      // Map destination pixel back to source coordinates
      const w = invMatrix[6] * dx + invMatrix[7] * dy + invMatrix[8];
      const sx = (invMatrix[0] * dx + invMatrix[1] * dy + invMatrix[2]) / w;
      const sy = (invMatrix[3] * dx + invMatrix[4] * dy + invMatrix[5]) / w;

      // Bilinear interpolation
      const dstIdx = (dy * dstWidth + dx) * 4;

      if (sx >= 0 && sx < image.width - 1 && sy >= 0 && sy < image.height - 1) {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const fx = sx - x0;
        const fy = sy - y0;

        for (let c = 0; c < 4; c++) {
          const v00 = image.data[(y0 * image.width + x0) * 4 + c];
          const v10 = image.data[(y0 * image.width + (x0 + 1)) * 4 + c];
          const v01 = image.data[((y0 + 1) * image.width + x0) * 4 + c];
          const v11 = image.data[((y0 + 1) * image.width + (x0 + 1)) * 4 + c];

          result[dstIdx + c] = Math.round(
            v00 * (1 - fx) * (1 - fy) +
            v10 * fx * (1 - fy) +
            v01 * (1 - fx) * fy +
            v11 * fx * fy
          );
        }
      } else {
        // Out of bounds — fill with white
        result[dstIdx] = 255;
        result[dstIdx + 1] = 255;
        result[dstIdx + 2] = 255;
        result[dstIdx + 3] = 255;
      }
    }
  }

  return { data: result, width: dstWidth, height: dstHeight };
}

/**
 * Compute 3x3 perspective transform matrix from 4 point correspondences.
 * Uses the Direct Linear Transform (DLT) approach.
 */
function computePerspectiveMatrix(src: Point[], dst: Point[]): number[] {
  // Set up the 8x8 system of linear equations
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x, sy = src[i].y;
    const dx = dst[i].x, dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Solve using Gaussian elimination
  const h = solveLinearSystem(A, b);
  if (!h) {
    throw new Error('Failed to solve perspective transform');
  }

  // Return as 3x3 matrix in row-major order
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/**
 * Solve Ax = b using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // Augmented matrix
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-10) return null; // Singular

    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    x[row] = aug[row][n];
    for (let col = row + 1; col < n; col++) {
      x[row] -= aug[row][col] * x[col];
    }
    x[row] /= aug[row][row];
  }

  return x;
}

/**
 * Invert a 3x3 matrix.
 */
function invertMatrix3x3(m: number[]): number[] | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

  if (Math.abs(det) < 1e-10) return null;

  const invDet = 1 / det;

  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet,
  ];
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
