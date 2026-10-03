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

- All cost/savings/payback numbers are computed deterministically in `src/lib/energy.ts`; why: AI must never be the source of figures.
- AI findings come only from `runAnalysis` (server function) returning JSON validated by `src/lib/ai/schema.ts`; the UI renders that schema and never hardcodes AI prose. Why: structured decision platform, not a chatbot.
- Every analysis run is persisted to the `ai_analyses` table via the admin client inside the handler; why: auditability.
- Demo reference data (tariffs, homes, products, sites, procurement options) is public read-only and read through TanStack Query in components; why: no auth required for the demo.
