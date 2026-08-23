import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { SignalCard } from "@/components/radar/signal-card";
import { getRadarSignals } from "@/server/queries/radar";
import type { MunicipalityDetail } from "@/server/queries/municipality";

export async function RadarTab({ municipality }: { municipality: MunicipalityDetail }) {
  const { signals } = await getRadarSignals({ municipalityId: municipality.id, limit: 30, sinceDays: 365 });

  if (!signals.length) {
    return (
      <Card>
        <EmptyState
          title={`Nenhum movimento registrado em ${municipality.name}`}
          description="O Radar publica um sinal apenas quando há fonte que o sustente. Ausência de sinal não significa ausência de acontecimento — significa que nada foi detectado pelas fontes conectadas."
          action={
            <Link href="/radar" className="text-[12.5px] font-medium text-[var(--accent)] hover:underline">
              Ver o Radar do Estado
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-[var(--fg-muted)]">
        <span className="tnum font-medium text-[var(--fg)]">{signals.length}</span> movimento(s)
        detectado(s) em {municipality.name} nos últimos 12 meses, ordenados por relevância.
      </p>
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  );
}
