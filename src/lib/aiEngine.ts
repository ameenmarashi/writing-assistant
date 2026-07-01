// AI runs through a small Cloudflare Worker proxy (see worker/README.md)
// that calls OpenRouter's free DeepSeek endpoint. The proxy exists so the
// OpenRouter API key never has to ship in this static site's client JS.
const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL as string | undefined;

export function isAIConfigured(): boolean {
  return Boolean(PROXY_URL);
}

export type AIAction =
  | 'proofread'
  | 'rewrite'
  | 'simplify'
  | 'professional'
  | 'friendly'
  | 'confident'
  | 'diplomatic'
  | 'direct'
  | 'assertive'
  | 'empathetic'
  | 'concise'
  | 'informative'
  | 'summarize'
  | 'keyPoints'
  | 'list'
  | 'table';

export interface AIActionGroup {
  label: string;
  actions: AIAction[];
}

/** Grouped for the menu UI; mirrors Grammarly's Correctness / Tone / Length / Reformat groupings. */
export const AI_ACTION_GROUPS: AIActionGroup[] = [
  { label: 'Fix & rewrite', actions: ['proofread', 'rewrite', 'simplify'] },
  {
    label: 'Change tone',
    actions: ['professional', 'friendly', 'confident', 'diplomatic', 'direct', 'assertive', 'empathetic'],
  },
  { label: 'Adjust length', actions: ['concise', 'informative'] },
  { label: 'Reformat', actions: ['summarize', 'keyPoints', 'list', 'table'] },
];

export const AI_ACTION_LABELS: Record<AIAction, string> = {
  proofread: 'Proofread',
  rewrite: 'Rewrite',
  simplify: 'Simplify',
  professional: 'Make professional',
  friendly: 'Make friendly',
  confident: 'Make confident',
  diplomatic: 'Make diplomatic',
  direct: 'Make direct',
  assertive: 'Make assertive',
  empathetic: 'Make empathetic',
  concise: 'Shorten',
  informative: 'Lengthen / add detail',
  summarize: 'Summarize',
  keyPoints: 'Key points',
  list: 'Turn into a list',
  table: 'Turn into a table',
};

const ACTION_PROMPTS: Record<AIAction, string> = {
  proofread:
    'Proofread the following text. Fix grammar, spelling, and punctuation mistakes only. ' +
    'Keep the meaning, tone, and length close to the original. Return only the corrected text, ' +
    'with no explanation, preamble, or quotation marks.',
  rewrite:
    'Rewrite the following text to improve clarity and flow while keeping the same meaning. ' +
    'Return only the rewritten text, with no explanation, preamble, or quotation marks.',
  simplify:
    'Rewrite the following text using simpler words and shorter sentences so it is easier to ' +
    'understand, while keeping the same meaning. Return only the rewritten text, with no ' +
    'explanation, preamble, or quotation marks.',
  professional:
    'Rewrite the following text in a more professional, formal tone. Return only the rewritten ' +
    'text, with no explanation, preamble, or quotation marks.',
  friendly:
    'Rewrite the following text in a warmer, more friendly and casual tone. Return only the ' +
    'rewritten text, with no explanation, preamble, or quotation marks.',
  confident:
    'Rewrite the following text in a more confident, self-assured tone, removing hedging language. ' +
    'Return only the rewritten text, with no explanation, preamble, or quotation marks.',
  diplomatic:
    'Rewrite the following text in a more diplomatic, tactful tone that softens any harsh or blunt ' +
    'language. Return only the rewritten text, with no explanation, preamble, or quotation marks.',
  direct:
    'Rewrite the following text in a more direct, straightforward tone that gets to the point ' +
    'quickly, cutting unnecessary lead-in. Return only the rewritten text, with no explanation, ' +
    'preamble, or quotation marks.',
  assertive:
    'Rewrite the following text in a more assertive tone that states the point clearly and firmly ' +
    'without being aggressive. Return only the rewritten text, with no explanation, preamble, or ' +
    'quotation marks.',
  empathetic:
    'Rewrite the following text in a more empathetic tone that acknowledges the reader\'s ' +
    'feelings or perspective. Return only the rewritten text, with no explanation, preamble, or ' +
    'quotation marks.',
  concise:
    'Rewrite the following text to be more concise, removing unnecessary words while keeping ' +
    'the meaning. Return only the rewritten text, with no explanation, preamble, or quotation marks.',
  informative:
    'Rewrite the following text to be more informative, adding useful clarifying detail where ' +
    'helpful. Return only the rewritten text, with no explanation, preamble, or quotation marks.',
  summarize:
    'Summarize the following text in a short paragraph, capturing only the most important points. ' +
    'Return only the summary, with no explanation, preamble, or quotation marks.',
  keyPoints:
    'Extract the key points from the following text as a concise bulleted list of its most ' +
    'important ideas. Return only the list items, one per line, each starting with "- ", with no ' +
    'explanation, preamble, or other text.',
  list:
    'Reformat the following text into a bulleted list, preserving its items and details. Return ' +
    'only the list items, one per line, each starting with "- ", with no explanation, preamble, ' +
    'or other text.',
  table:
    'Convert the following text into a table that organizes its information into rows and ' +
    'columns. Respond with ONLY a JSON object (no markdown code fences, no explanation text ' +
    'before or after) in exactly this shape: {"headers": ["Column 1", "Column 2"], "rows": ' +
    '[["value", "value"], ["value", "value"]]}. Use 2-4 columns and as many rows as needed to ' +
    'capture the content.',
};

/** Lower temperature for actions that must produce a strict, parseable structure. */
const ACTION_TEMPERATURE: Partial<Record<AIAction, number>> = {
  table: 0.1,
  list: 0.2,
  keyPoints: 0.2,
};

export type AIRunStatus =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'error'; message: string };

/** Maps a thrown error to a short, user-facing message for AI run failures. */
export function describeAIError(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
  if (/not configured/i.test(raw)) return raw;
  if (/fetch|network/i.test(raw)) {
    return "Couldn't reach the AI service — check your internet connection and try again.";
  }
  return raw || 'AI action failed. Try again.';
}

const REQUEST_TIMEOUT_MS = 45000;

/** Shared low-level call: sends one system+user prompt through the proxy. */
export async function runAIPrompt(
  systemPrompt: string,
  userText: string,
  temperature = 0.3,
): Promise<string> {
  if (!PROXY_URL) {
    throw new Error('AI features are not configured yet (missing VITE_AI_PROXY_URL).');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
        temperature,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('The AI request timed out — the free model may be overloaded right now. Try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`AI request failed (HTTP ${response.status})`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI response was empty or malformed.');
  }
  return content.trim();
}

export async function runAIAction(action: AIAction, text: string): Promise<string> {
  return runAIPrompt(ACTION_PROMPTS[action], text, ACTION_TEMPERATURE[action] ?? 0.3);
}
