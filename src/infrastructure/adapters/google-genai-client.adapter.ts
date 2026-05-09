import {
  GoogleGenAI,
  type Content,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from '@google/genai';
import { type Result, ok, err } from 'neverthrow';
import type { IGeminiClient } from '../../domain/ports/index.js';
import type {
  GeminiModel,
  GeminiPrompt,
  GeminiPromptWithHistory,
  GeminiResponse,
  GeminiStreamChunk,
  TokenCountResult,
} from '../../domain/entities/index.js';
import type { DomainError } from '../../shared/errors/index.js';
import { ExternalServiceError, TimeoutError } from '../../shared/errors/index.js';
import {
  GeminiApiError,
  GeminiRateLimitError,
  GeminiContentFilteredError,
  GeminiModelNotFoundError,
} from '../../domain/errors/index.js';
import type { ILogger } from '../../shared/logger/index.js';
import { GEMINI_MODELS } from '../../config/index.js';

export class GoogleGenAIClientAdapter implements IGeminiClient {
  private readonly client: GoogleGenAI;

  constructor(
    project: string,
    location: string,
    private readonly timeoutMs: number,
    private readonly logger: ILogger,
  ) {
    this.client = new GoogleGenAI({ vertexai: true, project, location });
  }

  async generateContent(prompt: GeminiPrompt): Promise<Result<GeminiResponse, DomainError>> {
    try {
      const response = await this.withTimeout(
        this.client.models.generateContent({
          model: prompt.model,
          contents: prompt.text,
          config: this.buildConfig(prompt),
        }),
        this.timeoutMs,
      );
      return ok(this.mapResponse(response, prompt.model));
    } catch (error) {
      return err(this.mapError(error, prompt.model));
    }
  }

  async generateContentWithHistory(
    prompt: GeminiPromptWithHistory,
  ): Promise<Result<GeminiResponse, DomainError>> {
    try {
      const chat = this.client.chats.create({
        model: prompt.model,
        history: this.toHistory(prompt.history),
        config: this.buildConfig(prompt),
      });
      const response = await this.withTimeout(
        chat.sendMessage({ message: prompt.text }),
        this.timeoutMs,
      );
      return ok(this.mapResponse(response, prompt.model));
    } catch (error) {
      return err(this.mapError(error, prompt.model));
    }
  }

  async generateContentViaStream(
    prompt: GeminiPrompt,
  ): Promise<Result<GeminiResponse, DomainError>> {
    try {
      const stream = await this.withTimeout(
        this.client.models.generateContentStream({
          model: prompt.model,
          contents: prompt.text,
          config: this.buildConfig(prompt),
        }),
        this.timeoutMs,
      );
      return ok(await this.aggregateStream(stream, prompt.model));
    } catch (error) {
      return err(this.mapError(error, prompt.model));
    }
  }

  async generateContentWithHistoryViaStream(
    prompt: GeminiPromptWithHistory,
  ): Promise<Result<GeminiResponse, DomainError>> {
    try {
      const chat = this.client.chats.create({
        model: prompt.model,
        history: this.toHistory(prompt.history),
        config: this.buildConfig(prompt),
      });
      const stream = await this.withTimeout(
        chat.sendMessageStream({ message: prompt.text }),
        this.timeoutMs,
      );
      return ok(await this.aggregateStream(stream, prompt.model));
    } catch (error) {
      return err(this.mapError(error, prompt.model));
    }
  }

  async *streamGenerateContent(
    prompt: GeminiPrompt,
  ): AsyncGenerator<Result<GeminiStreamChunk, DomainError>, void, unknown> {
    try {
      const stream = await this.client.models.generateContentStream({
        model: prompt.model,
        contents: prompt.text,
        config: this.buildConfig(prompt),
      });

      for await (const chunk of stream) {
        yield ok({ text: chunk.text ?? '', isComplete: false });
      }
      yield ok({ text: '', isComplete: true });
    } catch (error) {
      yield err(this.mapError(error, prompt.model));
    }
  }

  async *streamGenerateContentWithHistory(
    prompt: GeminiPromptWithHistory,
  ): AsyncGenerator<Result<GeminiStreamChunk, DomainError>, void, unknown> {
    try {
      const chat = this.client.chats.create({
        model: prompt.model,
        history: this.toHistory(prompt.history),
        config: this.buildConfig(prompt),
      });
      const stream = await chat.sendMessageStream({ message: prompt.text });

      for await (const chunk of stream) {
        yield ok({ text: chunk.text ?? '', isComplete: false });
      }
      yield ok({ text: '', isComplete: true });
    } catch (error) {
      yield err(this.mapError(error, prompt.model));
    }
  }

  async countTokens(
    text: string,
    modelName: string,
  ): Promise<Result<TokenCountResult, DomainError>> {
    try {
      const result = await this.withTimeout(
        this.client.models.countTokens({ model: modelName, contents: text }),
        this.timeoutMs,
      );
      return ok({ totalTokens: result.totalTokens ?? 0, model: modelName });
    } catch (error) {
      return err(this.mapError(error, modelName));
    }
  }

  async listModels(): Promise<Result<readonly GeminiModel[], DomainError>> {
    return ok(GEMINI_MODELS);
  }

  async getModel(modelName: string): Promise<Result<GeminiModel, DomainError>> {
    const model = GEMINI_MODELS.find((m) => m.name === modelName);
    if (model === undefined) {
      return err(new GeminiModelNotFoundError(modelName));
    }
    return ok(model);
  }

  private buildConfig(prompt: Partial<GeminiPrompt>): GenerateContentConfig {
    const config: GenerateContentConfig = {};
    if (prompt.systemInstruction !== undefined) {
      config.systemInstruction = prompt.systemInstruction;
    }
    if (prompt.temperature !== undefined) {
      config.temperature = prompt.temperature;
    }
    if (prompt.maxOutputTokens !== undefined) {
      config.maxOutputTokens = prompt.maxOutputTokens;
    }
    if (prompt.topP !== undefined) {
      config.topP = prompt.topP;
    }
    if (prompt.topK !== undefined) {
      config.topK = prompt.topK;
    }
    return config;
  }

  private toHistory(
    history: readonly { role: 'user' | 'model'; content: string }[] | undefined,
  ): Content[] {
    if (history === undefined) {
      return [];
    }
    return history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));
  }

  private mapResponse(response: GenerateContentResponse, model: string): GeminiResponse {
    const usage = response.usageMetadata;
    return {
      text: response.text ?? '',
      model,
      finishReason: response.candidates?.[0]?.finishReason ?? 'UNKNOWN',
      usage: {
        promptTokens: usage?.promptTokenCount ?? 0,
        completionTokens: usage?.candidatesTokenCount ?? 0,
        totalTokens: usage?.totalTokenCount ?? 0,
      },
    };
  }

  private async aggregateStream(
    stream: AsyncGenerator<GenerateContentResponse>,
    model: string,
  ): Promise<GeminiResponse> {
    let text = '';
    let lastChunk: GenerateContentResponse | undefined;
    for await (const chunk of stream) {
      text += chunk.text ?? '';
      lastChunk = chunk;
    }
    const usage = lastChunk?.usageMetadata;
    return {
      text,
      model,
      finishReason: lastChunk?.candidates?.[0]?.finishReason ?? 'UNKNOWN',
      usage: {
        promptTokens: usage?.promptTokenCount ?? 0,
        completionTokens: usage?.candidatesTokenCount ?? 0,
        totalTokens: usage?.totalTokenCount ?? 0,
      },
    };
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, ms);
    });
    return Promise.race([promise, timeout]);
  }

  private mapError(error: unknown, modelName: string): DomainError {
    if (error instanceof Error) {
      if (error.message === 'TIMEOUT') {
        return new TimeoutError('Request timed out', this.timeoutMs);
      }

      const message = error.message.toLowerCase();

      if (message.includes('rate limit') || message.includes('429')) {
        return new GeminiRateLimitError();
      }
      if (message.includes('not found') || message.includes('404')) {
        return new GeminiModelNotFoundError(modelName);
      }
      if (message.includes('safety') || message.includes('blocked')) {
        return new GeminiContentFilteredError();
      }

      this.logger.error('Gemini API error', { error: error.message, model: modelName });
      return new GeminiApiError(error.message);
    }
    return new ExternalServiceError('Unknown error occurred', 'Gemini');
  }
}
