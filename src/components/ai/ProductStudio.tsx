import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowRight, Bot, ImageOff, LoaderCircle, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { askAgent } from "@/lib/ai/agents.functions";
import { useReferences } from "@/hooks/use-references";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ProposalSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  family: z.string(),
  line: z.string(),
  silhouette: z.string(),
  details: z.array(z.string()),
  suggestedMaterials: z.array(z.string()),
  colors: z.array(z.string()),
  variations: z.array(z.string()),
  validationNotes: z.array(z.string()),
});

type Proposal = z.infer<typeof ProposalSchema>;

type Briefing = {
  description: string;
  audience: string;
  occasion: string;
  category: string;
  collection: string;
  season: string;
  line: string;
  targetPrice: string;
  fabric: string;
  colors: string;
};

const EMPTY_BRIEFING: Briefing = {
  description: "",
  audience: "",
  occasion: "",
  category: "",
  collection: "",
  season: "",
  line: "",
  targetPrice: "",
  fabric: "",
  colors: "",
};

function nextReferenceCode(existingCodes: string[]) {
  const used = new Set(existingCodes.map((code) => code.toLocaleUpperCase("pt-BR")));
  let sequence = 1;
  let candidate = "IA-001";
  while (used.has(candidate)) {
    sequence += 1;
    candidate = `IA-${String(sequence).padStart(3, "0")}`;
  }
  return candidate;
}

function buildBriefing(briefing: Briefing) {
  return [
    `Descrição: ${briefing.description}`,
    `Público: ${briefing.audience || "não informado"}`,
    `Ocasião: ${briefing.occasion || "não informada"}`,
    `Categoria: ${briefing.category || "não informada"}`,
    `Coleção: ${briefing.collection || "não informada"}`,
    `Temporada: ${briefing.season || "não informada"}`,
    `Linha: ${briefing.line || "não informada"}`,
    `Preço-alvo informado pelo usuário: ${briefing.targetPrice || "não informado"}`,
    `Tecido desejado: ${briefing.fabric || "não informado"}`,
    `Cores: ${briefing.colors || "não informadas"}`,
  ].join("\n");
}

function parseProposal(reply: string): Proposal | null {
  const jsonText = reply
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(jsonText);
    const result = ProposalSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function ProductStudio() {
  const { items, create, loading: referencesLoading, error: referencesError } = useReferences();
  const { openEntity } = useEntityDrawer();
  const ask = useServerFn(askAgent);
  const [briefing, setBriefing] = useState(EMPTY_BRIEFING);
  const [proposalText, setProposalText] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [productName, setProductName] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestedCode = useMemo(() => nextReferenceCode(items.map((item) => item.code)), [items]);

  function updateBriefing<K extends keyof Briefing>(key: K, value: Briefing[K]) {
    setBriefing((current) => ({ ...current, [key]: value }));
  }

  async function generateConcept() {
    if (!briefing.description.trim() || generating) {
      if (!briefing.description.trim()) toast.error("Descreva a ideia do produto para começar.");
      return;
    }

    setGenerating(true);
    setProposal(null);
    setProposalText("");
    try {
      const result = await ask({
        data: {
          agent: "fashion",
          message: [
            "Crie uma proposta conceitual de produto de moda com base no briefing.",
            "Retorne somente JSON válido, sem markdown, usando exatamente estas chaves:",
            "name, description, category, family, line, silhouette, details (array de strings), suggestedMaterials (array de strings), colors (array de strings), variations (array de strings), validationNotes (array de strings).",
            "Não invente fornecedor, disponibilidade, custo real, vendas ou margem.",
            "Materiais, construção e cores são sugestões conceituais e precisam de validação humana.",
            "Não afirme que uma imagem foi gerada.",
          ].join(" "),
          context: buildBriefing(briefing),
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setProposalText(result.reply);
      const parsed = parseProposal(result.reply);
      setProposal(parsed);
      setProductName(parsed?.name ?? "");
      setReferenceCode((current) => current || suggestedCode);
      if (!parsed) {
        toast.warning(
          "A proposta chegou em formato livre. Revise e informe um nome antes de salvar.",
        );
      }
    } catch {
      toast.error("Não foi possível gerar a proposta. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    const code = referenceCode.trim() || suggestedCode;
    const name = productName.trim();
    if (!proposalText || !name) {
      toast.error("Gere uma proposta e informe o nome do produto antes de salvar.");
      return;
    }
    if (
      items.some((item) => item.code.toLocaleUpperCase("pt-BR") === code.toLocaleUpperCase("pt-BR"))
    ) {
      toast.error("Este código já está em uso. Escolha outro código para a referência.");
      return;
    }

    const parsedPrice = briefing.targetPrice.trim() ? Number(briefing.targetPrice) : null;
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      toast.error("Informe um preço-alvo válido ou deixe o campo vazio.");
      return;
    }

    setSaving(true);
    const created = await create({
      code,
      name,
      collection_id: briefing.collection.trim() || null,
      season: briefing.season.trim() || null,
      line: briefing.line.trim() || proposal?.line || null,
      theme: briefing.category.trim() || proposal?.category || null,
      target_price: parsedPrice,
      status: "IDEIA",
      metadata: {
        source: "ai_product_studio",
        review_status: "RASCUNHO_IA",
        generation_brief: buildBriefing(briefing),
        generated_concept: proposalText,
        generated_at: new Date().toISOString(),
      },
    });
    setSaving(false);

    if (!created) {
      toast.error("Não foi possível salvar o rascunho da referência.");
      return;
    }

    toast.success("Rascunho salvo para revisão humana.");
    openEntity({ type: "reference", id: created.id, title: created.name, subtitle: created.code });
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">USE MODA PLM</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">AI Product Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Transforme um briefing em conceito revisável. Salvar cria uma referência em Ideia, nunca
            um produto industrial aprovado.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/ai-agents">
            <Bot className="mr-2 h-4 w-4" /> Conversar com agentes
          </Link>
        </Button>
      </header>

      {referencesError && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/30 bg-rose-400/5 p-3 text-sm text-muted-foreground"
        >
          Não foi possível carregar referências existentes para validar códigos. Tente novamente
          antes de salvar.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.9fr)_minmax(320px,1.2fr)_minmax(240px,0.8fr)]">
        <section className="space-y-4" aria-labelledby="studio-briefing-title">
          <div>
            <h2 id="studio-briefing-title" className="text-sm font-semibold text-white">
              Briefing
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Contexto fornecido por você</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="studio-description">Ideia do produto *</Label>
              <Textarea
                id="studio-description"
                value={briefing.description}
                onChange={(event) => updateBriefing("description", event.target.value)}
                maxLength={1500}
                placeholder="Ex.: camisa feminina premium de linho para verão, estética minimalista."
                className="min-h-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-audience">Público</Label>
              <Input
                id="studio-audience"
                value={briefing.audience}
                onChange={(event) => updateBriefing("audience", event.target.value)}
                placeholder="Faixa etária, gênero, posicionamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="studio-occasion">Ocasião</Label>
                <Input
                  id="studio-occasion"
                  value={briefing.occasion}
                  onChange={(event) => updateBriefing("occasion", event.target.value)}
                  placeholder="Casual, festa…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-category">Categoria</Label>
                <Input
                  id="studio-category"
                  value={briefing.category}
                  onChange={(event) => updateBriefing("category", event.target.value)}
                  placeholder="Camisas, vestidos…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-collection">Coleção</Label>
              <Input
                id="studio-collection"
                value={briefing.collection}
                onChange={(event) => updateBriefing("collection", event.target.value)}
                placeholder="Nome ou identificador da coleção"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="studio-season">Temporada</Label>
                <Input
                  id="studio-season"
                  value={briefing.season}
                  onChange={(event) => updateBriefing("season", event.target.value)}
                  placeholder="Verão 2027"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-line">Linha</Label>
                <Input
                  id="studio-line"
                  value={briefing.line}
                  onChange={(event) => updateBriefing("line", event.target.value)}
                  placeholder="Casual, premium…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="studio-target-price">Preço-alvo (informado)</Label>
                <Input
                  id="studio-target-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={briefing.targetPrice}
                  onChange={(event) => updateBriefing("targetPrice", event.target.value)}
                  placeholder="R$"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-fabric">Tecido desejado</Label>
                <Input
                  id="studio-fabric"
                  value={briefing.fabric}
                  onChange={(event) => updateBriefing("fabric", event.target.value)}
                  placeholder="Linho, malha…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-colors">Cores e referências</Label>
              <Input
                id="studio-colors"
                value={briefing.colors}
                onChange={(event) => updateBriefing("colors", event.target.value)}
                placeholder="Off-white, azul-marinho…"
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => void generateConcept()}
            disabled={generating || !briefing.description.trim()}
          >
            {generating ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {generating ? "Criando conceito…" : "Gerar proposta"}
          </Button>
        </section>

        <section
          className="min-h-[360px] border-y border-white/10 py-4 xl:border-x xl:border-y-0 xl:px-5"
          aria-labelledby="studio-concept-title"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="studio-concept-title" className="text-sm font-semibold text-white">
                Conceito do produto
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Resposta real do Fashion AI; requer validação humana
              </p>
            </div>
            {proposalText && (
              <Badge variant="outline" className="border-amber-300/30 text-amber-200">
                Rascunho IA
              </Badge>
            )}
          </div>
          {!proposalText ? (
            <div className="mt-5 flex min-h-64 flex-col items-center justify-center gap-3 border border-dashed border-white/15 px-5 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Preencha o briefing e gere uma proposta para começar a revisão.
              </p>
            </div>
          ) : proposal ? (
            <div className="mt-5 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">{proposal.name}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {proposal.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ConceptField
                  label="Categoria / família"
                  value={[proposal.category, proposal.family].filter(Boolean).join(" · ")}
                />
                <ConceptField label="Linha" value={proposal.line} />
                <ConceptField label="Silhueta" value={proposal.silhouette} />
                <ConceptList
                  label="Materiais sugeridos · validar"
                  values={proposal.suggestedMaterials}
                />
                <ConceptList label="Cores sugeridas · validar" values={proposal.colors} />
                <ConceptList label="Detalhes de construção" values={proposal.details} />
                <ConceptList label="Variações conceituais" values={proposal.variations} />
                <ConceptList label="Pontos para revisão humana" values={proposal.validationNotes} />
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-white/10 bg-white/[0.025] p-4">
              <p className="mb-2 text-xs font-medium text-amber-200">Resposta em formato livre</p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                {proposalText}
              </pre>
            </div>
          )}
          <div className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-xs text-muted-foreground">
            <ImageOff className="mt-0.5 h-4 w-4 shrink-0" />
            Geração e análise de imagens ainda dependem de um provedor visual configurado. Esta
            proposta é textual e conceitual.
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="studio-save-title">
          <div>
            <h2 id="studio-save-title" className="text-sm font-semibold text-white">
              Revisão e produto
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Nada é liberado sem sua confirmação
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="studio-reference-name">Nome da referência *</Label>
              <Input
                id="studio-reference-name"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                maxLength={240}
                placeholder="Revise o nome antes de salvar"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-reference-code">Código *</Label>
              <Input
                id="studio-reference-code"
                value={referenceCode}
                onChange={(event) => setReferenceCode(event.target.value.toUpperCase())}
                maxLength={60}
                placeholder={referencesLoading ? "Carregando códigos…" : suggestedCode}
              />
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.025] p-4 text-xs text-muted-foreground">
            <p className="font-medium text-white">Ao salvar</p>
            <p className="mt-1">
              Será criada uma referência em Ideia com a proposta anexada ao histórico de metadados.
              O status continua sujeito ao workflow normal.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => void saveDraft()}
            disabled={
              !proposalText ||
              !productName.trim() ||
              saving ||
              referencesLoading ||
              Boolean(referencesError)
            }
          >
            {saving ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar rascunho para revisão
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/references">
              Ver referências <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

function ConceptField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-white/10 pb-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm text-white">{value || "Não informado"}</p>
    </div>
  );
}

function ConceptList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="min-w-0 border-b border-white/10 pb-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-white">
        {values.length ? values.join(" · ") : "Não informado"}
      </p>
    </div>
  );
}
