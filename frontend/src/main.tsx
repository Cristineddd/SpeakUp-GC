import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { disableConsolesInProduction } from './utils/logger'

// Disable console logs in production (only show in localhost/development)
disableConsolesInProduction();

createRoot(document.getElementById("root")!).render(<App />);
