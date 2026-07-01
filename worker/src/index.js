/**
 * Cloudflare Worker proxy for the writing assistant's AI features.
 *
 * Purpose: the web app is a static site with no backend, so it cannot hold
 * an OpenRouter API key without exposing it to every visitor. This Worker
 * holds the key as a server-side secret and forwards chat-completion
 * requests to OpenRouter's free DeepSeek endpoint on the app's behalf.
 *
 * Deployment: see worker/README.md.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-chat-v3.1:free';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(env) });
    }

    if (!env.OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: 'Worker is missing OPENROUTER_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }

    const { messages, temperature } = body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '"messages" must be a non-empty array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }

    let upstream;
    try {
      upstream = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.ALLOWED_ORIGIN || 'https://ameenmarashi.github.io',
          'X-Title': 'Writing Assistant',
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: typeof temperature === 'number' ? temperature : 0.3,
        }),
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to reach OpenRouter' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
    });
  },
};
