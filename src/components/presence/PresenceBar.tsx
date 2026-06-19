import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { usePresence } from "@/hooks/use-presence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const moduleLabel = (path: string) => {
  const seg = path.split("/").filter(Boolean)[0] ?? "dashboard";
  return seg.replace(/-/g, " ");
};

export function PresenceBar() {
  const { user } = useAuth();
  const location = useLocation();
  const module = moduleLabel(location.pathname);
  const online = usePresence("use-moda:presence", user, module);

  if (!user) return null;
  const others = online.filter((u) => u.user_id !== user.id);
  const sameModule = others.filter((u) => u.module === module);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/5">
        <div className="relative">
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
            {others.length === 0 ? "Sozinho" : `${others.length} online`}
          </span>
        </div>
        {sameModule.length > 0 && (
          <span className="text-[9px] uppercase tracking-[0.16em] text-emerald-300 font-bold">
            · {sameModule.length} aqui
          </span>
        )}
        <div className="flex -space-x-2">
          {others.slice(0, 5).map((u) => (
            <Tooltip key={u.user_id}>
              <TooltipTrigger asChild>
                <Avatar
                  className={`w-6 h-6 border-2 ${
                    u.module === module ? "border-emerald-400" : "border-background"
                  }`}
                >
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                    {u.full_name[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">
                <div className="font-bold">{u.full_name}</div>
                <div className="opacity-70 capitalize">em {u.module}</div>
              </TooltipContent>
            </Tooltip>
          ))}
          {others.length > 5 && (
            <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">
              +{others.length - 5}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
