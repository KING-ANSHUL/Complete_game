import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { FullscreenWrapper } from './components/FullscreenWrapper';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FullscreenWrapper>
      <App />
    </FullscreenWrapper>
  </React.StrictMode>
);