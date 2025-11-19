import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SectorBreakdownChartProps {
  sectorBreakdown: Record<string, number>;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function SectorBreakdownChart({ sectorBreakdown }: SectorBreakdownChartProps) {
  const data = Object.entries(sectorBreakdown)
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Distribution</CardTitle>
        <CardDescription>
          Number of startups analyzed by industry sector
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="sector" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.slice(0, 6).map((item, idx) => (
            <div key={item.sector} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-sm">
                {item.sector}: <span className="font-medium">{item.count}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
