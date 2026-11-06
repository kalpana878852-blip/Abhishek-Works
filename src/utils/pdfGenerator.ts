import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { CompanySettings, Document, DocumentCopyType } from '../types.ts';
import { formatINR, numberToIndianWords } from './indianCurrency.ts';

// Helper to trigger safe browser file download via Blob URL
export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);

  try {
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  } catch (_) {
    link.click();
  }

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 4000);
}

/**
 * Format raw numbers to Indian currency string without symbol for clean PDF table alignment
 */
function numStr(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(Number(val))) return '0.00';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Build a single page (or multi-page) native jsPDF + AutoTable document
 */
function buildAutoTableDocument(
  pdf: jsPDF,
  doc: Document,
  settings: CompanySettings,
  copyType: DocumentCopyType,
  qrDataUrl?: string,
  isFirstDoc: boolean = true
): void {
  if (!isFirstDoc) {
    pdf.addPage();
  }

  const pageWidth = 210;
  const pageHeight = 297;
  const left = 10;
  const right = 200;
  const contentWidth = right - left; // 190mm

  // Brand Colors
  const navyRgb: [number, number, number] = [15, 39, 68];
  const slateRgb: [number, number, number] = [71, 85, 105];
  const borderRgb: [number, number, number] = [203, 213, 225];

  // 1. Top Document Header Box
  let y = 10;
  pdf.setDrawColor(...navyRgb);
  pdf.setLineWidth(0.6);
  pdf.line(left, y, right, y);

  y += 4;
  // Left: Company Info
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...navyRgb);
  pdf.text(settings.companyName || 'ABHISHEK ENGINEERING WORKS', left, y + 2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...slateRgb);
  pdf.text(settings.tagline || 'Precision Machining, Industrial Fabrication & CNC Components', left, y + 6);
  pdf.text(`${settings.address || 'Plot W-12, Phase II, MIDC Industrial Area'}, ${settings.city || 'Pune'} - ${settings.pincode || '411026'}, ${settings.state || 'Maharashtra'}`, left, y + 9.5);
  pdf.text(`Phone: ${settings.phone || '+91 98220 12345'} | Email: ${settings.email || 'info@abhishekindustries.in'}`, left, y + 13);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`GSTIN: ${settings.gstin || '27AABCA1234F1Z5'} | PAN: ${settings.pan || 'AABCA1234F'}`, left, y + 16.5);

  // Right: Document Title & Copy Type
  const titleMap: Record<string, string> = {
    tax_invoice: 'GST TAX INVOICE',
    quotation: 'ENGINEERING QUOTATION',
    proforma_invoice: 'PROFORMA INVOICE',
    delivery_challan: 'DELIVERY CHALLAN',
    echallan: 'ELECTRONIC DELIVERY CHALLAN',
    eway_bill: 'E-WAY BILL PASS',
    payment_receipt: 'OFFICIAL PAYMENT RECEIPT',
  };

  const copySubtitleMap: Record<DocumentCopyType, string> = {
    ORIGINAL: 'ORIGINAL FOR RECIPIENT',
    DUPLICATE: 'DUPLICATE FOR TRANSPORTER / SUPPLIER',
    TRIPLICATE: 'TRIPLICATE FOR AUDIT RECORD',
  };

  const docTitle = titleMap[doc.docType] || 'DOCUMENT';
  const copySubtitle = copySubtitleMap[copyType] || 'ORIGINAL';

  pdf.setFillColor(...navyRgb);
  pdf.rect(right - 68, y - 1, 68, 7.5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text(docTitle, right - 34, y + 4, { align: 'center' });

  pdf.setFontSize(7);
  pdf.setTextColor(15, 23, 42);
  pdf.text(copySubtitle, right - 34, y + 10.5, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.text(`State Code: ${settings.stateCode || '27'} (${settings.state || 'Maharashtra'})`, right - 34, y + 14, { align: 'center' });

  y += 20;
  pdf.setDrawColor(...borderRgb);
  pdf.setLineWidth(0.3);
  pdf.line(left, y, right, y);

  // 2. Buyer and Invoice Metadata Grid
  y += 2;
  const metaBoxHeight = 28;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(left, y, contentWidth, metaBoxHeight, 'F');
  pdf.rect(left, y, contentWidth, metaBoxHeight, 'D');

  // Vertical separator in meta box
  pdf.line(left + 100, y, left + 100, y + metaBoxHeight);

  // Buyer Info (Left half)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...navyRgb);
  pdf.text('BILLED TO / BUYER DETAILS:', left + 3, y + 4);

  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(doc.customerCompany || doc.customerName || 'Cash Customer', left + 3, y + 8.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...slateRgb);
  pdf.text(`Attn: ${doc.customerName || '-'} | Phone: ${doc.customerPhone || '-'}`, left + 3, y + 12.5);
  pdf.text(`Address: ${(doc.billingAddress || 'Local Address').substring(0, 55)}`, left + 3, y + 16.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`GSTIN: ${doc.customerGstin || 'Unregistered / B2C'}`, left + 3, y + 20.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`State: ${doc.customerState || 'Maharashtra'} (Code: ${doc.customerStateCode || '27'})`, left + 3, y + 24.5);

  // Document Metadata (Right half)
  const metaX = left + 103;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...navyRgb);
  pdf.text('DOCUMENT & SUPPLY DETAILS:', metaX, y + 4);

  pdf.setFontSize(7.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Doc Number:', metaX, y + 8.5);
  pdf.text(doc.docNumber, metaX + 35, y + 8.5);

  pdf.setFont('helvetica', 'normal');
  pdf.text('Date of Issue:', metaX, y + 12.5);
  pdf.text(doc.date, metaX + 35, y + 12.5);

  pdf.text('Place of Supply:', metaX, y + 16.5);
  pdf.text(doc.placeOfSupply || '27-Maharashtra', metaX + 35, y + 16.5);

  pdf.text('PO Number & Date:', metaX, y + 20.5);
  pdf.text(`${doc.poNumber || '-'} ${doc.poDate ? `(${doc.poDate})` : ''}`, metaX + 35, y + 20.5);

  pdf.text('Vehicle / Transport:', metaX, y + 24.5);
  pdf.text(`${doc.vehicleNumber || '-'} / ${doc.transporterName || '-'}`, metaX + 35, y + 24.5);

  y += metaBoxHeight + 3;

  // 3. Items AutoTable
  const isInterState = doc.supplyType === 'inter_state';

  const tableHead = isInterState
    ? [['#', 'Item Description & Specification', 'HSN/SAC', 'Qty', 'Unit', 'Rate (Rs)', 'Taxable (Rs)', 'IGST %', 'IGST (Rs)', 'Total (Rs)']]
    : [['#', 'Item Description & Specification', 'HSN/SAC', 'Qty', 'Unit', 'Rate (Rs)', 'Taxable (Rs)', 'CGST (Rs)', 'SGST (Rs)', 'Total (Rs)']];

  const tableBody = doc.items.map((item, idx) => {
    if (isInterState) {
      return [
        String(idx + 1),
        item.description ? `${item.name}\n${item.description}` : item.name,
        item.hsn || '-',
        String(item.quantity),
        item.unit || 'NOS',
        numStr(item.rate),
        numStr(item.taxableAmount),
        `${item.igstRate || item.gstRate}%`,
        numStr(item.igstAmount),
        numStr(item.total),
      ];
    }
    return [
      String(idx + 1),
      item.description ? `${item.name}\n${item.description}` : item.name,
      item.hsn || '-',
      String(item.quantity),
      item.unit || 'NOS',
      numStr(item.rate),
      numStr(item.taxableAmount),
      `${numStr(item.cgstAmount)} (${item.cgstRate}%)`,
      `${numStr(item.sgstAmount)} (${item.sgstRate}%)`,
      numStr(item.total),
    ];
  });

  autoTable(pdf, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left, right: pageWidth - right },
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      lineColor: borderRgb,
      lineWidth: 0.2,
      textColor: [30, 41, 59],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: navyRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { halign: 'left', cellWidth: 62 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 11 },
      5: { halign: 'right', cellWidth: 17 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 16 },
      8: { halign: 'right', cellWidth: 16 },
      9: { halign: 'right', cellWidth: 15 },
    },
  });

  // 4. Totals and Summary Box below table
  const finalY = (pdf as any).lastAutoTable?.finalY || y + 40;
  let summaryY = finalY + 2;

  // Check if we have room on the page for totals, terms, bank details, and signatures (requires ~65mm)
  if (summaryY + 65 > pageHeight - 10) {
    pdf.addPage();
    summaryY = 15;
  }

  // Left Column: Amount in Words, Bank Details, UPI QR, Terms
  const leftColWidth = 115;
  const rightColWidth = contentWidth - leftColWidth - 2; // ~73mm
  const rightColX = left + leftColWidth + 2;

  // Box for Amount in Words
  pdf.setFillColor(241, 245, 249);
  pdf.rect(left, summaryY, leftColWidth, 11, 'F');
  pdf.rect(left, summaryY, leftColWidth, 11, 'D');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...slateRgb);
  pdf.text('TOTAL AMOUNT IN WORDS (INR):', left + 2, summaryY + 3.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...navyRgb);
  const words = doc.totalInWords || numberToIndianWords(doc.grandTotal);
  pdf.text(words.substring(0, 75), left + 2, summaryY + 8);

  // Bank & UPI Section
  let bankY = summaryY + 13;
  const selectedBank =
    settings.bankAccounts?.find((b) => b.id === doc.selectedBankId) ||
    settings.bankAccounts?.find((b) => b.isDefault) ||
    settings.bankAccounts?.[0];

  const showBank = (doc.bankDetailsEnabled ?? true) && (settings.bankVisibility ? settings.bankVisibility[doc.docType] !== false : true) && selectedBank;
  const showQr = (doc.upiQrEnabled ?? true) && (settings.qrVisibility ? settings.qrVisibility[doc.docType] !== false : true);

  if (showBank) {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(left, bankY, leftColWidth, 24, 'D');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...navyRgb);
    pdf.text('BANK DETAILS FOR DIRECT RTGS / NEFT / IMPS:', left + 2, bankY + 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Bank Name: ${selectedBank.bankName}`, left + 2, bankY + 8);
    pdf.text(`A/C Holder: ${selectedBank.accountHolder || settings.companyName}`, left + 2, bankY + 11.5);
    pdf.text(`A/C Number: ${selectedBank.accountNumber}`, left + 2, bankY + 15);
    pdf.text(`IFSC Code: ${selectedBank.ifsc} | Branch: ${selectedBank.branch}`, left + 2, bankY + 18.5);
    pdf.text(`Account Type: ${selectedBank.accountType || 'Current Account'}`, left + 2, bankY + 22);

    // Embed QR image if available on the right side of the bank box
    if (showQr && qrDataUrl && qrDataUrl.startsWith('data:image')) {
      try {
        pdf.addImage(qrDataUrl, 'PNG', left + leftColWidth - 24, bankY + 1.5, 21, 21);
      } catch (e) {
        // Fallback silently if image format mismatch
      }
    }
    bankY += 26;
  }

  // Terms & Conditions Box
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...slateRgb);
  pdf.text('TERMS & CONDITIONS:', left, bankY + 3);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(...slateRgb);
  const termsText = doc.terms || settings.paymentTerms || '1. Goods once sold will not be taken back. 2. Interest @ 18% p.a. charged if payment delayed. 3. Subject to Pune jurisdiction.';
  pdf.text(termsText.substring(0, 110), left, bankY + 7);

  // Right Column: Financial Calculations Summary Table
  const calcRows = [
    ['Subtotal (Gross):', `Rs. ${numStr(doc.subtotal)}`],
    ['Taxable Amount:', `Rs. ${numStr(doc.taxableTotal)}`],
  ];

  if (isInterState) {
    calcRows.push(['Integrated GST (IGST):', `Rs. ${numStr(doc.igstTotal || 0)}`]);
  } else {
    calcRows.push(['Central GST (CGST):', `Rs. ${numStr(doc.cgstTotal || 0)}`]);
    calcRows.push(['State GST (SGST):', `Rs. ${numStr(doc.sgstTotal || 0)}`]);
  }

  if (doc.freightCharges && doc.freightCharges > 0) {
    calcRows.push(['Freight & Logistics:', `Rs. ${numStr(doc.freightCharges)}`]);
  }
  if (doc.packagingCharges && doc.packagingCharges > 0) {
    calcRows.push(['Packaging & Handling:', `Rs. ${numStr(doc.packagingCharges)}`]);
  }
  if (doc.roundOff !== 0) {
    calcRows.push(['Round Off:', `Rs. ${numStr(doc.roundOff)}`]);
  }

  autoTable(pdf, {
    startY: summaryY,
    margin: { left: rightColX },
    tableWidth: rightColWidth,
    theme: 'plain',
    body: calcRows,
    styles: {
      fontSize: 7.2,
      cellPadding: 1.2,
      font: 'helvetica',
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 38 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: rightColWidth - 38 },
    },
  });

  const totalsFinalY = (pdf as any).lastAutoTable?.finalY || summaryY + 25;

  // Grand Total Highlight Ribbon
  pdf.setFillColor(...navyRgb);
  pdf.rect(rightColX, totalsFinalY + 1, rightColWidth, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('GRAND TOTAL:', rightColX + 2, totalsFinalY + 6.2);
  pdf.text(`Rs. ${numStr(doc.grandTotal)}`, right - 2, totalsFinalY + 6.2, { align: 'right' });

  // 5. Signatures Block at the bottom
  const sigY = Math.max(bankY + 10, totalsFinalY + 12);
  pdf.setDrawColor(...borderRgb);
  pdf.setLineWidth(0.3);
  pdf.line(left, sigY, right, sigY);

  // Left Signature: Receiver / Buyer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...slateRgb);
  pdf.text("Customer / Receiver's Signature", left, sigY + 16);

  // Right Signature: For Abhishek Engineering Works
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...navyRgb);
  pdf.text(`For ${settings.companyName || 'ABHISHEK ENGINEERING WORKS'}`, right - 50, sigY + 5, { align: 'left' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...slateRgb);
  pdf.text('Authorised Signatory', right - 50, sigY + 16, { align: 'left' });

  // Footer: Computer generated notice
  pdf.setFontSize(6);
  pdf.setTextColor(148, 163, 184);
  pdf.text('This is an authentic computer generated document issued by Abhishek Engineering Works.', left, pageHeight - 5);
}

/**
 * 1. Download Document as Native Vector PDF via jsPDF & AutoTable
 * Fast, crisp, vector-sharp, perfect A4 pagination.
 */
export async function downloadDocumentAsAutoTablePdf(
  doc: Document,
  settings: CompanySettings,
  copyType: DocumentCopyType = 'ORIGINAL',
  fileName?: string,
  qrDataUrl?: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  buildAutoTableDocument(pdf, doc, settings, copyType, qrDataUrl, true);

  const safeName = fileName || `${doc.docNumber.replace(/\//g, '_')}_${copyType}.pdf`;
  const pdfBlob = pdf.output('blob');
  triggerBlobDownload(pdfBlob, safeName);
}

/**
 * 2. Download Combined Original + Duplicate in a single Native Vector PDF
 */
export async function downloadCombinedAutoTablePdf(
  doc: Document,
  settings: CompanySettings,
  fileName?: string,
  qrDataUrl?: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Page 1: Original Copy
  buildAutoTableDocument(pdf, doc, settings, 'ORIGINAL', qrDataUrl, true);

  // Page 2: Duplicate Copy
  buildAutoTableDocument(pdf, doc, settings, 'DUPLICATE', qrDataUrl, false);

  const safeName = fileName || `${doc.docNumber.replace(/\//g, '_')}_Original_And_Duplicate.pdf`;
  const pdfBlob = pdf.output('blob');
  triggerBlobDownload(pdfBlob, safeName);
}

/**
 * HTML-To-Canvas Fallback / Hybrid PDF Downloader
 */
async function inlineImages(root: HTMLElement): Promise<void> {
  const images = root.querySelectorAll('img');
  const promises = Array.from(images).map(async (img) => {
    try {
      if (img.src && !img.src.startsWith('data:')) {
        if (img.complete && img.naturalWidth > 0) {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            img.src = c.toDataURL('image/png');
          }
        }
      }
    } catch (_) {}
  });
  await Promise.all(promises);
}

async function renderElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  await inlineImages(element);
  return await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc) => {
      const allClones = clonedDoc.querySelectorAll('*');
      allClones.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          (htmlEl.style as any).colorAdjust = 'exact';
          (htmlEl.style as any).webkitColorAdjust = 'exact';
        }
      });
    },
  });
}

function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, isFirstPage: boolean = true): void {
  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const marginMm = 6;
  const contentWidthMm = pageWidthMm - marginMm * 2;
  const contentHeightMm = pageHeightMm - marginMm * 2;

  const imgHeight = (canvas.height * contentWidthMm) / canvas.width;

  if (imgHeight <= contentHeightMm) {
    if (!isFirstPage) pdf.addPage();
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentWidthMm, imgHeight);
  } else {
    const pxPerPage = (canvas.width * contentHeightMm) / contentWidthMm;
    const totalPages = Math.ceil(canvas.height / pxPerPage);

    for (let page = 0; page < totalPages; page++) {
      if (!isFirstPage || page > 0) {
        pdf.addPage();
      }

      const sourceY = page * pxPerPage;
      const sourceHeight = Math.min(pxPerPage, canvas.height - sourceY);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const renderedHeightMm = (sourceHeight * contentWidthMm) / canvas.width;
        pdf.addImage(pageImgData, 'JPEG', marginMm, marginMm, contentWidthMm, renderedHeightMm);
      }
    }
  }
}

export async function downloadElementAsPdf(element: HTMLElement, fileName: string): Promise<void> {
  const canvas = await renderElementToCanvas(element);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  addCanvasToPdf(pdf, canvas, true);
  const pdfBlob = pdf.output('blob');
  triggerBlobDownload(pdfBlob, fileName);
}

export async function downloadCombinedOriginalAndDuplicatePdf(
  originalElement: HTMLElement,
  duplicateElement: HTMLElement,
  fileName: string
): Promise<void> {
  const [canvasOrig, canvasDup] = await Promise.all([
    renderElementToCanvas(originalElement),
    renderElementToCanvas(duplicateElement),
  ]);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  addCanvasToPdf(pdf, canvasOrig, true);
  addCanvasToPdf(pdf, canvasDup, false);

  const pdfBlob = pdf.output('blob');
  triggerBlobDownload(pdfBlob, fileName);
}
