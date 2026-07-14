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
  metrics = [],
}: ModuleLayoutProps) {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-5 rounded-lg border border-white/10 bg-white/[0.025] p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-[0.18em]">
                {version}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight uppercase text-white mb-2 leading-none">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">{subtitle}</p>
          </motion.div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <Input
                className="pl-10 focus:border-primary/40 focus:ring-0 text-[10px] font-bold uppercase tracking-widest/40"
                placeholder={searchPlaceholder}
              />
            </div>
            {onAdd && (
              <Button
 onClick={onAdd}
 className="text-[10px] tracking-[0.16em] gap-2"
 >
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            )}
          </div>
        </div>

        {metrics.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-white/5 pt-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-2 text-xl font-bold tracking-tight text-white">{metric.value}</p>
                {metric.detail && (
                  <p className="mt-1 text-[10px] text-muted-foreground">{metric.detail}</p>
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
        className="glass-card border-white/10 bg-black/90 text-white min-w-[160px] p-2 rounded-md"
      >
        {onView && (
          <DropdownMenuItem
            onClick={onView}
            className="gap-3 text-[9px] font-bold uppercase tracking-widest p-3 rounded-md cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-primary group"
          >
            <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Visualizar
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem
            onClick={onEdit}
            className="gap-3 text-[9px] font-bold uppercase tracking-widest p-3 rounded-md cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-primary group"
          >
            <Edit2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Editar
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="gap-3 text-[9px] font-bold uppercase tracking-widest p-3 rounded-md cursor-pointer hover:bg-rose-500/10 focus:bg-rose-500/10 text-rose-400 group"
          >
            <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
