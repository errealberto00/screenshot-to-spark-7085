import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$/;
export const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

/** Slug input with live availability check. Reports validity via onValidity. */
export function SlugField({ value, onChange, onValidity, id }: { value: string; onChange: (v: string) => void; onValidity?: (ok: boolean) => void; id?: string }) {
  const [state, setState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  useEffect(() => {
    if (!value) { setState("idle"); onValidity?.(false); return; }
    if (!SLUG_RE.test(value)) { setState("invalid"); onValidity?.(false); return; }
    setState("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("is_slug_available", { _slug: value });
      setState(data ? "ok" : "taken");
      onValidity?.(!!data);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const origin = typeof window !== "undefined" ? window.location.host : "slotly.app";
  return (
    <div className="space-y-1.5">
      <div className="flex h-11 items-center overflow-hidden rounded-xl border bg-card focus-within:ring-2 focus-within:ring-ring">
        <span className="hidden h-full items-center border-r bg-muted px-3 text-sm text-muted-foreground sm:flex">{origin}/b/</span>
        <Input id={id} value={value} onChange={(e) => onChange(slugify(e.target.value).slice(0, 48) || e.target.value.toLowerCase())}
          className="h-full rounded-none border-0 shadow-none focus-visible:ring-0" aria-describedby="slug-status" />
        <span className="px-3" aria-hidden>
          {state === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {state === "ok" && <Check className="size-4 text-primary" />}
          {(state === "taken" || state === "invalid") && <X className="size-4 text-destructive" />}
        </span>
      </div>
      <p id="slug-status" className="text-xs text-muted-foreground">
        {state === "taken" ? "That address is taken — try another." : state === "invalid" ? "3–48 characters: lowercase letters, numbers and dashes." : state === "ok" ? "Available" : `Your page: ${origin}/b/${value || "your-name"}`}
      </p>
    </div>
  );
}
