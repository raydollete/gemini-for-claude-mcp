# CLAUDE.md

This file provides mandatory guidance to Claude Code when working with this repository. **All standards are non-negotiable.**

## Project Overview

MCP server bridging Gemini AI capabilities to Claude Code. Built with Clean Architecture (Ports and Adapters) and Feature-Based Structure.

**Reference**: See `ARCHITECTURE.md` for detailed architectural patterns.

---

## MANDATORY STANDARDS

### 1. TypeScript Configuration (Non-Negotiable)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

**FORBIDDEN:**
- `any` type - use `unknown` with type guards
- Type assertions (`as`) without prior narrowing
- Non-null assertions (`!`) - handle nullability explicitly
- `@ts-ignore` or `@ts-expect-error` without linked issue

**REQUIRED:**
- Explicit return types on all exported functions
- `readonly` on all properties that should not mutate
- Discriminated unions for complex state

---

### 2. Error Handling (neverthrow Pattern)

All use cases MUST return `Result<T, E>` from neverthrow:

```typescript
import { Result, ok, err } from 'neverthrow';

type UseCaseResult<T> = Result<T, DomainError>;

// CORRECT
async execute(input: Input): Promise<UseCaseResult<Output>> {
  if (!valid) return err(new ValidationError('Invalid input'));
  return ok(result);
}

// FORBIDDEN - raw throws in use cases
async execute(input: Input): Promise<Output> {
  throw new Error('Something went wrong'); // NEVER
}
```

**Domain Errors**: Define typed error classes per feature:
```typescript
abstract class DomainError {
  abstract readonly code: string;
  abstract readonly message: string;
}

class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  constructor(readonly message: string) { super(); }
}
```

---

### 3. Input Validation (Zod Required)

All MCP tool inputs MUST be validated with Zod schemas:

```typescript
import { z } from 'zod';

const ToolInputSchema = z.object({
  query: z.string().min(1).max(1000),
  options: z.object({
    limit: z.number().int().positive().max(100).default(10),
  }).optional(),
});

type ToolInput = z.infer<typeof ToolInputSchema>;

// Validate at controller/adapter boundary - NEVER in domain
const parsed = ToolInputSchema.safeParse(rawInput);
if (!parsed.success) {
  return err(new ValidationError(parsed.error.message));
}
```

**FORBIDDEN:**
- Trusting unvalidated input in use cases
- Manual validation without schema
- Validation logic inside domain layer

---

### 4. Testing Standards (Jest)

**Coverage Requirements:**
- Domain layer: **100%** (entities, use-cases, ports)
- Infrastructure: **80%+**
- Integration tests for every MCP tool

**Test Structure:**
```typescript
describe('FeatureName', () => {
  describe('UseCaseName', () => {
    it('should_returnSuccess_when_validInput', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should_returnError_when_invalidInput', async () => {
      // Arrange
      // Act
      // Assert - verify Result.isErr()
    });
  });
});
```

**FORBIDDEN:**
- Mocking domain entities
- Tests without assertions
- `test.skip` or `it.skip` in main branch
- Snapshot tests for logic (only for serialization)

**REQUIRED:**
- Test file location: `__tests__/` adjacent to source
- Naming: `[filename].test.ts`
- Use `jest.fn()` only for ports/adapters

---

### 5. Security Requirements

**Secrets:**
- Environment variables ONLY via validated config
- NEVER hardcode API keys, tokens, credentials
- Use `zod` to validate all env vars at startup

```typescript
const EnvSchema = z.object({
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_LOCATION: z.string().min(1).default('global'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const config = EnvSchema.parse(process.env);
```

**MCP Security:**
- Sanitize all tool outputs (no leaking internal errors)
- Implement timeout for long-running operations
- Log tool invocations (without sensitive data)

**FORBIDDEN:**
- `eval()` or `Function()` constructor
- Dynamic require/import with user input
- Exposing stack traces in MCP responses

---

### 6. Code Quality Gates

**ESLint (Mandatory Rules):**
```json
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/explicit-function-return-type": "error",
  "@typescript-eslint/no-unused-vars": "error",
  "@typescript-eslint/strict-boolean-expressions": "error",
  "no-console": "error"
}
```

**File Limits:**
- Max 300 lines per file
- Max 50 lines per function
- Max 3 levels of nesting

**Naming Conventions:**
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Interfaces: `IPortName` for ports only

---

### 7. MCP Tool Standards

**Tool Registration:**
- Every tool MUST have complete JSON Schema
- Description MUST explain when/why AI should use it
- Include input constraints in description

**Response Format:**
```typescript
interface McpToolResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

**FORBIDDEN:**
- Returning raw database records
- Responses exceeding 4KB without pagination
- Unstructured error messages

---

### 8. Architecture Enforcement

**Dependency Rule Violations = PR Rejection:**
- Domain MUST NOT import from infrastructure
- Use cases depend ONLY on ports (interfaces)
- Infrastructure implements ports

**Allowed Import Directions:**
```
app.ts → infrastructure → domain
              ↓
          use-cases → entities
              ↓
            ports (interfaces only)
```

---

### 9. Git Standards

**Commit Messages:**
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**Branch Naming:**
- `feat/description`
- `fix/description`
- `refactor/description`

**PR Requirements:**
- All tests pass
- Coverage thresholds met
- No ESLint errors
- Approved review

---

## Quick Reference

| Aspect | Standard |
|--------|----------|
| Error Handling | `neverthrow` Result pattern |
| Validation | Zod schemas at boundaries |
| Testing | Jest, 100% domain coverage |
| TypeScript | Strict mode, no `any` |
| Secrets | Env vars + Zod validation |
| File Size | Max 300 lines |
| Function Size | Max 50 lines |
