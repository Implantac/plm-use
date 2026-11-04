// Seleção de ficha para telas que EMITEM documento ou gravam no documento.
//
// As telas de saída (impressão, cores, CAD, medições, qualidade) nasciam com
// `useState("DEV000006")` e ofereciam as quatro referências de exemplo no
// seletor. O usuário abria a tela, escolhia um lote, gerava o PDF e o documento
// saía com o nome de um produto que não existe na empresa.
//
// Aqui a regra é a mesma da Onda 22: só ficha editada por alguém entra na lista.
// Quando não há nenhuma, a tela mostra o que fazer — não inventa conteúdo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { operationalCodes } from "./provenance";
import { useTechSheetStore } from "./store";

export function useOperationalRefs() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const materializadas = useTechSheetStore((s) => s.materializadas);

  const codes = useMemo(
    () => operationalCodes(sheetsMap, [], materializadas).sort(),
    [sheetsMap, materializadas],
  );

  return { sheetsMap, materializadas, codes, hasSaved: codes.length > 0 };
}

/**
 * Ref selecionada com garantia de existir: começa vazia, assume a primeira ficha
 * salva assim que houver, e nunca guarda um código que saiu da lista.
 */
export function useSelectedRef(codes: string[]): [string, (next: string) => void] {
  const [ref, setRef] = useState<string>("");

  useEffect(() => {
    if (ref && codes.includes(ref)) return;
    setRef(codes[0] ?? "");
  }, [codes, ref]);

  return [ref, useCallback((next: string) => setRef(next), [])];
}
