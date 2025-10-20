# MySQL Migration Validation & Documentation Tasks

## 1. Functional Validation
- **Runtime smoke test**: start the service with `DATABASE_TYPE=mysql` and confirm core flows (admin login, API key issuance, relay API request) complete without errors.
- **Automated checks**: run `npm run lint` and targeted Jest suites once MySQL repositories are in place; extend/enable database-backed tests as needed.
- **Health endpoints**: verify `/status`, `/metrics`, and any custom diagnostics reflect MySQL connectivity metrics.

## 2. Data Integrity Audits
- **Token/cost totals**: cross-verify Redis vs MySQL aggregates for the last day/week using the admin dashboard or SQL queries (`usage_stats`, `cost_stats`).
- **Account credentials**: ensure encrypted columns round-trip correctly by performing OAuth refresh or token rotation flows.
- **Session lifecycle**: validate login/logout and sticky session behaviour, checking that expiration timestamps decrement as expected.

## 3. Documentation Updates
- **README & deployment guides**: add clear instructions for switching `DATABASE_TYPE`, configuring MySQL credentials, and running migration scripts.
- **Operational runbooks**: include backup/restore guidance, slow query troubleshooting tips, and pool tuning recommendations.
- **Changelog / release notes**: communicate breaking changes, required environment variables, and migration timelines to operators.

## 4. Monitoring & Alerting
- **Connection pool metrics**: surface connection usage, queue length, and error counts via existing logging/metrics stack.
- **Slow query log**: enable MySQL slow query logging in staging/production and feed into observability dashboards.
- **Alert thresholds**: define alert rules for replication lag (if using replicas), high error rates, or migration script failures.

Completing the above tasks ensures the MySQL migration is verifiable, documented, and operationally supportable.
