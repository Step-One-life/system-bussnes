import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
)

export const CHART_COLORS = [
  '#01696f',
  '#22c55e',
  '#f59e0b',
  '#b47aff',
  '#3b82f6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
]

export const CHART_INCOME = 'rgba(34, 197, 94, 0.75)'
export const CHART_EXPENSE = 'rgba(239, 68, 68, 0.6)'
export const CHART_NET = 'rgba(1, 105, 111, 0.85)'

function isDark(): boolean {
  return document.documentElement.dataset.theme === 'dark'
}

export function chartTextColor(): string {
  return '#6b7280'
}

export function chartGridColor(): string {
  return isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
}
