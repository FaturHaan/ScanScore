/**
 * Template Store
 * 
 * Manages the state of answer sheet templates.
 */

import { create } from 'zustand';
import { AnswerSheetTemplate } from '../types/template';
import * as db from '../db/queries';

interface TemplateState {
  templates: AnswerSheetTemplate[];
  activeTemplate: AnswerSheetTemplate | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTemplates: () => Promise<void>;
  setActiveTemplate: (id: string) => Promise<void>;
  createTemplate: (template: AnswerSheetTemplate) => Promise<void>;
  updateTemplate: (template: AnswerSheetTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  clearActiveTemplate: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  activeTemplate: null,
  isLoading: false,
  error: null,

  loadTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await db.getAllTemplates();
      set({ templates, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setActiveTemplate: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const template = await db.getTemplateById(id);
      if (template) {
        set({ activeTemplate: template, isLoading: false });
      } else {
        set({ error: 'Template not found', isLoading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTemplate: async (template: AnswerSheetTemplate) => {
    set({ isLoading: true, error: null });
    try {
      await db.insertTemplate(template);
      const templates = await db.getAllTemplates();
      set({ templates, activeTemplate: template, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateTemplate: async (template: AnswerSheetTemplate) => {
    set({ isLoading: true, error: null });
    try {
      await db.updateTemplate(template);
      const templates = await db.getAllTemplates();
      set({ templates, activeTemplate: template, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteTemplate: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await db.deleteTemplate(id);
      const templates = await db.getAllTemplates();
      const { activeTemplate } = get();
      set({ 
        templates, 
        activeTemplate: activeTemplate?.id === id ? null : activeTemplate,
        isLoading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearActiveTemplate: () => {
    set({ activeTemplate: null });
  },
}));
