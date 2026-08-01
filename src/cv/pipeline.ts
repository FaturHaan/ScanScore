/**
 * CV Pipeline Orchestrator
 * 
 * Runs the complete computer vision pipeline:
 * Raw Image → Preprocessing → Marker Detection → Perspective Transform
 * → ROI Extraction → Mark Recognition → Detection Results
 */

import { AnswerSheetTemplate, PAPER_DIMENSIONS } from '../types/template';
import { DetectionResult } from '../types/answer';
import { PipelineResult, ProcessingOptions, DEFAULT_PROCESSING_OPTIONS } from './types';
import { RGBAImage, BinaryImage, preprocess, toGrayscale, adaptiveThreshold } from './preprocessor';
import { detectMarkers, perspectiveTransform } from './perspective';
import { extractROIs, getOutputDimensions, mmToPixels } from './roi-detector';
import { recognizeMarks } from './mark-recognizer';

/**
 * Process a single answer sheet image through the full pipeline.
 * 
 * @param imageData RGBA image data from the camera
 * @param template Template configuration for grid layout
 * @param options Processing options (thresholds, etc.)
 * @returns Pipeline result with detected answers
 */
export async function processAnswerSheet(
  imageData: RGBAImage,
  template: AnswerSheetTemplate,
  options: Partial<ProcessingOptions> = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_PROCESSING_OPTIONS, ...options };

  try {
    console.log('[Pipeline] Starting answer sheet processing...');
    console.log(`[Pipeline] Image: ${imageData.width}×${imageData.height}`);

    // Step 1: Preprocess the image for marker detection
    console.log('[Pipeline] Step 1: Preprocessing...');
    const binaryForMarkers = preprocess(imageData, opts);

    // Step 2: Detect corner markers
    console.log('[Pipeline] Step 2: Detecting markers...');
    const markers = detectMarkers(binaryForMarkers, opts);

    if (!markers || markers.length < 4) {
      return {
        success: false,
        detections: [],
        warpedImageBase64: null,
        overlayImageBase64: null,
        error: 'Tidak dapat mendeteksi 4 titik referensi (marker) di sudut kertas. ' +
               'Pastikan seluruh kertas terlihat dengan jelas di kamera.',
        processingTimeMs: Date.now() - startTime,
        markersDetected: false,
      };
    }

    console.log('[Pipeline] Found 4 markers ✓');

    // Step 3: Perspective transform
    console.log('[Pipeline] Step 3: Perspective transform...');
    const outputDims = getOutputDimensions(template);
    const srcPoints = markers.map(m => m.center);

    const warpedRGBA = perspectiveTransform(
      imageData,
      srcPoints,
      outputDims.width,
      outputDims.height
    );

    // Step 4: Preprocess warped image for mark detection
    console.log('[Pipeline] Step 4: Processing warped image...');
    const warpedBinary = preprocess(warpedRGBA, {
      ...opts,
      // Slightly different thresholds for mark detection on flat image
      adaptiveBlockSize: 11,
      adaptiveC: 6,
    });

    // Step 5: Extract ROIs
    console.log('[Pipeline] Step 5: Extracting ROIs...');
    const rois = extractROIs(warpedBinary, template);
    console.log(`[Pipeline] Extracted ${rois.length} question ROIs`);

    // Step 6: Recognize marks
    console.log('[Pipeline] Step 6: Recognizing marks...');
    const detections = recognizeMarks(warpedBinary, rois, opts);

    // Step 7: Generate result images
    console.log('[Pipeline] Step 7: Generating output images...');
    const warpedImageBase64 = rgbaToBase64(warpedRGBA);
    const overlayImageBase64 = generateOverlayImage(warpedRGBA, rois, detections);

    const processingTime = Date.now() - startTime;
    console.log(`[Pipeline] Complete! ${detections.length} questions processed in ${processingTime}ms`);

    // Log summary
    const answered = detections.filter(d => d.selectedOption !== null).length;
    const ambiguous = detections.filter(d => d.isAmbiguous).length;
    console.log(`[Pipeline] Summary: ${answered} answered, ${detections.length - answered} blank, ${ambiguous} ambiguous`);

    return {
      success: true,
      detections,
      warpedImageBase64,
      overlayImageBase64,
      error: null,
      processingTimeMs: processingTime,
      markersDetected: true,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Pipeline] Error:', errorMessage);

    return {
      success: false,
      detections: [],
      warpedImageBase64: null,
      overlayImageBase64: null,
      error: `Terjadi kesalahan saat memproses gambar: ${errorMessage}`,
      processingTimeMs: Date.now() - startTime,
      markersDetected: false,
    };
  }
}

/**
 * Quick check: Can markers be detected in this image?
 * Used for real-time camera preview feedback.
 * 
 * @param imageData RGBA image (can be lower resolution for speed)
 * @param options Processing options
 * @returns Number of markers detected (0-4)
 */
export function quickMarkerCheck(
  imageData: RGBAImage,
  options: Partial<ProcessingOptions> = {}
): number {
  try {
    const opts = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
    const binary = preprocess(imageData, opts);
    const markers = detectMarkers(binary, opts);
    return markers ? markers.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Convert RGBA image to base64 PNG string for display.
 * In React Native, we'd use a canvas or direct pixel manipulation.
 * This is a simplified version that creates a base64 representation.
 */
function rgbaToBase64(image: RGBAImage): string {
  // In a real implementation, this would use Canvas API or a native module
  // to encode the pixel data as PNG/JPEG.
  // For now, we store raw pixel data as base64 which can be decoded by the app.
  const header = `RGBA:${image.width}:${image.height}:`;
  
  // Convert Uint8ClampedArray to base64
  let binary = '';
  const bytes = new Uint8Array(image.data);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  // Note: In production, use a proper PNG encoder or native image API
  return header + btoa(binary);
}

/**
 * Generate an overlay image showing detection results on the warped image.
 * Draws colored rectangles around each detected answer.
 */
function generateOverlayImage(
  warpedImage: RGBAImage,
  rois: import('../types/answer').CellROI[][],
  detections: DetectionResult[]
): string {
  // Clone the image
  const overlay: RGBAImage = {
    data: new Uint8ClampedArray(warpedImage.data),
    width: warpedImage.width,
    height: warpedImage.height,
  };

  // Draw detection results
  for (let q = 0; q < detections.length; q++) {
    const detection = detections[q];
    const questionROIs = rois[q];

    if (!questionROIs) continue;

    for (const cell of questionROIs) {
      const isSelected = cell.option === detection.selectedOption;
      const { rect } = cell;

      // Choose color based on state
      let r: number, g: number, b: number;
      if (isSelected && detection.isAmbiguous) {
        // Yellow for ambiguous
        r = 255; g = 200; b = 0;
      } else if (isSelected) {
        // Green for confident detection
        r = 0; g = 200; b = 0;
      } else {
        // Skip non-selected options (no overlay)
        continue;
      }

      // Draw rectangle border (3px thick)
      drawRect(overlay, rect.x, rect.y, rect.width, rect.height, r, g, b, 180, 3);
    }
  }

  return rgbaToBase64(overlay);
}

/**
 * Draw a rectangle border on an RGBA image.
 */
function drawRect(
  image: RGBAImage,
  x: number, y: number, w: number, h: number,
  r: number, g: number, b: number, a: number,
  thickness: number
): void {
  const { data, width, height } = image;

  for (let t = 0; t < thickness; t++) {
    // Top & bottom edges
    for (let col = x; col < x + w && col < width; col++) {
      // Top
      const topY = y + t;
      if (topY >= 0 && topY < height && col >= 0) {
        const idx = (topY * width + col) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
      }
      // Bottom
      const botY = y + h - 1 - t;
      if (botY >= 0 && botY < height && col >= 0) {
        const idx = (botY * width + col) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
      }
    }
    // Left & right edges
    for (let row = y; row < y + h && row < height; row++) {
      // Left
      const leftX = x + t;
      if (leftX >= 0 && leftX < width && row >= 0) {
        const idx = (row * width + leftX) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
      }
      // Right
      const rightX = x + w - 1 - t;
      if (rightX >= 0 && rightX < width && row >= 0) {
        const idx = (row * width + rightX) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
      }
    }
  }
}
