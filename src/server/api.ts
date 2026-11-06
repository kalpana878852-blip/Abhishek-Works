import express from 'express';
import cors from 'cors';
import { db } from '../db/index.ts';
import { companySettings, customers, docSequences, documents, payments, products, users } from '../db/schema.ts';
import { convertNumberToIndianWords, DEFAULT_AEW_LOGO, getAllDocSequences, getNextDocNumber, initializeDatabase, updateDocSequenceConfig } from '../db/repository.ts';
import { desc, eq, sql } from 'drizzle-orm';
import { optionalAuth } from '../middleware/auth.ts';

const api = express();
api.use(cors());
api.use(express.json({ limit: '10mb' }));
api.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure database seed is executed
let isInitialized = false;
async function ensureDbInit() {
  if (!isInitialized) {
    try {
      await initializeDatabase();
      isInitialized = true;
    } catch (e) {
      console.error('Failed to run initial DB seed:', e);
    }
  }
}

// Global middleware to ensure init
api.use(async (_req, _res, next) => {
  await ensureDbInit();
  next();
});

// ----------------------------------------------------
// 1. Company Settings Endpoints
// ----------------------------------------------------
api.get('/api/company-settings', async (_req, res) => {
  try {
    const list = await db.select().from(companySettings).limit(1);
    if (list.length === 0) {
      await initializeDatabase();
      const refetched = await db.select().from(companySettings).limit(1);
      return res.json(refetched[0]);
    }
    res.json(list[0]);
  } catch (error) {
    console.error('Failed to get company settings:', error);
    res.status(500).json({ error: 'Failed to retrieve company settings' });
  }
});

api.put('/api/company-settings', optionalAuth, async (req, res) => {
  try {
    const data = req.body;
    const list = await db.select().from(companySettings).limit(1);
    
    if (list.length === 0) {
      const [inserted] = await db.insert(companySettings).values(data).returning();
      return res.json(inserted);
    }

    const [updated] = await db.update(companySettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(companySettings.id, list[0].id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Failed to update company settings:', error);
    res.status(500).json({ error: 'Failed to update company settings' });
  }
});

api.post('/api/company-settings/restore-logo', optionalAuth, async (_req, res) => {
  try {
    const list = await db.select().from(companySettings).limit(1);
    if (list.length > 0) {
      const [updated] = await db.update(companySettings)
        .set({ logoUrl: DEFAULT_AEW_LOGO, updatedAt: new Date() })
        .where(eq(companySettings.id, list[0].id))
        .returning();
      return res.json(updated);
    }
    res.json({ logoUrl: DEFAULT_AEW_LOGO });
  } catch (error) {
    console.error('Failed to restore logo:', error);
    res.status(500).json({ error: 'Failed to restore default logo' });
  }
});

// ----------------------------------------------------
// 2. Customers Endpoints
// ----------------------------------------------------
api.get('/api/customers', async (_req, res) => {
  try {
    const list = await db.select().from(customers).orderBy(desc(customers.id));
    res.json(list);
  } catch (error) {
    console.error('Failed to get customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

api.get('/api/customers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [cust] = await db.select().from(customers).where(eq(customers.id, id));
    if (!cust) return res.status(404).json({ error: 'Customer not found' });
    res.json(cust);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

api.get('/api/customers/:id/ledger', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [cust] = await db.select().from(customers).where(eq(customers.id, id));
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    // Invoices for this customer
    const docList = await db.select().from(documents)
      .where(sql`${documents.customerId} = ${id} AND ${documents.docType} IN ('tax_invoice', 'proforma_invoice')`)
      .orderBy(documents.date);

    // Payments for this customer
    const paymentList = await db.select().from(payments)
      .where(eq(payments.customerId, id))
      .orderBy(payments.paymentDate);

    // Combine into chronologically sorted ledger entries
    interface LedgerEntry {
      date: string;
      type: 'INVOICE' | 'PAYMENT';
      refNo: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }

    let runningBalance = cust.openingBalance || 0;
    const combined: Array<{ date: string; type: 'INVOICE' | 'PAYMENT'; refNo: string; description: string; debit: number; credit: number }> = [];

    docList.forEach(d => {
      combined.push({
        date: d.date,
        type: 'INVOICE',
        refNo: d.docNumber,
        description: `Invoice: ${d.docNumber} (${d.items.length} items)`,
        debit: d.grandTotal,
        credit: 0,
      });
    });

    paymentList.forEach(p => {
      combined.push({
        date: p.paymentDate,
        type: 'PAYMENT',
        refNo: p.receiptNumber,
        description: `Payment Receipt: ${p.receiptNumber} (${p.paymentMode.toUpperCase()}) ${p.referenceNo ? 'Ref: ' + p.referenceNo : ''}`,
        debit: 0,
        credit: p.amount,
      });
    });

    combined.sort((a, b) => a.date.localeCompare(b.date));

    const ledger: LedgerEntry[] = combined.map(item => {
      runningBalance = runningBalance + item.debit - item.credit;
      return {
        ...item,
        balance: Math.round(runningBalance * 100) / 100,
      };
    });

    res.json({
      customer: cust,
      openingBalance: cust.openingBalance,
      currentBalance: runningBalance,
      entries: ledger,
    });
  } catch (error) {
    console.error('Failed to get customer ledger:', error);
    res.status(500).json({ error: 'Failed to retrieve ledger' });
  }
});

api.post('/api/customers', optionalAuth, async (req, res) => {
  try {
    const data = req.body;
    const [inserted] = await db.insert(customers).values({
      ...data,
      currentBalance: data.openingBalance || 0,
    }).returning();
    res.status(201).json(inserted);
  } catch (error) {
    console.error('Failed to create customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

api.put('/api/customers/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const [updated] = await db.update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

api.delete('/api/customers/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(customers).where(eq(customers.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// ----------------------------------------------------
// 3. Products Endpoints
// ----------------------------------------------------
api.get('/api/products', async (_req, res) => {
  try {
    const list = await db.select().from(products).orderBy(desc(products.id));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

api.post('/api/products', optionalAuth, async (req, res) => {
  try {
    const data = req.body;
    const [inserted] = await db.insert(products).values(data).returning();
    res.status(201).json(inserted);
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

api.put('/api/products/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const [updated] = await db.update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

api.delete('/api/products/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(products).where(eq(products.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ----------------------------------------------------
// 4. Documents Endpoints
// ----------------------------------------------------
api.get('/api/documents', async (req, res) => {
  try {
    const { docType } = req.query;
    let query = db.select().from(documents);
    if (docType && typeof docType === 'string') {
      const list = await query.where(eq(documents.docType, docType)).orderBy(desc(documents.id));
      return res.json(list);
    }
    const list = await query.orderBy(desc(documents.id));
    res.json(list);
  } catch (error) {
    console.error('Failed to get documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ----------------------------------------------------
// Document Numbering Sequences
// ----------------------------------------------------
api.get('/api/sequences', async (_req, res) => {
  try {
    const list = await getAllDocSequences();
    res.json(list);
  } catch (error) {
    console.error('Failed to get sequences:', error);
    res.status(500).json({ error: 'Failed to fetch numbering sequences' });
  }
});

api.put('/api/sequences/:docType', optionalAuth, async (req, res) => {
  try {
    const { docType } = req.params;
    const updated = await updateDocSequenceConfig(docType, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Failed to update sequence config:', error);
    res.status(500).json({ error: 'Failed to update numbering configuration' });
  }
});

api.get('/api/documents/next-number', async (req, res) => {
  try {
    const docType = (req.query.docType as string) || 'tax_invoice';
    const commit = req.query.commit === 'true';
    const nextNumber = await getNextDocNumber(docType, commit);
    res.json({ docNumber: nextNumber });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate document number' });
  }
});

api.get('/api/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get document' });
  }
});

api.post('/api/documents', optionalAuth, async (req, res) => {
  try {
    const data = req.body;
    
    // Automatically generate totalInWords if missing
    if (!data.totalInWords && data.grandTotal) {
      data.totalInWords = convertNumberToIndianWords(data.grandTotal);
    }

    if (!data.docNumber) {
      data.docNumber = await getNextDocNumber(data.docType || 'tax_invoice', true);
    }

    const [inserted] = await db.insert(documents).values(data).returning();

    // If it's a tax invoice, update customer balance
    if (inserted.docType === 'tax_invoice' && inserted.customerId) {
      await db.update(customers)
        .set({
          currentBalance: sql`${customers.currentBalance} + ${inserted.grandTotal}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, inserted.customerId));
    }

    res.status(201).json(inserted);
  } catch (error) {
    console.error('Failed to save document:', error);
    res.status(500).json({ error: 'Failed to save document: ' + (error as any).message });
  }
});

api.put('/api/documents/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (data.grandTotal && !data.totalInWords) {
      data.totalInWords = convertNumberToIndianWords(data.grandTotal);
    }

    const [updated] = await db.update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

api.delete('/api/documents/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(documents).where(eq(documents.id, id));
    
    if (existing && existing.docType === 'tax_invoice' && existing.customerId) {
      // Revert customer balance
      await db.update(customers)
        .set({
          currentBalance: sql`${customers.currentBalance} - ${existing.grandTotal}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, existing.customerId));
    }

    await db.delete(documents).where(eq(documents.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Document Conversion endpoint: Quotation -> Proforma -> Tax Invoice or Invoice -> Challan
api.post('/api/documents/:id/convert', optionalAuth, async (req, res) => {
  try {
    const sourceId = parseInt(req.params.id);
    const { targetDocType } = req.body; // 'tax_invoice' | 'proforma_invoice' | 'delivery_challan' | 'eway_bill'

    const [sourceDoc] = await db.select().from(documents).where(eq(documents.id, sourceId));
    if (!sourceDoc) return res.status(404).json({ error: 'Source document not found' });

    const newDocNumber = await getNextDocNumber(targetDocType, true);
    const today = new Date().toISOString().split('T')[0];

    // Clone data with new docType and reference
    const newDocData: any = {
      ...sourceDoc,
      id: undefined, // auto-increment
      docType: targetDocType,
      docNumber: newDocNumber,
      date: today,
      referenceDocType: sourceDoc.docType,
      referenceDocId: sourceDoc.id,
      referenceDocNumber: sourceDoc.docNumber,
      status: 'issued',
      paidAmount: 0,
      balanceAmount: sourceDoc.grandTotal,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (targetDocType === 'delivery_challan') {
      newDocData.challanDetails = {
        challanType: 'job_work',
        dispatchDate: today,
        natureOfProcessing: 'Supply for Finished Machining & Assembly',
        receiverContact: sourceDoc.customerName,
      };
      newDocData.upiQrEnabled = false;
      newDocData.bankDetailsEnabled = false;
    }

    if (targetDocType === 'eway_bill') {
      newDocData.ewayBillDetails = {
        ewayBillNumber: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        ewayBillDate: today,
        vehicleNumber: sourceDoc.vehicleNumber || 'MH-12-RN-4890',
        transporterName: sourceDoc.transporterName || 'VRL Logistics Ltd',
        transportMode: 'Road',
        distanceKm: 25,
        validUntil: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
      };
    }

    const [created] = await db.insert(documents).values(newDocData).returning();

    // If converted to Tax Invoice, update customer balance
    if (targetDocType === 'tax_invoice' && created.customerId) {
      await db.update(customers)
        .set({
          currentBalance: sql`${customers.currentBalance} + ${created.grandTotal}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, created.customerId));
    }

    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to convert document:', error);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

// ----------------------------------------------------
// 5. Payments Endpoints
// ----------------------------------------------------
api.get('/api/payments', async (_req, res) => {
  try {
    const list = await db.select().from(payments).orderBy(desc(payments.id));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

api.post('/api/payments', optionalAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!data.receiptNumber) {
      data.receiptNumber = await getNextDocNumber('payment_receipt', true);
    }

    const [paymentRecord] = await db.insert(payments).values(data).returning();

    // Update customer balance (credit)
    await db.update(customers)
      .set({
        currentBalance: sql`${customers.currentBalance} - ${data.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, data.customerId));

    // If attached to a document/invoice, update its paid and balance amounts
    if (data.documentId) {
      const [doc] = await db.select().from(documents).where(eq(documents.id, data.documentId));
      if (doc) {
        const newPaid = (doc.paidAmount || 0) + data.amount;
        const newBalance = Math.max(0, doc.grandTotal - newPaid);
        const newStatus = newBalance <= 0 ? 'paid' : (newPaid > 0 ? 'partially_paid' : 'issued');

        await db.update(documents)
          .set({
            paidAmount: newPaid,
            balanceAmount: newBalance,
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, data.documentId));
      }
    }

    res.status(201).json(paymentRecord);
  } catch (error) {
    console.error('Failed to record payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

api.delete('/api/payments/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [p] = await db.select().from(payments).where(eq(payments.id, id));
    if (p) {
      // Revert customer balance
      await db.update(customers)
        .set({
          currentBalance: sql`${customers.currentBalance} + ${p.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, p.customerId));

      // Revert invoice paid balance
      if (p.documentId) {
        const [doc] = await db.select().from(documents).where(eq(documents.id, p.documentId));
        if (doc) {
          const newPaid = Math.max(0, (doc.paidAmount || 0) - p.amount);
          const newBalance = Math.min(doc.grandTotal, doc.grandTotal - newPaid);
          const newStatus = newBalance <= 0 ? 'paid' : (newPaid > 0 ? 'partially_paid' : 'issued');

          await db.update(documents)
            .set({
              paidAmount: newPaid,
              balanceAmount: newBalance,
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, p.documentId));
        }
      }
      await db.delete(payments).where(eq(payments.id, id));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// ----------------------------------------------------
// 6. Reports & Analytics Summary
// ----------------------------------------------------
api.get('/api/reports/summary', async (_req, res) => {
  try {
    const allInvoices = await db.select().from(documents)
      .where(eq(documents.docType, 'tax_invoice'));

    const allQuotations = await db.select().from(documents)
      .where(eq(documents.docType, 'quotation'));

    const allPayments = await db.select().from(payments);
    const allCustomers = await db.select().from(customers);
    const allProducts = await db.select().from(products);

    const totalSales = allInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalTaxable = allInvoices.reduce((sum, inv) => sum + (inv.taxableTotal || 0), 0);
    const totalCgst = allInvoices.reduce((sum, inv) => sum + (inv.cgstTotal || 0), 0);
    const totalSgst = allInvoices.reduce((sum, inv) => sum + (inv.sgstTotal || 0), 0);
    const totalIgst = allInvoices.reduce((sum, inv) => sum + (inv.igstTotal || 0), 0);
    const totalGst = totalCgst + totalSgst + totalIgst;
    
    const totalPaymentsReceived = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOutstanding = allCustomers.reduce((sum, c) => sum + Math.max(0, c.currentBalance || 0), 0);

    // Group sales by month (last 6 months)
    const monthSalesMap: Record<string, number> = {};
    allInvoices.forEach(inv => {
      const month = inv.date.slice(0, 7); // YYYY-MM
      monthSalesMap[month] = (monthSalesMap[month] || 0) + inv.grandTotal;
    });

    res.json({
      totalSales,
      totalTaxable,
      totalGst,
      totalCgst,
      totalSgst,
      totalIgst,
      totalPaymentsReceived,
      totalOutstanding,
      invoiceCount: allInvoices.length,
      quotationCount: allQuotations.length,
      customerCount: allCustomers.length,
      productCount: allProducts.length,
      monthlySales: monthSalesMap,
    });
  } catch (error) {
    console.error('Failed to get reports summary:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default api;
