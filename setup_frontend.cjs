const fs = require('fs');
const path = require('path');

console.log('--- Iniciando configuração automática do Frontend com Tailwind CSS ---');

const webAppPath = path.join(__dirname, 'packages', 'apps', 'web-app');

// --- Conteúdos dos Arquivos ---

const tailwindConfigContent = `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

const postcssConfigContent = `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

const indexCssContent = `
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

const loginPageContent = `
// packages/apps/web-app/src/pages/Login.tsx
import React from 'react';

const LoginPage = () => {
  return (
    // Container principal que centraliza tudo na tela
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      
      {/* O card do formulário */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        
        {/* Título */}
        <h1 className="text-3xl font-bold text-center text-gray-900">
          Bem-vindo ao NexCore
        </h1>
        
        {/* Formulário */}
        <form className="space-y-6">
          {/* Campo de Email */}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="seu@email.com"
            />
          </div>

          {/* Campo de Senha */}
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Sua senha"
            />
          </div>

          {/* Botão de Entrar */}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
`;

const appTsxContent = `
// packages/apps/web-app/src/App.tsx
import LoginPage from './pages/Login';

function App() {
  // Por enquanto, vamos apenas renderizar a página de login
  return <LoginPage />;
}

export default App;
`;

try {
    // 1. Cria/Reescreve os arquivos de configuração
    fs.writeFileSync(path.join(webAppPath, 'tailwind.config.js'), tailwindConfigContent, 'utf8');
    console.log('✅ Arquivo tailwind.config.js criado/corrigido.');
    fs.writeFileSync(path.join(webAppPath, 'postcss.config.js'), postcssConfigContent, 'utf8');
    console.log('✅ Arquivo postcss.config.js criado/corrigido.');

    // 2. Cria/Reescreve o index.css
    fs.writeFileSync(path.join(webAppPath, 'src', 'index.css'), indexCssContent, 'utf8');
    console.log('✅ Arquivo src/index.css configurado para o Tailwind.');

    // 3. Garante que a pasta 'pages' existe
    const pagesDir = path.join(webAppPath, 'src', 'pages');
    if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir);
        console.log('✅ Pasta src/pages criada.');
    }

    // 4. Cria/Reescreve a página de Login
    fs.writeFileSync(path.join(pagesDir, 'Login.tsx'), loginPageContent, 'utf8');
    console.log('✅ Página Login.tsx criada/atualizada com o novo design.');

    // 5. Cria/Reescreve o App.tsx
    fs.writeFileSync(path.join(webAppPath, 'src', 'App.tsx'), appTsxContent, 'utf8');
    console.log('✅ Arquivo App.tsx configurado para exibir a página de login.');

    console.log('\n✅✅✅ SUCESSO! A configuração do frontend foi concluída.');
    console.log('--- Agora, vamos iniciar os servidores... ---');

} catch (error) {
    console.error('❌ Erro durante a configuração automática:', error.message);
    process.exit(1);
}
