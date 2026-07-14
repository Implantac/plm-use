import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Download, Eye, FileCode2, PenTool, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/_authenticated/cad")({
  component: CadPage,
});

const integrations = [
  { name: "Adobe Illustrator", mode: "Importar / Exportar", status: "Conectado" },
  { name: "Corel Draw", mode: "Importar / Exportar", status: "Conectado" },
  { name: "Audaces", mode: "Modelagem", status: "Sync pendente" },
  { name: "Lectra", mode: "Encaixe / risco", status: "Homologado" },
  { name: "Gerber", mode: "Modelagem", status: "Homologado" },
  { name: "Optitex", mode: "3D / moldes", status: "Beta" },
  { name: "Browzwear", mode: "3D sampling", status: "Beta" },
  { name: "CLO3D", mode: "3D preview", status: "Conectado" },
];

const files = [
  { name: "Blusa_Linho_Amalfi_v4.ai", format: "AI", version: "v4", status: "Aprovado" },
  { name: "Molde_Pantalona_Riviera.dxf", format: "DXF", version: "v2", status: "Revisão" },
  { name: "Risco_Vestido_Gala.plt", format: "PLT", version: "v1", status: "Produção" },
  { name: "Ficha_exportada.svg", format: "SVG", version: "v3", status: "Aprovado" },
];

function CadPage() {
  return (
    <ModuleLayout
      title="CAD e Modelagem"
      subtitle="Integrações nativas com ferramentas CAD, formatos técnicos e preview instantâneo de modelagem."
      version="CAD Hub v1.0"
      searchPlaceholder="Buscar arquivo, formato, integração ou versão"
      metrics={[
        { label: "Integrações", value: "8", detail: "CAD / 3D" },
        { label: "Formatos", value: "AI CDR DXF PLT PDF SVG", detail: "suportados" },
        { label: "Arquivos", value: String(files.length), detail: "versionados" },
        { label: "Preview", value: "Live", detail: "visualizador interno" },
      ]}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          <Card className="glass-card rounded-lg overflow-hidden">
            <CardHeader className="p-5 border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Visualizador técnico interno
              </CardTitle>
              <div className="flex gap-2">
                <Button
 variant="outline"
 className="text-[10px] tracking-[0.14em]"
 >
                  <Upload className="mr-2 h-4 w-4" /> Importar
                </Button>
                <Button className="text-[10px] tracking-[0.14em]">
                  <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="relative min-h-[520px] rounded-lg border border-white/10 bg-black/30 overflow-hidden">
                <div className="absolute inset-0 bg-grid-white opacity-60" />
                <div className="absolute inset-8 rounded-lg border border-primary/20 bg-primary/[0.035]" />
                <div className="absolute left-1/2 top-1/2 h-[380px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-t-[80px] rounded-b-lg border-2 border-primary/60 bg-primary/10 shadow-[0_0_80px_rgba(255,255,255,0.04)]" />
                <div className="absolute left-[calc(50%-170px)] top-[calc(50%-110px)] h-[220px] w-[100px] rotate-12 rounded-full border border-primary/35" />
                <div className="absolute right-[calc(50%-170px)] top-[calc(50%-110px)] h-[220px] w-[100px] -rotate-12 rounded-full border border-primary/35" />
                <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Molde", value: "DXF v2" },
                    { label: "Escala", value: "1:1" },
                    { label: "Camadas", value: "12" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-md border border-white/10 bg-black/50 p-3 backdrop-blur"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg overflow-hidden">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Arquivos técnicos versionados
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="border-b border-white/5 bg-white/5">
                  <tr>
                    {["Arquivo", "Formato", "Versão", "Status", "Ações"].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {files.map((file) => (
                    <tr key={file.name} className="hover:bg-white/[0.025]">
                      <td className="px-5 py-4 text-sm font-bold text-white">{file.name}</td>
                      <td className="px-5 py-4 text-xs text-primary font-bold">{file.format}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{file.version}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                          {file.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Button
 size="icon"
 variant="ghost"
 className="w-8 text-muted-foreground hover:text-primary"
 >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
 size="icon"
 variant="ghost"
 className="w-8 text-muted-foreground hover:text-primary"
 >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card rounded-lg">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Integrações nativas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                        {integration.name}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{integration.mode}</p>
                    </div>
                    <CheckCircle2
                      className={`h-4 w-4 ${integration.status === "Conectado" ? "text-emerald-300" : "text-primary"}`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg border-primary/20 bg-primary/[0.025]">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Preview instantâneo
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                Alterações de molde são comparadas com a ficha técnica e com o consumo previsto
                antes de liberar produção.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  { label: "Consumo tecido", value: 82 },
                  { label: "Compatibilidade grade", value: 94 },
                  { label: "Risco de divergência", value: 18 },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      <span>{metric.label}</span>
                      <span>{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className="mt-2 h-1.5 bg-white/10" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg">
            <CardContent className="p-5 grid grid-cols-3 gap-3">
              {["DXF", "PLT", "PDF", "SVG", "AI", "CDR"].map((format) => (
                <div
                  key={format}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-center"
                >
                  <FileCode2 className="mx-auto h-4 w-4 text-primary" />
                  <p className="mt-2 text-[10px] font-bold text-white">{format}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
