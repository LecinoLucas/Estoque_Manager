import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SalesByDate = {
  date: string;
  quantidade: number;
};

type SalesByCategory = {
  categoria: string;
  quantidade: number;
};

type SalesByMedida = {
  medida: string;
  quantidade: number;
};

type DashboardChartsProps = {
  salesByDate?: SalesByDate[];
  salesByCategory?: SalesByCategory[];
  salesByMedida?: SalesByMedida[];
};

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#6366f1"];

export default function DashboardCharts({ salesByDate, salesByCategory, salesByMedida }: DashboardChartsProps) {
  const hasAnyChart =
    (salesByDate?.length ?? 0) > 0 ||
    (salesByCategory?.length ?? 0) > 0 ||
    (salesByMedida?.length ?? 0) > 0;

  if (!hasAnyChart) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {salesByDate && salesByDate.length > 0 && (
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5 text-accent" />
              Evolução de Vendas do Mês
            </CardTitle>
            <CardDescription>Quantidade de itens vendidos por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).getDate().toString()} />
                <YAxis />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString("pt-BR")} />
                <Legend />
                <Line type="monotone" dataKey="quantidade" stroke="#2563eb" strokeWidth={2} name="Quantidade Vendida" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {salesByCategory && salesByCategory.length > 0 && (
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5 text-accent" />
              Vendas por Categoria
            </CardTitle>
            <CardDescription>Distribuição de vendas entre categorias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantidade" fill="#2563eb" name="Quantidade Vendida" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {salesByMedida && salesByMedida.length > 0 && (
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5 text-accent" />
              Vendas por Medida
            </CardTitle>
            <CardDescription>Distribuição de vendas por tamanho</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesByMedida}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ medida, percent }) => `${medida}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="quantidade"
                >
                  {salesByMedida.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
