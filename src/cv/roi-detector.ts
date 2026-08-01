/**
 * ROI (Region of Interest) Detector Module
 * 
 * Maps template grid coordinates to pixel coordinates on the warped image,
 * then extracts individual cell images for each answer option.
 */

import { AnswerSheetTemplate, PAPER_DIMENSIONS } from '../types/template';
import { CellROI } from '../types/answer';
import { BinaryImage } from './preprocessor';

/** Conversion factor: mm to pixels based on output resolution */
const DPI = 150; // 150 DPI output resolution
const MM_TO_PIXELS = DPI / 25.4; // 25.4 mm per inch

/**
 * Convert millimeters to pixels at the configured DPI.
 */
export function mmToPixels(mm: number): number {
  return Math.round(mm * MM_TO_PIXELS);
}

/**
 * Get the pixel dimensions for the warped output image
 * based on paper size.
 */
export function getOutputDimensions(template: AnswerSheetTemplate): { width: number; height: number } {
  const paperDims = PAPER_DIMENSIONS[template.paperSize];
  return {
    width: mmToPixels(paperDims.width),
    height: mmToPixels(paperDims.height),
  };
}

/**
 * Extract all ROI cells from the warped binary image.
 * Returns a 2D array: [question][option]
 * 
 * @param warpedImage The perspective-corrected binary image
 * @param template The template configuration defining grid layout
 */
export function extractROIs(
  warpedImage: BinaryImage,
  template: AnswerSheetTemplate
): CellROI[][] {
  const { answerGrid, totalQuestions, optionsPerQuestion, columns } = template;
  const rois: CellROI[][] = [];

  const questionsPerColumn = Math.ceil(totalQuestions / columns);

  // Option labels
  const optionLabels = 'ABCDE'.slice(0, optionsPerQuestion).split('');

  for (let q = 0; q < totalQuestions; q++) {
    const col = Math.floor(q / questionsPerColumn);
    const row = q % questionsPerColumn;

    const questionROIs: CellROI[] = [];

    for (let optIdx = 0; optIdx < optionsPerQuestion; optIdx++) {
      // Calculate position in mm
      const columnOffsetX = col * (
        answerGrid.numberColumnWidth +
        optionsPerQuestion * answerGrid.cellWidth +
        answerGrid.columnGap
      );

      const cellX = answerGrid.startX + columnOffsetX +
        answerGrid.numberColumnWidth +
        optIdx * answerGrid.cellWidth;
      const cellY = answerGrid.startY + row * answerGrid.cellHeight;

      // Convert to pixels
      const pixelX = mmToPixels(cellX);
      const pixelY = mmToPixels(cellY);
      const pixelW = mmToPixels(answerGrid.cellWidth);
      const pixelH = mmToPixels(answerGrid.cellHeight);

      // Clamp to image bounds
      const clampedX = Math.max(0, Math.min(pixelX, warpedImage.width - 1));
      const clampedY = Math.max(0, Math.min(pixelY, warpedImage.height - 1));
      const clampedW = Math.min(pixelW, warpedImage.width - clampedX);
      const clampedH = Math.min(pixelH, warpedImage.height - clampedY);

      questionROIs.push({
        questionNumber: q + 1,
        option: optionLabels[optIdx],
        rect: {
          x: clampedX,
          y: clampedY,
          width: clampedW,
          height: clampedH,
        },
      });
    }

    rois.push(questionROIs);
  }

  return rois;
}

/**
 * Extract a sub-region from a binary image.
 * Shrinks the ROI by a factor to avoid border lines.
 * 
 * @param image Source binary image
 * @param rect Region to extract
 * @param shrinkFactor How much to shrink (0.8 = keep 80% of center)
 */
export function extractCellImage(
  image: BinaryImage,
  rect: { x: number; y: number; width: number; height: number },
  shrinkFactor: number = 0.75
): BinaryImage {
  // Calculate shrunk dimensions
  const shrinkX = Math.round(rect.width * (1 - shrinkFactor) / 2);
  const shrinkY = Math.round(rect.height * (1 - shrinkFactor) / 2);

  const x = rect.x + shrinkX;
  const y = rect.y + shrinkY;
  const w = rect.width - 2 * shrinkX;
  const h = rect.height - 2 * shrinkY;

  // Safety bounds
  const safeX = Math.max(0, Math.min(x, image.width - 1));
  const safeY = Math.max(0, Math.min(y, image.height - 1));
  const safeW = Math.min(w, image.width - safeX);
  const safeH = Math.min(h, image.height - safeY);

  const cellData = new Uint8Array(safeW * safeH);

  for (let row = 0; row < safeH; row++) {
    for (let col = 0; col < safeW; col++) {
      const srcIdx = (safeY + row) * image.width + (safeX + col);
      cellData[row * safeW + col] = image.data[srcIdx];
    }
  }

  return { data: cellData, width: safeW, height: safeH };
}

/**
 * Count the number of white pixels (value 255) in a binary image.
 * Used for pixel density calculation.
 */
export function countWhitePixels(image: BinaryImage): number {
  let count = 0;
  for (let i = 0; i < image.data.length; i++) {
    if (image.data[i] === 255) count++;
  }
  return count;
}

/**
 * Calculate pixel density (ratio of marked pixels to total pixels).
 */
export function calculatePixelDensity(image: BinaryImage): number {
  const total = image.width * image.height;
  if (total === 0) return 0;
  const white = countWhitePixels(image);
  return white / total;
}

/**
 * Get all ROI coordinates for overlay visualization.
 * Returns pixel coordinates for drawing detection results on the image.
 */
export function getROIOverlayCoords(
  template: AnswerSheetTemplate
): Array<{
  questionNumber: number;
  option: string;
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const { answerGrid, totalQuestions, optionsPerQuestion, columns } = template;
  const coords: Array<{
    questionNumber: number;
    option: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  const questionsPerColumn = Math.ceil(totalQuestions / columns);
  const optionLabels = 'ABCDE'.slice(0, optionsPerQuestion).split('');

  for (let q = 0; q < totalQuestions; q++) {
    const col = Math.floor(q / questionsPerColumn);
    const row = q % questionsPerColumn;

    for (let optIdx = 0; optIdx < optionsPerQuestion; optIdx++) {
      const columnOffsetX = col * (
        answerGrid.numberColumnWidth +
        optionsPerQuestion * answerGrid.cellWidth +
        answerGrid.columnGap
      );

      coords.push({
        questionNumber: q + 1,
        option: optionLabels[optIdx],
        x: mmToPixels(answerGrid.startX + columnOffsetX + answerGrid.numberColumnWidth + optIdx * answerGrid.cellWidth),
        y: mmToPixels(answerGrid.startY + row * answerGrid.cellHeight),
        width: mmToPixels(answerGrid.cellWidth),
        height: mmToPixels(answerGrid.cellHeight),
      });
    }
  }

  return coords;
}
