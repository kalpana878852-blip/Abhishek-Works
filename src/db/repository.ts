import { db } from './index.ts';
import { companySettings, customers, docSequences, documents, payments, products, users } from './schema.ts';
import { desc, eq, sql } from 'drizzle-orm';

// Indian Currency to Words converter
export function convertNumberToIndianWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const roundNum = Math.round(num);
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + units[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred) res += units[hundred] + ' Hundred';
    if (rest) res += (res ? ' ' : '') + convertTwoDigits(rest);
    return res;
  }

  let crore = Math.floor(roundNum / 10000000);
  let remainder = roundNum % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundreds = remainder;

  let words = '';
  if (crore) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand) words += convertTwoDigits(thousand) + ' Thousand ';
  if (hundreds) words += convertThreeDigits(hundreds);

  return 'Rupees ' + words.trim() + ' Only';
}

// Default AEW Logo path from generated asset
export const DEFAULT_AEW_LOGO = '/src/assets/images/aew_industrial_logo_1793881800693.jpg';

// Initialize and seed default data if needed
export async function initializeDatabase() {
  try {
    // 1. Seed Company Settings if not present
    const existingSettings = await db.select().from(companySettings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(companySettings).values({
        companyName: 'ABHISHEK ENGINEERING WORKS',
        tagline: 'Precision Machining, Industrial Fabrication & CNC Components',
        gstin: '27AAACA0000A1Z5',
        pan: 'AAACA0000A',
        state: 'Maharashtra',
        stateCode: '27',
        address: 'Plot No. W-45, Sector 10, MIDC Industrial Area, Bhosari',
        city: 'Pune',
        pincode: '411026',
        phone: '+91 98220 12345',
        altPhone: '+91 98220 54321',
        email: 'accounts@abhishekengineering.com',
        website: 'www.abhishekengineering.com',
        logoUrl: DEFAULT_AEW_LOGO,
        upiId: 'abhishekengg@okaxis',
        upiPayeeName: 'ABHISHEK ENGINEERING WORKS',
        paymentTerms: 'Payment within 30 days of invoice date. 18% p.a. interest charged on delayed payments.',
        deliveryTerms: 'Ex-Works Bhosari, Pune. Freight extra as actuals or customer arranged.',
        warrantyTerms: '12 months warranty against dimensional discrepancy and manufacturing defects.',
        enableUpiQr: true,
        enableBankDetails: true,
      });
      console.log('Company settings seeded.');
    }

    // 2. Seed Default Customers if empty
    const existingCust = await db.select().from(customers).limit(1);
    if (existingCust.length === 0) {
      await db.insert(customers).values([
        {
          name: 'Rajesh Kulkarni',
          companyName: 'Tata Motors Ltd (Commercial Vehicles)',
          gstin: '27AABCT2727Q1ZV',
          pan: 'AABCT2727Q',
          phone: '+91 20 6613 1111',
          email: 'purchase.pune@tatamotors.com',
          billingAddress: 'Pimpri Works, Old Mumbai-Pune Highway, Pimpri',
          shippingAddress: 'Gate No. 4, CVBU Plant, Pimpri Works, Pune',
          city: 'Pune',
          state: 'Maharashtra',
          stateCode: '27',
          pincode: '411018',
          openingBalance: 0,
          currentBalance: 88500,
          notes: 'Vendor Code: V-84192. Tier 1 Automotive Assembly Customer.',
        },
        {
          name: 'Nitin Deshmukh',
          companyName: 'Bharat Forge Limited',
          gstin: '27AAACB0123P1ZQ',
          pan: 'AAACB0123P',
          phone: '+91 20 6704 2777',
          email: 'procurement@bharatforge.com',
          billingAddress: 'Mundhwa, Pune Cantonment',
          shippingAddress: 'Heavy Forging Div, Mundhwa, Pune',
          city: 'Pune',
          state: 'Maharashtra',
          stateCode: '27',
          pincode: '411036',
          openingBalance: 0,
          currentBalance: 0,
          notes: 'Precision components & gear forgings supplier.',
        },
        {
          name: 'Suresh Patil',
          companyName: 'Kirloskar Oil Engines Ltd',
          gstin: '27AAACK1456M1Z8',
          pan: 'AAACK1456M',
          phone: '+91 20 2581 0341',
          email: 'spares@kirloskar.com',
          billingAddress: 'Laxmanrao Kirloskar Road, Khadki',
          shippingAddress: 'Engine Assembly Unit II, Khadki, Pune',
          city: 'Pune',
          state: 'Maharashtra',
          stateCode: '27',
          pincode: '411003',
          openingBalance: 0,
          currentBalance: 53100,
          notes: 'Diesel engine cylinder bushes and shaft sleeves.',
        },
        {
          name: 'Amitabh Sen',
          companyName: 'Bosch Automotive Electronics India Pvt Ltd',
          gstin: '29AAACB1234F1ZX', // Karnataka (Inter-State IGST)
          pan: 'AAACB1234F',
          phone: '+91 80 6752 1111',
          email: 'materials.blr@bosch.com',
          billingAddress: 'Hosur Road, Adugodi, Bengaluru',
          shippingAddress: 'Naganathapura Plant, Bengaluru',
          city: 'Bengaluru',
          state: 'Karnataka',
          stateCode: '29',
          pincode: '560030',
          openingBalance: 0,
          currentBalance: 147500,
          notes: 'Interstate Client - IGST 18% applicable.',
        }
      ]);
      console.log('Default engineering customers seeded.');
    }

    // 3. Seed Default Products if empty
    const existingProd = await db.select().from(products).limit(1);
    if (existingProd.length === 0) {
      await db.insert(products).values([
        {
          name: 'CNC Turned Precision Bushing (EN8 Steel)',
          sku: 'AEW-BUSH-001',
          description: 'OD 65mm x ID 45mm x Length 80mm with internal spiral oil groove',
          hsn: '8483',
          unit: 'NOS',
          rate: 450,
          gstRate: 18,
          currentStock: 250,
          minStock: 50,
        },
        {
          name: 'Hardened Helical Pinion Gear (20MnCr5)',
          sku: 'AEW-GEAR-002',
          description: 'Module 3.5, 24 Teeth, Case Carburized & Ground to 58-62 HRC',
          hsn: '8483',
          unit: 'NOS',
          rate: 2850,
          gstRate: 18,
          currentStock: 80,
          minStock: 20,
        },
        {
          name: 'Flanged Hydraulic Shaft Coupling',
          sku: 'AEW-CPL-003',
          description: 'Forged steel flanged flexible shaft coupling with high tensile bolts',
          hsn: '8483',
          unit: 'SET',
          rate: 1650,
          gstRate: 18,
          currentStock: 65,
          minStock: 15,
        },
        {
          name: 'Heavy Duty SS 316 Flange (Class 150)',
          sku: 'AEW-FLG-004',
          description: 'ASME B16.5 Weld Neck Flange 4-inch 150# RF Machined finish',
          hsn: '7307',
          unit: 'NOS',
          rate: 3200,
          gstRate: 18,
          currentStock: 45,
          minStock: 10,
        },
        {
          name: 'Precision Bearing Housing Unit (Cast Iron FG260)',
          sku: 'AEW-BRG-005',
          description: 'Plummer block housing with VMC bored seat for 22216 spherical bearing',
          hsn: '8483',
          unit: 'NOS',
          rate: 5400,
          gstRate: 18,
          currentStock: 30,
          minStock: 10,
        },
        {
          name: 'High Tensile Alloy Steel Studs M24 x 180mm',
          sku: 'AEW-FAS-006',
          description: 'Grade 10.9 with 2 heavy hex nuts, phosphate coated',
          hsn: '7318',
          unit: 'NOS',
          rate: 125,
          gstRate: 18,
          currentStock: 800,
          minStock: 200,
        },
        {
          name: 'CNC Surface Grinding & Lapping Job Work',
          sku: 'AEW-JOB-007',
          description: 'High precision surface grinding up to 0.005mm flatness tolerance',
          hsn: '9988',
          unit: 'HRS',
          rate: 950,
          gstRate: 18,
          currentStock: 999,
          minStock: 10,
        }
      ]);
      console.log('Default products seeded.');
    }

    // 4. Seed Initial Numbering Sequences if empty
    const existingSeq = await db.select().from(docSequences).limit(1);
    if (existingSeq.length === 0) {
      await db.insert(docSequences).values([
        { docType: 'tax_invoice', year: '2026', prefix: 'AEW/TI/2026/', currentNumber: 1 },
        { docType: 'quotation', year: '2026', prefix: 'AEW/QTN/2026/', currentNumber: 1 },
        { docType: 'proforma_invoice', year: '2026', prefix: 'AEW/PI/2026/', currentNumber: 1 },
        { docType: 'eway_bill', year: '2026', prefix: 'AEW/EWB/2026/', currentNumber: 1 },
        { docType: 'delivery_challan', year: '2026', prefix: 'AEW/DC/2026/', currentNumber: 1 },
        { docType: 'echallan', year: '2026', prefix: 'AEW/EC/2026/', currentNumber: 1 },
        { docType: 'payment_receipt', year: '2026', prefix: 'AEW/PR/2026/', currentNumber: 1 },
      ]);
      console.log('Document sequences initialized.');
    }

    // 5. Seed Initial Documents & Payments for demonstration
    const existingDocs = await db.select().from(documents).limit(1);
    if (existingDocs.length === 0) {
      // Create Tax Invoice AEW/TI/2026/001
      const docItems = [
        {
          id: 'item-1',
          name: 'CNC Turned Precision Bushing (EN8 Steel)',
          description: 'OD 65mm x ID 45mm x Length 80mm with internal spiral oil groove',
          hsn: '8483',
          quantity: 100,
          unit: 'NOS',
          rate: 450,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 45000,
          gstRate: 18,
          cgstRate: 9,
          cgstAmount: 4050,
          sgstRate: 9,
          sgstAmount: 4050,
          igstRate: 0,
          igstAmount: 0,
          total: 53100,
        },
        {
          id: 'item-2',
          name: 'Flanged Hydraulic Shaft Coupling',
          description: 'Forged steel flanged flexible shaft coupling with high tensile bolts',
          hsn: '8483',
          quantity: 20,
          unit: 'SET',
          rate: 1500,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 30000,
          gstRate: 18,
          cgstRate: 9,
          cgstAmount: 2700,
          sgstRate: 9,
          sgstAmount: 2700,
          igstRate: 0,
          igstAmount: 0,
          total: 35400,
        }
      ];

      const taxableTotal = 75000;
      const cgstTotal = 6750;
      const sgstTotal = 6750;
      const grandTotal = 88500;

      const [inv] = await db.insert(documents).values({
        docType: 'tax_invoice',
        docNumber: 'AEW/TI/2026/001',
        date: '2026-11-01',
        dueDate: '2026-12-01',
        customerId: 1,
        customerName: 'Rajesh Kulkarni',
        customerCompany: 'Tata Motors Ltd (Commercial Vehicles)',
        customerGstin: '27AABCT2727Q1ZV',
        customerPhone: '+91 20 6613 1111',
        customerEmail: 'purchase.pune@tatamotors.com',
        billingAddress: 'Pimpri Works, Old Mumbai-Pune Highway, Pimpri, Pune 411018',
        shippingAddress: 'Gate No. 4, CVBU Plant, Pimpri Works, Pune',
        customerState: 'Maharashtra',
        customerStateCode: '27',
        placeOfSupply: '27-Maharashtra',
        supplyType: 'intra_state',
        poNumber: 'PO-TML-2026-9812',
        poDate: '2026-10-28',
        vehicleNumber: 'MH-12-RN-4890',
        transporterName: 'VRL Logistics Ltd',
        items: docItems,
        subtotal: 75000,
        discountTotal: 0,
        taxableTotal,
        cgstTotal,
        sgstTotal,
        igstTotal: 0,
        freightCharges: 0,
        packagingCharges: 0,
        roundOff: 0,
        grandTotal,
        totalInWords: convertNumberToIndianWords(grandTotal),
        status: 'issued',
        paidAmount: 0,
        balanceAmount: grandTotal,
        upiQrEnabled: true,
        bankDetailsEnabled: true,
        selectedBankId: 'bank-1',
        ewayBillDetails: {
          ewayBillNumber: '281098452391',
          ewayBillDate: '2026-11-01',
          vehicleNumber: 'MH-12-RN-4890',
          transporterName: 'VRL Logistics Ltd',
          distanceKm: 25,
          transportMode: 'Road',
          validUntil: '2026-11-03',
        },
        notes: 'Material dispatched under Delivery Challan AEW/DC/2026/001. Certified test reports attached.',
        terms: 'Subject to Pune Jurisdiction. Goods once sold will not be taken back.',
      }).returning();

      // Quotation AEW/QTN/2026/001 for Bharat Forge Limited
      await db.insert(documents).values({
        docType: 'quotation',
        docNumber: 'AEW/QTN/2026/001',
        date: '2026-11-03',
        dueDate: '2026-11-30',
        customerId: 2,
        customerName: 'Nitin Deshmukh',
        customerCompany: 'Bharat Forge Limited',
        customerGstin: '27AAACB0123P1ZQ',
        customerPhone: '+91 20 6704 2777',
        customerEmail: 'procurement@bharatforge.com',
        billingAddress: 'Mundhwa, Pune Cantonment, Pune 411036',
        shippingAddress: 'Heavy Forging Div, Mundhwa, Pune',
        customerState: 'Maharashtra',
        customerStateCode: '27',
        placeOfSupply: '27-Maharashtra',
        supplyType: 'intra_state',
        items: [
          {
            id: 'item-q1',
            name: 'Hardened Helical Pinion Gear (20MnCr5)',
            description: 'Module 3.5, 24 Teeth, Case Carburized & Ground to 58-62 HRC',
            hsn: '8483',
            quantity: 50,
            unit: 'NOS',
            rate: 2850,
            discountPercent: 5,
            discountAmount: 7125,
            taxableAmount: 135375,
            gstRate: 18,
            cgstRate: 9,
            cgstAmount: 12183.75,
            sgstRate: 9,
            sgstAmount: 12183.75,
            igstRate: 0,
            igstAmount: 0,
            total: 159742.5,
          }
        ],
        subtotal: 142500,
        discountTotal: 7125,
        taxableTotal: 135375,
        cgstTotal: 12183.75,
        sgstTotal: 12183.75,
        igstTotal: 0,
        freightCharges: 1500,
        packagingCharges: 500,
        roundOff: 0.5,
        grandTotal: 161743,
        totalInWords: convertNumberToIndianWords(161743),
        status: 'issued',
        paidAmount: 0,
        balanceAmount: 161743,
        upiQrEnabled: true,
        bankDetailsEnabled: true,
        selectedBankId: 'bank-1',
        notes: 'Price includes material, rough turning, gear hobbing, heat treatment and tooth flank grinding.',
        terms: 'Quotation valid for 30 days. Delivery within 3-4 weeks from formal PO receipt.',
      });

      // Delivery Challan AEW/DC/2026/001
      await db.insert(documents).values({
        docType: 'delivery_challan',
        docNumber: 'AEW/DC/2026/001',
        date: '2026-11-01',
        customerId: 1,
        customerName: 'Rajesh Kulkarni',
        customerCompany: 'Tata Motors Ltd (Commercial Vehicles)',
        customerGstin: '27AABCT2727Q1ZV',
        customerPhone: '+91 20 6613 1111',
        customerEmail: 'purchase.pune@tatamotors.com',
        billingAddress: 'Pimpri Works, Old Mumbai-Pune Highway, Pimpri, Pune 411018',
        shippingAddress: 'Gate No. 4, CVBU Plant, Pimpri Works, Pune',
        customerState: 'Maharashtra',
        customerStateCode: '27',
        placeOfSupply: '27-Maharashtra',
        supplyType: 'intra_state',
        referenceDocType: 'tax_invoice',
        referenceDocId: inv.id,
        referenceDocNumber: 'AEW/TI/2026/001',
        vehicleNumber: 'MH-12-RN-4890',
        transporterName: 'VRL Logistics Ltd',
        challanDetails: {
          challanType: 'job_work',
          dispatchDate: '2026-11-01',
          natureOfProcessing: 'Finished Machining & Dispatch for Assembly',
          receiverContact: 'Mr. Shinde (Store Incharge)',
        },
        items: docItems,
        subtotal: 75000,
        discountTotal: 0,
        taxableTotal,
        cgstTotal,
        sgstTotal,
        igstTotal: 0,
        freightCharges: 0,
        packagingCharges: 0,
        roundOff: 0,
        grandTotal,
        totalInWords: convertNumberToIndianWords(grandTotal),
        status: 'issued',
        paidAmount: 0,
        balanceAmount: 0,
        upiQrEnabled: false,
        bankDetailsEnabled: false,
        notes: 'Material dispatched for engine plant line feed.',
        terms: 'Original for Consignee / Duplicate for Transporter',
      });

      console.log('Default documents created.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Document Number Formatter
export function formatDocNumber(
  prefix: string,
  year: string,
  number: number,
  padding: number = 3,
  separator: string = '/'
): string {
  const cleanPrefix = (prefix || 'AEW/DOC').replace(/\/+$/, '').trim();
  const cleanYear = (year || '').replace(/^\/+|\/+$/g, '').trim();
  const paddedNum = String(number).padStart(Math.max(1, padding), '0');
  
  if (cleanYear) {
    return `${cleanPrefix}${separator}${cleanYear}${separator}${paddedNum}`;
  }
  return `${cleanPrefix}${separator}${paddedNum}`;
}

// Fetch all document sequence configurations
export async function getAllDocSequences() {
  const defaultTypes: Array<{ docType: string; prefix: string }> = [
    { docType: 'tax_invoice', prefix: 'AEW/TI' },
    { docType: 'quotation', prefix: 'AEW/QTN' },
    { docType: 'proforma_invoice', prefix: 'AEW/PI' },
    { docType: 'eway_bill', prefix: 'AEW/EWB' },
    { docType: 'delivery_challan', prefix: 'AEW/DC' },
    { docType: 'echallan', prefix: 'AEW/EC' },
    { docType: 'payment_receipt', prefix: 'AEW/PR' },
  ];

  const currentYear = new Date().getFullYear().toString();
  const existing = await db.select().from(docSequences);
  const result: any[] = [];

  for (const def of defaultTypes) {
    let found = existing.find((s) => s.docType === def.docType);
    if (!found) {
      const [inserted] = await db.insert(docSequences).values({
        docType: def.docType,
        year: currentYear,
        prefix: def.prefix,
        startingNumber: 1,
        currentNumber: 0,
        padding: 3,
        separator: '/',
      }).returning();
      found = inserted;
    }
    result.push({
      ...found,
      nextPreview: formatDocNumber(
        found.prefix,
        found.year,
        Math.max(found.currentNumber + 1, found.startingNumber),
        found.padding,
        found.separator
      ),
    });
  }

  return result;
}

// Update sequence configuration for a document type
export async function updateDocSequenceConfig(
  docType: string,
  config: {
    prefix?: string;
    year?: string;
    startingNumber?: number;
    nextSequenceNumber?: number;
    padding?: number;
    separator?: string;
  }
) {
  const existing = await db.select().from(docSequences)
    .where(eq(docSequences.docType, docType))
    .limit(1);

  const currentYear = new Date().getFullYear().toString();
  const updateData: any = {};
  if (config.prefix !== undefined) updateData.prefix = config.prefix;
  if (config.year !== undefined) updateData.year = config.year;
  if (config.startingNumber !== undefined) updateData.startingNumber = Number(config.startingNumber);
  if (config.padding !== undefined) updateData.padding = Number(config.padding);
  if (config.separator !== undefined) updateData.separator = config.separator;
  if (config.nextSequenceNumber !== undefined) {
    // Current number is set to nextSequenceNumber - 1
    updateData.currentNumber = Math.max(0, Number(config.nextSequenceNumber) - 1);
  }

  if (existing.length > 0) {
    const [updated] = await db.update(docSequences)
      .set(updateData)
      .where(eq(docSequences.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const [inserted] = await db.insert(docSequences).values({
      docType,
      year: config.year || currentYear,
      prefix: config.prefix || `AEW/${docType.slice(0, 3).toUpperCase()}`,
      startingNumber: config.startingNumber || 1,
      currentNumber: config.nextSequenceNumber ? Math.max(0, config.nextSequenceNumber - 1) : 0,
      padding: config.padding || 3,
      separator: config.separator || '/',
    }).returning();
    return inserted;
  }
}

// Atomic Safe sequence generator helper (prevents duplicates and never reuses previously issued numbers)
export async function getNextDocNumber(docType: string, commit: boolean = true): Promise<string> {
  const currentYear = new Date().getFullYear().toString();
  
  const defaultPrefixMap: Record<string, string> = {
    tax_invoice: 'AEW/TI',
    quotation: 'AEW/QTN',
    proforma_invoice: 'AEW/PI',
    eway_bill: 'AEW/EWB',
    delivery_challan: 'AEW/DC',
    echallan: 'AEW/EC',
    payment_receipt: 'AEW/PR',
  };

  try {
    let [seq] = await db.select().from(docSequences)
      .where(eq(docSequences.docType, docType))
      .limit(1);

    if (!seq) {
      const defaultPrefix = defaultPrefixMap[docType] || 'AEW/DOC';
      const [inserted] = await db.insert(docSequences).values({
        docType,
        year: currentYear,
        prefix: defaultPrefix,
        startingNumber: 1,
        currentNumber: 0,
        padding: 3,
        separator: '/',
      }).returning();
      seq = inserted;
    }

    const prefix = seq.prefix || defaultPrefixMap[docType] || 'AEW/DOC';
    const year = seq.year || currentYear;
    const padding = seq.padding || 3;
    const separator = seq.separator || '/';
    let candidateNum = Math.max(seq.currentNumber + 1, seq.startingNumber || 1);

    // Ensure candidate is unique in documents / payments table
    let candidateStr = formatDocNumber(prefix, year, candidateNum, padding, separator);
    let attempts = 0;
    while (attempts < 1000) {
      let isDuplicate = false;
      if (docType === 'payment_receipt') {
        const existingP = await db.select().from(payments)
          .where(eq(payments.receiptNumber, candidateStr))
          .limit(1);
        isDuplicate = existingP.length > 0;
      } else {
        const existingD = await db.select().from(documents)
          .where(eq(documents.docNumber, candidateStr))
          .limit(1);
        isDuplicate = existingD.length > 0;
      }

      if (!isDuplicate) {
        break; // Unique found!
      }
      candidateNum++;
      candidateStr = formatDocNumber(prefix, year, candidateNum, padding, separator);
      attempts++;
    }

    if (commit) {
      await db.update(docSequences)
        .set({ currentNumber: candidateNum })
        .where(eq(docSequences.id, seq.id));
    }

    return candidateStr;
  } catch (error) {
    console.error('Error generating doc number:', error);
    const fallbackPrefix = defaultPrefixMap[docType] || 'AEW/DOC';
    return `${fallbackPrefix}/${currentYear}/${Date.now().toString().slice(-4)}`;
  }
}

