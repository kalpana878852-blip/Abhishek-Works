import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase.ts';
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

export const COMPANY_ID = 'abhishek-engineering-works';

// Default Clean Company Settings adhering to Strict Real Business Data Policy
export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'ABHISHEK ENGINEERING WORKS',
  tagline: '',
  gstin: '',
  pan: '',
  state: 'Maharashtra',
  stateCode: '27',
  address: '',
  city: '',
  pincode: '',
  phone: '',
  altPhone: '',
  email: '',
  website: '',
  logoUrl: '/src/assets/images/aew_industrial_logo_1793881800693.jpg',
  upiId: '',
  upiPayeeName: 'ABHISHEK ENGINEERING WORKS',
  paymentNote: 'Payment for AEW Invoice',
  uploadedQrUrl: '',
  qrMode: 'dynamic',
  enableUpiQr: true,
  enableBankDetails: true,
  qrVisibility: {
    tax_invoice: true,
    quotation: true,
    proforma_invoice: true,
    payment_receipt: true,
    delivery_challan: false,
    eway_bill: false,
    echallan: false,
  },
  bankVisibility: {
    tax_invoice: true,
    quotation: true,
    proforma_invoice: true,
    payment_receipt: true,
    delivery_challan: false,
    eway_bill: false,
    echallan: false,
  },
  bankAccounts: [], // Strict Real Business Data: Empty until user adds real accounts
  paymentTerms: '',
  deliveryTerms: '',
  warrantyTerms: '',
};

// Default Numbering sequence seeds
export const DEFAULT_SEQUENCES: Record<DocumentType, { prefix: string; year: string }> = {
  tax_invoice: { prefix: 'AEW/TI', year: '2026' },
  quotation: { prefix: 'AEW/QTN', year: '2026' },
  proforma_invoice: { prefix: 'AEW/PI', year: '2026' },
  eway_bill: { prefix: 'AEW/EWB', year: '2026' },
  delivery_challan: { prefix: 'AEW/DC', year: '2026' },
  echallan: { prefix: 'AEW/EC', year: '2026' },
  payment_receipt: { prefix: 'AEW/PR', year: '2026' },
};

function formatDocNumber(prefix: string, year: string, num: number, padding: number = 3, separator: string = '/'): string {
  const cleanPrefix = (prefix || 'AEW/DOC').replace(/\/+$/, '').trim();
  const cleanYear = (year || '').replace(/^\/+|\/+$/g, '').trim();
  const paddedNum = String(num).padStart(Math.max(1, padding), '0');
  const sep = separator || '/';
  return cleanYear ? `${cleanPrefix}${sep}${cleanYear}${sep}${paddedNum}` : `${cleanPrefix}${sep}${paddedNum}`;
}

export const firestoreService = {
  // ----------------------------------------------------
  // 1. Company Profile & Settings
  // ----------------------------------------------------
  async getCompanySettings(): Promise<CompanySettings> {
    const path = `companies/${COMPANY_ID}`;
    try {
      const companyRef = doc(db, 'companies', COMPANY_ID);
      const snapshot = await getDoc(companyRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<CompanySettings>;
        return {
          ...DEFAULT_COMPANY_SETTINGS,
          ...data,
          bankAccounts: Array.isArray(data.bankAccounts) ? data.bankAccounts : [],
        };
      }

      // Initialize default clean settings in Firestore
      await setDoc(companyRef, {
        ...DEFAULT_COMPANY_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return DEFAULT_COMPANY_SETTINGS;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async updateCompanySettings(data: Partial<CompanySettings>): Promise<CompanySettings> {
    const path = `companies/${COMPANY_ID}`;
    try {
      const companyRef = doc(db, 'companies', COMPANY_ID);
      const cleanData: any = { ...data };
      delete cleanData.id;

      // Filter out undefined values to avoid Firestore errors
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined) delete cleanData[key];
      });

      cleanData.updatedAt = new Date().toISOString();
      await setDoc(companyRef, cleanData, { merge: true });

      const updatedSnap = await getDoc(companyRef);
      return {
        ...DEFAULT_COMPANY_SETTINGS,
        ...(updatedSnap.data() as Partial<CompanySettings>),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async restoreLogo(): Promise<{ logoUrl: string }> {
    const defaultLogo = '/src/assets/images/aew_industrial_logo_1793881800693.jpg';
    await this.updateCompanySettings({ logoUrl: defaultLogo });
    return { logoUrl: defaultLogo };
  },

  async uploadStorageFile(file: File | Blob, folder: string = 'branding'): Promise<string> {
    const fileName = `${Date.now()}_${(file as File).name || 'asset.png'}`;
    const storagePath = `companies/${COMPANY_ID}/${folder}/${fileName}`;
    const fileRef = ref(storage, storagePath);

    try {
      await uploadBytes(fileRef, file, {
        cacheControl: 'public, max-age=31536000',
      });
      return await getDownloadURL(fileRef);
    } catch (err) {
      console.warn('Firebase Storage upload failed, falling back to base64 Data URL:', err);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  },

  // ----------------------------------------------------
  // 2. Bank Accounts Management (Direct Firestore)
  // ----------------------------------------------------
  async addBankAccount(account: Omit<BankAccount, 'id'>): Promise<BankAccount[]> {
    const settings = await this.getCompanySettings();
    const accounts = [...(settings.bankAccounts || [])];

    // Duplicate check
    const isDuplicate = accounts.some(
      (b) => b.accountNumber.trim() === account.accountNumber.trim() && b.ifsc.trim().toUpperCase() === account.ifsc.trim().toUpperCase()
    );
    if (isDuplicate) {
      throw new Error(`Bank account ${account.accountNumber} with IFSC ${account.ifsc} already exists.`);
    }

    const newId = `bank-${Date.now()}`;
    const shouldBeDefault = account.isDefault || accounts.length === 0;

    const newAccount: BankAccount = {
      id: newId,
      bankName: account.bankName.trim(),
      accountHolder: account.accountHolder.trim(),
      accountNumber: account.accountNumber.trim(),
      ifsc: account.ifsc.trim().toUpperCase(),
      branch: account.branch.trim(),
      accountType: account.accountType || 'Current Account',
      isDefault: shouldBeDefault,
    };

    const updatedList = accounts.map((b) => (shouldBeDefault ? { ...b, isDefault: false } : b));
    updatedList.push(newAccount);

    await this.updateCompanySettings({ bankAccounts: updatedList });

    // Also persist in subcollection for granular queryability
    const subColRef = doc(db, 'companies', COMPANY_ID, 'bankAccounts', newId);
    await setDoc(subColRef, { ...newAccount, createdAt: new Date().toISOString() });

    return updatedList;
  },

  async updateBankAccount(id: string, updated: Partial<BankAccount>): Promise<BankAccount[]> {
    const settings = await this.getCompanySettings();
    const accounts = [...(settings.bankAccounts || [])];

    const idx = accounts.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Bank account not found');

    const settingDefault = !!updated.isDefault;

    const updatedList = accounts.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          ...updated,
          ifsc: updated.ifsc ? updated.ifsc.toUpperCase() : b.ifsc,
        };
      }
      return settingDefault ? { ...b, isDefault: false } : b;
    });

    await this.updateCompanySettings({ bankAccounts: updatedList });

    const subColRef = doc(db, 'companies', COMPANY_ID, 'bankAccounts', id);
    await setDoc(subColRef, { ...updated, updatedAt: new Date().toISOString() }, { merge: true });

    return updatedList;
  },

  async deleteBankAccount(id: string): Promise<BankAccount[]> {
    const settings = await this.getCompanySettings();
    let accounts = [...(settings.bankAccounts || [])];

    const target = accounts.find((b) => b.id === id);
    if (!target) return accounts;

    accounts = accounts.filter((b) => b.id !== id);

    // If deleted account was default and others remain, designate first as default
    if (target.isDefault && accounts.length > 0) {
      accounts[0].isDefault = true;
    }

    await this.updateCompanySettings({ bankAccounts: accounts });

    try {
      const subColRef = doc(db, 'companies', COMPANY_ID, 'bankAccounts', id);
      await deleteDoc(subColRef);
    } catch (_) {}

    return accounts;
  },

  async setDefaultBankAccount(id: string): Promise<BankAccount[]> {
    return this.updateBankAccount(id, { isDefault: true });
  },

  // ----------------------------------------------------
  // 3. Customer Management
  // ----------------------------------------------------
  async getCustomers(): Promise<Customer[]> {
    const path = `companies/${COMPANY_ID}/customers`;
    try {
      const colRef = collection(db, 'companies', COMPANY_ID, 'customers');
      const snap = await getDocs(colRef);
      const list: Customer[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Customer);
      });
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getCustomer(id: string | number): Promise<Customer> {
    const path = `companies/${COMPANY_ID}/customers/${id}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'customers', String(id));
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Customer not found');
      return { id: snap.id, ...snap.data() } as Customer;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const path = `companies/${COMPANY_ID}/customers`;
    try {
      const customId = data.id ? String(data.id) : `cust-${Date.now()}`;
      const docRef = doc(db, 'companies', COMPANY_ID, 'customers', customId);

      const customerRecord: Customer = {
        id: customId,
        name: data.name || data.companyName || 'Valued Customer',
        companyName: data.companyName || data.name || 'Valued Company',
        gstin: data.gstin ? data.gstin.trim().toUpperCase() : '',
        pan: data.pan ? data.pan.trim().toUpperCase() : '',
        phone: data.phone || '',
        email: data.email || '',
        billingAddress: data.billingAddress || '',
        shippingAddress: data.shippingAddress || data.billingAddress || '',
        city: data.city || '',
        state: data.state || 'Maharashtra',
        stateCode: data.stateCode || '27',
        pincode: data.pincode || '',
        openingBalance: Number(data.openingBalance) || 0,
        currentBalance: Number(data.currentBalance) || Number(data.openingBalance) || 0,
        notes: data.notes || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, customerRecord);
      return customerRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateCustomer(id: string | number, data: Partial<Customer>): Promise<Customer> {
    const path = `companies/${COMPANY_ID}/customers/${id}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'customers', String(id));
      const cleanData: any = { ...data };
      delete cleanData.id;
      cleanData.updatedAt = new Date().toISOString();

      await updateDoc(docRef, cleanData);
      const snap = await getDoc(docRef);
      return { id: snap.id, ...snap.data() } as Customer;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteCustomer(id: string | number): Promise<{ success: boolean; archived: boolean; message: string }> {
    const path = `companies/${COMPANY_ID}/customers/${id}`;
    const custIdStr = String(id);

    try {
      // Check for associated financial history (documents & payments)
      const docsCol = collection(db, 'companies', COMPANY_ID, 'documents');
      const docsQuery = query(docsCol, where('customerId', '==', custIdStr));
      const docsSnap = await getDocs(docsQuery);

      const paymentsCol = collection(db, 'companies', COMPANY_ID, 'payments');
      const paymentsQuery = query(paymentsCol, where('customerId', '==', custIdStr));
      const paymentsSnap = await getDocs(paymentsQuery);

      const hasHistory = !docsSnap.empty || !paymentsSnap.empty;

      if (hasHistory) {
        // Safe Business Archival: do not destructively delete financial history!
        const docRef = doc(db, 'companies', COMPANY_ID, 'customers', custIdStr);
        await updateDoc(docRef, { status: 'archived', updatedAt: new Date().toISOString() });
        return {
          success: true,
          archived: true,
          message: 'Customer has associated invoices or payments. Account has been safely Archived to preserve audit history.',
        };
      }

      // Safe to permanently delete since no financial history is attached
      const docRef = doc(db, 'companies', COMPANY_ID, 'customers', custIdStr);
      await deleteDoc(docRef);
      return {
        success: true,
        archived: false,
        message: 'Customer record removed successfully.',
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async archiveCustomer(id: string | number, archive: boolean = true): Promise<Customer> {
    return this.updateCustomer(id, { status: archive ? 'archived' : 'active' });
  },

  async getCustomerLedger(id: string | number): Promise<{ customer: Customer; openingBalance: number; currentBalance: number; entries: any[] }> {
    const cust = await this.getCustomer(id);
    const custIdStr = String(id);

    const docsCol = collection(db, 'companies', COMPANY_ID, 'documents');
    const docsSnap = await getDocs(query(docsCol, where('customerId', '==', custIdStr)));

    const paymentsCol = collection(db, 'companies', COMPANY_ID, 'payments');
    const paymentsSnap = await getDocs(query(paymentsCol, where('customerId', '==', custIdStr)));

    const entries: any[] = [];

    docsSnap.forEach((d) => {
      const docData = d.data() as Document;
      if (docData.docType === 'tax_invoice' || docData.docType === 'proforma_invoice') {
        entries.push({
          date: docData.date,
          type: 'INVOICE',
          refNo: docData.docNumber,
          description: `${docData.docType === 'tax_invoice' ? 'Tax Invoice' : 'Proforma'} - ${docData.items?.length || 0} item(s)`,
          debit: docData.grandTotal,
          credit: 0,
        });
      }
    });

    paymentsSnap.forEach((p) => {
      const payData = p.data() as Payment;
      entries.push({
        date: payData.paymentDate,
        type: 'PAYMENT',
        refNo: payData.receiptNumber,
        description: `Payment via ${payData.paymentMode?.toUpperCase()}${payData.referenceNo ? ` (Ref: ${payData.referenceNo})` : ''}`,
        debit: 0,
        credit: payData.amount,
      });
    });

    entries.sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = cust.openingBalance || 0;
    const ledgerWithBalance = entries.map((entry) => {
      runningBalance = runningBalance + entry.debit - entry.credit;
      return { ...entry, balance: runningBalance };
    });

    return {
      customer: cust,
      openingBalance: cust.openingBalance || 0,
      currentBalance: runningBalance,
      entries: ledgerWithBalance,
    };
  },

  // ----------------------------------------------------
  // 4. Product Management
  // ----------------------------------------------------
  async getProducts(): Promise<Product[]> {
    const path = `companies/${COMPANY_ID}/products`;
    try {
      const colRef = collection(db, 'companies', COMPANY_ID, 'products');
      const snap = await getDocs(colRef);
      const list: Product[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Product);
      });
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const path = `companies/${COMPANY_ID}/products`;
    try {
      const prodId = data.id ? String(data.id) : `prod-${Date.now()}`;
      const docRef = doc(db, 'companies', COMPANY_ID, 'products', prodId);

      const productRecord: Product = {
        id: prodId,
        name: data.name || 'Machined Component',
        sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
        description: data.description || '',
        hsn: data.hsn || '8483',
        unit: data.unit || 'NOS',
        rate: Number(data.rate) || 0,
        gstRate: Number(data.gstRate) || 18,
        cessRate: Number(data.cessRate) || 0,
        minStock: Number(data.minStock) || 0,
        currentStock: Number(data.currentStock) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, productRecord);
      return productRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateProduct(id: string | number, data: Partial<Product>): Promise<Product> {
    const path = `companies/${COMPANY_ID}/products/${id}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'products', String(id));
      const cleanData: any = { ...data };
      delete cleanData.id;
      cleanData.updatedAt = new Date().toISOString();

      await updateDoc(docRef, cleanData);
      const snap = await getDoc(docRef);
      return { id: snap.id, ...snap.data() } as Product;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteProduct(id: string | number): Promise<{ success: boolean }> {
    const path = `companies/${COMPANY_ID}/products/${id}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'products', String(id));
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // ----------------------------------------------------
  // 5. Document Management
  // ----------------------------------------------------
  async getDocuments(docType?: DocumentType): Promise<Document[]> {
    const path = `companies/${COMPANY_ID}/documents`;
    try {
      const colRef = collection(db, 'companies', COMPANY_ID, 'documents');
      const snap = await getDocs(colRef);
      let list: Document[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Document);
      });

      if (docType) {
        list = list.filter((d) => d.docType === docType);
      }
      return list.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getDocument(id: string | number): Promise<Document> {
    const path = `companies/${COMPANY_ID}/documents/${id}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'documents', String(id));
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Document not found');
      return { id: snap.id, ...snap.data() } as Document;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createDocument(data: Partial<Document>): Promise<Document> {
    const path = `companies/${COMPANY_ID}/documents`;
    try {
      const docType = data.docType || 'tax_invoice';
      const docId = data.id ? String(data.id) : `doc-${Date.now()}`;
      const docRef = doc(db, 'companies', COMPANY_ID, 'documents', docId);

      // Auto-assign and commit sequence number if missing
      let finalDocNumber = data.docNumber;
      if (!finalDocNumber) {
        const next = await this.getNextNumber(docType, true);
        finalDocNumber = next.docNumber;
      }

      const documentRecord: Document = {
        ...data,
        id: docId,
        docType,
        docNumber: finalDocNumber,
        date: data.date || new Date().toISOString().split('T')[0],
        customerId: data.customerId ? String(data.customerId) : undefined,
        customerName: data.customerName || data.customerCompany || 'Customer',
        customerCompany: data.customerCompany || data.customerName || 'Company',
        billingAddress: data.billingAddress || '',
        customerState: data.customerState || 'Maharashtra',
        customerStateCode: data.customerStateCode || '27',
        placeOfSupply: data.placeOfSupply || '27-Maharashtra',
        supplyType: data.supplyType || 'intra_state',
        reverseCharge: !!data.reverseCharge,
        items: data.items || [],
        subtotal: Number(data.subtotal) || 0,
        discountTotal: Number(data.discountTotal) || 0,
        taxableTotal: Number(data.taxableTotal) || 0,
        cgstTotal: Number(data.cgstTotal) || 0,
        sgstTotal: Number(data.sgstTotal) || 0,
        igstTotal: Number(data.igstTotal) || 0,
        freightCharges: Number(data.freightCharges) || 0,
        packagingCharges: Number(data.packagingCharges) || 0,
        roundOff: Number(data.roundOff) || 0,
        grandTotal: Number(data.grandTotal) || 0,
        totalInWords: data.totalInWords || '',
        status: data.status || 'issued',
        paidAmount: Number(data.paidAmount) || 0,
        balanceAmount: Number(data.balanceAmount) ?? Number(data.grandTotal) || 0,
        upiQrEnabled: data.upiQrEnabled ?? true,
        bankDetailsEnabled: data.bankDetailsEnabled ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, documentRecord);

      // If B2B Tax Invoice with customer, update customer's current balance
      if (documentRecord.docType === 'tax_invoice' && documentRecord.customerId) {
        try {
          const custRef = doc(db, 'companies', COMPANY_ID, 'customers', String(documentRecord.customerId));
          const custSnap = await getDoc(custRef);
          if (custSnap.exists()) {
            const currentBal = Number(custSnap.data().currentBalance) || 0;
            await updateDoc(custRef, {
              currentBalance: currentBal + documentRecord.grandTotal,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error('Failed to update customer balance on invoice create:', e);
        }
      }

      return documentRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateDocument(id: string | number, data: Partial<Document>): Promise<Document> {
    const path = `companies/${COMPANY_ID}/documents/${id}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'documents', String(id));
      const cleanData: any = { ...data };
      delete cleanData.id;
      cleanData.updatedAt = new Date().toISOString();

      await updateDoc(docRef, cleanData);
      const snap = await getDoc(docRef);
      return { id: snap.id, ...snap.data() } as Document;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteDocument(id: string | number): Promise<{ success: boolean }> {
    const path = `companies/${COMPANY_ID}/documents/${id}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'documents', String(id));
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const existing = snap.data() as Document;
        // Revert customer balance if tax invoice
        if (existing.docType === 'tax_invoice' && existing.customerId) {
          try {
            const custRef = doc(db, 'companies', COMPANY_ID, 'customers', String(existing.customerId));
            const custSnap = await getDoc(custRef);
            if (custSnap.exists()) {
              const currentBal = Number(custSnap.data().currentBalance) || 0;
              await updateDoc(custRef, {
                currentBalance: Math.max(0, currentBal - existing.grandTotal),
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (_) {}
        }
      }

      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async convertDocument(id: string | number, targetDocType: DocumentType): Promise<Document> {
    const sourceDoc = await this.getDocument(id);
    const nextNum = await this.getNextNumber(targetDocType, true);
    const today = new Date().toISOString().split('T')[0];

    const convertedData: Partial<Document> = {
      ...sourceDoc,
      docType: targetDocType,
      docNumber: nextNum.docNumber,
      date: today,
      referenceDocType: sourceDoc.docType,
      referenceDocId: String(sourceDoc.id) as any,
      referenceDocNumber: sourceDoc.docNumber,
      status: 'issued',
      paidAmount: 0,
      balanceAmount: sourceDoc.grandTotal,
    };

    if (targetDocType === 'delivery_challan') {
      convertedData.challanDetails = {
        challanType: 'job_work',
        dispatchDate: today,
        natureOfProcessing: 'Supply for Finished Machining & Assembly',
        receiverContact: sourceDoc.customerName,
      };
      convertedData.upiQrEnabled = false;
      convertedData.bankDetailsEnabled = false;
    }

    if (targetDocType === 'eway_bill') {
      convertedData.ewayBillDetails = {
        ewayBillNumber: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        ewayBillDate: today,
        vehicleNumber: sourceDoc.vehicleNumber || 'MH-12-RN-4890',
        transporterName: sourceDoc.transporterName || 'VRL Logistics Ltd',
        transportMode: 'Road',
        distanceKm: 45,
      };
    }

    return await this.createDocument(convertedData);
  },

  // ----------------------------------------------------
  // 6. Payments & Collections
  // ----------------------------------------------------
  async getPayments(): Promise<Payment[]> {
    const path = `companies/${COMPANY_ID}/payments`;
    try {
      const colRef = collection(db, 'companies', COMPANY_ID, 'payments');
      const snap = await getDocs(colRef);
      const list: Payment[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Payment);
      });
      return list.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const path = `companies/${COMPANY_ID}/payments`;
    try {
      const payId = data.id ? String(data.id) : `pay-${Date.now()}`;
      const docRef = doc(db, 'companies', COMPANY_ID, 'payments', payId);

      let receiptNumber = data.receiptNumber;
      if (!receiptNumber) {
        const next = await this.getNextNumber('payment_receipt', true);
        receiptNumber = next.docNumber;
      }

      const paymentRecord: Payment = {
        id: payId,
        receiptNumber,
        customerId: String(data.customerId || 'cust-1'),
        customerName: data.customerName || 'Customer',
        documentId: data.documentId ? String(data.documentId) : undefined,
        documentNumber: data.documentNumber || undefined,
        amount: Number(data.amount) || 0,
        paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
        paymentMode: data.paymentMode || 'neft_rtgs',
        referenceNo: data.referenceNo || '',
        bankAccount: data.bankAccount || '',
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
      };

      await setDoc(docRef, paymentRecord);

      // Credit customer balance
      if (paymentRecord.customerId) {
        try {
          const custRef = doc(db, 'companies', COMPANY_ID, 'customers', String(paymentRecord.customerId));
          const custSnap = await getDoc(custRef);
          if (custSnap.exists()) {
            const currentBal = Number(custSnap.data().currentBalance) || 0;
            await updateDoc(custRef, {
              currentBalance: currentBal - paymentRecord.amount,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (_) {}
      }

      // If linked to an invoice, update paid and balance amounts
      if (paymentRecord.documentId) {
        try {
          const invRef = doc(db, 'companies', COMPANY_ID, 'documents', String(paymentRecord.documentId));
          const invSnap = await getDoc(invRef);
          if (invSnap.exists()) {
            const inv = invSnap.data() as Document;
            const newPaid = (inv.paidAmount || 0) + paymentRecord.amount;
            const newBal = Math.max(0, inv.grandTotal - newPaid);
            const newStatus = newBal <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'issued';
            await updateDoc(invRef, {
              paidAmount: newPaid,
              balanceAmount: newBal,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (_) {}
      }

      return paymentRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deletePayment(id: string | number): Promise<{ success: boolean }> {
    const path = `companies/${COMPANY_ID}/payments/${id}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'payments', String(id));
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const payment = snap.data() as Payment;

        // Revert customer balance
        if (payment.customerId) {
          try {
            const custRef = doc(db, 'companies', COMPANY_ID, 'customers', String(payment.customerId));
            const custSnap = await getDoc(custRef);
            if (custSnap.exists()) {
              const currentBal = Number(custSnap.data().currentBalance) || 0;
              await updateDoc(custRef, {
                currentBalance: currentBal + payment.amount,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (_) {}
        }

        // Revert invoice status if linked
        if (payment.documentId) {
          try {
            const invRef = doc(db, 'companies', COMPANY_ID, 'documents', String(payment.documentId));
            const invSnap = await getDoc(invRef);
            if (invSnap.exists()) {
              const inv = invSnap.data() as Document;
              const newPaid = Math.max(0, (inv.paidAmount || 0) - payment.amount);
              const newBal = Math.max(0, inv.grandTotal - newPaid);
              const newStatus = newBal <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'issued';
              await updateDoc(invRef, {
                paidAmount: newPaid,
                balanceAmount: newBal,
                status: newStatus,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (_) {}
        }
      }

      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // ----------------------------------------------------
  // 7. Document Numbering Sequences
  // ----------------------------------------------------
  async getSequences(): Promise<DocSequenceConfig[]> {
    const path = `companies/${COMPANY_ID}/sequences`;
    try {
      const colRef = collection(db, 'companies', COMPANY_ID, 'sequences');
      const snap = await getDocs(colRef);
      const list: DocSequenceConfig[] = [];

      snap.forEach((d) => {
        list.push({ ...d.data() } as DocSequenceConfig);
      });

      // If empty in Firestore, bootstrap initial sequences
      const docTypes: DocumentType[] = [
        'tax_invoice',
        'quotation',
        'proforma_invoice',
        'eway_bill',
        'delivery_challan',
        'echallan',
        'payment_receipt',
      ];

      for (const dt of docTypes) {
        if (!list.some((s) => s.docType === dt)) {
          const seed = DEFAULT_SEQUENCES[dt];
          const newSeq: DocSequenceConfig = {
            docType: dt,
            prefix: seed.prefix,
            year: seed.year,
            startingNumber: 1,
            currentNumber: 0,
            padding: 3,
            separator: '/',
          };
          const seqRef = doc(db, 'companies', COMPANY_ID, 'sequences', dt);
          await setDoc(seqRef, newSeq);
          list.push(newSeq);
        }
      }

      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async updateSequence(docType: string, config: Partial<DocSequenceConfig>): Promise<DocSequenceConfig> {
    const path = `companies/${COMPANY_ID}/sequences/${docType}`;
    try {
      const docRef = doc(db, 'companies', COMPANY_ID, 'sequences', docType);
      await setDoc(
        docRef,
        {
          ...config,
          docType,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const snap = await getDoc(docRef);
      return snap.data() as DocSequenceConfig;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getNextNumber(docType: DocumentType, commit: boolean = false): Promise<{ docNumber: string }> {
    const path = `companies/${COMPANY_ID}/sequences/${docType}`;
    try {
      const seqRef = doc(db, 'companies', COMPANY_ID, 'sequences', docType);
      const seqSnap = await getDoc(seqRef);

      let seq: DocSequenceConfig;
      if (!seqSnap.exists()) {
        const seed = DEFAULT_SEQUENCES[docType] || { prefix: 'AEW/DOC', year: '2026' };
        seq = {
          docType,
          prefix: seed.prefix,
          year: seed.year,
          startingNumber: 1,
          currentNumber: 0,
          padding: 3,
          separator: '/',
        };
        await setDoc(seqRef, seq);
      } else {
        seq = seqSnap.data() as DocSequenceConfig;
      }

      // Find all existing docNumbers to prevent any duplicates
      const docsCol = collection(db, 'companies', COMPANY_ID, 'documents');
      const docsSnap = await getDocs(query(docsCol, where('docType', '==', docType)));
      const existingDocNumbers = new Set<string>();
      docsSnap.forEach((d) => existingDocNumbers.add(d.data().docNumber));

      if (docType === 'payment_receipt') {
        const payCol = collection(db, 'companies', COMPANY_ID, 'payments');
        const paySnap = await getDocs(payCol);
        paySnap.forEach((p) => existingDocNumbers.add(p.data().receiptNumber));
      }

      let testNum = Math.max(seq.currentNumber + 1, seq.startingNumber || 1);
      let candidate = formatDocNumber(seq.prefix, seq.year, testNum, seq.padding || 3, seq.separator || '/');

      // Skip past any already issued numbers
      while (existingDocNumbers.has(candidate)) {
        testNum++;
        candidate = formatDocNumber(seq.prefix, seq.year, testNum, seq.padding || 3, seq.separator || '/');
      }

      if (commit) {
        await updateDoc(seqRef, {
          currentNumber: testNum,
          updatedAt: new Date().toISOString(),
        });
      }

      return { docNumber: candidate };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // ----------------------------------------------------
  // 8. Reports & Dashboard Summary (Real Business Data Only)
  // ----------------------------------------------------
  async getReportsSummary(): Promise<{
    totalSales: number;
    totalTaxable: number;
    totalGst: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalPaymentsReceived: number;
    totalOutstanding: number;
    invoiceCount: number;
    quotationCount: number;
    customerCount: number;
    productCount: number;
    monthlySales: Record<string, number>;
  }> {
    const [docs, payments, customers, products] = await Promise.all([
      this.getDocuments(),
      this.getPayments(),
      this.getCustomers(),
      this.getProducts(),
    ]);

    const activeCustomers = customers.filter((c) => c.status !== 'archived');
    const invoices = docs.filter((d) => d.docType === 'tax_invoice');
    const quotations = docs.filter((d) => d.docType === 'quotation');

    let totalSales = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalOutstanding = 0;
    const monthlySales: Record<string, number> = {};

    invoices.forEach((inv) => {
      totalSales += inv.grandTotal || 0;
      totalTaxable += inv.taxableTotal || 0;
      totalCgst += inv.cgstTotal || 0;
      totalSgst += inv.sgstTotal || 0;
      totalIgst += inv.igstTotal || 0;
      totalOutstanding += inv.balanceAmount ?? (inv.status === 'paid' ? 0 : inv.grandTotal);

      if (inv.date) {
        const mKey = inv.date.substring(0, 7); // YYYY-MM
        monthlySales[mKey] = (monthlySales[mKey] || 0) + (inv.grandTotal || 0);
      }
    });

    const totalPaymentsReceived = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalGst = totalCgst + totalSgst + totalIgst;

    return {
      totalSales,
      totalTaxable,
      totalGst,
      totalCgst,
      totalSgst,
      totalIgst,
      totalPaymentsReceived,
      totalOutstanding,
      invoiceCount: invoices.length,
      quotationCount: quotations.length,
      customerCount: activeCustomers.length,
      productCount: products.length,
      monthlySales,
    };
  },
};
