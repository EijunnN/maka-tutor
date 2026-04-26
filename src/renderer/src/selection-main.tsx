import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SelectionApp } from './selection/SelectionApp';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SelectionApp />
  </StrictMode>,
);
