import { useState } from 'react'

import { Button, Input } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, ListSkeleton } from 'common/ui'

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
        <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
          {t('finance.records.add')}
        </Button>
      </div>

      {records.isLoading ? (
        <ListSkeleton />
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
              studentName={item.studentName}
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
