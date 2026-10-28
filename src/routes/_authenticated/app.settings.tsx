import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/field";
import { PageHeader } from "@/components/brand";
import { SlugField } from "@/features/business/slug-field";
import { useBusiness } from "@/features/business/queries";
import { uploadImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Slotly" }] }),
  component: SettingsPage,
});

const opt = z.string().trim().max(300).optional().or(z.literal(""));
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  category: opt,
  description: z.string().max(1000).optional(),
  address: opt, city: opt, phone: opt,
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  website: z.string().trim().url("Include https://").optional().or(z.literal("")),
  instagram: opt,
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color"),
  slot_interval_min: z.coerce.number().int().min(5).max(240),
  buffer_min: z.coerce.number().int().min(0).max(240),
  min_notice_hours: z.coerce.number().int().min(0).max(720),
  max_advance_days: z.coerce.number().int().min(1).max(730),
  cancellation_window_hours: z.coerce.number().int().min(0).max(720),
  auto_confirm: z.boolean(),
  is_published: z.boolean(),
});
type In = z.input<typeof schema>;
type Out = z.output<typeof schema>;

function SettingsPage() {
  const b = useBusiness();
  const qc = useQueryClient();
  const [slug, setSlug] = useState(b.slug);
  const [slugOk, setSlugOk] = useState(true);
  const [logo, setLogo] = useState(b.logo_url);
  const [cover, setCover] = useState(b.cover_url);
  const f = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: b.name, category: b.category ?? "", description: b.description ?? "", address: b.address ?? "", city: b.city ?? "",
      phone: b.phone ?? "", email: b.email ?? "", website: b.website ?? "", instagram: b.instagram ?? "", accent_color: b.accent_color,
      slot_interval_min: b.slot_interval_min, buffer_min: b.buffer_min, min_notice_hours: b.min_notice_hours, max_advance_days: b.max_advance_days,
      cancellation_window_hours: b.cancellation_window_hours, auto_confirm: b.auto_confirm, is_published: b.is_published,
    },
  });
  const e = f.formState.errors;

  const submit = f.handleSubmit(async (v) => {
    if (slug !== b.slug && !slugOk) return toast.error("Choose an available page address");
    const clean = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === "" ? null : x]));
    const { error } = await supabase.from("businesses").update({ ...clean, name: v.name, accent_color: v.accent_color, slug, logo_url: logo, cover_url: cover }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["account"] });
  });

  const reg = (k: keyof In, id: string, type = "text") => <Input id={id} type={type} className="h-11 rounded-xl" {...f.register(k)} />;

  return (
    <form onSubmit={submit}>
      <PageHeader title="Settings" sub="Your public page and booking rules." actions={<Button type="submit" disabled={f.formState.isSubmitting}>{f.formState.isSubmitting ? "Saving…" : "Save changes"}</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Section title="Business profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="s-name" error={e.name?.message}>{reg("name", "s-name")}</Field>
              <Field label="Category" htmlFor="s-cat">{reg("category", "s-cat")}</Field>
            </div>
            <Field label="Page address" htmlFor="s-slug"><SlugField id="s-slug" value={slug} onChange={setSlug} onValidity={setSlugOk} /></Field>
            <Field label="Description" htmlFor="s-desc"><Textarea id="s-desc" rows={3} className="rounded-xl" {...f.register("description")} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address" htmlFor="s-addr">{reg("address", "s-addr")}</Field>
              <Field label="City" htmlFor="s-city">{reg("city", "s-city")}</Field>
              <Field label="Phone" htmlFor="s-phone">{reg("phone", "s-phone", "tel")}</Field>
              <Field label="Email" htmlFor="s-email" error={e.email?.message}>{reg("email", "s-email", "email")}</Field>
              <Field label="Website" htmlFor="s-web" error={e.website?.message}>{reg("website", "s-web", "url")}</Field>
              <Field label="Instagram handle" htmlFor="s-ig">{reg("instagram", "s-ig")}</Field>
            </div>
          </Section>
          <Section title="Booking rules">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slot interval (min)" htmlFor="r-int" error={e.slot_interval_min?.message}>{reg("slot_interval_min", "r-int", "number")}</Field>
              <Field label="Buffer between bookings (min)" htmlFor="r-buf" error={e.buffer_min?.message}>{reg("buffer_min", "r-buf", "number")}</Field>
              <Field label="Minimum notice (hours)" htmlFor="r-not" error={e.min_notice_hours?.message}>{reg("min_notice_hours", "r-not", "number")}</Field>
              <Field label="Book up to (days ahead)" htmlFor="r-adv" error={e.max_advance_days?.message}>{reg("max_advance_days", "r-adv", "number")}</Field>
              <Field label="Free cancellation until (hours before)" htmlFor="r-can" error={e.cancellation_window_hours?.message}>{reg("cancellation_window_hours", "r-can", "number")}</Field>
            </div>
            <Toggle control={f.control} name="auto_confirm" label="Auto-confirm bookings" sub="Turn off to approve each booking manually." />
          </Section>
        </div>
        <div className="space-y-6">
          <Section title="Visibility">
            <Toggle control={f.control} name="is_published" label="Page published" sub="When off, your page shows “not available”." />
          </Section>
          <Section title="Look & feel">
            <ImageUpload label="Logo" value={logo} onChange={setLogo} square />
            <ImageUpload label="Cover image" value={cover} onChange={setCover} />
            <Field label="Accent color" htmlFor="s-acc" error={e.accent_color?.message}>
              <div className="flex items-center gap-2">
                <Controller control={f.control} name="accent_color" render={({ field }) => (
                  <input type="color" aria-label="Pick accent color" value={field.value} onChange={field.onChange} className="h-11 w-14 cursor-pointer rounded-xl border bg-card p-1" />
                )} />
                {reg("accent_color", "s-acc")}
              </div>
            </Field>
          </Section>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface space-y-4 p-6">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ control, name, label, sub }: { control: ReturnType<typeof useForm<In, unknown, Out>>["control"]; name: "auto_confirm" | "is_published"; label: string; sub: string }) {
  return (
    <Controller control={control} name={name} render={({ field }) => (
      <label className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{sub}</div></div>
        <Switch checked={!!field.value} onCheckedChange={field.onChange} aria-label={label} />
      </label>
    )} />
  );
}

function ImageUpload({ label, value, onChange, square }: { label: string; value: string | null; onChange: (v: string | null) => void; square?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-medium">{label}</div>
      <label className={`relative grid cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed bg-muted text-muted-foreground hover:bg-accent ${square ? "size-24" : "aspect-[3/1] w-full"}`}>
        {value ? <img src={value} alt="" className="absolute inset-0 size-full object-cover" /> : busy ? <Loader2 className="animate-spin" /> : <ImagePlus className="size-5" />}
        <input type="file" accept="image/*" className="sr-only" aria-label={`Upload ${label}`} onChange={async (ev) => {
          const file = ev.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try { onChange(await uploadImage("business-media", file)); toast.success(`${label} uploaded — remember to save`); }
          catch (err) { toast.error((err as Error).message); }
          finally { setBusy(false); }
        }} />
      </label>
      {value && <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => onChange(null)}>Remove</button>}
    </div>
  );
}
