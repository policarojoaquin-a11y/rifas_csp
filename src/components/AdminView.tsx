import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  Check, 
  X, 
  Lock, 
  Trophy, 
  Settings, 
  Search, 
  UserPlus, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Phone,
  Mail,
  Tag,
  RefreshCw,
  Coins,
  DollarSign,
  Briefcase,
  HelpCircle,
  Hash,
  Download,
  Database,
  Copy
} from 'lucide-react';
import { Raffle, Seller, Ticket, PurchaseRequest, BankInfo } from '../types';

interface AdminViewProps {
  raffle: Raffle;
  sellers: Seller[];
  tickets: Ticket[];
  purchases: PurchaseRequest[];
  isLoggedIn: boolean;
  onLogin: (email: string, password: string, action?: 'login' | 'signup') => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onApprovePurchase: (id: string) => Promise<void>;
  onRejectPurchase: (id: string, reason: string) => Promise<void>;
  onCreateSeller: (name: string, phone: string, code: string, assignedNumbers: number[]) => Promise<void>;
  onAssignNumbersToSeller: (sellerId: string, numbers: number[]) => Promise<void>;
  onCreateNewRaffle: (title: string, description: string, price: number, totalTickets: number, bank: BankInfo) => Promise<void>;
  onDrawWinner: () => Promise<{ ticket: any| null, error?: string }>;
  onResetWinner: () => Promise<void>;
  dbEngine?: 'MOCK_LOCAL' | 'SUPABASE_CONNECTED' | 'SUPABASE_TABLES_MISSING';
  onReloadDb?: () => Promise<void>;
}

export default function AdminView({
  raffle,
  sellers,
  tickets,
  purchases,
  isLoggedIn,
  onLogin,
  onLogout,
  onApprovePurchase,
  onRejectPurchase,
  onCreateSeller,
  onAssignNumbersToSeller,
  onCreateNewRaffle,
  onDrawWinner,
  onResetWinner,
  dbEngine = 'MOCK_LOCAL',
  onReloadDb
}: AdminViewProps) {

  // Login State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab State
  const [activeTab, setActiveTab ] = useState<'purchases' | 'sellers' | 'draw' | 'settings'>('purchases');

  // Tab: Purchases States
  const [purchaseFilter, setPurchaseFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseActionMessage, setPurchaseActionMessage] = useState<string | null>(null);

  // Tab: Sellers States
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerPhone, setNewSellerPhone] = useState('');
  const [newSellerCode, setNewSellerCode] = useState('');
  const [newSellerNumbersRaw, setNewSellerNumbersRaw] = useState('');
  const [sellerFormError, setSellerFormError] = useState<string | null>(null);
  const [sellerFormSuccess, setSellerFormSuccess] = useState<string | null>(null);
  
  // Reassign state
  const [reassignSellerId, setReassignSellerId] = useState<string | null>(null);
  const [reassignNumbersRaw, setReassignNumbersRaw] = useState('');
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);

  // Tab: Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [winnerAnimNumber, setWinnerAnimNumber] = useState<number | null>(null);
  const [drawnWinnerTicket, setDrawnWinnerTicket] = useState<any | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);

  // Tab: Settings States
  const [newRaffleTitle, setNewRaffleTitle] = useState(raffle.title);
  const [newRaffleDesc, setNewRaffleDesc] = useState(raffle.description);
  const [newRafflePrice, setNewRafflePrice] = useState(raffle.ticketPrice);
  const [newRaffleTicketsCount, setNewRaffleTicketsCount] = useState(raffle.totalTickets);
  const [bankName, setBankName] = useState(raffle.bankInfo.bankName);
  const [bankHolder, setBankHolder] = useState(raffle.bankInfo.accountHolder);
  const [bankAlias, setBankAlias] = useState(raffle.bankInfo.alias);
  const [bankCbu, setBankCbu] = useState(raffle.bankInfo.cbu);
  const [bankAccountNumber, setBankAccountNumber] = useState(raffle.bankInfo.accountNumber || '');
  const [bankCuit, setBankCuit] = useState(raffle.bankInfo.cuit || '');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Sync settings inputs when raffle loads/changes
  useEffect(() => {
    setNewRaffleTitle(raffle.title);
    setNewRaffleDesc(raffle.description);
    setNewRafflePrice(raffle.ticketPrice);
    setNewRaffleTicketsCount(raffle.totalTickets);
    setBankName(raffle.bankInfo.bankName);
    setBankHolder(raffle.bankInfo.accountHolder);
    setBankAlias(raffle.bankInfo.alias);
    setBankCbu(raffle.bankInfo.cbu);
    setBankAccountNumber(raffle.bankInfo.accountNumber || '');
    setBankCuit(raffle.bankInfo.cuit || '');
  }, [raffle]);

  // Sync selectedPurchase when purchases list prop updates from parent / DB
  useEffect(() => {
    if (selectedPurchase) {
      const match = purchases.find(p => p.id === selectedPurchase.id);
      if (match) {
        setSelectedPurchase(match);
      } else {
        // If it was deleted (e.g. rejected), clear presentation
        setSelectedPurchase(null);
      }
    }
  }, [purchases]);

  // Handle Login
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setLoginError('Por favor ingrese un correo electrónico.');
      return;
    }
    if (!passwordInput.trim()) {
      setLoginError('Por favor ingrese una contraseña.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await onLogin(emailInput.trim(), passwordInput, authMode);
      if (result.success) {
        setLoginError(null);
        if (result.error) {
          // If sign up finished but needs email verification, set as informational message
          setLoginError(result.error);
        }
      } else {
        setLoginError(result.error || 'Error de credenciales. Intente de nuevo.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Error al iniciar sesión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Helper parser for comma-separated numbers and ranges (e.g. "1,2,3, 5-10, 15")
  const parseNumbersInput = (raw: string, maxTickets: number = raffle.totalTickets): number[] => {
    const nums: number[] = [];
    const parts = raw.split(',');
    
    parts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;
      
      if (trimmed.includes('-')) {
        const rangeParts = trimmed.split('-');
        if (rangeParts.length === 2) {
          const start = parseInt(rangeParts[0].trim(), 10);
          const end = parseInt(rangeParts[1].trim(), 10);
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= maxTickets) {
                nums.push(i);
              }
            }
          }
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= maxTickets) {
          nums.push(num);
        }
      }
    });

    return [...new Set(nums)].sort((a, b) => a - b);
  };

  // Create Seller handle
  const handleCreateSellerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSellerFormError(null);
    setSellerFormSuccess(null);

    if (!newSellerName.trim() || !newSellerPhone.trim() || !newSellerCode.trim()) {
      setSellerFormError('Todos los campos son obligatorios.');
      return;
    }

    const assigned = parseNumbersInput(newSellerNumbersRaw);

    try {
      await onCreateSeller(
        newSellerName.trim(),
        newSellerPhone.trim(),
        newSellerCode.trim().toUpperCase(),
        assigned
      );
      setSellerFormSuccess(`Vendedor "${newSellerName}" creado con éxito con ${assigned.length} números.`);
      // reset form
      setNewSellerName('');
      setNewSellerPhone('');
      setNewSellerCode('');
      setNewSellerNumbersRaw('');
    } catch (err: any) {
      setSellerFormError(err.message || 'Error al guardar vendedor.');
    }
  };

  // Assign numbers helper
  const handleAssignNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    setReassignError(null);
    setReassignSuccess(null);

    if (!reassignSellerId) return;
    if (!reassignNumbersRaw.trim()) {
      setReassignError('Por favor ingrese algún número o rango.');
      return;
    }

    const numbers = parseNumbersInput(reassignNumbersRaw);
    if (numbers.length === 0) {
      setReassignError(`Por favor ingrese números válidos en el rango de la rifa (1-${raffle.totalTickets}).`);
      return;
    }

    try {
      await onAssignNumbersToSeller(reassignSellerId, numbers);
      setReassignSuccess(`¡Se asignaron con éxito los números [${numbers.join(', ')}] al vendedor!`);
      setReassignNumbersRaw('');
      setTimeout(() => {
        setReassignSellerId(null);
        setReassignSuccess(null);
      }, 3000);
    } catch (err: any) {
      setReassignError(err.message || 'Error al reasignar números.');
    }
  };

  // Approve transaction
  const handleApprove = async (id: string) => {
    setIsProcessingPurchase(true);
    setPurchaseActionMessage(null);
    try {
      await onApprovePurchase(id);
      setPurchaseActionMessage('Transacción aprobada con éxito. Los números ahora están registrados como vendidos (SOLD).');
      // Refresh detail panel if open
      const updated = purchases.find(p => p.id === id);
      if (updated) setSelectedPurchase({ ...updated, status: 'APPROVED' });
    } catch (err: any) {
      setPurchaseActionMessage(`Error al aprobar: ${err.message}`);
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  // Reject transaction
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    if (!rejectionReason.trim()) {
      alert('Debe especificar un motivo de rechazo.');
      return;
    }

    setIsProcessingPurchase(true);
    setPurchaseActionMessage(null);
    try {
      await onRejectPurchase(selectedPurchase.id, rejectionReason.trim());
      setPurchaseActionMessage('Transacción rechazada con éxito. El comprador será notificado y los números vuelven a estar disponibles (AVAILABLE).');
      setShowRejectForm(false);
      setRejectionReason('');
      
      // Update local detailed views
      const updated = purchases.find(p => p.id === selectedPurchase.id);
      if (updated) setSelectedPurchase({ ...updated, status: 'REJECTED' });
    } catch (err: any) {
      setPurchaseActionMessage(`Error al rechazar: ${err.message}`);
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  // Start suspense digital raffle draw
  const handleStartDraw = async () => {
    setDrawError(null);
    setDrawnWinnerTicket(null);
    setIsDrawing(true);

    const sold = tickets.filter(t => t.status === 'SOLD');
    if (sold.length === 0) {
      setDrawError('No hay boletos marcados como VENDIDOS de forma definitiva. Debe aprobar pagos antes de realizar un sorteo.');
      setIsDrawing(false);
      return;
    }

    // Interval animation for spinning ticket suspense
    let timerCounter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * sold.length);
      setWinnerAnimNumber(sold[randomIdx].number);
      timerCounter += 100;
    }, 100);

    // Stop and retrieve actual winner from the backend/DB mock
    setTimeout(async () => {
      clearInterval(interval);
      try {
        const { ticket, error } = await onDrawWinner();
        if (error) {
          setDrawError(error);
          setWinnerAnimNumber(null);
        } else if (ticket) {
          setWinnerAnimNumber(ticket.number);
          setDrawnWinnerTicket(ticket);
        }
      } catch (err: any) {
        setDrawError('Ocurrió un error ejecutando el algoritmo del sorteo.');
      } finally {
        setIsDrawing(false);
      }
    }, 2800); // 2.8 seconds animation duration for rich tension!
  };

  // Handle Create New Raffle
  const handleCreateNewRaffleForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    if (!newRaffleTitle.trim() || !newRaffleDesc.trim() || newRafflePrice <= 0 || newRaffleTicketsCount <= 0) {
       setSettingsError('Todos los campos son obligatorios y deben contener valores válidos.');
       return;
    }

    if (!bankName.trim() || !bankHolder.trim() || !bankAlias.trim() || !bankCbu.trim()) {
       setSettingsError('Debe ingresar completos los datos bancarios del recaudador.');
       return;
    }

    try {
      await onCreateNewRaffle(
        newRaffleTitle.trim(),
        newRaffleDesc.trim(),
        Number(newRafflePrice),
        Number(newRaffleTicketsCount),
        {
          bankName: bankName.trim(),
          accountHolder: bankHolder.trim(),
          alias: bankAlias.trim(),
          cbu: bankCbu.trim(),
          accountNumber: bankAccountNumber.trim() || undefined,
          cuit: bankCuit.trim() || undefined,
        }
      );
      setSettingsSuccess('¡Nueva rifa inicializada correctamente! Se reiniciaron números y ventas.');
    } catch (err: any) {
      setSettingsError(err.message || 'Error al inicializar rifa.');
    }
  };

  // Calculate dynamic sales reports for specific sellers
  const getSellerStats = (sellerId: string) => {
    const sellerPurchases = purchases.filter(p => p.sellerId === sellerId);
    const approved = sellerPurchases.filter(p => p.status === 'APPROVED');
    const pending = sellerPurchases.filter(p => p.status === 'PENDING_REVIEW');
    
    const moneyApproved = approved.reduce((sum, p) => sum + p.totalAmount, 0);
    const moneyPending = pending.reduce((sum, p) => sum + p.totalAmount, 0);
    
    const assignedCount = tickets.filter(t => t.sellerId === sellerId).length;
    const soldCount = tickets.filter(t => t.sellerId === sellerId && t.status === 'SOLD').length;
    const pendingCount = tickets.filter(t => t.sellerId === sellerId && t.status === 'PENDING_REVIEW').length;

    return {
      totalPurchases: sellerPurchases.length,
      approvedCount: approved.length,
      pendingCountReview: pending.length,
      ticketAssignments: assignedCount,
      soldTicketsCount: soldCount,
      pendingTicketsCount: pendingCount,
      revenueCollected: moneyApproved,
      revenueEstimated: moneyApproved + moneyPending
    };
  };

  // Filtered Purchases list
  const filteredPurchases = purchases.filter(p => {
    if (purchaseFilter === 'PENDING') return p.status === 'PENDING_REVIEW';
    if (purchaseFilter === 'APPROVED') return p.status === 'APPROVED';
    if (purchaseFilter === 'REJECTED') return p.status === 'REJECTED';
    return true; // All
  });

  // Calculate Global Overall Stats
  const globalSoldTickets = tickets.filter(t => t.status === 'SOLD').length;
  const globalPendingTickets = tickets.filter(t => t.status === 'PENDING_REVIEW').length;
  const globalSalesRevenue = purchases
    .filter(p => p.status === 'APPROVED')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  // Render Login state first if not logged in
  if (!isLoggedIn) {
    const isSupabase = dbEngine === 'SUPABASE_CONNECTED';

    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white mb-4">
            <Lock className="h-6 w-6" />
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-800">Acceso Administrativo</h2>
          <p className="text-xs text-slate-500 mt-1">
            Inicie sesión para aprobar transferencias, sortear premios y crear vendedores.
          </p>

          <form onSubmit={handleFormLogin} className="mt-5 space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Correo Electrónico (Email)
              </label>
              <input
                type="text"
                placeholder="ejemplo@correo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/10"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
              <input
                type="password"
                placeholder="Ingresa la contraseña"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-sm outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            {loginError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {loginError}
              </p>
            )}

            <button
              id="admin-login-submit"
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-slate-950 py-3 font-semibold text-sm text-white hover:bg-slate-900 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Verificar Credenciales'
              )}
            </button>
          </form>

          {/* Helper credentials box */}
          {!isSupabase && (
            <div className="mt-6 rounded-2xl bg-sky-50 border border-sky-100 p-4 text-left">
              <span className="text-[10px] font-bold text-sky-700 uppercase block">Modo Demo Local activo</span>
              <p className="text-xs text-sky-900 mt-1">
                Usa el usuario demo predeterminado sin necesidad de conexión:
              </p>
              <div className="mt-2 text-xs font-mono text-sky-800 space-y-1">
                <div><strong>Usuario:</strong> <span className="underline">admin</span></div>
                <div><strong>Contraseña:</strong> <span className="underline">admin</span></div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Dynamic Summary Cards Row */}
      <section className="grid grid-cols-1 gap-5 mb-8 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block uppercase">Recaudado (Aprobado)</span>
            <strong className="text-xl font-black text-slate-800">${globalSalesRevenue.toLocaleString('es-AR')}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block uppercase">Números Vendidos</span>
            <strong className="text-xl font-black text-slate-800">{globalSoldTickets} de {raffle.totalTickets}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block uppercase">Solicitudes en Espera</span>
            <strong className="text-xl font-black text-slate-800">
              {purchases.filter(p => p.status === 'PENDING_REVIEW').length}
            </strong>
          </div>
        </div>
      </section>

      {/* Admin Tab Buttons */}
      <nav className="flex border-b border-slate-200 mb-8 space-x-4 bg-white p-1 rounded-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => { 
            setActiveTab('purchases'); 
            setPurchaseFilter('PENDING'); 
            setSelectedPurchase(null); 
            setPurchaseActionMessage(null); 
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-xl shrink-0 cursor-pointer ${
            activeTab === 'purchases' && purchaseFilter === 'PENDING' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Ventas Pendientes ({purchases.filter(p => p.status === 'PENDING_REVIEW').length})
        </button>
        <button
          onClick={() => { 
            setActiveTab('purchases'); 
            setPurchaseFilter('APPROVED'); 
            setSelectedPurchase(null); 
            setPurchaseActionMessage(null); 
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-xl shrink-0 cursor-pointer ${
            activeTab === 'purchases' && purchaseFilter === 'APPROVED' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Ventas Aprobadas ({purchases.filter(p => p.status === 'APPROVED').length})
        </button>
        <button
          onClick={() => { setActiveTab('sellers'); setSellerFormError(null); setSellerFormSuccess(null); }}
          className={`px-4 py-2 text-sm font-semibold rounded-xl shrink-0 cursor-pointer ${
            activeTab === 'sellers' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Vendedores e Informes
        </button>
         <button
          onClick={() => { setActiveTab('draw'); setDrawError(null); }}
          className={`px-4 py-2 text-sm font-semibold rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'draw' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Sortear Ganador
        </button>
        <button
          onClick={() => { setActiveTab('settings'); setSettingsError(null); setSettingsSuccess(null); }}
          className={`px-4 py-2 text-sm font-semibold rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'settings' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings className="h-4 w-4" />
          Nueva Rifa
        </button>
      </nav>

      {/* TAB CONTENT: PURCHASES */}
      {activeTab === 'purchases' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Purchase request sidebar items (Col 1-5) */}
          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs shadow-slate-100">
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <h3 className="text-md font-bold text-slate-900">Solicitudes de Transferencia</h3>
              <select
                value={purchaseFilter}
                onChange={(e) => setPurchaseFilter(e.target.value as any)}
                className="text-xs rounded-lg border border-slate-200 py-1 px-2 font-semibold text-slate-700 outline-none focus:border-slate-400 bg-slate-50"
              >
                <option value="PENDING">Pendientes</option>
                <option value="APPROVED">Aprobados</option>
                <option value="REJECTED">Rechazados</option>
                <option value="ALL">Ver todos</option>
              </select>
            </div>

            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm font-medium">No se encontraron solicitudes con este filtro.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredPurchases.map((pur) => {
                  const seller = sellers.find(s => s.id === pur.sellerId);
                  const isSelected = selectedPurchase?.id === pur.id;
                  
                  let badge = 'bg-amber-100 text-amber-700';
                  if (pur.status === 'APPROVED') badge = 'bg-emerald-100 text-emerald-800';
                  if (pur.status === 'REJECTED') badge = 'bg-rose-100 text-rose-800';

                  return (
                    <button
                      key={pur.id}
                      type="button"
                      onClick={() => { setSelectedPurchase(pur); setShowRejectForm(false); setPurchaseActionMessage(null); }}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all flex justify-between items-start cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900/10' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-slate-800 block truncate max-w-[150px]">{pur.buyerName}</strong>
                          <span className={`rounded-xl px-2 py-0.5 text-[9px] font-extrabold ${badge}`}>
                            {pur.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-400">
                          {new Date(pur.submittedAt).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pur.ticketNumbers.map(n => (
                            <span key={n} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">Vendedor: {seller?.name || 'Desconocido'}</span>
                        <strong className="text-[14px] font-black text-slate-800">${pur.totalAmount}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Details viewer (Col 6-12) */}
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs shadow-slate-100 h-full">
            {!selectedPurchase ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                <Search className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Seleccioná una solicitud de transferencia de la izquierda para ver el comprobante y procesarla.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Visual state messages */}
                {purchaseActionMessage && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs font-semibold text-blue-700 flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{purchaseActionMessage}</span>
                  </div>
                )}

                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{selectedPurchase.buyerName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Identificador de Compra: {selectedPurchase.id}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`rounded-xl px-3 py-1 text-xs font-bold ${
                        selectedPurchase.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' :
                        selectedPurchase.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {selectedPurchase.status === 'PENDING_REVIEW' ? 'Pendiente de Control Administrador' :
                         selectedPurchase.status === 'APPROVED' ? 'Venta Aprobada (Números Vendidos)' :
                         'Rechazada y Desestimada'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Importe Solicitado</span>
                    <strong className="text-2xl font-black text-sky-700">${selectedPurchase.totalAmount.toLocaleString('es-AR')}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm text-slate-700">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{selectedPurchase.buyerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{selectedPurchase.buyerEmail}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Fecha Solicitada</span>
                      <strong className="text-slate-800">{new Date(selectedPurchase.submittedAt).toLocaleString('es-AR')}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Vendedor Encargado</span>
                      <strong className="text-slate-800">
                        {sellers.find(s => s.id === selectedPurchase.sellerId)?.name || 'Vendedor Desconocido'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Ticket numbers requested */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className="text-xs text-slate-400 font-bold block uppercase mb-1.5">Números Reservados:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedPurchase.ticketNumbers.map(n => (
                      <span key={n} className="rounded-lg bg-sky-600 px-3.5 py-1 text-xs font-black text-white shadow-xs">
                        Número {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Voucher Proof Container */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comprobante de Transferencia Bancaria</span>
                    <a
                      href={selectedPurchase.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold"
                    >
                      Ampliar Imagen <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex justify-center items-center p-3 max-h-80">
                    <img 
                      src={selectedPurchase.receiptUrl || undefined} 
                      alt="Prueba de pago legal" 
                      className="max-h-72 max-w-full object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Action Controls for Pending status */}
                {selectedPurchase.status === 'PENDING_REVIEW' ? (
                  <div className="border-t border-slate-100 pt-5 space-y-4">
                    {!showRejectForm ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleApprove(selectedPurchase.id)}
                          disabled={isProcessingPurchase}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200/50 transition-all cursor-pointer"
                        >
                          <Check className="h-4.5 w-4.5" />
                          Aprobar Compra
                        </button>
                        <button
                          onClick={() => setShowRejectForm(true)}
                          disabled={isProcessingPurchase}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition-all cursor-pointer"
                        >
                          <X className="h-4.5 w-4.5 text-rose-600" />
                          Rechazar Compra
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRejectSubmit} className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-rose-800 uppercase">Motivo del Rechazo de Transferencia</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Indique la razón para anular la reserva. El número de rifa volverá al estado Disponible y el comprobante será catalogado como inválido.
                        </p>
                        <textarea
                          rows={2}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Ej. Comprobante de otra fecha, fondos devueltos, alias incorrecto..."
                          className="w-full text-xs rounded-lg border border-slate-200 p-2.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 bg-white"
                          required
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setShowRejectForm(false)}
                            className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-200 transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isProcessingPurchase}
                            className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 font-bold text-white shadow-xs"
                          >
                            Confirmar Rechazo
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500 bg-slate-50 rounded-xl p-3">
                    {selectedPurchase.notes || "Transacción completada administrativamente."}
                  </div>
                )}

              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB CONTENT: SELLERS */}
      {activeTab === 'sellers' && (
        <div className="space-y-8">
          
          {/* Bento grids showing quick forms & assign features */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Create Seller Form (Col 1-5) */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="flex items-center gap-1.5 text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                <UserPlus className="h-4.5 w-4.5 text-slate-700" />
                Registrar Nuevo Vendedor
              </h3>

              <form onSubmit={handleCreateSellerForm} className="space-y-4 text-sm">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Marcos Juárez"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Celular de Contacto</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. +54 9 351 223 3456"
                    value={newSellerPhone}
                    onChange={(e) => setNewSellerPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código Vendedor</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. MARCOS"
                      value={newSellerCode}
                      onChange={(e) => setNewSellerCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Asignar Números</label>
                    <input
                      type="text"
                      placeholder="Ej. 1-10, 15, 23"
                      value={newSellerNumbersRaw}
                      onChange={(e) => setNewSellerNumbersRaw(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-slate-800"
                      title="Soporta rangos (ej. 1-20) y específicos, separados por coma"
                    />
                  </div>
                </div>

                {sellerFormError && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 flex items-center gap-1 text-left">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {sellerFormError}
                  </p>
                )}

                {sellerFormSuccess && (
                  <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-1 text-left">
                    <Check className="h-4 w-4 shrink-0" />
                    {sellerFormSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 font-bold text-xs text-white shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Vendedor
                </button>
              </form>
            </section>

            {/* Quick direct number reassign section (Col 6-12) */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="flex items-center gap-1.5 text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                  <Settings className="h-4.5 w-4.5 text-slate-700" />
                  Consola de Reasignación de Números (Lote)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Permite asignar un lote rápido de números o rangos de números a un vendedor particular. Esto desvinculará automáticamente esos números de cualquier otro vendedor anterior.
                </p>

                <form onSubmit={handleAssignNumbers} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Vendedor</label>
                    <select
                      value={reassignSellerId || ''}
                      onChange={(e) => setReassignSellerId(e.target.value || null)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none bg-white font-semibold text-slate-700 focus:border-slate-800"
                    >
                      <option value="">-- Elige un vendedor titular --</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloque de Números / Rangos</label>
                    <input
                      type="text"
                      placeholder="Ej. 10-25 o bien 44,45,46,55-60"
                      value={reassignNumbersRaw}
                      onChange={(e) => setReassignNumbersRaw(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs font-mono outline-none focus:border-slate-800"
                    />
                  </div>

                  {reassignError && (
                    <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                      {reassignError}
                    </p>
                  )}

                  {reassignSuccess && (
                    <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                      {reassignSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!reassignSellerId}
                    className={`w-full rounded-xl py-2.5 font-bold text-xs text-white transition-colors cursor-pointer ${
                      reassignSellerId ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Confirmar Transferencia de Dominio de Números
                  </button>
                </form>
              </div>
            </section>
          </div>

          {/* Complete Sellers Metrics Grid Table */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Informe de Vendedores e Historial de Ventas
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-semibold uppercase">
                    <th className="py-3 px-4">Vendedor</th>
                    <th className="py-3 px-4">Celular</th>
                    <th className="py-3 px-4">Números Asignados</th>
                    <th className="py-3 px-4 text-center">Boletos Vendidos</th>
                    <th className="py-3 px-4 text-center">Boletos Pendientes</th>
                    <th className="py-3 px-4 text-right">Recaudación Confirmada</th>
                    <th className="py-3 px-4 text-right">Est. Estimada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellers.map((s) => {
                    const stats = getSellerStats(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4">
                          <strong className="text-slate-800 font-semibold block">{s.name}</strong>
                          <span className="font-mono bg-slate-100 rounded px-1 text-[10px] font-bold text-slate-500 mt-0.5 inline-block">{s.code}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{s.phone}</td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                            {s.assignedNumbers.length === 0 ? (
                              <span className="text-slate-400 font-light">Ninguno asignado</span>
                            ) : (
                              s.assignedNumbers.map(n => (
                                <span key={n} className="rounded bg-slate-100 px-1 font-mono text-[9px] text-slate-600">
                                  {n}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {stats.soldTicketsCount} / {stats.ticketAssignments}
                        </td>
                        <td className="py-3.5 px-4 text-center text-amber-600 font-semibold">
                          {stats.pendingTicketsCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          ${stats.revenueCollected.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-800">
                          ${stats.revenueEstimated.toLocaleString('es-AR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT: SWEEPSTAKE DRAW */}
      {activeTab === 'draw' && (
        <div className="mx-auto max-w-xl text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white mb-4">
            <Trophy className="h-6 w-6" />
          </div>

          <h3 className="text-2xl font-black text-slate-900">Sorteador Electrónico Digital</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            Elija un ganador aleatorio de forma auditada entre los números cargados como <strong className="text-slate-700">SOLD (VENDIDOS)</strong>.
          </p>

          <div className="my-8 rounded-2xl bg-slate-950 p-8 border-4 border-double border-slate-800 relative overflow-hidden">
            
            {/* Draw errors */}
            {drawError && (
              <div className="absolute top-2 inset-x-2 text-[10px] font-bold text-rose-300 bg-rose-950/90 border border-rose-900 rounded-xl p-2.5 text-center leading-relaxed">
                {drawError}
              </div>
            )}

            {/* Suspense spinning number visuals */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">NUMERO GANADOR</span>
              <div className="h-28 flex items-center justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={winnerAnimNumber ?? 'empty'}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="text-7xl font-sans font-black text-white leading-none tracking-tight block"
                  >
                    {winnerAnimNumber !== null ? String(winnerAnimNumber).padStart(3, '0') : '---'}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="text-xs text-amber-400 mt-2 font-mono h-4">
                {isDrawing ? '✦ Analizando base de datos...' : drawnWinnerTicket ? '¡CORRECTO!' : 'Sistema listo.'}
              </p>
            </div>
          </div>

          {/* Trigger action buttons */}
          <div className="space-y-4">
            {raffle.winnerNumber === null ? (
              <button
                onClick={handleStartDraw}
                disabled={isDrawing}
                className={`w-full rounded-2xl py-4 font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                  isDrawing ? 'bg-slate-800 shadow-none' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-300'
                }`}
              >
                {isDrawing ? 'Sorteando, un momento...' : 'Iniciar Sorteo de Ganador'}
              </button>
            ) : (
              <div className="space-y-4">
                {/* Details Winner Box */}
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-5 text-left transition-all">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">Premio Adjudicado</span>
                  <p className="text-xl font-bold text-slate-900 mt-2">Boleto Número: {raffle.winnerNumber}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">Beneficiario: {raffle.winnerName}</p>
                  <p className="text-xs text-slate-500">Vendedor coordinador: {raffle.winnerSellerName}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleStartDraw}
                    title="Realizar otro sorteo"
                    className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-xs font-bold text-white transition cursor-pointer"
                  >
                    Resortear de Nuevo
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('¿Reiniciar estado del ganador?')) {
                        await onResetWinner();
                        setWinnerAnimNumber(null);
                        setDrawnWinnerTicket(null);
                      }
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Anular Sorteo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: NEW RAFFLE SETTINGS */}
      {activeTab === 'settings' && (
        <section className="mx-auto max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Parámetros y Nueva Configuración de Rifa
          </h3>

          <p className="text-xs text-rose-800 font-semibold flex items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-xl p-3 mb-6">
            <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
            Atención: Crear una nueva rifa limpiará todos los registros de reservas, transacciones previas y números vendidos. Esta acción es irreversible.
          </p>

          <form onSubmit={handleCreateNewRaffleForm} className="space-y-6 text-sm">
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título de la Rifa</label>
                <input
                  type="text"
                  required
                  value={newRaffleTitle}
                  onChange={(e) => setNewRaffleTitle(e.target.value)}
                  placeholder="Ej. Sorteo Extraordinario Invierno"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción / Bases del Sorteo</label>
                <textarea
                  required
                  rows={3}
                  value={newRaffleDesc}
                  onChange={(e) => setNewRaffleDesc(e.target.value)}
                  placeholder="Contanos qué se sortea..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Precio Unitario por Boleto ($)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newRafflePrice}
                  onChange={(e) => setNewRafflePrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cantiad de Números en el Pool (Máximo)</label>
                <input
                  type="number"
                  required
                  min={10}
                  max={1000}
                  value={newRaffleTicketsCount}
                  onChange={(e) => setNewRaffleTicketsCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Bank details nested */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-4 bg-slate-50/50">
              <h4 className="text-xs font-black text-slate-800 uppercase block">Cuentas Receptoras de Transferencias</h4>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Banco</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titular Cuenta</label>
                  <input
                    type="text"
                    required
                    value={bankHolder}
                    onChange={(e) => setBankHolder(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alias Bancario</label>
                  <input
                    type="text"
                    required
                    value={bankAlias}
                    onChange={(e) => setBankAlias(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CBU / CVU Cuentas</label>
                  <input
                    type="text"
                    required
                    value={bankCbu}
                    onChange={(e) => setBankCbu(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de Cuenta (Opcional)</label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Documento / CUIT (Opcional)</label>
                  <input
                    type="text"
                    value={bankCuit}
                    onChange={(e) => setBankCuit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-slate-800 bg-white"
                  />
                </div>
              </div>
            </div>

            {settingsError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-left">
                {settingsError}
              </p>
            )}

            {settingsSuccess && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-left">
                {settingsSuccess}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 py-3 font-semibold text-xs text-white shadow-xs transition-colors cursor-pointer"
            >
              Inicializar y Crear Rifa en Blanco
            </button>
          </form>
        </section>
      )}

      {/* TAB CONTENT: SUPABASE CONNECTIVITY CONTROL */}
      {false && (
        <section className="mx-auto max-w-4xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Database className="h-5 w-5 text-sky-600" />
                Configuración y Conexión de Supabase
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Conectá tu base de datos relacional de producción para sincronizar boletos, vendedores y transacciones en tiempo real.
              </p>
            </div>
            {onReloadDb && (
              <button
                onClick={async () => {
                  const btn = document.getElementById('reload-db-btn');
                  if (btn) btn.classList.add('animate-spin');
                  await onReloadDb();
                  setTimeout(() => {
                    if (btn) btn.classList.remove('animate-spin');
                  }, 800);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
              >
                <RefreshCw id="reload-db-btn" className="h-3.5 w-3.5" />
                Probar Conectividad
              </button>
            )}
          </div>

          {/* Connected Engine Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className={`md:col-span-2 rounded-2xl border p-5 ${
              dbEngine === 'SUPABASE_CONNECTED' 
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                : dbEngine === 'SUPABASE_TABLES_MISSING' 
                ? 'bg-amber-50/50 border-amber-200 text-amber-900' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex gap-3">
                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${
                  dbEngine === 'SUPABASE_CONNECTED' 
                    ? 'bg-emerald-100/80 text-emerald-600' 
                    : dbEngine === 'SUPABASE_TABLES_MISSING' 
                    ? 'bg-amber-100/80 text-amber-600' 
                    : 'bg-slate-200/80 text-slate-500'
                }`}>
                  <Database className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold uppercase tracking-wide">
                    {dbEngine === 'SUPABASE_CONNECTED' 
                      ? 'Base de Datos Activa: SUPABASE HABILITADO 🚀' 
                      : dbEngine === 'SUPABASE_TABLES_MISSING' 
                      ? 'Base de Datos Activa: SUPABASE CONECTADO' 
                      : 'Base de Datos Activa: SIMULADOR LOCAL ⚡'}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90">
                    {dbEngine === 'SUPABASE_CONNECTED' 
                      ? 'Tu plataforma está utilizando una base de datos relacional PostgreSQL en vivo. Los datos son persistentes, estables y compartidos entre todos tus usuarios de forma segura.' 
                      : dbEngine === 'SUPABASE_TABLES_MISSING' 
                      ? '¡Se detectaron las variables de entorno URL y Anon Key! Pero al consultar la base de datos, las tablas necesarias (raffles, tickets, vendedores, purchases) no existen todavía. Ejecuta el script SQL de abajo para crearlas.' 
                      : 'No se encontraron las variables de entorno de Supabase en tu configuración de Secrets. El sistema está funcionando en modo local (LocalStorage del navegador), ideal para demostración.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 bg-white space-y-3 shadow-3xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Estado de Credenciales</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">VITE_SUPABASE_URL</span>
                  {import.meta.env.VITE_SUPABASE_URL ? (
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">Configurado</span>
                  ) : (
                    <span className="font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-sm">Falta</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">VITE_SUPABASE_ANON_KEY</span>
                  {import.meta.env.VITE_SUPABASE_ANON_KEY ? (
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">Configurado</span>
                  ) : (
                    <span className="font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-sm">Falta</span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
                Configura estas variables en el panel de <strong>Secrets / Configuración</strong> del editor en la zona superior de AI Studio.
              </p>
            </div>
          </div>

          {/* Setup steps guide */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase block tracking-wider">Guía de Configuración Paso a Paso</h4>
            
            <div className="relative border-l border-slate-100 pl-6 space-y-6">
              
              <div className="relative">
                <span className="absolute -left-9 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  1
                </span>
                <h5 className="text-xs font-extrabold text-slate-700 uppercase">Crea un proyecto gratis</h5>
                <p className="text-xs text-slate-500 mt-1">
                  Ingresa a <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-semibold inline-flex items-center gap-0.5">https://supabase.com <ExternalLink className="h-3 w-3" /></a> y crea un nuevo proyecto de forma gratuita. Elige una región cercana.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-9 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  2
                </span>
                <h5 className="text-xs font-extrabold text-slate-700 uppercase">Configura los Secrets ("Secrets / Environment Variables")</h5>
                <p className="text-xs text-slate-500 mt-1">
                  Ve a <strong>Settings (Configuración del Sorteo / Applet)</strong> de tu AI Studio, abre el menú de variables de entorno y agrega estas dos claves obtenidas en "Project Settings" &rarr; "API" de Supabase:
                </p>
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[10px] text-slate-600 space-y-1 select-all">
                  <p>VITE_SUPABASE_URL = "https://tu-identificador.supabase.co"</p>
                  <p>VITE_SUPABASE_ANON_KEY = "tu-anon-key-de-supabase-aqui..."</p>
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-9 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  3
                </span>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h5 className="text-xs font-extrabold text-slate-700 uppercase">Crea el Schema Base de Datos (Copiar Script SQL)</h5>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ESP_SUPABASE_SQL);
                      const notif = document.getElementById('sql-copy-notif');
                      if (notif) {
                        notif.className = 'inline-flex items-center text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md';
                        setTimeout(() => {
                          notif.className = 'hidden';
                        }, 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-100 text-[11px] font-bold text-sky-700 cursor-pointer transition-all shadow-3xs"
                  >
                    <Copy className="h-3 w-3" />
                    Copiar Script Completo SQL
                  </button>
                  <span id="sql-copy-notif" className="hidden">¡Copiado con éxito!</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Abre la sección de <strong>"SQL Editor"</strong> en el panel izquierdo de tu Supabase dashboard, haz clic en <strong>"New query"</strong>, pega el código que has copiado arriba, y haz clic en el botón verde <strong>"Run"</strong> para inicializar las tablas con datos sanos automáticamente.
                </p>

                {/* SQL Code Sandbox display box */}
                <div className="mt-3 rounded-2xl bg-slate-950 text-slate-300 font-mono text-[10px] p-4 max-h-60 overflow-y-auto border border-slate-800 leading-normal select-all">
                  <pre className="whitespace-pre">{ESP_SUPABASE_SQL}</pre>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

    </div>
  );
}

// Full PostgreSQL SQL Setup Script inside our client component
const ESP_SUPABASE_SQL = `-- SCRIPT DE CREACIÓN DE TABLAS CORRECTA PARA RIFAS ONLINE --

-- 1. Eliminar tablas antiguas si existen (para evitar conflictos de esquema)
DROP TABLE IF EXISTS public.rifas_vendidas CASCADE;
DROP TABLE IF EXISTS public.rifas CASCADE;
DROP TABLE IF EXISTS public.vendedores CASCADE;

-- 2. Tabla de Vendedores (vendedores)
CREATE TABLE IF NOT EXISTS public.vendedores (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Tabla de Rifas (rifas)
CREATE TABLE IF NOT EXISTS public.rifas (
    id SERIAL PRIMARY KEY,
    numero TEXT UNIQUE NOT NULL,
    vendedor_id INTEGER REFERENCES public.vendedores(id) ON DELETE SET NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Tabla de Ventas / Compras de Rifas (rifas_vendidas)
CREATE TABLE IF NOT EXISTS public.rifas_vendidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rifa_id INTEGER REFERENCES public.rifas(id) ON DELETE CASCADE,
    vendedor_id INTEGER REFERENCES public.vendedores(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    numero TEXT NOT NULL,
    email TEXT NOT NULL,
    fecha_venta TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    state TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Insertar vendedores predeterminados
INSERT INTO public.vendedores (id, nombre, telefono)
VALUES 
(1, 'Mateo Natero', '+54 11 9988-7766'),
(2, 'Tommy Kinan', '+54 11 2233-4455'),
(3, 'Simon Wolf', '+54 11 5544-3322')
ON CONFLICT (id) DO NOTHING;

-- Ajustar secuencia para ids autoincrementales después de inserción manual
SELECT setval(pg_get_serial_sequence('public.vendedores', 'id'), coalesce(max(id), 1)) FROM public.vendedores;

-- 6. Insertar 100 números de rifas iniciales y asignarle vendedor correspondiente
DO $$
DECLARE
    i INTEGER;
    padded TEXT;
    v_seller_id INTEGER;
BEGIN
    FOR i IN 1..100 LOOP
        padded := LPAD(i::text, 4, '0');
        
        -- Asignar los primeros 10 a Mateo (id: 1), 11-20 a Tommy (id: 2), 21-30 a Simon (id: 3)
        IF i <= 10 THEN
            v_seller_id := 1;
        ELSIF i <= 20 THEN
            v_seller_id := 2;
        ELSIF i <= 30 THEN
            v_seller_id := 3;
        ELSE
            v_seller_id := NULL;
        END IF;

        INSERT INTO public.rifas (numero, vendedor_id, is_available)
        VALUES (padded, v_seller_id, TRUE)
        ON CONFLICT (numero) DO NOTHING;
    END LOOP;
END $$;

-- 7. Insertar compras iniciales de prueba (pendiente, aprobadas, etc.)
INSERT INTO public.rifas_vendidas (rifa_id, vendedor_id, nombre, numero, email, fecha_venta, state)
VALUES
-- El número 7 comprado por Mateo Natero (aprobado), asignado a id 1 (Mateo)
((SELECT id FROM public.rifas WHERE numero = '0007' LIMIT 1), 1, 'Mateo Natero', '+54 11 9988-7766', 'mateo.natero@gmail.com', NOW() - INTERVAL '2 days', 'APPROVED'),
-- El número 14 comprado por Tommy Kinan (aprobado), asignado a id 2 (Tommy)
((SELECT id FROM public.rifas WHERE numero = '0014' LIMIT 1), 2, 'Tommy Kinan', '+54 11 2233-4455', 'tommykinan2002@gmail.com', NOW() - INTERVAL '1 day', 'APPROVED'),
-- El número 21 comprado por Simon Wolf (pendiente), asignado a id 3 (Simon)
((SELECT id FROM public.rifas WHERE numero = '0021' LIMIT 1), 3, 'Simon Wolf', '+54 11 5544-3322', 'simon.wolf@gmail.com', NOW() - INTERVAL '15 minutes', 'PENDING_REVIEW');

-- 8. DESACTIVAR LA SEGURIDAD DE FILA (RLS) para permitir el modo administrador e interactividad en vivo de demostración
ALTER TABLE public.vendedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rifas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rifas_vendidas DISABLE ROW LEVEL SECURITY;
`;

