# Admin Studio / Cyber Security / Test Site

**Status: security-gated scaffold; not production-ready until deployment configuration is completed.**

## Security model

- The Admin Studio page is not secret. Noindex and an obscure URL are not access controls.
- The browser can request an Admin+ status, but only the Edge Function decides. It must validate the Supabase access token with auth.getUser() and check the verified immutable Auth user UUID against the server-side FISCH_ADMIN_USER_IDS secret.
- Never authorize using the 12-character Friend ID, a browser-supplied role, localStorage, query parameters, or a JavaScript constant. Friend IDs are identifiers, not credentials.
- Fail closed if FISCH_ADMIN_USER_IDS is missing or malformed. Do not expose service-role keys to browser code.
- The Admin Studio must not receive production mutation commands. Any future test commands must use a separate Supabase project and separate credentials.
- Do not add release/deploy, user deletion, arbitrary SQL, or production save-editing controls to the test panel.

## Required Supabase Edge Function secret

Set FISCH_ADMIN_USER_IDS in the Supabase Edge Function secret configuration to a comma-separated list of verified Supabase Auth user UUIDs, e.g. uuid-a,uuid-b. Do not put the example into production. The UUID is shown in the authenticated Admin Studio only after login; copy it from the account you personally control, then add it through Supabase's secret management. Never commit this value to Git.

Deploy the updated fisch-api Edge Function after setting the secret. If the secret is absent, the admin endpoint must return 403.

## Test environment isolation

Before implementing live test controls, create a separate Supabase project for staging. Use separate Auth providers/redirect URLs, database, Edge Function secrets, storage, and project URL. Do not reuse the production service-role key. Set a separate test data namespace and never import staging data into production automatically.

## Release gate

1. Run unit tests, static checks, build and resource-integrity checks.
2. Run authorization tests: no token, expired token, valid non-admin token, missing admin secret, and valid allowlisted admin token.
3. Verify test mutations cannot reach the production Supabase project.
4. Review logs for secret/token leakage and test mobile layout.
5. Submit a pull request for human review. Merge/deploy only after checks pass and the owner approves.

## Current limitations

The first scaffold adds an authentication gate and Admin+ status check only. It does not yet provide test-data mutation, audit-log persistence, rate limiting, MFA enforcement, or automatic release promotion. Those features must be implemented and tested before calling the Admin/Test environment complete.
