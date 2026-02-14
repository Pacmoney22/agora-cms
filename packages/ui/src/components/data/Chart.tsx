import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import { Bar, Line, Pie, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartProps {
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'horizontal-bar' | 'radar' | 'scatter';
  data?: ChartData;
  dataSource?: 'manual' | 'csv';
  showLegend?: boolean;
  showValues?: boolean;
  animate?: boolean;
  height?: number;
  accessibleDescription?: string | null;
  className?: string;
}

const defaultColors = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

function generateColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(defaultColors[i % defaultColors.length]!);
  }
  return colors;
}

export const Chart: React.FC<ChartProps> = ({
  chartType = 'bar',
  data = { labels: [], datasets: [] },
  dataSource = 'manual',
  showLegend = true,
  showValues = false,
  animate = true,
  height = 300,
  accessibleDescription = null,
  className,
}) => {
  const isPieType = chartType === 'pie' || chartType === 'donut';
  const isScatter = chartType === 'scatter';

  const chartData = useMemo(() => {
    if (isPieType) {
      const dataset = data.datasets[0];
      if (!dataset) return { labels: data.labels, datasets: [] };

      const bgColors = dataset.data.map(
        (_, i) => dataset.color || generateColors(dataset.data.length)[i],
      );

      return {
        labels: data.labels,
        datasets: [
          {
            label: dataset.label,
            data: dataset.data,
            backgroundColor: bgColors,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      };
    }

    if (isScatter) {
      return {
        datasets: data.datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data.map((val, j) => ({ x: j, y: val })),
          backgroundColor: ds.color || defaultColors[i % defaultColors.length],
          borderColor: ds.color || defaultColors[i % defaultColors.length],
        })),
      };
    }

    return {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => {
        const color = ds.color || defaultColors[i % defaultColors.length];
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor:
            chartType === 'area' ? `${color}33` : color,
          borderColor: color,
          borderWidth: 2,
          fill: chartType === 'area',
          tension: chartType === 'line' || chartType === 'area' ? 0.3 : 0,
          pointRadius: chartType === 'line' || chartType === 'area' ? 4 : 0,
          pointHoverRadius: 6,
        };
      }),
    };
  }, [data, chartType, isPieType, isScatter]);

  const options = useMemo(() => {
    const base: Record<string, unknown> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: animate
        ? { duration: 1000, easing: 'easeOutQuart' as const }
        : false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top' as const,
        },
        tooltip: {
          enabled: true,
        },
        datalabels: showValues
          ? { display: true, color: '#333', font: { size: 11 } }
          : { display: false },
      },
    };

    if (!isPieType && !isScatter) {
      base.scales = {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
      };
    }

    if (chartType === 'horizontal-bar') {
      base.indexAxis = 'y' as const;
    }

    if (chartType === 'radar') {
      base.scales = {
        r: { beginAtZero: true },
      };
    }

    return base;
  }, [chartType, showLegend, showValues, animate, isPieType, isScatter]);

  const ChartComponent = useMemo(() => {
    const componentMap: Record<string, React.ElementType> = {
      bar: Bar,
      line: Line,
      pie: Pie,
      donut: Doughnut,
      area: Line,
      'horizontal-bar': Bar,
      radar: Radar,
      scatter: Scatter,
    };
    return componentMap[chartType] || Bar;
  }, [chartType]);

  const ariaLabel = accessibleDescription
    || `${chartType} chart with ${data.datasets.length} dataset${data.datasets.length !== 1 ? 's' : ''}`;

  return (
    <div
      className={clsx('w-full', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <div style={{ height: `${height}px` }}>
        <ChartComponent
          data={chartData}
          options={options}
        />
      </div>
    </div>
  );
};
