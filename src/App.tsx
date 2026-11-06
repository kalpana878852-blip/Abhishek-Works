import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, ActiveTab } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { DocumentEditor } from './components/DocumentEditor.tsx';
import { DocumentPreview } from './components/DocumentPreview.tsx';
import { DocumentList } from './components/DocumentList.tsx';
import { CustomerManager } from './components/CustomerManager.tsx';
import { CustomerLedger } from './components/CustomerLedger.tsx';
import { ProductManager } from './components/ProductManager.tsx';
import { PaymentsManager } from './components/PaymentsManager.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { CompanySettingsView } from './components/CompanySettingsView.tsx';
import { CompanySettings, Customer, Document, DocumentType, Payment, Product } from './types.ts';
import { api } from './services/apiClient.ts';
import { numberToIndianWords } from './utils/indianCurrency.ts';

function formatPaymentAsReceiptDocument(payment: Payment, customers: Customer[]): Document {
  const cust = customers.find((c) => c.id === payment.customerId);
  return {
    id: payment.id,
    docType: 'payment_receipt',
    docNumber: payment.receiptNumber,
    date: payment.paymentDate,
    customerId: payment.customerId,
    customerName: payment.customerName,
    customerCompany: cust?.companyName || payment.customerName,
    customerGstin: cust?.gstin || '',
    customerPhone: cust?.phone || '',
    customerEmail: cust?.email || '',
    billingAddress: cust?.billingAddress || '',
    shippingAddress: cust?.shippingAddress || cust?.billingAddress || '',
    customerState: cust?.state || 'Maharashtra',
    customerStateCode: cust?.stateCode || '27',
    placeOfSupply: `${cust?.stateCode || '27'}-${cust?.state || 'Maharashtra'}`,
    supplyType: 'intra_state',
    reverseCharge: false,
    items: [
      {
        id: `pr-${payment.id}`,
        name: `Payment Received via ${payment.paymentMode.toUpperCase()}${payment.referenceNo ? ` (Ref: ${payment.referenceNo})` : ''}`,
        description: payment.notes || (payment.documentNumber ? `Against Invoice ${payment.documentNumber}` : 'Payment on account'),
        hsn: '9983',
        quantity: 1,
        unit: 'LOT',
        rate: payment.amount,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: payment.amount,
        gstRate: 0,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        total: payment.amount,
      },
    ],
    subtotal: payment.amount,
    discountTotal: 0,
    taxableTotal: payment.amount,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0,
    freightCharges: 0,
    packagingCharges: 0,
    roundOff: 0,
    grandTotal: payment.amount,
    totalInWords: numberToIndianWords(payment.amount),
    status: 'paid',
    paidAmount: payment.amount,
    balanceAmount: 0,
    referenceDocNumber: payment.documentNumber,
    referenceDocType: payment.documentNumber ? 'tax_invoice' : undefined,
    notes: payment.notes || (payment.referenceNo ? `Transaction Ref: ${payment.referenceNo}` : ''),
    terms: 'This is an authentic computer generated official payment acknowledgement voucher.',
    upiQrEnabled: false,
    bankDetailsEnabled: true,
    createdAt: payment.createdAt,
  };
}

function AppContent() {
  const { token } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Core Data State
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reportsSummary, setReportsSummary] = useState<any>({
    totalSales: 0,
    totalTaxable: 0,
    totalGst: 0,
    totalPaymentsReceived: 0,
    totalOutstanding: 0,
    invoiceCount: 0,
    quotationCount: 0,
    customerCount: 0,
    productCount: 0,
    monthlySales: {},
  });

  // Active Document Viewer/Editor State
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editorDocType, setEditorDocType] = useState<DocumentType>('tax_invoice');

  // Active Ledger Customer
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);

  // Target Doc for Payment Recording
  const [paymentTargetDoc, setPaymentTargetDoc] = useState<Document | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  // Fetch initial data
  const loadAllData = async () => {
    try {
      const [settData, custList, prodList, docList, payList, repSummary] = await Promise.all([
        api.getCompanySettings(),
        api.getCustomers(),
        api.getProducts(),
        api.getDocuments(),
        api.getPayments(),
        api.getReportsSummary(),
      ]);

      setSettings(settData);
      setCustomers(custList);
      setProducts(prodList);
      setDocuments(docList);
      setPayments(payList);
      setReportsSummary(repSummary);
    } catch (err) {
      console.error('Failed to load ERP initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Quick Action Handlers
  const handleNewBill = (docType: DocumentType = 'tax_invoice') => {
    setEditingDoc(null);
    setEditorDocType(docType);
    setActiveDoc(null);
    setActiveTab('create_bill');
  };

  const handleViewDoc = (doc: Document) => {
    setActiveDoc(doc);
    setEditingDoc(null);
  };

  const handleEditDoc = (doc: Document) => {
    setEditingDoc(doc);
    setEditorDocType(doc.docType);
    setActiveDoc(null);
    setActiveTab('create_bill');
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await api.deleteDocument(id, token || undefined);
      await loadAllData();
      if (activeDoc?.id === id) setActiveDoc(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSuccess = async (savedDoc: Document, andPreview?: boolean) => {
    await loadAllData();
    if (andPreview) {
      setActiveDoc(savedDoc);
    } else {
      // Navigate to the list of this doc type
      if (savedDoc.docType === 'tax_invoice') setActiveTab('tax_invoices');
      else if (savedDoc.docType === 'quotation') setActiveTab('quotations');
      else if (savedDoc.docType === 'proforma_invoice') setActiveTab('proforma_invoices');
      else if (savedDoc.docType === 'delivery_challan' || savedDoc.docType === 'echallan') setActiveTab('delivery_challans');
      else if (savedDoc.docType === 'eway_bill') setActiveTab('eway_bills');
      else if (savedDoc.docType === 'payment_receipt') setActiveTab('payment_receipts');
      else setActiveTab('dashboard');
    }
  };

  const handleConvertDoc = async (sourceDoc: Document, targetType: DocumentType) => {
    try {
      const converted = await api.convertDocument(sourceDoc.id, targetType, token || undefined);
      await loadAllData();
      setActiveDoc(converted);
    } catch (err) {
      console.error('Conversion failed:', err);
    }
  };

  // Customer handlers
  const handleSaveCustomer = async (custData: Partial<Customer>) => {
    if (custData.id) {
      await api.updateCustomer(custData.id, custData, token || undefined);
    } else {
      await api.createCustomer(custData, token || undefined);
    }
    await loadAllData();
  };

  const handleDeleteCustomer = async (id: number) => {
    await api.deleteCustomer(id, token || undefined);
    await loadAllData();
  };

  const handleViewLedger = (cust: Customer) => {
    setLedgerCustomer(cust);
    setActiveTab('ledger');
    setActiveDoc(null);
  };

  // Product handlers
  const handleSaveProduct = async (prodData: Partial<Product>) => {
    if (prodData.id) {
      await api.updateProduct(prodData.id, prodData, token || undefined);
    } else {
      await api.createProduct(prodData, token || undefined);
    }
    await loadAllData();
  };

  const handleDeleteProduct = async (id: number) => {
    await api.deleteProduct(id, token || undefined);
    await loadAllData();
  };

  // Payment handlers
  const handleSavePayment = async (payData: Partial<Payment>) => {
    await api.createPayment(payData, token || undefined);
    await loadAllData();
  };

  const handleDeletePayment = async (id: number) => {
    await api.deletePayment(id, token || undefined);
    await loadAllData();
  };

  const handleRecordPaymentForDoc = (doc: Document) => {
    setPaymentTargetDoc(doc);
    setActiveTab('payments');
  };

  const handleViewPaymentReceipt = (payment: Payment) => {
    setActiveDoc(formatPaymentAsReceiptDocument(payment, customers));
  };

  // Settings handlers
  const handleSaveSettings = async (updated: Partial<CompanySettings>) => {
    const saved = await api.updateCompanySettings(updated, token || undefined);
    setSettings(saved);
    await loadAllData();
  };

  const handleRestoreLogo = async () => {
    const res = await api.restoreLogo(token || undefined);
    if (settings) {
      setSettings({ ...settings, logoUrl: res.logoUrl });
    }
    await loadAllData();
  };

  // Document Counts for Sidebar
  const documentCounts = {
    tax_invoices: documents.filter((d) => d.docType === 'tax_invoice').length,
    quotations: documents.filter((d) => d.docType === 'quotation').length,
    proforma_invoices: documents.filter((d) => d.docType === 'proforma_invoice').length,
    eway_bills: documents.filter((d) => d.docType === 'eway_bill').length,
    delivery_challans: documents.filter((d) => d.docType === 'delivery_challan' || d.docType === 'echallan').length,
    payment_receipts: payments.length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      <Navbar
        settings={settings}
        onNewBill={() => handleNewBill('tax_invoice')}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setActiveDoc(null);
            if (tab === 'create_bill') {
              handleNewBill('tax_invoice');
            }
          }}
          documentCounts={documentCounts}
        />

        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-65px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
              Initializing Abhishek Engineering Works ERP...
            </div>
          ) : activeDoc ? (
            <DocumentPreview
              document={activeDoc}
              settings={settings || ({} as any)}
              onBack={() => setActiveDoc(null)}
              onEdit={handleEditDoc}
              onConvert={handleConvertDoc}
            />
          ) : activeTab === 'create_bill' ? (
            <DocumentEditor
              settings={settings || ({} as any)}
              customers={customers}
              products={products}
              initialDoc={editingDoc}
              defaultDocType={editorDocType}
              onSaveSuccess={handleSaveSuccess}
              onCancel={() => setActiveTab('dashboard')}
            />
          ) : activeTab === 'dashboard' ? (
            <Dashboard
              summary={reportsSummary}
              recentDocs={documents.slice(0, 8)}
              onViewDoc={handleViewDoc}
              onEditDoc={handleEditDoc}
              onNewDoc={(type) => handleNewBill(type)}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                setActiveDoc(null);
              }}
            />
          ) : activeTab === 'tax_invoices' ? (
            <DocumentList
              docType="tax_invoice"
              title="GST Tax Invoices"
              description="Official B2B Tax Invoices with CGST/SGST/IGST breakdown and Original/Duplicate copies"
              documents={documents.filter((d) => d.docType === 'tax_invoice')}
              onNew={() => handleNewBill('tax_invoice')}
              onView={handleViewDoc}
              onEdit={handleEditDoc}
              onDelete={handleDeleteDoc}
              onRecordPayment={handleRecordPaymentForDoc}
            />
          ) : activeTab === 'quotations' ? (
            <DocumentList
              docType="quotation"
              title="Engineering Quotations"
              description="Precision engineering cost estimates, technical quotes, and convert to invoice"
              documents={documents.filter((d) => d.docType === 'quotation')}
              onNew={() => handleNewBill('quotation')}
              onView={handleViewDoc}
              onEdit={handleEditDoc}
              onDelete={handleDeleteDoc}
            />
          ) : activeTab === 'proforma_invoices' ? (
            <DocumentList
              docType="proforma_invoice"
              title="Proforma Invoices"
              description="Advance commercial estimates and purchase order confirmations"
              documents={documents.filter((d) => d.docType === 'proforma_invoice')}
              onNew={() => handleNewBill('proforma_invoice')}
              onView={handleViewDoc}
              onEdit={handleEditDoc}
              onDelete={handleDeleteDoc}
            />
          ) : activeTab === 'eway_bills' ? (
            <DocumentList
              docType="eway_bill"
              title="E-Way Bills"
              description="Consignment movement passes, vehicle records, and transporter logistics"
              documents={documents.filter((d) => d.docType === 'eway_bill')}
              onNew={() => handleNewBill('eway_bill')}
              onView={handleViewDoc}
              onEdit={handleEditDoc}
              onDelete={handleDeleteDoc}
            />
          ) : activeTab === 'delivery_challans' || activeTab === 'echallans' ? (
            <DocumentList
              docType="delivery_challan"
              title="Delivery Challans & E-Challans"
              description="Dispatch documents for job work, machining processing, and material movement"
              documents={documents.filter((d) => d.docType === 'delivery_challan' || d.docType === 'echallan')}
              onNew={() => handleNewBill('delivery_challan')}
              onView={handleViewDoc}
              onEdit={handleEditDoc}
              onDelete={handleDeleteDoc}
            />
          ) : activeTab === 'payment_receipts' ? (
            <DocumentList
              docType="payment_receipt"
              title="Payment Receipts"
              description="Official payment acknowledgement vouchers and receipts"
              documents={[
                ...documents.filter((d) => d.docType === 'payment_receipt'),
                ...payments
                  .filter((p) => !documents.some((d) => d.docType === 'payment_receipt' && d.docNumber === p.receiptNumber))
                  .map((p) => formatPaymentAsReceiptDocument(p, customers)),
              ]}
              onNew={() => handleNewBill('payment_receipt')}
              onView={handleViewDoc}
              onEdit={handleEditDoc}
              onDelete={handleDeleteDoc}
            />
          ) : activeTab === 'customers' ? (
            <CustomerManager
              customers={customers}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onViewLedger={handleViewLedger}
            />
          ) : activeTab === 'ledger' ? (
            <CustomerLedger
              customers={customers}
              selectedCustomer={ledgerCustomer}
              onSelectCustomer={(c) => setLedgerCustomer(c)}
              onBack={() => setActiveTab('customers')}
              onRecordPayment={(c) => {
                setPaymentTargetDoc(null);
                setActiveTab('payments');
              }}
            />
          ) : activeTab === 'products' ? (
            <ProductManager
              products={products}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          ) : activeTab === 'payments' ? (
            <PaymentsManager
              payments={payments}
              customers={customers}
              invoices={documents.filter((d) => d.docType === 'tax_invoice')}
              onSavePayment={handleSavePayment}
              onDeletePayment={handleDeletePayment}
              onViewReceipt={handleViewPaymentReceipt}
              initialTargetDoc={paymentTargetDoc}
            />
          ) : activeTab === 'reports' ? (
            <ReportsView invoices={documents} />
          ) : activeTab === 'settings' ? (
            <CompanySettingsView
              settings={settings || ({} as any)}
              onSaveSettings={handleSaveSettings}
              onRestoreLogo={handleRestoreLogo}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
