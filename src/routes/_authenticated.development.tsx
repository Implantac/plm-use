import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Paperclip, MoreHorizontal, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModuleLayout, ModuleActionMenu } from "@/components/modules/ModuleLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/development")({
  component: DevelopmentPage,
});

function DevelopmentPage() {
  const [columns, setColumns] = useState([
    {
      name: "Ideia",
      tasks: [
        {
          id: "V24-001",
          title: "Blusa Linho Amalfi",
          category: "Top",
          designer: "Julia",
          priority: "Alta",
          image:
            "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=400",
        },
        {
          id: "V24-005",
          title: "Saia Midi Seda",
          category: "Bottom",
          designer: "Julia",
          priority: "Média",
          image:
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      name: "Croqui",
      tasks: [
        {
          id: "V24-011",
          title: "Regata Drapeada Resort",
          category: "Top",
          designer: "Livia",
          priority: "Média",
          image:
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      name: "Modelagem",
      tasks: [
        {
          id: "V24-002",
          title: "Calça Pantalona Chic",
          category: "Bottom",
          designer: "Marcio",
          priority: "Alta",
          image:
            "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      name: "Piloto",
      tasks: [
        {
          id: "V24-003",
          title: "Vestido Longo Gala",
          category: "Dress",
          designer: "Julia",
          priority: "Urgente",
          image:
            "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=400",
        },
        {
          id: "V24-008",
          title: "Blazer Estruturado",
          category: "Outwear",
          designer: "Marcio",
          priority: "Alta",
          image:
            "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      name: "Ajuste",
      tasks: [
        {
          id: "V24-014",
          title: "Short Alfaiataria Utility",
          category: "Bottom",
          designer: "Julia",
          priority: "Alta",
          image:
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      name: "Aprovação",
      tasks: [
        {
          id: "V24-004",
          title: "Camisa Social Premium",
          category: "Top",
          designer: "Julia",
          priority: "Baixa",
          image:
            "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      name: "Produção",
      tasks: [
        {
          id: "V24-018",
          title: "Chemise Linen Office",
          category: "Dress",
          designer: "Marcio",
          priority: "Alta",
          image:
            "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      name: "Lançamento",
      tasks: [
        {
          id: "V24-021",
          title: "Top Resort Glow",
          category: "Top",
          designer: "Livia",
          priority: "Média",
          image:
            "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
  ]);

  type DevelopmentTask = (typeof columns)[number]["tasks"][number];
  type ColumnName = (typeof columns)[number]["name"];

  const flow: ColumnName[] = [
    "Ideia",
    "Croqui",
    "Modelagem",
    "Piloto",
    "Ajuste",
    "Aprovação",
    "Produção",
    "Lançamento",
  ];

  const allowedTransition = (from: ColumnName, to: ColumnName) => {
    const fromIdx = flow.indexOf(from);
    const toIdx = flow.indexOf(to);
    return fromIdx !== -1 && toIdx !== -1 && toIdx === fromIdx + 1;
  };

  const [draggedTask, setDraggedTask] = useState<{
    task: DevelopmentTask;
    fromColumn: ColumnName;
  } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnName | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const onDragStartTask = (
    task: DevelopmentTask,
    fromColumn: ColumnName,
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-dev-task", JSON.stringify({ id: task.id, fromColumn }));
    setDraggedTask({ task, fromColumn });
    setIsDragging(true);
  };

  const onDragEndTask = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    setIsDragging(false);
  };

  const onDragOverColumn = (toColumn: ColumnName, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask) return;
    if (allowedTransition(draggedTask.fromColumn, toColumn)) {
      setDragOverColumn(toColumn);
    } else {
      setDragOverColumn(null);
    }
  };

  const onDropColumn = (toColumn: ColumnName, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask) return;

    const fromColumn = draggedTask.fromColumn;
    const task = draggedTask.task;

    moveTask(task, fromColumn, toColumn);
    setDragOverColumn(null);
  };

  const moveTask = (task: DevelopmentTask, fromColumn: ColumnName, toColumn: ColumnName) => {
    if (fromColumn === toColumn) return;

    if (!allowedTransition(fromColumn, toColumn)) {
      toast.error(
        `Fluxo inválido: mova apenas para a próxima etapa (${fromColumn} → ${flow[flow.indexOf(fromColumn) + 1]})`,
      );
      return;
    }

    setColumns((prev) => {
      const next = prev.map((col) => {
        if (col.name === fromColumn) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== task.id) };
        }
        if (col.name === toColumn) {
          return { ...col, tasks: [{ ...task }, ...col.tasks] };
        }
        return col;
      });

      return next;
    });
  };
  const [editingTask, setEditingTask] = useState<DevelopmentTask | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    designer: "Julia",
    priority: "Média",
  });

  const handleOpenDialog = (task?: DevelopmentTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        category: task.category,
        designer: task.designer,
        priority: task.priority,
      });
    } else {
      setEditingTask(null);
      setFormData({ title: "", category: "", designer: "Julia", priority: "Média" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingTask) {
      setColumns(
        columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === editingTask.id ? { ...t, ...formData } : t)),
        })),
      );
      toast.success("Produto atualizado no Kanban");
    } else {
      const newTask = {
        id: `V24-${Math.floor(Math.random() * 900) + 100}`,
        ...formData,
        image:
          "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=400",
      };
      const newCols = [...columns];
      newCols[0].tasks = [newTask, ...newCols[0].tasks];
      setColumns(newCols);
      toast.success("Nova ideia adicionada");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setColumns(
      columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== id),
      })),
    );
    toast.error("Removido do desenvolvimento");
  };

  return (
    <ModuleLayout
      title="Desenvolvimento"
      subtitle="Fluxo visual do conceito ao lançamento, com referência, categoria, marca, linha, família e responsável."
      version="Engineering v3.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar referência, categoria ou responsável"
      metrics={[
        {
          label: "Referências",
          value: String(columns.reduce((sum, col) => sum + col.tasks.length, 0)),
          detail: "em desenvolvimento",
        },
        { label: "Pilotos", value: "2", detail: "aguardando avaliação" },
        { label: "Urgentes", value: "1", detail: "bloqueia aprovação" },
        { label: "Prob. média", value: "87%", detail: "fit comercial IA" },
      ]}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 no-scrollbar min-h-[620px]">
        {columns.map((col, i) => (
          <div key={i} className="min-w-[292px] flex flex-col gap-4">
            <div className="flex items-center justify-between px-1 mb-1">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {col.name}
                <span className="text-muted-foreground ml-2">({col.tasks.length})</span>
              </h3>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <div
              className={`flex-1 space-y-4 ${
                dragOverColumn === col.name && draggedTask
                  ? "ring-2 ring-primary/60 rounded-md"
                  : ""
              }`}
              onDragOver={(e) => onDragOverColumn(col.name as ColumnName, e)}
              onDrop={(e) => onDropColumn(col.name as ColumnName, e)}
            >
              {col.tasks.map((task, ti) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ti * 0.1 }}
                >
                  <Card
                    draggable
                    onDragStart={(e) => onDragStartTask(task, col.name as ColumnName, e)}
                    onDragEnd={onDragEndTask}
                    className={`glass-card rounded-lg border-white/5 hover:border-primary/30 transition-all group relative ${
                      isDragging ? "cursor-grabbing" : "cursor-grab"
                    } ${draggedTask?.task.id === task.id ? "opacity-70" : "opacity-100"}`}
                  >
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ModuleActionMenu
                        onEdit={() => handleOpenDialog(task)}
                        onDelete={() => handleDelete(task.id)}
                        onView={() => toast.info(`Abrindo detalhes de ${task.title}`)}
                      />
                    </div>
                    <CardContent className="p-0 overflow-hidden">
                      {task.image && (
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            src={task.image}
                            alt={task.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      <div className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded uppercase tracking-widest">
                            {task.id}
                          </span>
                          <span
                            className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${task.priority === "Urgente" ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span className="text-[8px] font-black uppercase text-emerald-400 tracking-tighter">
                            Probabilidade: 87%
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                          {task.title}
                        </h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {task.category}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-6 h-6 border border-white/10">
                              <AvatarImage src={`https://i.pravatar.cc/100?u=${task.designer}`} />
                              <AvatarFallback className="text-[8px] font-bold">
                                {task.designer[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                              {task.designer}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span className="flex items-center gap-1 text-[9px] font-bold">
                              <Paperclip className="w-3 h-3" /> 2
                            </span>
                            <span className="flex items-center gap-1 text-[9px] font-bold">
                              <MessageSquare className="w-3 h-3" /> 4
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2.5rem] p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter italic">
              {editingTask ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Título do Modelo
              </Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: Blusa Verão Amalfi"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Categoria
                </Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: Top"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Designer
                </Label>
                <Input
                  value={formData.designer}
                  onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: Julia"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl h-12 text-[10px] font-bold uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest btn-primary-premium"
            >
              Salvar no Kanban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
