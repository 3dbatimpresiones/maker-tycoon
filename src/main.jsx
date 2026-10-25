import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';
import './styles/base.css';
import './styles/game.css';
import './styles/v2.css';
import './styles/v3.css';
import './styles/online.css';
import './styles/chat.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
