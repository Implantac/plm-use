// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      // O wrapper acima já define host/port/strictPort para o sandbox do Lovable, mas
      // não libera hosts de preview externos — o dev server respondia HTTP 403
      // ("Blocked request. This host is not allowed.") para o host do sandbox de
      // preview, o que impedia abrir o app fora do Lovable.
      //
      // `true` desativa a checagem por completo, o que é aceitável num dev server
      // (ele só escuta quem consegue alcançar a porta). Estes hosts são de
      // desenvolvimento/preview — nenhum deles é domínio de produção.
      allowedHosts: true,
    },
  },
});
