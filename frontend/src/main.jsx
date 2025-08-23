import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { loadPlugins } from './plugins';
import './styles/index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

async function main() {
  const plugins = await loadPlugins();
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App plugins={plugins} />
      </BrowserRouter>
    </React.StrictMode>
  );
}

main();