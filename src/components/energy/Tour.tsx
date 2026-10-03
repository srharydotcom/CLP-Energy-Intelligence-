import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile";

export interface TourStep { path?: string; target: string; title: string; body: string }

const HOUSEHOLD_STEPS: TourStep[] = [
  { path: "/dashboard", target: "nav-/dashboard", title: "Your dashboard", body: "Start here. It lists every home you've saved, with its rating and yearly electricity cost. You can add or delete homes here." },
  { target: "dashboard-homes", title: "Your homes", body: "Each card is one home. Click a card to open it, or use the bin icon to delete it. 'Add a home' creates a new one." },
  { path: "/home", target: "nav-/home", title: "My Home", body: "Tell us about the home and add the appliances you own. Everything saves automatically to your account." },
  { target: "house-details", title: "About this home", body: "Size, number of people, how often the air-con runs, and a few building questions. The more you fill in, the better the estimates." },
  { target: "appliances", title: "Add your appliances", body: "Pick a type first (like TV), then the exact appliance. Don't see it? Use 'Something else' to add any equipment with its watts." },
  { path: "/passport", target: "nav-/passport", title: "Energy Passport", body: "An A–E rating for your home compared with similar homes, with every step of the calculation explained." },
  { path: "/buy", target: "nav-/buy", title: "Should I Buy This?", body: "Thinking about a new air-con, fridge, TV or car? Compare models by what they really cost you over the years, not just the price tag." },
  { target: "nav-/history", title: "History", body: "Every AI explanation you ask for is saved here so you can come back to it." },
  { target: "mode-switch", title: "Home or business", body: "Switch to Business for building investments, energy contracts and scenario analysis — more detail for bigger decisions." },
  { target: "nav-/help", title: "Help is always here", body: "Open Help any time to read the guide or replay this tour." },
];

const BUSINESS_STEPS: TourStep[] = [
  { path: "/dashboard", target: "nav-/dashboard", title: "Portfolio dashboard", body: "A summary of your sites: what you pay today and how much a better contract could save." },
  { path: "/buildings", target: "nav-/buildings", title: "Building Investments", body: "Evaluate HVAC, lighting, solar, batteries, water heating, refrigeration and EV charging for a mall, hotel, office, school and more — within your budget." },
  { path: "/procurement", target: "nav-/procurement", title: "Business Procurement", body: "Compare electricity contract structures for each site by cost, price risk and emissions." },
  { path: "/scenarios", target: "nav-/scenarios", title: "Scenario Analysis", body: "Stress-test decisions: fuel price shocks, usage growth, carbon prices and load shifting." },
  { target: "nav-/history", title: "History", body: "All AI analyses you run are saved to your account here." },
  { target: "mode-switch", title: "Home or business", body: "Switch to Home for simple household tools." },
  { target: "nav-/help", title: "Help", body: "Read the full guide or replay this tour any time." },
];

let autoStarted = false;
export function startTour() { window.dispatchEvent(new Event("clp:start-tour")); }

export function Tour({ mode }: { mode: "household" | "business" }) {
  const { profile, update } = useProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [i, setI] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const steps = mode === "business" ? BUSINESS_STEPS : HOUSEHOLD_STEPS;

  // Auto-start once per session for new users; never restart after it's been closed.
  useEffect(() => {
    if (profile && !profile.tour_done && !autoStarted) { autoStarted = true; setI(0); }
  }, [profile]);
  useEffect(() => {
    const h = () => setI(0);
    window.addEventListener("clp:start-tour", h);
    return () => window.removeEventListener("clp:start-tour", h);
  }, []);

  const step = i !== null ? steps[i] : null;
  useEffect(() => {
    if (step?.path && pathname !== step.path) navigate({ to: step.path });
  }, [step, pathname, navigate]);

  const measure = useCallback(() => {
    if (!step) return setRect(null);
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: "center" });
      setRect(el.getBoundingClientRect());
    } else setRect(null);
  }, [step]);
  useLayoutEffect(() => {
    measure();
    const t = setInterval(measure, 300);
    window.addEventListener("resize", measure);
    return () => { clearInterval(t); window.removeEventListener("resize", measure); };
  }, [measure, pathname]);

  if (i === null || !step) return null;
  const finish = () => { setI(null); if (profile && !profile.tour_done) update.mutate({ tour_done: true }); };
  const last = i === steps.length - 1;
  const pad = 6;
  const below = rect ? rect.bottom + 180 < window.innerHeight : true;
  const boxLeft = rect ? Math.min(Math.max(12, rect.left), window.innerWidth - 332) : window.innerWidth / 2 - 160;
  const boxTop = rect ? (below ? rect.bottom + 12 : Math.max(12, rect.top - 172)) : window.innerHeight / 2 - 80;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Guided tour">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-md ring-2 ring-primary transition-all duration-200"
          style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--background) 78%, transparent)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-background/80" />
      )}
      <div className="absolute w-80 rounded-lg border bg-popover p-4 shadow-xl" style={{ left: boxLeft, top: boxTop }}>
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">Step {i + 1} of {steps.length}</div>
        <div className="mt-1 font-display font-semibold">{step.title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button className="text-xs text-muted-foreground underline" onClick={finish}>Skip tour</button>
          <div className="flex gap-2">
            {i > 0 && <Button size="sm" variant="ghost" onClick={() => setI(i - 1)}>Back</Button>}
            <Button size="sm" onClick={() => (last ? finish() : setI(i + 1))}>{last ? "Finish" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
