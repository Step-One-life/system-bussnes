import { Checkbox, TimePicker } from 'antd'

import { useTranslation } from 'react-i18next'

import { WEEK_DAYS } from './schedule-config'

import type { ScheduleEntry } from '../model/types'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import type { Dayjs } from 'dayjs'

import './schedule-editor.scss'
import dayjs from 'dayjs'

interface ScheduleEditorProps {
  value: ScheduleEntry[]
  onChange: (schedule: ScheduleEntry[]) => void
}

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const { t } = useTranslation()
  const entryFor = (abbr: string) => value.find((e) => e.day === abbr)

  const toggleDay = (abbr: string, checked: boolean) => {
    if (checked) {
      onChange([...value, { day: abbr, time: '' }])
    } else {
      onChange(value.filter((e) => e.day !== abbr))
    }
  }

  const setTime = (abbr: string, time: string) => {
    onChange(value.map((e) => (e.day === abbr ? { ...e, time } : e)))
  }

  const handleToggleDay = (abbr: string) => (e: CheckboxChangeEvent) =>
    toggleDay(abbr, e.target.checked)
  const handleTimeChange = (abbr: string) => (d: Dayjs | null) =>
    setTime(abbr, d ? d.format('HH:mm') : '')

  return (
    <div className="schedule-editor">
      {WEEK_DAYS.map(({ abbr, full }) => {
        const entry = entryFor(abbr)
        const active = !!entry
        return (
          <div key={abbr} className={`schedule-row${active ? ' schedule-row--active' : ''}`}>
            <Checkbox checked={active} onChange={handleToggleDay(abbr)}>
              {full}
            </Checkbox>
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              disabled={!active}
              value={entry?.time ? dayjs(entry.time, 'HH:mm') : null}
              onChange={handleTimeChange(abbr)}
              placeholder={t('groups.form.timePlaceholder')}
            />
          </div>
        )
      })}
    </div>
  )
}
