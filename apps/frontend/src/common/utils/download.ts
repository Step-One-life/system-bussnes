/**
 * Скачивание сгенерированного на клиенте файла (CSV и т.п.).
 *
 * Якорь обязательно добавляется в DOM: в Firefox click() по «висящему» в
 * воздухе элементе не запускает скачивание. URL отзываем следующим тиком —
 * отзыв в том же тике мог оборвать ещё не начавшуюся загрузку.
 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}
