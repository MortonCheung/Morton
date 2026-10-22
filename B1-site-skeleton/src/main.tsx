import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/opening.css'
import './styles/chapters.css'
import './styles/gallery.css'
import './styles/detail.css'

createRoot(document.getElementById('root')!).render(<App />)
