import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, Building, Phone, Mail } from 'lucide-react';
import { Customer } from '../types.ts';
import { formatINR, INDIAN_STATES } from '../utils/indianCurrency.ts';

interface CustomerManagerProps {
  customers: Customer[];
  onSaveCustomer: (cust: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: number) => Promise<void>;
  onViewLedger: (customer: Customer) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  onSaveCustomer,
  onDeleteCustomer,
  onViewLedger,
}) => {
  const [search, setSearch] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [pan, setPan] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [billingAddress, setBillingAddress] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [city, setCity] = useState<string>('Pune');
  const [stateCode, setStateCode] = useState<string>('27');
  const [pincode, setPincode] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setCompanyName('');
    setGstin('');
    setPan('');
    setPhone('');
    setEmail('');
    setBillingAddress('');
    setShippingAddress('');
    setCity('Pune');
    setStateCode('27');
    setPincode('411018');
    setOpeningBalance(0);
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setCompanyName(c.companyName);
    setGstin(c.gstin || '');
    setPan(c.pan || '');
    setPhone(c.phone);
    setEmail(c.email || '');
    setBillingAddress(c.billingAddress);
    setShippingAddress(c.shippingAddress || '');
    setCity(c.city || 'Pune');
    setStateCode(c.stateCode || '27');
    setPincode(c.pincode || '');
    setOpeningBalance(c.openingBalance || 0);
    setNotes(c.notes || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const stateObj = INDIAN_STATES.find((s) => s.code === stateCode);
    const selectedStateName = stateObj?.name || 'Maharashtra';

    const payload: Partial<Customer> = {
      ...(editingCustomer ? { id: editingCustomer.id } : {}),
      name: name || companyName,
      companyName,
      gstin: gstin.toUpperCase() || undefined,
      pan: pan.toUpperCase() || undefined,
      phone,
      email: email || undefined,
      billingAddress,
      shippingAddress: shippingAddress || billingAddress,
      city,
      state: selectedStateName,
      stateCode,
      pincode,
      openingBalance: Number(openingBalance || 0),
      notes: notes || undefined,
    };

    try {
      await onSaveCustomer(payload);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search))
  );

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage client accounts, GST numbers, addresses, and balance ledgers
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, contact person, phone, or GSTIN..."
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
                <th className="py-2.5 px-4">Company Name</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">GSTIN & PAN</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4 text-right">Outstanding (₹)</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.companyName}</div>
                      <div className="text-[11px] text-slate-500">{c.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800">{c.phone}</div>
                      {c.email && <div className="text-[11px] text-slate-500">{c.email}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.gstin ? (
                        <div className="font-semibold text-slate-800">{c.gstin}</div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">Unregistered / B2C</div>
                      )}
                      {c.pan && <div className="text-[10px] text-slate-500">PAN: {c.pan}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{c.city}, {c.state}</div>
                      <div className="text-[10px] text-slate-400">State Code: {c.stateCode}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      <span className={c.currentBalance > 0 ? 'text-amber-700' : 'text-slate-800'}>
                        {formatINR(c.currentBalance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewLedger(c)}
                          title="View Customer Ledger & Statement"
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Ledger</span>
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete customer ${c.companyName}?`)) {
                              onDeleteCustomer(c.id);
                            }
                          }}
                          title="Delete Customer"
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
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No customers found. Click "Add New Customer" to register one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-5">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              {editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
            </h2>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Company / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Tata Motors Ltd"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Kulkarni"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCT2727Q1ZV"
                    className="w-full font-mono uppercase p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="AABCT2727Q"
                    className="w-full font-mono uppercase p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="accounts@client.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Billing Address *</label>
                <textarea
                  required
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Factory / Office Street Address"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">State</label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="411018"
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Vendor / Client Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Vendor codes, delivery instructions, quality norms..."
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
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
