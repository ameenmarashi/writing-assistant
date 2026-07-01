import type { InitProgressReport, MLCEngine } from '@mlc-ai/web-llm';

// Small instruction-tuned model chosen for a reasonable download size while
// still following short rewrite/tone instructions well. Runs entirely
// on-device via WebGPU — no API key, no server, no per-request cost.
export const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export type AIAction =
  | 'proofread'
  | 'rewrite'
  | 'professional'
  | 'friendly'
  | 'concise'
  | 'informative'
  | 'list';

export const AI_ACTION_LABELS: Record<AIAction, string> = {
  proofread: 'Proofread',
  rewrite: 'Rewrite',
  professional: 'Make professional',
  friendly: 'Make friendly',
  concise: 'Make concise',
  informative: 'Make more informative',
  list: 'Turn into a list',
};

const ACTION_PROMPTS: Record<AIAction, string> = {
  proofread:
    'Proofread the following text. Fix grammar, spelling, and punctuation mistakes only. ' +
    'Keep the meaning, tone, and length close to the original. Return only the corrected text, ' +
    'with no explanation, preamble, or quotation marks.',
  rewrite:
    'Rewrite the following text to improve clarity and flow while keeping the same meaning. ' +
    'Return only the rewritten text, with no explanation, preamble, or quotation marks.',
  professional:
    'Rewrite the following text in a more professional, formal tone. Return only the rewritten ' +
    'text, with no explanation, preamble, or quotation marks.',
  friendly:
    'Rewrite the following text in a warmer, more friendly and casual tone. Return only the ' +
    'rewritten text, with no explanation, preamble, or quotation marks.',
  concise:
    'Rewrite the following text to be more concise, removing unnecessary words while keeping ' +
    'the meaning. Return only the rewritten text, with no explanation, preamble, or quotation marks.',
  informative:
    'Rewrite the following text to be more informative, adding useful clarifying detail where ' +
    'helpful. Return only the rewritten text, with no explanation, preamble, or quotation marks.',
  list:
    'Convert the following text into a list of its key points. Return only the list items, one ' +
    'per line, each starting with "- ", with no explanation, preamble, or other text.',
};

export function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export type AIRunStatus =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string; progress: number | null }
  | { kind: 'error'; message: string };

/** Maps a thrown error to a short, user-facing message for AI run failures. */
export function describeAIError(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
  if (/fetch/i.test(raw)) {
    return "Couldn't download the AI model — check your internet connection and try again.";
  }
  return raw || 'AI action failed. Try again.';
}

let enginePromise: Promise<MLCEngine> | null = null;

/** Lazily downloads/initializes the model on first use, then reuses the same engine instance. */
function getEngine(onProgress?: (report: InitProgressReport) => void): Promise<MLCEngine> {
  if (!enginePromise) {
    enginePromise = import('@mlc-ai/web-llm')
      .then(({ CreateMLCEngine }) =>
        CreateMLCEngine(MODEL_ID, { initProgressCallback: onProgress }),
      )
      .catch((err) => {
        enginePromise = null; // allow retry on next call
        throw err;
      });
  }
  return enginePromise;
}

export type AIProgressCallback = (report: InitProgressReport) => void;

/** Shared low-level call: loads the engine (if needed) and runs one system+user prompt. */
export async function runAIPrompt(
  systemPrompt: string,
  userText: string,
  onProgress?: AIProgressCallback,
  temperature = 0.3,
): Promise<string> {
  const engine = await getEngine(onProgress);
  const completion = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ],
    temperature,
  });
  return completion.choices[0]?.message?.content?.trim() ?? '';
}

export async function runAIAction(
  action: AIAction,
  text: string,
  onProgress?: AIProgressCallback,
): Promise<string> {
  return runAIPrompt(ACTION_PROMPTS[action], text, onProgress);
}
