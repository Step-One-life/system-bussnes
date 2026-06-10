import { useState } from 'react'

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
 *
 * Custom mode is tracked in local state so that picking «своё» stays sticky
 * even when the current value happens to coincide with a preset.
 */
export function PresetPicker({
  presets,
  value,
  isPreset,
  customLabel,
  formatPreset,
  onChange,
}: PresetPickerProps) {
  // Sticky user choice of the custom mode. Combined with `isPreset` below it
  // keeps the free input visible even when the value coincides with a preset.
  const [customPicked, setCustomPicked] = useState(false)

  // Custom mode is active when the user explicitly picked it, or when the
  // current value is simply not a preset (e.g. editing an existing rule).
  const isCustom = customPicked || !isPreset

  const segmentValue = isCustom ? CUSTOM : String(value)

  const handleSegmentChange = (next: string | number) => {
    if (next === CUSTOM) {
      setCustomPicked(true)
      return
    }
    setCustomPicked(false)
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
      {isCustom && (
        <InputNumber
          min={1}
          inputMode="numeric"
          value={value}
          onChange={handleCustomChange}
          style={{ width: 120 }}
        />
      )}
    </div>
  )
}
