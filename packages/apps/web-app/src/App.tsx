import React from 'react';
import { Route, Switch, Redirect } from 'wouter';
import { useAuth0 } from '@auth0/auth0-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssetsPage from './pages/AssetsPage';
import { Loader2 } from 'lucide-react';

// Componente para proteger rotas
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Component {...rest} /> : <Redirect to="/login" />;
};

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>

      <Route path="/dashboard/assets">
        <ProtectedRoute component={AssetsPage} />
      </Route>

      <Route path="/">
        <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />
      </Route>

      <Route>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-indigo-600">404</h1>
            <p className="text-xl text-gray-600 mt-4">Página não encontrada</p>
            <a href="/" className="mt-6 inline-block text-indigo-600 hover:underline">Voltar para o início</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default App;
