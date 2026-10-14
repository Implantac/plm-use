import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "USE MODA PLM AI | Cockpit Executivo" },
      {
        name: "description",
        content:
          "Plataforma PLM com IA para desenvolvimento de produto de moda: pesquisa, colecoes, fichas tecnicas, amostras, fornecedores e PCP.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <Navigate to="/dashboard" />;
}
