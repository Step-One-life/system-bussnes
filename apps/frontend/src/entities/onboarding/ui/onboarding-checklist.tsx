import { Button, Card, Progress } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useOnboarding } from '../model/use-onboarding'

import type { OnboardingStepId } from '../model/onboarding-steps'

// Тап по шагу ведёт в существующий раздел, где пустой экран с CTA (часть C)
// доводит до формы — отдельных «онбординг-экранов» не плодим (спека §6).
const STEP_NAV: Record<OnboardingStepId, { path: string; state?: { financeTab: string } }> = {
  location: { path: '/finance', state: { financeTab: 'locations' } },
  group: { path: '/people/groups' },
  student: { path: '/people/students' },
  training: { path: '/trainings' },
  pricing: { path: '/finance', state: { financeTab: 'pricing' } },
}

export function OnboardingChecklist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { steps, visible, doneCount, total, skipStep, hide } = useOnboarding()

  if (!visible) return null

  const hasLocation = steps.find((s) => s.id === 'location')?.status === 'done'

  const go = (id: OnboardingStepId) => {
    // Тариф требует локацию (RuleFormModal требует locationId) — без неё ведём к локации.
    const target = id === 'pricing' && !hasLocation ? STEP_NAV.location : STEP_NAV[id]
    navigate(target.path, target.state ? { state: target.state } : undefined)
  }

  return (
    <Card
      className="onboarding-card"
      style={{ marginBottom: 'var(--sp-6)' }}
      title={t('onboarding.title')}
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={hide}
          aria-label={t('onboarding.hide')}
        />
      }
    >
      <Progress percent={Math.round((doneCount / total) * 100)} showInfo={false} />

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {steps.map((step) => {
          const done = step.status === 'done'
          const skipped = step.status === 'skipped'
          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-3)',
                padding: 'var(--sp-2) 0',
                opacity: skipped ? 0.5 : 1,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: done ? 'var(--tk-ok, #52c41a)' : 'transparent',
                  border: done ? 'none' : '2px solid var(--tk-border, #d9d9d9)',
                  color: '#fff',
                  fontSize: 11,
                }}
              >
                {done ? <CheckOutlined /> : null}
              </span>

              <button
                type="button"
                onClick={() => go(step.id)}
                disabled={done}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: done ? 'default' : 'pointer',
                  padding: 0,
                }}
              >
                <div style={{ textDecoration: done ? 'line-through' : 'none' }}>
                  {t(`onboarding.steps.${step.id}.title`)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tk-text-secondary, #888)' }}>
                  {t(`onboarding.steps.${step.id}.desc`)}
                </div>
              </button>

              {step.status === 'active' && (
                <button
                  type="button"
                  onClick={() => skipStep(step.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--tk-text-secondary, #888)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {t('onboarding.skip')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 'var(--sp-3)', fontSize: 12, color: 'var(--tk-text-secondary, #888)' }}>
        {t('onboarding.stepsLeft', { count: total - doneCount })}
      </div>
    </Card>
  )
}
