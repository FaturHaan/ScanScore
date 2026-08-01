/**
 * Answer-related types including answer keys, detection results,
 * and cell ROI (Region of Interest) definitions.
 */

export interface AnswerKey {
  id: string;
  templateId: string;
  name: string;           // e.g., "UTS Matematika Kelas 8"
  subject: string;        // e.g., "Matematika"
  /** Answer map: question number → correct option letter */
  answers: Record<number, string>;
  gradingConfig: GradingConfig;
  createdAt: number;      // Unix timestamp ms
}

export interface GradingConfig {
  /** Points for each correct answer (default: 1) */
  correctScore: number;
  /** Points deducted for each wrong answer (default: 0) */
  wrongPenalty: number;
  /** Points for blank/unanswered (default: 0) */
  blankScore: number;
  /** Maximum final score (default: 100) */
  totalMaxScore: number;
}

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  correctScore: 1,
  wrongPenalty: 0,
  blankScore: 0,
  totalMaxScore: 100,
};

/**
 * Represents a single cell (option) in the answer grid ROI.
 */
export interface CellROI {
  questionNumber: number;
  /** Option letter: A, B, C, D, or E */
  option: string;
  /** Bounding rect in pixels (on the warped image) */
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Result of mark detection for a single question.
 */
export interface DetectionResult {
  questionNumber: number;
  /** Detected answer: "A", "B", etc. or null if blank */
  selectedOption: string | null;
  /** Confidence score 0.0 - 1.0 */
  confidence: number;
  /** True if multiple options appear selected */
  isAmbiguous: boolean;
  /** Score for each option */
  allScores: Record<string, number>;
  /** Which detection method was used */
  detectionMethod: 'density' | 'cross' | 'combined';
}

export type DetectionMethod = 'density' | 'cross' | 'combined';
