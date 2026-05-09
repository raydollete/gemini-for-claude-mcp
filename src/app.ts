import { loadConfig } from './config/index.js';
import { createLogger } from './shared/logger/index.js';
import { GoogleGenAIClientAdapter } from './infrastructure/adapters/index.js';
import {
  QueryGeminiUseCase,
  ListModelsUseCase,
  CountTokensUseCase,
} from './domain/use-cases/index.js';
import {
  QueryGeminiController,
  ListModelsController,
  CountTokensController,
} from './infrastructure/controllers/index.js';
import {
  ToolRegistry,
  McpServer,
  queryGeminiTool,
  listModelsTool,
  countTokensTool,
} from './infrastructure/mcp/index.js';

async function main(): Promise<void> {
  // Load and validate configuration
  const config = loadConfig();
  const logger = createLogger(config.LOG_LEVEL);

  logger.info('Starting Gemini MCP Server', {
    nodeEnv: config.NODE_ENV,
    project: config.GOOGLE_CLOUD_PROJECT,
    location: config.GOOGLE_CLOUD_LOCATION,
    model: config.GEMINI_DEFAULT_MODEL,
    maxOutputTokens: config.GEMINI_MAX_OUTPUT_TOKENS,
  });

  // Create infrastructure adapters
  const geminiClient = new GoogleGenAIClientAdapter(
    config.GOOGLE_CLOUD_PROJECT,
    config.GOOGLE_CLOUD_LOCATION,
    config.GEMINI_TIMEOUT_MS,
    logger,
  );

  // Create use cases
  const queryGeminiUseCase = new QueryGeminiUseCase(geminiClient);
  const listModelsUseCase = new ListModelsUseCase(geminiClient);
  const countTokensUseCase = new CountTokensUseCase(geminiClient);

  // Create controllers - model/maxOutputTokens injected server-side, not from client
  const queryGeminiController = new QueryGeminiController(
    queryGeminiUseCase,
    config.GEMINI_DEFAULT_MODEL,
    config.GEMINI_MAX_OUTPUT_TOKENS,
  );
  const listModelsController = new ListModelsController(listModelsUseCase);
  const countTokensController = new CountTokensController(countTokensUseCase, config.GEMINI_DEFAULT_MODEL);

  // Register tools
  const toolRegistry = new ToolRegistry();

  toolRegistry.register('query_gemini', {
    tool: queryGeminiTool,
    handler: (args): Promise<unknown> => queryGeminiController.handle(args),
  });

  toolRegistry.register('list_gemini_models', {
    tool: listModelsTool,
    handler: (): Promise<unknown> => listModelsController.handle(),
  });

  toolRegistry.register('count_gemini_tokens', {
    tool: countTokensTool,
    handler: (args): Promise<unknown> => countTokensController.handle(args),
  });

  // Start MCP server
  const server = new McpServer(toolRegistry, logger);
  await server.start();
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal error: ${String(error)}\n`);
  process.exit(1);
});
