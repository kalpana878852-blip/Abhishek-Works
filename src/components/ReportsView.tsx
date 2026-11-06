import React, { useState } from 'react';
import { Download, Printer, BarChart3, Filter, FileSpreadsheet } from 'lucide-react';
import { Document } from '../types.ts';
import { formatINR } from '../utils/indianCurrency.ts';

interface ReportsViewProps {
  invoices: Document[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ invoices }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const allTaxInvoices = invoices.filter((d) => d.docType === 'tax_invoice');

  // Available months
  const months = Array.from(new Set(allTaxInvoices.map((i) => i.date.slice(0, 7)))).sort().reverse();

  const filteredInvoices = allTaxInvoices.filter((inv) => {
    if (selectedMonth === 'all') return true;
    return inv.date.startsWith(selectedMonth);
  });

  const totalTaxable = filteredInvoices.reduce((acc, i) => acc + (i.taxableTotal || 0), 0);
  const totalCgst = filteredInvoices.reduce((acc, i) => acc + (i.cgstTotal || 0), 0);
  const totalSgst = filteredInvoices.reduce((acc, i) => acc + (i.sgstTotal || 0), 0);
  const totalIgst = filteredInvoices.reduce((acc, i) => acc + (i.igstTotal || 0), 0);
  const totalGst = totalCgst + totalSgst + totalIgst;
  const totalGrand = filteredInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);

  // CSV Export for GSTR-1
  const handleExportCsv = () => {
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'Supply Type',
      'Taxable Value',
      'CGST Amount',
      'SGST Amount',
      'IGST Amount',
      'Total GST',
      'Grand Total',
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.docNumber}"`,
      `"${inv.date}"`,
      `"${inv.customerCompany.replace(/"/g, '""')}"`,
      `"${inv.customerGstin || ''}"`,
      `"${inv.placeOfSupply}"`,
      `"${inv.supplyType}"`,
      inv.taxableTotal.toFixed(2),
      inv.cgstTotal.toFixed(2),
      inv.sgstTotal.toFixed(2),
      inv.igstTotal.toFixed(2),
      (inv.cgstTotal + inv.sgstTotal + inv.igstTotal).toFixed(2),
      inv.grandTotal.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AEW_GSTR1_Sales_Register_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">GST & Inward Sales Register</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            GSTR-1 compliant sales ledger, B2B tax breakdown, and GST liability audit
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="all">All Months (FY 2026-27)</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GSTR-1 CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Taxable Turnover</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">{formatINR(totalTaxable)}</div>
          <span className="text-[10px] text-slate-400">{filteredInvoices.length} Invoices</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-blue-700 uppercase">CGST Collected</span>
          <div className="text-lg font-bold font-mono text-blue-900 mt-1">{formatINR(totalCgst)}</div>
          <span className="text-[10px] text-slate-400">Intra-State Central</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-blue-700 uppercase">SGST Collected</span>
          <div className="text-lg font-bold font-mono text-blue-900 mt-1">{formatINR(totalSgst)}</div>
          <span className="text-[10px] text-slate-400">Intra-State Maharashtra</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-purple-700 uppercase">IGST Collected</span>
          <div className="text-lg font-bold font-mono text-purple-900 mt-1">{formatINR(totalIgst)}</div>
          <span className="text-[10px] text-slate-400">Inter-State Integrated</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Total GST Output</span>
          <div className="text-lg font-bold font-mono text-emerald-900 mt-1">{formatINR(totalGst)}</div>
          <span className="text-[10px] text-slate-400">Total Tax Liability</span>
        </div>
      </div>

      {/* GSTR-1 Sales Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            GSTR-1 B2B Invoices Register ({filteredInvoices.length} records)
          </h2>
          <span className="text-xs font-mono font-bold text-slate-900">
            Gross Billing: {formatINR(totalGrand)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-mono">
              <tr>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 font-sans">Buyer & GSTIN</th>
                <th className="py-2.5 px-3">POS</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                <th className="py-2.5 px-3 text-right">Invoice Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {inv.docNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {inv.date}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-slate-800">{inv.customerCompany}</div>
                      <div className="font-mono text-[10px] text-slate-500">{inv.customerGstin || 'B2C / Unreg'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {inv.customerStateCode}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-800 font-medium">
                      {formatINR(inv.taxableTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {inv.cgstTotal > 0 ? formatINR(inv.cgstTotal) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {inv.sgstTotal > 0 ? formatINR(inv.sgstTotal) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-purple-700">
                      {inv.igstTotal > 0 ? formatINR(inv.igstTotal) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatINR(inv.grandTotal)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                    No tax invoices recorded in selected period.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t border-slate-300 font-mono text-slate-900">
              <tr>
                <td colSpan={4} className="py-2.5 px-3 font-sans text-right">Total Summary:</td>
                <td className="py-2.5 px-3 text-right">{formatINR(totalTaxable)}</td>
                <td className="py-2.5 px-3 text-right">{formatINR(totalCgst)}</td>
                <td className="py-2.5 px-3 text-right">{formatINR(totalSgst)}</td>
                <td className="py-2.5 px-3 text-right text-purple-800">{formatINR(totalIgst)}</td>
                <td className="py-2.5 px-3 text-right text-blue-900">{formatINR(totalGrand)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
