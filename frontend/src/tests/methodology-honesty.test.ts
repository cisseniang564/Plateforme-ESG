import { describe, it, expect } from 'vitest'
import src from '../pages/Settings/MethodologyConfig.tsx?raw'

describe('MethodologyConfig : pas de chiffres ni d\'actions factices', () => {
  it('ne contient plus de couverture codée en dur ni d\'heuristique', () => {
    expect(src).not.toMatch(/coverage:\s*\d+/)
    expect(src).not.toMatch(/configured:\s*\d+/)
    expect(src).not.toContain('Math.round(totalEntries * 0.')
  })
  it('ne simule plus un enregistrement', () => {
    expect(src).not.toMatch(/setTimeout\(r, 900\)/)
    expect(src).not.toContain('toggleActive')
  })
  it('bloque l\'enregistrement des poids tant qu\'ils ne sont pas chargés', () => {
    expect(src).toContain("weightsState !== 'ready'")
    expect(src).toContain("setWeightsState('error')")
  })
})

import tenant from '../pages/Settings/TenantSettings.tsx?raw'
describe('TenantSettings : pas d\'écrasement sans données chargées', () => {
  it('signale l\'échec de chargement et bloque l\'enregistrement', () => {
    expect(tenant).toContain("id: 'tenant-load-error'")
    expect(tenant).toContain('saving || tenantLoading || !tenantData')
  })
})
