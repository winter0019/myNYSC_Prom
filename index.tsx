/// <reference lib="dom" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Fix: Use window.document to ensure the global document object is found in environments with limited DOM types.
const rootElement = (window as any).document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);