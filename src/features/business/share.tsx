import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export const publicUrl = (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/b/${slug}`;

export function CopyLink({ slug }: { slug: string }) {
  const url = publicUrl(slug);
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-background p-1.5 pl-3">
      <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{url.replace(/^https?:\/\//, "")}</span>
      <Button size="sm" variant="ink" onClick={() => { navigator.clipboard.writeText(url); toast.success(copy.common.copied); }}>
        <Copy /> {copy.common.copy}
      </Button>
    </div>
  );
}

export function QrBlock({ slug, size = 132 }: { slug: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const download = () => {
    const canvas = ref.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${slug}-qr.png`;
    a.click();
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className="rounded-xl border bg-card p-2">
        <QRCodeCanvas value={publicUrl(slug)} size={size} marginSize={1} level="M" />
      </div>
      <Button size="sm" variant="ghost" onClick={download}><Download /> PNG</Button>
    </div>
  );
}

export function OpenPage({ slug }: { slug: string }) {
  return (
    <Button variant="outline" asChild>
      <a href={`/b/${slug}`} target="_blank" rel="noreferrer"><ExternalLink /> {copy.common.open}</a>
    </Button>
  );
}
