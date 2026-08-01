/**
 * Template Defaults
 * 
 * Default configurations for creating new answer sheet templates.
 */

import { AnswerSheetTemplate, DEFAULT_MARKER_CONFIG, DEFAULT_GRID_CONFIG } from '../types/template';

export const TEMPLATE_PRESETS: Record<string, Partial<AnswerSheetTemplate>> = {
  'UTS/UAS 20 Soal': {
    totalQuestions: 20,
    optionsPerQuestion: 5,
    columns: 1,
    paperSize: 'A4',
  },
  'UTS/UAS 30 Soal': {
    totalQuestions: 30,
    optionsPerQuestion: 5,
    columns: 1,
    paperSize: 'A4',
  },
  'UTS/UAS 40 Soal': {
    totalQuestions: 40,
    optionsPerQuestion: 5,
    columns: 2,
    paperSize: 'A4',
  },
  'UTS/UAS 50 Soal': {
    totalQuestions: 50,
    optionsPerQuestion: 5,
    columns: 2,
    paperSize: 'A4',
  },
  'Ulangan Harian 10 Soal': {
    totalQuestions: 10,
    optionsPerQuestion: 4,
    columns: 1,
    paperSize: 'A4',
  },
  'Ulangan Harian 15 Soal': {
    totalQuestions: 15,
    optionsPerQuestion: 4,
    columns: 1,
    paperSize: 'A4',
  },
};

export function createDefaultTemplate(preset?: string): AnswerSheetTemplate {
  const base = preset ? TEMPLATE_PRESETS[preset] : {};
  const now = Date.now();

  return {
    id: `tpl-${now}-${Math.random().toString(36).substr(2, 6)}`,
    name: preset || 'Template Baru',
    totalQuestions: 20,
    optionsPerQuestion: 5,
    columns: 1,
    paperSize: 'A4',
    markers: { ...DEFAULT_MARKER_CONFIG },
    answerGrid: { ...DEFAULT_GRID_CONFIG },
    createdAt: now,
    updatedAt: now,
    ...base,
  };
}

/** Maximum questions supported per column */
export const MAX_QUESTIONS_PER_COLUMN = 30;

/** Available subject options */
export const SUBJECT_OPTIONS = [
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'IPA (Ilmu Pengetahuan Alam)',
  'IPS (Ilmu Pengetahuan Sosial)',
  'PKn (Pendidikan Kewarganegaraan)',
  'Seni Budaya',
  'PJOK (Pendidikan Jasmani)',
  'Prakarya',
  'Agama',
  'TIK (Teknologi Informasi)',
  'Lainnya',
];
