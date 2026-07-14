import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Heart,
  Share2,
  Paperclip,
  Send,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const posts = [
    {
      user: "Julia Designer",
      role: "Designer Sênior",
      content:
        "Acabei de finalizar as variantes da Blusa Amalfi. O linho off-white com botões madrepérola ficou incrível. O que acham?",
      time: "2h atrás",
      likes: 12,
      comments: 4,
      type: "Update de Design",
      ref: "Ref. 811",
    },
    {
      user: "Marcio PCP",
      role: "Gerente de Produção",
      content:
        "Lote V24-003 (Vestido Gala) entrando em fase de acabamento. QC planejado para amanhã às 09:00.",
      time: "4h atrás",
      likes: 8,
      comments: 2,
      type: "Produção Iniciada",
      ref: "OP-042",
    },
    {
      user: "Ricardo Compras",
      role: "Procurement",
      content:
        "Fornecedor Têxtil Amalfi confirmou a entrega de 500m de linho off-white para próxima segunda-feira.",
      time: "6h atrás",
      likes: 5,
      comments: 1,
      type: "Logística Inbound",
      ref: "Pedido #882",
    },
  ];

  return (
    <div className="h-[calc(100vh-160px)] flex gap-8">
      <div className="flex-1 flex flex-col space-y-8 overflow-y-auto no-scrollbar pb-10">
        <div className="shrink-0">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl font-bold tracking-tighter uppercase text-white mb-2 leading-none">
              Collaboration
            </h1>
            <p className="text-muted-foreground text-sm font-light italic lowercase">
              o pulso da sua marca. alinhe design, produção e marketing em um único feed.
            </p>
          </motion.div>
        </div>

        <Card className="glass-card rounded-[2.5rem] p-8 shrink-0">
          <div className="flex gap-4">
            <Avatar className="w-12 h-12 border border-white/10">
              <AvatarFallback className="text-[10px] font-bold">UA</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <textarea
                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-muted-foreground/50 resize-none h-20 text-sm font-light leading-relaxed italic"
                placeholder="O que está acontecendo na sua marca hoje?"
              />
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="flex gap-2">
                  <Button
 variant="ghost"
 size="icon"
 className="text-muted-foreground hover:text-white"
 >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
 variant="ghost"
 size="icon"
 className="text-muted-foreground hover:text-white"
 >
                    <AlertCircle className="w-4 h-4" />
                  </Button>
                </div>
                <Button className="text-[9px] tracking-[0.2em]">
                  Publicar
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {posts.map((post, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-card rounded-[2.5rem] p-8 hover:border-primary/20 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarFallback className="text-[9px] font-bold">
                        {post.user[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">{post.user}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-primary">
                        {post.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
                      {post.time}
                    </span>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm font-light text-white leading-relaxed italic mb-8">
                  "{post.content}"
                </p>

                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                  <div className="flex gap-6">
                    <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-rose-400 group/btn px-2">
                      <Heart className="w-4 h-4 group-hover/btn:fill-current" />
                      <span>{post.likes}</span>
                    </Button>
                    <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-primary px-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments}</span>
                    </Button>

                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-primary/60">
                    <span className="text-muted-foreground mr-2">{post.ref}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{post.type}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="w-80 space-y-8 hidden lg:block">
        <Card className="glass-card rounded-[2.5rem] p-8 space-y-8">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">
            Notificações Críticas
          </h3>
          <div className="space-y-6">
            {[
              { label: "Aprovação Pendente", ref: "PR-002", color: "bg-amber-400" },
              { label: "Atraso Produção", ref: "OP-042", color: "bg-rose-400" },
              { label: "Novo Comentário", ref: "V24-001", color: "bg-primary" },
            ].map((notif, i) => (
              <div key={i} className="flex gap-4 group cursor-pointer">
                <div className={`w-1 h-10 rounded-full ${notif.color}`} />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white group-hover:text-primary transition-colors">
                    {notif.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase">{notif.ref}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card rounded-[2.5rem] p-8 border-primary/20 bg-primary/[0.02]">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">
            Equipe Online
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="relative group cursor-pointer">
                <Avatar className="w-10 h-10 border-2 border-background group-hover:border-primary/40 transition-all">
                  <AvatarImage src={`https://i.pravatar.cc/150?u=${i + 10}`} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background shadow-lg" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
