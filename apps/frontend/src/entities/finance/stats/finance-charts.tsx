import { Bar, Doughnut } from 'react-chartjs-2'

import { useTranslation } from 'react-i18next'

import { EmptyState } from 'common/ui'

import {
  CHART_COLORS,
  CHART_EXPENSE,
  CHART_INCOME,
  CHART_NET,
  chartGridColor,
  chartTextColor,
} from './chart-setup'

import type { MonthlyPoint, TopClient, TypeBreakdown } from './use-finance-stats'
import type { ChartOptions } from 'chart.js'

function baseScales() {
  const text = chartTextColor()
  const grid = chartGridColor()
  return {
    x: {
      ticks: { color: text, font: { size: 10 } },
      grid: { color: grid },
      border: { display: false },
    },
    y: {
      ticks: { color: text, font: { size: 10 } },
      grid: { color: grid },
      border: { display: false },
    },
  }
}

interface ChartCardProps {
  title: string
  wide?: boolean
  empty?: boolean
  children: React.ReactNode
}

function ChartCard({ title, wide, empty, children }: ChartCardProps) {
  const { t } = useTranslation()
  return (
    <div className={`fin-chart-card${wide ? ' fin-chart-card--wide' : ''}`}>
      <div className="fin-chart-card__title">{title}</div>
      <div className="fin-chart-card__canvas-wrap">
        {empty ? <EmptyState title={t('finance.stats.noData')} /> : children}
      </div>
    </div>
  )
}

export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const { t } = useTranslation()
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { labels: { color: chartTextColor(), boxWidth: 10 } } },
    scales: baseScales(),
  }
  return (
    <ChartCard title={t('finance.stats.monthlyChart')} wide empty={data.length === 0}>
      <Bar
        options={options}
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            { label: t('finance.stats.datasetIncome'), data: data.map((d) => d.income), backgroundColor: CHART_INCOME, borderRadius: 6 },
            { label: t('finance.stats.datasetHall'), data: data.map((d) => d.hall), backgroundColor: CHART_EXPENSE, borderRadius: 6 },
            { label: t('finance.stats.datasetNet'), data: data.map((d) => d.net), backgroundColor: CHART_NET, borderRadius: 6 },
          ],
        }}
      />
    </ChartCard>
  )
}

interface BreakdownChartProps {
  title: string
  data: TypeBreakdown
  colorOffset?: number
}

export function BreakdownChart({ title, data, colorOffset = 0 }: BreakdownChartProps) {
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '60%',
    plugins: {
      legend: { position: 'bottom', labels: { color: chartTextColor(), boxWidth: 10, padding: 10 } },
    },
  }
  return (
    <ChartCard title={title} empty={data.values.length === 0}>
      <Doughnut
        options={options}
        data={{
          labels: data.labels,
          datasets: [
            {
              data: data.values,
              backgroundColor: CHART_COLORS.slice(colorOffset),
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        }}
      />
    </ChartCard>
  )
}

export function TopClientsChart({ data }: { data: TopClient[] }) {
  const { t } = useTranslation()
  const text = chartTextColor()
  const grid = chartGridColor()
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: text, font: { size: 10 } },
        grid: { color: grid },
        border: { display: false },
      },
      y: {
        ticks: { color: text, font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  }
  return (
    <ChartCard title={t('finance.stats.topClients')} wide empty={data.length === 0}>
      <Bar
        options={options}
        data={{
          labels: data.map((c) => c.name),
          datasets: [
            {
              label: t('finance.stats.datasetIncome'),
              data: data.map((c) => c.amount),
              backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
              borderRadius: 6,
            },
          ],
        }}
      />
    </ChartCard>
  )
}
