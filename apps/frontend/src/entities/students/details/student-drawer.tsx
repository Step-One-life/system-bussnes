import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Button, Drawer, Popconfirm } from 'antd'
import { DeleteOutlined, EditOutlined, UserOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { formatDateShort } from 'common/utils/date'
import { MarkPaidModal } from 'entities/finance'
import { useGroups } from 'entities/groups/api/use-groups'
import { useRemoveVisitAt } from 'entities/trainings/api/use-trainings'

import { studentKeys } from '../api/use-students'
import { getLastVisitDate,getStudentById } from '../model/students.repo'
import { ExtendSubModal } from '../subscriptions/extend-sub-modal'
import { RenewSubModal } from '../subscriptions/renew-sub-modal'
import { SubCard } from './sub-card'
import { useStudentActions } from './use-student-actions'
import { VisitHistory } from './visit-history'

import './student-drawer.scss'

interface StudentDrawerProps {
  studentId: string | null
  onClose: () => void
  onEdit: (studentId: string) => void
}

type SubModalState = { kind: 'renew' | 'extend'; groupId: string } | null
type MarkPaidState = { subId: string; groupId: string } | null

export function StudentDrawer({ studentId, onClose, onEdit }: StudentDrawerProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: groups = [] } = useGroups()
  const removeVisitAt = useRemoveVisitAt()
  const [subModal, setSubModal] = useState<SubModalState>(null)
  const [markPaid, setMarkPaid] = useState<MarkPaidState>(null)

  const { data: student } = useQuery({
    queryKey: ['students', studentId],
    queryFn: () => getStudentById(studentId!),
    enabled: !!studentId,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['students', studentId] })
    qc.invalidateQueries({ queryKey: studentKeys.all })
  }

  const actions = useStudentActions(refresh)

  const indNames = groups.filter((g) => g.isIndividual).map((g) => g.name)
  const groupGroups = student?.groups.filter((g) => !indNames.includes(g)) ?? []
  const indGroups = student?.groups.filter((g) => indNames.includes(g)) ?? []
  const lastVisit = student ? getLastVisitDate(student) : null

  const handleRemoveVisit = async (index: number) => {
    if (!studentId) return
    await removeVisitAt.mutateAsync({ studentId, index })
    refresh()
  }

  const handleEditStudent = () => student && onEdit(student.id)

  const handleDeduct = (groupId: string) => () =>
    student && actions.deduct(student.id, groupId)
  const handleRenewSub = (groupId: string) => () =>
    setSubModal({ kind: 'renew', groupId })
  const handleExtendSub = (groupId: string) => () =>
    setSubModal({ kind: 'extend', groupId })
  const handleDeleteSub = (subId: string) =>
    student && actions.removeSubscription(student.id, subId)
  const handleMarkPaid = (groupId: string) => (subId: string) =>
    setMarkPaid({ subId, groupId })

  const handleConfirmDelete = async () => {
    if (!student) return
    await actions.removeStudent(student.id)
    onClose()
  }

  const handleCloseSubModal = () => {
    setSubModal(null)
    refresh()
  }
  const handleCloseMarkPaid = () => {
    setMarkPaid(null)
    refresh()
  }

  return (
    <>
      <Drawer
        open={!!studentId}
        onClose={onClose}
        width={460}
        title={student?.name ?? ''}
        extra={
          student && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={handleEditStudent}
            />
          )
        }
      >
        {student && (
          <>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {t('students.drawer.lastVisit')}{' '}
              <strong>{lastVisit ? formatDateShort(lastVisit) : t('common.dash')}</strong>
            </div>

            <div className="section-title" style={{ marginTop: 'var(--sp-4)' }}>
              {t('students.drawer.groupSessions')}
            </div>
            {groupGroups.length ? (
              groupGroups.map((g) => (
                <SubCard
                  key={g}
                  student={student}
                  groupId={g}
                  isIndividual={false}
                  onDeduct={handleDeduct(g)}
                  onRenew={handleRenewSub(g)}
                  onExtend={handleExtendSub(g)}
                  onDeleteSub={handleDeleteSub}
                  onMarkPaid={handleMarkPaid(g)}
                />
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('students.drawer.noGroupSessions')}
              </p>
            )}

            {indGroups.length > 0 && (
              <>
                <div className="section-title">
                  <UserOutlined /> {t('students.drawer.individual')}
                </div>
                {indGroups.map((g) => (
                  <SubCard
                    key={g}
                    student={student}
                    groupId={g}
                    isIndividual
                    onDeduct={handleDeduct(g)}
                    onRenew={handleRenewSub(g)}
                    onExtend={handleExtendSub(g)}
                    onDeleteSub={handleDeleteSub}
                    onMarkPaid={handleMarkPaid(g)}
                  />
                ))}
              </>
            )}

            <div className="section-title">{t('students.drawer.visitHistory')}</div>
            <VisitHistory
              student={student}
              indNames={indNames}
              onRemoveVisit={handleRemoveVisit}
            />

            <div style={{ marginTop: 'var(--sp-6)' }}>
              <Popconfirm
                title={t('students.drawer.deleteTitle', { name: student.name })}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={handleConfirmDelete}
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
                  {t('students.drawer.deleteStudent')}
                </Button>
              </Popconfirm>
            </div>
          </>
        )}
      </Drawer>

      {student && subModal?.kind === 'renew' && (
        <RenewSubModal
          open
          studentId={student.id}
          studentName={student.name}
          groupId={subModal.groupId}
          onClose={handleCloseSubModal}
        />
      )}
      {student && subModal?.kind === 'extend' && (
        <ExtendSubModal
          open
          studentId={student.id}
          studentName={student.name}
          groupId={subModal.groupId}
          sub={
            student.subscriptions.find(
              (s) => s.groupId === subModal.groupId && s.isActive,
            ) ?? null
          }
          onClose={handleCloseSubModal}
        />
      )}
      {student && markPaid && (
        <MarkPaidModal
          open
          student={student}
          sub={
            student.subscriptions.find((s) => s.id === markPaid.subId) ?? null
          }
          isIndividual={indNames.includes(markPaid.groupId)}
          onClose={handleCloseMarkPaid}
        />
      )}
    </>
  )
}
