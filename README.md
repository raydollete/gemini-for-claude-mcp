# Gemini MCP Server for Claude Code

[![Claude Code](https://img.shields.io/badge/Claude%20Code-MCP%20Server-orange)](https://docs.anthropic.com/en/docs/claude-code)
[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)

Give Claude Code access to Google's Gemini AI models. Get second opinions, compare approaches, and leverage Gemini's capabilities—all from within your Claude Code session.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Using with Claude Code](#using-with-claude-code)
- [Configuration](#configuration)
- [Other MCP Clients](#other-mcp-clients)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Tool Reference](#tool-reference)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

```bash
# 1. Clone and build
git clone https://github.com/Raydius/gemini-for-claude-mcp.git
cd gemini-for-claude-mcp
npm install && npm run build

# 2. Authenticate to Google Cloud (one-time)
gcloud auth application-default login

# 3. Add to Claude Code (replace project ID and absolute path)
#    GOOGLE_CLOUD_LOCATION is optional and defaults to `global`. The newest
#    preview models (gemini-3-pro-preview, gemini-3.1-pro-preview) require
#    `global` — regional endpoints return 404 for those models.
claude mcp add gemini \
  -e GOOGLE_CLOUD_PROJECT=your-gcp-project-id \
  -e GEMINI_DEFAULT_MODEL=gemini-2.5-pro \
  -- node $(pwd)/dist/app.js

# 4. Start Claude Code and try it out
claude
```

Then ask Claude:
> "Ask Gemini to explain the tradeoffs between microservices and monoliths"

---

## Features

- **Built for Claude Code** - Seamlessly integrates with your Claude Code workflow
- **Streaming Responses** - Enabled by default for real-time output
- **Multi-turn Conversations** - Maintain context across multiple Gemini queries
- **Configurable Model** - Set your preferred Gemini model via environment variable
- **Token Counting** - Estimate costs before making queries
- **Type-Safe** - Built with strict TypeScript
- **Well-Tested** - 100% domain layer test coverage

---

## Prerequisites

- **Claude Code** - [Installation guide](https://docs.anthropic.com/en/docs/claude-code)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **Google Cloud project** with the Vertex AI API enabled. See [Enable the Vertex AI API](https://cloud.google.com/vertex-ai/docs/start/cloud-environment).
- **IAM role**: the principal running this server needs `roles/aiplatform.user` (or higher) on the project.
- **Authentication**: either Application Default Credentials via `gcloud auth application-default login` (recommended for local dev), or a service-account JSON key referenced by `GOOGLE_APPLICATION_CREDENTIALS`.
- **`gcloud` CLI** - [Install](https://cloud.google.com/sdk/docs/install) (only needed for ADC login).

---

## Installation & Setup

### Step 1: Clone and Build

```bash
git clone https://github.com/Raydius/gemini-for-claude-mcp.git
cd gemini-for-claude-mcp
npm install
npm run build
```

### Step 2: Authenticate to Google Cloud

```bash
gcloud auth application-default login
```

This stores Application Default Credentials that the server uses to call Vertex AI. Alternatively, set `GOOGLE_APPLICATION_CREDENTIALS` to the path of a service-account JSON key.

### Step 3: Add to Claude Code

**Option A: Using the CLI (Recommended)**

```bash
# Basic setup (substitute default model for any valid Gemini model designation string)
# GOOGLE_CLOUD_LOCATION defaults to `global` and is omitted here. See "Vertex AI
# location" below if you need to pin a regional endpoint.
claude mcp add gemini \
  -e GOOGLE_CLOUD_PROJECT=your-gcp-project-id \
  -e GEMINI_DEFAULT_MODEL=gemini-2.5-pro \
  -- node /absolute/path/to/gemini-for-claude-mcp/dist/app.js
```

**Option B: Manual Configuration**

Edit your Claude Code settings file (`~/.claude.json`):

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["/absolute/path/to/gemini-for-claude-mcp/dist/app.js"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GEMINI_DEFAULT_MODEL": "gemini-2.5-flash"
      }
    }
  }
}
```

See [Configuration](#configuration) for all available options and [supported models](https://ai.google.dev/gemini-api/docs/models).

### Step 4: Verify Installation

Start Claude Code and verify the server is connected:

```bash
claude
```

Then ask:
> "What Gemini models are available?"

If configured correctly, Claude will use the `list_gemini_models` tool and show you the available models.

---

## Using with Claude Code

Once installed, you can ask Claude to use Gemini in natural language. Here are some examples:

### Get a Second Opinion

```
You: I'm implementing a rate limiter. Can you ask Gemini for its approach?

Claude: I'll query Gemini for an alternative perspective on rate limiting...
[Uses query_gemini tool]

Gemini suggests using a token bucket algorithm. Here's the comparison:
- My approach: Sliding window...
- Gemini's approach: Token bucket with...
```

### Compare Solutions

```
You: Here's my sorting algorithm. Have Gemini review it and compare approaches.

Claude: Let me get Gemini's analysis of your sorting implementation...
[Uses query_gemini tool]

Gemini's feedback: ...
```

### Leverage Gemini's Strengths

```
You: Ask Gemini to analyze this mathematical proof for logical errors.

Claude: I'll have Gemini examine the proof...
[Uses query_gemini tool]
```

### Check Token Usage Before Querying

```
You: How many tokens would this prompt use with Gemini?

Claude: Let me count the tokens...
[Uses count_gemini_tokens tool]

This text would use approximately 1,250 tokens.
```

### Multi-turn Conversations

```
You: Start a conversation with Gemini about Rust's ownership model.

Claude: [Uses query_gemini tool]
Gemini explains: Rust's ownership model is based on three rules...

You: Ask Gemini to give an example of borrowing.

Claude: [Uses query_gemini with history from previous turn]
Gemini continues: Here's an example of borrowing...
```

---

## Configuration

Configure the server using environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLOUD_PROJECT` | Yes | - | Google Cloud project ID hosting Vertex AI |
| `GOOGLE_CLOUD_LOCATION` | No | `global` | Vertex AI location. Newer preview models (e.g. `gemini-3-pro-preview`, `gemini-3.1-pro-preview`) are only served from `global` — regional endpoints like `us-central1` return 404 for those models. Override only if every model you call is available in that region. |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | - | Path to a service-account JSON key. Falls back to Application Default Credentials when unset. |
| `GEMINI_DEFAULT_MODEL` | Yes | - | Gemini model to use for queries |
| `GEMINI_MAX_OUTPUT_TOKENS` | No | `65536` | Max output tokens injected into requests |
| `GEMINI_TIMEOUT_MS` | No | `300000` | Request timeout in milliseconds |
| `LOG_LEVEL` | No | `info` | Log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) |

### Vertex AI location (`GOOGLE_CLOUD_LOCATION`)

This server defaults to `global` because the newest preview Gemini models — including `gemini-3-pro-preview` and `gemini-3.1-pro-preview` — are **only** served from the `global` location. Pointing the client at a regional endpoint (`us-central1`, `europe-west4`, etc.) will return a 404 for those models, which surfaces as a `GEMINI_MODEL_NOT_FOUND` error.

Override `GOOGLE_CLOUD_LOCATION` only if **every** model you intend to call is available in that region. Check per-model availability at https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations before pinning a region.

---

## Other MCP Clients

While this server is optimized for Claude Code, it works with any MCP-compatible client.

### Claude Desktop

Add to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["/absolute/path/to/gemini-for-claude-mcp/dist/app.js"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GEMINI_DEFAULT_MODEL": "gemini-2.5-flash"
      }
    }
  }
}
```

### Generic stdio Clients

This server uses stdio transport. Start it with:

```bash
GOOGLE_CLOUD_PROJECT=your-gcp-project-id \
GEMINI_DEFAULT_MODEL=gemini-2.5-flash \
node dist/app.js
```

This relies on Application Default Credentials. To use a service-account key instead, also export `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`.

The server communicates via stdin/stdout using the MCP protocol.

---

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Run in development mode with hot reload |
| `npm start` | Run the compiled server |
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run typecheck` | Type-check without emitting files |

### Project Structure

```
src/
├── domain/           # Business logic (zero external dependencies)
│   ├── entities/     # Business objects (GeminiModel, GeminiPrompt, etc.)
│   ├── ports/        # Interfaces for external services
│   ├── use-cases/    # Application logic
│   └── errors/       # Domain-specific errors
├── infrastructure/   # External integrations
│   ├── adapters/     # Port implementations
│   ├── controllers/  # MCP request handlers
│   ├── schemas/      # Zod validation schemas
│   └── mcp/          # MCP server and tool definitions
├── config/           # Environment validation
├── shared/           # Cross-cutting utilities
└── app.ts            # Entry point
```

---

## Tool Reference

Technical details for developers integrating with or extending the MCP tools.

### query_gemini

Query Google's Gemini AI models for text generation, reasoning, and analysis tasks. The model is configured via the `GEMINI_DEFAULT_MODEL` environment variable.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | The prompt to send to Gemini (1-100,000 chars) |
| `history` | array | No | - | Previous conversation turns for multi-turn conversations |
| `stream` | boolean | No | `true` | Stream response progressively |

**History Array Item Schema:**

```json
{
  "role": "user" | "model",
  "content": "string"
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "response": "Recursion is a programming technique where a function calls itself...",
    "model": "gemini-3-pro-preview",
    "finishReason": "STOP",
    "tokenUsage": {
      "prompt": 12,
      "completion": 150,
      "total": 162
    }
  }
}
```

---

### list_gemini_models

List popular Gemini AI models that can be configured via the `GEMINI_DEFAULT_MODEL` environment variable.

**Parameters:** None

**Example Response:**

```json
{
  "success": true,
  "data": {
    "count": 4,
    "models": [
      {
        "name": "gemini-3-pro-preview",
        "displayName": "Gemini 3 Pro Preview",
        "description": "Most advanced reasoning model with 1M context - best for complex tasks"
      },
      {
        "name": "gemini-2.5-pro",
        "displayName": "Gemini 2.5 Pro",
        "description": "Capable thinking model for complex reasoning, code, math, and STEM"
      },
      {
        "name": "gemini-2.5-flash",
        "displayName": "Gemini 2.5 Flash",
        "description": "Fast and efficient for most tasks with excellent performance"
      },
      {
        "name": "gemini-2.0-flash",
        "displayName": "Gemini 2.0 Flash",
        "description": "Multimodal model optimized for speed and cost-efficiency"
      }
    ]
  }
}
```

---

### count_gemini_tokens

Count the number of tokens in a text string for the configured Gemini model.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | The text to count tokens for (1-1,000,000 chars) |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "totalTokens": 10,
    "model": "gemini-3-pro-preview"
  }
}
```

---

## Architecture

This project follows **Clean Architecture** (Ports and Adapters) principles:

- **Domain Layer** - Core business logic with zero external dependencies
- **Infrastructure Layer** - External integrations (Gemini SDK, MCP SDK)
- **Strict Dependency Rule** - Dependencies always point inward

For detailed architectural documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Troubleshooting

### Claude Code Issues

**"Server not found" or tools not appearing**
- Verify the MCP server is added: `claude mcp list`
- Check the path to `dist/app.js` is absolute and correct
- Ensure the project has been built: `npm run build`

**"GOOGLE_CLOUD_PROJECT is required"**
- Verify the project ID is set in the MCP configuration
- Check with: `claude mcp list` to see environment variables

**"Could not load the default credentials" / 401 Unauthorized**
- Run `gcloud auth application-default login` to refresh ADC
- Or set `GOOGLE_APPLICATION_CREDENTIALS` to a valid service-account JSON key
- Confirm the principal has `roles/aiplatform.user` on the project

**"Permission denied on resource project ..."**
- The Vertex AI API may not be enabled. See [Enable the API](https://cloud.google.com/vertex-ai/docs/start/cloud-environment).
- The service account or user lacks `roles/aiplatform.user`.

**Server crashes on startup**
- Check Node.js version: `node --version` (must be 20+)
- Verify dependencies are installed: `npm install`

### API Issues

**"Rate limit exceeded"**
- Gemini API has rate limits; wait and retry
- Consider using `gemini-2.0-flash` for higher rate limits

**"Content filtered" error**
- Gemini has content safety filters
- Rephrase your prompt to avoid triggering filters

**Streaming not working**
- Streaming is enabled by default
- Set `stream: false` in your query if needed

### Debug Mode

Enable debug logging for troubleshooting:

```bash
claude mcp add gemini \
  -e GOOGLE_CLOUD_PROJECT=your-gcp-project-id \
  -e GEMINI_DEFAULT_MODEL=gemini-2.5-pro \
  -e LOG_LEVEL=debug \
  -- node /path/to/dist/app.js
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes following the code standards in [CLAUDE.md](CLAUDE.md)
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit with conventional commits: `git commit -m "feat: add new feature"`
7. Push and create a Pull Request

### Code Standards

- TypeScript strict mode required
- All exported functions need explicit return types
- Use `neverthrow` Result pattern for error handling
- Validate inputs with Zod at boundaries
- 100% test coverage for domain layer

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - The CLI tool this server is built for
- [Model Context Protocol](https://modelcontextprotocol.io) - The protocol enabling this integration
- [Google Gemini](https://ai.google.dev/) - The AI models powering this server
