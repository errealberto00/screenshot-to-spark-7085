import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/brand";
import { ServiceForm, type ServiceValues } from "@/features/business/service-form";
import { servicesQuery, useBusiness } from "@/features/business/queries";
import type { Service } from "@/lib/account";
import { money } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/services")({
  head: () => ({ meta: [{ title: "Services — Slotly" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const business = useBusiness();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(servicesQuery(business.id));
  const [items, setItems] = useState<Service[]>(data);
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  useEffect(() => setItems(data), [data]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["services", business.id] });

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(items, items.findIndex((i) => i.id === e.active.id), items.findIndex((i) => i.id === e.over!.id));
    setItems(next);
    const results = await Promise.all(next.map((s, i) => supabase.from("services").update({ sort_order: i }).eq("id", s.id)));
    if (results.some((r) => r.error)) toast.error("Couldn't save the new order");
    refresh();
  }

  async function save(v: ServiceValues) {
    const res = editing === "new"
      ? await supabase.from("services").insert({ ...v, business_id: business.id, sort_order: items.length })
      : await supabase.from("services").update(v).eq("id", (editing as Service).id);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Service saved");
    setEditing(null);
    refresh();
  }

  async function toggle(s: Service, is_active: boolean) {
    setItems((xs) => xs.map((x) => (x.id === s.id ? { ...x, is_active } : x)));
    const { error } = await supabase.from("services").update({ is_active }).eq("id", s.id);
    if (error) { toast.error(error.message); refresh(); }
  }

  async function remove(s: Service) {
    if (!confirm(`Delete “${s.name}”? Existing bookings keep their details.`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <>
      <PageHeader title="Services" sub="Drag to reorder how they appear on your page." actions={<Button onClick={() => setEditing("new")}><Plus /> Add service</Button>} />
      {items.length === 0 ? (
        <EmptyState icon={<Scissors className="size-5" />} title="No services yet" sub="Add your first one — customers need something to book." action={<Button onClick={() => setEditing("new")}><Plus /> Add your first service</Button>} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((s) => <Row key={s.id} s={s} currency={business.currency} onEdit={() => setEditing(s)} onToggle={(v) => toggle(s, v)} onDelete={() => remove(s)} />)}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{editing === "new" ? "New service" : "Edit service"}</DialogTitle></DialogHeader>
          {editing && (
            <ServiceForm
              key={editing === "new" ? "new" : editing.id}
              submitLabel="Save service"
              defaults={editing === "new" ? undefined : { name: editing.name, description: editing.description ?? "", duration_min: editing.duration_min, price: editing.price ?? "" }}
              onSubmit={save}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ s, currency, onEdit, onToggle, onDelete }: { s: Service; currency: string; onEdit: () => void; onToggle: (v: boolean) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("surface flex items-center gap-3 p-3 pr-4", isDragging && "z-10 shadow-lift", !s.is_active && "opacity-60")}>
      <button {...attributes} {...listeners} className="grid size-10 cursor-grab place-items-center rounded-lg text-muted-foreground hover:bg-accent" aria-label={`Reorder ${s.name}`}><GripVertical className="size-4" /></button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{s.name}</div>
        <div className="text-sm text-muted-foreground">{s.duration_min} min · {money(s.price, currency)}</div>
      </div>
      <Switch checked={s.is_active} onCheckedChange={onToggle} aria-label={`${s.name} active`} />
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${s.name}`}><Pencil /></Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${s.name}`}><Trash2 /></Button>
    </li>
  );
}
