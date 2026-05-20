import { GroupCard } from './group-card'

import type { Group } from '../model/types'

interface GroupListProps {
  groups: Group[]
  onOpen: (group: Group) => void
  onEdit: (group: Group) => void
}

export function GroupList({ groups, onOpen, onEdit }: GroupListProps) {
  return (
    <div className="groups-grid">
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} onOpen={onOpen} onEdit={onEdit} />
      ))}
    </div>
  )
}
