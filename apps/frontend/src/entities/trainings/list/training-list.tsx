import { TrainingItem } from './training-item'

import type { Training } from '../model/types'
import type { Group } from 'entities/groups/model/types'
import type { Student } from 'entities/students/model/types'

interface TrainingListProps {
  trainings: Training[]
  students: Student[]
  groups: Group[]
  onAddStudent: (training: Training) => void
  onRemoveStudent: (training: Training, studentId: string) => void
  onDelete: (training: Training) => void
}

export function TrainingList({
  trainings,
  students,
  groups,
  onAddStudent,
  onRemoveStudent,
  onDelete,
}: TrainingListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {trainings.map((t) => (
        <TrainingItem
          key={t.id}
          training={t}
          students={students}
          groups={groups}
          onAddStudent={onAddStudent}
          onRemoveStudent={onRemoveStudent}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
