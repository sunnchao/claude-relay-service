# MySQL Repository Gap Analysis

Automated comparison of async methods between `src/models/redis.js` and `src/models/mysql.js` shows the following Redis features lacking MySQL implementations:

- `del`
- `deleteApiKeyHash`
- `deleteDroidAccount`
- `deleteOpenAiAccount`
- `deleteSessionAccountMapping`
- `extendSessionAccountMappingTTL`
- `get`
- `getAccountDailyCost`
- `getAccountSessionWindowUsage`
- `getAccountUsageStats`
- `getAllAccountsUsageStats`
- `getAllDroidAccounts`
- `getAllOpenAIAccounts`
- `getApiKeyHash`
- `getDroidAccount`
- `getOpenAiAccount`
- `getRealtimeSystemMetrics`
- `getSessionAccountMapping`
- `getSystemAverages`
- `getSystemStats`
- `getTodayStats`
- `incrementAccountUsage`
- `keys`
- `resetAllUsageStats`
- `set`
- `setApiKeyHash`
- `setDroidAccount`
- `setOpenAiAccount`
- `setSessionAccountMapping`
- `setex`

Next steps:
1. Implement MySQL equivalents (or adapters) for the above methods.
2. Update service layers to consume the database adapter instead of Redis directly.
3. Provide compatibility wrappers for generic `get`/`set` caching operations (possibly backed by Redis or in-memory cache when MySQL-only).
