/**
 * Mark Recognizer Module
 * 
 * Detects student marks (filled bubbles or cross marks) within each ROI cell.
 * Uses two complementary methods:
 * 1. Pixel Density — ratio of marked pixels to total area
 * 2. Shape Detection — Identifies valid marks (circle, cross, diagonal) and invalid (horizontal, scribbles).
 * 
 * Logic for multiple marks:
 * - 0 marks -> Blank
 * - 1 valid mark -> Selected option
 * - >1 valid marks -> Invalid (Wrong)
 * - 0 valid, >0 invalid marks -> Invalid (Wrong)
 */

import { DetectionResult, CellROI } from '../types/answer';
import { ProcessingOptions, DEFAULT_PROCESSING_OPTIONS, Line } from './types';
import { BinaryImage } from './preprocessor';
import { extractCellImage, calculatePixelDensity } from './roi-detector';

type MarkType = 'blank' | 'valid' | 'invalid';

/**
 * Recognize marks for all questions from the extracted ROI cells.
 * 
 * @param binaryImage The warped binary image
 * @param rois 2D array of ROI cells [question][option]
 * @param options Processing options for thresholds
 */
export function recognizeMarks(
  binaryImage: BinaryImage,
  rois: CellROI[][],
  options: Partial<ProcessingOptions> = {}
): DetectionResult[] {
  const opts = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
  const results: DetectionResult[] = [];

  for (const questionROIs of rois) {
    const scores: Record<string, number> = {};
    const classifications: Record<string, MarkType> = {};

    let validCount = 0;
    let invalidCount = 0;
    let lastValidOption: string | null = null;
    let anyMarked = false;

    for (const cell of questionROIs) {
      // Extract the cell region from the binary image
      const cellImage = extractCellImage(binaryImage, cell.rect, 0.75);

      // Method 1: Pixel Density
      const density = calculatePixelDensity(cellImage);
      scores[cell.option] = density;

      // Method 2: Shape Classification
      const classification = classifyCellMark(cellImage, density);
      classifications[cell.option] = classification;

      if (classification === 'valid') {
        validCount++;
        lastValidOption = cell.option;
        anyMarked = true;
      } else if (classification === 'invalid') {
        invalidCount++;
        anyMarked = true;
      }
    }

    let selectedOption: string | null = null;
    let isAmbiguous = false;
    let confidence = 0;

    if (validCount === 0 && invalidCount === 0) {
      // Blank
      selectedOption = null;
      confidence = 0;
    } else if (validCount === 1) {
      // Exactly one valid mark (even if there are other invalid marks, we assume they chose the valid one)
      selectedOption = lastValidOption;
      confidence = Math.min(scores[lastValidOption!] / 0.6, 1.0);
    } else if (validCount > 1) {
      // Multiple valid marks -> ambiguous/wrong
      selectedOption = 'INVALID_MULTIPLE'; // Custom string to force wrong instead of blank
      isAmbiguous = true;
      confidence = 0;
    } else if (validCount === 0 && invalidCount > 0) {
      // Marked, but all invalid -> wrong
      selectedOption = 'INVALID_MARKS';
      isAmbiguous = true;
      confidence = 0;
    }

    results.push({
      questionNumber: questionROIs[0].questionNumber,
      selectedOption,
      confidence,
      isAmbiguous,
      allScores: scores,
      detectionMethod: 'shape',
    });
  }

  return results;
}

/**
 * Classify a cell mark into blank, valid, or invalid based on its shape and density.
 */
function classifyCellMark(cellImage: BinaryImage, density: number): MarkType {
  if (density < 0.05) return 'blank'; // Too little ink

  const lines = detectLines(cellImage, [0, 30, 45, 60, 120, 135, 150, 180]);
  
  let hasHorizontal = false;
  let hasDiagonal = false;
  
  const hasCross = detectCrossPattern(cellImage, lines);
  const hasCircle = detectCirclePattern(cellImage);
  
  for (const line of lines) {
    const angle = getLineAngle(line);
    // Diagonal lines
    if ((angle >= 30 && angle <= 60) || (angle >= 120 && angle <= 150)) {
      hasDiagonal = true;
    }
    // Horizontal lines (close to 0 or 180)
    if (angle <= 15 || angle >= 165) {
      hasHorizontal = true;
    }
  }

  // Rule: Crossed-out circle is invalid
  if (hasCircle && hasCross) return 'invalid';
  
  // Rule: Horizontal line is invalid
  if (hasHorizontal) return 'invalid';

  // Rule: Scribble (high density but no clear shape) is invalid
  const isScribble = density > 0.35 && !hasCross && !hasCircle;
  if (isScribble) return 'invalid';
  
  // Rule: Valid shapes
  if (hasCross || hasCircle || hasDiagonal) return 'valid';
  
  // Rule: Moderate density but no recognized shape -> invalid
  if (density >= 0.1) return 'invalid';
  
  return 'blank';
}

/**
 * Detect cross (X) pattern in a binary cell image using line detection.
 */
export function detectCrossPattern(image: BinaryImage, providedLines?: Line[]): boolean {
  const { width, height } = image;
  if (width < 5 || height < 5) return false;

  const lines = providedLines || detectLines(image, [30, 45, 60, 120, 135, 150]);
  if (lines.length < 2) return false;

  // Look for a pair of lines forming an X
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const angle1 = getLineAngle(lines[i]);
      const angle2 = getLineAngle(lines[j]);
      const angleDiff = Math.abs(normalizeAngle(angle1 - angle2));

      // Angles should differ by roughly 60-120 degrees (ideally 90)
      if (angleDiff > 50 && angleDiff < 130) {
        // Check if they intersect near the center
        const intersection = getLineIntersection(lines[i], lines[j]);
        if (intersection) {
          const centerX = width / 2;
          const centerY = height / 2;
          const distFromCenter = Math.sqrt(
            (intersection.x - centerX) ** 2 +
            (intersection.y - centerY) ** 2
          );
          const maxDist = Math.min(width, height) * 0.4;

          if (distFromCenter < maxDist) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Detect circle pattern.
 * Validates aspect ratio and edge density vs center density.
 */
export function detectCirclePattern(image: BinaryImage): boolean {
  const { width, height, data } = image;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let pixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] === 255) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        pixelCount++;
      }
    }
  }

  if (pixelCount < 10) return false;

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 5 || h < 5) return false;

  const aspectRatio = w / h;
  if (aspectRatio < 0.6 || aspectRatio > 1.6) return false; // Not circular enough

  const cx = minX + w / 2;
  const cy = minY + h / 2;
  const radius = Math.min(w, h) / 2;
  
  let edgePixels = 0;
  let edgeTotal = 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.sqrt((x - cx)**2 + (y - cy)**2);
      // Check the ring area (0.7r to 1.2r)
      if (dist >= radius * 0.7 && dist <= radius * 1.2) {
        edgeTotal++;
        if (data[y * width + x] === 255) edgePixels++;
      }
    }
  }

  const edgeDensity = edgeTotal > 0 ? edgePixels / edgeTotal : 0;
  // A circular mark should have a relatively continuous outer ring
  return edgeDensity > 0.4;
}

/**
 * Simplified line detection using pixel scanning along specified angles.
 */
function detectLines(image: BinaryImage, anglesToScan: number[] = [0, 30, 45, 60, 120, 135, 150, 180]): Line[] {
  const { data, width, height } = image;
  const lines: Line[] = [];
  const minLineLength = Math.min(width, height) * 0.3;

  for (const angleDeg of anglesToScan) {
    const angleRad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);

    const starts: Array<{ x: number; y: number }> = [];
    
    for (let y = 0; y < height; y += 2) {
      starts.push({ x: 0, y });
    }
    for (let x = 0; x < width; x += 2) {
      starts.push({ x, y: 0 });
    }

    for (const start of starts) {
      let { x, y } = start;
      let runLength = 0;
      let startX = x, startY = y;
      let bestLength = 0;
      let bestLine: Line | null = null;

      while (x >= 0 && x < width && y >= 0 && y < height) {
        const px = Math.round(x);
        const py = Math.round(y);

        let found = false;
        for (let ky = -1; ky <= 1 && !found; ky++) {
          for (let kx = -1; kx <= 1 && !found; kx++) {
            const nx = px + kx;
            const ny = py + ky;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (data[ny * width + nx] === 255) {
                found = true;
              }
            }
          }
        }

        if (found) {
          if (runLength === 0) {
            startX = px;
            startY = py;
          }
          runLength++;
        } else {
          if (runLength > bestLength) {
            bestLength = runLength;
            bestLine = { x1: startX, y1: startY, x2: Math.round(x - dx), y2: Math.round(y - dy) };
          }
          runLength = 0;
        }

        x += dx;
        y += dy;
      }

      if (runLength > bestLength) {
        bestLength = runLength;
        bestLine = { x1: startX, y1: startY, x2: Math.round(x - dx), y2: Math.round(y - dy) };
      }

      if (bestLine && bestLength >= minLineLength) {
        lines.push(bestLine);
      }
    }
  }

  return deduplicateLines(lines, width, height);
}

function getLineAngle(line: Line): number {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 180;
  return angle;
}

function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 180;
  while (angle >= 180) angle -= 180;
  return angle;
}

function getLineIntersection(l1: Line, l2: Line): { x: number; y: number } | null {
  const x1 = l1.x1, y1 = l1.y1, x2 = l1.x2, y2 = l1.y2;
  const x3 = l2.x1, y3 = l2.y1, x4 = l2.x2, y4 = l2.y2;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-6) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
  };
}

function deduplicateLines(lines: Line[], width: number, height: number): Line[] {
  if (lines.length <= 1) return lines;

  const result: Line[] = [];
  const used = new Set<number>();
  const tolerance = Math.min(width, height) * 0.15;

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;

    let bestLine = lines[i];
    let bestLength = lineLength(lines[i]);

    for (let j = i + 1; j < lines.length; j++) {
      if (used.has(j)) continue;

      const angleDiff = Math.abs(getLineAngle(lines[i]) - getLineAngle(lines[j]));
      if (angleDiff < 15 || angleDiff > 165) {
        const midI = { x: (lines[i].x1 + lines[i].x2) / 2, y: (lines[i].y1 + lines[i].y2) / 2 };
        const midJ = { x: (lines[j].x1 + lines[j].x2) / 2, y: (lines[j].y1 + lines[j].y2) / 2 };
        const dist = Math.sqrt((midI.x - midJ.x) ** 2 + (midI.y - midJ.y) ** 2);

        if (dist < tolerance) {
          used.add(j);
          const len = lineLength(lines[j]);
          if (len > bestLength) {
            bestLine = lines[j];
            bestLength = len;
          }
        }
      }
    }

    result.push(bestLine);
  }

  return result;
}

function lineLength(line: Line): number {
  return Math.sqrt((line.x2 - line.x1) ** 2 + (line.y2 - line.y1) ** 2);
}
