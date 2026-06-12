import { Drawer, Modal } from 'antd'

import { useIsMobile } from 'common/hooks/use-is-mobile'

import type { ReactNode } from 'react'

import './adaptive-sheet.scss'

interface AdaptiveSheetProps {
  open: boolean
  title: ReactNode
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * Мобайл — нижняя шторка (Drawer bottom), десктоп — модалка. Один API.
 * antd v6: ширину/высоту панели задавать через styles.wrapper.
 */
export function AdaptiveSheet({ open, title, onClose, footer, children }: AdaptiveSheetProps) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <Drawer
        open={open}
        title={title}
        placement="bottom"
        onClose={onClose}
        rootClassName="adaptive-sheet"
        styles={{ wrapper: { height: 'auto', maxHeight: '85dvh' } }}
        footer={footer}
        destroyOnHidden
      >
        {children}
      </Drawer>
    )
  }
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
      width="min(520px, 95vw)"
    >
      {children}
    </Modal>
  )
}
