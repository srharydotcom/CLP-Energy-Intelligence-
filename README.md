# CLP Energy Intelligence

**An AI-powered decision platform that shows its working.** Built for the hackathon challenge:

> *"How might AI help CLP become a trusted energy and lifestyle partner for future households and businesses?"*

---

## Why we built this

Every month, households open an electricity bill they don't understand — a number with no explanation. Businesses are asked to commit to multi-million-dollar upgrades and supply contracts based on figures they can't verify.

People trust a brand only when they feel it is genuinely looking out for them. And you can't claim to look out for someone while hiding your working. Our answer: **don't just give advice — show the calculation behind it.**

## What it does

Sign in (email or Google) and the app splits into two experiences, because households and businesses need different things:

### 🏠 For households — simple language, honest comparisons

- **My Home** — save your home (area in m² or sq ft, occupants) and the appliances you actually own. No pre-filled data, no assumptions made for you.
- **Energy Passport** — a booklet-style A–E rating of your home's electricity use, with the **entire calculation written out step by step**: appliance-by-appliance kWh, cost per year, comparison with similar homes, and monthly usage. Nothing is hidden.
- **Should I Buy This?** — pick what you're buying, enter requirements *specific to that product* (an air conditioner asks about room size and daily hours; a light bulb doesn't), then compare total cost of ownership, break-even year and payback across real market-priced products — or add your own.
- **Upgrade suggestions** — for each appliance you own, the lowest lifetime-cost replacement that actually fits your home.

### 🏢 For businesses — the detail, made defensible

- **Building Investments** — model a building, then compare upgrades (HVAC, lighting, solar, battery, water heating, refrigeration, EV charging) by upfront cost, annual savings, payback and sensitivity to tariff escalation.
- **Business Procurement** — compare electricity supply options by effective rate, expected annual cost, **P10–P90 risk band**, emissions and contract term, so a facilities manager can defend the choice internally.
- **Scenario Analysis** — stress-test fuel spikes, hot summers, carbon pricing and peak load shifting against your saved homes or sites, with 7-year present-value projections.

### 🤖 AI, used responsibly

This is a **decision platform, not a chatbot**:

- **AI never invents the numbers.** Every cost, saving and payback figure is computed deterministically, in code, from inputs the user can see.
- AI turns those figures into structured findings — a verdict, a confidence level, and concrete "check this assumption" prompts — never free-form prose replacing the maths.
- Every AI analysis is **persisted with its inputs** for auditability.
- AI adapts its language: plain explanations for households, expert detail for businesses.

**The principle: AI explains, maths decides, and the customer can see both.**

## Tech stack

- **Frontend:** React 19, TypeScript, TanStack Start (SSR), Tailwind CSS v4, shadcn/ui, Recharts
- **Backend:** Lovable Cloud (managed database with row-level security), server functions, Lovable AI Gateway
- **Auth:** Email + Google sign-in; per-user data isolation enforced at the database layer
- **Testing:** Vitest

## Running it locally

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

The app ships with demo reference data (tariffs, a product catalogue, benchmark homes and business sites). Create an account and everything you save — homes, appliances, analyses — is persisted to your profile.

## Design principles

1. **Blank start.** No page shows recommendations, comparisons or sample data until the user has entered their own details. An air conditioner recommendation without your room size isn't advice — it's a guess.
2. **Show the formula.** Every headline number links to the calculation that produced it.
3. **One product, two languages.** Households get simple explanations and understandable comparisons; businesses get rates, risk bands and present values — driven by the same engine.
4. **Real catalogue.** Products come from a real Hong Kong retail dataset, not generic placeholders.

## What's next

- Smart-meter integration to replace estimated usage with measured data
- Partner marketplace (installers, financiers) with rule-based, bias-audited rankings
- E-mobility (EV charging plans, time-of-use optimisation)
- Flexibility services — turning household flexibility into grid value

## Status

Built as a working prototype for a hackathon. Figures are estimates based on public prices and stated assumptions — all methodology is visible in-app and designed to be swapped to real CLP data before any rollout.
