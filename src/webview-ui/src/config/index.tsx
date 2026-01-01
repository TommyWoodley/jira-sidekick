import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigApp } from './ConfigApp';
import '../shared/styles.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigApp />
  </StrictMode>
);

