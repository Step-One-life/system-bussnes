import { InputNumber, Segmented } from 'antd'

import map from 'lodash/map'

interface PresetPickerProps {
  presets: number[]
  value: number
  isPreset: boolean
  customLabel: string
  formatPreset: (n: number) => string
  onChange: (value: number) => void
}

const CUSTOM = '__custom__'

/**
 * Number picker with preset chips plus a free-input fallback. Used for the
 * lesson duration and the subscription session count.
 */
export function PresetPicker({
  presets,
  value,
  isPreset,
  customLabel,
  formatPreset,
  onChange,
}: PresetPickerProps) {
  const segmentValue = isPreset ? String(value) : CUSTOM

  const handleSegmentChange = (next: string | number) => {
    if (next === CUSTOM) {
      // Switch to custom mode with a value that is not a preset.
      onChange(value)
      return
    }
    onChange(Number(next))
  }
  const handleCustomChange = (next: number | null) => {
    onChange(typeof next === 'number' ? next : 0)
  }

  const options = [
    ...map(presets, (p) => ({ value: String(p), label: formatPreset(p) })),
    { value: CUSTOM, label: customLabel },
  ]

  return (
    <div className="preset-picker">
      <Segmented value={segmentValue} options={options} onChange={handleSegmentChange} />
      {!isPreset && (
        <InputNumber
          min={1}
          value={value}
          onChange={handleCustomChange}
          style={{ width: 120 }}
        />
      )}
    </div>
  )
}
