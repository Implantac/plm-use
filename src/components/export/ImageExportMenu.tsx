import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EXPORT_FORMATS, exportImage, type ExportFormat } from "@/lib/export/image-export";

export function ImageExportMenu({ src, baseName }: { src: string; baseName: string }) {
  const [busy, setBusy] = useState(false);
  async function run(f: ExportFormat) {
    setBusy(true);
    try {
      await exportImage(src, baseName, f);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="ghost" disabled={busy} className="h-7 gap-1 px-2 text-xs text-primary">
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Exportar como</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXPORT_FORMATS.map((f) => (
          <DropdownMenuItem key={f.id} onSelect={() => void run(f.id)} className="flex flex-col items-start">
            <span className="text-sm">{f.label}</span>
            <span className="text-[11px] text-muted-foreground">{f.hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
