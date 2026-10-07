import type { ResumeAnalysis } from '../types.js';

export interface LlmMessage {
  role: 'system' | 'user';
  content: string;
}

export interface LlmProvider {
  readonly name: string;
  complete(messages: LlmMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string>;
}

export interface AiConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'groq';
  apiKey: string;
  model: string;
}

/**
 * Resolve AI config purely from environment variables.
 * No API keys are ever hard-coded — the deterministic engine is the default.
 */
export function aiConfigFromEnv(): AiConfig | null {
  const provider = process.env.AI_PROVIDER as AiConfig['provider'] | undefined;
  const apiKey = process.env.AI_API_KEY;
  if (!provider || !apiKey) return null;
  const defaults: Record<AiConfig['provider'], string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-latest',
    gemini: 'gemini-1.5-flash',
    groq: 'llama-3.1-8b-instant',
  };
  const model = process.env.AI_MODEL || defaults[provider];
  return { provider, apiKey, model };
}

export function createProvider(cfg: AiConfig): LlmProvider {
  switch (cfg.provider) {
    case 'anthropic':
      return new AnthropicProvider(cfg);
    case 'gemini':
      return new GeminiProvider(cfg);
    case 'groq':
      return new GroqProvider(cfg);
    case 'openai':
    default:
      return new OpenAiCompatibleProvider(cfg);
  }
}

/** OpenAI-compatible /chat/completions — also covers Groq and most local gateways. */
class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;
  constructor(private cfg: AiConfig) {
    this.name = cfg.provider;
  }

  async complete(messages: LlmMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const base =
      this.cfg.provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.model,
        messages,
        temperature: opts?.temperature ?? 0.2,
        max_tokens: opts?.maxTokens ?? 1200,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }
}

/** Groq's OpenAI-compatible API. */
class GroqProvider extends OpenAiCompatibleProvider {
  override readonly name = 'groq';
}

class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';

  constructor(private cfg: AiConfig) {}

  async complete(messages: LlmMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const rest = messages.filter((m) => m.role !== 'system');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.cfg.model,
        system,
        messages: rest.map((m) => ({ role: m.role === 'user' ? 'user' as const : 'user' as const, content: m.content })),
        max_tokens: opts?.maxTokens ?? 1200,
        temperature: opts?.temperature ?? 0.2,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.map((c) => c.text ?? '').join('').trim() ?? '';
  }
}

class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';

  constructor(private cfg: AiConfig) {}

  async complete(messages: LlmMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const user = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.cfg.model}:generateContent?key=${encodeURIComponent(this.cfg.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: system ? { parts: [{ text: system }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: opts?.temperature ?? 0.2,
            maxOutputTokens: opts?.maxTokens ?? 1200,
          },
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? '';
  }
}
