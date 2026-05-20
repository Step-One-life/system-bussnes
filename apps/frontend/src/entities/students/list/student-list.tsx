import { StudentCard } from './student-card'

import type { Student } from '../model/types'

interface StudentListProps {
  students: Student[]
  indNames: string[]
  onOpen: (id: string) => void
}

export function StudentList({ students, indNames, onOpen }: StudentListProps) {
  return (
    <div className="students-grid">
      {students.map((s) => (
        <StudentCard key={s.id} student={s} indNames={indNames} onClick={onOpen} />
      ))}
    </div>
  )
}
