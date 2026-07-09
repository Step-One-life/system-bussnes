import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Button, Collapse, Drawer, Popconfirm } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { formatDateShort } from 'common/utils/date'
import { MarkPaidModal } from 'entities/finance'
import { useGroups } from 'entities/groups/api/use-groups'
import { useRemoveVisitAt } from 'entities/trainings/api/use-trainings'

import { studentKeys } from '../api/use-students'
import { getLastVisitDate,getStudentById } from '../model/students.repo'
import { AddSubModal } from '../subscriptions/add-sub-modal'
import { EditSubModal } from '../subscriptions/edit-sub-modal'
import { ExtendSubModal } from '../subscriptions/extend-sub-modal'
import { RenewSubModal } from '../subscriptions/renew-sub-modal'
import { ContactActions } from './contact-actions'
import { SharedSubCard } from './shared-sub-card'
import { SubCard } from './sub-card'
import { useStudentActions } from './use-student-actions'
import { VisitHistory } from './visit-history'

import type { Subscription } from '../model/types'

import './student-drawer.scss'

interface StudentDrawerProps {
  studentId: string | null
  onClose: () => void
  onEdit: (studentId: string) => void
}

type SubModalState =
  | { kind: 'renew'; groupId: string }
  // Продление адресное: карточка передаёт конкретный абонемент (эвристика
  // «активный по группе» брала не тот при нескольких активных абонементах).
  | { kind: 'extend'; groupId: string; sub: Subscription }
  | null
type MarkPaidState = { subId: string; groupId: string } | null

export function StudentDrawer({ studentId, onClose, onEdit }: StudentDrawerProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: groups = [] } = useGroups()
  const removeVisitAt = useRemoveVisitAt()
  const [subModal, setSubModal] = useState<SubModalState>(null)
  const [markPaid, setMarkPaid] = useState<MarkPaidState>(null)
  const [addSubOpen, setAddSubOpen] = useState(false)
  const [editSub, setEditSub] = useState<{ sub: Subscription; isIndividual: boolean } | null>(null)

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
  // Общие абонементы (покрывают несколько групп) показываем отдельной секцией,
  // а покрытые ими группы — не дублируем подушевыми карточками.
  const sharedSubs = student?.subscriptions.filter((s) => (s.groupIds?.length ?? 0) > 1) ?? []
  const coveredByShared = new Set(sharedSubs.flatMap((s) => s.groupIds))
  const groupGroups =
    student?.groups.filter((g) => !indNames.includes(g) && !coveredByShared.has(g)) ?? []
  const indGroups = student?.groups.filter((g) => indNames.includes(g)) ?? []
  const lastVisit = student ? getLastVisitDate(student) : null

  const handleRemoveVisit = async (index: number) => {
    if (!studentId) return
    await removeVisitAt.mutateAsync({ studentId, index })
    refresh()
  }

  const handleEditStudent = () => student && onEdit(student.id)

  const handleDeduct = (sub: Subscription) => {
    if (student) void actions.deduct(student.id, sub.id)
  }
  const handleRenewSub = (groupId: string) => () =>
    setSubModal({ kind: 'renew', groupId })
  const handleExtendSub = (groupId: string) => (sub: Subscription) =>
    setSubModal({ kind: 'extend', groupId, sub })
  const handleDeleteSub = (subId: string) =>
    student && actions.removeSubscription(student.id, subId)
  const handleMarkPaid = (groupId: string) => (subId: string) =>
    setMarkPaid({ subId, groupId })
  const handleEditSub = (isIndividual: boolean) => (sub: Subscription) =>
    setEditSub({ sub, isIndividual })

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
  const handleOpenAddSub = () => setAddSubOpen(true)
  const handleCloseAddSub = () => {
    setAddSubOpen(false)
    refresh()
  }
  const handleCloseEditSub = () => {
    setEditSub(null)
    refresh()
  }

  return (
    <>
      <Drawer
        open={!!studentId}
        onClose={onClose}
        // antd v6: проп width у Drawer deprecated, а size принимает только
        // default/large — адаптивную ширину задаём через styles.wrapper.
        styles={{ wrapper: { width: 'min(460px, 100vw)' } }}
        title={student?.name ?? ''}
        extra={
          student && (
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label={t('common.edit')}
              onClick={handleEditStudent}
            />
          )
        }
      >
        {student && (
          <>
            <div style={{ color: 'var(--tk-text-secondary)', fontSize: '0.85rem' }}>
              {t('students.drawer.lastVisit')}{' '}
              <strong>{lastVisit ? formatDateShort(lastVisit) : t('common.dash')}</strong>
            </div>

            {student.phone && (
              <div className="drawer-contacts">
                <span className="drawer-contacts__phone">{student.phone}</span>
                <ContactActions phone={student.phone} />
              </div>
            )}

            {student.note && <div className="drawer-note">{student.note}</div>}

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
                  onDeduct={handleDeduct}
                  onRenew={handleRenewSub(g)}
                  onExtend={handleExtendSub(g)}
                  onEdit={handleEditSub(false)}
                  onDeleteSub={handleDeleteSub}
                  onMarkPaid={handleMarkPaid(g)}
                />
              ))
            ) : (
              <p style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.85rem' }}>
                {t('students.drawer.noGroupSessions')}
              </p>
            )}

            {sharedSubs.length > 0 && (
              <>
                <div className="section-title">{t('students.drawer.sharedSubs')}</div>
                {sharedSubs.map((s) => (
                  <SharedSubCard
                    key={s.id}
                    student={student}
                    sub={s}
                    onEdit={handleEditSub(false)}
                    onExtend={handleExtendSub(s.groupId)}
                    onDeleteSub={handleDeleteSub}
                    onMarkPaid={handleMarkPaid(s.groupId)}
                  />
                ))}
              </>
            )}

            <div style={{ marginTop: 'var(--sp-3)' }}>
              <Button size="small" icon={<PlusOutlined />} onClick={handleOpenAddSub}>
                {t('subscriptions.add.openBtn')}
              </Button>
            </div>

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
                    onDeduct={handleDeduct}
                    onRenew={handleRenewSub(g)}
                    onExtend={handleExtendSub(g)}
                    onEdit={handleEditSub(true)}
                    onDeleteSub={handleDeleteSub}
                    onMarkPaid={handleMarkPaid(g)}
                  />
                ))}
              </>
            )}

            {/* История свёрнута по умолчанию: дровер и так длинный, на мобильном
                много скролла; счётчик в заголовке показывает объём без раскрытия. */}
            <Collapse
              ghost
              className="visit-collapse"
              items={[
                {
                  key: 'visits',
                  label: `${t('students.drawer.visitHistory')} · ${student.visitHistory.length}`,
                  children: (
                    <VisitHistory
                      student={student}
                      indNames={indNames}
                      onRemoveVisit={handleRemoveVisit}
                    />
                  ),
                },
              ]}
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
          sub={subModal.sub}
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
      {student && addSubOpen && (
        <AddSubModal
          open
          studentId={student.id}
          studentName={student.name}
          studentGroups={student.groups}
          onClose={handleCloseAddSub}
        />
      )}
      {student && editSub && (
        <EditSubModal
          open
          studentId={student.id}
          studentName={student.name}
          sub={editSub.sub}
          isIndividual={editSub.isIndividual}
          onClose={handleCloseEditSub}
        />
      )}
    </>
  )
}
