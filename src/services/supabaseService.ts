import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Raffle, Seller, Ticket, PurchaseRequest, BankInfo } from '../types';

// Helper to safely parse booleans from database values
function parseBoolean(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  const str = String(val).toLowerCase().trim();
  return str === 'true' || str === 't' || str === '1' || str === 'yes';
}

// Helper to map DB row representing a vendor to Seller
function mapSellerFromDB(row: any, assigned_numbers: number[] = []): Seller {
  const sId = String(row.id).trim();
  const firstWord = row.nombre ? row.nombre.trim().split(/\s+/)[0] : 'VENDEDOR';
  // Fallback to generating uppercase code if none exists
  const code = (row.code || (firstWord + sId)).toUpperCase();
  return {
    id: sId,
    name: row.nombre || 'Vendedor Desconocido',
    phone: row.telefono || '',
    code: code,
    assignedNumbers: assigned_numbers,
  };
}

const DEFAULT_BANK_INFO: BankInfo = {
  bankName: 'Banco Santander',
  accountHolder: 'TOMMY KINAN',
  alias: 'gira.sanpa',
  cbu: '0720454288000001041772',
  accountNumber: 'CAJA DE AHORRO EN PESOS 454-010417/7',
  cuit: 'CUIT 20-44641538-8',
};

interface DbSnapshot {
  timestamp: number;
  sellers: any[];
  rifas: any[];
  sales: any[];
}

let _dbSnapshot: DbSnapshot | null = null;
let _pendingFetch: Promise<DbSnapshot> | null = null;
let _tablesVerifiedCache: boolean | null = null;

export function invalidateDbCache() {
  _dbSnapshot = null;
}

// Ultra-fast parallel loader for all 3 core tables (eliminates 15-20 waterfall requests)
async function fetchDbSnapshot(forceRefresh = false): Promise<DbSnapshot> {
  const now = Date.now();
  if (!forceRefresh && _dbSnapshot && (now - _dbSnapshot.timestamp < 6000)) {
    return _dbSnapshot;
  }
  if (_pendingFetch) {
    return _pendingFetch;
  }

  _pendingFetch = (async () => {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    // Concurrently fetch all three tables in a single parallel batch
    const [sellersRes, rifasRes, salesRes] = await Promise.all([
      supabase.from('vendedores').select('*').order('nombre', { ascending: true }),
      supabase.from('rifas').select('*').limit(2500),
      supabase.from('rifas_vendidas').select('*').limit(2500),
    ]);

    if (sellersRes.error) throw sellersRes.error;
    if (rifasRes.error) throw rifasRes.error;
    if (salesRes.error) throw salesRes.error;

    let rifasData = (rifasRes.data || []) as any[];
    rifasData.sort((a, b) => {
      const numA = parseInt(a.numero, 10);
      const numB = parseInt(b.numero, 10);
      if (isNaN(numA) || isNaN(numB)) return String(a.numero).localeCompare(String(b.numero));
      return numA - numB;
    });

    const snapshot: DbSnapshot = {
      timestamp: Date.now(),
      sellers: sellersRes.data || [],
      rifas: rifasData,
      sales: salesRes.data || [],
    };
    _dbSnapshot = snapshot;
    _pendingFetch = null;
    return snapshot;
  })().catch(err => {
    _pendingFetch = null;
    throw err;
  });

  return _pendingFetch;
}

export const supabaseService = {
  // Check if tables exist concurrently with result caching
  async checkTablesExist(): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    if (_tablesVerifiedCache === true) return true;
    try {
      // 1. Concurrently probe vendedores, rifas, and rifas_vendidas
      const [vRes, rRes, rvRes] = await Promise.all([
        supabase.from('vendedores').select('id').limit(1),
        supabase.from('rifas').select('id').limit(1),
        supabase.from('rifas_vendidas').select('id').limit(1),
      ]);

      const checkError = (err: any) => {
        if (!err) return false;
        return (
          err.code === 'PGRST116' ||
          err.message?.includes('relation') ||
          err.message?.includes('exist') ||
          err.message?.includes('does not exist')
        );
      };

      if (checkError(vRes.error) || checkError(rRes.error) || checkError(rvRes.error)) {
        _tablesVerifiedCache = false;
        return false;
      }

      _tablesVerifiedCache = true;
      return true;
    } catch (err) {
      console.error('Failed checking Supabase tables presence:', err);
      return false;
    }
  },

  // --- RAFFLE ENDPOINTS ---
  async getActiveRaffle(): Promise<Raffle> {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    
    let totalTicketsCount = 100;
    try {
      const snapshot = await fetchDbSnapshot();
      totalTicketsCount = snapshot.rifas.length > 0 ? snapshot.rifas.length : 100;
    } catch (err) {
      console.warn('Could not read tickets count from snapshot:', err);
    }

    // Read winner information from local persistence overlay
    const localWinner = localStorage.getItem('rifas_online_winner');
    let winnerNumber = null;
    let winnerName = null;
    let winnerSellerName = null;
    let status: 'ACTIVE' | 'FINISHED' = 'ACTIVE';

    if (localWinner) {
      try {
        const parsed = JSON.parse(localWinner);
        winnerNumber = parsed.winnerNumber;
        winnerName = parsed.winnerName;
        winnerSellerName = parsed.winnerSellerName;
        status = 'FINISHED';
      } catch {}
    }

    return {
      id: 'default-raffle',
      title: 'Rifa Gira de Rugby a Sudáfrica - Club San Patricio',
      description: 'Participá de la rifa benéfica oficial del Club San Patricio. Todo lo recaudado será destinado a financiar la gira de rugby a Sudáfrica 2027.',
      ticketPrice: 10000,
      totalTickets: totalTicketsCount,
      bankInfo: DEFAULT_BANK_INFO,
      status: status,
      winnerNumber: winnerNumber,
      winnerName: winnerName,
      winnerSellerName: winnerSellerName,
    };
  },

  async createNewRaffle(
    title: string,
    description: string,
    price: number,
    totalTicketsCount: number,
    bank: BankInfo
  ): Promise<Raffle> {
    invalidateDbCache();
    return this.getActiveRaffle();
  },

  // --- VENDEDORES ENDPOINTS ---
  async getSellers(): Promise<Seller[]> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    const snapshot = await fetchDbSnapshot();
    const sellersData = snapshot.sellers;
    const rifasData = snapshot.rifas;

    // If Supabase table is empty or has no records yet, return empty list
    if (!sellersData || sellersData.length === 0) {
      console.info('No sellers found in Supabase vendedores table. Database is empty or awaiting seller registration.');
      return [];
    }

    const assignedMap: Record<string, number[]> = {};
    rifasData.forEach(row => {
      if (row.vendedor_id !== null && row.vendedor_id !== undefined) {
        const sId = String(row.vendedor_id).trim();
        if (!assignedMap[sId]) {
          assignedMap[sId] = [];
        }
        const num = parseInt(row.numero, 10);
        if (!isNaN(num)) {
          assignedMap[sId].push(num);
        }
      }
    });

    return (sellersData || []).map(row => {
      const sId = String(row.id).trim();
      const assigned = (assignedMap[sId] || []).sort((a, b) => a - b);
      return mapSellerFromDB(row, assigned);
    });
  },

  async createSeller(
    name: string,
    phone: string,
    code: string,
    assignedNumbers: number[]
  ): Promise<Seller> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    // Insert new seller into public.vendedores
    const { data, error } = await supabase
      .from('vendedores')
      .insert({
        nombre: name,
        telefono: phone || null,
      })
      .select()
      .single();

    if (error) throw error;

    const newSellerId = String(data.id);

    // Update tickets vendedor_id for assigned numbers in Supabase
    if (assignedNumbers.length > 0) {
      for (const num of assignedNumbers) {
        const paddedStr = String(num).padStart(4, '0');
        await supabase
          .from('rifas')
          .update({ vendedor_id: data.id })
          .or(`numero.eq.${paddedStr},numero.eq.${num}`);
      }
    }

    // Invalidate cache so changes reflect instantly
    invalidateDbCache();
    return mapSellerFromDB(data, assignedNumbers);
  },

  async assignNumbersToSeller(sellerId: string, numbers: number[]): Promise<Seller[]> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    const sInt = parseInt(sellerId, 10);
    if (isNaN(sInt)) throw new Error('El ID de vendedor debe ser numérico.');

    // First assign new numbers
    if (numbers.length > 0) {
      for (const num of numbers) {
        const paddedStr = String(num).padStart(4, '0');
        await supabase
          .from('rifas')
          .update({ vendedor_id: sInt })
          .or(`numero.eq.${paddedStr},numero.eq.${num}`);
      }
    }

    invalidateDbCache();
    return this.getSellers();
  },

  // --- TICKETS ENDPOINTS ---
  async getTickets(): Promise<Ticket[]> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    let snapshot = await fetchDbSnapshot();
    let rifasData = snapshot.rifas;
    let salesData = snapshot.sales;

    // Auto-seed if table is connected but empty to prevent "0 disponibles"
    if (rifasData.length === 0) {
      console.log('No rifas found in database, attempting automatic seed...');
      try {
        const { data: currentSellers } = await supabase
          .from('vendedores')
          .select('id');
        
        let mateoId = 1;
        let tommyId = 2;
        let simonId = 3;

        if (!currentSellers || currentSellers.length === 0) {
          const { data: insertedSellers, error: insertSellersErr } = await supabase
            .from('vendedores')
            .insert([
              { id: 1, nombre: 'Mateo Natero', telefono: '+54 11 9988-7766' },
              { id: 2, nombre: 'Tommy Kinan', telefono: '+54 11 2233-4455' },
              { id: 3, nombre: 'Simon Wolf', telefono: '+54 11 5544-3322' }
            ])
            .select();
          
          if (!insertSellersErr && insertedSellers && insertedSellers.length > 0) {
            mateoId = insertedSellers[0]?.id || 1;
            tommyId = insertedSellers[1]?.id || 2;
            simonId = insertedSellers[2]?.id || 3;
          }
        } else {
          mateoId = currentSellers[0]?.id || 1;
          tommyId = currentSellers[1]?.id || 2;
          simonId = currentSellers[2]?.id || 3;
        }

        const ticketsToInsert = [];
        for (let i = 1; i <= 100; i++) {
          const padded = String(i).padStart(4, '0');
          let sellerId = null;
          if (i <= 10) sellerId = mateoId;
          else if (i <= 20) sellerId = tommyId;
          else if (i <= 30) sellerId = simonId;

          ticketsToInsert.push({
            numero: padded,
            vendedor_id: sellerId,
            is_available: true
          });
        }

        await supabase.from('rifas').insert(ticketsToInsert);
        invalidateDbCache();
        snapshot = await fetchDbSnapshot(true);
        rifasData = snapshot.rifas;
        salesData = snapshot.sales;
      } catch (err) {
        console.error('Failed to run automatic database seeder:', err);
      }
    }

    // If still empty (e.g. database has no rows or RLS is blocking inserts and queries)
    if (!rifasData || rifasData.length === 0) {
      console.warn('Rifas table is empty or restricted by RLS in Supabase. Returning fallback 100 tickets.');
      const fallbackTickets: Ticket[] = [];
      for (let i = 1; i <= 100; i++) {
        fallbackTickets.push({
          number: i,
          status: 'AVAILABLE',
          sellerId: null,
          buyerName: null,
          buyerPhone: null,
          buyerEmail: null,
          receiptUrl: null,
          submittedAt: null,
        });
      }
      return fallbackTickets;
    }

    const salesMap: Record<string, any> = {};
    salesData.forEach(sale => {
      salesMap[sale.rifa_id] = sale;
    });

    // Detect orphaned unavailable tickets and auto-heal them in Supabase
    const orphanedRifaIds: number[] = [];
    rifasData.forEach(row => {
      const isAvailable = parseBoolean(row.is_available);
      if (!isAvailable && !salesMap[row.id]) {
        orphanedRifaIds.push(row.id);
      }
    });

    if (orphanedRifaIds.length > 0 && supabase) {
      supabase
        .from('rifas')
        .update({ is_available: true })
        .in('id', orphanedRifaIds)
        .then(() => {});
    }

    const mappedTickets = rifasData.map(row => {
      const num = parseInt(row.numero, 10);
      const sale = salesMap[row.id];

      let status: 'AVAILABLE' | 'PENDING_REVIEW' | 'SOLD' = 'AVAILABLE';
      const isAvailable = parseBoolean(row.is_available);
      if (orphanedRifaIds.includes(row.id)) {
        status = 'AVAILABLE';
      } else if (!isAvailable) {
        if (sale && (sale.state === 'PENDING' || sale.state === 'PENDING_REVIEW')) {
          status = 'PENDING_REVIEW';
        } else if (sale) {
          status = 'SOLD';
        } else {
          status = 'AVAILABLE';
        }
      } else if (sale) {
        if (sale.state === 'PENDING' || sale.state === 'PENDING_REVIEW') {
          status = 'PENDING_REVIEW';
        } else if (sale.state === 'APPROVED' || sale.state === 'SOLD') {
          status = 'SOLD';
        }
      }

      // Read extra/receipt attributes from cache overlay if available
      const localOverlay = typeof localStorage !== 'undefined' ? localStorage.getItem(`rifa_buyer_info_${num}`) : null;
      let buyerName = sale ? sale.nombre : null;
      let buyerPhone = sale ? sale.numero : null;
      let buyerEmail = sale ? sale.email : null;
      let receiptUrl = sale ? (sale.comprobante || sale.receipt_url || null) : null;
      let submittedAt = sale ? sale.fecha_venta : null;

      if (localOverlay) {
        try {
          const parsed = JSON.parse(localOverlay);
          if (!buyerName) buyerName = parsed.buyerName;
          if (!buyerPhone) buyerPhone = parsed.buyerPhone;
          if (!buyerEmail) buyerEmail = parsed.buyerEmail;
          receiptUrl = parsed.receiptUrl;
          if (parsed.receiptImgKey && typeof localStorage !== 'undefined') {
            receiptUrl = localStorage.getItem(parsed.receiptImgKey) || receiptUrl;
          }
          if (!submittedAt) submittedAt = parsed.submittedAt;
        } catch {}
      }

      return {
        number: isNaN(num) ? 0 : num,
        status: status,
        sellerId: (row.vendedor_id !== null && row.vendedor_id !== undefined) ? String(row.vendedor_id).trim() : null,
        buyerName,
        buyerPhone,
        buyerEmail,
        receiptUrl,
        submittedAt,
      };
    });

    return mappedTickets;
  },

  async getTicketsBySeller(sellerId: string): Promise<Ticket[]> {
    const tickets = await this.getTickets();
    return tickets.filter(t => t.sellerId === sellerId);
  },

  // --- BUYER PURCHASE ENTRY ENDPOINT ---
  async submitPurchase(data: {
    raffleId: string;
    sellerId: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    ticketNumbers: number[];
    receiptUrl: string;
    totalPrice: number;
  }): Promise<PurchaseRequest> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    // Fetch all existing tickets to verify availability (with pagination)
    let dbRifas: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('rifas')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        dbRifas = dbRifas.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    const unavailable: number[] = [];
    data.ticketNumbers.forEach(n => {
      const paddedStr = String(n).padStart(4, '0');
      const match = (dbRifas || []).find(r => r.numero === paddedStr || parseInt(r.numero, 10) === n);
      if (!match || !match.is_available) {
        unavailable.push(n);
      }
    });

    if (unavailable.length > 0) {
      throw new Error(`Los números [${unavailable.join(', ')}] ya no se encuentran disponibles.`);
    }

    const submittedAt = new Date().toISOString();
    const sId = parseInt(data.sellerId, 10);

    // Save overlay to localStorage for receipt image resolution in the client browser
    if (typeof localStorage !== 'undefined') {
      const receiptImgKey = `receipt_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      try {
        localStorage.setItem(receiptImgKey, data.receiptUrl);
      } catch (quotaErr) {
        console.warn('Could not save raw image to localStorage due to quota limits:', quotaErr);
      }

      data.ticketNumbers.forEach(n => {
        try {
          localStorage.setItem(`rifa_buyer_info_${n}`, JSON.stringify({
            buyerName: data.buyerName,
            buyerPhone: data.buyerPhone,
            buyerEmail: data.buyerEmail,
            receiptImgKey,
            submittedAt,
          }));
        } catch (itemErr) {
          console.warn(`Could not save item metadata for ticket ${n} to localStorage:`, itemErr);
        }
      });
    }

    // Update tickets in Supabase public.rifas (is_available = false) AND insert records in public.rifas_vendidas
    for (const n of data.ticketNumbers) {
      const paddedStr = String(n).padStart(4, '0');
      const match = (dbRifas || []).find(r => r.numero === paddedStr || parseInt(r.numero, 10) === n);
      if (match) {
        // 1. Mark ticket as occupied/assigned
        const { error: updateError } = await supabase
          .from('rifas')
          .update({
            is_available: false,
            vendedor_id: isNaN(sId) ? null : sId,
          })
          .eq('id', match.id);

        if (updateError) throw updateError;

        // 2. Insert sale item with robust fallback in case column 'comprobante' doesn't exist yet
        let insertError: any = null;
        try {
          const { error } = await supabase
            .from('rifas_vendidas')
            .insert({
              id: crypto.randomUUID ? crypto.randomUUID() : `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              rifa_id: match.id,
              vendedor_id: isNaN(sId) ? null : sId,
              nombre: data.buyerName,
              numero: data.buyerPhone,
              email: data.buyerEmail,
              fecha_venta: submittedAt,
              state: 'PENDING_REVIEW',
              comprobante: data.receiptUrl, // Base64 proof of transfer
            });
          insertError = error;
        } catch (err) {
          insertError = err;
        }

        // Catch missing column error and fallback to insert without comprobante
        if (insertError) {
          const errMsg = insertError.message || String(insertError);
          if (errMsg.includes('comprobante') || errMsg.includes('column') || errMsg.includes('does not exist')) {
            console.warn('The "comprobante" column might be missing. Attempting fallback insert without image. Please run the ALTER TABLE SQL in the admin panel settings!');
            const { error: fallbackError } = await supabase
              .from('rifas_vendidas')
              .insert({
                id: crypto.randomUUID ? crypto.randomUUID() : `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                rifa_id: match.id,
                vendedor_id: isNaN(sId) ? null : sId,
                nombre: data.buyerName,
                numero: data.buyerPhone,
                email: data.buyerEmail,
                fecha_venta: submittedAt,
                state: 'PENDING_REVIEW',
              });
            if (fallbackError) throw fallbackError;
          } else if (insertError.code === '42501' || errMsg.includes('row-level security') || errMsg.includes('policy')) {
            console.warn('Supabase blocked by Row-Level Security (RLS). Saving to contingency storage.');
            try {
              const prev = JSON.parse(localStorage.getItem('rifas_online_purchases') || '[]');
              prev.unshift({
                id: `pur-${Date.now()}`,
                raffleId: data.raffleId,
                sellerId: data.sellerId,
                buyerName: data.buyerName,
                buyerPhone: data.buyerPhone,
                buyerEmail: data.buyerEmail,
                ticketNumbers: data.ticketNumbers,
                receiptUrl: data.receiptUrl,
                status: 'PENDING_REVIEW',
                totalAmount: data.totalPrice,
                submittedAt,
              });
              localStorage.setItem('rifas_online_purchases', JSON.stringify(prev));
            } catch {}
          } else {
            throw insertError;
          }
        }
      }
    }

    invalidateDbCache();

    const newPurchaseId = `pur-${Date.now()}`;
    const newPurchase: PurchaseRequest = {
      id: newPurchaseId,
      raffleId: data.raffleId,
      sellerId: data.sellerId,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      buyerEmail: data.buyerEmail,
      ticketNumbers: data.ticketNumbers,
      receiptUrl: data.receiptUrl,
      status: 'PENDING_REVIEW',
      totalAmount: data.totalPrice,
      submittedAt,
    };

    return newPurchase;
  },

  // --- ADMIN APPROVALS ENDPOINTS ---
  async getPurchases(): Promise<PurchaseRequest[]> {
    if (!supabase) return [];

    const snapshot = await fetchDbSnapshot();
    const sales = snapshot.sales;
    const rifasData = snapshot.rifas;

    const rifaIdToNumMap: Record<string, number> = {};
    (rifasData || []).forEach(r => {
      const parsedNum = parseInt(r.numero, 10);
      if (!isNaN(parsedNum)) {
        rifaIdToNumMap[String(r.id)] = parsedNum;
      }
    });

    // Group the sales into transactions matching the client information + purchase action
    const groups: Record<string, {
      id: string;
      vendedor_id: any;
      nombre: string;
      numero: string;
      email: string;
      fecha_venta: string;
      state: string;
      ticketNumbers: number[];
      receiptUrl: string;
    }> = {};

    (sales || []).forEach(row => {
      // Create a unique composite key combining buyer metadata and purchase timestamp
      const dateStr = row.fecha_venta || '';
      const key = `${row.nombre || ''}_${row.email || ''}_${row.vendedor_id || ''}_${dateStr}`;

      const ticketNum = rifaIdToNumMap[String(row.rifa_id)] || NaN;

      if (!groups[key]) {
        groups[key] = {
          id: row.id,
          vendedor_id: row.vendedor_id,
          nombre: row.nombre || '',
          numero: row.numero || '',
          email: row.email || '',
          fecha_venta: dateStr,
          state: row.state || 'PENDING_REVIEW',
          ticketNumbers: isNaN(ticketNum) ? [] : [ticketNum],
          receiptUrl: row.comprobante || row.receipt_url || '',
        };
      } else {
        if (!isNaN(ticketNum)) {
          groups[key].ticketNumbers.push(ticketNum);
        }
        if (!groups[key].receiptUrl && (row.comprobante || row.receipt_url)) {
          groups[key].receiptUrl = row.comprobante || row.receipt_url;
        }
      }
    });

    return Object.values(groups).map(g => {
      // Find voucher/receipt uploaded Base64 image from browser cache if it was submitted in this browser session
      const firstTicketNum = g.ticketNumbers[0];
      const localOverlay = typeof localStorage !== 'undefined' ? localStorage.getItem(`rifa_buyer_info_${firstTicketNum}`) : null;
      let receiptUrl = g.receiptUrl || '';
      if (!receiptUrl && localOverlay) {
        try {
          const parsed = JSON.parse(localOverlay);
          receiptUrl = parsed.receiptUrl || '';
          if (parsed.receiptImgKey && typeof localStorage !== 'undefined') {
            receiptUrl = localStorage.getItem(parsed.receiptImgKey) || receiptUrl;
          }
        } catch {}
      }

      const totalAmount = g.ticketNumbers.length * 10000;

      let mappedStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' = 'PENDING_REVIEW';
      if (g.state === 'APPROVED' || g.state === 'SOLD') {
        mappedStatus = 'APPROVED';
      } else if (g.state === 'REJECTED') {
        mappedStatus = 'REJECTED';
      }

      return {
        id: g.id,
        raffleId: 'default-raffle',
        sellerId: String(g.vendedor_id),
        buyerName: g.nombre,
        buyerPhone: g.numero,
        buyerEmail: g.email,
        ticketNumbers: g.ticketNumbers.sort((a, b) => a - b),
        receiptUrl: receiptUrl,
        status: mappedStatus,
        totalAmount: totalAmount,
        submittedAt: g.fecha_venta,
      };
    }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  async approvePurchase(purchaseId: string): Promise<PurchaseRequest> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    const { data: firstSale, error: fetchError } = await supabase
      .from('rifas_vendidas')
      .select('*')
      .eq('id', purchaseId)
      .maybeSingle();

    if (fetchError || !firstSale) {
      throw new Error('Compra no encontrada en la base de datos.');
    }

    // Update state to 'APPROVED' for all sales in this transaction group
    let query = supabase
      .from('rifas_vendidas')
      .update({ state: 'APPROVED' })
      .eq('nombre', firstSale.nombre)
      .eq('email', firstSale.email)
      .eq('fecha_venta', firstSale.fecha_venta);

    if (firstSale.vendedor_id === null || firstSale.vendedor_id === undefined) {
      query = query.is('vendedor_id', null);
    } else {
      query = query.eq('vendedor_id', firstSale.vendedor_id);
    }

    const { error: updateError } = await query;

    if (updateError) throw updateError;

    invalidateDbCache();
    const list = await this.getPurchases();
    const match = list.find(p => p.id === purchaseId);
    if (!match) throw new Error('La compra no pudo ser verificada.');
    return match;
  },

  async rejectPurchase(purchaseId: string, reason: string): Promise<PurchaseRequest> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    const { data: firstSale, error: fetchError } = await supabase
      .from('rifas_vendidas')
      .select('*')
      .eq('id', purchaseId)
      .maybeSingle();

    if (fetchError || !firstSale) {
      throw new Error('Compra no encontrada en la base de datos.');
    }

    // Find all ticket rows connected to this group so we can release them without nested select joins
    let selectQuery = supabase
      .from('rifas_vendidas')
      .select('*')
      .eq('nombre', firstSale.nombre)
      .eq('email', firstSale.email)
      .eq('fecha_venta', firstSale.fecha_venta);

    if (firstSale.vendedor_id === null || firstSale.vendedor_id === undefined) {
      selectQuery = selectQuery.is('vendedor_id', null);
    } else {
      selectQuery = selectQuery.eq('vendedor_id', firstSale.vendedor_id);
    }

    const { data: groupedSales } = await selectQuery;

    if (groupedSales && groupedSales.length > 0) {
      // Resolve matching rifas numbers using a separate in-memory query to stay safe
      const rifaIds = groupedSales.map(s => s.rifa_id).filter(Boolean);
      let rifasDetails: any[] = [];
      if (rifaIds.length > 0) {
        try {
          const { data: rd } = await supabase
            .from('rifas')
            .select('id, numero')
            .in('id', rifaIds);
          if (rd) rifasDetails = rd;
        } catch (err) {
          console.warn('Could not fetch rifas details during rejection:', err);
        }
      }
      const rifasMap = new Map<string, string>(rifasDetails.map(r => [String(r.id), r.numero]));
      const rejectedTicketNumbers: number[] = [];

      for (const sale of groupedSales) {
        if (sale.rifa_id) {
          // Reset availability in rifas table without clearing the assigned seller
          await supabase
            .from('rifas')
            .update({ is_available: true })
            .eq('id', sale.rifa_id);
        }

        const ticketNumStr = rifasMap.get(String(sale.rifa_id));
        if (ticketNumStr) {
          const num = parseInt(ticketNumStr, 10);
          if (!isNaN(num)) {
            rejectedTicketNumbers.push(num);
            if (typeof localStorage !== 'undefined') {
              const rawOverlay = localStorage.getItem(`rifa_buyer_info_${num}`);
              if (rawOverlay) {
                try {
                  const parsed = JSON.parse(rawOverlay);
                  if (parsed.receiptImgKey) {
                    localStorage.removeItem(parsed.receiptImgKey);
                  }
                } catch {}
              }
              localStorage.removeItem(`rifa_buyer_info_${num}`);
            }
          }
        }
      }

      // Delete purchase records (rifas_vendidas items) entirely from the database
      let deleteQuery = supabase
        .from('rifas_vendidas')
        .delete()
        .eq('nombre', firstSale.nombre)
        .eq('email', firstSale.email)
        .eq('fecha_venta', firstSale.fecha_venta);

      if (firstSale.vendedor_id === null || firstSale.vendedor_id === undefined) {
        deleteQuery = deleteQuery.is('vendedor_id', null);
      } else {
        deleteQuery = deleteQuery.eq('vendedor_id', firstSale.vendedor_id);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw deleteError;

      invalidateDbCache();

      // Return a dummy/updated state so that the calling method receives it nicely
      const dummyPurchase: PurchaseRequest = {
        id: purchaseId,
        raffleId: 'default-raffle',
        sellerId: String(firstSale.vendedor_id),
        buyerName: firstSale.nombre,
        buyerPhone: firstSale.numero,
        buyerEmail: firstSale.email,
        ticketNumbers: rejectedTicketNumbers.sort((a, b) => a - b),
        receiptUrl: '',
        status: 'REJECTED',
        totalAmount: 0,
        submittedAt: firstSale.fecha_venta,
      };
      return dummyPurchase;
    }

    throw new Error('No se encontraron registros de ventas asociados a esta transacción.');
  },

  // --- SWEEPSTAKES / WINNER SELECTION ---
  async drawWinner(): Promise<{ ticket: Ticket | null; error?: string }> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    const ticketsValue = await this.getTickets();
    const soldTickets = ticketsValue.filter(t => t.status === 'SOLD');
    if (soldTickets.length === 0) {
      return {
        ticket: null,
        error: 'No se encontraron números con estado VENDIDO (SOLD) para realizar el sorteo.',
      };
    }

    const randomIndex = Math.floor(Math.random() * soldTickets.length);
    const winnerTicket = soldTickets[randomIndex];

    // Find coordinator seller information
    const sellersValue = await this.getSellers();
    const wSeller = sellersValue.find(s => s.id === winnerTicket.sellerId);
    const winnerSellerName = wSeller ? wSeller.name : 'Vendedor Desconocido';

    // Store winner locally
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rifas_online_winner', JSON.stringify({
        winnerNumber: winnerTicket.number,
        winnerName: winnerTicket.buyerName || 'Comprador Desconocido',
        winnerSellerName: winnerSellerName,
      }));
    }

    return { ticket: winnerTicket };
  },

  async resetWinner(): Promise<Raffle> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('rifas_online_winner');
    }
    invalidateDbCache();
    return this.getActiveRaffle();
  },

  async resetAllToDefaults(): Promise<void> {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    invalidateDbCache();
    
    try {
      // 1. Delete sales records
      await supabase
        .from('rifas_vendidas')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Re-establish tickets availability
      await supabase
        .from('rifas')
        .update({ is_available: true, vendedor_id: null })
        .filter('id', 'neq', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('Could not reset DB in Supabase:', e);
    }
  },
};
