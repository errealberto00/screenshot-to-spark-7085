import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CalendarClock, Check, QrCode, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GoogleIcon, Logo } from "@/components/brand";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Slotly — Your booking page, live in 5 minutes" },
      { name: "description", content: "Create a beautiful booking page for your salon, studio or practice. Share one link and let customers book open slots." },
      { property: "og:title", content: "Slotly — Your booking page, live in 5 minutes" },
      { property: "og:description", content: "One shareable link for your services, hours and bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const L = copy.landing;
const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const } };

function Landing() {
  return (
    <div className="overflow-x-hidden">
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">{copy.nav.features}</a>
            <a href="#how" className="hover:text-foreground">{copy.nav.how}</a>
            <a href="#faq" className="hover:text-foreground">{copy.nav.faq}</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">{copy.nav.login}</Link></Button>
            <Button asChild className="hidden sm:inline-flex"><Link to="/auth" search={{ tab: "signup" }}>{copy.nav.cta}</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="dotgrid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"><Sparkles className="size-3 text-primary" />{L.eyebrow}</span>
            <h1 className="display mt-6">{L.titleA}<br />{L.titleB} <span className="serif-accent text-primary">{L.titleSerif}</span></h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">{L.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="xl" variant="ink" asChild><Link to="/auth" search={{ tab: "signup" }}>{L.start} <ArrowRight /></Link></Button>
              <Button size="xl" variant="outline" asChild><a href="/b/demo">{L.demo}</a></Button>
            </div>
          </motion.div>
          <HeroMockup />
        </div>
      </section>

      {/* Proof */}
      <section className="border-y bg-card py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 text-sm text-muted-foreground">
          <span className="eyebrow">{L.proof}</span>
          {L.categories.map((c) => <span key={c} className="font-medium text-foreground/70">{c}</span>)}
        </div>
      </section>

      {/* How */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <motion.h2 {...fade} className="max-w-xl text-4xl font-semibold sm:text-5xl">{L.howTitle}</motion.h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {L.how.map((s, i) => (
            <motion.div key={s.t} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="surface lift p-7">
              <div className="font-mono text-sm text-primary">0{i + 1}</div>
              <div className="mt-8 text-xl font-semibold">{s.t}</div>
              <p className="mt-2 text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24">
        <motion.h2 {...fade} className="max-w-2xl text-4xl font-semibold sm:text-5xl">{L.featuresTitle}</motion.h2>
        <div className="mt-12 grid auto-rows-[minmax(200px,auto)] gap-4 md:grid-cols-6">
          <Bento className="md:col-span-4 bg-primary-soft" icon={QrCode} f={L.features[0]}>
            <div className="mt-6 flex items-center gap-3 rounded-xl border bg-card p-2 pl-3 font-mono text-sm shadow-hairline"><span className="flex-1 truncate">slotly.app/b/atelier-nove</span><span className="rounded-lg bg-foreground px-3 py-1.5 text-xs text-background">Copy</span></div>
          </Bento>
          <Bento className="md:col-span-2" icon={CalendarClock} f={L.features[1]} />
          <Bento className="md:col-span-2" icon={ShieldCheck} f={L.features[2]} />
          <Bento className="md:col-span-2" icon={() => <GoogleIcon />} f={L.features[3]} />
          <Bento className="md:col-span-2" icon={Smartphone} f={L.features[5]} />
          <Bento className="md:col-span-6" icon={BarChart3} f={L.features[4]}>
            <div className="mt-6 flex h-24 items-end gap-1.5">
              {[30, 45, 38, 60, 52, 70, 64, 80, 72, 90, 84, 96, 88, 100].map((h, i) => (
                <motion.span key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.04, duration: 0.5 }} className="flex-1 rounded-t-md bg-primary/80" />
              ))}
            </div>
          </Bento>
        </div>
      </section>

      {/* Showcase */}
      <section className="border-y bg-card py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <motion.div {...fade}>
            <h2 className="text-4xl font-semibold sm:text-5xl">{L.showcaseTitle}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{L.showcaseSub}</p>
            <Button className="mt-8" size="lg" variant="outline" asChild><a href="/b/demo">Open the full demo <ArrowRight /></a></Button>
          </motion.div>
          <MiniPreview />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24">
        <h2 className="text-center text-4xl font-semibold">{L.faqTitle}</h2>
        <Accordion type="single" collapsible className="mt-10">
          {L.faq.map((f, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-foreground px-8 py-20 text-center text-background">
          <h2 className="mx-auto max-w-2xl text-4xl font-semibold sm:text-5xl">{L.finalTitle}</h2>
          <Button size="xl" className="mt-8" asChild><Link to="/auth" search={{ tab: "signup" }}>{copy.nav.cta} <ArrowRight /></Link></Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-5 py-10 text-sm text-muted-foreground">
          <Logo />
          <span>{L.footer}</span>
          <div className="ml-auto flex gap-5">
            <a href="#features" className="hover:text-foreground">{copy.nav.features}</a>
            <a href="/b/demo" className="hover:text-foreground">Demo</a>
            <Link to="/auth" className="hover:text-foreground">{copy.nav.login}</Link>
          </div>
          <span className="w-full text-xs">© {new Date().getFullYear()} Slotly</span>
        </div>
      </footer>
    </div>
  );
}

function Bento({ className, icon: Icon, f, children }: { className?: string; icon: React.ComponentType<{ className?: string }>; f: { t: string; d: string }; children?: React.ReactNode }) {
  return (
    <motion.div {...fade} className={cn("surface lift flex flex-col p-7", className)}>
      <div className="grid size-10 place-items-center rounded-xl border bg-card text-primary"><Icon className="size-4" /></div>
      <div className="mt-auto pt-8 text-lg font-semibold">{f.t}</div>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{f.d}</p>
      {children}
    </motion.div>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto h-[540px] w-full max-w-[460px]">
      <motion.div initial={{ opacity: 0, y: 40, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ duration: 0.8, delay: 0.1 }}
        className="absolute left-0 top-0 w-[270px] overflow-hidden rounded-[2.4rem] border-[6px] border-foreground bg-background shadow-float">
        <img src="/images/demo-cover.jpg" alt="" className="h-28 w-full object-cover" width={1600} height={640} />
        <div className="p-4">
          <div className="-mt-10 grid size-12 place-items-center rounded-xl border-4 border-background bg-primary font-semibold text-primary-foreground">A</div>
          <div className="mt-2 font-semibold">Atelier Nove</div>
          <div className="text-xs text-muted-foreground">Hair & beauty studio · Milan</div>
          <div className="mt-4 text-xs font-medium">Thu 14 · Afternoon</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {["14:00", "14:15", "14:45", "15:30", "16:00", "16:30"].map((t, i) => (
              <motion.div key={t} animate={i === 3 ? { backgroundColor: ["var(--card)", "var(--primary)", "var(--primary)"], color: ["var(--foreground)", "var(--primary-foreground)", "var(--primary-foreground)"] } : {}}
                transition={{ delay: 1.4, duration: 0.4 }} className="rounded-lg border bg-card py-2 text-center text-[11px] font-medium">{t}</motion.div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-foreground py-2.5 text-center text-xs font-medium text-background">Confirm booking</div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.35 }}
        className="surface absolute bottom-6 right-0 w-[260px] p-5 shadow-float">
        <div className="text-xs text-muted-foreground">Bookings this week</div>
        <div className="mt-1 text-3xl font-semibold">47</div>
        <div className="mt-4 flex h-14 items-end gap-1">{[40, 62, 55, 80, 70, 95, 66].map((h, i) => <span key={i} style={{ height: `${h}%` }} className="flex-1 rounded-t bg-primary/80" />)}</div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9 }} className="mt-4 flex items-center gap-2 rounded-xl bg-status-confirmed p-2.5 text-xs text-status-confirmed-foreground">
          <Check className="size-3.5" /> New booking from Giulia
        </motion.div>
      </motion.div>
    </div>
  );
}

function MiniPreview() {
  const services = [{ n: "Signature cut", d: 45, p: "€48" }, { n: "Colour & gloss", d: 90, p: "€95" }, { n: "Blow-dry & style", d: 30, p: "€32" }];
  const [svc, setSvc] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const reset = () => { setSvc(null); setTime(null); setDone(false); };
  return (
    <div className="surface mx-auto w-full max-w-md p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground"><span>Atelier Nove</span><span>{done ? "Done" : svc === null ? "1 / 3" : time ? "3 / 3" : "2 / 3"}</span></div>
      {done ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><Check /></div>
          <div className="font-semibold">You're booked!</div>
          <div className="text-sm text-muted-foreground">{services[svc!].n} · Thu {time}</div>
          <Button variant="ghost" size="sm" className="mt-4" onClick={reset}>Try again</Button>
        </div>
      ) : svc === null ? (
        <div className="space-y-2">
          {services.map((s, i) => (
            <button key={s.n} onClick={() => setSvc(i)} className="flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors hover:border-primary">
              <span><span className="block font-medium">{s.n}</span><span className="text-xs text-muted-foreground">{s.d} min</span></span>
              <span className="text-sm font-medium">{s.p}</span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-3 text-sm font-medium">{services[svc].n} · Thursday</div>
          <div className="grid grid-cols-3 gap-2">
            {["09:00", "09:45", "10:30", "11:15", "14:00", "15:30"].map((t) => (
              <button key={t} onClick={() => setTime(t)} className={cn("h-11 rounded-xl border text-sm font-medium transition-colors", time === t ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground/30")}>{t}</button>
            ))}
          </div>
          <Button className="mt-5 w-full" size="lg" disabled={!time} onClick={() => setDone(true)}>Confirm booking</Button>
          <button onClick={reset} className="mt-2 w-full text-xs text-muted-foreground hover:underline">Back</button>
        </div>
      )}
    </div>
  );
}
