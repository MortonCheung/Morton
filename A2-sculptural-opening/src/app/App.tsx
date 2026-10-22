import { useCallback, useRef, useState } from 'react'
import { OpeningStage, type StageApi } from '../components/OpeningStage'
import { Overlay } from '../components/Overlay'
import { installProbe, type OpeningState } from '../lib/timeline'

// Contract probe: installed before the scene boots so automated checks never race it.
installProbe()

export default function App() {
  const [state, setState] = useState<OpeningState>('loading')
  const [error, setError] = useState<string | null>(null)
  const apiRef = useRef<StageApi | null>(null)

  const handleState = useCallback((next: OpeningState) => setState(next), [])
  const handleError = useCallback((reason: string) => setError(reason), [])
  const handleReady = useCallback((api: StageApi) => {
    apiRef.current = api
  }, [])
  const handleReplay = useCallback(() => {
    apiRef.current?.replay()
  }, [])

  return (
    <main className="opening" data-morton-root data-phase={state}>
      <OpeningStage onState={handleState} onError={handleError} onReady={handleReady} />
      <Overlay state={state} error={error} onReplay={handleReplay} />
    </main>
  )
}
