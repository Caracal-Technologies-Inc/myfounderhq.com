# MyFounderHQ Supabase authentication

Supabase project: `intkaqcecscmhlduvrbo` (Canada Central).

Vercel environment variables are configured for production, preview and development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable, not privileged)
- `NEXT_PUBLIC_SITE_URL`

To finish email-confirmation flow, set the **Supabase Authentication → URL Configuration** site URL to `https://myfounderhq.com` and add `https://myfounderhq.com/auth/callback` to redirect allowlist. Add any preview URLs only as necessary.

The server checks authenticated users before rendering the dashboard. The database's private records must independently use owner-scoped Row Level Security policies before being exposed.

Public sign-up should be disabled after creating the founder account if MyFounderHQ remains private.
