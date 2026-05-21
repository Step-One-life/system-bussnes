import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { useCreateLocation, useUpdateLocation } from '../api/use-locations'

import type { Location, LocationKind } from '../model/types'

interface UseLocationFormOptions {
  location: Location | null
  onDone: () => void
}

export function useLocationForm({ location, onDone }: UseLocationFormOptions) {
  const { t } = useTranslation()
  const isEdit = !!location
  const toast = useToast()
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()

  const [name, setName] = useState(location?.name ?? '')
  const [address, setAddress] = useState(location?.address ?? '')
  const [kind, setKind] = useState<LocationKind>(location?.kind ?? 'hall')
  const [isDefault, setIsDefault] = useState(location?.isDefault ?? false)

  const saving = createLocation.isPending || updateLocation.isPending

  const submit = async () => {
    if (!name.trim()) {
      toast({ type: 'error', title: t('locations.nameRequired') })
      return
    }
    try {
      if (isEdit) {
        await updateLocation.mutateAsync({
          id: location.id,
          changes: { name: name.trim(), address: address.trim() || null, kind, isDefault },
        })
        toast({ type: 'success', title: t('locations.updated'), msg: name.trim() })
      } else {
        await createLocation.mutateAsync({
          name: name.trim(),
          address: address.trim() || null,
          kind,
          isDefault,
        })
        toast({ type: 'success', title: t('locations.created'), msg: name.trim() })
      }
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return {
    isEdit,
    name,
    setName,
    address,
    setAddress,
    kind,
    setKind,
    isDefault,
    setIsDefault,
    saving,
    submit,
  }
}
