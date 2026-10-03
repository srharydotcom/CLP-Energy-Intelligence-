import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/energy/AppShell";
import { startTour } from "@/components/energy/Tour";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help & Guide — CLP Energy Intelligence" },
      { name: "description", content: "A step-by-step guide to every part of CLP Energy Intelligence, with an interactive tour." },
      { property: "og:title", content: "Help & Guide — CLP Energy Intelligence" },
      { property: "og:description", content: "A step-by-step guide to every part of CLP Energy Intelligence, with an interactive tour." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

const GUIDE: { section: string; items: { q: string; to?: "/dashboard" | "/home" | "/passport" | "/buy" | "/buildings" | "/procurement" | "/scenarios" | "/history"; steps: string[] }[] }[] = [
  {
    section: "Getting started",
    items: [
      { q: "Home or Business — which do I use?", steps: ["Use the Home / Business switch at the top of the menu.", "Home keeps things simple: your house, your appliances, what things cost you.", "Business shows detailed tools for buildings, energy contracts and scenarios."] },
      { q: "Is my information saved?", steps: ["Yes. Your homes, appliances and AI explanations are saved to your account.", "Sign in on any device to see them again. Nobody else can see your data."] },
    ],
  },
  {
    section: "For your home",
    items: [
      { q: "Dashboard", to: "/dashboard", steps: ["Shows every home you've saved with its rating and yearly cost.", "Click 'Add a home' to create one; click the bin icon to delete one.", "Click a home to open it."] },
      { q: "My Home — add your house and appliances", to: "/home", steps: ["Fill in 'About this home': size, people, air-con hours, and the building questions.", "To add an appliance, choose a Type (e.g. TV), then the Appliance, then press Add.", "Not in the list? Press 'Something else' and type its name and watts (printed on its label).", "Change how many, watts, or hours in the table — it saves automatically.", "'Better choices for your home' suggests cheaper-to-own models and how fast they pay back."] },
      { q: "Energy Passport — your rating", to: "/passport", steps: ["Pick a home at the top right.", "You get a grade from A (best) to E, a score out of 100 and the yearly cost.", "'How we worked this out' shows each step of the sum.", "The table lists every appliance and what it costs per year."] },
      { q: "Should I Buy This? — compare products", to: "/buy", steps: ["Choose which home it's for — size and people fill in automatically.", "Pick a product type tab (air-con, fridge, TV, washer…). 'Something else' lets you compare anything.", "The green box shows the best choice over the years, not just the cheapest price.", "Click a row in the table to see its full cost, savings and when it pays for itself.", "Add your own model with '+ Add your own'. Open 'Advanced' only if you want to change the electricity plan or assumptions."] },
    ],
  },
  {
    section: "For business",
    items: [
      { q: "Building Investments", to: "/buildings", steps: ["Choose a building type (mall, hotel, office, gym, school, apartments) and enter its size, hours and occupancy.", "Set the capital budget and constraints.", "Tick the measures to evaluate — HVAC, lighting, solar, battery, water heating, refrigeration, EV charging, other.", "Review upfront cost, savings, payback, sensitivity and assumptions."] },
      { q: "Business Procurement", to: "/procurement", steps: ["Pick a site.", "Compare contract structures by annual cost, price-risk band and renewable share.", "Adjust assumptions to see how the ranking changes."] },
      { q: "Scenario Analysis", to: "/scenarios", steps: ["Apply preset or custom scenarios (fuel shocks, usage growth, carbon price, load shifting).", "See how costs move against the base case."] },
    ],
  },
  {
    section: "Understanding the numbers",
    items: [
      { q: "Where do the figures come from?", steps: ["Every number is calculated by fixed formulas from your inputs — never made up by the AI.", "The AI explanation only reads those numbers and explains them in words."] },
      { q: "What does 'pays for itself' mean?", steps: ["A pricier model can cost less to run. 'Pays for itself in 3 years' means the running-cost savings cover the extra price after 3 years."] },
      { q: "History", to: "/history", steps: ["Every AI explanation you ask for is kept in History, newest first."] },
    ],
  },
];

function HelpPage() {
  return (
    <>
      <PageHeader kicker="Help" title="Help & guide" sub="Everything the app does and how to use it. New here? Take the interactive tour — it walks you through each page."
        right={<Button onClick={startTour}><PlayCircle className="size-4" /> Start the tour</Button>} />
      <div className="space-y-6">
        {GUIDE.map((g) => (
          <section key={g.section} className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 font-display text-lg font-semibold">{g.section}</h2>
            <Accordion type="multiple">
              {g.items.map((it) => (
                <AccordionItem key={it.q} value={it.q}>
                  <AccordionTrigger>{it.q}</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">{it.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                    {it.to && <Button asChild size="sm" variant="outline" className="mt-3"><Link to={it.to}>Open {it.q.split(" —")[0]}</Link></Button>}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </>
  );
}
