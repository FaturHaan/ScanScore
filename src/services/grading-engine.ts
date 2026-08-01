/**
 * Grading Engine
 * 
 * Compares detected answers against the answer key,
 * calculates scores, and generates detailed results.
 */

import { DetectionResult, GradingConfig, DEFAULT_GRADING_CONFIG } from '../types/answer';
import { GradingResult, QuestionResult, ClassSummary, QuestionAnalysis, ScoreRange } from '../types/result';

/**
 * Grade a set of detected answers against an answer key.
 */
export function gradeAnswers(
  detected: DetectionResult[],
  answerKey: Record<number, string>,
  config: Partial<GradingConfig> = {},
  metadata: {
    studentName?: string;
    studentNumber?: string;
    answerKeyId: string;
    templateId: string;
    scanImagePath: string;
    processedImagePath?: string;
  }
): GradingResult {
  const gradingConfig = { ...DEFAULT_GRADING_CONFIG, ...config };

  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  let ambiguousCount = 0;
  const details: QuestionResult[] = [];

  for (const det of detected) {
    const correctAnswer = answerKey[det.questionNumber];
    if (!correctAnswer) continue; // Skip if no answer key for this question

    const isCorrect = det.selectedOption === correctAnswer;
    const needsReview = det.isAmbiguous || det.confidence < 0.5;

    if (det.selectedOption === null) {
      blankCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
    }

    if (det.isAmbiguous) ambiguousCount++;

    details.push({
      questionNumber: det.questionNumber,
      correctAnswer,
      detectedAnswer: det.selectedOption,
      isCorrect,
      confidence: det.confidence,
      needsReview,
    });
  }

  const rawScore =
    correctCount * gradingConfig.correctScore -
    wrongCount * gradingConfig.wrongPenalty +
    blankCount * gradingConfig.blankScore;

  const maxRawScore = detected.length * gradingConfig.correctScore;
  const finalScore = maxRawScore > 0
    ? Math.max(0, Math.round((rawScore / maxRawScore) * gradingConfig.totalMaxScore * 100) / 100)
    : 0;

  const id = generateId();
  const now = Date.now();

  return {
    id,
    studentName: metadata.studentName || '',
    studentNumber: metadata.studentNumber || '',
    answerKeyId: metadata.answerKeyId,
    templateId: metadata.templateId,
    totalQuestions: detected.length,
    correctCount,
    wrongCount,
    blankCount,
    ambiguousCount,
    rawScore,
    finalScore,
    details,
    scanImagePath: metadata.scanImagePath,
    processedImagePath: metadata.processedImagePath || null,
    needsReview: ambiguousCount > 0 || details.some(d => d.needsReview),
    isReviewed: false,
    reviewedAnswers: null,
    scannedAt: now,
    reviewedAt: null,
  };
}

/**
 * Re-grade results after manual review/corrections.
 */
export function regradeWithCorrections(
  originalResult: GradingResult,
  corrections: Record<number, string>,
  answerKey: Record<number, string>,
  config: Partial<GradingConfig> = {}
): GradingResult {
  const gradingConfig = { ...DEFAULT_GRADING_CONFIG, ...config };

  // Merge corrections into detected answers
  const correctedDetails: QuestionResult[] = originalResult.details.map(detail => {
    const correctedAnswer = corrections[detail.questionNumber] ?? detail.detectedAnswer;
    const isCorrect = correctedAnswer === detail.correctAnswer;

    return {
      ...detail,
      detectedAnswer: correctedAnswer,
      isCorrect,
      needsReview: false,
    };
  });

  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;

  for (const d of correctedDetails) {
    if (d.detectedAnswer === null) blankCount++;
    else if (d.isCorrect) correctCount++;
    else wrongCount++;
  }

  const rawScore =
    correctCount * gradingConfig.correctScore -
    wrongCount * gradingConfig.wrongPenalty +
    blankCount * gradingConfig.blankScore;

  const maxRawScore = correctedDetails.length * gradingConfig.correctScore;
  const finalScore = maxRawScore > 0
    ? Math.max(0, Math.round((rawScore / maxRawScore) * gradingConfig.totalMaxScore * 100) / 100)
    : 0;

  return {
    ...originalResult,
    correctCount,
    wrongCount,
    blankCount,
    ambiguousCount: 0,
    rawScore,
    finalScore,
    details: correctedDetails,
    needsReview: false,
    isReviewed: true,
    reviewedAnswers: corrections,
    reviewedAt: Date.now(),
  };
}

/**
 * Generate a class summary from multiple grading results.
 */
export function generateClassSummary(
  results: GradingResult[],
  answerKeyName: string,
  subject: string,
  totalQuestions: number,
  optionsPerQuestion: number
): ClassSummary {
  if (results.length === 0) {
    return {
      answerKeyId: '',
      answerKeyName,
      subject,
      totalStudents: 0,
      averageScore: 0,
      medianScore: 0,
      highestScore: 0,
      lowestScore: 0,
      standardDeviation: 0,
      distribution: generateEmptyDistribution(),
      questionAnalysis: [],
      results: [],
    };
  }

  const scores = results.map(r => r.finalScore);
  const sortedScores = [...scores].sort((a, b) => a - b);

  const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const median = sortedScores.length % 2 === 0
    ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
    : sortedScores[Math.floor(sortedScores.length / 2)];
  const highest = sortedScores[sortedScores.length - 1];
  const lowest = sortedScores[0];

  // Standard deviation
  const variance = scores.reduce((sum, s) => sum + (s - average) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Score distribution
  const distribution = generateDistribution(scores);

  // Per-question analysis
  const questionAnalysis = analyzeQuestions(results, totalQuestions, optionsPerQuestion);

  return {
    answerKeyId: results[0].answerKeyId,
    answerKeyName,
    subject,
    totalStudents: results.length,
    averageScore: Math.round(average * 100) / 100,
    medianScore: Math.round(median * 100) / 100,
    highestScore: highest,
    lowestScore: lowest,
    standardDeviation: Math.round(stdDev * 100) / 100,
    distribution,
    questionAnalysis,
    results,
  };
}

// ---- Helper Functions ----

function generateDistribution(scores: number[]): ScoreRange[] {
  const ranges: ScoreRange[] = [
    { label: '90-100', min: 90, max: 100, count: 0 },
    { label: '80-89', min: 80, max: 89, count: 0 },
    { label: '70-79', min: 70, max: 79, count: 0 },
    { label: '60-69', min: 60, max: 69, count: 0 },
    { label: '50-59', min: 50, max: 59, count: 0 },
    { label: '40-49', min: 40, max: 49, count: 0 },
    { label: '0-39', min: 0, max: 39, count: 0 },
  ];

  for (const score of scores) {
    for (const range of ranges) {
      if (score >= range.min && score <= range.max) {
        range.count++;
        break;
      }
    }
  }

  return ranges;
}

function generateEmptyDistribution(): ScoreRange[] {
  return generateDistribution([]);
}

function analyzeQuestions(
  results: GradingResult[],
  totalQuestions: number,
  optionsPerQuestion: number
): QuestionAnalysis[] {
  const analysis: QuestionAnalysis[] = [];
  const optionLabels = 'ABCDE'.slice(0, optionsPerQuestion).split('');

  for (let q = 1; q <= totalQuestions; q++) {
    const optionDist: Record<string, number> = {};
    for (const opt of optionLabels) {
      optionDist[opt] = 0;
    }
    optionDist['blank'] = 0;

    let correctCount = 0;
    let correctAnswer = '';

    for (const result of results) {
      const detail = result.details.find(d => d.questionNumber === q);
      if (!detail) continue;

      correctAnswer = detail.correctAnswer;

      if (detail.detectedAnswer === null) {
        optionDist['blank']++;
      } else {
        optionDist[detail.detectedAnswer] = (optionDist[detail.detectedAnswer] || 0) + 1;
      }

      if (detail.isCorrect) correctCount++;
    }

    const correctPercentage = results.length > 0
      ? Math.round((correctCount / results.length) * 100)
      : 0;

    let difficulty: 'easy' | 'medium' | 'hard';
    if (correctPercentage >= 70) difficulty = 'easy';
    else if (correctPercentage >= 40) difficulty = 'medium';
    else difficulty = 'hard';

    analysis.push({
      questionNumber: q,
      correctAnswer,
      correctPercentage,
      optionDistribution: optionDist,
      difficulty,
    });
  }

  return analysis;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
