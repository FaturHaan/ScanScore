/**
 * Template types for answer sheet configuration.
 * Defines the structure, layout, and marker positions of printed answer sheets.
 */

export interface MarkerPosition {
  /** X position in mm from top-left corner of paper */
  x: number;
  /** Y position in mm from top-left corner of paper */
  y: number;
  /** Marker size in mm (square) */
  size: number;
}

export interface MarkerConfig {
  topLeft: MarkerPosition;
  topRight: MarkerPosition;
  bottomLeft: MarkerPosition;
  bottomRight: MarkerPosition;
}

export interface AnswerGridConfig {
  /** X start position in mm */
  startX: number;
  /** Y start position in mm */
  startY: number;
  /** Width of each option cell in mm */
  cellWidth: number;
  /** Height of each option cell in mm */
  cellHeight: number;
  /** Gap between columns in mm */
  columnGap: number;
  /** Number label column width in mm */
  numberColumnWidth: number;
}

export type PaperSize = 'A4' | 'F4';

export interface PaperDimensions {
  width: number;   // mm
  height: number;  // mm
}

export const PAPER_DIMENSIONS: Record<PaperSize, PaperDimensions> = {
  A4: { width: 210, height: 297 },
  F4: { width: 215.9, height: 330.2 },
};

export interface AnswerSheetTemplate {
  id: string;
  name: string;
  /** Total number of questions (10-50) */
  totalQuestions: number;
  /** Options per question: 4 (A-D) or 5 (A-E) */
  optionsPerQuestion: 4 | 5;
  /** Number of answer columns on the sheet */
  columns: 1 | 2;
  paperSize: PaperSize;
  markers: MarkerConfig;
  answerGrid: AnswerGridConfig;
  createdAt: number;  // Unix timestamp ms
  updatedAt: number;
}

/**
 * Default template configurations for common use cases.
 */
export const DEFAULT_MARKER_CONFIG: MarkerConfig = {
  topLeft: { x: 10, y: 10, size: 10 },
  topRight: { x: 190, y: 10, size: 10 },
  bottomLeft: { x: 10, y: 277, size: 10 },
  bottomRight: { x: 190, y: 277, size: 10 },
};

export const DEFAULT_GRID_CONFIG: AnswerGridConfig = {
  startX: 25,
  startY: 70,
  cellWidth: 12,
  cellHeight: 8,
  columnGap: 20,
  numberColumnWidth: 10,
};
