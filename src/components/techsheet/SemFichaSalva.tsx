import { FileWarning } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * Estado vazio das telas que emitem documento a partir de uma ficha técnica.
 *
 * Antes dessas telas nascia com `DEV000006` selecionado e o PDF saía com o nome
 * de um produto de demonstração. Emitir documento a partir de ficha que ninguém
 * editou é pior do que não emitir: alguém imprime e leva para a facção.
 */
export function SemFichaSalva({ acao }: { acao: string }) {
  return (
    <div
      data-testid="sem-ficha-salva"
      className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1"
    >
      <p className="flex items-center gap-1.5 font-semibold">
        <FileWarning className="h-3.5 w-3.5" />
        Nenhuma ficha técnica salva
      </p>
      <p className="leading-snug">
        Não há como {acao} usando dados de demonstração — o documento sairia com o nome de um
        produto que não existe na empresa. Abra uma ficha em{" "}
        <Link to="/development" className="underline">
          Desenvolvimento
        </Link>{" "}
        e salve antes de continuar.
      </p>
    </div>
  );
}
