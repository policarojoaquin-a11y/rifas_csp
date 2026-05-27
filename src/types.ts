/**
 * Types representing the models for the Online Raffle application.
 * Fully prepared to map to a REST API.
 */

export interface Seller {
  id: string;
  name: string;
  phone: string;
  code: string; // Unique identifier or shortcode
  assignedNumbers: number[]; // Numbers assigned to this seller
}

export interface BankInfo {
  bankName: string;
  accountHolder: string;
  alias: string;
  cbu: string;
  accountNumber?: string;
  cuit?: string;
}

export interface Raffle {
  id: string;
  title: string;
  description: string;
  ticketPrice: number;
  totalTickets: number; // e.g. 100 or 1000
  bankInfo: BankInfo;
  status: 'ACTIVE' | 'FINISHED';
  winnerNumber: number | null;
  winnerName: string | null;
  winnerSellerName: string | null;
}

export type TicketStatus = 'AVAILABLE' | 'PENDING_REVIEW' | 'SOLD';

export interface Ticket {
  number: number;
  status: TicketStatus;
  sellerId: string | null;      // Which seller is assigned to this ticket number
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  receiptUrl: string | null;
  submittedAt: string | null;
}

export type PurchaseStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface PurchaseRequest {
  id: string;
  raffleId: string;
  sellerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  ticketNumbers: number[];
  receiptUrl: string; // Base64 or mock image URL representing the loaded voucher
  status: PurchaseStatus;
  totalAmount: number;
  submittedAt: string;
  notes?: string;
}
