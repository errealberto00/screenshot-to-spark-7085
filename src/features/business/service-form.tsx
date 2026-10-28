import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/field";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(120),
  description: z.string().max(500).optional(),
  duration_min: z.coerce.number().int().min(5, "At least 5 minutes").max(720),
  price: z.union([z.literal(""), z.coerce.number().min(0, "Can't be negative")]).optional(),
});
export type ServiceInput = z.input<typeof serviceSchema>;
export type ServiceValues = { name: string; description: string | null; duration_min: number; price: number | null };

export function toServiceValues(v: z.output<typeof serviceSchema>): ServiceValues {
  return { name: v.name, description: v.description?.trim() || null, duration_min: v.duration_min, price: v.price === "" || v.price == null ? null : Number(v.price) };
}

export function ServiceForm({ defaults, submitLabel, onSubmit }: { defaults?: Partial<ServiceInput>; submitLabel: string; onSubmit: (v: ServiceValues) => Promise<void> }) {
  const f = useForm<ServiceInput, unknown, z.output<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", description: "", duration_min: 30, price: "", ...defaults },
  });
  const e = f.formState.errors;
  return (
    <form onSubmit={f.handleSubmit((v) => onSubmit(toServiceValues(v)))} className="space-y-4" noValidate>
      <Field label="Service name" htmlFor="sv-name" error={e.name?.message}>
        <Input id="sv-name" placeholder="e.g. Haircut" className="h-11 rounded-xl" {...f.register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (minutes)" htmlFor="sv-dur" error={e.duration_min?.message}>
          <Input id="sv-dur" type="number" min={5} step={5} className="h-11 rounded-xl" {...f.register("duration_min")} />
        </Field>
        <Field label="Price" htmlFor="sv-price" error={e.price?.message} hint="Leave empty for “price on request”">
          <Input id="sv-price" type="number" min={0} step="0.5" className="h-11 rounded-xl" {...f.register("price")} />
        </Field>
      </div>
      <Field label="Description (optional)" htmlFor="sv-desc">
        <Textarea id="sv-desc" rows={3} className="rounded-xl" {...f.register("description")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={f.formState.isSubmitting}>{submitLabel}</Button>
    </form>
  );
}
