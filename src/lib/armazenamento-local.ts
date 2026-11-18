// Onda 105 — leitura/gravação de localStorage com aviso único e motivo real.
// Os stores de módulo (eventos locais, filtros salvos, rotas recentes) liam
// com `catch { return [] }` e gravavam sem try: dado corrompido sumia em
// silêncio e, em modo privado/cota cheia, a gravação lançava e derrubava a UI.
import { toast } from "sonner";
import { avisoUnico, motivoArmazenamentoLocal } from "@/lib/supabase/erro-humano";

function avisar(msg: string, nivel: "warning" | "error") {
  if (!avisoUnico(msg)) return;
  // Pode rodar na carga do módulo, antes do <Toaster/> montar — adia um tick.
  setTimeout(() => toast[nivel](msg), 0);
}

/** Lê e faz parse; ausência → `fallback` em silêncio; corrompido → aviso + `fallback`. */
export function lerLocal<T>(
  chave: string,
  oQue: string,
  fallback: T,
  valida?: (v: unknown) => v is T,
): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(chave);
  } catch (e) {
    avisar(motivoArmazenamentoLocal(oQue, "ler", e), "warning");
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (valida && !valida(parsed)) throw new Error("formato inesperado");
    return parsed as T;
  } catch (e) {
    avisar(motivoArmazenamentoLocal(oQue, "ler", e), "warning");
    return fallback;
  }
}

/** Grava JSON; falha (cota, modo privado, política) → aviso único, nunca exceção. */
export function gravarLocal(chave: string, oQue: string, valor: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (e) {
    avisar(motivoArmazenamentoLocal(oQue, "gravar", e), "error");
    return false;
  }
}
