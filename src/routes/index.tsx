import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "USE MODA PLM AI | Cockpit Executivo" },
      {
        name: "description",
        content:
          "Plataforma PLM com IA para pesquisa, colecoes, desenvolvimento, producao, marketing, vendas e rentabilidade.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <Navigate to="/dashboard" />;
}
