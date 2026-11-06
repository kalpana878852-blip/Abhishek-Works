import React, { useState } from 'react';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Filter,
  CreditCard,
  Layers
} from 'lucide-react';
import { Document, DocumentType } from '../types.ts';
import { formatINR } from '../utils/indianCurrency.ts';

interface DocumentListProps {
  docType: DocumentType;
  title: string;
  description: string;
  documents: Document[];
  onNew: () => void;
  onView: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onDelete: (id: number) => void;
  onRecordPayment?: (doc: Document) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  docType,
  title,
  description,
  documents,
  onNew,
  onView,
  onEdit,
  onDelete,
  onRecordPayment,
}) => {
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.docNumber.toLowerCase().includes(search.toLowerCase()) ||
      doc.customerCompany.toLowerCase().includes(search.toLowerCase()) ||
      doc.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (doc.customerGstin && doc.customerGstin.toLowerCase().includes(search.toLowerCase())) ||
      (doc.poNumber && doc.poNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalAmount = filtered.reduce((acc, d) => acc + d.grandTotal, 0);

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <span className="text-[11px] text-slate-500 block">Total Listed Value</span>
            <span className="text-base font-bold font-mono text-slate-900">{formatINR(totalAmount)}</span>
          </div>

          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New {title.split(' ')[0]}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doc #, company, GSTIN, PO..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-slate-500 hidden md:inline">Status:</span>
          {['all', 'issued', 'paid', 'partially_paid', 'draft'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Doc Number</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Buyer Company</th>
                <th className="py-2.5 px-4">State / Supply</th>
                <th className="py-2.5 px-4 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-4 text-right">Grand Total (₹)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {doc.docNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {doc.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{doc.customerCompany}</div>
                      {doc.customerGstin && (
                        <div className="text-[10px] font-mono text-slate-500">GSTIN: {doc.customerGstin}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{doc.customerState}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {doc.supplyType === 'intra_state' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatINR(doc.taxableTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
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
                        {onRecordPayment && doc.docType === 'tax_invoice' && doc.status !== 'paid' && (
                          <button
                            onClick={() => onRecordPayment(doc)}
                            title="Record Payment Receipt"
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onView(doc)}
                          title="Preview & Print"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(doc)}
                          title="Edit Document"
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${doc.docNumber}?`)) {
                              onDelete(doc.id);
                            }
                          }}
                          title="Delete Document"
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
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No documents found matching criteria.
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
