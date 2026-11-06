import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Upload,
  Plus,
  Trash2,
  Building,
  CreditCard,
  QrCode,
  ShieldCheck,
  Check,
  Hash,
  Eye,
  FileText,
  AlertCircle,
  Database,
  Monitor
} from 'lucide-react';
import { BankAccount, CompanySettings, DocSequenceConfig, DocumentType } from '../types.ts';
import { INDIAN_STATES } from '../utils/indianCurrency.ts';
import { api } from '../services/apiClient.ts';

interface CompanySettingsViewProps {
  settings: CompanySettings;
  onSaveSettings: (updated: Partial<CompanySettings>) => Promise<void>;
  onRestoreLogo: () => Promise<void>;
}

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  settings,
  onSaveSettings,
  onRestoreLogo,
}) => {
  // Company Information
  const [companyName, setCompanyName] = useState<string>(settings.companyName || 'ABHISHEK ENGINEERING WORKS');
  const [tagline, setTagline] = useState<string>(settings.tagline || '');
  const [gstin, setGstin] = useState<string>(settings.gstin || '');
  const [pan, setPan] = useState<string>(settings.pan || '');
  const [stateCode, setStateCode] = useState<string>(settings.stateCode || '27');
  const [address, setAddress] = useState<string>(settings.address || '');
  const [city, setCity] = useState<string>(settings.city || 'Pune');
  const [pincode, setPincode] = useState<string>(settings.pincode || '');
  const [phone, setPhone] = useState<string>(settings.phone || '');
  const [altPhone, setAltPhone] = useState<string>(settings.altPhone || '');
  const [email, setEmail] = useState<string>(settings.email || '');
  const [website, setWebsite] = useState<string>(settings.website || '');
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '/src/assets/images/aew_industrial_logo_1793881800693.jpg');

  // QR Management
  const [upiId, setUpiId] = useState<string>(settings.upiId || '');
  const [upiPayeeName, setUpiPayeeName] = useState<string>(settings.upiPayeeName || 'ABHISHEK ENGINEERING WORKS');
  const [paymentNote, setPaymentNote] = useState<string>(settings.paymentNote || 'Payment for AEW Invoice');
  const [uploadedQrUrl, setUploadedQrUrl] = useState<string>(settings.uploadedQrUrl || '');
  const [qrMode, setQrMode] = useState<'dynamic' | 'uploaded'>(settings.qrMode || 'dynamic');
  const [enableUpiQr, setEnableUpiQr] = useState<boolean>(settings.enableUpiQr ?? true);

  const [qrVisibility, setQrVisibility] = useState<Record<string, boolean>>(
    settings.qrVisibility || {
      tax_invoice: true,
      quotation: true,
      proforma_invoice: true,
      payment_receipt: true,
      delivery_challan: false,
      eway_bill: false,
      echallan: false,
    }
  );

  // Bank Visibility per document
  const [enableBankDetails, setEnableBankDetails] = useState<boolean>(settings.enableBankDetails ?? true);
  const [bankVisibility, setBankVisibility] = useState<Record<string, boolean>>(
    settings.bankVisibility || {
      tax_invoice: true,
      quotation: true,
      proforma_invoice: true,
      payment_receipt: true,
      delivery_challan: false,
      eway_bill: false,
      echallan: false,
    }
  );

  // Bank Accounts - Strict Real Business Data (Zero Demo Accounts)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(
    Array.isArray(settings.bankAccounts) ? settings.bankAccounts : []
  );

  // Dedicated Bank Account Form Modal State
  const [bankModalOpen, setBankModalOpen] = useState<boolean>(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankFormName, setBankFormName] = useState<string>('');
  const [bankFormHolder, setBankFormHolder] = useState<string>(companyName);
  const [bankFormNumber, setBankFormNumber] = useState<string>('');
  const [bankFormIfsc, setBankFormIfsc] = useState<string>('');
  const [bankFormBranch, setBankFormBranch] = useState<string>('');
  const [bankFormType, setBankFormType] = useState<string>('Current Account');
  const [bankFormDefault, setBankFormDefault] = useState<boolean>(false);
  const [savingBank, setSavingBank] = useState<boolean>(false);

  // Terms
  const [paymentTerms, setPaymentTerms] = useState<string>(settings.paymentTerms || '');
  const [deliveryTerms, setDeliveryTerms] = useState<string>(settings.deliveryTerms || '');
  const [warrantyTerms, setWarrantyTerms] = useState<string>(settings.warrantyTerms || '');

  // Document Numbering Sequences
  const [sequences, setSequences] = useState<DocSequenceConfig[]>([]);
  const [loadingSeqs, setLoadingSeqs] = useState<boolean>(true);
  const [savingSeq, setSavingSeq] = useState<string | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Load document numbering configurations
  useEffect(() => {
    api.getSequences()
      .then((data) => setSequences(data))
      .catch((err) => console.error('Failed to load sequences:', err))
      .finally(() => setLoadingSeqs(false));
  }, []);

  // Handle Logo Upload (converts file to Base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle QR Image Upload (Accepts PNG, JPG, JPEG)
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
        setErrorMsg('Please upload a valid PNG, JPG or JPEG image file.');
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedQrUrl(reader.result as string);
        setQrMode('uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  // Restore Default AEW Logo
  const handleRestore = async () => {
    if (window.confirm('Restore the default official AEW industrial monogram logo?')) {
      await onRestoreLogo();
      setLogoUrl('/src/assets/images/aew_industrial_logo_1793881800693.jpg');
      setSuccessMsg('Default AEW industrial gear logo restored!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Bank account helpers
  const handleAddBank = () => {
    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: '',
      accountHolder: companyName,
      accountNumber: '',
      ifsc: '',
      branch: '',
      accountType: 'Current Account',
      isDefault: bankAccounts.length === 0,
    };
    setBankAccounts([...bankAccounts, newBank]);
  };

  const handleUpdateBank = (index: number, field: keyof BankAccount, val: any) => {
    const updated = [...bankAccounts];
    if (field === 'isDefault' && val === true) {
      updated.forEach((b, i) => {
        b.isDefault = i === index;
      });
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setBankAccounts(updated);
  };

  const handleRemoveBank = (index: number) => {
    if (bankAccounts.length <= 1) return;
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  // Numbering sequence update
  const handleSequenceChange = (docType: string, field: string, value: any) => {
    setSequences((prev) =>
      prev.map((s) => {
        if (s.docType !== docType) return s;
        const updated = { ...s, [field]: value };
        return updated;
      })
    );
  };

  const handleSaveSequence = async (seq: DocSequenceConfig) => {
    setSavingSeq(seq.docType);
    try {
      const nextNum = Math.max(seq.currentNumber + 1, seq.startingNumber || 1);
      await api.updateSequence(seq.docType, {
        prefix: seq.prefix,
        year: seq.year,
        startingNumber: seq.startingNumber,
        nextSequenceNumber: nextNum,
        padding: seq.padding,
        separator: seq.separator,
      });
      // Refresh
      const refreshed = await api.getSequences();
      setSequences(refreshed);
      setSuccessMsg(`Numbering sequence for ${seq.docType.replace('_', ' ')} saved!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update numbering sequence');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSavingSeq(null);
    }
  };

  const calculatePreview = (seq: DocSequenceConfig) => {
    const cleanPrefix = (seq.prefix || 'AEW/DOC').replace(/\/+$/, '').trim();
    const cleanYear = (seq.year || '').replace(/^\/+|\/+$/g, '').trim();
    const nextNum = Math.max(seq.currentNumber + 1, seq.startingNumber || 1);
    const padded = String(nextNum).padStart(Math.max(1, seq.padding || 3), '0');
    const sep = seq.separator || '/';
    return cleanYear ? `${cleanPrefix}${sep}${cleanYear}${sep}${padded}` : `${cleanPrefix}${sep}${padded}`;
  };

  // Main settings save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    const stateObj = INDIAN_STATES.find((s) => s.code === stateCode);
    const selectedStateName = stateObj?.name || 'Maharashtra';

    const payload: Partial<CompanySettings> = {
      companyName,
      tagline,
      gstin: gstin.toUpperCase(),
      pan: pan.toUpperCase(),
      state: selectedStateName,
      stateCode,
      address,
      city,
      pincode,
      phone,
      altPhone,
      email,
      website,
      logoUrl,
      upiId,
      upiPayeeName,
      paymentNote,
      uploadedQrUrl,
      qrMode,
      enableUpiQr,
      qrVisibility,
      enableBankDetails,
      bankVisibility,
      bankAccounts,
      paymentTerms,
      deliveryTerms,
      warrantyTerms,
    };

    try {
      await onSaveSettings(payload);
      setSuccessMsg('Company settings saved successfully and synced to database!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const docTypeLabels: Record<string, string> = {
    tax_invoice: 'Tax Invoices',
    quotation: 'Quotations',
    proforma_invoice: 'Proforma Invoices',
    eway_bill: 'E-Way Bills',
    delivery_challan: 'Delivery Challans',
    echallan: 'E-Challans',
    payment_receipt: 'Payment Receipts',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Company Profile & ERP Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure firm branding, document numbering sequences, UPI QR management, bank accounts, and terms
          </p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: Brand & Logo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building className="w-4 h-4 text-slate-500" />
            <span>1. Official Brand Logo & Monogram</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              <img
                src={logoUrl}
                alt="AEW Logo"
                referrerPolicy="no-referrer"
                className="w-24 h-24 object-contain rounded-xl border border-slate-300 p-1.5 bg-white shadow-xs"
              />
            </div>

            <div className="space-y-2 flex-1 text-xs">
              <span className="font-semibold text-slate-800 block">
                AEW Industrial Monogram & Signature Branding
              </span>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                This logo appears on all generated Tax Invoices, Quotations, Challans, and exported A4 PDFs.
                You can upload a custom PNG/JPG, or restore the default navy blue & silver industrial gear logo.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Custom Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleRestore}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-blue-700 hover:bg-blue-50 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Default AEW Logo</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Document Numbering Settings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span>2. Document Numbering Settings</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure prefixes, financial years, starting numbers, padding, and separators for each sequence.
                Numbers are generated atomically to prevent duplicate sequences.
              </p>
            </div>
          </div>

          {loadingSeqs ? (
            <div className="py-6 text-center text-slate-400">Loading document sequences...</div>
          ) : (
            <div className="space-y-4">
              {sequences.map((seq) => {
                const preview = calculatePreview(seq);
                const nextNum = Math.max(seq.currentNumber + 1, seq.startingNumber || 1);

                return (
                  <div
                    key={seq.docType}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {docTypeLabels[seq.docType] || seq.docType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({seq.docType})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">Live Preview:</span>
                        <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-900 font-mono font-bold text-xs shadow-2xs">
                          {preview}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Prefix</label>
                        <input
                          type="text"
                          value={seq.prefix}
                          onChange={(e) => handleSequenceChange(seq.docType, 'prefix', e.target.value)}
                          placeholder="AEW/TI"
                          className="w-full font-mono p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Financial Year</label>
                        <input
                          type="text"
                          value={seq.year}
                          onChange={(e) => handleSequenceChange(seq.docType, 'year', e.target.value)}
                          placeholder="2026"
                          className="w-full font-mono p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Starting #</label>
                        <input
                          type="number"
                          min="1"
                          value={seq.startingNumber || 1}
                          onChange={(e) => handleSequenceChange(seq.docType, 'startingNumber', Number(e.target.value))}
                          className="w-full font-mono p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Next Number</label>
                        <input
                          type="number"
                          min="1"
                          value={nextNum}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value));
                            handleSequenceChange(seq.docType, 'currentNumber', val - 1);
                          }}
                          className="w-full font-mono p-1.5 bg-white border border-slate-200 rounded focus:outline-none font-semibold text-blue-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Padding Digits</label>
                        <select
                          value={seq.padding || 3}
                          onChange={(e) => handleSequenceChange(seq.docType, 'padding', Number(e.target.value))}
                          className="w-full font-mono p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                        >
                          <option value={1}>1 (1, 2...)</option>
                          <option value={2}>2 (01, 02...)</option>
                          <option value={3}>3 (001, 002...)</option>
                          <option value={4}>4 (0001, 0002...)</option>
                          <option value={5}>5 (00001...)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Separator</label>
                        <select
                          value={seq.separator || '/'}
                          onChange={(e) => handleSequenceChange(seq.docType, 'separator', e.target.value)}
                          className="w-full font-mono p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                        >
                          <option value="/">/ (Slash)</option>
                          <option value="-">- (Hyphen)</option>
                          <option value="_">_ (Underscore)</option>
                          <option value=".">. (Dot)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveSequence(seq)}
                        disabled={savingSeq === seq.docType}
                        className="px-3 py-1 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded text-xs transition-colors cursor-pointer"
                      >
                        {savingSeq === seq.docType ? 'Saving...' : 'Update Sequence'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: UPI Payment QR Management */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>3. Payment QR Management (Upload & Dynamic UPI)</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Choose between an uploaded merchant QR code image or auto-generated dynamic amount QR codes.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                qrMode === 'uploaded' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="qrMode"
                checked={qrMode === 'uploaded'}
                onChange={() => setQrMode('uploaded')}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-900 block">Uploaded Merchant UPI QR Image</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Display your official printed QR sticker / standee image (PhonePe, Google Pay, BharatPe, Paytm).
                </span>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                qrMode === 'dynamic' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="qrMode"
                checked={qrMode === 'dynamic'}
                onChange={() => setQrMode('dynamic')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-bold text-slate-900 block">Dynamic Amount & Invoice QR</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Automatically generates a custom QR code encoding the exact grand total and invoice number.
                </span>
              </div>
            </label>
          </div>

          {/* Uploaded QR Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-28 h-28 bg-white border border-slate-300 rounded-lg p-1.5 flex items-center justify-center shrink-0">
              {uploadedQrUrl ? (
                <img
                  src={uploadedQrUrl}
                  alt="Merchant QR"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 text-[10px] p-2">
                  No QR image uploaded yet
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <span className="font-bold text-slate-800 block text-xs">
                Upload Merchant Standee / Bank UPI QR Image
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Accepts PNG, JPG and JPEG. The image is stored persistently in PostgreSQL and rendered on your documents.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadedQrUrl ? 'Replace QR Image' : 'Upload QR Image'}</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                </label>

                {uploadedQrUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete uploaded QR image?')) {
                        setUploadedQrUrl('');
                        setQrMode('dynamic');
                      }
                    }}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Delete QR Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* UPI ID Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Business UPI ID *</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="abhishekengg@okaxis"
                className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Payee Name</label>
              <input
                type="text"
                value={upiPayeeName}
                onChange={(e) => setUpiPayeeName(e.target.value)}
                placeholder="ABHISHEK ENGINEERING WORKS"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Default Payment Note</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Payment for Invoice"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          {/* Document-Specific QR Visibility Controls */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              Display Payment QR on Selected Documents:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'tax_invoice', label: 'Tax Invoice' },
                { id: 'quotation', label: 'Quotation' },
                { id: 'proforma_invoice', label: 'Proforma Invoice' },
                { id: 'payment_receipt', label: 'Payment Receipt' },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={qrVisibility[item.id] !== false}
                    onChange={(e) =>
                      setQrVisibility({ ...qrVisibility, [item.id]: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 4: Bank Details Management */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>4. Bank Details Management</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure bank accounts for RTGS / NEFT remittances and choose which documents display bank details.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddBank}
              className="flex items-center gap-1.5 px-3 py-1 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Bank Account</span>
            </button>
          </div>

          {/* Document-Specific Bank Details Visibility */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              Display Bank Details on Selected Documents:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'tax_invoice', label: 'Tax Invoice' },
                { id: 'quotation', label: 'Quotation' },
                { id: 'proforma_invoice', label: 'Proforma Invoice' },
                { id: 'payment_receipt', label: 'Payment Receipt' },
                { id: 'delivery_challan', label: 'Delivery Challan' },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={bankVisibility[item.id] !== false}
                    onChange={(e) =>
                      setBankVisibility({ ...bankVisibility, [item.id]: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Accounts List */}
          <div className="space-y-3 pt-2">
            {bankAccounts.map((b, idx) => (
              <div key={b.id || idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="defaultBank"
                      checked={b.isDefault}
                      onChange={() => handleUpdateBank(idx, 'isDefault', true)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold text-slate-800">
                      Bank #{idx + 1} {b.isDefault ? '(Default for Documents)' : ''}
                    </span>
                  </div>

                  {bankAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={b.bankName}
                      onChange={(e) => handleUpdateBank(idx, 'bankName', e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={b.accountNumber}
                      onChange={(e) => handleUpdateBank(idx, 'accountNumber', e.target.value)}
                      placeholder="Account Number"
                      className="w-full font-mono p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">IFSC Code *</label>
                    <input
                      type="text"
                      required
                      value={b.ifsc}
                      onChange={(e) => handleUpdateBank(idx, 'ifsc', e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                      className="w-full font-mono uppercase p-1.5 bg-white border border-slate-200 rounded focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Branch Name</label>
                    <input
                      type="text"
                      value={b.branch}
                      onChange={(e) => handleUpdateBank(idx, 'branch', e.target.value)}
                      placeholder="Branch location"
                      className="w-full p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Account Holder Name</label>
                    <input
                      type="text"
                      value={b.accountHolder}
                      onChange={(e) => handleUpdateBank(idx, 'accountHolder', e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: Business Address & GST Details */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building className="w-4 h-4 text-slate-500" />
            <span>5. Business Details & Legal Registrations</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Company / Entity Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Tagline / Business Nature</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 font-medium mb-1">GSTIN *</label>
              <input
                type="text"
                required
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full font-mono uppercase p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">PAN Number *</label>
              <input
                type="text"
                required
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full font-mono uppercase p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">State & GST Code *</label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Registered Workshop / Factory Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <label className="block text-slate-600 font-medium mb-1">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Phone *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: Standard Terms & Conditions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>6. Standard Terms, Delivery & Warranty</span>
          </h2>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Standard Payment Terms</label>
            <textarea
              rows={2}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Delivery / Freight Terms</label>
            <textarea
              rows={2}
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Warranty Terms</label>
            <textarea
              rows={2}
              value={warrantyTerms}
              onChange={(e) => setWarrantyTerms(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>
        </div>

        {/* SECTION 7: Database & Desktop Deployment Architecture (Supabase & Electron) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Database className="w-4 h-4 text-slate-500" />
            <span>7. Cloud Database, Supabase & Windows Desktop EXE Architecture</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Cloud SQL & Supabase Persistence</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  {isSupabaseConfigured ? 'Supabase Active' : 'PostgreSQL Active'}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                All invoices, quotations, sequences, customers, and ledger entries are permanently preserved in PostgreSQL.
                {isSupabaseConfigured
                  ? ' Connected to Supabase cloud storage and realtime sync.'
                  : ' Optionally provide VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY to mirror directly to your Supabase project.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-slate-800" />
                  <span>Windows Desktop EXE Ready</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
                  Electron Configured
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Built modularly with native Electron IPC bridges (<code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-700">electron/main.cjs</code>).
                Can run in web browsers or be packaged directly into a standalone Windows installer (.exe) for factory shop floors.
              </p>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Settings & Sync to Database'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
