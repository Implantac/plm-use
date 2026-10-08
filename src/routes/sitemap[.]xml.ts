import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Só rotas públicas entram aqui. As telas em src/routes/_authenticated.* exigem
// sessão (o layout devolve "Autenticando..." e redireciona para /login), então
// anunciá-las só entrega ruído de indexação e URLs que respondem placeholder a
// crawlers. Ao criar uma rota pública nova (landing, termos, planos), adicione-a
// em `entries` abaixo.
const BASE_URL = "https://usemoda.ai"; // Placeholder URL

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // `/` redireciona para /dashboard (rota autenticada), então não é conteúdo
        // público indexável — listá-lo só cria soft-404. Sobra /login como a única
        // superfície pública real até existir uma landing.
        const entries: SitemapEntry[] = [
          { path: "/login", changefreq: "monthly", priority: "0.5" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
