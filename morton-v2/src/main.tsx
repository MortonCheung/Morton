import { createRoot } from 'react-dom/client'
import App from './app/App'
import './design/tokens.css'
import './design/base.css'
import './design/styleframes.css'
import './design/site.css'

createRoot(document.getElementById('root')!).render(<App />)
