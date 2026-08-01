/**
 * Mark Recognizer Module
 * 
 * Detects student marks (filled bubbles or cross marks) within each ROI cell.
 * Uses two complementary methods:
 * 1. Pixel Density — ratio of marked pixels to total area
 * 2. Cross Detection — HoughLines-like line detection for X marks
 * 
 * The combined score determines which option was selected.
 */

import { DetectionResult, CellROI } from '../types/answer';
import { ProcessingOptions, DEFAULT_PROCESSING_OPTIONS, Line } from './types';
import { BinaryImage } from './preprocessor';
import { extractCellImage, calculatePixelDensity } from './roi-detector';

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
    const densities: Record<string, number> = {};
    const crossDetected: Record<string, boolean> = {};

    for (const cell of questionROIs) {
      // Extract the cell region from the binary image
      const cellImage = extractCellImage(binaryImage, cell.rect, 0.75);

      // Method 1: Pixel Density
      const density = calculatePixelDensity(cellImage);
      densities[cell.option] = density;

      // Method 2: Cross (X) Detection
      const hasCross = detectCrossPattern(cellImage);
      crossDetected[cell.option] = hasCross;

      // Combined score: density is primary, cross gives a bonus
      const crossBonus = hasCross ? 0.15 : 0;
      scores[cell.option] = density + crossBonus;
    }

    // Determine the selected answer
    const sortedOptions = Object.entries(scores)
      .sort((a, b) => b[1] - a[1]);

    const topScore = sortedOptions[0][1];
    const secondScore = sortedOptions.length > 1 ? sortedOptions[1][1] : 0;

    let selectedOption: string | null = null;
    let isAmbiguous = false;
    let confidence = 0;

    if (topScore < opts.fillThreshold) {
      // No option is sufficiently filled — blank answer
      selectedOption = null;
      confidence = 0;
    } else if (topScore - secondScore < opts.ambiguityMargin) {
      // Two options are too close — ambiguous
      selectedOption = sortedOptions[0][0];
      isAmbiguous = true;
      confidence = Math.min(topScore / 0.6, 1.0) * 0.7; // Reduced confidence
    } else {
      // Clear winner
      selectedOption = sortedOptions[0][0];
      confidence = Math.min(topScore / 0.6, 1.0);
    }

    results.push({
      questionNumber: questionROIs[0].questionNumber,
      selectedOption,
      confidence,
      isAmbiguous,
      allScores: scores,
      detectionMethod: crossDetected[sortedOptions[0][0]] ? 'combined' : 'density',
    });
  }

  return results;
}

/**
 * Detect cross (X) pattern in a binary cell image using line detection.
 * 
 * A cross mark consists of two lines that:
 * 1. Intersect near the center of the cell
 * 2. Have angles approximately 45° and 135° (or within tolerance)
 * 3. Span a significant portion of the cell
 * 
 * Uses a simplified Hough Line Transform approach.
 */
export function detectCrossPattern(image: BinaryImage): boolean {
  const { width, height } = image;
  if (width < 5 || height < 5) return false;

  // Detect lines using a simplified accumulator
  const lines = detectLines(image);
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
 * Simplified line detection using pixel scanning.
 * Detects diagonal lines by checking for continuous runs of white pixels
 * along various angles.
 */
function detectLines(image: BinaryImage): Line[] {
  const { data, width, height } = image;
  const lines: Line[] = [];
  const minLineLength = Math.min(width, height) * 0.3;

  // Check angles: 30°-60° and 120°-150° (typical cross angles)
  const angles = [30, 45, 60, 120, 135, 150];

  for (const angleDeg of angles) {
    const angleRad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);

    // Scan from multiple starting points along the edges
    const starts: Array<{ x: number; y: number }> = [];
    
    // Left edge
    for (let y = 0; y < height; y += 2) {
      starts.push({ x: 0, y });
    }
    // Top edge
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
        const idx = py * width + px;

        // Check 3x3 neighborhood for tolerance
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

  // Deduplicate similar lines
  return deduplicateLines(lines, width, height);
}

/**
 * Get the angle of a line in degrees (0-180).
 */
function getLineAngle(line: Line): number {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 180;
  return angle;
}

/**
 * Normalize angle to 0-180 range.
 */
function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 180;
  while (angle >= 180) angle -= 180;
  return angle;
}

/**
 * Find intersection point of two lines.
 */
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

/**
 * Remove duplicate/similar lines.
 */
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
        // Similar angle — check if close
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
