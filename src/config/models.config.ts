import type { GeminiModel } from '../domain/entities/index.js';

/**
 * Central configuration for Gemini models.
 *
 * IMPORTANT: This list is for DISPLAY in list_gemini_models tool only.
 * Users can query ANY valid Gemini model - the API accepts any model string.
 *
 * @see https://ai.google.dev/gemini-api/docs/models
 */

/**
 * Popular Gemini models shown in list_gemini_models.
 * NOTE: Any valid Gemini model works - this is not a validation list.
 */
export const GEMINI_MODELS: readonly GeminiModel[] = [
  {
    name: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro Preview',
    description:
      'Latest preview reasoning model with 1M context. Vertex AI: requires GOOGLE_CLOUD_LOCATION=global.',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: ['generateContent'],
  },
  {
    name: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro Preview',
    description:
      'Advanced reasoning model with 1M context. Vertex AI: requires GOOGLE_CLOUD_LOCATION=global.',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: ['generateContent'],
  },
  {
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'Capable thinking model for complex reasoning, code, math, and STEM',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: ['generateContent'],
  },
  {
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Fast and efficient for most tasks with excellent performance',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: ['generateContent'],
  },
  {
    name: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    description: 'Multimodal model optimized for speed and cost-efficiency',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: ['generateContent'],
  },
];

/** List of model names for display */
export const MODEL_NAMES = GEMINI_MODELS.map((m) => m.name);

/** Description for tool schemas - emphasizes any model works */
export const MODEL_OPTIONS_DESCRIPTION =
  `Any valid Gemini model. See https://ai.google.dev/gemini-api/docs/models. ` +
  `Popular: ${MODEL_NAMES.slice(0, 3).join(', ')}`;
