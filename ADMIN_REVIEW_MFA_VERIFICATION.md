# Admin review MFA gate — staged verification

Part of Issue #292. This migration has not been applied to production.

## Reproduced boundary
Read-only inspection of deployed public.nuru_admin_review(text,uuid,text) found a super_admin role check but no explicit JWT assurance check. The SECURITY DEFINER function writes as its owner, so the restrictive staff AAL2 table policies cannot be relied on for this path.

A synthetic local PostgreSQL fixture reproduces an AAL1 super admin successfully approving an item through the pre-fix function while direct table access is denied. The fixture contains fabricated UUIDs and no production records or credentials.

## Change
Require auth.jwt()->>'aal' = 'aal2' after checking the stored super_admin role and before locking or updating any row. Preserve bounded approve/reject behavior, atomic audit insertion and anonymous EXECUTE denial. Reject null kind/action values explicitly.

## Verification
Six executable SQL cases cover the pre-fix AAL1 boundary, denied/missing/malformed assurance, non-admin and anonymous denial, AAL2 approve/reject audit accuracy, invalid/null input and absent items, and audit-failure rollback. Tests use pinned dev-only @electric-sql/pglite 0.5.10 (PostgreSQL 18.6); production is PostgreSQL 17.6 at the last read-only inventory. This validates the function on a minimal synthetic schema, not the entire deployed Supabase schema, JWT issuance, MFA enrollment or full migration history.

The migration file was created with Supabase CLI. No live role/permission/schema/data changes were made. Existing audit table/function drift must be reconciled in a QA PostgreSQL 17 backend before applying. The available Supabase branch inventory contains only the default branch and reports historical MIGRATIONS_FAILED; it is not a staging environment.

## Release blockers
- Reconcile schema drift, apply and test on a QA-only PostgreSQL 17 backend.
- Verify the admin UI/Streamlit flow can obtain AAL2 and handles an MFA-required error without falsely reporting approval.
- Run complete role RLS/advisor checks and backup/restore rehearsal in that environment.
- Inspect the exact production function/grants again immediately before any approved release; do not overwrite a definition that changed since this read.

Keep this PR draft. Deploying the migration now could block existing non-MFA admin clients. A passing fixture test does not remove the release blockers.
