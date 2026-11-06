import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Eye,
  ArrowLeft,
  Search,
  Calculator,
  Truck,
  Building,
  CheckCircle,
  QrCode,
  FileText
} from 'lucide-react';
import { CompanySettings, Customer, Document, DocumentItem, DocumentType, Product } from '../types.ts';
import { COMMON_UNITS, formatINR, GST_RATES, INDIAN_STATES, numberToIndianWords } from '../utils/indianCurrency.ts';
import { api } from '../services/apiClient.ts';

interface DocumentEditorProps {
  settings: CompanySettings;
  customers: Customer[];
  products: Product[];
  initialDoc?: Document | null;
  defaultDocType?: DocumentType;
  onSaveSuccess: (savedDoc: Document, andPreview?: boolean) => void;
  onCancel: () => void;
  onRefreshData?: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  settings,
  customers,
  products,
  initialDoc,
  defaultDocType = 'tax_invoice',
  onSaveSuccess,
  onCancel,
  onRefreshData,
}) => {
  const [docType, setDocType] = useState<DocumentType>(initialDoc?.docType || defaultDocType);
  const [docNumber, setDocNumber] = useState<string>(initialDoc?.docNumber || '');
  const [date, setDate] = useState<string>(initialDoc?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(initialDoc?.dueDate || '');
  const [poNumber, setPoNumber] = useState<string>(initialDoc?.poNumber || '');
  const [poDate, setPoDate] = useState<string>(initialDoc?.poDate || '');
  const [vehicleNumber, setVehicleNumber] = useState<string>(initialDoc?.vehicleNumber || '');
  const [transporterName, setTransporterName] = useState<string>(initialDoc?.transporterName || '');

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(initialDoc?.customerId);
  const [customerName, setCustomerName] = useState<string>(initialDoc?.customerName || '');
  const [customerCompany, setCustomerCompany] = useState<string>(initialDoc?.customerCompany || '');
  const [customerGstin, setCustomerGstin] = useState<string>(initialDoc?.customerGstin || '');
  const [customerPhone, setCustomerPhone] = useState<string>(initialDoc?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(initialDoc?.customerEmail || '');
  const [billingAddress, setBillingAddress] = useState<string>(initialDoc?.billingAddress || '');
  const [shippingAddress, setShippingAddress] = useState<string>(initialDoc?.shippingAddress || '');
  const [customerState, setCustomerState] = useState<string>(initialDoc?.customerState || 'Maharashtra');
  const [customerStateCode, setCustomerStateCode] = useState<string>(initialDoc?.customerStateCode || '27');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(initialDoc?.placeOfSupply || '27-Maharashtra');
  const [supplyType, setSupplyType] = useState<'intra_state' | 'inter_state'>(initialDoc?.supplyType || 'intra_state');

  // Items
  const [items, setItems] = useState<DocumentItem[]>(
    initialDoc?.items?.length
      ? initialDoc.items
      : [
          {
            id: 'item-1',
            name: '',
            description: '',
            hsn: '8483',
            quantity: 1,
            unit: 'NOS',
            rate: 0,
            discountPercent: 0,
            discountAmount: 0,
            taxableAmount: 0,
            gstRate: 18,
            cgstRate: 9,
            cgstAmount: 0,
            sgstRate: 9,
            sgstAmount: 0,
            igstRate: 0,
            igstAmount: 0,
            total: 0,
          },
        ]
  );

  // Additional charges
  const [freightCharges, setFreightCharges] = useState<number>(initialDoc?.freightCharges || 0);
  const [packagingCharges, setPackagingCharges] = useState<number>(initialDoc?.packagingCharges || 0);

  // Settings & Toggles
  const [upiQrEnabled, setUpiQrEnabled] = useState<boolean>(initialDoc?.upiQrEnabled ?? settings.enableUpiQr);
  const [bankDetailsEnabled, setBankDetailsEnabled] = useState<boolean>(initialDoc?.bankDetailsEnabled ?? settings.enableBankDetails);
  const [selectedBankId, setSelectedBankId] = useState<string>(
    initialDoc?.selectedBankId || settings.bankAccounts.find((b) => b.isDefault)?.id || settings.bankAccounts[0]?.id || ''
  );
  const [notes, setNotes] = useState<string>(initialDoc?.notes || '');
  const [terms, setTerms] = useState<string>(initialDoc?.terms || settings.paymentTerms);

  // E-Way Bill fields
  const [ewayBillNumber, setEwayBillNumber] = useState<string>(initialDoc?.ewayBillDetails?.ewayBillNumber || '');
  const [distanceKm, setDistanceKm] = useState<number>(initialDoc?.ewayBillDetails?.distanceKm || 25);
  const [transportMode, setTransportMode] = useState<'Road' | 'Rail' | 'Air' | 'Ship'>(
    initialDoc?.ewayBillDetails?.transportMode || 'Road'
  );

  // Challan fields
  const [challanType, setChallanType] = useState<any>(initialDoc?.challanDetails?.challanType || 'job_work');
  const [natureOfProcessing, setNatureOfProcessing] = useState<string>(
    initialDoc?.challanDetails?.natureOfProcessing || 'Precision Machining, CNC Turning & Grinding'
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Fetch next sequence document number if new
  useEffect(() => {
    if (!initialDoc) {
      api.getNextNumber(docType).then((res) => {
        setDocNumber(res.docNumber);
      }).catch((err) => console.error(err));
    }
  }, [docType, initialDoc]);

  // When customer changes, autofill addresses, gstin and detect intra vs inter state
  const handleSelectCustomer = (custIdStr: string) => {
    if (!custIdStr) {
      setSelectedCustomerId(undefined);
      return;
    }
    const custId = parseInt(custIdStr);
    const c = customers.find((cust) => cust.id === custId);
    if (!c) return;

    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerCompany(c.companyName);
    setCustomerGstin(c.gstin || '');
    setCustomerPhone(c.phone);
    setCustomerEmail(c.email || '');
    setBillingAddress(c.billingAddress);
    setShippingAddress(c.shippingAddress || c.billingAddress);
    setCustomerState(c.state);
    setCustomerStateCode(c.stateCode);
    setPlaceOfSupply(`${c.stateCode}-${c.state}`);

    // Auto-detect inter-state vs intra-state
    const isInterState = c.stateCode !== (settings.stateCode || '27');
    const newSupplyType = isInterState ? 'inter_state' : 'intra_state';
    setSupplyType(newSupplyType);

    // Recalculate existing rows taxes
    setItems((prev) =>
      prev.map((item) => calculateRowTaxes(item, newSupplyType))
    );
  };

  // Row calculations
  const calculateRowTaxes = (
    item: Partial<DocumentItem>,
    sType: 'intra_state' | 'inter_state' = supplyType
  ): DocumentItem => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const discPct = Number(item.discountPercent) || 0;
    const gstPct = Number(item.gstRate) || 0;

    const baseAmount = qty * rate;
    const discAmount = (baseAmount * discPct) / 100;
    const taxable = Math.max(0, baseAmount - discAmount);

    let cgstR = 0;
    let cgstA = 0;
    let sgstR = 0;
    let sgstA = 0;
    let igstR = 0;
    let igstA = 0;

    if (sType === 'intra_state') {
      cgstR = gstPct / 2;
      sgstR = gstPct / 2;
      cgstA = (taxable * cgstR) / 100;
      sgstA = (taxable * sgstR) / 100;
    } else {
      igstR = gstPct;
      igstA = (taxable * igstR) / 100;
    }

    const total = taxable + cgstA + sgstA + igstA;

    return {
      id: item.id || Math.random().toString(),
      productId: item.productId,
      name: item.name || '',
      description: item.description || '',
      hsn: item.hsn || '8483',
      quantity: qty,
      unit: item.unit || 'NOS',
      rate,
      discountPercent: discPct,
      discountAmount: Math.round(discAmount * 100) / 100,
      taxableAmount: Math.round(taxable * 100) / 100,
      gstRate: gstPct,
      cgstRate: cgstR,
      cgstAmount: Math.round(cgstA * 100) / 100,
      sgstRate: sgstR,
      sgstAmount: Math.round(sgstA * 100) / 100,
      igstRate: igstR,
      igstAmount: Math.round(igstA * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  };

  const handleItemChange = (index: number, field: keyof DocumentItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // If product selection
    if (field === 'productId') {
      const p = products.find((prod) => prod.id === parseInt(value));
      if (p) {
        item.name = p.name;
        item.description = p.description || '';
        item.hsn = p.hsn;
        item.unit = p.unit;
        item.rate = p.rate;
        item.gstRate = p.gstRate;
      }
    }

    updated[index] = calculateRowTaxes(item, supplyType);
    setItems(updated);
  };

  const handleAddItem = () => {
    const newItem = calculateRowTaxes(
      {
        id: `item-${Date.now()}`,
        name: '',
        description: '',
        hsn: '8483',
        quantity: 1,
        unit: 'NOS',
        rate: 0,
        discountPercent: 0,
        gstRate: 18,
      },
      supplyType
    );
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Grand totals
  const subtotal = items.reduce((acc, row) => acc + (row.quantity * row.rate), 0);
  const discountTotal = items.reduce((acc, row) => acc + row.discountAmount, 0);
  const taxableTotal = items.reduce((acc, row) => acc + row.taxableAmount, 0);
  const cgstTotal = items.reduce((acc, row) => acc + row.cgstAmount, 0);
  const sgstTotal = items.reduce((acc, row) => acc + row.sgstAmount, 0);
  const igstTotal = items.reduce((acc, row) => acc + row.igstAmount, 0);

  const rawGrandTotal = taxableTotal + cgstTotal + sgstTotal + igstTotal + Number(freightCharges || 0) + Number(packagingCharges || 0);
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((roundedGrandTotal - rawGrandTotal) * 100) / 100;
  const totalInWords = numberToIndianWords(roundedGrandTotal);

  // Form submission
  const handleSubmit = async (andPreview: boolean = false) => {
    if (!customerCompany && !customerName) {
      setErrorMsg('Please select or specify a Customer Company/Name.');
      return;
    }
    if (items.length === 0 || !items[0].name) {
      setErrorMsg('Please add at least one line item with description/name.');
      return;
    }

    setErrorMsg('');
    setSaving(true);

    const docPayload: Partial<Document> = {
      docType,
      docNumber,
      date,
      dueDate: dueDate || undefined,
      customerId: selectedCustomerId,
      customerName: customerName || customerCompany,
      customerCompany: customerCompany || customerName,
      customerGstin: customerGstin || undefined,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      billingAddress,
      shippingAddress: shippingAddress || billingAddress,
      customerState,
      customerStateCode,
      placeOfSupply,
      supplyType,
      reverseCharge: false,
      poNumber: poNumber || undefined,
      poDate: poDate || undefined,
      vehicleNumber: vehicleNumber || undefined,
      transporterName: transporterName || undefined,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      taxableTotal: Math.round(taxableTotal * 100) / 100,
      cgstTotal: Math.round(cgstTotal * 100) / 100,
      sgstTotal: Math.round(sgstTotal * 100) / 100,
      igstTotal: Math.round(igstTotal * 100) / 100,
      freightCharges: Number(freightCharges || 0),
      packagingCharges: Number(packagingCharges || 0),
      roundOff,
      grandTotal: roundedGrandTotal,
      totalInWords,
      status: initialDoc?.status || 'issued',
      paidAmount: initialDoc?.paidAmount || 0,
      balanceAmount: roundedGrandTotal - (initialDoc?.paidAmount || 0),
      upiQrEnabled,
      bankDetailsEnabled,
      selectedBankId,
      notes,
      terms,
    };

    if (docType === 'eway_bill' || vehicleNumber) {
      docPayload.ewayBillDetails = {
        ewayBillNumber: ewayBillNumber || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        ewayBillDate: date,
        transporterName,
        transportMode,
        distanceKm,
        vehicleNumber,
        validUntil: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      };
    }

    if (docType === 'delivery_challan' || docType === 'echallan') {
      docPayload.challanDetails = {
        challanType,
        dispatchDate: date,
        natureOfProcessing,
        receiverContact: customerName,
      };
    }

    try {
      let saved: Document;
      if (initialDoc?.id) {
        saved = await api.updateDocument(initialDoc.id, docPayload);
      } else {
        saved = await api.createDocument(docPayload);
      }
      setSaving(false);
      onSaveSuccess(saved, andPreview);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save document.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 sticky top-14 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                {initialDoc ? `Edit ${initialDoc.docNumber}` : 'Create New Document'}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                {docType.replace('_', ' ')}
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              {settings.companyName} · GST Bill Book
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>Save & Preview</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Document'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Primary Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Document Type & Numbering Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>1. Document Details</span>
          </h2>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="tax_invoice">GST Tax Invoice (AEW/TI/2026/...)</option>
              <option value="quotation">Quotation (AEW/QTN/2026/...)</option>
              <option value="proforma_invoice">Proforma Invoice (AEW/PI/2026/...)</option>
              <option value="delivery_challan">Delivery Challan (AEW/DC/2026/...)</option>
              <option value="eway_bill">E-Way Bill (AEW/EWB/2026/...)</option>
              <option value="echallan">E-Challan (AEW/EC/2026/...)</option>
              <option value="payment_receipt">Payment Receipt (AEW/PR/2026/...)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Doc Number</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Invoice Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">PO / WO Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-8921"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Customer Selection Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-500" />
              <span>2. Customer / Buyer</span>
            </h2>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Select Saved Client</label>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
            >
              <option value="">-- Choose Existing Client --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.city}, {c.state})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Company Name</label>
              <input
                type="text"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                placeholder="Company / Firm Name"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Customer GSTIN</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 27AABCT2727Q1ZV"
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Contact Person</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Person Name"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91..."
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Billing Address</label>
            <input
              type="text"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Full Billing Address"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>
        </div>

        {/* GST Place of Supply & Dispatch Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-slate-500" />
            <span>3. GST & Dispatch</span>
          </h2>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Place of Supply (State)</label>
            <select
              value={customerStateCode}
              onChange={(e) => {
                const code = e.target.value;
                const stateObj = INDIAN_STATES.find((s) => s.code === code);
                const sName = stateObj?.name || 'Maharashtra';
                setCustomerStateCode(code);
                setCustomerState(sName);
                setPlaceOfSupply(`${code}-${sName}`);

                const isInter = code !== (settings.stateCode || '27');
                const newST = isInter ? 'inter_state' : 'intra_state';
                setSupplyType(newST);
                setItems((prev) => prev.map((item) => calculateRowTaxes(item, newST)));
              }}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.code} - {st.name} {st.code === '27' ? '(Home State)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <span className="text-slate-600 font-medium">GST Tax Structure:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                supplyType === 'intra_state'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {supplyType === 'intra_state' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST 18%)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Vehicle No.</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="MH-12-..."
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Transporter</label>
              <input
                type="text"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                placeholder="e.g. VRL Logistics"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          {/* Conditional E-Way Bill fields */}
          {(docType === 'eway_bill' || vehicleNumber) && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Approx Distance (KM)</label>
                <input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full text-xs font-mono p-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Transport Mode</label>
                <select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value as any)}
                  className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none"
                >
                  <option value="Road">Road</option>
                  <option value="Rail">Rail</option>
                  <option value="Air">Air</option>
                  <option value="Ship">Ship</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Line Items & GST Breakdown ({items.length} items)
            </h2>
            <span className="text-[11px] text-slate-500">
              Select existing product to autofill or type custom engineering specification
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[220px]">Item / Engineering Part</th>
                <th className="py-2.5 px-3 w-24">HSN/SAC</th>
                <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                <th className="py-2.5 px-3 w-24">Unit</th>
                <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 w-20 text-right">Disc%</th>
                <th className="py-2.5 px-3 w-28 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 w-20 text-center">GST%</th>
                <th className="py-2.5 px-3 w-28 text-right">Tax (₹)</th>
                <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
                <th className="py-2.5 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const taxAmt = supplyType === 'intra_state' ? row.cgstAmount + row.sgstAmount : row.igstAmount;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    
                    {/* Item selection and description */}
                    <td className="py-2.5 px-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={row.productId || ''}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-36 text-[11px] p-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none"
                        >
                          <option value="">-- Catalog --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="Part Name / Machining Service"
                          className="flex-1 text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                        />
                      </div>
                      <input
                        type="text"
                        value={row.description || ''}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Material grade, tolerances, heat-treat, dimensions..."
                        className="w-full text-[11px] text-slate-500 p-1 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:bg-white"
                      />
                    </td>

                    {/* HSN */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.hsn}
                        onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                        className="w-full text-xs font-mono p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full text-xs font-mono text-right p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-3">
                      <select
                        value={row.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>

                    {/* Rate */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-full text-xs font-mono text-right p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.discountPercent}
                        onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                        className="w-full text-xs font-mono text-right p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                      />
                    </td>

                    {/* Taxable Amount */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                      {formatINR(row.taxableAmount)}
                    </td>

                    {/* GST Rate */}
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={row.gstRate}
                        onChange={(e) => handleItemChange(idx, 'gstRate', e.target.value)}
                        className="w-16 text-xs font-mono p-1 bg-white border border-slate-200 rounded focus:outline-none"
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </td>

                    {/* Tax Amount */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatINR(taxAmt)}
                    </td>

                    {/* Line Total */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(row.total)}
                    </td>

                    {/* Delete */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-red-600 disabled:opacity-20 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Another Product / Service Row</span>
          </button>
          <span className="text-xs text-slate-500">
            Total Items: <span className="font-mono font-bold text-slate-800">{items.length}</span>
          </span>
        </div>
      </div>

      {/* Bottom Split: Terms & Bank on left, Calculations on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Bank, UPI QR, and Terms Settings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>UPI QR, Bank Details & Terms</span>
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={upiQrEnabled}
                onChange={(e) => setUpiQrEnabled(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">Include UPI Payment QR</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={bankDetailsEnabled}
                onChange={(e) => setBankDetailsEnabled(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">Include Bank Details</span>
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Select Bank Account for Document
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              {settings.bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} - A/C: {b.accountNumber} ({b.ifsc}) {b.isDefault ? '[Default]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Terms & Conditions</label>
            <textarea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Internal Notes / Delivery Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Inspection certs, heat numbers, transporter receipt info..."
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>
        </div>

        {/* Right: Subtotal, Freight, Taxes & Indian Words Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-slate-600" />
            <span>Calculation Summary</span>
          </h2>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Gross Line Subtotal:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">{formatINR(subtotal)}</span>
            </div>

            {discountTotal > 0 && (
              <div className="flex justify-between py-1 text-emerald-600">
                <span>Total Discount Allowed:</span>
                <span className="font-mono tabular-nums font-semibold">- {formatINR(discountTotal)}</span>
              </div>
            )}

            <div className="flex justify-between py-1.5 font-semibold text-slate-800">
              <span>Taxable Value (Turnover):</span>
              <span className="font-mono tabular-nums text-sm text-slate-900">{formatINR(taxableTotal)}</span>
            </div>

            {supplyType === 'intra_state' ? (
              <>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Central GST (CGST Total):</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-800">{formatINR(cgstTotal)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>State GST (SGST Total):</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-800">{formatINR(sgstTotal)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1 text-purple-700 font-semibold">
                <span>Integrated GST (IGST Total):</span>
                <span className="font-mono tabular-nums">{formatINR(igstTotal)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Freight / Transport Charges</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={freightCharges}
                    onChange={(e) => setFreightCharges(Number(e.target.value))}
                    className="w-full pl-6 pr-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Packing & Forwarding</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={packagingCharges}
                    onChange={(e) => setPackagingCharges(Number(e.target.value))}
                    className="w-full pl-6 pr-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between py-1 text-slate-500 text-[11px]">
              <span>Round Off Adjustment:</span>
              <span className="font-mono tabular-nums">{roundOff >= 0 ? `+${roundOff}` : roundOff}</span>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-slate-900 font-bold text-base text-slate-900 bg-slate-50 px-3 rounded-lg">
              <span>Grand Total:</span>
              <span className="font-mono tabular-nums text-lg text-blue-900">{formatINR(roundedGrandTotal)}</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-900">
            <span className="font-semibold block text-[10px] uppercase tracking-wide text-blue-700">Amount in Words:</span>
            <span className="font-medium italic leading-relaxed">{totalInWords}</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Preview Document
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save & Issue Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
