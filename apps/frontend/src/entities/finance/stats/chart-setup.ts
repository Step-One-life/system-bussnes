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

/* Цвета диаграмм — токены --tk-chart-* (design-tokens.scss). Canvas не умеет
   CSS-переменные, поэтому значения читаются из активной темы в момент
   построения графика. */
function tkVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function chartColors(): string[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => tkVar(`--tk-chart-${n}`))
}

export function chartIncomeColor(): string {
  return tkVar('--tk-chart-income')
}

export function chartExpenseColor(): string {
  return tkVar('--tk-chart-expense')
}

export function chartNetColor(): string {
  return tkVar('--tk-chart-net')
}

export function chartTextColor(): string {
  return tkVar('--tk-text-secondary')
}

export function chartGridColor(): string {
  return tkVar('--tk-chart-grid')
}
