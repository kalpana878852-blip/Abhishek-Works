import React from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Users,
  CreditCard,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Eye,
  Printer,
  FileCheck,
  Truck,
  ArrowRight
} from 'lucide-react';
import { Document, DocumentType } from '../types.ts';
import { formatINR } from '../utils/indianCurrency.ts';

interface DashboardProps {
  summary: {
    totalSales: number;
    totalTaxable: number;
    totalGst: number;
    totalPaymentsReceived: number;
    totalOutstanding: number;
    invoiceCount: number;
    quotationCount: number;
    customerCount: number;
    productCount: number;
    monthlySales: Record<string, number>;
  };
  recentDocs: Document[];
  onViewDoc: (doc: Document) => void;
  onEditDoc: (doc: Document) => void;
  onNewDoc: (docType: DocumentType) => void;
  onNavigateTab: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  recentDocs,
  onViewDoc,
  onEditDoc,
  onNewDoc,
  onNavigateTab,
}) => {
  const kpis = [
    {
      label: 'Total Net Sales (Tax Invoices)',
      value: formatINR(summary.totalSales),
      subtitle: `${summary.invoiceCount} issued invoices`,
      icon: TrendingUp,
      color: 'text-emerald-700 bg-emerald-50',
    },
    {
      label: 'Outstanding Receivables',
      value: formatINR(summary.totalOutstanding),
      subtitle: 'From active customer ledger balances',
      icon: AlertCircle,
      color: 'text-amber-700 bg-amber-50',
    },
    {
      label: 'Total Payments Received',
      value: formatINR(summary.totalPaymentsReceived),
      subtitle: 'Collected via NEFT / UPI / Cheque',
      icon: CreditCard,
      color: 'text-blue-700 bg-blue-50',
    },
    {
      label: 'Active Quotations Value',
      value: `${summary.quotationCount} Quotes`,
      subtitle: 'Pending buyer confirmation',
      icon: FileText,
      color: 'text-indigo-700 bg-indigo-50',
    },
  ];

  const months = Object.keys(summary.monthlySales || {}).sort();
  const maxSale = Math.max(...Object.values(summary.monthlySales || { demo: 100000 }), 100000);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            AEW Operations & Billing Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Indian GST Bill Book, Quotation Engine & Production Dispatch ERP
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNewDoc('tax_invoice')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tax Invoice</span>
          </button>
          <button
            onClick={() => onNewDoc('quotation')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quotation</span>
          </button>
          <button
            onClick={() => onNewDoc('delivery_challan')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Delivery Challan</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{kpi.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Quick Navigation split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Monthly Sales Invoicing</h2>
              <p className="text-[11px] text-slate-500">Gross invoiced amount including GST</p>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View GST Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-6 pb-2">
            {months.length > 0 ? (
              <div className="flex items-end justify-between gap-4 h-44 px-2">
                {months.map((m) => {
                  const val = summary.monthlySales[m] || 0;
                  const heightPercent = Math.max(12, Math.round((val / maxSale) * 100));
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[11px] font-mono tabular-nums text-slate-600 font-medium group-hover:text-blue-600 transition-colors">
                        {formatINR(val)}
                      </div>
                      <div className="w-full max-w-[48px] bg-slate-100 rounded-t-md h-32 flex items-end overflow-hidden">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-slate-900 group-hover:bg-blue-600 transition-all rounded-t-sm"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">{m}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                No monthly data yet. Create your first invoice!
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Total GST Collected: <span className="font-mono font-semibold text-slate-800">{formatINR(summary.totalGst)}</span>
            </div>
            <div>
              Taxable Turnover: <span className="font-mono font-semibold text-slate-800">{formatINR(summary.totalTaxable)}</span>
            </div>
          </div>
        </div>

        {/* Shortcuts & Operations Overview */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
              ERP Fast Modules
            </h2>
            <div className="mt-3 space-y-2.5">
              <button
                onClick={() => onNavigateTab('tax_invoices')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">GST Tax Invoices</div>
                    <div className="text-[10px] text-slate-500">B2B Indian compliant invoices</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700">{summary.invoiceCount}</span>
              </button>

              <button
                onClick={() => onNavigateTab('quotations')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Engineering Quotes</div>
                    <div className="text-[10px] text-slate-500">Cost estimates & terms</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700">{summary.quotationCount}</span>
              </button>

              <button
                onClick={() => onNavigateTab('delivery_challans')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Delivery Challans</div>
                    <div className="text-[10px] text-slate-500">Job work & goods dispatch</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('ledger')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Customer Ledgers</div>
                    <div className="text-[10px] text-slate-500">Running balance & statements</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700">{summary.customerCount}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Catalogue Items: <span className="font-mono font-semibold text-slate-800">{summary.productCount}</span></span>
            <button
              onClick={() => onNavigateTab('settings')}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Settings & UPI
            </button>
          </div>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent Bill Book Documents</h2>
            <p className="text-[11px] text-slate-500">Latest invoices, quotations, and challans generated</p>
          </div>
          <button
            onClick={() => onNavigateTab('tax_invoices')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            View All Documents
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Doc Number</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-4 font-semibold">Customer / Company</th>
                <th className="py-2.5 px-4 font-semibold text-right">Taxable</th>
                <th className="py-2.5 px-4 font-semibold text-right">Grand Total</th>
                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentDocs.length > 0 ? (
                recentDocs.map((doc) => {
                  const typeLabels: Record<string, { label: string; color: string }> = {
                    tax_invoice: { label: 'Tax Invoice', color: 'text-blue-700 bg-blue-50' },
                    quotation: { label: 'Quotation', color: 'text-purple-700 bg-purple-50' },
                    proforma_invoice: { label: 'Proforma', color: 'text-indigo-700 bg-indigo-50' },
                    delivery_challan: { label: 'Challan', color: 'text-amber-700 bg-amber-50' },
                    eway_bill: { label: 'E-Way Bill', color: 'text-emerald-700 bg-emerald-50' },
                    payment_receipt: { label: 'Receipt', color: 'text-teal-700 bg-teal-50' },
                  };
                  const meta = typeLabels[doc.docType] || { label: doc.docType, color: 'text-slate-700 bg-slate-100' };

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {doc.docNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                        {doc.date}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 max-w-[200px] truncate">
                        {doc.customerCompany || doc.customerName}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-slate-700">
                        {formatINR(doc.taxableTotal)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-right text-slate-900">
                        {formatINR(doc.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase ${
                            doc.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : doc.status === 'partially_paid'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewDoc(doc)}
                            title="Preview / Print / Download PDF"
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditDoc(doc)}
                            title="Edit"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No documents created yet. Click "Create Bill" to start!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
