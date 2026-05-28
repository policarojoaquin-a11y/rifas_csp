import { Raffle, Seller, Ticket, PurchaseRequest, BankInfo } from '../types';

// Helper to delay simulation (for realistic loading states)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  RAFFLE: 'rifas_online_active_raffle',
  SELLERS: 'rifas_online_sellers',
  TICKETS: 'rifas_online_tickets',
  PURCHASES: 'rifas_online_purchases',
};

// Auto-reset state if it comes from the old pre-San Patricio version or does not have the mock buyers yet
try {
  const currentRaffle = localStorage.getItem(STORAGE_KEYS.RAFFLE);
  const currentPurchases = localStorage.getItem(STORAGE_KEYS.PURCHASES);
  const currentSellers = localStorage.getItem(STORAGE_KEYS.SELLERS);
  const hasSanPatricioGira = currentRaffle && currentRaffle.includes('Sudáfrica');
  const hasTommyKinan = currentPurchases && currentPurchases.includes('Tommy Kinan');
  const hasMateoSeller = currentSellers && currentSellers.includes('MATEO');

  if (!hasSanPatricioGira || !hasTommyKinan || !hasMateoSeller) {
    localStorage.removeItem(STORAGE_KEYS.RAFFLE);
    localStorage.removeItem(STORAGE_KEYS.SELLERS);
    localStorage.removeItem(STORAGE_KEYS.TICKETS);
    localStorage.removeItem(STORAGE_KEYS.PURCHASES);
  }
} catch (e) {
  console.warn('LocalStorage migration error', e);
}

// Default Mock Bank Details
const DEFAULT_BANK_INFO = {
  bankName: 'Banco Santander',
  accountHolder: 'TOMMY KINAN',
  alias: 'gira.sanpa',
  cbu: '0720454288000001041772',
  accountNumber: 'CAJA DE AHORRO EN PESOS 454-010417/7',
  cuit: 'CUIT 20-44641538-8',
};

// Initial Default active Raffle
const DEFAULT_RAFFLE: Raffle = {
  id: 'raffle-1',
  title: 'Rifa Gira de Rugby a Sudáfrica - Club San Patricio',
  description: 'Participá de la rifa benéfica oficial del Club San Patricio. Todo lo recaudado será destinado a financiar la gira de rugby a Sudáfrica 2027.',
  ticketPrice: 15000,
  totalTickets: 100, // 100 tickets in our pool for demonstration ease
  bankInfo: DEFAULT_BANK_INFO,
  status: 'ACTIVE',
  winnerNumber: null,
  winnerName: null,
  winnerSellerName: null,
};

// Initial Sellers - Ahora agregados como vendedores
const DEFAULT_SELLERS: Seller[] = [
  { id: 'sel-mateo', name: 'Mateo Natero', phone: '+54 11 9988-7766', code: 'MATEO', assignedNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'sel-tommy', name: 'Tommy Kinan', phone: '+54 11 2233-4455', code: 'TOMMY', assignedNumbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { id: 'sel-simon', name: 'Simon Wolf', phone: '+54 11 5544-3322', code: 'SIMON', assignedNumbers: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
];

// Sample default transactions & ticket modifications
// Generates clean available tickets
const generateInitialTickets = (sellers: Seller[]): Ticket[] => {
  const tickets: Ticket[] = [];
  const total = DEFAULT_RAFFLE.totalTickets;

  for (let i = 1; i <= total; i++) {
    // Find who owns this ticket
    const assignedSeller = sellers.find(s => s.assignedNumbers.includes(i));
    
    // Set sample state for pre-loaded buyers
    let status: 'AVAILABLE' | 'PENDING_REVIEW' | 'SOLD' = 'AVAILABLE';
    let buyerName: string | null = null;
    let buyerPhone: string | null = null;
    let buyerEmail: string | null = null;
    let receiptUrl: string | null = null;
    let submittedAt: string | null = null;

    if (i === 7) {
      status = 'SOLD';
      buyerName = 'Mateo Natero';
      buyerPhone = '+54 11 9988-7766';
      buyerEmail = 'mateo.natero@gmail.com';
      submittedAt = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(); // 2 days ago
    } else if (i === 14) {
      status = 'SOLD';
      buyerName = 'Tommy Kinan';
      buyerPhone = '+54 11 2233-4455';
      buyerEmail = 'tommykinan2002@gmail.com';
      submittedAt = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
    } else if (i === 21) {
      status = 'PENDING_REVIEW';
      buyerName = 'Simon Wolf';
      buyerPhone = '+54 11 5544-3322';
      buyerEmail = 'simon.wolf@gmail.com';
      receiptUrl = 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60';
      submittedAt = new Date(Date.now() - 1000 * 60 * 15).toISOString(); // 15 mins ago
    }

    tickets.push({
      number: i,
      status,
      sellerId: assignedSeller ? assignedSeller.id : null,
      buyerName,
      buyerPhone,
      buyerEmail,
      receiptUrl,
      submittedAt,
    });
  }

  return tickets;
};

const DEFAULT_PURCHASES: PurchaseRequest[] = [
  {
    id: 'pur-mateo',
    raffleId: 'raffle-1',
    sellerId: 'sel-mateo',
    buyerName: 'Mateo Natero',
    buyerPhone: '+54 11 9988-7766',
    buyerEmail: 'mateo.natero@gmail.com',
    ticketNumbers: [7],
    receiptUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60',
    status: 'APPROVED',
    totalAmount: 15000,
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    notes: 'Pago verificado administrativamente.'
  },
  {
    id: 'pur-tommy',
    raffleId: 'raffle-1',
    sellerId: 'sel-tommy',
    buyerName: 'Tommy Kinan',
    buyerPhone: '+54 11 2233-4455',
    buyerEmail: 'tommykinan2002@gmail.com',
    ticketNumbers: [14],
    receiptUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60',
    status: 'APPROVED',
    totalAmount: 15000,
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    notes: 'Acreditación confirmada en Home Banking.'
  },
  {
    id: 'pur-simon',
    raffleId: 'raffle-1',
    sellerId: 'sel-simon',
    buyerName: 'Simon Wolf',
    buyerPhone: '+54 11 5544-3322',
    buyerEmail: 'simon.wolf@gmail.com',
    ticketNumbers: [21],
    receiptUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60',
    status: 'PENDING_REVIEW',
    totalAmount: 15000,
    submittedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  }
];

// Local state retrieval helper
const getStoredData = <T>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(stored) as T;
  } catch (e) {
    return defaultValue;
  }
};

const setStoredData = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const mockApi = {
  // --- RAFFLE ENDPOINTS ---
  async getActiveRaffle(): Promise<Raffle> {
    await delay(300);
    return getStoredData(STORAGE_KEYS.RAFFLE, DEFAULT_RAFFLE);
  },

  async updateRaffle(raffle: Raffle): Promise<Raffle> {
    await delay(400);
    setStoredData(STORAGE_KEYS.RAFFLE, raffle);
    return raffle;
  },

  async createNewRaffle(title: string, description: string, price: number, totalTicketsCount: number, bank: BankInfo): Promise<Raffle> {
    await delay(500);
    const newRaffle: Raffle = {
      id: `raffle-${Date.now()}`,
      title,
      description,
      ticketPrice: price,
      totalTickets: totalTicketsCount,
      bankInfo: bank,
      status: 'ACTIVE',
      winnerNumber: null,
      winnerName: null,
      winnerSellerName: null,
    };
    
    // Write new raffle
    setStoredData(STORAGE_KEYS.RAFFLE, newRaffle);

    // Reset tickets completely for new raffle count
    const sellers = await this.getSellers();
    const cleanTickets: Ticket[] = [];
    for (let i = 1; i <= totalTicketsCount; i++) {
      const assignedSeller = sellers.find(s => s.assignedNumbers.includes(i));
      cleanTickets.push({
        number: i,
        status: 'AVAILABLE',
        sellerId: assignedSeller ? assignedSeller.id : null,
        buyerName: null,
        buyerPhone: null,
        buyerEmail: null,
        receiptUrl: null,
        submittedAt: null,
      });
    }
    setStoredData(STORAGE_KEYS.TICKETS, cleanTickets);
    setStoredData(STORAGE_KEYS.PURCHASES, []); // Clear purchases

    return newRaffle;
  },

  // --- SELLERS ENDPOINTS ---
  async getSellers(): Promise<Seller[]> {
    await delay(300);
    return getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS);
  },

  async createSeller(name: string, phone: string, code: string, assignedNumbers: number[]): Promise<Seller> {
    await delay(400);
    const sellers = getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS);
    
    // Check if code already exists
    const uppercaseCode = code.toUpperCase();
    if (sellers.some(s => s.code === uppercaseCode)) {
      throw new Error(`El código de vendedor "${uppercaseCode}" ya existe. Elige otro.`);
    }

    // Check if any of the requested numbers are already assigned
    const duplicatedNumbers: { number: number, sellerName: string }[] = [];
    assignedNumbers.forEach(n => {
      const existingOwner = sellers.find(s => s.assignedNumbers.includes(n));
      if (existingOwner) {
        duplicatedNumbers.push({ number: n, sellerName: existingOwner.name });
      }
    });

    if (duplicatedNumbers.length > 0) {
      const details = duplicatedNumbers.map(d => `N° ${d.number} (${d.sellerName})`).join(', ');
      throw new Error(`Los siguientes números ya se encuentran asignados a otros vendedores: ${details}.`);
    }

    const newSeller: Seller = {
      id: `sel-${Date.now()}`,
      name,
      phone,
      code: uppercaseCode,
      assignedNumbers,
    };

    sellers.push(newSeller);
    setStoredData(STORAGE_KEYS.SELLERS, sellers);

    // Re-synchronize existing tickets to associate with this seller
    const tickets = getStoredData(STORAGE_KEYS.TICKETS, generateInitialTickets(sellers));
    assignedNumbers.forEach(n => {
      const ticket = tickets.find(t => t.number === n);
      if (ticket) {
        ticket.sellerId = newSeller.id;
      }
    });
    setStoredData(STORAGE_KEYS.TICKETS, tickets);

    return newSeller;
  },

  // Update seller's numbers - no silent stealing, instead throw validation error
  async assignNumbersToSeller(sellerId: string, numbers: number[]): Promise<Seller[]> {
    await delay(400);
    const sellers = getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS);
    const tickets = getStoredData(STORAGE_KEYS.TICKETS, generateInitialTickets(sellers));

    // Check if any number is already assigned to a DIFFERENT seller
    const duplicatedNumbers: { number: number, sellerName: string }[] = [];
    numbers.forEach(n => {
      const existingOwner = sellers.find(s => s.id !== sellerId && s.assignedNumbers.includes(n));
      if (existingOwner) {
        duplicatedNumbers.push({ number: n, sellerName: existingOwner.name });
      }
    });

    if (duplicatedNumbers.length > 0) {
      const details = duplicatedNumbers.map(d => `N° ${d.number} (${d.sellerName})`).join(', ');
      throw new Error(`Los siguientes números ya están asignados a otros vendedores: ${details}.`);
    }

    // Add to specific seller
    const targetSeller = sellers.find(s => s.id === sellerId);
    if (!targetSeller) {
      throw new Error('Vendedor no encontrado');
    }
    
    // Reset target seller numbers to exactly these numbers (or merge them, let's merge or replace depending on normal action)
    // To allow removing/updating of numbers, replacing them or merging is the key. 
    // In our app, we usually set the exact list or append. Let's merge them is fine:
    targetSeller.assignedNumbers = [...new Set([...targetSeller.assignedNumbers, ...numbers])].sort((a,b) => a - b);

    // Update tickets sellerIds
    tickets.forEach(t => {
      // If it belongs to assigned and was someone else's, reassign
      if (numbers.includes(t.number)) {
        t.sellerId = sellerId;
      } else if (t.sellerId === sellerId && !targetSeller.assignedNumbers.includes(t.number)) {
        // If it was of this seller but is no longer in their list, set null
        t.sellerId = null;
      }
    });

    setStoredData(STORAGE_KEYS.SELLERS, sellers);
    setStoredData(STORAGE_KEYS.TICKETS, tickets);
    return sellers;
  },

  // --- TICKETS ENDPOINTS ---
  async getTickets(): Promise<Ticket[]> {
    await delay(300);
    const sellers = getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS);
    return getStoredData(STORAGE_KEYS.TICKETS, generateInitialTickets(sellers));
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
    receiptUrl: string; // Base64 image
    totalPrice: number;
  }): Promise<PurchaseRequest> {
    await delay(600);
    const tickets = getStoredData(STORAGE_KEYS.TICKETS, generateInitialTickets(getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS)));
    const purchases = getStoredData(STORAGE_KEYS.PURCHASES, DEFAULT_PURCHASES);

    // Double check availability
    const unavailable = data.ticketNumbers.filter(n => {
      const t = tickets.find(ticket => ticket.number === n);
      return !t || t.status !== 'AVAILABLE';
    });

    if (unavailable.length > 0) {
      throw new Error(`Los números [${unavailable.join(', ')}] ya no se encuentran disponibles.`);
    }

    // Process tickets - set state to PENDING_REVIEW and set buyer info
    data.ticketNumbers.forEach(n => {
      const t = tickets.find(ticket => ticket.number === n);
      if (t) {
        t.status = 'PENDING_REVIEW';
        t.buyerName = data.buyerName;
        t.buyerPhone = data.buyerPhone;
        t.buyerEmail = data.buyerEmail;
        t.receiptUrl = data.receiptUrl;
        t.submittedAt = new Date().toISOString();
      }
    });

    // Create the purchase request record
    const newPurchase: PurchaseRequest = {
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
      submittedAt: new Date().toISOString(),
    };

    purchases.unshift(newPurchase); // Insert at beginning of reviews
    
    // Save
    setStoredData(STORAGE_KEYS.TICKETS, tickets);
    setStoredData(STORAGE_KEYS.PURCHASES, purchases);

    return newPurchase;
  },

  // --- ADMIN APPROVALS ENDPOINTS ---
  async getPurchases(): Promise<PurchaseRequest[]> {
    await delay(300);
    return getStoredData(STORAGE_KEYS.PURCHASES, DEFAULT_PURCHASES);
  },

  async approvePurchase(purchaseId: string): Promise<PurchaseRequest> {
    await delay(500);
    const purchases = getStoredData(STORAGE_KEYS.PURCHASES, DEFAULT_PURCHASES);
    const tickets = getStoredData(STORAGE_KEYS.TICKETS, generateInitialTickets(getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS)));

    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) {
      throw new Error('Compra no encontrada');
    }

    if (purchase.status !== 'PENDING_REVIEW') {
      throw new Error(`Esta solicitud ya fue procesada y se encuentra: ${purchase.status}`);
    }

    // Mark purchase status APPROVED
    purchase.status = 'APPROVED';
    purchase.notes = 'Acreditación / Pago confirmado. Aprobado por administración.';

    // Mark tickets status SOLD
    purchase.ticketNumbers.forEach(num => {
      const ticket = tickets.find(t => t.number === num);
      if (ticket) {
        ticket.status = 'SOLD';
      }
    });

    setStoredData(STORAGE_KEYS.PURCHASES, purchases);
    setStoredData(STORAGE_KEYS.TICKETS, tickets);

    return purchase;
  },

  async rejectPurchase(purchaseId: string, reason: string): Promise<PurchaseRequest> {
    await delay(500);
    const purchases = getStoredData(STORAGE_KEYS.PURCHASES, DEFAULT_PURCHASES);
    const tickets = getStoredData(STORAGE_KEYS.TICKETS, generateInitialTickets(getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS)));

    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) {
      throw new Error('Compra no encontrada');
    }

    if (purchase.status !== 'PENDING_REVIEW') {
      throw new Error(`Esta solicitud ya fue procesada y se encuentra: ${purchase.status}`);
    }

    // Revert tickets status to AVAILABLE and clear buyer details
    purchase.ticketNumbers.forEach(num => {
      const ticket = tickets.find(t => t.number === num);
      if (ticket) {
        ticket.status = 'AVAILABLE';
        ticket.buyerName = null;
        ticket.buyerPhone = null;
        ticket.buyerEmail = null;
        ticket.receiptUrl = null;
        ticket.submittedAt = null;
      }
    });

    // Remove the purchase from the stored purchases so it is completely deleted from the admin panel
    const updatedPurchases = purchases.filter(p => p.id !== purchaseId);

    setStoredData(STORAGE_KEYS.PURCHASES, updatedPurchases);
    setStoredData(STORAGE_KEYS.TICKETS, tickets);

    purchase.status = 'REJECTED';
    return purchase;
  },

  // --- SWEEPSTAKES / WINNER SELECTION ---
  async drawWinner(): Promise<{ ticket: Ticket | null, error?: string }> {
    await delay(800);
    const tickets = getStoredData(STORAGE_KEYS.TICKETS, generateInitialTickets(getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS)));
    const activeRaffle = getStoredData(STORAGE_KEYS.RAFFLE, DEFAULT_RAFFLE);
    const sellers = getStoredData(STORAGE_KEYS.SELLERS, DEFAULT_SELLERS);

    // Find sold tickets
    const soldTickets = tickets.filter(t => t.status === 'SOLD');
    if (soldTickets.length === 0) {
      return { ticket: null, error: 'No se encontraron números con estado VENDIDO (SOLD) para realizar el sorteo.' };
    }

    // Select random ticket
    const randomIndex = Math.floor(Math.random() * soldTickets.length);
    const winnerTicket = soldTickets[randomIndex];

    // Find seller name
    const wSeller = sellers.find(s => s.id === winnerTicket.sellerId);
    
    // Update Active Raffle with winner info
    activeRaffle.winnerNumber = winnerTicket.number;
    activeRaffle.winnerName = winnerTicket.buyerName;
    activeRaffle.winnerSellerName = wSeller ? wSeller.name : 'Vendedor Desconocido';
    activeRaffle.status = 'FINISHED';

    setStoredData(STORAGE_KEYS.RAFFLE, activeRaffle);

    return { ticket: winnerTicket };
  },

  async resetWinner(): Promise<Raffle> {
    const raffle = getStoredData(STORAGE_KEYS.RAFFLE, DEFAULT_RAFFLE);
    raffle.status = 'ACTIVE';
    raffle.winnerNumber = null;
    raffle.winnerName = null;
    raffle.winnerSellerName = null;
    setStoredData(STORAGE_KEYS.RAFFLE, raffle);
    return raffle;
  },

  // Simple state reset tool for demo
  async resetAllToDefaults(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.RAFFLE);
    localStorage.removeItem(STORAGE_KEYS.SELLERS);
    localStorage.removeItem(STORAGE_KEYS.TICKETS);
    localStorage.removeItem(STORAGE_KEYS.PURCHASES);
    await delay(300);
  }
};
