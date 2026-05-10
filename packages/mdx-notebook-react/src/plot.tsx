import { lazy, Suspense, type ComponentType } from "react";

export type PlotKind = "line" | "bar" | "scatter";

export interface PlotProps {
  data: Array<Record<string, number | string>>;
  x: string;
  y: string | string[];
  kind?: PlotKind;
  width?: number;
  height?: number;
}

const PlotImpl = lazy(async () => {
  const recharts = await import("recharts").catch(() => null);
  if (!recharts) {
    return {
      default: (() => (
        <div className="mdx-nb-error">
          recharts is not installed. Add it as a dependency to use &lt;Plot&gt;.
        </div>
      )) as ComponentType<PlotProps>
    };
  }
  const r = recharts as Record<string, unknown>;
  const LineChart = r.LineChart as ComponentType<Record<string, unknown>>;
  const BarChart = r.BarChart as ComponentType<Record<string, unknown>>;
  const ScatterChart = r.ScatterChart as ComponentType<Record<string, unknown>>;
  const Line = r.Line as ComponentType<Record<string, unknown>>;
  const Bar = r.Bar as ComponentType<Record<string, unknown>>;
  const Scatter = r.Scatter as ComponentType<Record<string, unknown>>;
  const XAxis = r.XAxis as ComponentType<Record<string, unknown>>;
  const YAxis = r.YAxis as ComponentType<Record<string, unknown>>;
  const Tooltip = r.Tooltip as ComponentType<Record<string, unknown>>;
  const CartesianGrid = r.CartesianGrid as ComponentType<Record<string, unknown>>;
  const ResponsiveContainer = r.ResponsiveContainer as ComponentType<Record<string, unknown>>;
  const Legend = r.Legend as ComponentType<Record<string, unknown>>;
  const Component: ComponentType<PlotProps> = ({ data, x, y, kind = "line", width, height = 240 }) => {
    const ys = Array.isArray(y) ? y : [y];
    const Chart = (kind === "bar" ? BarChart : kind === "scatter" ? ScatterChart : LineChart) as ComponentType<Record<string, unknown>>;
    const Series = (kind === "bar" ? Bar : kind === "scatter" ? Scatter : Line) as ComponentType<Record<string, unknown>>;
    const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"];
    return (
      <ResponsiveContainer width={width ?? "100%"} height={height}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
          <XAxis dataKey={x} />
          <YAxis />
          <Tooltip />
          <Legend />
          {ys.map((key, i) => <Series key={key} dataKey={key} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} />)}
        </Chart>
      </ResponsiveContainer>
    );
  };
  return { default: Component };
});

export function Plot(props: PlotProps) {
  return (
    <Suspense fallback={<div className="mdx-nb-cell">Loading chart…</div>}>
      <PlotImpl {...props} />
    </Suspense>
  );
}
