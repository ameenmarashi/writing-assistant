import { runAIPrompt } from './aiEngine';
import type { IssueCategory } from '../types';

export interface AISuggestion {
  original: string;
  suggestion: string;
  explanation: string;
  category: IssueCategory;
}

const MAX_INPUT_CHARS = 2000;
const MAX_SUGGESTIONS = 8;

const SYSTEM_PROMPT = `You are a professional writing editor, similar to Grammarly. Read the user's text and identify up to ${MAX_SUGGESTIONS} specific opportunities to improve it: grammar mistakes, awkward phrasing, unclear sentences, weak word choices, or tone issues.

Respond with ONLY a JSON array (no markdown code fences, no text before or after). Each item must be an object with exactly these fields:
- "original": an exact short quote copied verbatim from the text (5-12 words), the part that needs improvement
- "suggestion": your improved replacement for that exact quote
- "explanation": a short reason, under 12 words
- "category": one of "grammar", "style", or "clarity"

If the text has no notable issues, respond with an empty array: []`;

function isValidCategory(value: unknown): value is IssueCategory {
  return value === 'grammar' || value === 'style' || value === 'clarity';
}

function extractJsonArray(raw: string): unknown {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error("The AI didn't return a usable result. Try again.");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

/**
 * Runs a whole-document AI pass and returns candidate suggestions. Each
 * suggestion's `original` is validated as a verbatim substring of the input
 * so the caller can safely locate it in the DOM later; anything the model
 * hallucinated (a quote that doesn't actually appear in the text) is dropped.
 */
export async function runAISuggestionCheck(text: string): Promise<AISuggestion[]> {
  const input = text.slice(0, MAX_INPUT_CHARS);
  if (!input.trim()) return [];

  const raw = await runAIPrompt(SYSTEM_PROMPT, input);
  const parsed = extractJsonArray(raw);
  if (!Array.isArray(parsed)) return [];

  const suggestions: AISuggestion[] = [];
  for (const item of parsed) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).original === 'string' &&
      typeof (item as Record<string, unknown>).suggestion === 'string' &&
      typeof (item as Record<string, unknown>).explanation === 'string' &&
      isValidCategory((item as Record<string, unknown>).category) &&
      input.includes((item as { original: string }).original)
    ) {
      suggestions.push(item as AISuggestion);
    }
  }
  return suggestions;
}
