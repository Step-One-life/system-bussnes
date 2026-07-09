import { useEffect } from 'react'

import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

/** Первый сегмент пути → название экрана (те же ключи, что у пунктов меню). */
const TITLE_KEYS: Record<string, string> = {
  '': 'nav.home',
  trainings: 'nav.trainings',
  people: 'nav.people',
  finance: 'nav.finance',
  settings: 'nav.settings',
  journal: 'nav.journal',
}

/** Заголовок вкладки браузера: «Финансы · TriKick». */
export function usePageTitle() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  useEffect(() => {
    const key = TITLE_KEYS[pathname.split('/')[1] ?? '']
    document.title = key ? `${t(key)} · TriKick` : 'TriKick'
  }, [pathname, t, i18n.language])
}
