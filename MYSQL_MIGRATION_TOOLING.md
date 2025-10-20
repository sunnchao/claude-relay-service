# MySQL Migration Tooling Checklist

This checklist consolidates the operational commands, scripts, and safeguards required to migrate data from Redis to MySQL while keeping Claude Relay Service available.

## 1. Preparation
- **Freeze traffic**: Schedule a maintenance window and stop inbound requests (disable load balancer, scale replicas to zero, or enable maintenance banner).
- **Backup Redis**:
  - `npm run data:export` to capture logical backups into `data/backup/`.
  - Optionally run `redis-cli SAVE` and archive `.rdb` files for physical backup.
- **Provision MySQL schema**:
  - Execute `npm run db:init` to create the schema defined in `src/models/mysql/schema.sql`.
  - Verify admin credentials and initial data via `mysql -u <user> -p <db>` queries.

## 2. Migration Commands
- **Dry run** (optional): invoke `node scripts/migrate-redis-to-mysql.js --dry-run` (add flag handling if necessary) to validate connectivity without writing data.
- **Full migration**: run `npm run migrate:redis-to-mysql` and monitor per-entity progress (API keys, accounts, usage stats, cost stats, sessions).
- **Hybrid cache warm-up**: after migration, execute `npm run rebuild:cache` or equivalent cache seeding commands to reduce cold-start latency.

## 3. Verification Steps
- **Row counts**: compare counts between Redis exports and MySQL tables (`SELECT COUNT(*) FROM api_keys;` etc.).
- **Spot checks**: fetch random keys/accounts via admin UI or API to confirm parity.
- **Usage metrics**: ensure `usage_stats`, `cost_stats`, and `usage_records` contain expected aggregates for the last 24h.
- **Concurrency leases**: confirm `concurrency_leases` table is empty/clean after restart.

## 4. Rollback Plan
- Preserve Redis backup and keep Redis service running in read-only mode until MySQL path is certified stable.
- To revert, set `DATABASE_TYPE=redis`, redeploy, and (if necessary) import data via `npm run data:import`.

## 5. Automation Enhancements
- Integrate migration scripts into CI/CD pipelines with approval gates.
- Emit structured logs/metrics during migration (duration, records migrated, error counts) to observability stack.
- Parameterize scripts via environment variables for connection overrides (host, port, SSL, timeouts).

Following this checklist ensures operators have a repeatable, auditable process for moving production workloads from Redis to MySQL.
