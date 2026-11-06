import React from 'react';
import {
  LayoutDashboard,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FileCheck,
  Truck,
  PackageCheck,
  Receipt,
  Users,
  Boxes,
  BookOpen,
  CreditCard,
  BarChart3,
  Settings,
} from 'lucide-react';
import { DocumentType } from '../types.ts';

export type ActiveTab =
  | 'dashboard'
  | 'create_bill'
  | 'tax_invoices'
  | 'quotations'
  | 'proforma_invoices'
  | 'eway_bills'
  | 'delivery_challans'
  | 'echallans'
  | 'payment_receipts'
  | 'customers'
  | 'products'
  | 'ledger'
  | 'payments'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  documentCounts?: {
    tax_invoices?: number;
    quotations?: number;
    proforma_invoices?: number;
    eway_bills?: number;
    delivery_challans?: number;
    payment_receipts?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, documentCounts = {} }) => {
  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create_bill', label: 'Create New Bill', icon: FilePlus, highlight: true },
  ];

  const documentNav = [
    { id: 'tax_invoices', label: 'Tax Invoices', icon: FileSpreadsheet, count: documentCounts.tax_invoices },
    { id: 'quotations', label: 'Quotations', icon: FileText, count: documentCounts.quotations },
    { id: 'proforma_invoices', label: 'Proforma Invoices', icon: FileCheck, count: documentCounts.proforma_invoices },
    { id: 'eway_bills', label: 'E-Way Bills', icon: Truck, count: documentCounts.eway_bills },
    { id: 'delivery_challans', label: 'Delivery Challans', icon: PackageCheck, count: documentCounts.delivery_challans },
    { id: 'payment_receipts', label: 'Payment Receipts', icon: Receipt, count: documentCounts.payment_receipts },
  ];

  const managementNav = [
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products & Spares', icon: Boxes },
    { id: 'ledger', label: 'Customer Ledger', icon: BookOpen },
    { id: 'payments', label: 'Payments & Records', icon: CreditCard },
    { id: 'reports', label: 'GST & Sales Reports', icon: BarChart3 },
    { id: 'settings', label: 'Company Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-65px)] border-r border-slate-800 no-print select-none">
      <div className="p-3 space-y-6 flex-1 overflow-y-auto">
        {/* Main Actions */}
        <div className="space-y-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as ActiveTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : item.highlight
                    ? 'bg-slate-800/80 text-blue-400 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Documents Group */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
            Bill Book & Documents
          </div>
          <div className="space-y-0.5">
            {documentNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as ActiveTab)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Business Management Group */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
            Management & Accounts
          </div>
          <div className="space-y-0.5">
            {managementNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as ActiveTab)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>FY 2026-27</span>
          <span className="font-mono text-slate-300">GST Portal Ready</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400 truncate">
          Abhishek Engineering Works
        </div>
      </div>
    </aside>
  );
};
