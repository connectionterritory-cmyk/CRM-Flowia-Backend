// [MIGRATION-AUDIT]
// This file is DEPRECATED and DISCONNECTED.
// Direct TCP connections to Postgres are blocked in this environment (cPanel Shared Hosting).
// All database access MUST use Supabase JS Client (HTTPS).
// This file exists only to prevent crash on import until all references are removed.

module.exports = require('./legacyDatabase');
