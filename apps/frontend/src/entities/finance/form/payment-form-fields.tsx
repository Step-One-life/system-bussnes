import { DatePicker, Form, Input, InputNumber, Select, TimePicker } from 'antd'

import { useTranslation } from 'react-i18next'

import { CLIENT_TYPE_OPTIONS, HALL_TYPE_OPTIONS } from './payment-form-config'

import type { usePaymentForm } from './use-payment-form'
import type { Dayjs } from 'dayjs'
import type { Student } from 'entities/students'
import type { ChangeEvent } from 'react'

import './payment-modal.scss'
import dayjs from 'dayjs'

type PaymentForm = ReturnType<typeof usePaymentForm>

interface PaymentFormFieldsProps {
  form: PaymentForm
  students: Student[]
}

export function PaymentFormFields({ form, students }: PaymentFormFieldsProps) {
  const { t } = useTranslation()
  const studentOptions = [
    { value: '', label: t('finance.form.studentNone') },
    ...[...students]
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map((s) => ({ value: s.id, label: s.name })),
  ]

  const handleStudentChange = (v: string) => form.setStudentId(v || null)
  const handleClientAmountChange = (v: number | null) =>
    form.setClientAmount(typeof v === 'number' ? v : 0)
  const handleHallAmountChange = (v: number | null) =>
    form.setHallAmount(typeof v === 'number' ? v : 0)
  const handleSelectRegular = () => form.setTimeSlot('regular')
  const handleSelectPrime = () => form.setTimeSlot('prime')
  const handleDateChange = (d: Dayjs | null) =>
    form.setDate(d ? d.format('YYYY-MM-DD') : '')
  const handleTrainingTimeChange = (d: Dayjs | null) =>
    form.setTrainingTime(d ? d.format('HH:mm') : '')
  const handleNotesChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setNotes(e.target.value)

  return (
    <Form layout="vertical">
      <Form.Item label={t('finance.form.clientLabel')}>
        <Select
          value={form.studentId ?? ''}
          options={studentOptions}
          onChange={handleStudentChange}
        />
      </Form.Item>

      <div className="fin-modal-grid">
        <div className="fin-modal-section fin-modal-section--income">
          <div className="fin-modal-section__label">{t('finance.form.incomeSection')}</div>
          <Form.Item label={t('finance.form.paymentTypeLabel')}>
            <Select
              value={form.clientType}
              options={CLIENT_TYPE_OPTIONS}
              onChange={form.setClientType}
            />
          </Form.Item>
          <Form.Item label={t('finance.form.amountLabel')}>
            <InputNumber
              min={0}
              value={form.clientAmount}
              controls={false}
              style={{ width: '100%' }}
              onChange={handleClientAmountChange}
            />
          </Form.Item>
        </div>

        <div className="fin-modal-section fin-modal-section--expense">
          <div className="fin-modal-section__label">{t('finance.form.expenseSection')}</div>
          <Form.Item label={t('finance.form.hallTypeLabel')}>
            <Select
              value={form.hallType}
              options={[
                { value: '', label: t('finance.form.hallTypeNone') },
                ...HALL_TYPE_OPTIONS,
              ]}
              onChange={form.setHallType}
            />
          </Form.Item>
          <Form.Item label={t('finance.form.timeLabel')}>
            <div className="timeslot-toggle">
              <button
                type="button"
                className={`timeslot-btn${form.timeSlot === 'regular' ? ' timeslot-btn--active' : ''}`}
                onClick={handleSelectRegular}
              >
                {t('finance.form.timeRegular')}
              </button>
              <button
                type="button"
                className={`timeslot-btn${form.timeSlot === 'prime' ? ' timeslot-btn--active' : ''}`}
                onClick={handleSelectPrime}
              >
                {t('finance.form.timePrime')}
              </button>
            </div>
          </Form.Item>
          <Form.Item label={t('finance.form.amountLabel')}>
            <InputNumber
              min={0}
              value={form.hallAmount}
              controls={false}
              style={{ width: '100%' }}
              onChange={handleHallAmountChange}
            />
          </Form.Item>
        </div>
      </div>

      <div className="fin-preview">
        {t('finance.form.netIncome')}{' '}
        <strong
          style={{ color: form.net >= 0 ? 'var(--success)' : 'var(--danger)' }}
        >
          {form.net >= 0 ? '+' : ''}
          {form.net.toLocaleString('ru')} ₽
        </strong>
      </div>

      <div className="fin-modal-row-3">
        <Form.Item label={t('finance.form.dateLabel')}>
          <DatePicker
            value={form.date ? dayjs(form.date) : null}
            format="DD.MM.YYYY"
            allowClear={false}
            style={{ width: '100%' }}
            onChange={handleDateChange}
          />
        </Form.Item>
        <Form.Item label={t('finance.form.trainingTimeLabel')}>
          <TimePicker
            value={form.trainingTime ? dayjs(form.trainingTime, 'HH:mm') : null}
            format="HH:mm"
            minuteStep={5}
            style={{ width: '100%' }}
            onChange={handleTrainingTimeChange}
          />
        </Form.Item>
        <Form.Item label={t('finance.form.noteLabel')}>
          <Input
            value={form.notes}
            placeholder={t('finance.form.notePlaceholder')}
            onChange={handleNotesChange}
          />
        </Form.Item>
      </div>
    </Form>
  )
}
