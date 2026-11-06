import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  ArrowLeft,
  Edit,
  Layers,
  ArrowRightCircle,
  Receipt,
  FileCheck,
  CheckCircle,
  Truck,
  Loader2
} from 'lucide-react';
import { CompanySettings, Document, DocumentCopyType, DocumentType } from '../types.ts';
import { formatINR } from '../utils/indianCurrency.ts';
import { generateUpiQrDataUrl } from '../utils/upiQr.ts';
import {
  downloadDocumentAsAutoTablePdf,
  downloadCombinedAutoTablePdf,
  downloadCombinedOriginalAndDuplicatePdf,
  downloadElementAsPdf
} from '../utils/pdfGenerator.ts';

interface DocumentPreviewProps {
  document: Document;
  settings: CompanySettings;
  onBack: () => void;
  onEdit: (doc: Document) => void;
  onConvert: (doc: Document, targetType: DocumentType) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document: doc,
  settings,
  onBack,
  onEdit,
  onConvert,
}) => {
  const [copyType, setCopyType] = useState<DocumentCopyType>('ORIGINAL');
  const [dynamicUpiQrUrl, setDynamicUpiQrUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string>('');
  const [exportError, setExportError] = useState<string>('');

  const originalDocRef = useRef<HTMLDivElement>(null);
  const duplicateDocRef = useRef<HTMLDivElement>(null);

  // Generate dynamic amount-based UPI QR code if enabled
  useEffect(() => {
    if (doc.upiQrEnabled && settings.upiId) {
      generateUpiQrDataUrl({
        upiId: settings.upiId,
        payeeName: settings.upiPayeeName || settings.companyName,
        amount: doc.grandTotal,
        docNumber: doc.docNumber,
        note: settings.paymentNote ? `${settings.paymentNote} ${doc.docNumber}` : doc.docNumber,
      }).then((url) => setDynamicUpiQrUrl(url));
    }
  }, [doc, settings]);

  const selectedBank =
    settings.bankAccounts.find((b) => b.id === doc.selectedBankId) ||
    settings.bankAccounts.find((b) => b.isDefault) ||
    settings.bankAccounts[0];

  const logoSrc = settings.logoUrl || '/src/assets/images/aew_industrial_logo_1793881800693.jpg';

  // Check if QR code is enabled for this document type
  const isQrAllowedForDoc = settings.qrVisibility ? settings.qrVisibility[doc.docType] !== false : true;
  const shouldShowQr = (doc.upiQrEnabled ?? true) && isQrAllowedForDoc;
  const effectiveQrImage =
    settings.qrMode === 'uploaded' && settings.uploadedQrUrl
      ? settings.uploadedQrUrl
      : dynamicUpiQrUrl;

  // Check if Bank Details are enabled for this document type
  const isBankAllowedForDoc = settings.bankVisibility ? settings.bankVisibility[doc.docType] !== false : true;
  const shouldShowBank = (doc.bankDetailsEnabled ?? true) && isBankAllowedForDoc && selectedBank;

  const docTitles: Record<string, string> = {
    tax_invoice: 'TAX INVOICE',
    quotation: 'QUOTATION / PRICE ESTIMATE',
    proforma_invoice: 'PROFORMA INVOICE',
    delivery_challan: 'DELIVERY CHALLAN',
    eway_bill: 'E-WAY BILL TRANSPORT RECORD',
    echallan: 'ELECTRONIC DELIVERY CHALLAN',
    payment_receipt: 'OFFICIAL PAYMENT RECEIPT',
  };

  const currentTitle = docTitles[doc.docType] || 'DOCUMENT';

  // Handle direct print
  const handlePrint = () => {
    window.print();
  };

  // Download single PDF (Original or Duplicate) using jsPDF & AutoTable
  const handleDownloadSinglePdf = async (targetCopy: DocumentCopyType) => {
    setIsExporting(true);
    setExportError('');
    setExportMessage(`Generating vector A4 PDF (${targetCopy} Copy)...`);
    try {
      const fileName = `${doc.docNumber.replace(/\//g, '_')}_${targetCopy}.pdf`;
      // Direct high-resolution AutoTable PDF generation
      await downloadDocumentAsAutoTablePdf(doc, settings, targetCopy, fileName, effectiveQrImage);
    } catch (err) {
      console.warn('AutoTable PDF export exception, attempting canvas fallback:', err);
      try {
        const targetElement = targetCopy === 'DUPLICATE' ? duplicateDocRef.current : originalDocRef.current;
        if (targetElement) {
          const fileName = `${doc.docNumber.replace(/\//g, '_')}_${targetCopy}.pdf`;
          await downloadElementAsPdf(targetElement, fileName);
        } else {
          throw err;
        }
      } catch (innerErr) {
        console.error('All PDF export methods failed:', innerErr);
        setExportError('PDF download was blocked by browser. Opening print view as fallback...');
        setTimeout(() => window.print(), 300);
      }
    } finally {
      setIsExporting(false);
      setExportMessage('');
    }
  };

  // Download combined 2-Page PDF (Original + Duplicate) using jsPDF & AutoTable
  const handleDownloadCombinedPdf = async () => {
    setIsExporting(true);
    setExportError('');
    setExportMessage('Generating Combined Multi-Page PDF (Original + Duplicate)...');
    try {
      const fileName = `${doc.docNumber.replace(/\//g, '_')}_Original_And_Duplicate.pdf`;
      // Direct high-resolution AutoTable PDF generation
      await downloadCombinedAutoTablePdf(doc, settings, fileName, effectiveQrImage);
    } catch (err) {
      console.warn('Combined AutoTable PDF export exception, attempting canvas fallback:', err);
      try {
        if (originalDocRef.current && duplicateDocRef.current) {
          const fileName = `${doc.docNumber.replace(/\//g, '_')}_Original_And_Duplicate.pdf`;
          await downloadCombinedOriginalAndDuplicatePdf(
            originalDocRef.current,
            duplicateDocRef.current,
            fileName
          );
        } else {
          throw err;
        }
      } catch (innerErr) {
        console.error('All Combined PDF export methods failed:', innerErr);
        setExportError('Combined PDF download was blocked by browser. Opening print view as fallback...');
        setTimeout(() => window.print(), 300);
      }
    } finally {
      setIsExporting(false);
      setExportMessage('');
    }
  };

  // Dedicated Payment Receipt Voucher Sheet
  const renderPaymentReceiptSheet = (targetCopy: DocumentCopyType, refTarget?: React.RefObject<HTMLDivElement | null>) => {
    const copySubtitle =
      targetCopy === 'ORIGINAL'
        ? 'ORIGINAL (FOR PAYER)'
        : targetCopy === 'DUPLICATE'
        ? 'DUPLICATE (FOR ACCOUNTS)'
        : 'TRIPLICATE (AUDIT RECORD)';

    return (
      <div
        ref={refTarget as any}
        className="w-full max-w-[850px] mx-auto bg-white p-8 border border-slate-300 shadow-md print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-900 text-xs"
        style={{ minHeight: '900px' }}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="AEW Logo"
              referrerPolicy="no-referrer"
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                {settings.companyName}
              </h1>
              <p className="text-[11px] text-slate-600 font-medium">{settings.tagline}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {settings.address}, {settings.city} - {settings.pincode}, {settings.state}
              </p>
              <p className="text-[10px] text-slate-500">
                Phone: {settings.phone} · Email: {settings.email}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xs">
              OFFICIAL PAYMENT RECEIPT
            </div>
            <div className="mt-1 text-[10px] font-semibold text-slate-600 tracking-wide uppercase">
              {copySubtitle}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              GSTIN: <span className="font-bold text-slate-800">{settings.gstin}</span>
            </div>
          </div>
        </div>

        {/* Receipt Voucher Body */}
        <div className="border border-slate-300 p-6 rounded-xs space-y-4 bg-slate-50/30">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Receipt Number:</span>
              <span className="font-mono text-base font-bold text-slate-900">{doc.docNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Receipt Date:</span>
              <span className="font-mono text-sm font-semibold text-slate-800">{doc.date}</span>
            </div>
          </div>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="text-slate-600 font-medium min-w-[140px]">Received with thanks from:</span>
              <span className="font-bold text-slate-900 text-sm border-b border-slate-300 flex-1 pb-0.5">
                {doc.customerCompany} {doc.customerName ? `(Attn: ${doc.customerName})` : ''}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-slate-600 font-medium min-w-[140px]">Customer GSTIN:</span>
              <span className="font-mono font-semibold text-slate-800 border-b border-slate-300 flex-1 pb-0.5">
                {doc.customerGstin || 'Not Registered / B2C'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-slate-600 font-medium min-w-[140px]">The Sum of Rupees:</span>
              <span className="font-semibold text-slate-900 italic border-b border-slate-300 flex-1 pb-0.5">
                {doc.totalInWords}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-slate-600 font-medium min-w-[140px]">Amount in Figures:</span>
              <span className="font-mono text-lg font-extrabold text-emerald-800 border-b border-slate-300 flex-1 pb-0.5">
                {formatINR(doc.grandTotal)}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-slate-600 font-medium min-w-[140px]">Payment Mode / Channel:</span>
              <span className="font-semibold text-slate-800 uppercase border-b border-slate-300 flex-1 pb-0.5">
                {doc.transporterName || 'NEFT / RTGS / Bank Transfer'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-slate-600 font-medium min-w-[140px]">In Settlement Of:</span>
              <span className="font-mono font-semibold text-blue-900 border-b border-slate-300 flex-1 pb-0.5">
                {doc.referenceDocNumber ? `Tax Invoice ${doc.referenceDocNumber}` : 'Account Running Balance Settlement'}
              </span>
            </div>

            {doc.notes && (
              <div className="flex items-baseline gap-2">
                <span className="text-slate-600 font-medium min-w-[140px]">Remarks:</span>
                <span className="text-slate-700 italic border-b border-slate-300 flex-1 pb-0.5">
                  {doc.notes}
                </span>
              </div>
            )}
          </div>

          {/* Bank & Signature Grid */}
          <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-200">
            <div>
              {shouldShowBank && (
                <div className="text-[11px] space-y-0.5">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">Remitted Into Account:</span>
                  <div className="font-semibold text-slate-900">{selectedBank.bankName}</div>
                  <div className="font-mono text-slate-700">A/C: {selectedBank.accountNumber}</div>
                  <div className="font-mono text-slate-700">IFSC: {selectedBank.ifsc}</div>
                  <div className="text-slate-500">{selectedBank.branch}</div>
                </div>
              )}
            </div>

            <div className="text-right flex flex-col justify-between">
              <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                For {settings.companyName}
              </div>
              <div className="pt-12">
                <div className="text-[10px] font-bold text-slate-800 border-t border-slate-300 pt-1 inline-block min-w-[160px]">
                  Authorized Signatory & Seal
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-400">
          * This is a computer generated official payment receipt voucher from Abhishek Engineering Works.
        </div>
      </div>
    );
  };

  // Standard A4 Document Sheet (Invoices, Quotations, Proforma, Challans, E-Way Bills)
  const renderDocumentSheet = (targetCopy: DocumentCopyType, refTarget?: React.RefObject<HTMLDivElement | null>) => {
    if (doc.docType === 'payment_receipt') {
      return renderPaymentReceiptSheet(targetCopy, refTarget);
    }

    const copySubtitle =
      targetCopy === 'ORIGINAL'
        ? 'ORIGINAL FOR RECIPIENT'
        : targetCopy === 'DUPLICATE'
        ? 'DUPLICATE FOR TRANSPORTER / SUPPLIER'
        : 'TRIPLICATE FOR SUPPLIER';

    return (
      <div
        ref={refTarget as any}
        className="w-full max-w-[850px] mx-auto bg-white p-8 border border-slate-300 shadow-md print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-900 text-xs"
        style={{ minHeight: '1120px' }}
      >
        {/* Header Ribbon / Copy Badge */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="AEW Logo"
              referrerPolicy="no-referrer"
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                {settings.companyName}
              </h1>
              <p className="text-[11px] text-slate-600 font-medium">
                {settings.tagline}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {settings.address}, {settings.city} - {settings.pincode}, {settings.state}
              </p>
              <p className="text-[10px] text-slate-500">
                Phone: {settings.phone} {settings.altPhone ? `· ${settings.altPhone}` : ''} · Email: {settings.email}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block px-2.5 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xs">
              {currentTitle}
            </div>
            <div className="mt-1 text-[10px] font-semibold text-slate-600 tracking-wide uppercase">
              {copySubtitle}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              GSTIN: <span className="font-bold text-slate-800">{settings.gstin}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              PAN: <span className="font-bold text-slate-800">{settings.pan}</span> · State Code: {settings.stateCode}
            </div>
          </div>
        </div>

        {/* Invoice Meta Grid */}
        <div className="grid grid-cols-2 gap-4 border border-slate-300 mb-4 p-3 bg-slate-50/50 rounded-xs">
          {/* Left: Invoice & Transport Details */}
          <div className="space-y-1">
            <div className="flex">
              <span className="w-28 font-semibold text-slate-700">Document No:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{doc.docNumber}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600">Document Date:</span>
              <span className="font-mono text-slate-800 font-medium">{doc.date}</span>
            </div>
            {doc.dueDate && (
              <div className="flex">
                <span className="w-28 text-slate-600">Due Date:</span>
                <span className="font-mono text-slate-800">{doc.dueDate}</span>
              </div>
            )}
            {doc.poNumber && (
              <div className="flex">
                <span className="w-28 text-slate-600">Buyer PO No:</span>
                <span className="font-mono font-semibold text-slate-800">{doc.poNumber}</span>
              </div>
            )}
            {doc.vehicleNumber && (
              <div className="flex">
                <span className="w-28 text-slate-600">Vehicle No:</span>
                <span className="font-mono font-bold text-slate-800">{doc.vehicleNumber}</span>
              </div>
            )}
            {doc.transporterName && (
              <div className="flex">
                <span className="w-28 text-slate-600">Transporter:</span>
                <span className="text-slate-800">{doc.transporterName}</span>
              </div>
            )}
          </div>

          {/* Right: State & GST Details */}
          <div className="space-y-1">
            <div className="flex">
              <span className="w-28 text-slate-600">Place of Supply:</span>
              <span className="font-semibold text-slate-800">{doc.placeOfSupply}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600">Supply Type:</span>
              <span className="text-slate-800 capitalize font-medium">
                {doc.supplyType === 'intra_state' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST 18%)'}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600">Reverse Charge:</span>
              <span className="text-slate-800">{doc.reverseCharge ? 'Yes' : 'No'}</span>
            </div>
            {doc.referenceDocNumber && (
              <div className="flex">
                <span className="w-28 text-slate-600">Ref Document:</span>
                <span className="font-mono text-blue-800 font-semibold">{doc.referenceDocNumber}</span>
              </div>
            )}
            {doc.ewayBillDetails?.ewayBillNumber && (
              <div className="flex">
                <span className="w-28 text-slate-600">E-Way Bill No:</span>
                <span className="font-mono text-emerald-800 font-bold">{doc.ewayBillDetails.ewayBillNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Customer (Bill To & Ship To) */}
        <div className="grid grid-cols-2 gap-4 border border-slate-300 mb-4 p-3 rounded-xs">
          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
              Billed To (Buyer)
            </div>
            <div className="font-bold text-slate-900 text-sm leading-tight">
              {doc.customerCompany}
            </div>
            <div className="text-slate-600 mt-0.5">Attn: {doc.customerName}</div>
            <div className="text-slate-600 leading-relaxed mt-0.5 whitespace-pre-line">{doc.billingAddress}</div>
            <div className="mt-1 space-y-0.5">
              {doc.customerGstin && (
                <div>
                  GSTIN: <span className="font-mono font-bold text-slate-900">{doc.customerGstin}</span>
                </div>
              )}
              <div>
                State: <span className="font-medium">{doc.customerState} (Code: {doc.customerStateCode})</span>
              </div>
              {doc.customerPhone && <div>Phone: {doc.customerPhone}</div>}
            </div>
          </div>

          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
              Shipped To (Consignee)
            </div>
            <div className="font-bold text-slate-900 text-sm leading-tight">
              {doc.customerCompany}
            </div>
            <div className="text-slate-600 leading-relaxed mt-1 whitespace-pre-line">
              {doc.shippingAddress || doc.billingAddress}
            </div>
            <div className="mt-1">
              State: <span className="font-medium">{doc.customerState} (Code: {doc.customerStateCode})</span>
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <table className="w-full text-left text-xs border border-slate-300 mb-4">
          <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
            <tr>
              <th className="py-2 px-2.5 w-8 text-center border-r border-slate-300">#</th>
              <th className="py-2 px-2.5 border-r border-slate-300">Description of Goods / Services</th>
              <th className="py-2 px-2.5 w-20 text-center border-r border-slate-300">HSN/SAC</th>
              <th className="py-2 px-2.5 w-16 text-right border-r border-slate-300">Qty</th>
              <th className="py-2 px-2.5 w-14 text-center border-r border-slate-300">Unit</th>
              <th className="py-2 px-2.5 w-20 text-right border-r border-slate-300">Rate (₹)</th>
              <th className="py-2 px-2.5 w-16 text-right border-r border-slate-300">Disc</th>
              <th className="py-2 px-2.5 w-24 text-right border-r border-slate-300">Taxable (₹)</th>
              <th className="py-2 px-2.5 w-14 text-center border-r border-slate-300">GST</th>
              <th className="py-2 px-2.5 w-24 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {doc.items && doc.items.length > 0 ? (
              doc.items.map((item, idx) => (
                <tr key={item.id} className="align-top">
                  <td className="py-2 px-2 text-center font-mono border-r border-slate-300 text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    {item.description && (
                      <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">{item.description}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono border-r border-slate-300 text-slate-700">
                    {item.hsn}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-medium border-r border-slate-300">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2 text-center border-r border-slate-300 text-slate-600">
                    {item.unit}
                  </td>
                  <td className="py-2 px-2 text-right font-mono border-r border-slate-300">
                    {item.rate.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-600 border-r border-slate-300">
                    {item.discountAmount > 0 ? item.discountAmount.toFixed(2) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-medium border-r border-slate-300">
                    {item.taxableAmount.toFixed(2)}
                  </td>
                  <td className="py-2 px-1 text-center font-mono text-[11px] border-r border-slate-300">
                    {item.gstRate}%
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                    {item.total.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="py-4 text-center text-slate-400">
                  No line items specified
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Tax Summary Breakup & Grand Totals */}
        <div className="grid grid-cols-12 gap-4 border border-slate-300 mb-4 p-3 rounded-xs">
          {/* Left Column: Tax Breakup Table & Amount in Words */}
          <div className="col-span-7 space-y-3">
            <div>
              <div className="font-bold text-[10px] uppercase tracking-wider text-slate-700 mb-1">
                GST Tax Breakup Details
              </div>
              <table className="w-full text-[10px] border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-1 text-left">HSN/SAC</th>
                    <th className="p-1 text-right">Taxable</th>
                    {doc.supplyType === 'intra_state' ? (
                      <>
                        <th className="p-1 text-right">CGST</th>
                        <th className="p-1 text-right">SGST</th>
                      </>
                    ) : (
                      <th className="p-1 text-right">IGST</th>
                    )}
                    <th className="p-1 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {doc.items &&
                    doc.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-1">{it.hsn}</td>
                        <td className="p-1 text-right">{it.taxableAmount.toFixed(2)}</td>
                        {doc.supplyType === 'intra_state' ? (
                          <>
                            <td className="p-1 text-right">{it.cgstAmount.toFixed(2)}</td>
                            <td className="p-1 text-right">{it.sgstAmount.toFixed(2)}</td>
                          </>
                        ) : (
                          <td className="p-1 text-right">{it.igstAmount.toFixed(2)}</td>
                        )}
                        <td className="p-1 text-right font-semibold">
                          {(it.cgstAmount + it.sgstAmount + it.igstAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  <tr className="bg-slate-50 font-bold border-t border-slate-300">
                    <td className="p-1">Total</td>
                    <td className="p-1 text-right">{doc.taxableTotal.toFixed(2)}</td>
                    {doc.supplyType === 'intra_state' ? (
                      <>
                        <td className="p-1 text-right">{doc.cgstTotal.toFixed(2)}</td>
                        <td className="p-1 text-right">{doc.sgstTotal.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="p-1 text-right">{doc.igstTotal.toFixed(2)}</td>
                    )}
                    <td className="p-1 text-right">
                      {(doc.cgstTotal + doc.sgstTotal + doc.igstTotal).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Total Amount in Words:
              </span>
              <span className="font-semibold text-slate-900 italic text-[11px]">
                {doc.totalInWords}
              </span>
            </div>
          </div>

          {/* Right Column: Financial Totals */}
          <div className="col-span-5 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between py-0.5 text-slate-700">
              <span>Gross Subtotal:</span>
              <span className="font-semibold">{formatINR(doc.subtotal)}</span>
            </div>
            {doc.discountTotal > 0 && (
              <div className="flex justify-between py-0.5 text-emerald-700">
                <span>Total Discount:</span>
                <span>- {formatINR(doc.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between py-0.5 font-bold border-t border-slate-200 pt-1">
              <span>Taxable Total:</span>
              <span>{formatINR(doc.taxableTotal)}</span>
            </div>
            {doc.supplyType === 'intra_state' ? (
              <>
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>Central GST (CGST):</span>
                  <span>{formatINR(doc.cgstTotal)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>State GST (SGST):</span>
                  <span>{formatINR(doc.sgstTotal)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-0.5 text-purple-700 font-semibold">
                <span>Integrated GST (IGST):</span>
                <span>{formatINR(doc.igstTotal)}</span>
              </div>
            )}
            {doc.freightCharges > 0 && (
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Freight Charges:</span>
                <span>{formatINR(doc.freightCharges)}</span>
              </div>
            )}
            {doc.packagingCharges > 0 && (
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Packing & Forwarding:</span>
                <span>{formatINR(doc.packagingCharges)}</span>
              </div>
            )}
            {doc.roundOff !== 0 && (
              <div className="flex justify-between py-0.5 text-slate-500 text-[10px]">
                <span>Round Off:</span>
                <span>{doc.roundOff >= 0 ? `+${doc.roundOff}` : doc.roundOff}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-slate-900 font-bold text-sm text-slate-900 bg-slate-100 px-2 rounded-xs mt-2">
              <span>GRAND TOTAL:</span>
              <span className="text-base font-extrabold">{formatINR(doc.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Bank Details & UPI QR Code Section */}
        <div className="grid grid-cols-12 gap-4 border border-slate-300 mb-4 p-3 rounded-xs">
          {/* Bank details */}
          <div className="col-span-8 space-y-1">
            <div className="font-bold text-[10px] uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              Bank Remittance Details (RTGS / NEFT / IMPS)
            </div>
            {shouldShowBank ? (
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Bank Name:</span>
                  <span className="font-bold text-slate-800">{selectedBank.bankName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Account Holder:</span>
                  <span className="font-semibold text-slate-800">{selectedBank.accountHolder}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Account Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedBank.accountNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">IFSC Code:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedBank.ifsc}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">Branch:</span>
                  <span className="text-slate-700">{selectedBank.branch}</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 py-2 italic text-[11px]">
                Bank remittance details not attached to this document.
              </div>
            )}
          </div>

          {/* UPI QR Code */}
          <div className="col-span-4 flex flex-col items-center justify-center border-l border-slate-200 pl-4 text-center">
            {shouldShowQr && effectiveQrImage ? (
              <>
                <img
                  src={effectiveQrImage}
                  alt="UPI QR Code"
                  className="w-24 h-24 object-contain border border-slate-200 p-0.5 rounded-xs bg-white"
                />
                <span className="text-[10px] font-bold text-slate-800 mt-1">
                  {settings.qrMode === 'uploaded' ? 'Scan Merchant Standee QR' : 'Scan to Pay via UPI'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">GPay / PhonePe / Paytm</span>
                <span className="text-[9px] text-slate-400 font-mono">{settings.upiId}</span>
              </>
            ) : (
              <div className="text-slate-400 text-[10px] italic">
                UPI QR disabled for this document
              </div>
            )}
          </div>
        </div>

        {/* Terms & Signatures */}
        <div className="grid grid-cols-12 gap-4 border border-slate-300 p-3 rounded-xs min-h-[110px]">
          <div className="col-span-7 space-y-1">
            <div className="font-bold text-[10px] uppercase tracking-wider text-slate-700">
              Terms & Conditions:
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed whitespace-pre-line">
              {doc.terms || settings.paymentTerms}
            </p>
            {doc.notes && (
              <p className="text-[10px] text-slate-500 italic mt-1">
                Note: {doc.notes}
              </p>
            )}
          </div>

          <div className="col-span-5 flex flex-col justify-between text-right pl-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                For {settings.companyName}
              </span>
            </div>

            <div className="pt-8">
              <div className="text-[10px] font-bold text-slate-800 border-t border-slate-300 pt-1 inline-block min-w-[160px]">
                Authorized Signatory & Seal
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Action Header (No Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 sticky top-14 z-30 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 font-mono">
                {doc.docNumber}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                  doc.status === 'paid'
                    ? 'bg-emerald-50 text-emerald-700'
                    : doc.status === 'partially_paid'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {doc.status}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {doc.customerCompany} · {formatINR(doc.grandTotal)}
            </span>
          </div>
        </div>

        {/* Copy Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setCopyType('ORIGINAL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              copyType === 'ORIGINAL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setCopyType('DUPLICATE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              copyType === 'DUPLICATE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Duplicate
          </button>
          <button
            onClick={() => setCopyType('TRIPLICATE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              copyType === 'TRIPLICATE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Triplicate
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onEdit(doc)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A4</span>
          </button>

          <button
            onClick={() => handleDownloadSinglePdf(copyType)}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Download className="w-3.5 h-3.5 text-blue-600" />}
            <span>Download {copyType} PDF</span>
          </button>

          <button
            onClick={handleDownloadCombinedPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Combined (Orig + Dup) PDF</span>
          </button>
        </div>
      </div>

      {/* Progress banner when exporting PDF */}
      {isExporting && (
        <div className="bg-blue-600 text-white text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-between no-print animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-semibold">{exportMessage || 'Preparing high-resolution A4 PDF...'}</span>
          </div>
          <span className="text-[11px] opacity-80">Hold on while we format the pages</span>
        </div>
      )}

      {exportError && (
        <div className="bg-amber-500 text-white text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{exportError}</span>
          </div>
          <button onClick={() => setExportError('')} className="text-white hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Quick ERP Conversion Ribbon */}
      <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl flex items-center justify-between gap-4 no-print text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <ArrowRightCircle className="w-4 h-4 text-blue-600" />
          <span className="font-semibold">Quick ERP Conversion:</span>
          <span>Convert this document without retyping line items:</span>
        </div>

        <div className="flex items-center gap-2">
          {doc.docType === 'quotation' && (
            <>
              <button
                onClick={() => onConvert(doc, 'proforma_invoice')}
                className="px-2.5 py-1 font-semibold bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-md transition-colors cursor-pointer"
              >
                Convert to Proforma
              </button>
              <button
                onClick={() => onConvert(doc, 'tax_invoice')}
                className="px-2.5 py-1 font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                Convert to Tax Invoice
              </button>
            </>
          )}

          {doc.docType === 'proforma_invoice' && (
            <button
              onClick={() => onConvert(doc, 'tax_invoice')}
              className="px-2.5 py-1 font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              Convert to GST Tax Invoice
            </button>
          )}

          {doc.docType === 'tax_invoice' && (
            <>
              <button
                onClick={() => onConvert(doc, 'delivery_challan')}
                className="px-2.5 py-1 font-semibold bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-md transition-colors cursor-pointer"
              >
                Create Delivery Challan
              </button>
              <button
                onClick={() => onConvert(doc, 'eway_bill')}
                className="px-2.5 py-1 font-semibold bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-md transition-colors cursor-pointer"
              >
                Generate E-Way Bill
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Sheet: Rendered in active DOM for preview and single Original PDF download */}
      <div>{renderDocumentSheet(copyType, originalDocRef)}</div>

      {/* Duplicate Sheet: Rendered with positive fixed coordinates and opacity: 0 for reliable html2canvas capture */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '850px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -9999,
        }}
      >
        {renderDocumentSheet('DUPLICATE', duplicateDocRef)}
      </div>
    </div>
  );
};
