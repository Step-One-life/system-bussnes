/**
 * Копирование текста в буфер с честным результатом.
 *
 * navigator.clipboard доступен не всегда: его нет по http (LAN-адрес, а не
 * localhost), и он отказывает, если документ потерял фокус — например, когда
 * только что открыли новую вкладку. Поэтому есть фолбэк через скрытое
 * textarea, а вызывающий получает true/false и может сказать пользователю
 * правду вместо голого «Ошибка».
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Падаем в фолбэк ниже: отказ прав или потерянный фокус.
  }
  return legacyCopy(text)
}

function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement('textarea')
    area.value = text
    // Вне вьюпорта, но в DOM: иначе выделение не сработает.
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
