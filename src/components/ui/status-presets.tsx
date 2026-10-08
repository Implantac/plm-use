// Presets compartilhados de badge + toast para sucesso/erro/aviso/info.
// Usa tokens semânticos do design system (status-approved / status-rejected / etc.)
// para manter contraste idêntico em light/dark.
import * as React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export type StatusTone = "success" | "error" | "warning" | "info" | "neutral";

export const STATUS_TOAST_CLASS: Record<StatusTone, string> = {
  success:
    "!border !border-status-approved/50 !bg-status-approved/10 !text-status-approved [&_[data-icon]]:!text-status-approved [&_[data-description]]:!text-status-approved/80",
  error:
    "!border !border-status-rejected/50 !bg-status-rejected/10 !text-status-rejected [&_[data-icon]]:!text-status-rejected [&_[data-description]]:!text-status-rejected/80",
  warning:
    "!border !border-amber-400/50 !bg-amber-400/10 !text-amber-300 [&_[data-icon]]:!text-amber-300 [&_[data-description]]:!text-amber-200/80",
  info: "!border !border-sky-400/50 !bg-sky-400/10 !text-sky-300 [&_[data-icon]]:!text-sky-300 [&_[data-description]]:!text-sky-200/80",
  neutral: "!border !border-white/20 !bg-white/5 !text-white [&_[data-description]]:!text-white/70",
};

export const STATUS_BADGE_CLASS: Record<StatusTone, string> = {
  success: "border-status-approved/50 bg-status-approved/10 text-status-approved",
  error: "border-status-rejected/50 bg-status-rejected/10 text-status-rejected",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  info: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  neutral: "border-white/20 bg-white/5 text-white/80",
};

const ICONS: Record<StatusTone, React.ReactNode> = {
  success: <CheckCircle2 className="h-3.5 w-3.5" />,
  error: <AlertTriangle className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
  info: <Info className="h-3.5 w-3.5" />,
  neutral: null,
};

type ToastOpts = { description?: string; id?: string | number };

export const statusToast = {
  success(message: string, opts?: ToastOpts) {
    return toast.success(message, {
      ...opts,
      icon: ICONS.success,
      className: STATUS_TOAST_CLASS.success,
    });
  },
  error(message: string, opts?: ToastOpts) {
    return toast.error(message, {
      ...opts,
      icon: ICONS.error,
      className: STATUS_TOAST_CLASS.error,
    });
  },
  warning(message: string, opts?: ToastOpts) {
    return toast(message, {
      ...opts,
      icon: ICONS.warning,
      className: STATUS_TOAST_CLASS.warning,
    });
  },
  info(message: string, opts?: ToastOpts) {
    return toast(message, {
      ...opts,
      icon: ICONS.info,
      className: STATUS_TOAST_CLASS.info,
    });
  },
};

export function StatusBadge({
  tone,
  children,
  className = "",
  withIcon = false,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
  withIcon?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={`text-[9px] gap-1 ${STATUS_BADGE_CLASS[tone]} ${className}`}
    >
      {withIcon && ICONS[tone]}
      {children}
    </Badge>
  );
}
