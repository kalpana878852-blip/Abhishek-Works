import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Package, Tag } from 'lucide-react';
import { Product } from '../types.ts';
import { COMMON_UNITS, formatINR, GST_RATES } from '../utils/indianCurrency.ts';

interface ProductManagerProps {
  products: Product[];
  onSaveProduct: (prod: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  products,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const [search, setSearch] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [hsn, setHsn] = useState<string>('8483');
  const [unit, setUnit] = useState<string>('NOS');
  const [rate, setRate] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [currentStock, setCurrentStock] = useState<number>(100);
  const [minStock, setMinStock] = useState<number>(10);
  const [saving, setSaving] = useState<boolean>(false);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`AEW-${Math.floor(100 + Math.random() * 900)}`);
    setDescription('');
    setHsn('8483');
    setUnit('NOS');
    setRate(0);
    setGstRate(18);
    setCurrentStock(100);
    setMinStock(10);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setDescription(p.description || '');
    setHsn(p.hsn);
    setUnit(p.unit);
    setRate(p.rate);
    setGstRate(p.gstRate);
    setCurrentStock(p.currentStock ?? 100);
    setMinStock(p.minStock ?? 10);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Partial<Product> = {
      ...(editingProduct ? { id: editingProduct.id } : {}),
      name,
      sku,
      description: description || undefined,
      hsn,
      unit,
      rate: Number(rate),
      gstRate: Number(gstRate),
      currentStock: Number(currentStock),
      minStock: Number(minStock),
    };

    try {
      await onSaveProduct(payload);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.hsn.includes(search)
  );

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Products & Spares Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Engineering parts, machined components, HSN codes, and standard rate card
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product / Part</span>
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
            placeholder="Search by part name, SKU code, or HSN..."
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
                <th className="py-2.5 px-4">SKU Code</th>
                <th className="py-2.5 px-4">Part / Service Description</th>
                <th className="py-2.5 px-4 text-center">HSN/SAC</th>
                <th className="py-2.5 px-4 text-center">Unit</th>
                <th className="py-2.5 px-4 text-right">Standard Rate (₹)</th>
                <th className="py-2.5 px-4 text-center">GST Rate</th>
                <th className="py-2.5 px-4 text-right">In Stock</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {p.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{p.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {p.hsn}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {p.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(p.rate)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {p.gstRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className={(p.currentStock ?? 0) <= (p.minStock ?? 10) ? 'text-amber-700 font-bold' : 'text-slate-800'}>
                        {p.currentStock ?? 0} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Part"
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete part ${p.name}?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          title="Delete Part"
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
                    No products found. Click "Add New Product" to populate your catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              {editingProduct ? 'Edit Product' : 'Add New Product / Machining'}
            </h2>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Part / Service Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CNC Turned Precision Bushing (EN8)"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="AEW-BUSH-001"
                    className="w-full font-mono uppercase p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">HSN/SAC Code *</label>
                  <input
                    type="text"
                    required
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    placeholder="8483"
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Detailed Technical Specifications</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="OD, ID, Length, hardness, surface finish..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Standard Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Low Stock Alert Level</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
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
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
