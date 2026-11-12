// Onda 45 — a primeira dobra falava 15 siglas antes de dizer uma frase em
// português simples. Medição no DOM de 35 rotas (Chromium headless):
//   BOM 12 telas · PCP 10 · DPP 5 · SAM 5 · ESG 4 · MRP 4 · CFOP 4
//   RFQ 3 · SEFAZ 3 · AQL 3 · NCM 3 · Kanban 3 · ...
//
// Este dicionário NÃO muda os rótulos dos módulos (eles apontam para telas
// reais e são usados por testes). Ele dá a tradução, num único lugar, para
// quem está no primeiro dia.

export type Termo = {
  sigla: string;
  nome: string;
  /** Uma frase em português simples, sem exigir conhecimento prévio. */
  explicacao: string;
};

export const TERMOS: readonly Termo[] = [
  {
    sigla: "BOM",
    nome: "Lista de materiais",
    explicacao:
      "A lista de todos os tecidos, aviamentos e insumos necessários para fazer uma peça.",
  },
  {
    sigla: "PCP",
    nome: "Planejamento e controle da produção",
    explicacao: "A área que define o que será produzido, em que ordem e em qual data.",
  },
  {
    sigla: "DPP",
    nome: "Passaporte digital do produto",
    explicacao: "Um dossiê com origem, composição e cuidados da peça, para rastrear o produto.",
  },
  {
    sigla: "SAM",
    nome: "Tempo padrão de costura",
    explicacao:
      "Quantos minutos uma peça leva para ser feita, usado para calcular capacidade e custo.",
  },
  {
    sigla: "ESG",
    nome: "Ambiental, social e governança",
    explicacao:
      "Critérios para medir impacto ambiental, condições de trabalho e transparência da empresa.",
  },
  {
    sigla: "GSD",
    nome: "Cronoanálise de costura",
    explicacao:
      "Método que decompõe cada movimento da costura para chegar ao tempo padrão da peça.",
  },
  {
    sigla: "RFQ",
    nome: "Pedido de cotação",
    explicacao: "O pedido de preço enviado a fornecedores antes de fechar uma compra.",
  },
  {
    sigla: "S&OP",
    nome: "Planejamento de vendas e operações",
    explicacao: "A reunião e o relatório que alinham quanto vender com quanto produzir.",
  },
  {
    sigla: "MRP",
    nome: "Planejamento de materiais",
    explicacao: "O cálculo de quais insumos comprar e quando, a partir do que será produzido.",
  },
  {
    sigla: "AQL",
    nome: "Nível de qualidade aceitável",
    explicacao: "O limite de defeitos admitido numa amostragem de inspeção de qualidade.",
  },
  {
    sigla: "OTIF",
    nome: "Entrega no prazo e completa",
    explicacao: "A porcentagem de pedidos que chegaram na data certa e sem faltar nada.",
  },
  {
    sigla: "CFOP",
    nome: "Código fiscal da operação",
    explicacao:
      "O número que identifica para a Receita que tipo de movimentação de mercadoria foi feita.",
  },
  {
    sigla: "SEFAZ",
    nome: "Secretaria da Fazenda",
    explicacao: "O órgão estadual que autoriza e recebe os documentos fiscais eletrônicos.",
  },
  {
    sigla: "NF-e",
    nome: "Nota fiscal eletrônica",
    explicacao: "O documento fiscal digital que acompanha a mercadoria e registra o imposto.",
  },
  {
    sigla: "NCM",
    nome: "Classificação fiscal do produto",
    explicacao: "O código usado pela Receita para classificar a mercadoria e definir tributos.",
  },
  {
    sigla: "OTB",
    nome: "Orçamento de compras",
    explicacao: "Quanto a empresa ainda pode gastar em mercadoria dentro do planejado.",
  },
  {
    sigla: "SKU",
    nome: "Variação do produto",
    explicacao:
      "Cada combinação vendável de modelo, cor e tamanho — por exemplo a camiseta azul, tamanho M.",
  },
  {
    sigla: "Kanban",
    nome: "Quadro de fluxo",
    explicacao: "Um quadro com colunas que mostra em que etapa está cada lote de produção.",
  },
  {
    sigla: "Yamazumi",
    nome: "Gráfico de balanceamento",
    explicacao: "Um gráfico de barras que mostra quanto tempo cada etapa da costura ocupa.",
  },
  {
    sigla: "EBITDA",
    nome: "Lucro antes de juros, impostos e depreciação",
    explicacao: "Uma medida de quanto a operação gera de resultado antes das despesas financeiras.",
  },
  {
    sigla: "ROAS",
    nome: "Retorno sobre gasto em anúncios",
    explicacao: "Quantos reais de venda voltaram para cada real investido em marketing.",
  },
  {
    sigla: "ROI",
    nome: "Retorno sobre o investimento",
    explicacao: "O ganho obtido em relação ao valor que foi investido.",
  },
  {
    sigla: "What-If",
    nome: "Simulação de cenário",
    explicacao:
      'Uma simulação do tipo "e se eu trocar este tecido ou este preço?", sem alterar o produto real.',
  },
  {
    sigla: "CFO",
    nome: "Diretoria financeira",
    explicacao: "A área responsável por caixa, custos, margem e resultado da empresa.",
  },
  {
    sigla: "CAD",
    nome: "Desenho técnico no computador",
    explicacao:
      "O arquivo de modelagem usado para definir como o tecido será cortado e aproveitado.",
  },
  {
    sigla: "EAN",
    nome: "Código de barras do produto",
    explicacao: "O número lido no caixa ou no estoque para identificar cada peça e cada tamanho.",
  },
  {
    sigla: "GTIN",
    nome: "Identificador mundial do produto",
    explicacao: "O código internacional que dá origem ao código de barras impresso na etiqueta.",
  },
  {
    sigla: "ABNT",
    nome: "Normas técnicas brasileiras",
    explicacao:
      "A organização que define regras como as de composição e conservação impressas na etiqueta.",
  },
  {
    sigla: "CAPA",
    nome: "Plano de correção de problema",
    explicacao:
      "O registro de uma falha de qualidade, da causa encontrada e da ação para não repeti-la.",
  },
  {
    sigla: "LGPD",
    nome: "Lei de proteção de dados",
    explicacao:
      "A lei brasileira que limita quais dados pessoais a empresa guarda e como ela pode usá-los.",
  },
  {
    sigla: "XML",
    nome: "Arquivo de dados estruturados",
    explicacao:
      "O arquivo usado para enviar documentos fiscais e integrar sistemas sem digitar de novo.",
  },
  {
    sigla: "DRE",
    nome: "Demonstrativo de resultados",
    explicacao:
      "O relatório que mostra receitas, custos e despesas para apurar o resultado do período.",
  },
  {
    sigla: "POM",
    nome: "Medidas da peça",
    explicacao:
      "A tabela de medidas como busto, cintura e comprimento usada na prova e na aprovação.",
  },
  // Onda 58 — seis siglas medidas no texto de 20 rotas sem glossário.
  {
    sigla: "BOP",
    nome: "Roteiro de produção",
    explicacao: "A sequência de operações e máquinas necessárias para fabricar a peça, em ordem.",
  },
  {
    sigla: "PV",
    nome: "Preço de venda",
    explicacao: "O valor pelo qual o produto será vendido, antes de impostos e descontos.",
  },
  {
    sigla: "GTM",
    nome: "Estratégia de ida ao mercado",
    explicacao:
      "O plano de lançamento: para quem vender, em qual canal, a que preço e com qual campanha.",
  },
  {
    sigla: "CRP",
    nome: "Planejamento de capacidade",
    explicacao:
      "O cálculo que compara a carga de trabalho das máquinas e equipes com o tempo disponível.",
  },
  {
    sigla: "EDD",
    nome: "Sequência por data de entrega",
    explicacao: "Regra que prioriza na produção os pedidos com a data de entrega mais próxima.",
  },
  {
    sigla: "LEC",
    nome: "Lote econômico de compra",
    explicacao:
      "A quantidade ideal a pedir de cada vez para equilibrar custo de pedido e custo de estoque.",
  },
  {
    sigla: "OP",
    nome: "Ordem de produção",
    explicacao:
      "O documento que manda produzir uma quantidade de uma peça, com prazo e responsável definidos.",
  },
  {
    sigla: "MOQ",
    nome: "Quantidade mínima de pedido",
    explicacao: "O menor número de unidades que o fornecedor aceita vender em um único pedido.",
  },
  {
    sigla: "TCO",
    nome: "Custo total de aquisição",
    explicacao:
      "O custo completo de comprar: preço, frete, impostos e prazo — não só o valor da peça.",
  },
  {
    sigla: "UTM",
    nome: "Parâmetros de rastreamento de link",
    explicacao:
      "Códigos no link que mostram de onde veio cada visita ou venda, para medir campanhas.",
  },
  {
    sigla: "CAC",
    nome: "Custo de aquisição de cliente",
    explicacao: "Quanto a empresa gasta, em média, para conseguir um cliente novo.",
  },
  {
    sigla: "CMV",
    nome: "Custo da mercadoria vendida",
    explicacao:
      "Quanto custou fabricar ou comprar o que foi vendido, sem contar as despesas da empresa.",
  },
  {
    sigla: "ABC",
    nome: "Curva ABC de estoque",
    explicacao:
      "Classificação que separa os itens em A, B e C pelo valor de giro, para cuidar mais do que mais importa.",
  },
  {
    sigla: "OS",
    nome: "Ordem de serviço",
    explicacao:
      "O documento que pede um serviço externo, como costura ou acabamento feito por terceiros.",
  },
  {
    sigla: "ERP",
    nome: "Sistema de gestão empresarial",
    explicacao:
      "Software que integra vendas, estoque e financeiro; o PLM não é um ERP, ele cuida do produto.",
  },
  {
    sigla: "B2B",
    nome: "Venda entre empresas",
    explicacao:
      "A venda de uma empresa para outra empresa, em vez de vender direto para o consumidor final.",
  },
  {
    sigla: "RLS",
    nome: "Segurança em nível de linha",
    explicacao:
      "Regra do banco que limita cada usuário apenas às linhas de dados que ele tem permissão de acessar.",
  },
  {
    sigla: "RBAC",
    nome: "Controle de acesso por função",
    explicacao:
      "Sistema que dá permissões diferentes de acordo com o cargo da pessoa, como vendedor e gerente.",
  },
] as const;

/** Siglas que aparecem na primeira dobra do dashboard (medido no browser). */
export const TERMOS_PRIMEIRA_DOBRA: readonly string[] = [
  "PCP",
  "What-If",
  "GSD",
  "RFQ",
  "DPP",
  "ESG",
  "S&OP",
  "MRP",
  "SAM",
  "BOM",
  "AQL",
  "OTIF",
  "CFOP",
  "SEFAZ",
  "NF-e",
  "EBITDA",
  "CFO",
] as const;

export function explicacaoDe(sigla: string): string | null {
  const t = TERMOS.find((x) => x.sigla.toLowerCase() === sigla.toLowerCase());
  return t ? `${t.nome}: ${t.explicacao}` : null;
}

/** Texto para o atributo `title` de um link/botão técnico. */
export function tituloTermo(sigla: string): string | undefined {
  return explicacaoDe(sigla) ?? undefined;
}

export function termosPorSigla(siglas: readonly string[]): Termo[] {
  return siglas
    .map((s) => TERMOS.find((t) => t.sigla.toLowerCase() === s.toLowerCase()))
    .filter((t): t is Termo => Boolean(t));
}
