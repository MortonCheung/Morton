import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/global.css'

// No StrictMode: this prototype owns real WebGL resources, and StrictMode's
// double mount/unmount would dispose the shared geometry the second O renders.
createRoot(document.getElementById('root')!).render(<App />)
