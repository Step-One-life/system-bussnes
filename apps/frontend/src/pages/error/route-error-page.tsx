import { Button } from 'antd'

import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

import './route-error-page.scss'

interface RouteErrorPageProps {
  /** Принудительный режим «страница не найдена» (catch-all маршрут `*`). */
  notFound?: boolean
}

/**
 * Экран для ошибок роутера. Без него React Router показывал свой служебный
 * «Unexpected Application Error! 404 Not Found / Hey developer 👋» —
 * по-английски, без навигации и без пути назад. Тексты берём из i18n:
 * компонент рендерится внутри провайдеров, i18n к этому моменту инициализирован.
 */
export function RouteErrorPage({ notFound = false }: RouteErrorPageProps) {
  const { t } = useTranslation()
  const error = useRouteError()
  const isNotFound = notFound || (isRouteErrorResponse(error) && error.status === 404)

  const handleReload = () => window.location.reload()

  return (
    <div className="route-error">
      <div className="route-error__code">{isNotFound ? '404' : '⚠️'}</div>
      <h1 className="route-error__title">
        {isNotFound ? t('errors.notFound.title') : t('errors.boundary.title')}
      </h1>
      <p className="route-error__text">
        {isNotFound ? t('errors.notFound.description') : t('errors.boundary.description')}
      </p>
      <div className="route-error__actions">
        <Link to="/">
          <Button type="primary">{t('errors.notFound.home')}</Button>
        </Link>
        {!isNotFound && <Button onClick={handleReload}>{t('errors.boundary.reload')}</Button>}
      </div>
    </div>
  )
}
