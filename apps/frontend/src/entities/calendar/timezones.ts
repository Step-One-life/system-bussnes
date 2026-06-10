import i18n from 'i18next'

/** Курированный список поясов РФ/СНГ (от запада к востоку + ближнее зарубежье). */
const CURATED_TIMEZONE_IDS = [
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Europe/Minsk',
  'Europe/Kyiv',
  'Asia/Almaty',
  'Asia/Tashkent',
]

function timeZoneLabel(id: string): string {
  return i18n.t(`timezones.${id}`, { defaultValue: id })
}

/**
 * Опции для Select. Если текущий пояс не входит в курированный список — добавляем
 * его отдельной опцией сверху, чтобы тренер не остался без своего пояса.
 */
export function buildTimeZoneOptions(
  current?: string | null,
): { value: string; label: string }[] {
  const options = CURATED_TIMEZONE_IDS.map((id) => ({ value: id, label: timeZoneLabel(id) }))
  if (current && !CURATED_TIMEZONE_IDS.includes(current)) {
    options.unshift({ value: current, label: current })
  }
  return options
}
