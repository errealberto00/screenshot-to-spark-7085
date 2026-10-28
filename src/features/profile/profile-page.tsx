import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Field } from "@/components/field";
import { PageHeader } from "@/components/brand";
import { accountQuery } from "@/lib/account";
import { uploadImage } from "@/lib/storage";
import { copy } from "@/lib/copy";
import { deleteMyAccount } from "@/lib/account.functions";

const schema = z.object({ full_name: z.string().trim().min(2, "Enter your name").max(80), phone: z.string().trim().max(30).optional() });
const pwSchema = z.object({ current: z.string().min(1, "Required"), next: z.string().min(8, "At least 8 characters") });

export function ProfilePage() {
  const { data: acc } = useSuspenseQuery(accountQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const p = acc!.profile;
  const [avatar, setAvatar] = useState(p?.avatar_url ?? null);
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { full_name: p?.full_name ?? "", phone: p?.phone ?? "" } });
  const pw = useForm<z.infer<typeof pwSchema>>({ resolver: zodResolver(pwSchema), defaultValues: { current: "", next: "" } });
  const isGoogle = acc!.provider === "google";

  const save = f.handleSubmit(async (v) => {
    const { error } = await supabase.from("profiles").update({ full_name: v.full_name, phone: v.phone || null, avatar_url: avatar }).eq("id", acc!.userId);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["account"] });
  });

  const changePw = pw.handleSubmit(async (v) => {
    const { error } = await supabase.auth.updateUser({ password: v.next, current_password: v.current } as never);
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    pw.reset();
  });

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function del() {
    try {
      await deleteMyAccount();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
      toast.success("Your account was deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={copy.profile.title} />
      <form onSubmit={save} className="surface space-y-5 p-6">
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer">
            <Avatar className="size-16">
              {avatar && <AvatarImage src={avatar} alt="" />}
              <AvatarFallback className="bg-primary-soft text-lg text-primary">{(p?.full_name || acc!.email).slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border bg-card shadow-hairline"><Camera className="size-3.5" /></span>
            <input type="file" accept="image/*" className="sr-only" aria-label="Upload avatar" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try { setAvatar(await uploadImage("avatars", file)); toast.success("Photo uploaded — remember to save"); } catch (err) { toast.error((err as Error).message); }
            }} />
          </label>
          <div className="min-w-0">
            <div className="truncate font-medium">{acc!.email}</div>
            <div className="text-xs text-muted-foreground">{isGoogle ? copy.profile.google : "Email account"}</div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="p-name" error={f.formState.errors.full_name?.message}><Input id="p-name" className="h-11 rounded-xl" {...f.register("full_name")} /></Field>
          <Field label="Phone" htmlFor="p-phone"><Input id="p-phone" type="tel" className="h-11 rounded-xl" {...f.register("phone")} /></Field>
        </div>
        <Field label="Email" htmlFor="p-email"><Input id="p-email" value={acc!.email} readOnly disabled className="h-11 rounded-xl" /></Field>
        <Button type="submit" disabled={f.formState.isSubmitting}>Save profile</Button>
      </form>

      {!isGoogle && (
        <form onSubmit={changePw} className="surface mt-6 space-y-4 p-6">
          <h2 className="font-semibold">{copy.profile.changePassword}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.profile.currentPassword} htmlFor="pw-c" error={pw.formState.errors.current?.message}><Input id="pw-c" type="password" autoComplete="current-password" className="h-11 rounded-xl" {...pw.register("current")} /></Field>
            <Field label="New password" htmlFor="pw-n" error={pw.formState.errors.next?.message}><Input id="pw-n" type="password" autoComplete="new-password" className="h-11 rounded-xl" {...pw.register("next")} /></Field>
          </div>
          <Button type="submit" variant="outline" disabled={pw.formState.isSubmitting}>Update password</Button>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={logout}><LogOut /> {copy.common.logout}</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" className="text-destructive hover:text-destructive">{copy.profile.deleteAccount}</Button></AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>{copy.profile.deleteConfirm}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={del} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete forever</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
