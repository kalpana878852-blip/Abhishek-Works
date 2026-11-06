import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

// Users table for Firebase Auth
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('admin').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Company Settings table
export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull().default('ABHISHEK ENGINEERING WORKS'),
  tagline: text('tagline').default('Precision Engineering & Manufacturing Experts'),
  gstin: text('gstin').default('27AAACA0000A1Z5'),
  pan: text('pan').default('AAACA0000A'),
  state: text('state').default('Maharashtra'),
  stateCode: text('state_code').default('27'),
  address: text('address').default('Plot No. W-45, MIDC Industrial Area, Phase II'),
  city: text('city').default('Pune'),
  pincode: text('pincode').default('411026'),
  phone: text('phone').default('+91 98220 12345'),
  altPhone: text('alt_phone').default('+91 98220 54321'),
  email: text('email').default('accounts@abhishekengineering.com'),
  website: text('website').default('www.abhishekengineering.com'),
  logoUrl: text('logo_url'),
  sealUrl: text('seal_url'),
  signatureUrl: text('signature_url'),
  upiId: text('upi_id').default('abhishekengg@okaxis'),
  upiPayeeName: text('upi_payee_name').default('ABHISHEK ENGINEERING WORKS'),
  paymentTerms: text('payment_terms').default('Payment within 30 days of invoice date. 18% p.a. interest charged on delayed payments.'),
  deliveryTerms: text('delivery_terms').default('Ex-Works Pune / Transporter godown delivery. Freight extra as actuals.'),
  warrantyTerms: text('warranty_terms').default('12 months manufacturer warranty against machining & material defects.'),
  bankAccounts: jsonb('bank_accounts').$type<Array<{
    id: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    accountType: string;
    isDefault: boolean;
  }>>().default([
    {
      id: 'bank-1',
      bankName: 'State Bank of India',
      accountHolder: 'ABHISHEK ENGINEERING WORKS',
      accountNumber: '389012345678',
      ifsc: 'SBIN0001234',
      branch: 'MIDC Bhosari Industrial Branch, Pune',
      accountType: 'Current Account',
      isDefault: true
    },
    {
      id: 'bank-2',
      bankName: 'HDFC Bank Ltd',
      accountHolder: 'ABHISHEK ENGINEERING WORKS',
      accountNumber: '50200045678912',
      ifsc: 'HDFC0000142',
      branch: 'Pimpri Chinchwad Branch, Pune',
      accountType: 'Current Account',
      isDefault: false
    }
  ]),
  enableUpiQr: boolean('enable_upi_qr').default(true).notNull(),
  enableBankDetails: boolean('enable_bank_details').default(true).notNull(),
  uploadedQrUrl: text('uploaded_qr_url'),
  qrMode: text('qr_mode').default('dynamic'), // 'dynamic' | 'uploaded'
  paymentNote: text('payment_note').default('Payment for AEW Invoice'),
  qrVisibility: jsonb('qr_visibility').$type<{
    tax_invoice: boolean;
    quotation: boolean;
    proforma_invoice: boolean;
    payment_receipt: boolean;
    delivery_challan: boolean;
    eway_bill: boolean;
    echallan: boolean;
  }>().default({
    tax_invoice: true,
    quotation: true,
    proforma_invoice: true,
    payment_receipt: true,
    delivery_challan: false,
    eway_bill: false,
    echallan: false,
  }),
  bankVisibility: jsonb('bank_visibility').$type<{
    tax_invoice: boolean;
    quotation: boolean;
    proforma_invoice: boolean;
    payment_receipt: boolean;
    delivery_challan: boolean;
    eway_bill: boolean;
    echallan: boolean;
  }>().default({
    tax_invoice: true,
    quotation: true,
    proforma_invoice: true,
    payment_receipt: true,
    delivery_challan: false,
    eway_bill: false,
    echallan: false,
  }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Customers table
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  companyName: text('company_name').notNull(),
  gstin: text('gstin'),
  pan: text('pan'),
  phone: text('phone').notNull(),
  email: text('email'),
  billingAddress: text('billing_address').notNull(),
  shippingAddress: text('shipping_address'),
  city: text('city').default('Pune'),
  state: text('state').notNull().default('Maharashtra'),
  stateCode: text('state_code').notNull().default('27'),
  pincode: text('pincode'),
  openingBalance: doublePrecision('opening_balance').default(0).notNull(),
  currentBalance: doublePrecision('current_balance').default(0).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products / Spare Parts / Job Work services
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  description: text('description'),
  hsn: text('hsn').notNull(),
  unit: text('unit').notNull().default('NOS'), // NOS, PCS, SET, KG, MTR, TON
  rate: doublePrecision('rate').notNull(),
  gstRate: doublePrecision('gst_rate').notNull().default(18), // 0, 5, 12, 18, 28
  cessRate: doublePrecision('cess_rate').default(0),
  minStock: integer('min_stock').default(10),
  currentStock: integer('current_stock').default(100),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Documents Table (Tax Invoices, Quotations, Proforma, E-Way Bill, Challans, Receipts)
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  docType: text('doc_type').notNull(), // 'tax_invoice' | 'quotation' | 'proforma_invoice' | 'eway_bill' | 'delivery_challan' | 'echallan' | 'payment_receipt'
  docNumber: text('doc_number').notNull().unique(),
  date: text('date').notNull(), // YYYY-MM-DD
  dueDate: text('due_date'),
  customerId: integer('customer_id').references(() => customers.id),
  customerName: text('customer_name').notNull(),
  customerCompany: text('customer_company').notNull(),
  customerGstin: text('customer_gstin'),
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),
  billingAddress: text('billing_address').notNull(),
  shippingAddress: text('shipping_address'),
  customerState: text('customer_state').notNull().default('Maharashtra'),
  customerStateCode: text('customer_state_code').notNull().default('27'),
  placeOfSupply: text('place_of_supply').notNull().default('27-Maharashtra'),
  supplyType: text('supply_type').notNull().default('intra_state'), // 'intra_state' (CGST+SGST) | 'inter_state' (IGST)
  reverseCharge: boolean('reverse_charge').default(false).notNull(),
  poNumber: text('po_number'),
  poDate: text('po_date'),
  vehicleNumber: text('vehicle_number'),
  transporterName: text('transporter_name'),
  
  items: jsonb('items').$type<Array<{
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
  }>>().notNull(),

  subtotal: doublePrecision('subtotal').notNull(),
  discountTotal: doublePrecision('discount_total').default(0).notNull(),
  taxableTotal: doublePrecision('taxable_total').notNull(),
  cgstTotal: doublePrecision('cgst_total').default(0).notNull(),
  sgstTotal: doublePrecision('sgst_total').default(0).notNull(),
  igstTotal: doublePrecision('igst_total').default(0).notNull(),
  freightCharges: doublePrecision('freight_charges').default(0).notNull(),
  packagingCharges: doublePrecision('packaging_charges').default(0).notNull(),
  roundOff: doublePrecision('round_off').default(0).notNull(),
  grandTotal: doublePrecision('grand_total').notNull(),
  totalInWords: text('total_in_words').notNull(),

  status: text('status').default('issued').notNull(), // 'draft' | 'issued' | 'paid' | 'partially_paid' | 'cancelled'
  paidAmount: doublePrecision('paid_amount').default(0).notNull(),
  balanceAmount: doublePrecision('balance_amount').notNull(),

  upiQrEnabled: boolean('upi_qr_enabled').default(true).notNull(),
  bankDetailsEnabled: boolean('bank_details_enabled').default(true).notNull(),
  selectedBankId: text('selected_bank_id'),

  referenceDocType: text('reference_doc_type'),
  referenceDocId: integer('reference_doc_id'),
  referenceDocNumber: text('reference_doc_number'),

  ewayBillDetails: jsonb('eway_bill_details').$type<{
    ewayBillNumber?: string;
    ewayBillDate?: string;
    transporterId?: string;
    transporterName?: string;
    transportMode?: 'Road' | 'Rail' | 'Air' | 'Ship';
    distanceKm?: number;
    vehicleNumber?: string;
    validUntil?: string;
    supplyTypeReason?: string;
  }>(),

  challanDetails: jsonb('challan_details').$type<{
    challanType?: 'job_work' | 'supply_on_approval' | 'line_sale' | 'removal_for_repair' | 'other';
    dispatchDate?: string;
    natureOfProcessing?: string;
    expectedReturnDate?: string;
    receiverContact?: string;
  }>(),

  notes: text('notes'),
  terms: text('terms'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Payments Table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  documentId: integer('document_id').references(() => documents.id),
  documentNumber: text('document_number'),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  customerName: text('customer_name').notNull(),
  amount: doublePrecision('amount').notNull(),
  paymentDate: text('payment_date').notNull(), // YYYY-MM-DD
  paymentMode: text('payment_mode').notNull().default('neft_rtgs'), // 'upi' | 'neft_rtgs' | 'cheque' | 'cash'
  referenceNo: text('reference_no'),
  bankAccount: text('bank_account'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Numbering sequences table
export const docSequences = pgTable('doc_sequences', {
  id: serial('id').primaryKey(),
  docType: text('doc_type').notNull(), // 'tax_invoice' | 'quotation' | 'proforma_invoice' | 'eway_bill' | 'delivery_challan' | 'echallan' | 'payment_receipt'
  year: text('year').notNull(), // '2026'
  prefix: text('prefix').notNull(), // e.g. 'AEW/TI' or 'AEW/QTN'
  startingNumber: integer('starting_number').default(1).notNull(),
  currentNumber: integer('current_number').notNull().default(0),
  padding: integer('padding').default(3).notNull(),
  separator: text('separator').default('/').notNull(),
});

