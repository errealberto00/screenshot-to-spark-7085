import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Field } from "@/components/field";
import { GoogleIcon } from "@/components/brand";
import { copy } from "@/lib/copy";
import { REDIRECT_KEY } from "@/lib/account";

const loginSchema = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });
const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

/** Sign-in / sign-up UI. `redirect` is the same-origin path to return to. */
export function AuthPanel({ redirect, defaultTab = "login", onSignedIn }: { redirect?: string; defaultTab?: "login" | "signup"; onSignedIn: () => void }) {
  const [googleBusy, setGoogleBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function google() {
    setGoogleBusy(true);
    if (redirect) sessionStorage.setItem(REDIRECT_KEY, redirect);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (res.error) {
      toast.error(res.error.message ?? copy.common.errorGeneric);
      setGoogleBusy(false);
      return;
    }
    if (res.redirected) return;
    onSignedIn();
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><MailCheck className="size-5" /></div>
        <h2 className="text-lg font-semibold">{copy.auth.checkEmail}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.auth.checkEmailSub} <span className="font-medium text-foreground">{sentTo}</span>.</p>
        <Button variant="ghost" className="mt-4" onClick={() => setSentTo(null)}>{copy.common.back}</Button>
      </div>
    );
  }

  return (
    <div>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={google} disabled={googleBusy}>
        {googleBusy ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
        {copy.auth.google}
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {copy.auth.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4 grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="login" className="rounded-lg">{copy.auth.login}</TabsTrigger>
          <TabsTrigger value="signup" className="rounded-lg">{copy.auth.signup}</TabsTrigger>
        </TabsList>
        <TabsContent value="login"><LoginForm onSignedIn={onSignedIn} onForgot={() => setForgotOpen(true)} /></TabsContent>
        <TabsContent value="signup"><SignupForm redirect={redirect} onSent={setSentTo} onSignedIn={onSignedIn} /></TabsContent>
      </Tabs>
      <ForgotDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}

function LoginForm({ onSignedIn, onForgot }: { onSignedIn: () => void; onForgot: () => void }) {
  const f = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const submit = f.handleSubmit(async (v) => {
    const { error } = await supabase.auth.signInWithPassword(v);
    if (error) return toast.error(error.message);
    onSignedIn();
  });
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={copy.auth.email} htmlFor="l-email" error={f.formState.errors.email?.message}>
        <Input id="l-email" type="email" autoComplete="email" className="h-11 rounded-xl" {...f.register("email")} />
      </Field>
      <Field label={copy.auth.password} htmlFor="l-pass" error={f.formState.errors.password?.message}>
        <Input id="l-pass" type="password" autoComplete="current-password" className="h-11 rounded-xl" {...f.register("password")} />
      </Field>
      <div className="flex justify-end">
        <button type="button" onClick={onForgot} className="text-xs font-medium text-primary hover:underline">{copy.auth.forgot}</button>
      </div>
      <Button type="submit" size="lg" variant="ink" className="w-full" disabled={f.formState.isSubmitting}>
        {f.formState.isSubmitting && <Loader2 className="animate-spin" />}{copy.auth.submitLogin}
      </Button>
    </form>
  );
}

function SignupForm({ redirect, onSent, onSignedIn }: { redirect?: string; onSent: (e: string) => void; onSignedIn: () => void }) {
  const f = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema), defaultValues: { full_name: "", email: "", password: "" } });
  const submit = f.handleSubmit(async (v) => {
    const back = `${window.location.origin}/auth${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { emailRedirectTo: back, data: { full_name: v.full_name } },
    });
    if (error) return toast.error(error.message);
    if (data.session) onSignedIn();
    else onSent(v.email);
  });
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={copy.auth.name} htmlFor="s-name" error={f.formState.errors.full_name?.message}>
        <Input id="s-name" autoComplete="name" className="h-11 rounded-xl" {...f.register("full_name")} />
      </Field>
      <Field label={copy.auth.email} htmlFor="s-email" error={f.formState.errors.email?.message}>
        <Input id="s-email" type="email" autoComplete="email" className="h-11 rounded-xl" {...f.register("email")} />
      </Field>
      <Field label={copy.auth.password} htmlFor="s-pass" error={f.formState.errors.password?.message}>
        <Input id="s-pass" type="password" autoComplete="new-password" className="h-11 rounded-xl" {...f.register("password")} />
      </Field>
      <Button type="submit" size="lg" variant="ink" className="w-full" disabled={f.formState.isSubmitting}>
        {f.formState.isSubmitting && <Loader2 className="animate-spin" />}{copy.auth.submitSignup}
      </Button>
    </form>
  );
}

function ForgotDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const f = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().trim().email("Enter a valid email") })), defaultValues: { email: "" } });
  const submit = f.handleSubmit(async ({ email }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return toast.error(error.message);
    toast.success(copy.auth.resetSent);
    onOpenChange(false);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{copy.auth.resetTitle}</DialogTitle>
          <DialogDescription>{copy.auth.resetSub}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label={copy.auth.email} htmlFor="r-email" error={f.formState.errors.email?.message}>
            <Input id="r-email" type="email" className="h-11 rounded-xl" {...f.register("email")} />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={f.formState.isSubmitting}>{copy.auth.resetSend}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
