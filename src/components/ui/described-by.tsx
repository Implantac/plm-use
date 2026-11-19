// Onda 110 — Dialog/Sheet sem <Description> não devem avisar no console.
// Radix lê `aria-describedby` do DOM no mount do Content e avisa quando o id
// apontado não existe. Estratégia: o Content só deixa o Radix escrever o
// atributo depois que uma Description se registrar; sem Description, passa
// `aria-describedby={undefined}` (o próprio Radix documenta este opt-out).
import * as React from "react";

type Register = (on: boolean) => void;
const Ctx = React.createContext<Register | null>(null);

export function useDescribedBy(): {
  Provider: React.Provider<Register | null>;
  value: Register;
  contentProps: { "aria-describedby"?: undefined };
} {
  const [has, setHas] = React.useState(false);
  const value = React.useCallback<Register>((on) => setHas(on), []);
  return {
    Provider: Ctx.Provider,
    value,
    contentProps: has ? {} : { "aria-describedby": undefined },
  };
}

/** Chamado pela Description: registra-se enquanto estiver montada. */
export function useRegisterDescription() {
  const register = React.useContext(Ctx);
  React.useLayoutEffect(() => {
    register?.(true);
    return () => register?.(false);
  }, [register]);
}
