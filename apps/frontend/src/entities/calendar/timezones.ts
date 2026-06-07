export interface TimeZoneItem {
  id: string
  label: string
}

/** Курированный список поясов РФ/СНГ (от запада к востоку + ближнее зарубежье). */
export const CURATED_TIMEZONES: TimeZoneItem[] = [
  { id: 'Europe/Kaliningrad', label: 'Калининград (MSK−1)' },
  { id: 'Europe/Moscow', label: 'Москва (MSK)' },
  { id: 'Europe/Samara', label: 'Самара (MSK+1)' },
  { id: 'Asia/Yekaterinburg', label: 'Екатеринбург (MSK+2)' },
  { id: 'Asia/Omsk', label: 'Омск (MSK+3)' },
  { id: 'Asia/Krasnoyarsk', label: 'Красноярск (MSK+4)' },
  { id: 'Asia/Irkutsk', label: 'Иркутск (MSK+5)' },
  { id: 'Asia/Yakutsk', label: 'Якутск (MSK+6)' },
  { id: 'Asia/Vladivostok', label: 'Владивосток (MSK+7)' },
  { id: 'Asia/Magadan', label: 'Магадан (MSK+8)' },
  { id: 'Asia/Kamchatka', label: 'Камчатка (MSK+9)' },
  { id: 'Europe/Minsk', label: 'Минск' },
  { id: 'Europe/Kyiv', label: 'Киев' },
  { id: 'Asia/Almaty', label: 'Алматы' },
  { id: 'Asia/Tashkent', label: 'Ташкент' },
]

/**
 * Опции для Select. Если текущий пояс не входит в курированный список — добавляем
 * его отдельной опцией сверху, чтобы тренер не остался без своего пояса.
 */
export function buildTimeZoneOptions(
  current?: string | null,
): { value: string; label: string }[] {
  const options = CURATED_TIMEZONES.map((z) => ({ value: z.id, label: z.label }))
  if (current && !CURATED_TIMEZONES.some((z) => z.id === current)) {
    options.unshift({ value: current, label: current })
  }
  return options
}
