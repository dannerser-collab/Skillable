import { GoogleGenAI } from '@google/genai';

/**
 * Cliente Gemini compartido (Árbitro + Bot) con timeout duro y "circuit breaker":
 * tras varios fallos seguidos se deja de llamar a la API durante un rato para que
 * la demo no espere 8 s en cada evaluación cuando no hay internet.
 */

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 60_000;

let client: GoogleGenAI | null | undefined;
let consecutiveFailures = 0;
let breakerOpenUntil = 0;

function getClient(): GoogleGenAI | null {
  if (client === undefined) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }
  return client;
}

export function isGeminiConfigured(): boolean {
  return getClient() !== null;
}

/** ¿Merece la pena intentar Gemini ahora mismo? */
export function isGeminiAvailable(): boolean {
  return getClient() !== null && Date.now() >= breakerOpenUntil;
}

export class GeminiUnavailableError extends Error {}

interface GenerateOptions {
  system: string;
  prompt: string;
  timeoutMs: number;
  temperature?: number;
  /** JSON Schema de la respuesta. Si se omite, se devuelve texto plano. */
  schema?: Record<string, unknown>;
}

async function generate(opts: GenerateOptions): Promise<string> {
  const ai = getClient();
  if (!ai || Date.now() < breakerOpenUntil) throw new GeminiUnavailableError('Gemini no disponible');

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Gemini excedió ${opts.timeoutMs} ms`));
    }, opts.timeoutMs);
  });

  try {
    const request = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: opts.prompt,
      config: {
        systemInstruction: opts.system,
        temperature: opts.temperature ?? 0.4,
        abortSignal: controller.signal,
        // gemini-2.5-flash: sin "thinking" para minimizar latencia.
        thinkingConfig: { thinkingBudget: 0 },
        ...(opts.schema ? { responseMimeType: 'application/json', responseJsonSchema: opts.schema } : {}),
      },
    });
    const response = await Promise.race([request, timeout]);
    const text = response.text?.trim();
    if (!text) throw new Error('Respuesta vacía de Gemini');
    consecutiveFailures = 0;
    return text;
  } catch (err) {
    consecutiveFailures++;
    if (consecutiveFailures >= BREAKER_THRESHOLD) {
      breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
      consecutiveFailures = 0;
      console.warn(`[gemini] ${BREAKER_THRESHOLD} fallos seguidos: usando fallback local durante 60 s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateJson(opts: GenerateOptions & { schema: Record<string, unknown> }): Promise<unknown> {
  const text = await generate(opts);
  // Tolerar fences ```json por si el modelo los añade.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

export async function generateText(opts: Omit<GenerateOptions, 'schema'>): Promise<string> {
  return generate(opts);
}
