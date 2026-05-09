# ARCHITECTURE GUIDE: Gemini MCP Server

This project is built using **Clean Architecture** (also known as Ports and Adapters). This design ensures high testability, strict separation of concerns, and maximum decoupling between the core business logic and external infrastructure details.

The goal is simplicity, clarity, and efficiency, prioritizing explicit dependency management over convention-heavy frameworks.

---

## 1. Guiding Principles

1. **Strict Separation of Concerns:** Core business logic (Domain/Use Cases) must be 100% agnostic of the outside world (MCP, HTTP, external APIs).
2. **Explicit Dependencies (DI):** Dependencies are always injected via constructor. No heavy IoC containers or global state.
3. **Strict Dependency Rule:** Dependencies must always point **inward**. Outer layers may know about inner layers, but inner layers **must not** know about outer layers.
4. **Concise Output:** When communicating with the Model Context Protocol (MCP), prioritize summarized, actionable, and token-efficient responses.

---

## 2. Project Structure

Since this is a **single-purpose MCP server** (Gemini integration), we use a **flattened structure** instead of feature-based nesting. This reduces unnecessary indirection while maintaining Clean Architecture principles.

```
src/
├── domain/                     # CORE: Business logic (zero external dependencies)
│   ├── entities/               # Business objects (GeminiModel, GeminiPrompt, etc.)
│   ├── ports/                  # Interfaces for external services (IGeminiClient)
│   ├── use-cases/              # Application logic (QueryGemini, ListModels, CountTokens)
│   └── errors/                 # Domain-specific errors (GeminiApiError, etc.)
├── infrastructure/             # DETAILS: External integrations
│   ├── adapters/               # Port implementations (GoogleGeminiClientAdapter)
│   ├── controllers/            # MCP request handlers (validate input, call use case)
│   ├── schemas/                # Zod validation schemas for MCP inputs
│   └── mcp/                    # MCP server, tool registry, tool definitions
├── config/                     # Environment validation (Zod)
│   └── env.config.ts
├── shared/                     # Cross-cutting utilities
│   ├── errors/                 # DomainError hierarchy (base classes)
│   ├── logger/                 # ILogger interface + pino implementation
│   └── types/                  # McpToolResponse types
└── app.ts                      # Entry point with DI wiring
```

### Why Flattened?

- **Single-purpose server**: This MCP server has one job—expose Gemini capabilities. Feature-based nesting (`features/gemini/`) adds unnecessary depth.
- **Simpler navigation**: Fewer directories to traverse.
- **Clear boundaries**: `domain/` vs `infrastructure/` separation is still enforced at the top level.

---

## 3. Layer Definitions (Inside-Out)

### 3.1. 🟢 Domain (The Core)

The innermost layer holding business logic. **Zero external dependencies (no MCP SDK, no Gemini SDK, no HTTP).**

- **`entities/`**: Pure TypeScript interfaces representing business concepts (e.g., `GeminiPrompt`, `GeminiResponse`).
- **`ports/`**: TypeScript interfaces defining contracts for external services. These are the "holes" the infrastructure must plug.
  - Example: `IGeminiClient` defines `generateContent()`, `countTokens()`, `listModels()`
- **`use-cases/`**: Application service layer. These classes orchestrate specific business tasks, depending only on Entities and Ports.
  - Example: `QueryGeminiUseCase` validates input, calls the port, transforms output.
- **`errors/`**: Domain-specific error classes extending `DomainError`.

### 3.2. 🟡 Infrastructure (The Details/Adapters)

Implements the contracts defined by Ports and handles all external communication.

- **`adapters/`**: Implementations of domain Ports.
  - Example: `GoogleGenAIClientAdapter` implements `IGeminiClient` using the `@google/genai` SDK against Vertex AI.
- **`controllers/`**: MCP request handlers. Receive raw input, validate with Zod schemas, call use cases, format responses.
- **`schemas/`**: Zod validation schemas for MCP tool inputs.
- **`mcp/`**: MCP server setup using `@modelcontextprotocol/sdk`, tool registry, and tool definitions with JSON schemas.

---

## 4. MCP Communication Contract

### Tool Discovery (`tools/list`)

- Every Use Case exposed to the MCP client must be registered with a precise **JSON Schema**.
- The `description` field must be semantically rich, explaining when and how the tool should be used.

### Tool Execution (`tools/call`)

1. MCP Adapter receives `tools/call` request.
2. Looks up the registered handler by tool name.
3. Calls the controller, which validates input and invokes the use case.
4. Use case returns a `Result<T, DomainError>` (using `neverthrow`).
5. Controller transforms result into `McpToolResponse` format.

**Response Requirements:**
- Responses must be **summarized, relevant, and token-efficient**.
- Avoid returning raw database records or verbose logs.

---

## 5. Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript (Strict Mode) |
| Runtime | Node.js 20+ |
| MCP SDK | `@modelcontextprotocol/sdk` |
| AI SDK | `@google/genai` (Vertex AI mode) |
| Error Handling | `neverthrow` (Result pattern) |
| Validation | `zod` |
| Logging | `pino` |
| Testing | Jest |

---

## 6. Development Checklist

| Task | Location / Layer | Principle Applied |
|:-----|:-----------------|:------------------|
| **Business Logic** | `domain/use-cases/` | Clean, Testable Core |
| **Data Access Interface** | `domain/ports/` | Decoupling (Port) |
| **External API Implementation** | `infrastructure/adapters/` | Adapter Implementation |
| **MCP Request Handling** | `infrastructure/controllers/` | Protocol Handling |
| **Tool Definitions** | `infrastructure/mcp/tools/` | JSON Schema, Semantic Descriptions |
| **Input Validation** | `infrastructure/schemas/` | Zod at Boundaries |
| **Testing Use Cases** | `domain/use-cases/__tests__/` | 100% coverage, mock only ports |

---

## 7. Dependency Flow

```
app.ts (entry point)
    │
    ├── config/ (loads environment)
    ├── shared/ (logger, base errors)
    │
    └── Wires dependencies:
        │
        ├── infrastructure/adapters/ ──implements──▶ domain/ports/
        │           │
        │           └── uses: @google/genai SDK (Vertex AI)
        │
        ├── domain/use-cases/ ◀──depends on── domain/ports/ (interfaces only)
        │           │
        │           └── returns: Result<T, DomainError>
        │
        ├── infrastructure/controllers/ ──calls──▶ domain/use-cases/
        │           │
        │           └── validates with: infrastructure/schemas/
        │
        └── infrastructure/mcp/ ──registers──▶ controllers as tool handlers
```

**Key Invariant**: `domain/` never imports from `infrastructure/`. Dependencies point inward only.
