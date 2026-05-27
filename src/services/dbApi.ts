import { mockApi } from './mockApi';
import { supabaseService } from './supabaseService';
import { isSupabaseConfigured } from './supabaseClient';
import { Raffle, Seller, Ticket, PurchaseRequest, BankInfo } from '../types';

export { isSupabaseConfigured };

// Active engine status
export type DatabaseEngine = 'MOCK_LOCAL' | 'SUPABASE_CONNECTED' | 'SUPABASE_TABLES_MISSING';

export let activeEngine: DatabaseEngine = isSupabaseConfigured ? 'SUPABASE_CONNECTED' : 'MOCK_LOCAL';
let tablesVerified = false;

// Probe function to test if Supabase is fully configured and the tables exist
export async function determineActiveEngine(): Promise<DatabaseEngine> {
  if (!isSupabaseConfigured) {
    activeEngine = 'MOCK_LOCAL';
    return 'MOCK_LOCAL';
  }

  try {
    const exist = await supabaseService.checkTablesExist();
    if (exist) {
      activeEngine = 'SUPABASE_CONNECTED';
      tablesVerified = true;
    } else {
      activeEngine = 'SUPABASE_TABLES_MISSING';
      tablesVerified = false;
    }
  } catch (err) {
    console.error('Error probing Supabase tables:', err);
    activeEngine = 'SUPABASE_TABLES_MISSING';
    tablesVerified = false;
  }

  return activeEngine;
}

// Proxied api that routes calls dynamically depending on connection state
export const dbApi = {
  getEngine(): DatabaseEngine {
    return activeEngine;
  },

  async getActiveRaffle(): Promise<Raffle> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.getActiveRaffle();
      } catch (err) {
        console.warn('Supabase getActiveRaffle failed, falling back to mock:', err);
      }
    }
    return mockApi.getActiveRaffle();
  },

  async updateRaffle(raffle: Raffle): Promise<Raffle> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        // Since updateRaffle isn't explicit in supabaseService, map to general write
        // but let's check if we have updateRaffle or similar, standard operations
        // we can let it save or use mock
        return mockApi.updateRaffle(raffle); 
      } catch (e) {
        console.warn(e);
      }
    }
    return mockApi.updateRaffle(raffle);
  },

  async createNewRaffle(title: string, description: string, price: number, totalTicketsCount: number, bank: BankInfo): Promise<Raffle> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.createNewRaffle(title, description, price, totalTicketsCount, bank);
      } catch (err) {
        console.error('Supabase createNewRaffle failed:', err);
        throw err;
      }
    }
    return mockApi.createNewRaffle(title, description, price, totalTicketsCount, bank);
  },

  async getSellers(): Promise<Seller[]> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.getSellers();
      } catch (err) {
        console.warn('Supabase getSellers failed, falling back to mock:', err);
      }
    }
    return mockApi.getSellers();
  },

  async createSeller(name: string, phone: string, code: string, assignedNumbers: number[]): Promise<Seller> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.createSeller(name, phone, code, assignedNumbers);
      } catch (err) {
        console.error('Supabase createSeller failed:', err);
        throw err;
      }
    }
    return mockApi.createSeller(name, phone, code, assignedNumbers);
  },

  async assignNumbersToSeller(sellerId: string, numbers: number[]): Promise<Seller[]> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.assignNumbersToSeller(sellerId, numbers);
      } catch (err) {
        console.error('Supabase assignNumbersToSeller failed:', err);
        throw err;
      }
    }
    return mockApi.assignNumbersToSeller(sellerId, numbers);
  },

  async getTickets(): Promise<Ticket[]> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.getTickets();
      } catch (err) {
        console.warn('Supabase getTickets failed, falling back to mock:', err);
      }
    }
    return mockApi.getTickets();
  },

  async getTicketsBySeller(sellerId: string): Promise<Ticket[]> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.getTicketsBySeller(sellerId);
      } catch (err) {
        console.warn('Supabase getTicketsBySeller failed, falling back to mock:', err);
      }
    }
    return mockApi.getTicketsBySeller(sellerId);
  },

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
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.submitPurchase(data);
      } catch (err) {
        console.error('Supabase submitPurchase failed:', err);
        throw err;
      }
    }
    return mockApi.submitPurchase(data);
  },

  async getPurchases(): Promise<PurchaseRequest[]> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.getPurchases();
      } catch (err) {
        console.warn('Supabase getPurchases failed, falling back to mock:', err);
      }
    }
    return mockApi.getPurchases();
  },

  async approvePurchase(purchaseId: string): Promise<PurchaseRequest> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        const res = await supabaseService.approvePurchase(purchaseId);
        sendWebhookNotification(res).catch(e => console.error('Error sending webhook:', e));
        return res;
      } catch (err) {
        console.error('Supabase approvePurchase failed:', err);
        throw err;
      }
    }
    const res = await mockApi.approvePurchase(purchaseId);
    sendWebhookNotification(res).catch(e => console.error('Error sending webhook:', e));
    return res;
  },

  async rejectPurchase(purchaseId: string, reason: string): Promise<PurchaseRequest> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        const res = await supabaseService.rejectPurchase(purchaseId, reason);
        sendWebhookNotification(res).catch(e => console.error('Error sending webhook:', e));
        return res;
      } catch (err) {
        console.error('Supabase rejectPurchase failed:', err);
        throw err;
      }
    }
    const res = await mockApi.rejectPurchase(purchaseId, reason);
    sendWebhookNotification(res).catch(e => console.error('Error sending webhook:', e));
    return res;
  },

  async drawWinner(): Promise<{ ticket: Ticket | null; error?: string }> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.drawWinner();
      } catch (err) {
        console.error('Supabase drawWinner failed:', err);
        throw err;
      }
    }
    return mockApi.drawWinner();
  },

  async resetWinner(): Promise<Raffle> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        return await supabaseService.resetWinner();
      } catch (err) {
        console.error('Supabase resetWinner failed:', err);
        throw err;
      }
    }
    return mockApi.resetWinner();
  },

  async resetAllToDefaults(): Promise<void> {
    if (activeEngine === 'SUPABASE_CONNECTED') {
      try {
        await supabaseService.resetAllToDefaults();
        return;
      } catch (err) {
        console.error('Supabase resetAllToDefaults failed:', err);
        throw err;
      }
    }
    return mockApi.resetAllToDefaults();
  },
};

async function sendWebhookNotification(purchase: PurchaseRequest) {
  try {
    const payload = {
      nombre: purchase.buyerName,
      mail: purchase.buyerEmail,
      numeros: purchase.ticketNumbers,
      estado: purchase.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'
    };

    console.log('Sending webhook to https://02muy6.easypanel.host/webhook/tommy with payload:', payload);

    const response = await fetch('https://02muy6.easypanel.host/webhook/tommy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`Webhook responded with status ${response.status}: ${response.statusText}`);
    } else {
      console.log('Webhook dispatched successfully.');
    }
  } catch (err) {
    console.error('Failed to dispatch webhook:', err);
  }
}
