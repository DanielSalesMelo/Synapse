import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { LogIn } from 'lucide-react';

const Login = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 w-full">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
            NexCore
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sua plataforma de gestão inteligente
          </p>
        </div>
        
        <div className="mt-8">
          <button
            onClick={() => loginWithRedirect()}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-md"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <LogIn className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
            </span>
            Entrar ou Cadastrar
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
