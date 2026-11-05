const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const Sale = require('../models/Sale');
const UploadLog = require('../models/UploadLog');
const User = require('../models/User');
const { lookupPincode } = require('../utils/geoHelper');
const { syncDerivedCollections, clearSellerCollections } = require('../services/syncService');
const { resolveActiveDatasetId, setActiveDataset, listSellerDatasets } = require('../services/datasetService');

// Flexible header normalizer
function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, '') // strip UTF-8 BOM
    .replace(/[^a-z0-9]/g, '');
}

// Helper to parse numeric values handling currency symbols (₹, $, Rs), commas ("1,499.00"), spaces
function parseNumeric(val, fallback = 0) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim();
  if (str === '' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return fallback;
  // Remove currency symbols (₹, $, €, £), Rs/Rs./INR, commas, and whitespace
  const sanitized = str
    .replace(/[₹$€£,]/g, '')
    .replace(/rs\.?/gi, '')
    .replace(/inr/gi, '')
    .trim();
  const num = parseFloat(sanitized);
  return isNaN(num) ? fallback : num;
}

// Canonical header mapper covering diverse marketplace export formats
const FIELD_MAP = {
  // Order ID
  orderid: 'orderId',
  order_id: 'orderId',
  id: 'orderId',
  ordernumber: 'orderId',
  order_number: 'orderId',
  orderno: 'orderId',
  transid: 'orderId',
  transactionid: 'orderId',
  invoiceid: 'orderId',
  invoiceno: 'orderId',

  // Product ID
  productid: 'productId',
  product_id: 'productId',
  sku: 'productId',
  skuid: 'productId',
  itemid: 'productId',
  item_id: 'productId',
  asin: 'productId',
  fsn: 'productId',

  // Product Name
  productname: 'productName',
  product_name: 'productName',
  name: 'productName',
  itemname: 'productName',
  item_name: 'productName',
  title: 'productName',
  producttitle: 'productName',
  itemdescription: 'productName',
  description: 'productName',

  // Category
  productcategory: 'category',
  product_category: 'category',
  category: 'category',
  categoryname: 'category',
  cat: 'category',
  department: 'category',

  // Order Date
  orderdate: 'orderDate',
  order_date: 'orderDate',
  date: 'orderDate',
  ordertime: 'orderDate',
  datetime: 'orderDate',
  createdat: 'orderDate',
  purchasedate: 'orderDate',

  // Delivery Pincode
  deliverypincode: 'pincode',
  delivery_pin_code: 'pincode',
  pincode: 'pincode',
  pin_code: 'pincode',
  pin: 'pincode',
  postalcode: 'pincode',
  postal_code: 'pincode',
  zip: 'pincode',
  zipcode: 'pincode',

  // Quantity
  quantity: 'quantity',
  qty: 'quantity',
  units: 'quantity',
  unitssold: 'quantity',
  count: 'quantity',

  // Selling Price (CRITICAL: covers all casing, spacing, and terminology)
  sellingprice: 'sellingPrice',
  selling_price: 'sellingPrice',
  sellingpriceinr: 'sellingPrice',
  sellingpricers: 'sellingPrice',
  price: 'sellingPrice',
  unitprice: 'sellingPrice',
  unit_price: 'sellingPrice',
  salesprice: 'sellingPrice',
  sales_price: 'sellingPrice',
  saleprice: 'sellingPrice',
  sale_price: 'sellingPrice',
  itemprice: 'sellingPrice',
  item_price: 'sellingPrice',
  productprice: 'sellingPrice',
  product_price: 'sellingPrice',
  salesamount: 'sellingPrice',
  sales_amount: 'sellingPrice',
  amount: 'sellingPrice',
  totalamount: 'sellingPrice',
  totalprice: 'sellingPrice',
  finalprice: 'sellingPrice',
  mrp: 'sellingPrice',
  rate: 'sellingPrice',
  unitrate: 'sellingPrice',

  // Cost Price
  costprice: 'costPrice',
  cost_price: 'costPrice',
  unitcost: 'costPrice',
  unit_cost: 'costPrice',
  cost: 'costPrice',
  cogs: 'costPrice',
  purchaseprice: 'costPrice',
  purchase_price: 'costPrice',
  basecost: 'costPrice',

  // Return Status
  returnstatus: 'returnStatus',
  return_status: 'returnStatus',
  isreturned: 'returnStatus',
  is_returned: 'returnStatus',
  return: 'returnStatus',
  returned: 'returnStatus',

  // Cancellation Status
  cancellationstatus: 'cancellationStatus',
  cancellation_status: 'cancellationStatus',
  iscancelled: 'cancellationStatus',
  is_cancelled: 'cancellationStatus',
  cancelled: 'cancellationStatus',
  cancelstatus: 'cancellationStatus',

  // Discount
  discount: 'discount',
  discountpct: 'discount',
  discount_pct: 'discount',
  discountpercentage: 'discount',
  discountamount: 'discount',
  disc: 'discount',

  // Inventory Quantity
  inventoryquantity: 'inventoryQuantity',
  inventory_quantity: 'inventoryQuantity',
  inventory: 'inventoryQuantity',
  stock: 'inventoryQuantity',
  stockquantity: 'inventoryQuantity',
  stock_quantity: 'inventoryQuantity',
  availablestock: 'inventoryQuantity',

  // Shipping Cost
  shippingcost: 'shippingCost',
  shipping_cost: 'shippingCost',
  freight: 'shippingCost',
  freightcost: 'shippingCost',
  deliveryfee: 'shippingCost',
  shippingfee: 'shippingCost',

  // Advertising Spend
  advertisingspend: 'adSpend',
  advertising_spend: 'adSpend',
  adspend: 'adSpend',
  ad_spend: 'adSpend',
  marketingspend: 'adSpend',
  marketing_spend: 'adSpend',
  adcost: 'adSpend'
};

function mapRow(rawRow) {
  const mapped = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const norm = normalizeKey(k);
    if (FIELD_MAP[norm]) {
      const canonical = FIELD_MAP[norm];
      if (mapped[canonical] === undefined || mapped[canonical] === '') {
        mapped[canonical] = typeof v === 'string' ? v.trim() : v;
      }
    }
  }

  // Safety fallback for selling price if not captured by exact dictionary match
  if (mapped.sellingPrice === undefined || mapped.sellingPrice === '') {
    for (const [k, v] of Object.entries(rawRow)) {
      const lk = String(k).toLowerCase();
      if ((lk.includes('price') || lk.includes('amount') || lk.includes('mrp') || lk.includes('rate')) && !lk.includes('cost')) {
        mapped.sellingPrice = typeof v === 'string' ? v.trim() : v;
        break;
      }
    }
  }

  // Safety fallback for cost price
  if (mapped.costPrice === undefined || mapped.costPrice === '') {
    for (const [k, v] of Object.entries(rawRow)) {
      const lk = String(k).toLowerCase();
      if (lk.includes('cost') || lk.includes('cogs') || lk.includes('purchase')) {
        mapped.costPrice = typeof v === 'string' ? v.trim() : v;
        break;
      }
    }
  }

  return mapped;
}

exports.uploadSalesFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please select a CSV or Excel file to upload.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();
  const sellerId = req.sellerId;

  try {
    let rows = [];

    if (ext === '.csv') {
      rows = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', (err) => reject(err));
      });
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Unsupported file format. Please upload .csv or .xlsx' });
    }

    // Clean up uploaded temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'The uploaded file contains no data rows.' });
    }

    // Generate unique dataset ID for this upload session
    const datasetId = 'ds_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Check duplicates against existing active dataset records and within current file
    const activeDatasetId = await resolveActiveDatasetId(sellerId);
    const existingSales = activeDatasetId
      ? await Sale.find({ sellerId, datasetId: activeDatasetId }).select('orderId productId -_id').lean()
      : [];
    const existingKeySet = new Set(existingSales.map((s) => `${s.orderId}::${s.productId}`));
    const fileDedupeKeySet = new Set();

    const validDocs = [];
    const invalidErrors = [];
    let duplicateCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // considering header as row 1
      const raw = rows[i];
      const mapped = mapRow(raw);

      // Validation
      const reasons = [];

      if (!mapped.orderId) reasons.push('Missing Order ID');
      if (!mapped.productId) reasons.push('Missing Product ID');
      if (!mapped.productName) reasons.push('Missing Product Name');
      if (!mapped.category) reasons.push('Missing Product Category');

      let parsedDate = new Date(mapped.orderDate);
      if (!mapped.orderDate || isNaN(parsedDate.getTime())) {
        const parts = String(mapped.orderDate || '').trim().split(/[-/]/);
        if (parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (!isNaN(d.getTime())) parsedDate = d;
        }
      }
      if (isNaN(parsedDate.getTime())) {
        reasons.push(`Invalid Order Date: "${mapped.orderDate}"`);
      }

      const qty = parseInt(parseNumeric(mapped.quantity, 0), 10);
      if (isNaN(qty) || qty <= 0) {
        reasons.push(`Invalid Quantity: "${mapped.quantity}" (must be positive integer)`);
      }

      const price = parseNumeric(mapped.sellingPrice, NaN);
      if (isNaN(price) || price < 0) {
        reasons.push(`Invalid Selling Price: "${mapped.sellingPrice}"`);
      }

      const rawPin = String(mapped.pincode || '').split('.')[0].trim();
      if (!/^\d{6}$/.test(rawPin)) {
        reasons.push(`Invalid Indian PIN code: "${mapped.pincode}" (must be 6 digits)`);
      }
      const pinStr = rawPin;

      if (reasons.length > 0) {
        invalidErrors.push({
          row: rowNum,
          reason: reasons.join(', '),
          dataSnippet: mapped
        });
        continue;
      }

      // Check duplicate against existing active records and file
      const dedupeKey = `${mapped.orderId}::${mapped.productId}`;
      if (existingKeySet.has(dedupeKey) || fileDedupeKeySet.has(dedupeKey)) {
        duplicateCount++;
        continue;
      }
      fileDedupeKeySet.add(dedupeKey);

      // Geo lookup & enrichment
      const geo = lookupPincode(pinStr);

      const cost = parseNumeric(mapped.costPrice, Math.round(price * 0.6));
      const discount = parseNumeric(mapped.discount, 0);
      const inv = parseInt(parseNumeric(mapped.inventoryQuantity, 50), 10) || 50;
      const ship = parseNumeric(mapped.shippingCost, 50);
      const ad = parseNumeric(mapped.adSpend, 0);

      validDocs.push({
        sellerId,
        datasetId,
        orderId: String(mapped.orderId).trim(),
        productId: String(mapped.productId).trim(),
        productName: String(mapped.productName).trim(),
        category: String(mapped.category).trim(),
        orderDate: parsedDate,
        pincode: pinStr,
        city: geo ? geo.city : 'Other City',
        district: geo ? geo.district : 'Other District',
        state: geo ? geo.state : 'Other State',
        region: geo ? geo.region : 'Other',
        lat: geo ? geo.lat : 20.5937,
        lng: geo ? geo.lng : 78.9629,
        quantity: qty,
        sellingPrice: price,
        costPrice: cost,
        returnStatus: mapped.returnStatus || 'No',
        cancellationStatus: mapped.cancellationStatus || 'No',
        discount: discount,
        inventoryQuantity: inv,
        shippingCost: ship,
        adSpend: ad
      });
    }

    if (validDocs.length > 0) {
      await Sale.insertMany(validDocs, { ordered: false });

      // Mark previous upload logs as inactive
      await UploadLog.updateMany({ sellerId }, { $set: { isActive: false } });

      // Update active dataset on user record
      await User.findByIdAndUpdate(sellerId, { activeDatasetId: datasetId });

      // Re-synchronize derived collections for this active dataset
      await clearSellerCollections(sellerId);
      await syncDerivedCollections(sellerId, validDocs);
    }

    const log = new UploadLog({
      sellerId,
      datasetId,
      datasetName: originalName,
      isActive: true,
      filename: originalName,
      fileSize: req.file.size,
      totalRows: rows.length,
      validRows: validDocs.length,
      invalidRows: invalidErrors.length,
      duplicateRows: duplicateCount,
      status: invalidErrors.length === 0 ? 'completed' : validDocs.length > 0 ? 'partial' : 'failed',
      errors: invalidErrors.slice(0, 50) // store up to 50 sample errors
    });
    await log.save();

    res.json({
      message: `File processed successfully. ${validDocs.length} records imported into active dataset.`,
      datasetId,
      activeDataset: true,
      summary: {
        totalRows: rows.length,
        validImported: validDocs.length,
        rejectedRows: invalidErrors.length,
        duplicateRows: duplicateCount,
        status: log.status,
        datasetId
      },
      errors: invalidErrors.slice(0, 20),
      preview: validDocs.slice(0, 5)
    });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: `File processing error: ${err.message}` });
  }
};

exports.getUploadHistory = async (req, res) => {
  try {
    const logs = await UploadLog.find({ sellerId: req.sellerId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ uploads: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.loadSampleData = async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const candidate800 = path.resolve(__dirname, '../../data/sample_sales_data_800.csv');
    const candidateDefault = path.resolve(__dirname, '../../data/sample_sales_data.csv');
    const sampleCsvPath = fs.existsSync(candidate800) ? candidate800 : candidateDefault;

    if (!fs.existsSync(sampleCsvPath)) {
      return res.status(404).json({ error: 'Sample dataset not found on server.' });
    }

    const rawRows = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(sampleCsvPath)
        .pipe(csv())
        .on('data', (d) => results.push(d))
        .on('end', () => resolve(results))
        .on('error', (e) => reject(e));
    });

    // Clear previous sample if requested or append
    await Sale.deleteMany({ sellerId });
    await clearSellerCollections(sellerId);

    const datasetId = 'ds_demo_' + Date.now();

    const docs = rawRows.map((r) => {
      const mapped = mapRow(r);
      const rawPin = String(mapped.pincode || '').split('.')[0].trim();
      const pinStr = rawPin.padStart(6, '0');
      const geo = lookupPincode(pinStr);

      let parsedDate = new Date(mapped.orderDate);
      if (isNaN(parsedDate.getTime())) {
        const parts = String(mapped.orderDate || '').trim().split(/[-/]/);
        if (parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (!isNaN(d.getTime())) parsedDate = d;
        }
      }

      const price = parseNumeric(mapped.sellingPrice, 0);
      const cost = parseNumeric(mapped.costPrice, Math.round(price * 0.6));

      return {
        sellerId,
        datasetId,
        orderId: String(mapped.orderId).trim(),
        productId: String(mapped.productId).trim(),
        productName: String(mapped.productName).trim(),
        category: String(mapped.category).trim(),
        orderDate: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        pincode: pinStr,
        city: geo ? geo.city : 'Other City',
        district: geo ? geo.district : 'Other District',
        state: geo ? geo.state : 'Other State',
        region: geo ? geo.region : 'Other',
        lat: geo ? geo.lat : 20.5937,
        lng: geo ? geo.lng : 78.9629,
        quantity: parseInt(parseNumeric(mapped.quantity, 1), 10) || 1,
        sellingPrice: price,
        costPrice: cost,
        returnStatus: mapped.returnStatus || 'No',
        cancellationStatus: mapped.cancellationStatus || 'No',
        discount: parseNumeric(mapped.discount, 0),
        inventoryQuantity: parseInt(parseNumeric(mapped.inventoryQuantity, 50), 10) || 50,
        shippingCost: parseNumeric(mapped.shippingCost, 40),
        adSpend: parseNumeric(mapped.adSpend, 0)
      };
    });

    await Sale.insertMany(docs);
    await syncDerivedCollections(sellerId, docs);

    await UploadLog.updateMany({ sellerId }, { $set: { isActive: false } });

    const log = new UploadLog({
      sellerId,
      datasetId,
      datasetName: 'Demo Dataset',
      isActive: true,
      filename: 'sample_sales_data.csv (Demo Dataset)',
      fileSize: 180000,
      totalRows: docs.length,
      validRows: docs.length,
      invalidRows: 0,
      duplicateRows: 0,
      status: 'completed',
      errors: []
    });
    await log.save();

    await User.findByIdAndUpdate(sellerId, { activeDatasetId: datasetId });

    res.json({
      message: `Sample e-commerce dataset loaded successfully! ${docs.length} verified records populated.`,
      datasetId,
      activeDataset: true,
      count: docs.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listDatasets = async (req, res) => {
  try {
    const datasets = await listSellerDatasets(req.sellerId);
    res.json({ datasets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setActiveDatasetEndpoint = async (req, res) => {
  try {
    const { datasetId } = req.body;
    if (!datasetId) {
      return res.status(400).json({ error: 'datasetId is required.' });
    }
    const result = await setActiveDataset(req.sellerId, datasetId);
    res.json({
      message: `Active dataset successfully switched to ${datasetId}.`,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.clearSalesData = async (req, res) => {
  try {
    const result = await Sale.deleteMany({ sellerId: req.sellerId });
    await UploadLog.deleteMany({ sellerId: req.sellerId });
    await clearSellerCollections(req.sellerId);
    await User.findByIdAndUpdate(req.sellerId, { activeDatasetId: null });
    res.json({
      message: 'All sales, products, orders, inventory, and upload logs for your account have been cleared.',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

