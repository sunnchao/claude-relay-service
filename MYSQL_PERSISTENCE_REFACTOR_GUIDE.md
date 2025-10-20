# MySQL Persistence Refactor Guide

This guide enumerates the concrete engineering tasks required to rework the Claude Relay Service persistence layer so that MySQL becomes the primary backing store (with optional Redis caching).

## 1. Repository Abstraction
- **Create shared interfaces**: Define repository contracts (`ApiKeyRepository`, `AccountRepository`, `UsageRepository`, etc.) describing CRUD and query behaviours currently implemented in `src/models/redis.js`.
- **Introduce dependency injection**: Update service constructors to accept repository instances instead of reaching for the global Redis client. Register MySQL or Redis implementations based on `DATABASE_TYPE` at application bootstrap.
- **Maintain backwards compatibility**: Ensure Redis repositories continue to satisfy the same interfaces so hybrid deployments only require configuration changes.

## 2. MySQL Repository Implementations
- **API key management**: Port existing logic from `redis.js#setApiKey`/`getApiKey`/`findApiKeyByHash` into SQL-backed methods that leverage indexed columns and transactions for concurrent updates.
- **Account storage**: Implement MySQL-backed repositories for Claude, OpenAI, Gemini, and Droid account entities, including encryption of sensitive fields via the helper functions exposed in `mysql.js`.
- **Usage + cost statistics**: Translate token/cost aggregation helpers into SQL upserts (reusing `usage_stats`, `cost_stats`, `usage_records` tables) and provide read helpers mirroring current JSON responses.
- **Session & concurrency control**: Replace Redis TTL semantics with equivalent SQL workflows using `expires_at` columns and scheduled cleanup.
- **Feature flags / cache keys**: Implement lightweight `key-value` tables for generic flags currently stored in Redis hashes (e.g., `webhook:config`, rate-limit markers, sticky sessions) so the higher-level API remains unchanged.

## 3. Service Layer Refactor
- **Update imports**: Replace direct `require('../models/redis')` statements with dependency-injected repositories in all services, routes, and middleware.
- **Normalize return shapes**: Ensure MySQL repository methods return the same data structures consumed today (e.g., string booleans, JSON-encoded arrays) so UI/API contracts do not change.
- **Cache strategy**: Reintroduce Redis (or in-memory LRU) caching only for latency-sensitive reads (API key lookups, sticky session affinity) without storing ground-truth data.
- **Graceful fallbacks**: Where Redis `client` methods (`get`, `setex`, `del`, `keys`) were used for auxiliary tasks, provide utility wrappers that dispatch to Redis when available or to SQL/in-memory alternatives when running in MySQL-only mode.

## 4. Transaction & Error Handling
- **Wrap critical writes**: Use transactions for multi-table mutations (e.g., migration scripts, account+key updates) to avoid partial writes.
- **Deadlock retries**: Add retry logic for common MySQL deadlock codes (`1213`, `1205`) especially around high-contention tables like `usage_stats`.
- **Input validation**: Mirror Redis-era defensive checks (null guards, defaults) before committing SQL statements to maintain data integrity.

## 5. Testing Strategy
- **Unit tests**: Add repository-level tests using an ephemeral MySQL instance (e.g., `mysql2` with tmp schema) verifying CRUD flows and edge cases.
- **Integration smoke tests**: Execute end-to-end scenarios (API key issuance, chat relay, billing increments) under `DATABASE_TYPE=mysql` to confirm behavioural parity.
- **Data migration validation**: After running migration scripts, cross-check Redis vs MySQL counts, sample records, and aggregates as part of automated test suites.

## 6. Rollout Considerations
- **Feature flags**: Gate the MySQL-backed repositories behind a config flag to enable staged rollouts.
- **Monitoring**: Extend existing metrics collectors to emit MySQL connection pool metrics, slow query warnings, and error rates.
- **Operational playbooks**: Document backup, restore, and failover procedures for MySQL similar to existing Redis runbooks.

Delivering the above ensures services no longer rely on Redis for persistent data, enabling MySQL to deliver improved query flexibility and durability while preserving existing APIs.
