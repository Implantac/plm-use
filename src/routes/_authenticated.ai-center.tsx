import { createFileRoute } from "@tanstack/react-router";
import { ProductStudio } from "@/components/ai/ProductStudio";

export const Route = createFileRoute("/_authenticated/ai-center")({
  component: ProductStudio,
  head: () => ({
    meta: [
      { title: "AI Product Studio · USE MODA PLM" },
      {
        name: "description",
        content:
          "Crie propostas conceituais de produto com IA, revise-as e salve como rascunhos de referência.",
      },
    ],
  }),
});
