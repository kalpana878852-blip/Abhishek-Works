import { firestoreService } from './firestoreService.ts';
import {
  BankAccount,
  CompanySettings,
  Customer,
  DocSequenceConfig,
  Document,
  DocumentType,
  Payment,
  Product,
} from '../types.ts';

/**
 * Production Firebase-Exclusive API Client for ManufactureQuote AI.
 * Completely eliminates "Failed to fetch" errors by interfacing directly
 * with Google Cloud Firestore and Firebase Storage using the Firebase JavaScript SDK.
 */
export const api = {
  // Company Settings & Branding
  getCompanySettings: (): Promise<CompanySettings> => firestoreService.getCompanySettings(),
  updateCompanySettings: (data: Partial<CompanySettings>, _token?: string): Promise<CompanySettings> =>
    firestoreService.updateCompanySettings(data),
  restoreLogo: (_token?: string): Promise<{ logoUrl: string }> => firestoreService.restoreLogo(),
  uploadAsset: (file: File | Blob, folder?: string): Promise<string> =>
    firestoreService.uploadStorageFile(file, folder),

  // Bank Accounts Management
  addBankAccount: (account: Omit<BankAccount, 'id'>): Promise<BankAccount[]> =>
    firestoreService.addBankAccount(account),
  updateBankAccount: (id: string, updated: Partial<BankAccount>): Promise<BankAccount[]> =>
    firestoreService.updateBankAccount(id, updated),
  deleteBankAccount: (id: string): Promise<BankAccount[]> =>
    firestoreService.deleteBankAccount(id),
  setDefaultBankAccount: (id: string): Promise<BankAccount[]> =>
    firestoreService.setDefaultBankAccount(id),

  // Customers Management
  getCustomers: (): Promise<Customer[]> => firestoreService.getCustomers(),
  getCustomer: (id: number | string): Promise<Customer> => firestoreService.getCustomer(id),
  getCustomerLedger: (id: number | string) => firestoreService.getCustomerLedger(id),
  createCustomer: (data: Partial<Customer>, _token?: string): Promise<Customer> =>
    firestoreService.createCustomer(data),
  updateCustomer: (id: number | string, data: Partial<Customer>, _token?: string): Promise<Customer> =>
    firestoreService.updateCustomer(id, data),
  deleteCustomer: (id: number | string, _token?: string): Promise<{ success: boolean; archived: boolean; message: string }> =>
    firestoreService.deleteCustomer(id),
  archiveCustomer: (id: number | string, archive?: boolean): Promise<Customer> =>
    firestoreService.archiveCustomer(id, archive),

  // Products Catalog
  getProducts: (): Promise<Product[]> => firestoreService.getProducts(),
  createProduct: (data: Partial<Product>, _token?: string): Promise<Product> =>
    firestoreService.createProduct(data),
  updateProduct: (id: number | string, data: Partial<Product>, _token?: string): Promise<Product> =>
    firestoreService.updateProduct(id, data),
  deleteProduct: (id: number | string, _token?: string): Promise<{ success: boolean }> =>
    firestoreService.deleteProduct(id),

  // Billing Documents
  getDocuments: (docType?: DocumentType): Promise<Document[]> => firestoreService.getDocuments(docType),
  getDocument: (id: number | string): Promise<Document> => firestoreService.getDocument(id),
  getNextNumber: (docType: DocumentType, commit: boolean = false): Promise<{ docNumber: string }> =>
    firestoreService.getNextNumber(docType, commit),
  createDocument: (data: Partial<Document>, _token?: string): Promise<Document> =>
    firestoreService.createDocument(data),
  updateDocument: (id: number | string, data: Partial<Document>, _token?: string): Promise<Document> =>
    firestoreService.updateDocument(id, data),
  deleteDocument: (id: number | string, _token?: string): Promise<{ success: boolean }> =>
    firestoreService.deleteDocument(id),
  convertDocument: (id: number | string, targetDocType: DocumentType, _token?: string): Promise<Document> =>
    firestoreService.convertDocument(id, targetDocType),

  // Payments & Receipts
  getPayments: (): Promise<Payment[]> => firestoreService.getPayments(),
  createPayment: (data: Partial<Payment>, _token?: string): Promise<Payment> =>
    firestoreService.createPayment(data),
  deletePayment: (id: number | string, _token?: string): Promise<{ success: boolean }> =>
    firestoreService.deletePayment(id),

  // Document Numbering Sequences
  getSequences: (): Promise<DocSequenceConfig[]> => firestoreService.getSequences(),
  updateSequence: (docType: string, config: any, _token?: string): Promise<DocSequenceConfig> =>
    firestoreService.updateSequence(docType, config),

  // Reports & Analytics
  getReportsSummary: () => firestoreService.getReportsSummary(),
};
