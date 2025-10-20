# Claude Relay Service: Redis to MySQL Migration Plan

## 1. Objectives
- Replace Redis-only persistence with a MySQL-backed implementation that matches existing features and improves query capabilities.
- Maintain optional Redis usage path during transition via a pluggable data access layer.
- Provide tooling to initialize MySQL schema and migrate existing Redis data with minimal downtime.
- Update configuration, deployment scripts, and documentation to reflect MySQL support.

## 2. Scope
1. Introduce a database abstraction layer that can target Redis or MySQL based on configuration.
2. Implement MySQL models/repositories mirroring current Redis data structures (API keys, accounts, usage stats, cost stats, sessions, concurrency leases, etc.).
3. Add initialization scripts to provision schema and seed default records.
4. Deliver migration commands/scripts to transfer live data from Redis to MySQL safely.
5. Update environment configuration, Docker assets, and CI scripts to support MySQL.
6. Refresh operational documentation (README, deployment guides) with MySQL instructions and rollback plans.

## 3. Phased Work Breakdown

### Phase A: Analysis & Design
- Audit current Redis-backed repositories/services in `src/` to catalog required entities and operations.
- Map Redis data structures to relational schema defined under `database/mysql/schema.sql` (or create as needed).
- Design adapter interface(s) enabling runtime selection between Redis and MySQL implementations.
- Identify critical performance paths (auth, key lookup, usage logging) to ensure parity.

### Phase B: Configuration & Infrastructure
- Extend configuration loader to recognize `DATABASE_TYPE=mysql` plus MySQL connection options.
- Provide connection pool setup using `mysql2` (or existing dependency) with sensible defaults and error handling.
- Update Docker/Docker Compose files to include optional MySQL service and environment variables.
- Ensure secret management (passwords, encryption keys) remains compatible.

### Phase C: Persistence Layer Refactor
- Implement MySQL repositories/services for each entity with transactional integrity.
- Refactor business logic to depend on database-agnostic interfaces injected via dependency container.
- Preserve Redis implementations to allow toggling via configuration.
- Add unit/integration coverage for new MySQL repositories (mocked DB or test containers if feasible).

### Phase D: Tooling & Migration Scripts
- Provide schema initialization command (`npm run db:init`) executing SQL migrations.
- Build data migration script `npm run migrate:redis-to-mysql` to move live data with logging and validation.
- Create backup/export utilities leveraging existing Redis export and new MySQL dump instructions.
- Document rollback procedure to revert to Redis if migration fails.

### Phase E: Documentation & Verification
- Update README(s), `MYSQL_MIGRATION.md`, and deployment guides with MySQL setup, configuration, and maintenance steps.
- Record testing strategy, including smoke tests against MySQL and connection health checks.
- Validate project by running lints/tests and performing manual sanity checks of core flows (auth, usage logging).
- Provide release notes summarizing migration impact and required operator actions.

## 4. Deliverables Checklist
- [ ] Configurable database adapter supporting Redis and MySQL
- [ ] MySQL schema definitions and initialization scripts
- [ ] Data migration tooling with backup and verification steps
- [ ] Updated Docker Compose / deployment configurations
- [ ] Comprehensive documentation updates (README, migration guide)
- [ ] Test coverage or scripts validating MySQL path

## 5. Risks & Mitigations
- **Data integrity issues during migration**: implement transaction-based inserts, add dry-run option, and verify row counts post-migration.
- **Performance regressions**: benchmark critical queries, add indexes, and tune connection pooling.
- **Operational complexity**: provide clear instructions and automation for setup/maintenance to reduce human error.
- **Rollback difficulty**: maintain Redis compatibility and document quick switch-back procedure.

## 6. Timeline & Sequencing
1. Phase A (Analysis & Design)
2. Phase B (Configuration & Infrastructure)
3. Phase C (Persistence Layer Refactor)
4. Phase D (Tooling & Migration Scripts)
5. Phase E (Documentation & Verification)

Each phase builds on the previous; proceed sequentially and validate before continuing.
