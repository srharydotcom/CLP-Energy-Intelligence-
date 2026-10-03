import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CLP Energy Intelligence" },
      { name: "description", content: "Sign in to save your homes, appliances and analysis history." },
      { property: "og:title", content: "Sign in — CLP Energy Intelligence" },
      { property: "og:description", content: "Sign in to save your homes, appliances and analysis history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"household" | "business">("household");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/dashboard", replace: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate({ to: "/dashboard", replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { display_name: name, user_type: type } },
      });
      if (error) setMsg({ ok: false, text: error.message });
      else if (!data.session) setMsg({ ok: true, text: "Check your email to confirm your account, then sign in." });
    }
    setBusy(false);
  };

  const google = async () => {
    setMsg(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg({ ok: false, text: "Google sign-in failed. Please try again." });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4 font-sans">
      <div className="w-full max-w-sm space-y-5 rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded bg-primary font-mono text-xs font-bold text-primary-foreground">CLP</span>
          <span className="font-display font-semibold">Energy Intelligence</span>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "in" | "up")}>
          <TabsList className="w-full"><TabsTrigger className="flex-1" value="in">Sign in</TabsTrigger><TabsTrigger className="flex-1" value="up">Create account</TabsTrigger></TabsList>
        </Tabs>
        <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        <div className="text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">or with email</div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && (
            <>
              <div><Label className="text-xs text-muted-foreground">Your name</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div>
                <Label className="text-xs text-muted-foreground">I'm using this for</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {([["household", "My home", Home], ["business", "A business", Building2]] as const).map(([v, l, Icon]) => (
                    <button type="button" key={v} onClick={() => setType(v)} className={cn("flex items-center gap-2 rounded-md border p-2.5 text-sm", type === v ? "border-primary bg-primary/10" : "hover:bg-accent")}>
                      <Icon className="size-4" /> {l}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div><Label className="text-xs text-muted-foreground">Email</Label><Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label className="text-xs text-muted-foreground">Password</Label><Input className="mt-1" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
        {msg && <p className={cn("text-sm", msg.ok ? "text-positive" : "text-destructive")}>{msg.text}</p>}
      </div>
    </div>
  );
}
