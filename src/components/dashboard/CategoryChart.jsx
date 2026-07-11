import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Label } from 'recharts';
import { formatCurrency } from '@/lib/depreciation';

// Cores via tokens de tema (--chart-1..5) — funcionam no claro e no "Futurista".
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

// Compacta o total no miolo do anel (ex.: R$ 1,2 mi) para não estourar o furo.
function compactBRL(v) {
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return formatCurrency(v);
}

export default function CategoryChart({ data }) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const pct = total ? Math.round((p.value / total) * 100) : 0;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-card-foreground">{p.name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(p.value)} · {pct}%</p>
          <p className="text-sm text-muted-foreground">{p.payload.count} ativo(s)</p>
        </div>
      );
    }
    return null;
  };

  // Rótulo central ancorado no centro real da pizza (cx/cy do viewBox).
  const CenterLabel = ({ viewBox }) => {
    const { cx, cy } = viewBox;
    return (
      <g>
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12 }}>
          Total
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-card-foreground" style={{ fontSize: 18, fontWeight: 700 }}>
          {compactBRL(total)}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">Patrimônio por Categoria</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <Label content={<CenterLabel />} position="center" />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
