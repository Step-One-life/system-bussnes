import { Button, Dropdown } from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import type { PricingRule } from '../model/types'
import type { MenuProps } from 'antd'

interface RuleActionsMenuProps {
  rule: PricingRule
  onEdit: (rule: PricingRule) => void
  onDuplicate: (rule: PricingRule) => void
  onDelete: (rule: PricingRule) => void
}

/** Меню действий строки тарифа: редактировать / дублировать / удалить. */
export function RuleActionsMenu({ rule, onEdit, onDuplicate, onDelete }: RuleActionsMenuProps) {
  const { t } = useTranslation()

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'edit') onEdit(rule)
    if (key === 'duplicate') onDuplicate(rule)
    if (key === 'delete') onDelete(rule)
  }

  const items: MenuProps['items'] = [
    { key: 'edit', icon: <EditOutlined />, label: t('finance.pricing.actionsMenu.edit') },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: t('finance.pricing.actionsMenu.duplicate'),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: t('finance.pricing.actionsMenu.delete'),
      danger: true,
    },
  ]

  return (
    <Dropdown menu={{ items, onClick: handleClick }} trigger={['click']}>
      <Button type="text" size="small" icon={<MoreOutlined />} />
    </Dropdown>
  )
}
