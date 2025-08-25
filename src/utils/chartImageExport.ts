import Highcharts from "highcharts";
import dayjs from "dayjs";

const DARK_BG = "#2a2a2e";


type MetricDoc = { period: string; metrics: Record<string, number> };
type ChartGroup = { title: string; metrics: string[]; colors?: string[] };

function norm(s: string) {
  return s.toLowerCase().replace(/[_\s]+/g, " ").trim();
}

async function svgToPngDataUrl(svg: string, bg = DARK_BG): Promise<string> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.crossOrigin = "anonymous";
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    // paint dark background first (prevents transparency)
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Export per-platform charts as images using the SAME design
 * as PlatformAnalysis (column charts, dual y-axes, group colors, dark bg).
 */
export async function exportPlatformChartsAsImages(args: {
  platform: string;
  chartGroups: ChartGroup[];
  metricDocs: MetricDoc[];
  size?: { width: number; height: number };
}): Promise<Array<{ title: string; dataUrl: string }>> {
  const { chartGroups, metricDocs, size = { width: 1200, height: 600 } } = args;
  if (!chartGroups?.length || !metricDocs?.length) return [];

  // Sort months and build x-axis categories (MMM YYYY)
  const months = [...new Set(metricDocs.map(d => d.period))].sort();
  const categories = months.map(m => dayjs(m, "YYYY-MM").format("MMM YYYY"));

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${size.width}px`;
  container.style.height = `${size.height}px`;
  document.body.appendChild(container);

  const out: Array<{ title: string; dataUrl: string }> = [];

  try {
    for (const group of chartGroups) {
      // 1) Gather values per metric across months (respect normalized keys)
      const allMetricValues = group.metrics.map(metric => {
        const key = norm(metric);
        return {
          metric,
          values: months.map(
            period =>
              Number(
                (metricDocs.find(d => d.period === period)?.metrics || {})[key]
              ) || 0
          )
        };
      });

      // 2) Per-metric max & global max
      const metricMaxMap = Object.fromEntries(
        allMetricValues.map(m => [m.metric, Math.max(...m.values)])
      );
      const globalMax = Math.max(
        0,
        ...Object.values(metricMaxMap).map(n => Number(n) || 0)
      );

      // 3) Axis split: secondary if <30% of global max
      const isSecondary = (metric: string) =>
        globalMax > 0 && (metricMaxMap[metric] || 0) < globalMax * 0.3;

      const primaryMetrics = group.metrics.filter(m => !isSecondary(m));
      const secondaryMetrics = group.metrics.filter(m => isSecondary(m));

      const yAxis: Highcharts.YAxisOptions[] = [];
      if (primaryMetrics.length > 0) {
        yAxis.push({
          title: {
            text: primaryMetrics
              .map(m => m.replace(/_/g, " "))
              .map(s => s.charAt(0).toUpperCase() + s.slice(1))
              .join(", "),
            style: { color: "#fff" }
          },
          labels: { style: { color: "#fff" } },
          gridLineColor: "#333"
        });
      }
      if (secondaryMetrics.length > 0) {
        yAxis.push({
          title: {
            text: secondaryMetrics
              .map(m => m.replace(/_/g, " "))
              .map(s => s.charAt(0).toUpperCase() + s.slice(1))
              .join(", "),
            style: { color: "#fff" }
          },
          labels: { style: { color: "#fff" } },
          gridLineColor: "#333",
          opposite: true
        });
      }

      // 4) Build series (COLUMN, not spline) + assign colors & axis
      const series: Highcharts.SeriesColumnOptions[] = group.metrics.map(
        (metric, idx) => {
          const values =
            allMetricValues.find(m => m.metric === metric)?.values || [];
          return {
            type: "column",
            name:
              metric
                .replace(/_/g, " ")
                .replace(/\b\w/g, l => l.toUpperCase()) || metric,
            data: values,
            color: group.colors?.[idx],
            yAxis: isSecondary(metric) ? 1 : 0
          };
        }
      );

      const empty = series.every(s =>
        (s.data as number[]).every(v => Number(v) === 0)
      );
      if (empty) {
        // still render a blank frame to keep layout consistent, or skip:
        // out.push({ title: group.title, dataUrl: "" });
        // continue;
      }

      // 5) Chart config to MATCH PlatformAnalysis look
      const options: Highcharts.Options = {
        chart: {
          type: "column",
          backgroundColor: DARK_BG,
          width: size.width,
          height: size.height
        },
        title: {
          text: group.title,
          style: { color: "#fff" }
        },
        credits: { enabled: false },
        legend: {
          itemStyle: { color: "#eee" },
          itemHoverStyle: { color: "#fff" }
        },
        xAxis: {
          categories,
          labels: { style: { color: "#ddd" } },
          lineColor: "#444",
          tickColor: "#444"
        },
        yAxis,
        tooltip: { shared: true },
        plotOptions: {
          column: { grouping: true, borderWidth: 0 }
        },
        series
      };

      const chart = Highcharts.chart(container, options);

      // Let layout settle
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const svg =
        typeof (chart as any).getSVGForExport === "function"
          ? (chart as any).getSVGForExport()
          : chart.getSVG();

      const dataUrl = await svgToPngDataUrl(svg, DARK_BG);
      out.push({ title: group.title, dataUrl });

      chart.destroy();
    }
  } finally {
    container.remove();
  }

  return out;
}
