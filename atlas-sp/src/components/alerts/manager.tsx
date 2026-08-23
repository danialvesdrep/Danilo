"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { CATEGORY_LABEL } from "@/lib/labels";
import { formatDateTime, formatRelative } from "@/lib/format";

type Alert = {
  id: string;
  label: string;
  scope: string;
  minScore: number;
  active: boolean;
  municipality: string | null;
  keyword: string | null;
  deliveries: number;
  lastTriggeredAt: string | null;
};

type Delivery = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  readAt: string | null;
};

const SCOPES = [
  { value: "MUNICIPIO", label: "Cidade" },
  { value: "SETOR", label: "Setor" },
  { value: "ASSUNTO", label: "Assunto" },
  { value: "EMPRESA", label: "Empresa" },
  { value: "PESSOA", label: "Pessoa" },
  { value: "INVESTIMENTO", label: "Investimento" },
] as const;

export function AlertsManager({
  alerts,
  municipalities,
  sectors,
  limit,
  planName,
  deliveries,
}: {
  alerts: Alert[];
  municipalities: Array<{ id: string; name: string }>;
  sectors: Array<{ id: string; name: string }>;
  limit: number;
  planName: string;
  deliveries: Delivery[];
}) {
  const router = useRouter();
  const [scope, setScope] = useState<string>("MUNICIPIO");
  const [municipalityId, setMunicipalityId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [minScore, setMinScore] = useState(60);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const atLimit = limit !== -1 && alerts.filter((alert) => alert.active).length >= limit;

  const create = () => {
    startTransition(async () => {
      setError(null);
      const label =
        scope === "MUNICIPIO"
          ? municipalities.find((entry) => entry.id === municipalityId)?.name ?? "Cidade"
          : scope === "SETOR"
            ? sectors.find((entry) => entry.id === targetId)?.name ?? "Setor"
            : keyword || "Assunto";

      const response = await fetch("/api/alertas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          escopo: scope,
          municipioId: scope === "MUNICIPIO" ? municipalityId || undefined : undefined,
          alvoId: scope === "SETOR" ? targetId || undefined : undefined,
          palavraChave: keyword || undefined,
          rotulo: label,
          scoreMinimo: minScore,
          categorias: categories,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível criar o alerta.");
        return;
      }
      setKeyword("");
      setMunicipalityId("");
      setTargetId("");
      setCategories([]);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await fetch(`/api/alertas?id=${id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card>
        <CardHeader
          eyebrow="Novo alerta"
          title="O que você quer monitorar"
          description={
            limit === -1
              ? "Alertas ilimitados no seu plano."
              : `Plano ${planName}: até ${limit} alerta(s) ativo(s).`
          }
        />
        <CardBody className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium">Escopo</span>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="h-9 w-full rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] px-2.5 text-[13px] outline-none focus:border-[var(--accent-border)]"
            >
              {SCOPES.map((entry) => (
                <option key={entry.value} value={entry.value}>{entry.label}</option>
              ))}
            </select>
          </label>

          {scope === "MUNICIPIO" ? (
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium">Município</span>
              <select
                value={municipalityId}
                onChange={(event) => setMunicipalityId(event.target.value)}
                className="h-9 w-full rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] px-2.5 text-[13px] outline-none focus:border-[var(--accent-border)]"
              >
                <option value="">Selecione…</option>
                {municipalities.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === "SETOR" ? (
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium">Setor</span>
              <select
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="h-9 w-full rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] px-2.5 text-[13px] outline-none focus:border-[var(--accent-border)]"
              >
                <option value="">Selecione…</option>
                {sectors.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          {["ASSUNTO", "EMPRESA", "PESSOA", "INVESTIMENTO"].includes(scope) ? (
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium">Termo a monitorar</span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="ex.: nova fábrica, centro de distribuição"
                className="h-9 w-full rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] px-2.5 text-[13px] outline-none focus:border-[var(--accent-border)]"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium">
              Score mínimo
              <span className="tnum text-[12px] text-[var(--fg-muted)]">{minScore}</span>
            </span>
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={minScore}
              onChange={(event) => setMinScore(Number(event.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <span className="mt-1 block text-[11px] text-[var(--fg-subtle)]">
              Quanto maior, menos avisos — e mais relevantes.
            </span>
          </label>

          <div>
            <span className="mb-1.5 block text-[12.5px] font-medium">Categorias (opcional)</span>
            <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
              {Object.entries(CATEGORY_LABEL).slice(0, 14).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setCategories((current) =>
                      current.includes(value)
                        ? current.filter((entry) => entry !== value)
                        : [...current, value],
                    )
                  }
                  className={
                    categories.includes(value)
                      ? "rounded-[var(--radius-xs)] border border-transparent bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent-fg)]"
                      : "rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[11px] text-[var(--fg-muted)] hover:border-[var(--border-strong)]"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-[12px] text-[var(--fall)]">{error}</p> : null}
          {atLimit ? (
            <p className="rounded-[var(--radius-sm)] border border-dashed px-3 py-2 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
              Você atingiu o limite de alertas do plano {planName}.{" "}
              <Link href="/planos" className="font-medium text-[var(--accent)] hover:underline">
                Ver planos
              </Link>
            </p>
          ) : null}

          <button
            type="button"
            onClick={create}
            disabled={pending || atLimit}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[13px] font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
            Criar alerta
          </button>
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader eyebrow="Ativos" title="Seus alertas" dense />
          {alerts.length ? (
            <ul>
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0">
                  <Bell className="mt-0.5 size-3.5 shrink-0 text-[var(--fg-subtle)]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{alert.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="outline">{alert.scope.toLowerCase()}</Badge>
                      <Badge tone="outline" mono>score ≥ {alert.minScore}</Badge>
                      {alert.deliveries > 0 ? (
                        <Badge tone="accent">{alert.deliveries} aviso(s)</Badge>
                      ) : null}
                    </div>
                    {alert.lastTriggeredAt ? (
                      <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">
                        Último disparo {formatRelative(alert.lastTriggeredAt)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(alert.id)}
                    aria-label={`Remover alerta ${alert.label}`}
                    className="shrink-0 text-[var(--fg-subtle)] transition-colors hover:text-[var(--fall)]"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhum alerta criado" description="Configure o primeiro ao lado." />
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="Histórico" title="Avisos recebidos" dense />
          {deliveries.length ? (
            <ul>
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="border-b px-4 py-2.5 last:border-b-0">
                  {delivery.url ? (
                    <Link href={delivery.url} className="text-[12.5px] font-medium hover:text-[var(--accent)]">
                      {delivery.title}
                    </Link>
                  ) : (
                    <p className="text-[12.5px] font-medium">{delivery.title}</p>
                  )}
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
                    {delivery.body}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--fg-subtle)]">
                    {formatDateTime(delivery.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nenhum aviso ainda"
              description="Quando o Radar detectar algo que atenda a um dos seus alertas, o aviso aparece aqui."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
