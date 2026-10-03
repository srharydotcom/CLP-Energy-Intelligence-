<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules

- All cost/savings/payback numbers are computed deterministically in `src/lib/energy.ts` (households/products) and `src/lib/buildings.ts` (building investments); why: AI must never be the source of figures.
- AI findings come only from `runAnalysis` (server function) returning JSON validated by `src/lib/ai/schema.ts`; the UI renders that schema and never hardcodes AI prose. Why: structured decision platform, not a chatbot.
- Every analysis run is persisted to the `ai_analyses` table via the admin client inside the handler; why: auditability.
- Demo reference data (tariffs, homes, products, sites, procurement options) is public read-only and read through TanStack Query in components; why: no auth required for the demo.
- Users' homes (profile + appliances JSON) live in `user_homes`, owner-only RLS, accessed via `useHomes` in `src/lib/my-home.ts`; why: sign-in is required and data must persist per account.
- All app pages live under `src/routes/_authenticated/`; `/` and `/auth` are the only public routes; why: sign-in is mandatory.
- Household vs business mode comes from `profiles.user_type`; AppShell picks nav and runAnalysis picks plain vs expert language by module; why: households want simple explanations, businesses want detail.
- The guided tour targets elements via `data-tour` attributes (`src/components/energy/Tour.tsx`); why: steps survive layout changes.
- Cursor lighting is a client-only ambient layer mounted at the root and does not alter element surfaces; why: every screen shares a subtle effect without box outlines or coupling to application state.
