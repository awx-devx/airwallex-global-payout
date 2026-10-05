import { kitSections } from '@/ui/kit/sections'
import { MOCK_CLOCK } from '@/mocks/fixtures'
import { KitShell, type KitWidth } from './kit-shell'

type Search = {
  motion?: string | string[]
  clock?: string | string[]
  width?: string | string[]
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams
  const width: KitWidth = first(params.width) === '800' ? 800 : 1120

  return (
    <KitShell
      sections={kitSections}
      frozenAt={MOCK_CLOCK}
      initialMotion={first(params.motion) === 'off' ? 'off' : 'on'}
      initialClock={first(params.clock) === 'frozen' ? 'frozen' : 'live'}
      initialWidth={width}
    />
  )
}
