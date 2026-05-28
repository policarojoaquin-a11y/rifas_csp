import React, { useState, useEffect } from 'react';
import { dbApi, determineActiveEngine, DatabaseEngine } from './services/dbApi';
import { Raffle, Seller, Ticket, PurchaseRequest, BankInfo } from './types';
import Header from './components/Header';
import BuyerView from './components/BuyerView';
import AdminView from './components/AdminView';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

export default function App() {
  // Navigation
  const [currentView, setView] = useState<'buyer' | 'admin'>('buyer');
  
  // App core state
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [engine, setEngine] = useState<DatabaseEngine>('MOCK_LOCAL');

  // Loading/Sync indicators
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Admin authentication (session-less client verification)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('rifas_online_admin_auth') === 'true';
  });

  // Fetch all state from dbApi
  const loadAppState = async () => {
    try {
      const activeEng = await determineActiveEngine();
      setEngine(activeEng);

      const activeRaffle = await dbApi.getActiveRaffle();
      const loadedSellers = await dbApi.getSellers();
      const loadedTickets = await dbApi.getTickets();
      const loadedPurchases = await dbApi.getPurchases();

      setRaffle(activeRaffle);
      setSellers(loadedSellers);
      setTickets(loadedTickets);
      setPurchases(loadedPurchases);
    } catch (e) {
      console.error('Error cargando datos de la base de datos:', e);
    } finally {
      setIsAppLoading(false);
    }
  };

  useEffect(() => {
    loadAppState();
  }, []);

  // Listen and sync session authentication via Supabase Auth in real-time
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsAdminLoggedIn(true);
          sessionStorage.setItem('rifas_online_admin_auth', 'true');
        }
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setIsAdminLoggedIn(true);
          sessionStorage.setItem('rifas_online_admin_auth', 'true');
        } else {
          setIsAdminLoggedIn(false);
          sessionStorage.removeItem('rifas_online_admin_auth');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [engine]);

  // Sync session authentication
  const handleAdminLogin = async (
    email: string, 
    password: string, 
    action: 'login' | 'signup' = 'login'
  ): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        if (action === 'signup') {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) {
            return { success: false, error: error.message };
          }
          if (data.session) {
            setIsAdminLoggedIn(true);
            sessionStorage.setItem('rifas_online_admin_auth', 'true');
            return { success: true };
          } else {
            return { success: true, error: 'Registro exitoso. Se ha enviado un correo de confirmación de registro si está habilitado en tu Supabase.' };
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            return { success: false, error: error.message };
          }
          setIsAdminLoggedIn(true);
          sessionStorage.setItem('rifas_online_admin_auth', 'true');
          return { success: true };
        }
      } catch (e: any) {
        return { success: false, error: e.message || 'Error en la autenticación de Supabase.' };
      }
    } else {
      // Mock mode fallback logic
      if ((email === 'admin' || email === 'admin@mail.com') && password === 'admin') {
        setIsAdminLoggedIn(true);
        sessionStorage.setItem('rifas_online_admin_auth', 'true');
        return { success: true };
      }
      return { success: false, error: 'Credenciales de prueba incorrectas (Usuario: admin, Contraseña: admin).' };
    }
  };

  const handleAdminLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout failed, clearing local state anyway:', err);
      }
    }
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('rifas_online_admin_auth');
  };

  // ACTION: Submit purchase request
  const handlePurchaseSubmission = async (formData: {
    raffleId: string;
    sellerId: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    ticketNumbers: number[];
    receiptUrl: string;
    totalPrice: number;
  }) => {
    setIsSubmitLoading(true);
    try {
      await dbApi.submitPurchase(formData);
      // Re-fetch to sync buyer & admin states
      await loadAppState();
    } catch (e) {
      throw e; // Bubble up error to display on form UI
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // ACTION: Approve a transaction
  const handleApprovePurchase = async (id: string) => {
    try {
      await dbApi.approvePurchase(id);
      await loadAppState();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al aprobar la reserva.');
    }
  };

  // ACTION: Reject a transaction
  const handleRejectPurchase = async (id: string, reason: string) => {
    try {
      await dbApi.rejectPurchase(id, reason);
      await loadAppState();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al rechazar la reserva.');
    }
  };

  // ACTION: Create seller
  const handleCreateSeller = async (name: string, phone: string, code: string, assignedNumbers: number[]) => {
    try {
      await dbApi.createSeller(name, phone, code, assignedNumbers);
      await loadAppState();
    } catch (e) {
      throw e; // Bubble up code duplications
    }
  };

  // ACTION: Reassign numbers
  const handleAssignNumbersToSeller = async (sellerId: string, numbers: number[]) => {
    try {
      await dbApi.assignNumbersToSeller(sellerId, numbers);
      await loadAppState();
    } catch (e) {
      throw e;
    }
  };

  // ACTION: Initialize new raffle
  const handleCreateNewRaffle = async (title: string, description: string, price: number, totalCount: number, bank: BankInfo) => {
    try {
      await dbApi.createNewRaffle(title, description, price, totalCount, bank);
      await loadAppState();
    } catch (e) {
      throw e;
    }
  };

  // ACTION: Select winner
  const handleDrawWinner = async () => {
    const res = await dbApi.drawWinner();
    await loadAppState();
    return res;
  };

  // ACTION: Clear winner
  const handleResetWinner = async () => {
    await dbApi.resetWinner();
    await loadAppState();
  };

  // Developer Reset Demo State Loop
  const handleResetSimulator = async () => {
    setIsAppLoading(true);
    await dbApi.resetAllToDefaults();
    await loadAppState();
  };

  // Loading page container
  if (isAppLoading || !raffle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-9 w-9 border-3 border-transparent border-t-sky-600 border-r-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased flex flex-col justify-between">
      <div>
        {/* Responsive Header Navigation */}
        <Header
          currentView={currentView}
          setView={setView}
          isAdminLoggedIn={isAdminLoggedIn}
          onAdminLogout={handleAdminLogout}
          raffleTitle={raffle.title}
          onResetAll={handleResetSimulator}
          dbEngine={engine}
        />

        {/* Dynamic View Router switch */}
        <main className="pb-16">
          {currentView === 'buyer' ? (
            <BuyerView
              raffle={raffle}
              sellers={sellers}
              tickets={tickets}
              onSubmitPurchase={handlePurchaseSubmission}
              isLoading={isSubmitLoading}
            />
          ) : (
            <AdminView
              raffle={raffle}
              sellers={sellers}
              tickets={tickets}
              purchases={purchases}
              isLoggedIn={isAdminLoggedIn}
              onLogin={handleAdminLogin}
              onLogout={handleAdminLogout}
              onApprovePurchase={handleApprovePurchase}
              onRejectPurchase={handleRejectPurchase}
              onCreateSeller={handleCreateSeller}
              onAssignNumbersToSeller={handleAssignNumbersToSeller}
              onCreateNewRaffle={handleCreateNewRaffle}
              onDrawWinner={handleDrawWinner}
              onResetWinner={handleResetWinner}
              dbEngine={engine}
              onReloadDb={loadAppState}
            />
          )}
        </main>
      </div>

      {/* Footer Design */}
      <footer className="border-t border-slate-200/50 bg-white py-6 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-2">
          <p className="font-semibold text-slate-500">
            © 2026 Plataforma de Rifas Online Autogestionada.
          </p>
          <p className="flex items-center justify-center gap-1">
            Compatible con almacenamiento local persistente e interactividad en tiempo real.
          </p>
        </div>
      </footer>
    </div>
  );
}
