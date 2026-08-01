/**
 * Answer Key Store
 * 
 * Manages the state of answer keys.
 */

import { create } from 'zustand';
import { AnswerKey } from '../types/answer';
import * as db from '../db/queries';

interface AnswerKeyState {
  answerKeys: AnswerKey[];
  activeAnswerKey: AnswerKey | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadAnswerKeys: () => Promise<void>;
  loadAnswerKeysByTemplate: (templateId: string) => Promise<void>;
  setActiveAnswerKey: (id: string) => Promise<void>;
  createAnswerKey: (key: AnswerKey) => Promise<void>;
  deleteAnswerKey: (id: string) => Promise<void>;
  clearActiveAnswerKey: () => void;
}

export const useAnswerKeyStore = create<AnswerKeyState>((set, get) => ({
  answerKeys: [],
  activeAnswerKey: null,
  isLoading: false,
  error: null,

  loadAnswerKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const answerKeys = await db.getAllAnswerKeys();
      set({ answerKeys, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadAnswerKeysByTemplate: async (templateId: string) => {
    set({ isLoading: true, error: null });
    try {
      const answerKeys = await db.getAnswerKeysByTemplate(templateId);
      set({ answerKeys, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setActiveAnswerKey: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const key = await db.getAnswerKeyById(id);
      if (key) {
        set({ activeAnswerKey: key, isLoading: false });
      } else {
        set({ error: 'Answer key not found', isLoading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createAnswerKey: async (key: AnswerKey) => {
    set({ isLoading: true, error: null });
    try {
      await db.insertAnswerKey(key);
      const answerKeys = await db.getAllAnswerKeys(); // Or fetch by template if currently filtered
      set({ answerKeys, activeAnswerKey: key, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteAnswerKey: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await db.deleteAnswerKey(id);
      const answerKeys = await db.getAllAnswerKeys();
      const { activeAnswerKey } = get();
      set({ 
        answerKeys, 
        activeAnswerKey: activeAnswerKey?.id === id ? null : activeAnswerKey,
        isLoading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearActiveAnswerKey: () => {
    set({ activeAnswerKey: null });
  },
}));
