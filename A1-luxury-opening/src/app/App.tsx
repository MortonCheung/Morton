import { installProbe, setState } from '../lib/timeline'
import { OpeningStage } from '../components/OpeningStage'

// Probe contract: install once, start in `loading`. The opening hook owns the
// real state transitions from here on.
installProbe()
setState('loading')

export default function App() {
  return <OpeningStage />
}
