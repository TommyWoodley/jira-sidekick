import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IssueApp } from './IssueApp';
import '../shared/styles.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IssueApp />
  </StrictMode>
);

