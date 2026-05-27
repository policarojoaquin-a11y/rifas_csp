import React from 'react';
import { Ticket, Users, User, ShieldCheck, RefreshCw, Database } from 'lucide-react';
import { DatabaseEngine } from '../services/dbApi';

interface HeaderProps {
  currentView: 'buyer' | 'admin';
  setView: (view: 'buyer' | 'admin') => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
  raffleTitle: string;
  onResetAll: () => void; // Ease of demo
  dbEngine?: DatabaseEngine;
}

export default function Header({
  currentView,
  setView,
  isAdminLoggedIn,
  onAdminLogout,
  raffleTitle,
  onResetAll,
  dbEngine = 'MOCK_LOCAL'
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand and Active Raffle */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-200">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-800">Rifas Online</h1>
            </div>
            <p className="hidden text-xs font-medium text-slate-500 sm:block max-w-xs truncate">
              {raffleTitle || "Cargando sorteo..."}
            </p>
          </div>
        </div>


        {/* View Switches & Demo Reset */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Demo Reset Button */}
          <button
            onClick={() => {
              if (confirm('¿Restablecer el simulador con datos de demostración iniciales de San Patricio?')) {
                onResetAll();
              }
            }}
            title="Restablecer base de datos mock"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Comprar Rifa View Button */}
          <button
            id="nav-buyer-btn"
            onClick={() => setView('buyer')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              currentView === 'buyer'
                ? 'bg-sky-50 text-sky-700 ring-2 ring-sky-500/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4" />
            <span className="hidden xs:inline">Comprar Rifa</span>
          </button>

          {/* Admin Panel Button */}
          <button
            id="nav-admin-btn"
            onClick={() => setView('admin')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              currentView === 'admin'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Admin</span>
            {currentView === 'admin' && isAdminLoggedIn && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>

          {currentView === 'admin' && isAdminLoggedIn && (
            <button
              onClick={onAdminLogout}
              className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Salir
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
