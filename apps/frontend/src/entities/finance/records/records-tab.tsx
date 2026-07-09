import { useState } from 'react'

import { Button, Input, Tooltip } from 'antd'
import { DownloadOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, ListSkeleton } from 'common/ui'
import { buildCsv } from 'common/utils/csv'
import { todayISO } from 'common/utils/date'
import { downloadFile } from 'common/utils/download'

import { finLabel } from '../model/finance-constants'
import { AddPaymentModal } from '../form/add-payment-modal'
import { EditPaymentModal } from '../form/edit-payment-modal'
import { FinanceRecordCard } from './finance-record-card'
import { useFinanceRecords } from './use-finance-records'

import type { Payment } from '../model/types'
import type { ChangeEvent } from 'react'

import './records-tab.scss'

export function RecordsTab() {
  const { t } = useTranslation()
  const records = useFinanceRecords()
  const [addOpen, setAddOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<Payment | null>(null)

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) =>
    records.setQuery(e.target.value)
  const handleOpenAdd = () => setAddOpen(true)
  const handleCloseAdd = () => setAddOpen(false)
  const handleCloseEdit = () => setEditPayment(null)

  // Экспорт того, что на экране (с учётом поискового фильтра).
  const handleExportCsv = () => {
    const rows = [
      [
        t('finance.csv.date'),
        t('finance.csv.client'),
        t('finance.csv.group'),
        t('finance.csv.type'),
        t('finance.csv.amount'),
        t('finance.csv.hallAmount'),
      ],
      ...records.filtered.map((item) => [
        item.payment.paid_at,
        item.studentName,
        item.groupName,
        finLabel(item.payment.client_payment_type),
        item.payment.client_amount,
        item.hallCost?.hall_amount ?? null,
      ]),
    ]
    downloadFile(`trikick-payments-${todayISO()}.csv`, buildCsv(rows), 'text/csv;charset=utf-8')
  }

  return (
    <div>
      <div className="fin-records-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('finance.records.searchPlaceholder')}
          value={records.query}
          onChange={handleQueryChange}
        />
        <Tooltip title={t('finance.csv.export')}>
          <Button
            icon={<DownloadOutlined />}
            aria-label={t('finance.csv.export')}
            disabled={records.filtered.length === 0}
            onClick={handleExportCsv}
          />
        </Tooltip>
        <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
          {t('finance.records.add')}
        </Button>
      </div>

      {records.isLoading ? (
        <ListSkeleton />
      ) : records.isError ? (
        <ErrorState onRetry={records.refetch} />
      ) : records.isEmpty ? (
        <EmptyState
          title={t('finance.records.empty')}
          text={t('finance.records.emptyText')}
        />
      ) : records.filtered.length === 0 ? (
        <EmptyState
          title={t('finance.records.notFound')}
          text={t('finance.records.notFoundText')}
        />
      ) : (
        <div className="fin-records-list">
          {records.filtered.map((item) => (
            <FinanceRecordCard
              key={item.payment.id}
              payment={item.payment}
              hallCost={item.hallCost}
              studentName={item.studentName ?? item.groupName}
              onEdit={setEditPayment}
              onDelete={records.handleDelete}
            />
          ))}
        </div>
      )}

      <AddPaymentModal open={addOpen} onClose={handleCloseAdd} />
      <EditPaymentModal
        open={!!editPayment}
        payment={editPayment}
        onClose={handleCloseEdit}
      />
    </div>
  )
}
