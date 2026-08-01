/**
 * Type definitions for OpenCV.js operations.
 * OpenCV.js exposes a subset of OpenCV C++ API via WebAssembly.
 * These types provide minimal typing for the functions we use.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Contour {
  points: Point[];
  area: number;
  perimeter: number;
}

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MarkerInfo {
  center: Point;
  area: number;
  contourIndex: number;
}

export interface ProcessingOptions {
  /** Gaussian blur kernel size (odd number, default 5) */
  blurKernelSize: number;
  /** Adaptive threshold block size (odd number, default 15) */
  adaptiveBlockSize: number;
  /** Adaptive threshold C constant (default 8) */
  adaptiveC: number;
  /** Morphology kernel size (default 3) */
  morphKernelSize: number;
  /** Minimum marker area in pixels (default 500) */
  minMarkerArea: number;
  /** Maximum marker area in pixels (default 50000) */
  maxMarkerArea: number;
  /** Minimum fill ratio to consider an option marked (default 0.25) */
  fillThreshold: number;
  /** Minimum gap between top two options to avoid ambiguity (default 0.10) */
  ambiguityMargin: number;
}

export const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  blurKernelSize: 5,
  adaptiveBlockSize: 15,
  adaptiveC: 8,
  morphKernelSize: 3,
  minMarkerArea: 500,
  maxMarkerArea: 50000,
  fillThreshold: 0.25,
  ambiguityMargin: 0.10,
};

/**
 * Result of the full CV pipeline processing.
 */
export interface PipelineResult {
  success: boolean;
  /** Detected answers per question */
  detections: import('../types/answer').DetectionResult[];
  /** Base64 of the warped (corrected) image */
  warpedImageBase64: string | null;
  /** Base64 with detection overlay drawn */
  overlayImageBase64: string | null;
  /** Error message if failed */
  error: string | null;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Whether all 4 markers were found */
  markersDetected: boolean;
}
