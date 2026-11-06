import QRCode from 'qrcode';

export interface UpiParams {
  upiId: string;
  payeeName: string;
  amount: number;
  docNumber: string;
  note?: string;
}

export function buildUpiUri({ upiId, payeeName, amount, docNumber, note }: UpiParams): string {
  const cleanUpi = upiId.trim();
  const cleanName = payeeName.trim();
  const txNote = note || `Invoice ${docNumber}`;
  const formattedAmount = amount > 0 ? amount.toFixed(2) : '0.00';

  // Standard NPCI UPI URI Specification
  return `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(cleanName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(txNote)}`;
}

export async function generateUpiQrDataUrl(params: UpiParams): Promise<string> {
  const uri = buildUpiUri(params);
  try {
    const dataUrl = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 250,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    return '';
  }
}
