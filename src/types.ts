export type DocumentType = 
  | 'tax_invoice' 
  | 'quotation' 
  | 'proforma_invoice' 
  | 'eway_bill' 
  | 'delivery_challan' 
  | 'echallan' 
  | 'payment_receipt';

export type DocumentCopyType = 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE';

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  accountType: string;
  isDefault: boolean;
}

export interface CompanySettings {
  id?: number;
  companyName: string;
  tagline: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  altPhone: string;
  email: string;
  website: string;
  logoUrl?: string;
  sealUrl?: string;
  signatureUrl?: string;
  upiId: string;
  upiPayeeName: string;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  bankAccounts: BankAccount[];
  enableUpiQr: boolean;
  enableBankDetails: boolean;
  uploadedQrUrl?: string;
  qrMode?: 'dynamic' | 'uploaded';
  paymentNote?: string;
  qrVisibility?: Record<string, boolean>;
  bankVisibility?: Record<string, boolean>;
  updatedAt?: string;
}

export interface DocSequenceConfig {
  id?: number;
  docType: DocumentType;
  year: string;
  prefix: string;
  startingNumber: number;
  currentNumber: number;
  padding: number;
  separator: string;
}

export interface Customer {
  id: number | string;
  name: string;
  companyName: string;
  gstin?: string;
  pan?: string;
  phone: string;
  email?: string;
  billingAddress: string;
  shippingAddress?: string;
  city?: string;
  state: string;
  stateCode: string;
  pincode?: string;
  openingBalance: number;
  currentBalance: number;
  notes?: string;
  status?: 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: number | string;
  name: string;
  sku: string;
  description?: string;
  hsn: string;
  unit: string;
  rate: number;
  gstRate: number;
  cessRate?: number;
  minStock?: number;
  currentStock?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentItem {
  id: string;
  productId?: number;
  name: string;
  description?: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  total: number;
}

export interface EwayBillDetails {
  ewayBillNumber?: string;
  ewayBillDate?: string;
  transporterId?: string;
  transporterName?: string;
  transportMode?: 'Road' | 'Rail' | 'Air' | 'Ship';
  distanceKm?: number;
  vehicleNumber?: string;
  validUntil?: string;
  supplyTypeReason?: string;
}

export interface ChallanDetails {
  challanType?: 'job_work' | 'supply_on_approval' | 'line_sale' | 'removal_for_repair' | 'other';
  dispatchDate?: string;
  natureOfProcessing?: string;
  expectedReturnDate?: string;
  receiverContact?: string;
}

export interface Document {
  id: number | string;
  docType: DocumentType;
  docNumber: string;
  date: string;
  dueDate?: string;
  customerId?: number | string;
  customerName: string;
  customerCompany: string;
  customerGstin?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: string;
  shippingAddress?: string;
  customerState: string;
  customerStateCode: string;
  placeOfSupply: string;
  supplyType: 'intra_state' | 'inter_state';
  reverseCharge: boolean;
  poNumber?: string;
  poDate?: string;
  vehicleNumber?: string;
  transporterName?: string;
  
  items: DocumentItem[];

  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  freightCharges: number;
  packagingCharges: number;
  roundOff: number;
  grandTotal: number;
  totalInWords: string;

  status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'cancelled';
  paidAmount: number;
  balanceAmount: number;

  upiQrEnabled: boolean;
  bankDetailsEnabled: boolean;
  selectedBankId?: string;

  referenceDocType?: string;
  referenceDocId?: number;
  referenceDocNumber?: string;

  ewayBillDetails?: EwayBillDetails;
  challanDetails?: ChallanDetails;

  notes?: string;
  terms?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: number | string;
  receiptNumber: string;
  documentId?: number | string;
  documentNumber?: string;
  customerId: number | string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMode: 'neft_rtgs' | 'upi' | 'cheque' | 'cash';
  referenceNo?: string;
  bankAccount?: string;
  notes?: string;
  createdAt?: string;
}

export interface LedgerEntry {
  date: string;
  type: 'INVOICE' | 'PAYMENT';
  refNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}
