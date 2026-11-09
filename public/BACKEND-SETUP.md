# Secure portfolio backend setup

The frontend contains private inquiry and public-note forms, a moderated comment feed, an owner dashboard, and an opt-in analytics view. The comments workflow supports the complete lifecycle: visitors create pending notes; the public feed reads approved notes only; the owner can review, edit, approve, hide, archive, export, or permanently delete records. The backend is deliberately **inactive until configured**. This repository contains the database migration and Edge Function, but it does not contain Supabase credentials, an administrator account, or a deployed Supabase project.

## Architecture

- **Static frontend:** React/Vite hosted on GitHub Pages.
- **Database and authentication:** Supabase PostgreSQL + Supabase Auth.
- **Public intake:** `supabase/functions/portfolio-submit` validates inquiries/comments and consented page-view events, applies a server-side quota, optionally verifies Cloudflare Turnstile, then inserts through the service role.
- **Owner dashboard:** Supabase Auth password sign-in, followed by an allowlist check against `admin_users`. All database authorization is enforced again by RLS.
- **Analytics:** off by default. When a visitor opts in, the site records only a random session UUID, the path, and timestamp. Raw IPs, precise location, browser fingerprints, and user-agent strings are not stored. A one-way HMAC of the request network address is used only for rate limiting and is not reversible without the server secret.

The browser only receives the Supabase URL, anon/publishable key, and Turnstile site key. **Never expose `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, or `PORTFOLIO_RATE_LIMIT_SECRET` in a Vite variable, GitHub Pages artifact, source file, or browser storage.**

## 1. Create the Supabase project

1. Create a Supabase project and keep the project URL and anon/publishable key available for the frontend.
2. Open SQL Editor and apply `supabase/migrations/202611090001_portfolio_backend.sql`.
3. Create the owner account in **Authentication → Users**. Disable public user sign-ups if no visitor account flow is required.
4. Copy the owner's Auth user UUID and manually insert it into the allowlist:

   ```sql
   insert into public.admin_users (user_id)
   values ('REPLACE-WITH-THE-OWNER-AUTH-USER-UUID');
   ```

5. Do not create public policies for inquiry inserts, comment updates, analytics reads, or allowlist writes. The provided migration intentionally grants the public only approved-comment reads.

## 2. Configure and deploy the Edge Function

Set the following Supabase Function secrets:

```text
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
PORTFOLIO_ALLOWED_ORIGIN=https://YOUR-EXACT-PUBLISHED-SITE-ORIGIN
PORTFOLIO_RATE_LIMIT_SECRET=GENERATE-A-LONG-RANDOM-SECRET
TURNSTILE_SECRET_KEY=YOUR-CLOUDFLARE_TURNSTILE_SECRET
```

`PORTFOLIO_ALLOWED_ORIGIN` must exactly match the site's origin (scheme and hostname, no path or trailing slash). For a local preview, use the exact local origin only while testing and change it before production. Generate a unique long random rate-limit secret; changing it resets the HMAC rate-limit bucket identity.

Deploy from the repository root:

```bash
supabase functions deploy portfolio-submit
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... PORTFOLIO_ALLOWED_ORIGIN=... PORTFOLIO_RATE_LIMIT_SECRET=... TURNSTILE_SECRET_KEY=...
```

The order of those commands may be reversed; the function must have all required secrets before accepting submissions. The function does not accept requests without an exact allowed origin. Rate limiting is 4 inquiries, 6 comments, and 60 opt-in page-view events per ten-minute window per HMAC-derived network bucket. Adjust these limits only after reviewing operational needs.

Cloudflare Turnstile is recommended for inquiry and comment submissions. Configure a Turnstile site key for the published domain and set it in the frontend. When `TURNSTILE_SECRET_KEY` is configured on Supabase, a valid challenge token is required for public inquiry and comment submissions. Page-view events do not invoke Turnstile.

## 3. Configure the frontend

Copy `.env.example` to `.env.local` for local work and fill in the **public** values:

```text
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY
VITE_TURNSTILE_SITE_KEY=YOUR-CLOUDFLARE-TURNSTILE-SITE-KEY
```

For GitHub Actions, add the three Vite values as repository Actions secrets/variables and expose them only to the build step. Because the public anon key is intentionally browser-visible, safety depends on RLS and Edge Function validation—not secrecy of that key. The service role key and Turnstile secret stay in Supabase Function secrets only.

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

The source distribution has no Supabase URL, keys, deployed function, or allowlisted owner ID. Until a Supabase project is created, the migration is applied, the Edge Function is deployed with server-only secrets, an owner is allowlisted, and the public Vite values are added to the GitHub Pages build, the public-notes composer stays disabled and shows a backend-offline state; no comment is stored in browser storage. The inquiry form uses its honest mailto fallback, analytics remain off, and the admin panel shows setup instructions. This is intentional: the browser must never simulate a database or moderation queue.
