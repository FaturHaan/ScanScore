/**
 * Database Queries
 * 
 * Prepared queries for CRUD operations on templates, answer keys, and results.
 */

import { getDatabase } from './schema';
import { AnswerSheetTemplate } from '../types/template';
import { AnswerKey, GradingConfig } from '../types/answer';
import { GradingResult } from '../types/result';

// ========================
// TEMPLATES
// ========================

export async function insertTemplate(template: AnswerSheetTemplate): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO templates (id, name, total_questions, options_per_question, columns, paper_size, marker_config, grid_config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.id,
      template.name,
      template.totalQuestions,
      template.optionsPerQuestion,
      template.columns,
      template.paperSize,
      JSON.stringify(template.markers),
      JSON.stringify(template.answerGrid),
      template.createdAt,
      template.updatedAt,
    ]
  );
}

export async function getAllTemplates(): Promise<AnswerSheetTemplate[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM templates ORDER BY updated_at DESC'
  );
  return (rows as any[]).map(rowToTemplate);
}

export async function getTemplateById(id: string): Promise<AnswerSheetTemplate | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync(
    'SELECT * FROM templates WHERE id = ?',
    [id]
  );
  return row ? rowToTemplate(row as any) : null;
}

export async function updateTemplate(template: AnswerSheetTemplate): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE templates SET name=?, total_questions=?, options_per_question=?, columns=?, paper_size=?, marker_config=?, grid_config=?, updated_at=?
     WHERE id=?`,
    [
      template.name,
      template.totalQuestions,
      template.optionsPerQuestion,
      template.columns,
      template.paperSize,
      JSON.stringify(template.markers),
      JSON.stringify(template.answerGrid),
      Date.now(),
      template.id,
    ]
  );
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
}

function rowToTemplate(row: any): AnswerSheetTemplate {
  return {
    id: row.id,
    name: row.name,
    totalQuestions: row.total_questions,
    optionsPerQuestion: row.options_per_question,
    columns: row.columns,
    paperSize: row.paper_size,
    markers: JSON.parse(row.marker_config),
    answerGrid: JSON.parse(row.grid_config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ========================
// ANSWER KEYS
// ========================

export async function insertAnswerKey(key: AnswerKey): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO answer_keys (id, template_id, name, subject, answers, grading_config, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      key.id,
      key.templateId,
      key.name,
      key.subject,
      JSON.stringify(key.answers),
      JSON.stringify(key.gradingConfig),
      key.createdAt,
    ]
  );
}

export async function getAllAnswerKeys(): Promise<AnswerKey[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM answer_keys ORDER BY created_at DESC'
  );
  return (rows as any[]).map(rowToAnswerKey);
}

export async function getAnswerKeysByTemplate(templateId: string): Promise<AnswerKey[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM answer_keys WHERE template_id = ? ORDER BY created_at DESC',
    [templateId]
  );
  return (rows as any[]).map(rowToAnswerKey);
}

export async function getAnswerKeyById(id: string): Promise<AnswerKey | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync(
    'SELECT * FROM answer_keys WHERE id = ?',
    [id]
  );
  return row ? rowToAnswerKey(row as any) : null;
}

export async function deleteAnswerKey(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM answer_keys WHERE id = ?', [id]);
}

function rowToAnswerKey(row: any): AnswerKey {
  return {
    id: row.id,
    templateId: row.template_id,
    name: row.name,
    subject: row.subject || '',
    answers: JSON.parse(row.answers),
    gradingConfig: JSON.parse(row.grading_config),
    createdAt: row.created_at,
  };
}

// ========================
// SCAN RESULTS
// ========================

export async function insertScanResult(result: GradingResult): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO scan_results (id, answer_key_id, student_name, student_number, detected_answers, grading_result, scan_image_path, processed_image_path, is_reviewed, reviewed_answers, scanned_at, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      result.id,
      result.answerKeyId,
      result.studentName,
      result.studentNumber,
      JSON.stringify(result.details.map(d => ({
        questionNumber: d.questionNumber,
        detectedAnswer: d.detectedAnswer,
        confidence: d.confidence,
      }))),
      JSON.stringify(result),
      result.scanImagePath,
      result.processedImagePath,
      result.isReviewed ? 1 : 0,
      result.reviewedAnswers ? JSON.stringify(result.reviewedAnswers) : null,
      result.scannedAt,
      result.reviewedAt,
    ]
  );
}

export async function getResultsByAnswerKey(answerKeyId: string): Promise<GradingResult[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    'SELECT grading_result FROM scan_results WHERE answer_key_id = ? ORDER BY scanned_at DESC',
    [answerKeyId]
  );
  return (rows as any[]).map(row => JSON.parse(row.grading_result));
}

export async function getResultById(id: string): Promise<GradingResult | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync(
    'SELECT grading_result FROM scan_results WHERE id = ?',
    [id]
  );
  return row ? JSON.parse((row as any).grading_result) : null;
}

export async function getRecentResults(limit: number = 10): Promise<GradingResult[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    'SELECT grading_result FROM scan_results ORDER BY scanned_at DESC LIMIT ?',
    [limit]
  );
  return (rows as any[]).map(row => JSON.parse(row.grading_result));
}

export async function updateScanResult(result: GradingResult): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE scan_results SET student_name=?, student_number=?, grading_result=?, is_reviewed=?, reviewed_answers=?, reviewed_at=?
     WHERE id=?`,
    [
      result.studentName,
      result.studentNumber,
      JSON.stringify(result),
      result.isReviewed ? 1 : 0,
      result.reviewedAnswers ? JSON.stringify(result.reviewedAnswers) : null,
      result.reviewedAt,
      result.id,
    ]
  );
}

export async function deleteScanResult(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM scan_results WHERE id = ?', [id]);
}

export async function getResultCount(): Promise<number> {
  const db = getDatabase();
  const row = await db.getFirstAsync('SELECT COUNT(*) as count FROM scan_results');
  return (row as any)?.count || 0;
}

export async function getTodayResultCount(): Promise<number> {
  const db = getDatabase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM scan_results WHERE scanned_at >= ?',
    [startOfDay.getTime()]
  );
  return (row as any)?.count || 0;
}
