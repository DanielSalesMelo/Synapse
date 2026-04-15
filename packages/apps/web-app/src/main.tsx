import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

// Estas variáveis devem ser configuradas no painel do Auth0
const domain = import.meta.env.VITE_AUTH0_DOMAIN || "dev-nexcore.us.auth0.com";
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || "your-client-id";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin + '/dashboard'
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
