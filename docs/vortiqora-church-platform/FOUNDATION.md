# Vortiqora Church Platform — independent product foundation

This is a separate commercial product, **not a feature of the Nuru Faith production app**.

## Mission
Equip churches to reconnect young people with Christian community through outreach, discipleship, mentorship, prayer, daily devotions and safe in-person/online fellowship throughout the week.

## Product boundaries (mandatory)
- Separate GitHub repository and Vercel project for the new product; do not point its production deployment to the Nuru Faith repository root.
- Separate Supabase project for the platform, with independent authentication, storage and database. Never copy live Nuru Faith user profiles, messages, prayer requests or credentials.
- Reuse only reviewed, license-compatible UI and feature code from Nuru Faith. No wholesale reuse of third-party music, licensed Bible translations or user-uploaded media.
- Preserve the Nuru Faith production application and domain.
- Use a tenant-aware schema with organization_id scoping, enforced row-level security, role-based administration and audited invitations. Never rely on client-side filtering for tenant isolation.
- Provide safeguarding workflows for youth/mentor interactions, moderation, reporting, privacy and consent.
- Publish a demo with synthetic data only, and never claim messaging or payments work before end-to-end testing.

## Initial modules
1. Church onboarding, branding, site settings and leadership roles.
2. Youth outreach events, invitations, small groups and attendance.
3. Devotions, Bible studies, prayer requests and moderated prayer circles.
4. Mentorship applications, vetted mentors, supervised communication and reporting.
5. Sermons, announcements and ministry calendars.
6. Church admin dashboard and data export.
7. Church inquiry, pricing and demo website.

## Delivery stages
1. Extract reusable design primitives and public-domain content into a clean independent codebase.
2. Build tenant-aware auth/database migrations and automated cross-tenant access tests.
3. Implement core modules and seed synthetic demo data.
4. Run typecheck, lint, unit, security, integration and browser smoke tests.
5. Deploy to a **new** Vercel preview project; verify preview before any public production launch.
6. Document perpetual customer usage rights versus Vortiqora core IP, church data ownership and ongoing third-party infrastructure fees.

## Affordable pricing hypothesis (subject to validated costs)
- Starter KSh 25,000: mobile-friendly church website, events, announcements, devotions and prayer intake.
- Youth Connect KSh 50,000: Starter plus groups, mentorship applications and basic admin.
- Church Complete KSh 95,000: separate Android app and advanced functions subject to scoped quote.
- Diocese from KSh 250,000: quote by parish count, integrations and support.

These are **not** promises of bespoke source-code transfer at these prices.
