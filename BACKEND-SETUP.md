# Secure portfolio backend setup

The frontend contains private inquiry and public-note forms, a moderated comment feed, an owner dashboard, and an opt-in analytics view. The comments workflow supports the complete lifecycle: visitors create pending notes; the public feed reads approved notes only; the owner can review, edit, approve, hide, archive, export, or permanently delete records. The production repository is connected to a dedicated Supabase project in Singapore, with the database migrations applied and the `portfolio-submit` Edge Function deployed. GitHub Actions supplies the public project URL and publishable key to the frontend build. The one-time owner Auth invitation is still required before the private admin console can be used; visitors can submit notes before then, but they remain pending and are not publicly visible.

## Architecture

- **Static frontend:** React/Vite hosted on GitHub Pages.
- **Database and authentication:** Supabase PostgreSQL + Supabase Auth.
- **Public intake:** `supabase/functions/portfolio-submit` validates inquiries/comments and consented page-view events, applies a server-side quota, optionally verifies Cloudflare Turnstile, then inserts through the service role.
- **Owner dashboard:** Supabase Auth password sign-in, followed by an allowlist check against `admin_users`. All database authorization is enforced again by RLS.
- **Analytics:** off by default. When a visitor opts in, the site records only a random session UUID, the path, and timestamp. Raw IPs, precise location, browser fingerprints, and user-agent strings are not stored. A one-way HMAC of the request network address is used only for rate limiting and is not reversible without the server secret.

The browser only receives the Supabase URL, anon/publishable key, and Turnstile site key. **Never expose `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, or `PORTFOLIO_RATE_LIMIT_SECRET` in a Vite variable, GitHub Pages artifact, source file, or browser storage.**

## 1. Create the Supabase project

1. Create a Supabase project and keep the project URL and anon/publishable key available for the frontend.
2. Apply **all** SQL migrations in `supabase/migrations/` in timestamp order. With the Supabase CLI, run `supabase db push` from the repository root. When using SQL Editor, execute each migration file in order. The `portfolio_security_hardening` migration moves admin and audit helpers into the non-exposed `private` schema. The `portfolio_owner_verified_allowlist` migration only allowlists the exact owner email after Supabase Auth confirms it. Do not skip either migration.
3. In **Authentication → Users**, send an invitation to `kingartriez@gmail.com` (your existing portfolio account email). Complete the invitation and verify the email address. The `portfolio_owner_verified_allowlist` trigger adds the confirmed account's UUID to `admin_users` automatically; it does not grant access to unverified accounts.
4. Disable public user sign-ups in **Authentication → Settings → User Signups** after the owner invitation is complete. Visitor comments do not require Auth accounts.
5. Do not create public policies for inquiry inserts, comment updates, analytics reads, or allowlist writes. The migrations intentionally grant anonymous visitors only approved-comment reads.


## Security hardening migration

The `portfolio_security_hardening` migration is required after the initial schema migration. It keeps authorization and audit `SECURITY DEFINER` helpers in the non-exposed `private` schema, explicitly restricts the server-only quota function to `service_role`, and prevents anonymous users from reaching administrator helper RPCs. The administrator predicate is available only to signed-in roles for RLS evaluation. The `private` schema must remain excluded from the project's exposed Data API schemas.

## 2. Configure and deploy the Edge Function

The hosted Edge Function reads `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` from Supabase's injected environment. It uses the project's default server-only secret key for privileged database writes and as the HMAC key for rate-limit buckets; no service-role/secret key needs to be copied into source control or the browser. The production origin defaults to `https://legioniz.github.io`. Optional overrides are `PORTFOLIO_ALLOWED_ORIGIN` and `PORTFOLIO_RATE_LIMIT_SECRET`. If either override is set, keep it in Supabase Function secrets only. Cloudflare Turnstile is optional; only configure `TURNSTILE_SECRET_KEY` when a matching frontend site key is also configured.

Deploy from the repository root:

```bash
supabase functions deploy portfolio-submit
```

The function is deployed with JWT gateway verification disabled because it accepts public submissions. It performs exact Origin validation, streamed request-size checks, a honeypot, server-side quotas, and optional Turnstile verification itself. Rate limiting is 4 inquiries, 6 comments, and 60 opt-in page-view events per ten-minute window per HMAC-derived network bucket. The GET readiness probe reports only whether required configuration is present; it never returns credentials.

Cloudflare Turnstile is recommended for inquiry and comment submissions. Configure a Turnstile site key for the published domain and set it in the frontend. When `TURNSTILE_SECRET_KEY` is configured on Supabase, a valid challenge token is required for public inquiry and comment submissions. Page-view events do not invoke Turnstile.

## 3. Configure the frontend

Copy `.env.example` to `.env.local` for local work and fill in the **public** values:

```text
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY
VITE_TURNSTILE_SITE_KEY=YOUR-CLOUDFLARE-TURNSTILE-SITE-KEY
```

The GitHub Actions workflow already has the project's public URL and publishable key as safe build fallbacks. You may override them with repository Actions variables if the project is moved. These public values are intentionally visible in the browser; authorization depends on RLS and Edge Function validation. Supabase's secret key remains available only inside the Edge Function.

## 4. Verify the controls before production

- Anonymous users can read only comments with `status = 'approved'`.
- Anonymous users cannot read, create directly, edit, archive, or delete inquiries/comments.
- Anonymous users cannot read analytics, allowlist records, quota rows, or administrator activity.
- The owner account can read its own `admin_users` row and can manage records only while it remains in the allowlist. The dashboard additionally refreshes expired Auth sessions and keeps its session in tab-scoped `sessionStorage`.
- Removing the owner's row from `admin_users` revokes admin authorization even if an old browser session remains.
- Submission origin checks, honeypot behavior, maximum field lengths, HMAC quota limits, and Turnstile verification are tested.
- Analytics remain disabled unless a visitor opts in; declining analytics does not affect forms or site functionality.
- Test the inquiry fallback when backend configuration is absent. The form should open a prefilled email rather than falsely claim that a record was stored.

## 5. Admin dashboard behavior

The footer's **ADMIN** link or the command palette's “Open admin console” opens the private dashboard. It provides:

- Administrator sign-in and database allowlist validation.
- Inquiry review, status changes, editing of submitted content and private notes, archival, JSON export, and permanent deletion.
- Comment moderation with status queues for pending, approved, hidden, and archived notes.
- Comment search by display name or text, direct status changes, editing the display name/body, approval/publication, hiding, archival, JSON export, and permanent deletion.
- Public Create is rate-limited and server-validated, and always inserts with `status = 'pending'`. Public Read is restricted by RLS to `status = 'approved'`. Update/Delete are available only to an authenticated allowlisted administrator.
- Opt-in page-view summaries and the administrator activity log.

The dashboard does not grant access because of a hidden URL, local-storage flag, or client-side role. It is only a user interface; RLS remains the real security boundary.

## 6. Retention and maintenance

Review inquiry retention and delete records that are no longer needed. Export only when necessary and store exports securely. Remove expired quota buckets periodically:

```sql
delete from public.submission_rate_limits where expires_at < now();
```

The current analytics are deliberately minimal and approximate. A visitor may block the function call, clear session storage, or decline consent. Do not treat the counts as an identity or complete visitor record.

## Unconfigured state

When running a separate copy without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the public-notes composer stays disabled and shows a backend-offline state; no comment is stored in browser storage. The inquiry form uses its honest mailto fallback, analytics remain off, and the admin panel shows setup instructions. The production repository has these public values configured by its GitHub Actions workflow. The owner must still accept the Auth invitation and verify the email before admin moderation becomes available.
