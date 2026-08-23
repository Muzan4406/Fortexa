import { createRoot } from 'react-dom/client';

import App from './App';
import { setBaseUrl } from '@workspace/api-client-react';

import './index.css';

// Generated API hooks use /api paths. Prefix them with the app base path when
// Fortexa is hosted alongside another application (for example /fortexa/).
const appBasePath = import.meta.env.BASE_URL.replace(/\/+$/, '');
setBaseUrl(appBasePath || null);

createRoot(document.getElementById('root')!).render(<App />);
