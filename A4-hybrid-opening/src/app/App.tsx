import { installProbe } from '../lib/timeline'
import { OpeningExperience } from '../features/opening/OpeningExperience'

// Install the probe contract once, at module load, before any state transition.
installProbe()

export default function App() {
  return <OpeningExperience />
}
