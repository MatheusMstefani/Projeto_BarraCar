"use client";

import { useRef, useState } from "react";

export type ChartSeries = {
  name: string;
  values: number[];
  /** Cor CSS (ex.: "var(--chart-1)") */
  color: string;
  dashed?: boolean;
};

const W = 800;
const H = 220;
const PAD_Y = 14;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Caminho suavizado (quadráticas pelos pontos médios), como o traço do template. */
function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const mx = (points[i - 1].x + points[i].x) / 2;
    const my = (points[i - 1].y + points[i].y) / 2;
    d += ` Q${points[i - 1].x},${points[i - 1].y} ${mx},${my}`;
  }
  d += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
  return d;
}

export function LineChart({ labels, series }: { labels: string[]; series: ChartSeries[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const values = series.flatMap((s) => s.values);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = Math.max(1, max - min);
  const stepX = labels.length > 1 ? W / (labels.length - 1) : W;
  const point = (index: number, value: number) => ({
    x: index * stepX,
    y: H - PAD_Y - ((value - min) / range) * (H - PAD_Y * 2),
  });

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = container.current?.getBoundingClientRect();
    if (!rect || labels.length < 2) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    setHovered(Math.min(labels.length - 1, Math.max(0, Math.round(ratio * (labels.length - 1)))));
  }

  return (
    <div className="flex flex-col">
      <div
        ref={container}
        className="relative min-h-[220px]"
        onMouseMove={onMove}
        onMouseLeave={() => setHovered(null)}
      >
        <svg className="w-full h-[220px]" preserveAspectRatio="none" viewBox={`0 0 ${W} ${H}`}>
          {[0, 1, 2, 3].map((line) => (
            <line
              key={line}
              x1="0"
              x2={W}
              y1={(H / 4) * line + PAD_Y / 2}
              y2={(H / 4) * line + PAD_Y / 2}
              stroke="var(--outline-variant)"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
          ))}
          {series.map((s) => (
            <path
              key={s.name}
              d={smoothPath(s.values.map((value, index) => point(index, value)))}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeDasharray={s.dashed ? "4" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {hovered !== null && (
            <>
              <line
                x1={hovered * stepX}
                x2={hovered * stepX}
                y1="0"
                y2={H}
                stroke="var(--outline)"
                strokeOpacity="0.5"
                strokeDasharray="3"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {series.map((s) => {
                const p = point(hovered, s.values[hovered] ?? 0);
                return (
                  <circle
                    key={s.name}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="var(--surface-container-low)"
                    stroke={s.color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </>
          )}
        </svg>
        {hovered !== null && (
          <div
            className="absolute top-1 bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded text-[10px] font-black shadow-xl pointer-events-none whitespace-nowrap"
            style={{
              left: `${(hovered / Math.max(1, labels.length - 1)) * 100}%`,
              transform: hovered > labels.length / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
            }}
          >
            <div className="uppercase opacity-70">{labels[hovered]}</div>
            {series.map((s) => (
              <div key={s.name}>
                {s.name}: {currency.format(s.values[hovered] ?? 0)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-between mt-md px-1">
        {labels.map((label) => (
          <span key={label} className="text-[10px] text-on-surface-variant font-bold opacity-60">
            {label}
          </span>
        ))}
      </div>
      {/* Dados em tabela para leitores de tela */}
      <table className="sr-only">
        <thead>
          <tr>
            <th>Mês</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, index) => (
            <tr key={label}>
              <td>{label}</td>
              {series.map((s) => (
                <td key={s.name}>{currency.format(s.values[index] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
