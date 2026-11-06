import React from 'react';
import { Plus, User as UserIcon, LogIn, LogOut, FileText, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { CompanySettings } from '../types.ts';

interface NavbarProps {
  settings: CompanySettings | null;
  onNewBill: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ settings, onNewBill, searchTerm, onSearchChange }) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();

  const logoSrc = settings?.logoUrl || '/src/assets/images/aew_industrial_logo_1793881800693.jpg';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8 no-print shadow-xs">
      {/* Zone 1: Brand & Logo */}
      <div className="flex items-center gap-3.5 shrink-0">
        <img
          src={logoSrc}
          alt="Abhishek Engineering Works Logo"
          referrerPolicy="no-referrer"
          className="w-10 h-10 object-contain rounded-md border border-slate-200 bg-white p-0.5"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap leading-tight">
            {settings?.companyName || 'ABHISHEK ENGINEERING WORKS'}
          </span>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            GSTIN: <span className="font-mono text-slate-700">{settings?.gstin || '27AAACA0000A1Z5'}</span> · Bill Book ERP
          </span>
        </div>
      </div>

      {/* Zone 2: Search and Searchable Shortcuts */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search bills, customer, quotation, HSN or vehicle..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Zone 3: Actions & Account */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onNewBill}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Bill</span>
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {user ? (
          <div className="flex items-center gap-2.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-full border border-slate-300"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold border border-slate-200">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-800 leading-tight">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-500">Authorized Staff</span>
            </div>
            <button
              onClick={signOutUser}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-600" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
