import React from 'react';
import MainLayout from '../components/layout/MainLayout';

const Dashboard = () => {
  return (
    <MainLayout>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Bem-vindo ao NexCore
        </h2>
        <p className="text-gray-600 leading-relaxed max-w-2xl">
          Sua plataforma de gestão inteligente está pronta. Explore as funcionalidades através da barra lateral à esquerda.
        </p>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-2">Vendas Hoje</p>
            <p className="text-2xl font-bold text-indigo-900">R$ 1.250,00</p>
          </div>
          <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-2">Novos Clientes</p>
            <p className="text-2xl font-bold text-green-900">12</p>
          </div>
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-2">Faturamento Mês</p>
            <p className="text-2xl font-bold text-blue-900">R$ 45.800,00</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
