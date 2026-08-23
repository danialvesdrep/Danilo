import type { AIProvider, AtlasAnswer, EvidenceBundle } from "./types";
import { GroundedLocalProvider } from "./grounded-local";

/**
 * Provedores com modelo de linguagem.
 *
 * O modelo recebe SOMENTE o pacote de evidências e é instruído a não
 * acrescentar fato algum. A saída é validada: qualquer citação fora do índice
 * recebido é descartada, e se a validação falhar caímos no provedor local em
 * vez de entregar texto não verificado.
 */

const SYSTEM_PROMPT = `Você é o Atlas AI, camada de análise de uma plataforma de inteligência territorial sobre os 645 municípios de São Paulo.

Regras inegociáveis:
1. Use EXCLUSIVAMENTE os fatos do pacote de evidências recebido. Não introduza números, nomes, datas ou eventos que não estejam ali.
2. Separe explicitamente: FATOS (o que a evidência sustenta), INTERPRETAÇÃO (leitura derivada dos fatos) e HIPÓTESES (o que não pode ser afirmado).
3. Toda afirmação factual referencia o índice da citação correspondente.
4. Se as evidências forem insuficientes, responda que não há dados confiáveis suficientes. Nunca preencha lacuna com estimativa.
5. Quando a evidência estiver marcada como demonstração, diga que a leitura depende da conexão das fontes oficiais.
6. Escreva em português do Brasil, direto e sem adjetivação. Sem entusiasmo, sem promessa, sem juízo político.

Responda em JSON válido, sem texto fora do objeto, no formato:
{"headline": string, "facts": [{"statement": string, "citationIndex": number}], "interpretation": string | null, "hypotheses": [{"statement": string, "wouldConfirm": string}], "insufficientData": boolean}`;

function buildUserPrompt(bundle: EvidenceBundle): string {
  const citations = bundle.citations
    .map(
      (citation, index) =>
        `[${index}] ${citation.label} — ${citation.source} (${citation.sourceTier}${citation.isDemo ? ", DEMONSTRAÇÃO" : ""})`,
    )
    .join("\n");
  const facts = bundle.facts
    .map((fact) => `- ${fact.statement} [${fact.citationIndex}]`)
    .join("\n");

  return `Pergunta: ${bundle.question}

Intenção detectada: ${bundle.intent}
Entidades no escopo: ${[
    ...bundle.scope.municipalities.map((m) => `município ${m.name}`),
    ...bundle.scope.sectors.map((s) => `setor ${s.name}`),
    ...bundle.scope.companies.map((c) => `empresa ${c.name}`),
    ...bundle.scope.people.map((p) => `pessoa ${p.name}`),
  ].join(", ") || "nenhuma identificada"}

Citações disponíveis:
${citations || "(nenhuma)"}

Evidências recuperadas:
${facts || "(nenhuma)"}

Observações derivadas pela plataforma:
${bundle.notes.map((note) => `- ${note}`).join("\n") || "(nenhuma)"}`;
}

type ComposedPayload = {
  headline?: string;
  facts?: Array<{ statement?: string; citationIndex?: number }>;
  interpretation?: string | null;
  hypotheses?: Array<{ statement?: string; wouldConfirm?: string }>;
  insufficientData?: boolean;
};

function validate(payload: ComposedPayload, bundle: EvidenceBundle, provider: string, model: string): AtlasAnswer {
  const maxIndex = bundle.citations.length - 1;
  // Descarta qualquer afirmação que não aponte para uma citação existente:
  // é a barreira que impede o modelo de inventar evidência.
  const facts = (payload.facts ?? [])
    .filter(
      (fact) =>
        typeof fact.statement === "string" &&
        typeof fact.citationIndex === "number" &&
        fact.citationIndex >= 0 &&
        fact.citationIndex <= maxIndex,
    )
    .map((fact) => ({ statement: fact.statement!, citationIndex: fact.citationIndex! }));

  const insufficient = Boolean(payload.insufficientData) || facts.length === 0;
  const usesDemoData = bundle.citations.some((citation) => citation.isDemo);

  return {
    headline: insufficient ? "" : (payload.headline ?? "").trim(),
    facts,
    interpretation: insufficient ? null : (payload.interpretation ?? null),
    hypotheses: (payload.hypotheses ?? [])
      .filter((hypothesis) => typeof hypothesis.statement === "string")
      .map((hypothesis) => ({
        statement: hypothesis.statement!,
        wouldConfirm: hypothesis.wouldConfirm ?? "Não especificado.",
      })),
    citations: bundle.citations,
    provider,
    model,
    confidence: insufficient ? 0 : Math.min(0.88, 0.4 + facts.length * 0.05 - (usesDemoData ? 0.15 : 0)),
    insufficientData: insufficient,
    usesDemoData,
    reasoningPath: bundle.reasoningPath,
  };
}

function extractJson(text: string): ComposedPayload {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta do provedor não continha JSON");
  return JSON.parse(candidate.slice(start, end + 1)) as ComposedPayload;
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private readonly fallback = new GroundedLocalProvider();

  constructor(private readonly apiKey: string, model?: string) {
    this.model = model ?? "claude-sonnet-5";
  }

  async compose(bundle: EvidenceBundle): Promise<AtlasAnswer> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1600,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildUserPrompt(bundle) }],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Anthropic respondeu ${response.status}`);
      const data = (await response.json()) as { content: Array<{ type: string; text?: string }> };
      const text = data.content.find((block) => block.type === "text")?.text ?? "";
      return validate(extractJson(text), bundle, this.name, this.model);
    } catch (error) {
      console.error("[atlas-ai] provedor anthropic indisponível, usando fallback local:", error);
      return this.fallback.compose(bundle);
    }
  }
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai";
  readonly model: string;
  private readonly fallback = new GroundedLocalProvider();

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    model?: string,
  ) {
    this.model = model ?? "gpt-4o-mini";
  }

  async compose(bundle: EvidenceBundle): Promise<AtlasAnswer> {
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(bundle) },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Provedor respondeu ${response.status}`);
      const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
      return validate(extractJson(data.choices[0]?.message?.content ?? ""), bundle, this.name, this.model);
    } catch (error) {
      console.error("[atlas-ai] provedor openai indisponível, usando fallback local:", error);
      return this.fallback.compose(bundle);
    }
  }
}

/** Seleciona o provedor conforme o ambiente. Trocar de modelo é trocar env. */
export function createProvider(): AIProvider {
  const configured = (process.env.AI_PROVIDER ?? "grounded-local").toLowerCase();
  if (configured === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL);
  }
  if (configured === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAICompatibleProvider(
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      process.env.OPENAI_MODEL,
    );
  }
  return new GroundedLocalProvider();
}
