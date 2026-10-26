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
          className="bg-muted/50 hover:bg-accent text-2xs tracking-[0.04em]"
        >
          <Download className="w-3.5 h-3.5 mr-2" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card border-border bg-popover w-56">
        <DropdownMenuLabel className="text-2xs uppercase tracking-[0.05em] text-muted-foreground">
          {rows.length} registros
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-muted/50" />
        <DropdownMenuItem
          className="text-xs cursor-pointer"
          onClick={() => {
            downloadCsv(filename, rows, columns);
            toast.success("CSV exportado", {
              description: `${rows.length} linhas · ${filename}.csv`,
            });
          }}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Baixar CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs cursor-pointer"
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
