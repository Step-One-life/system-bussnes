import { todayISO } from 'common/utils/date'
import { MarkPaidModal } from 'entities/finance'
import { StudentFormModal } from 'entities/students'
import { RenewSubModal } from 'entities/students/subscriptions/renew-sub-modal'
import {
  AddToTrainingModal,
  CalendarTrainingModal,
  EditTrainingModal,
  ensureIndividualGroup,
  GroupTrainingModal,
  IndividualSessionModal,
  PairSessionModal,
  TrainingTypeModal,
} from 'entities/trainings'

import { CloseDaySheet } from './close-day-sheet'
import { KpiDetailModal } from './kpi-detail-modal'
import { QuickMarkSheet } from './quick-mark-sheet'
import { UnpaidSubsModal } from './unpaid-subs-modal'

import type { KpiType } from './kpi-detail-modal'
import type { QuickMarkTarget } from './quick-mark-sheet'
import type { UnpaidSub } from './use-unpaid-subs'
import type { WarningEntry } from 'common/lib/kpi'
import type { Student } from 'entities/students'
import type { CalendarBlock, Training } from 'entities/trainings'

/**
 * Какая модалка главной открыта и с какими данными. Одно состояние вместо
 * 19 независимых флагов: две модалки не могут открыться разом по построению
 * (переходы «из модалки в модалку» и раньше были взаимоисключающими —
 * kpi-detail и calendar-training зовут onClose перед колбэком перехода).
 * Шторка ученика (drawerId) — отдельное состояние: она живёт поверх модалок.
 */
export type HomeModal =
  | { kind: 'kpi'; type: KpiType }
  | { kind: 'close-day'; date: string }
  | { kind: 'quick-mark'; target: QuickMarkTarget }
  | { kind: 'unpaid' }
  | { kind: 'type-picker' }
  | { kind: 'group' }
  | { kind: 'individual'; groupId: string; isOnline: boolean }
  | { kind: 'pair'; groupId: string }
  | { kind: 'calendar'; block: CalendarBlock }
  | { kind: 'edit-training'; training: Training }
  | { kind: 'add-to-training'; training: Training }
  | { kind: 'student-form'; editId: string; seq: number }
  | { kind: 'renew'; studentId: string; groupId: string }
  | { kind: 'mark-paid'; sub: UnpaidSub }

interface HomeModalsProps {
  modal: HomeModal | null
  /**
   * Последняя открывавшаяся модалка: при закрытии `modal` сразу становится
   * null, а payload отсюда ещё нужен antd, пока доигрывается фейд закрытия
   * (зеркало прежнего поведения — indGroupId и closeDate не очищались).
   */
  lastModal: HomeModal | null
  onOpen: (modal: HomeModal) => void
  onClose: () => void
  /** Открыть шторку ученика (отдельное состояние страницы). */
  onOpenStudent: (id: string) => void
  students: Student[]
  trainings: Training[]
  warnings: WarningEntry[]
  indNames: string[]
  regularNames: string[]
}

/** Все модалки главной в одном месте; страница держит только `modal`. */
export function HomeModals({
  modal,
  lastModal,
  onOpen,
  onClose,
  onOpenStudent,
  students,
  trainings,
  warnings,
  indNames,
  regularNames,
}: HomeModalsProps) {
  // Payload для фейда закрытия — чистые производные от lastModal (никаких
  // ref/effect: и то и другое запрещено линтером в рендере).
  const heldInd = lastModal?.kind === 'individual' ? lastModal : null
  const heldPairGroup = lastModal?.kind === 'pair' ? lastModal.groupId : null
  const heldCloseDate = lastModal?.kind === 'close-day' ? lastModal.date : todayISO()
  // Ключ пересоздаёт форму ученика на каждое открытие (свежие данные).
  const heldFormSeq = lastModal?.kind === 'student-form' ? lastModal.seq : 0

  const editStudent =
    modal?.kind === 'student-form'
      ? (students.find((s) => s.id === modal.editId) ?? null)
      : null
  const renewStudent =
    modal?.kind === 'renew' ? students.find((s) => s.id === modal.studentId) : undefined

  const pickIndividual = async () => {
    const g = await ensureIndividualGroup()
    onOpen({ kind: 'individual', groupId: g.name, isOnline: false })
  }
  const pickOnline = async () => {
    const g = await ensureIndividualGroup()
    onOpen({ kind: 'individual', groupId: g.name, isOnline: true })
  }
  const pickPair = async () => {
    const g = await ensureIndividualGroup()
    onOpen({ kind: 'pair', groupId: g.name })
  }
  const handlePickGroup = () => onOpen({ kind: 'group' })
  const handleAddStudent = (training: Training) => onOpen({ kind: 'add-to-training', training })
  const handleEditTraining = (training: Training) => onOpen({ kind: 'edit-training', training })
  const handleRenew = (studentId: string, groupId: string) =>
    onOpen({ kind: 'renew', studentId, groupId })

  return (
    <>
      <KpiDetailModal
        kpiType={modal?.kind === 'kpi' ? modal.type : null}
        students={students}
        trainings={trainings}
        warnings={warnings}
        indNames={indNames}
        regularNames={regularNames}
        onClose={onClose}
        onOpenStudent={onOpenStudent}
        onRenew={handleRenew}
      />

      <CloseDaySheet
        open={modal?.kind === 'close-day'}
        date={heldCloseDate}
        onClose={onClose}
      />

      <QuickMarkSheet
        target={modal?.kind === 'quick-mark' ? modal.target : null}
        onClose={onClose}
      />

      <UnpaidSubsModal open={modal?.kind === 'unpaid'} onClose={onClose} />

      <TrainingTypeModal
        open={modal?.kind === 'type-picker'}
        onClose={onClose}
        onPickGroup={handlePickGroup}
        onPickIndividual={pickIndividual}
        onPickOnline={pickOnline}
        onPickPair={pickPair}
      />
      <GroupTrainingModal open={modal?.kind === 'group'} onClose={onClose} />
      {heldInd && (
        // Одна копия вместо двух смонтированных (обычная/онлайн): isOnline
        // берётся из состояния, key разъединяет формы типов — онлайн-форма
        // не увидит черновик обычной.
        <IndividualSessionModal
          key={heldInd.isOnline ? 'online' : 'individual'}
          open={modal?.kind === 'individual'}
          indGroupId={heldInd.groupId}
          isOnline={heldInd.isOnline}
          onClose={onClose}
        />
      )}
      {heldPairGroup && (
        <PairSessionModal
          open={modal?.kind === 'pair'}
          indGroupId={heldPairGroup}
          onClose={onClose}
        />
      )}

      <CalendarTrainingModal
        open={modal?.kind === 'calendar'}
        block={modal?.kind === 'calendar' ? modal.block : null}
        onClose={onClose}
        onAddStudent={handleAddStudent}
        onEdit={handleEditTraining}
      />
      <EditTrainingModal
        open={modal?.kind === 'edit-training'}
        training={modal?.kind === 'edit-training' ? modal.training : null}
        onClose={onClose}
      />
      <AddToTrainingModal
        open={modal?.kind === 'add-to-training'}
        training={modal?.kind === 'add-to-training' ? modal.training : null}
        onClose={onClose}
      />

      <StudentFormModal
        key={heldFormSeq}
        open={modal?.kind === 'student-form'}
        student={editStudent}
        onClose={onClose}
      />

      {modal?.kind === 'renew' && renewStudent && (
        <RenewSubModal
          open
          studentId={modal.studentId}
          studentName={renewStudent.name}
          groupId={modal.groupId}
          onClose={onClose}
        />
      )}

      {modal?.kind === 'mark-paid' && (
        <MarkPaidModal
          open
          student={modal.sub.student}
          sub={modal.sub.sub}
          isIndividual={modal.sub.isIndividual}
          onClose={onClose}
        />
      )}
    </>
  )
}
