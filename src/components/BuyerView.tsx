import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// High-fidelity custom Zod resolver for react-hook-form
const zodResolver = <T extends z.ZodType<any, any>>(schema: T) => async (values: any) => {
  const result = schema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  
  const errors: Record<string, any> = {};
  result.error.issues.forEach(issue => {
    const path = issue.path.join('.');
    errors[path] = {
      type: issue.code,
      message: issue.message,
    };
  });
  
  return { values: {}, errors };
};
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  UploadCloud, 
  Calendar, 
  DollarSign, 
  Users, 
  ShieldAlert, 
  Tag, 
  CheckCircle2, 
  Clock, 
  X,
  FileImage,
  Info,
  Search,
  ChevronLeft,
  ChevronRight,
  Gift
} from 'lucide-react';
import { Raffle, Seller, Ticket, TicketStatus } from '../types';

const RAFFLE_PRIZES = [
  'Heladera BGH con Dispenser',
  'Smart TV 50" Enova',
  'Microondas Samsung 23" Silver',
  'Barra de Sonido Samsung',
  'Minipimer Midea',
  'Licuadora KitchenAid',
  'Tostadora KitchenAid',
  'Procesadora KitchenAid',
  'Parlante XBoom LG',
  'Termo K2 1 Litro'
];

// Zod Validation Schema
const purchaseSchema = z.object({
  buyerName: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  buyerPhone: z.string().min(8, 'El número de teléfono debe tener al menos 8 dígitos'),
  buyerEmail: z.string().email('Debe ingresar un correo electrónico válido'),
  receiptUrl: z.string().min(10, 'El comprobante de pago es obligatorio y debe cargarse'),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface BuyerViewProps {
  raffle: Raffle;
  sellers: Seller[];
  tickets: Ticket[];
  onSubmitPurchase: (purchaseData: {
    raffleId: string;
    sellerId: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    ticketNumbers: number[];
    receiptUrl: string;
    totalPrice: number;
  }) => Promise<void>;
  isLoading: boolean;
}

export default function BuyerView({
  raffle,
  sellers,
  tickets,
  onSubmitPurchase,
  isLoading
}: BuyerViewProps) {
  // Selection states
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    buyerName: string;
    ticketNumbers: number[];
    sellerName: string;
    totalAmount: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Search and Pagination states for sellers list
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Reset pagination page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredSellers = sellers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSellers = filteredSellers.slice(startIndex, startIndex + itemsPerPage);

  // Helper to extract clean 2-letter initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      buyerName: '',
      buyerEmail: '',
      buyerPhone: '',
      receiptUrl: '',
    }
  });

  const receiptUrlValue = watch('receiptUrl');

  // Handle seller selection change
  const handleSelectSeller = (seller: Seller) => {
    setSelectedSeller(seller);
    setSelectedNumbers([]); // reset selected numbers
    setFormError(null);
  };

  // Toggle ticket selection
  const handleToggleNumber = (num: number, status: TicketStatus) => {
    if (status !== 'AVAILABLE') return; // Cannot select pending or sold

    setSelectedNumbers(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      } else {
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  // Safe Copy Helper
  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } catch (err) {
        console.error('No se pudo copiar el texto', err);
      }
      document.body.removeChild(textArea);
    });
  };

  // Handle uploaded file converting to Base64 preview with canvas compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;

        // Compress the image using HTML5 Canvas to prevent local storage quota issues
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Downscale to max 800px width or height
          const MAX_DIM = 800;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Export as JPEG with 0.6 quality (highly legible but very small space footprint, usually 40-90KB)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            setReceiptPreview(compressedBase64);
            setValue('receiptUrl', compressedBase64, { shouldValidate: true });
            setFormError(null);
          } else {
            // Fallback
            setReceiptPreview(rawBase64);
            setValue('receiptUrl', rawBase64, { shouldValidate: true });
            setFormError(null);
          }
        };
        img.onerror = () => {
          // Fallback
          setReceiptPreview(rawBase64);
          setValue('receiptUrl', rawBase64, { shouldValidate: true });
          setFormError(null);
        };
        img.src = rawBase64;
      };
      reader.onerror = () => {
        setFormError('Hubo un error cargando el archivo del comprobante.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submission
  const onSubmit = async (data: PurchaseFormData) => {
    if (!selectedSeller) {
      setFormError('Debe seleccionar un vendedor antes de enviar.');
      return;
    }
    if (selectedNumbers.length === 0) {
      setFormError('Debe elegir al menos 1 número de rifa disponible.');
      return;
    }

    try {
      setFormError(null);
      const totalPrice = selectedNumbers.length * raffle.ticketPrice;
      
      await onSubmitPurchase({
        raffleId: raffle.id,
        sellerId: selectedSeller.id,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        buyerEmail: data.buyerEmail,
        ticketNumbers: selectedNumbers,
        receiptUrl: data.receiptUrl,
        totalPrice
      });

      // Show success modal info
      setSuccessData({
        buyerName: data.buyerName,
        ticketNumbers: selectedNumbers,
        sellerName: selectedSeller.name,
        totalAmount: totalPrice,
      });

      // Clear states
      setSelectedNumbers([]);
      setReceiptPreview(null);
      reset();
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar la solicitud.');
    }
  };

  // Calculate Total cost dynamically
  const computedTotal = selectedNumbers.length * raffle.ticketPrice;

  // Filter tickets that belong to the currently selected Seller and are in is_available = TRUE (mapped as AVAILABLE)
  const sellerTickets = selectedSeller 
    ? tickets.filter(t => t.sellerId === selectedSeller.id && t.status === 'AVAILABLE')
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Raffle Info Banner */}
      <section className="relative mb-10 overflow-hidden rounded-3xl bg-radial from-slate-900 to-slate-800 px-6 py-10 text-white shadow-xl sm:px-12 sm:py-14">
        {/* Decorative graphic element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-sky-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 flex flex-col justify-between h-full">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Sorteo Activo
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {raffle.title}
              </h2>
              <p className="mt-4 text-base text-slate-300 leading-relaxed">
                {raffle.description}
              </p>
            </div>
            
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-slate-700/50 pt-6">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Valor por Número</p>
                <p className="mt-1 text-2xl font-bold text-sky-500">
                  ${raffle.ticketPrice.toLocaleString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Números Totales</p>
                <p className="mt-1 text-2xl font-semibold text-slate-200">{raffle.totalTickets}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xs">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2 mb-3.5 pb-2 border-b border-white/10">
              <Gift className="h-4 w-4 text-sky-400 animate-bounce" />
              Premios en Juego
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {RAFFLE_PRIZES.map((prize, idx) => (
                <div key={idx} className="flex gap-2 items-start text-xs text-slate-200 hover:text-white transition-colors py-0.5">
                  <span className="flex-shrink-0 flex items-center justify-center h-4.5 w-4.5 rounded-full bg-sky-500/10 text-sky-300 font-black text-[9px] border border-sky-400/20">
                    {idx + 1}
                  </span>
                  <span className="leading-tight font-medium">{prize}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Winner Highlight Card if exists */}
        {raffle.winnerNumber !== null && (
          <div className="relative mt-8 max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-xs">
            <h4 className="flex items-center gap-2 text-md font-bold text-amber-300">
              🎉 ¡GANADOR SORTEADO!
            </h4>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-2xl font-extrabold tracking-wide text-white">Número: {raffle.winnerNumber}</p>
                <p className="text-xs text-amber-200/90 mt-1">Beneficiario: {raffle.winnerName}</p>
                <p className="text-xs text-amber-200/90">Vendedor asignado: {raffle.winnerSellerName}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bases del Sorteo Alert */}
      <div className="mb-8 rounded-2xl border border-sky-100 bg-sky-50/40 p-5 sm:p-6 shadow-xs leading-relaxed">
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-sky-100/80 text-sky-700">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">
              Bases y Condiciones del Sorteo
            </h4>
            <p className="text-xs sm:text-sm text-slate-605 text-slate-600 font-medium leading-relaxed">
              El sorteo se realizará el día <strong className="text-slate-950 font-bold">Lunes 6 de Julio</strong> por la <strong className="text-slate-950 font-bold">Quiniela Nacional Nocturna</strong>, tomando las últimas 4 cifras del 1° al 12° premio. En caso de que el número sorteado no haya sido vendido, se tomará el siguiente premio en orden. En caso de no realizarse el sorteo ese día, se pasará al próximo sorteo de la Quiniela Nacional. Los premios no son transferibles ni canjeables por dinero.
            </p>
            <p className="mt-2 text-xs sm:text-sm font-bold text-sky-700 flex items-center gap-1">
              ¡Gracias por colaborar! 🙌
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Step 1 & 2: Main Selectors (Col 1-7) */}
        <div className="space-y-8 lg:col-span-7">
          
          {/* STEP 1: SELECT VENDEDOR */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-sm font-bold">1</span>
              Seleccioná un Vendedor Asociado
            </h3>
            <p className="text-sm text-slate-500 mb-4 font-normal">
              Las rifas se asignan a vendedores individuales. Seleccioná el tuyo para ver sus números disponibles.
            </p>

            {/* SELLER SEARCH INPUT */}
            <div className="relative mb-5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar vendedor por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 text-sm placeholder-slate-400 text-slate-800 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* SELLERS CONTROLLER GRID */}
            {paginatedSellers.length === 0 ? (
              <div className="text-center py-6 border border-slate-100 rounded-xl bg-slate-50/50">
                <p className="text-sm text-slate-500">No se encontraron vendedores con el nombre "<strong className="text-slate-700">{searchQuery}</strong>".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-bold text-sky-600 hover:text-sky-700 underline"
                >
                  Ver todos los representantes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {paginatedSellers.map((seller) => {
                  const isSelected = selectedSeller?.id === seller.id;
                  
                  // Compute available ticket counts on the fly
                  const availableAssignedCount = tickets.filter(
                    t => t.sellerId === seller.id && t.status === 'AVAILABLE'
                  ).length;

                  return (
                    <button
                      key={seller.id}
                      type="button"
                      onClick={() => handleSelectSeller(seller)}
                      className={`relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/15 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/30'
                      }`}
                    >
                      {/* Initials badge replacing code ID to prevent overlapping overflow */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm select-none transition-all ${
                        isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-650 text-slate-600'
                      }`}>
                        {getInitials(seller.name)}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-sm font-semibold text-slate-900 truncate subtitle-fit">{seller.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Users className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {availableAssignedCount} disp. / {seller.assignedNumbers.length} tot.
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-sky-600">
                          <CheckCircle2 className="h-5 w-5 fill-sky-50" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* SELLER PAGINATION COMPONENT */}
            {filteredSellers.length > itemsPerPage && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                  <span>Anterior</span>
                </button>
                
                <span className="text-xs font-medium text-slate-500">
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            )}
          </section>

          {/* STEP 2: NUMBER GRID */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-sm font-bold">2</span>
                Elegí tus Números de la Suerte
              </h3>
              
              {selectedSeller && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Vendedor: {selectedSeller.name}
                </span>
              )}
            </div>

            {!selectedSeller ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                <div className="rounded-full bg-sky-100 p-3 text-sky-600 mb-3 animate-bounce">
                  <User className="h-6 w-6" />
                </div>
                <h4 className="text-md font-bold text-slate-800">Cargar Cartilla de Números</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Por favor, elija un vendedor del listado de arriba primero. Una vez seleccionado, se habilitará la grilla con sus cartones de rifa asignados.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visual state legend */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-4 w-4 rounded border border-slate-200 bg-white" />
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-orange-700">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-amber-500 text-white text-[10px]"><Clock className="h-2.5 w-2.5" /></span>
                    <span>Reservado (Revisión)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-500">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-300 text-white text-[9px]"><X className="h-2.5 w-2.5" /></span>
                    <span>Vendido (Ocupado)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <span className="h-4 w-4 rounded bg-emerald-600 border border-emerald-700" />
                    <span>Seleccionado (Tuyo)</span>
                  </div>
                </div>

                {sellerTickets.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">Este vendedor no tiene números asignados actualmente en este sorteo.</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                      {sellerTickets.map((ticket) => {
                        const isSelected = selectedNumbers.includes(ticket.number);
                        
                        let bgColor = 'bg-white text-slate-800 border-slate-200 hover:border-sky-400 hover:bg-sky-50/25';
                        let cursor = 'cursor-pointer';
                        let disabled = false;
                        let itemIcon = null;

                        if (ticket.status === 'PENDING_REVIEW') {
                          bgColor = 'bg-amber-500 text-white border-amber-600/10 opacity-80';
                          cursor = 'cursor-not-allowed';
                          disabled = true;
                          itemIcon = <Clock className="h-3 w-3" />;
                        } else if (ticket.status === 'SOLD') {
                          bgColor = 'bg-slate-300 text-slate-600 border-slate-400/15 line-through opacity-65';
                          cursor = 'cursor-not-allowed';
                          disabled = true;
                          itemIcon = <X className="h-3 w-3" />;
                        } else if (isSelected) {
                          bgColor = 'bg-emerald-600 text-white border-emerald-700 scale-105 shadow-sm font-extrabold ring-2 ring-emerald-500/20';
                        }

                        return (
                          <button
                            key={ticket.number}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleToggleNumber(ticket.number, ticket.status)}
                            className={`flex flex-col items-center justify-center h-12 rounded-lg border text-sm font-semibold transition-all duration-150 relative ${bgColor} ${cursor}`}
                            title={`Número ${ticket.number} - ${ticket.status}`}
                          >
                            <span>{ticket.number}</span>
                            {itemIcon && (
                              <span className="absolute bottom-1 text-[8px] leading-tight">
                                {itemIcon}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Counter selected numbers */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div>
                    <p className="text-xs text-slate-500">Números elegidos</p>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedNumbers.length > 0 
                        ? selectedNumbers.join(', ') 
                        : 'Ninguno seleccionado'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Subtotal parcial</p>
                    <p className="text-lg font-black text-slate-800">
                      ${computedTotal.toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Step 3: Checkout and Form (Col 8-12) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* STEP 3 & 4: BANK INFO */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-sm font-bold">3</span>
              Datos de Transferencia Bancaria
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Hacé la transferencia por el total correspondiente a los números seleccionados utilizando los siguientes datos:
            </p>

            <div className="space-y-3 rounded-xl bg-slate-55 bg-slate-50/70 p-4 border border-slate-100 text-sm">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Banco</span>
                <span className="font-semibold text-slate-800">{raffle.bankInfo.bankName}</span>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Titular Cuenta</span>
                <span className="font-semibold text-slate-800">{raffle.bankInfo.accountHolder}</span>
              </div>
              
              {raffle.bankInfo.accountNumber && (
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block uppercase">Número de Cuenta</span>
                    <span className="font-semibold text-slate-800">{raffle.bankInfo.accountNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(raffle.bankInfo.accountNumber!, 'accountNumber')}
                    className="rounded-lg p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    title="Copiar Número de Cuenta"
                  >
                    {copiedField === 'accountNumber' ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}

              {raffle.bankInfo.cuit && (
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block uppercase">Documento / CUIT</span>
                    <span className="font-semibold text-slate-800">{raffle.bankInfo.cuit}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(raffle.bankInfo.cuit!, 'cuit')}
                    className="rounded-lg p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    title="Copiar CUIT"
                  >
                    {copiedField === 'cuit' ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
              
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block uppercase">CBU</span>
                  <span className="font-mono font-bold text-slate-700">{raffle.bankInfo.cbu}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(raffle.bankInfo.cbu, 'cbu')}
                  className="rounded-lg p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  title="Copiar CBU"
                >
                  {copiedField === 'cbu' ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block uppercase">Alias</span>
                  <span className="font-sans font-bold text-sky-700">{raffle.bankInfo.alias}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(raffle.bankInfo.alias, 'alias')}
                  className="rounded-lg p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  title="Copiar Alias"
                >
                  {copiedField === 'alias' ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Simulated Clipboard alert */}
            <AnimatePresence>
              {copiedField && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="mt-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg py-1.5"
                >
                  ¡{copiedField.toUpperCase()} copiado correctamente al portapapeles!
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* STEP 5: REGISTRAR COMPRA FORM */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-sm font-bold">4</span>
              Completar Datos y Enviar Pago
            </h3>

            {selectedNumbers.length > 0 && (
              <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 flex gap-2.5 items-start">
                <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="font-bold text-amber-950 block mb-0.5">⚠️ IMPORTANTE: Envía un Único Comprobante</strong>
                  Por favor, realizá <strong className="font-semibold">una sola transferencia</strong> por el monto total de <strong className="font-extrabold text-sky-800">${computedTotal.toLocaleString('es-AR')}</strong>, y subí <strong className="font-bold underline text-amber-950">un único comprobante con todo el monto</strong>. No envíes capturas parciales ni dividas el pago.
                </div>
              </div>
            )}

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-700 flex gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {selectedNumbers.length === 0 ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-xs text-amber-800 flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Para completar el formulario, primero seleccioná al menos un número disponible en la grilla del vendedor elegido.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {/* BUYER NAME */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo del Comprador</label>
                  <div className="relative">
                    <User className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      {...register('buyerName')}
                      className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 ${
                        errors.buyerName 
                          ? 'border-rose-400 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                  {errors.buyerName && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.buyerName.message}</p>
                  )}
                </div>

                {/* BUYER PHONE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Celular / Teléfono de Contacto</label>
                  <div className="relative">
                    <Phone className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="Ej. +54 9 11 5000 5000"
                      {...register('buyerPhone')}
                      className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 ${
                        errors.buyerPhone 
                          ? 'border-rose-400 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                  {errors.buyerPhone && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.buyerPhone.message}</p>
                  )}
                </div>

                {/* BUYER EMAIL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Correo Electrónico (Email)</label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Ej. juan.perez@email.com"
                      {...register('buyerEmail')}
                      className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 ${
                        errors.buyerEmail 
                          ? 'border-rose-400 focus:ring-rose-500/20' 
                          : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                  {errors.buyerEmail && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.buyerEmail.message}</p>
                  )}
                </div>

                {/* VOUCHER FILE UPLOAD (MANDATORY) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cargar Comprobante de Transferencia <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/20 px-4 py-6 transition-all relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple={false}
                      id="receipt-file-input"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {receiptPreview ? (
                      <div className="text-center">
                        <FileImage className="mx-auto h-10 w-10 text-emerald-600" />
                        <span className="mt-2 text-xs font-bold text-emerald-700 block">¡Comprobante cargado!</span>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] truncate">Hacé clic para reemplazar la imagen</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
                        <span className="mt-2 text-xs font-semibold text-slate-700 block">Suelte o cargue un único comprobante</span>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Debe cubrir el monto total: ${computedTotal.toLocaleString('es-AR')}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">JPG, PNG hasta 5MB (Obligatorio)</p>
                      </div>
                    )}
                  </div>
                  {errors.receiptUrl && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.receiptUrl.message}</p>
                  )}
                </div>

                {/* RENDER COMPLETED BASE64 PREVIEW IF AVAILABLE */}
                {receiptPreview && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Vista Previa del Comprobante</span>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptPreview(null);
                          setValue('receiptUrl', '', { shouldValidate: true });
                          const fileInput = document.getElementById('receipt-file-input') as HTMLInputElement;
                          if (fileInput) {
                            fileInput.value = '';
                          }
                        }}
                        className="text-[11px] text-rose-600 hover:text-white font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-600 border border-rose-100 hover:border-rose-600 rounded-lg py-1 px-2.5 transition-all cursor-pointer shadow-xs z-10"
                        title="Eliminar Comprobante de pago"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Eliminar Comprobante</span>
                      </button>
                    </div>
                    <img 
                      src={receiptPreview || undefined} 
                      alt="Comprobante de pago" 
                      className="max-h-56 w-full object-contain rounded-lg border border-slate-200 bg-white"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total a transferir:</span>
                    <span className="text-xl font-extrabold text-sky-700">${computedTotal.toLocaleString('es-AR')}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || selectedNumbers.length === 0}
                    className={`w-full rounded-xl py-3.5 px-4 text-center font-bold text-sm text-white shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                      isLoading || selectedNumbers.length === 0
                        ? 'bg-slate-300 shadow-none cursor-not-allowed'
                        : 'bg-sky-500 hover:bg-sky-600 active:scale-[0.98] shadow-sky-200'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Confirmando solicitud...</span>
                      </>
                    ) : (
                      <span>Registrar Solicitud de Compra</span>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">
                    Nuestros asesores validarán la transferencia. La confirmación demorará unos minutos.
                  </p>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>

      {/* SUCCESS MODAL TRIGGERED AFTER VALIDATION SUBMISSION */}
      <AnimatePresence>
        {successData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessData(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 sm:p-8"
            >
              {/* Close Button */}
              <button
                onClick={() => setSuccessData(null)}
                className="absolute top-4 right-4 rounded-xl p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center pt-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 shadow-sm shadow-emerald-100">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900">
                  ¡Pago Registrado Exitosamente!
                </h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Hola <strong className="text-slate-800 font-semibold">{successData.buyerName}</strong>, cargamos los datos de tu transferencia. La administración ya los tiene listos para procesar.
                </p>

                {/* Ticket Representation */}
                <div className="my-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 text-left relative overflow-hidden">
                  <div className="absolute -left-3 top-1/2 -mt-3 h-6 w-6 rounded-full bg-white border border-slate-200" />
                  <div className="absolute -right-3 top-1/2 -mt-3 h-6 w-6 rounded-full bg-white border border-slate-200" />
                  
                  <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sorteo Activo</span>
                      <strong className="text-xs text-slate-700 font-semibold truncate max-w-[200px] block">{raffle.title}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Estado</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Revisión</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-y-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Vendedor</span>
                      <span className="text-sm font-bold text-slate-800">{successData.sellerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Importe Total</span>
                      <span className="text-sm font-black text-sky-700">${successData.totalAmount.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Tus Números Reservados</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {successData.ticketNumbers.map(n => (
                          <span key={n} className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-extrabold text-white">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-5">
                  <button
                    onClick={() => setSuccessData(null)}
                    className="rounded-xl bg-slate-900 py-3 px-4 font-bold text-sm text-white hover:bg-slate-800 cursor-pointer shadow-sm"
                  >
                    Entendido, Seguir Navegando
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Tu vendedor se comunicará contigo una vez aprobado el pago.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
