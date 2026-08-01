/**
 * Database Schema & Migration
 * 
 * SQLite schema for templates, answer keys, and scan results.
 * Uses expo-sqlite for local persistence.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'answer_grader.db';
const DB_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database, creating tables if they don't exist.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);

  // Enable WAL mode for better concurrent read performance
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      options_per_question INTEGER NOT NULL DEFAULT 5,
      columns INTEGER NOT NULL DEFAULT 1,
      paper_size TEXT NOT NULL DEFAULT 'A4',
      marker_config TEXT NOT NULL,
      grid_config TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS answer_keys (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      name TEXT NOT NULL,
      subject TEXT DEFAULT '',
      answers TEXT NOT NULL,
      grading_config TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scan_results (
      id TEXT PRIMARY KEY,
      answer_key_id TEXT NOT NULL,
      student_name TEXT DEFAULT '',
      student_number TEXT DEFAULT '',
      detected_answers TEXT NOT NULL,
      grading_result TEXT NOT NULL,
      scan_image_path TEXT NOT NULL,
      processed_image_path TEXT DEFAULT NULL,
      is_reviewed INTEGER DEFAULT 0,
      reviewed_answers TEXT DEFAULT NULL,
      scanned_at INTEGER NOT NULL,
      reviewed_at INTEGER DEFAULT NULL,
      FOREIGN KEY (answer_key_id) REFERENCES answer_keys(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_results_answer_key ON scan_results(answer_key_id);
    CREATE INDEX IF NOT EXISTS idx_results_scanned_at ON scan_results(scanned_at);
    CREATE INDEX IF NOT EXISTS idx_answer_keys_template ON answer_keys(template_id);
  `);

  console.log('[DB] Database initialized successfully');
  return db;
}

/**
 * Get the database instance. Throws if not initialized.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
