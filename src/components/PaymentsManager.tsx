import React, { useState } from 'react';
import { Plus, Search, Trash2, Printer, CreditCard, Building, Eye } from 'lucide-react';
import { Customer, Document, Payment } from '../types.ts';
import { formatINR } from '../utils/indianCurrency.ts';
import { api } from '../services/apiClient.ts';

interface PaymentsManagerProps {
  payments: Payment[];
  customers: Customer[];
  invoices: Document[];
  onSavePayment: (p: Partial<Payment>) => Promise<void>;
  onDeletePayment: (id: number) => Promise<void>;
  onViewReceipt?: (p: Payment) => void;
  initialTargetDoc?: Document | null;
}

export const PaymentsManager: React.FC<PaymentsManagerProps> = ({
  payments,
  customers,
  invoices,
  onSavePayment,
  onDeletePayment,
  onViewReceipt,
  initialTargetDoc,
}) => {
  const [search, setSearch] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(!!initialTargetDoc);

  // Form State
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [customerId, setCustomerId] = useState<number>(initialTargetDoc?.customerId || customers[0]?.id || 1);
  const [documentId, setDocumentId] = useState<number | undefined>(initialTargetDoc?.id);
  const [amount, setAmount] = useState<number>(initialTargetDoc?.balanceAmount || 10000);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'neft_rtgs' | 'upi' | 'cheque' | 'cash'>('neft_rtgs');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('State Bank of India (389012345678)');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const openCreateModal = () => {
    api.getNextNumber('payment_receipt').then((res) => {
      setReceiptNumber(res.docNumber);
    });
    setDocumentId(undefined);
    setAmount(10000);
    setReferenceNo('');
    setNotes('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const cust = customers.find((c) => c.id === customerId);
    const doc = documentId ? invoices.find((d) => d.id === documentId) : undefined;

    const payload: Partial<Payment> = {
      receiptNumber: receiptNumber || undefined,
      customerId,
      customerName: cust?.companyName || cust?.name || 'Customer',
      documentId: documentId || undefined,
      documentNumber: doc?.docNumber || undefined,
      amount: Number(amount),
      paymentDate,
      paymentMode,
      referenceNo: referenceNo || undefined,
      bankAccount,
      notes: notes || undefined,
    };

    try {
      await onSavePayment(payload);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (p.referenceNo && p.referenceNo.toLowerCase().includes(search.toLowerCase())) ||
      (p.documentNumber && p.documentNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCollected = filtered.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Payments & Receipts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log collections, NEFT / RTGS / UPI references, and reconcile customer balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <span className="text-[11px] text-slate-500 block">Total Payments Filtered</span>
            <span className="text-base font-bold font-mono text-emerald-800">{formatINR(totalCollected)}</span>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt #, customer, UTR / ref, or invoice #..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Receipt #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-4">Linked Invoice</th>
                <th className="py-2.5 px-4">Mode & UTR / Ref</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {p.paymentDate}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {p.customerName}
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-700">
                      {p.documentNumber || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="uppercase font-semibold text-[11px] text-slate-700">
                        {p.paymentMode.replace('_', ' / ')}
                      </div>
                      {p.referenceNo && (
                        <div className="text-[10px] font-mono text-slate-500">Ref: {p.referenceNo}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onViewReceipt && (
                          <button
                            onClick={() => onViewReceipt(p)}
                            title="Preview & Download Receipt PDF"
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete receipt ${p.receiptNumber}? Customer balance will be restored.`)) {
                              onDeletePayment(p.id);
                            }
                          }}
                          title="Delete Receipt"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No payment receipts found. Click "Record Payment" to log one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Record Customer Payment Receipt</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Receipt Number</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="Auto-generated"
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    setCustomerId(id);
                    // Filter invoices
                    setDocumentId(undefined);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} (Balance: {formatINR(c.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Link to Unpaid Invoice (Optional)</label>
                <select
                  value={documentId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : undefined;
                    setDocumentId(val);
                    if (val) {
                      const found = invoices.find((inv) => inv.id === val);
                      if (found) setAmount(found.balanceAmount || found.grandTotal);
                    }
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="">-- On Account (No specific invoice) --</option>
                  {invoices
                    .filter((inv) => inv.customerId === customerId && inv.docType === 'tax_invoice' && inv.status !== 'paid')
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.docNumber} - Due: {formatINR(inv.balanceAmount)} (Total: {formatINR(inv.grandTotal)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Amount Received (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full font-mono text-sm font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    <option value="neft_rtgs">NEFT / RTGS / IMPS</option>
                    <option value="upi">UPI (GPay, PhonePe, Paytm)</option>
                    <option value="cheque">Bank Cheque / DD</option>
                    <option value="cash">Cash Collection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Transaction Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. UTR-98214012"
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Deposited In</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Payment Remarks</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Part payment against PO, advance..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {saving ? 'Recording...' : 'Record Payment Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
