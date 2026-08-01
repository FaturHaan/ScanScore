/**
 * Result types for grading and scan output.
 */

import { DetectionResult } from './answer';

export interface QuestionResult {
  questionNumber: number;
  correctAnswer: string;
  detectedAnswer: string | null;
  isCorrect: boolean;
  confidence: number;
  /** True if ambiguous or low confidence — needs manual review */
  needsReview: boolean;
}

export interface GradingResult {
  id: string;
  studentName: string;
  studentNumber: string;
  answerKeyId: string;
  templateId: string;

  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  ambiguousCount: number;

  /** Raw score before normalization */
  rawScore: number;
  /** Final score (0 - totalMaxScore) */
  finalScore: number;

  details: QuestionResult[];

  /** Path to the original scanned image */
  scanImagePath: string;
  /** Path to the perspective-corrected image */
  processedImagePath: string | null;

  /** Whether this result has answers that need manual review */
  needsReview: boolean;
  /** Whether manual review has been completed */
  isReviewed: boolean;
  /** Manually corrected answers (if any) */
  reviewedAnswers: Record<number, string> | null;

  scannedAt: number;    // Unix timestamp ms
  reviewedAt: number | null;
}

export interface ClassSummary {
  answerKeyId: string;
  answerKeyName: string;
  subject: string;
  totalStudents: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  standardDeviation: number;
  /** Distribution of scores in ranges */
  distribution: ScoreRange[];
  /** Per-question analysis */
  questionAnalysis: QuestionAnalysis[];
  results: GradingResult[];
}

export interface ScoreRange {
  label: string;   // e.g., "90-100", "80-89"
  min: number;
  max: number;
  count: number;
}

export interface QuestionAnalysis {
  questionNumber: number;
  correctAnswer: string;
  correctPercentage: number;
  /** How many selected each option */
  optionDistribution: Record<string, number>;
  /** Difficulty rating: easy | medium | hard */
  difficulty: 'easy' | 'medium' | 'hard';
}
