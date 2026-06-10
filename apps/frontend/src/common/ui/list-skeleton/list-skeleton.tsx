import { Skeleton } from 'antd'

import './list-skeleton.scss'

interface ListSkeletonProps {
  /** Сколько карточек-заглушек показать. */
  rows?: number
}

/** Заглушка первой загрузки списков — вместо мелькающего EmptyState. */
export function ListSkeleton({ rows = 4 }: ListSkeletonProps) {
  return (
    <div className="list-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="list-skeleton__card">
          <Skeleton active title={false} avatar={{ shape: 'circle', size: 40 }} paragraph={{ rows: 2, width: ['55%', '35%'] }} />
        </div>
      ))}
    </div>
  )
}
