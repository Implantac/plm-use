import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCsv, printTable, type Row } from "@/lib/export/csv";
import { toast } from "sonner";

type Props = {
  title: string;
  filename: string;
  rows: Row[];
  columns?: string[];
  label?: string;
};

export function ExportMenu({ title, filename, rows, columns, label = "Exportar" }: Props) {
  const disabled = rows.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
 variant="outline"
 size="sm"
 disabled={disabled}
 className="bg-white/5 hover:bg-white/10 text-[10px] tracking-[0.18em]"
 >
          <Download className="w-3.5 h-3.5 mr-2" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card border-white/10 bg-black/95 w-56">
        <DropdownMenuLabel className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          {rows.length} registros
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
          className="text-[11px] cursor-pointer"
          onClick={() => {
            downloadCsv(filename, rows, columns);
            toast.success("CSV exportado", { description: `${rows.length} linhas · ${filename}.csv` });
          }}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Baixar CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[11px] cursor-pointer"
          onClick={() => {
            printTable(title, rows, columns);
          }}
        >
          <Printer className="w-3.5 h-3.5 mr-2" /> Imprimir / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
