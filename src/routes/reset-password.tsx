import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Logo } from "@/components/brand";
import { copy } from "@/lib/copy";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Slotly" },
      { name: "description", content: "Choose a new password for your Slotly account." },
      { property: "og:title", content: "Reset password — Slotly" },
      { property: "og:description", content: "Choose a new password for your Slotly account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const f = useForm<{ password: string }>({ resolver: zodResolver(z.object({ password: z.string().min(8, "At least 8 characters") })), defaultValues: { password: "" } });
  const submit = f.handleSubmit(async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success(copy.auth.passwordUpdated);
    navigate({ to: "/auth" });
  });
  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
      <Logo />
      <form onSubmit={submit} className="surface m-auto w-full max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-semibold">{copy.auth.resetTitle}</h1>
        <Field label={copy.auth.newPassword} htmlFor="np" error={f.formState.errors.password?.message}>
          <Input id="np" type="password" autoComplete="new-password" className="h-11 rounded-xl" {...f.register("password")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={f.formState.isSubmitting}>{copy.auth.setPassword}</Button>
      </form>
    </div>
  );
}
