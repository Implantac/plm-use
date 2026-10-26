import { Plus, Search, MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

interface ModuleLayoutProps {
  title: string;
  subtitle: string;
  version: string;
  onAdd?: () => void;
  children: React.ReactNode;
  searchPlaceholder?: string;
  /**
   * Busca do módulo. O Input só renderiza quando a tela implementa onSearch —
   * antes havia 22 caixas decorativas (o Input não tinha onChange em nenhuma).
   * Tela nova: ou filtra de verdade, ou não mostra a caixa.
   */
  onSearch?: (q: string) => void;
  metrics?: Array<{
    label: string;
    value: string;
    detail?: string;
  }>;
}

export function ModuleLayout({
  title,
  subtitle,
  version,
  onAdd,
  children,
  searchPlaceholder = "Buscar...",
  onSearch,
  metrics = [],
}: ModuleLayoutProps) {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-muted/50 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-2xs font-semibold uppercase tracking-[0.04em]">
                {version}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground mb-2">{title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">{subtitle}</p>
          </motion.div>
          <div className="flex flex-col sm:flex-row gap-3">
            {onSearch && (
              <div className="relative group w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <Input
                  className="pl-10 focus:border-primary/40 focus:ring-0 text-2xs font-semibold uppercase tracking-widest/40"
                  placeholder={searchPlaceholder}
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            )}
            {onAdd && (
              <Button onClick={onAdd} className="text-2xs tracking-[0.04em] gap-2">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            )}
          </div>
        </div>

        {metrics.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-border/60 pt-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-md border border-border bg-black/20 p-3">
                <p className="text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-2 text-xl font-bold tracking-tight text-white">{metric.value}</p>
                {metric.detail && (
                  <p className="mt-1 text-2xs text-muted-foreground">{metric.detail}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ModuleActionMenu({
  onEdit,
  onDelete,
  onView,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="glass-card border-border bg-black/90 text-white min-w-[160px] p-2 rounded-md"
      >
        {onView && (
          <DropdownMenuItem
            onClick={onView}
            className="gap-3 text-2xs font-semibold uppercase tracking-widest p-3 rounded-md cursor-pointer hover:bg-accent/60 focus:bg-muted/50 focus:text-primary group"
          >
            <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Visualizar
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem
            onClick={onEdit}
            className="gap-3 text-2xs font-semibold uppercase tracking-widest p-3 rounded-md cursor-pointer hover:bg-accent/60 focus:bg-muted/50 focus:text-primary group"
          >
            <Edit2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Editar
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="gap-3 text-2xs font-semibold uppercase tracking-widest p-3 rounded-md cursor-pointer hover:bg-status-rejected/10 focus:bg-status-rejected/10 text-status-rejected group"
          >
            <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
