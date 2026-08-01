/**
 * Scan & Result Store
 * 
 * Manages the state of scanning process and grading results.
 */

import { create } from 'zustand';
import { GradingResult, ClassSummary } from '../types/result';
import * as db from '../db/queries';

interface ResultState {
  recentResults: GradingResult[];
  activeResult: GradingResult | null;
  classSummary: ClassSummary | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadRecentResults: (limit?: number) => Promise<void>;
  setActiveResult: (id: string) => Promise<void>;
  loadClassSummary: (answerKeyId: string, answerKeyName: string, subject: string, totalQuestions: number, optionsPerQuestion: number) => Promise<void>;
  saveResult: (result: GradingResult) => Promise<void>;
  updateResult: (result: GradingResult) => Promise<void>;
  deleteResult: (id: string) => Promise<void>;
  clearActiveResult: () => void;
}

export const useResultStore = create<ResultState>((set, get) => ({
  recentResults: [],
  activeResult: null,
  classSummary: null,
  isLoading: false,
  error: null,

  loadRecentResults: async (limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const results = await db.getRecentResults(limit);
      set({ recentResults: results, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setActiveResult: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await db.getResultById(id);
      if (result) {
        set({ activeResult: result, isLoading: false });
      } else {
        set({ error: 'Result not found', isLoading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadClassSummary: async (answerKeyId, answerKeyName, subject, totalQuestions, optionsPerQuestion) => {
    set({ isLoading: true, error: null });
    try {
      const results = await db.getResultsByAnswerKey(answerKeyId);
      
      // Import generateClassSummary dynamically or move it to a util to avoid circular deps if any
      const { generateClassSummary } = require('../services/grading-engine');
      
      const summary = generateClassSummary(
        results,
        answerKeyName,
        subject,
        totalQuestions,
        optionsPerQuestion
      );
      
      set({ classSummary: summary, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveResult: async (result: GradingResult) => {
    set({ isLoading: true, error: null });
    try {
      await db.insertScanResult(result);
      const recentResults = await db.getRecentResults();
      set({ recentResults, activeResult: result, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateResult: async (result: GradingResult) => {
    set({ isLoading: true, error: null });
    try {
      await db.updateScanResult(result);
      const recentResults = await db.getRecentResults();
      set({ recentResults, activeResult: result, isLoading: false });
      
      // Refresh class summary if it's currently loaded for this result
      const { classSummary } = get();
      if (classSummary && classSummary.answerKeyId === result.answerKeyId) {
        const results = await db.getResultsByAnswerKey(result.answerKeyId);
        const { generateClassSummary } = require('../services/grading-engine');
        // We'd need totalQuestions and optionsPerQuestion from the template, 
        // passing them from current state might be complex here.
        // Usually we reload it from the UI component.
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteResult: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await db.deleteScanResult(id);
      const recentResults = await db.getRecentResults();
      const { activeResult } = get();
      set({ 
        recentResults, 
        activeResult: activeResult?.id === id ? null : activeResult,
        isLoading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearActiveResult: () => {
    set({ activeResult: null });
  },
}));
