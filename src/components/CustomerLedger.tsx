import React, { useState, useEffect } from 'react';
import {
  Printer,
  ArrowLeft,
  CreditCard,
  Plus,
  TrendingDown,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Customer, LedgerEntry } from '../types.ts';
import { formatINR } from '../utils/indianCurrency.ts';
import { api } from '../services/apiClient.ts';

interface CustomerLedgerProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer) => void;
  onBack: () => void;
  onRecordPayment: (customer: Customer) => void;
}

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onBack,
  onRecordPayment,
}) => {
  const [currentCust, setCurrentCust] = useState<Customer | null>(selectedCustomer || customers[0] || null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentCust) {
      setLoading(true);
      api.getCustomerLedger(currentCust.id)
        .then((res) => {
          setLedgerEntries(res.entries || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [currentCust]);

  if (!currentCust) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
        No customers available to view ledger.
      </div>
    );
  }

  const totalDebit = ledgerEntries.reduce((acc, e) => acc + e.debit, 0);
  const totalCredit = ledgerEntries.reduce((acc, e) => acc + e.credit, 0);
  const finalBalance = (currentCust.openingBalance || 0) + totalDebit - totalCredit;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Customer Account Ledger</h1>
            <p className="text-xs text-slate-500">Statement of accounts, billing debits and payment receipts</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={currentCust.id}
            onChange={(e) => {
              const c = customers.find((cust) => cust.id === parseInt(e.target.value));
              if (c) {
                setCurrentCust(c);
                onSelectCustomer(c);
              }
            }}
            className="text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>

          <button
            onClick={() => onRecordPayment(currentCust)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-start pb-4 border-b border-slate-200 gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Customer Statement</span>
            <h2 className="text-xl font-bold text-slate-900">{currentCust.companyName}</h2>
            <p className="text-xs text-slate-600 mt-0.5">Contact: {currentCust.name} · Phone: {currentCust.phone}</p>
            <p className="text-xs text-slate-500 mt-0.5">{currentCust.billingAddress}, {currentCust.city}, {currentCust.state}</p>
            {currentCust.gstin && (
              <p className="text-xs font-mono text-slate-700 mt-1">
                GSTIN: <span className="font-bold">{currentCust.gstin}</span>
              </p>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right min-w-[220px]">
            <span className="text-[11px] font-medium text-slate-500 block">Current Outstanding Balance</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 block mt-0.5">
              {formatINR(finalBalance)}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {finalBalance > 0 ? 'Debit balance (Receivable)' : 'Account cleared / in credit'}
            </span>
          </div>
        </div>

        {/* Ledger Summary Counters */}
        <div className="grid grid-cols-4 gap-3 my-5 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Opening Balance</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {formatINR(currentCust.openingBalance || 0)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] text-blue-700 block">Total Invoiced (Debit)</span>
            <span className="font-mono font-bold text-blue-900 text-sm">
              {formatINR(totalDebit)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] text-emerald-700 block">Payments Received (Credit)</span>
            <span className="font-mono font-bold text-emerald-900 text-sm">
              {formatINR(totalCredit)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
            <span className="text-[10px] text-amber-700 block">Net Due</span>
            <span className="font-mono font-bold text-amber-900 text-sm">
              {formatINR(finalBalance)}
            </span>
          </div>
        </div>

        {/* Statement Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-28">Date</th>
                <th className="py-2.5 px-3 w-24">Type</th>
                <th className="py-2.5 px-3 w-36">Reference #</th>
                <th className="py-2.5 px-3">Transaction Description</th>
                <th className="py-2.5 px-3 w-28 text-right">Debit (+) (₹)</th>
                <th className="py-2.5 px-3 w-28 text-right">Credit (-) (₹)</th>
                <th className="py-2.5 px-3 w-32 text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr className="bg-slate-50/60 font-semibold text-slate-600">
                <td className="py-2 px-3" colSpan={4}>Opening Balance Brought Forward</td>
                <td className="py-2 px-3 text-right">-</td>
                <td className="py-2 px-3 text-right">-</td>
                <td className="py-2 px-3 text-right text-slate-900">{formatINR(currentCust.openingBalance || 0)}</td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading ledger entries...</td>
                </tr>
              ) : ledgerEntries.length > 0 ? (
                ledgerEntries.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-600">{row.date}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          row.type === 'INVOICE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{row.refNo}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{row.description}</td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-medium">
                      {row.debit > 0 ? formatINR(row.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">
                      {row.credit > 0 ? formatINR(row.credit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatINR(row.balance)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                    No transactions recorded for this customer yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900 font-mono">
              <tr>
                <td colSpan={4} className="py-2.5 px-3 font-sans text-right">Closing Balance</td>
                <td className="py-2.5 px-3 text-right">{formatINR(totalDebit)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-800">{formatINR(totalCredit)}</td>
                <td className="py-2.5 px-3 text-right text-base text-blue-900">{formatINR(finalBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
