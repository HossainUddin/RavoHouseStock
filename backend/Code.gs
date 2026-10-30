/**
 * =========================================================================
 * RAVO HOUSE - Google Apps Script Backend API
 * Product Management & Order Memo System
 * Operating in Bangladesh (BDT - ৳)
 * =========================================================================
 * 
 * Instructions:
 * 1. Open Google Sheets (create a new blank spreadsheet: "RAVO HOUSE Database").
 * 2. Click Extensions > Apps Script.
 * 3. Delete existing code and paste this entire file into Code.gs.
 * 4. Run the function 'setupDatabase()' once from the toolbar to create/repair all sheets with headers and defaults.
 * 5. Click Deploy > New deployment.
 * 6. Select type: "Web app".
 * 7. Set:
 *    - Description: "RAVO HOUSE API v2"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (Required for web app AJAX/fetch calls)
 * 8. Click Deploy, Authorize access, and copy the Web App URL.
 * 9. Paste that Web App URL into the Settings tab in your RAVO HOUSE website!
 * =========================================================================
 */

// Global Sheet Names
const SHEETS = {
  PRODUCTS: 'Products',
  CATEGORIES: 'Categories',
  MEMOS: 'Memos',
  MEMO_ITEMS: 'MemoItems',
  TEAM: 'TeamMembers',
  SETTINGS: 'Settings'
};

// Standard Canonical Headers
const HEADERS = {
  PRODUCTS: [
    'ID', 'Name', 'Category', 'Description', 'ImageURL', 
    'PurchasePrice', 'PackagingCost', 'SellingPrice', 'Stock', 'CreatedAt'
  ],
  CATEGORIES: [
    'ID', 'Name', 'Description', 'CreatedAt'
  ],
  MEMOS: [
    'MemoID', 'Date', 'CustomerName', 'CustomerPhone', 'DeliveryAddress', 
    'DeliveryZone', 'DeliveryCharge', 'Discount', 'Subtotal', 'GrandTotal', 
    'OrderCost', 'OrderProfit', 'OrderNotes', 'Status', 'CreatedBy'
  ],
  MEMO_ITEMS: [
    'ID', 'MemoID', 'ProductID', 'ProductName', 'UnitPrice', 'Quantity', 'TotalPrice', 'UnitCost'
  ],
  TEAM: [
    'ID', 'FullName', 'Email', 'Role', 'PasswordHash', 'Salt', 'Status', 'CreatedAt'
  ],
  SETTINGS: [
    'Key', 'Value'
  ]
};

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    let response;

    switch (action) {
      case 'ping':
        response = { 
          status: 'success', 
          message: 'RAVO HOUSE Backend is active and connected!', 
          timestamp: new Date().toISOString() 
        };
        break;

      case 'setupDatabase':
      case 'repairDatabase':
        response = setupDatabase();
        break;

      case 'login':
        response = handleLogin(
          e && e.parameter ? e.parameter.email : '', 
          e && e.parameter ? e.parameter.password : ''
        );
        break;

      case 'getInitialData':
        const getRole = (e && e.parameter && e.parameter.role) ? e.parameter.role : 'admin';
        response = getInitialData(getRole);
        break;

      case 'getProducts':
        response = { status: 'success', data: getSheetData(SHEETS.PRODUCTS) };
        break;

      case 'getCategories':
        response = { status: 'success', data: getSheetData(SHEETS.CATEGORIES) };
        break;

      case 'getMemos':
        response = { status: 'success', data: getMemosData() };
        break;

      case 'getSettings':
        response = { status: 'success', data: getSettingsData() };
        break;

      default:
        response = { status: 'error', message: 'Unknown GET action: ' + action };
    }

    return createJsonResponse(response);
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Handle HTTP POST Requests
 * Accepts JSON payload in postData.contents or form parameters
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData) {
      const raw = e.postData.contents || (e.postData.getDataAsString ? e.postData.getDataAsString() : '');
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch (err) {
          payload = e.parameter || {};
        }
      } else {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || 'ping';
    let response;

    switch (action) {
      case 'ping':
        response = { status: 'success', message: 'RAVO HOUSE Backend is online!' };
        break;

      case 'setupDatabase':
      case 'repairDatabase':
        response = setupDatabase();
        break;

      case 'login':
        response = handleLogin(payload.email, payload.password);
        break;

      case 'getInitialData':
        response = getInitialData(payload.role || 'admin');
        break;

      case 'getProducts':
        response = { status: 'success', data: getSheetData(SHEETS.PRODUCTS) };
        break;

      case 'getCategories':
        response = { status: 'success', data: getSheetData(SHEETS.CATEGORIES) };
        break;

      case 'getMemos':
        response = { status: 'success', data: getMemosData() };
        break;

      case 'getSettings':
        response = { status: 'success', data: getSettingsData() };
        break;

      // Product Management
      case 'addProduct':
        response = addProduct(payload.product);
        break;

      case 'updateProduct':
        response = updateProduct(payload.product);
        break;

      case 'deleteProduct':
        response = deleteProduct(payload.id);
        break;

      // Category Management
      case 'addCategory':
        response = addCategory(payload.category);
        break;

      case 'deleteCategory':
        response = deleteCategory(payload.id);
        break;

      // Memo Management
      case 'createMemo':
        response = createMemo(payload.memo, payload.items);
        break;

      case 'updateMemoStatus':
        response = updateMemoStatus(payload.memoId, payload.newStatus);
        break;

      case 'deleteMemo':
        response = deleteMemo(payload.memoId);
        break;

      // Team Management
      case 'addTeamMember':
        response = addTeamMember(payload.member);
        break;

      case 'deleteTeamMember':
        response = deleteTeamMember(payload.id);
        break;

      case 'changePassword':
        response = changePassword(
          payload.email || payload.userId || payload.id,
          payload.newPassword || payload.password,
          payload.currentPassword
        );
        break;

      // Settings Management
      case 'updateSettings':
        response = updateSettings(payload.settings);
        break;

      default:
        response = { status: 'error', message: 'Unknown POST action: ' + action };
    }

    return createJsonResponse(response);
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Format JSON Response with CORS headers
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper to get active spreadsheet
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Automatic Database & Sheet Initialization and Schema Repair
 * Creates all required sheets, sets up bold headers, and populates default settings
 */
function setupDatabase() {
  const ss = getSpreadsheet();

  // 1. Products Sheet
  let prodSheet = ss.getSheetByName(SHEETS.PRODUCTS);
  if (!prodSheet) {
    prodSheet = ss.insertSheet(SHEETS.PRODUCTS);
    prodSheet.appendRow(HEADERS.PRODUCTS);
    formatHeaderRow(prodSheet);

    // Default sample products with perfect column alignment
    prodSheet.appendRow([
      'PROD-101', 
      'Oud Royale Extrait de Parfum (50ml)', 
      'Luxury Perfumes',
      'Rare Cambodian agarwood infused with velvety amber, warm cardamom, and Madagascar bourbon vanilla. 50ml concentrated extrait de parfum.',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&auto=format&fit=crop&q=80',
      1200, 80, 2450, 25, new Date().toISOString()
    ]);
    prodSheet.appendRow([
      'PROD-102', 
      'Imperial Noir Velvet Attar (12ml)', 
      'Luxury Perfumes',
      'Artisanal pure non-alcoholic concentrated perfume oil featuring deep woody notes, smoked Taif rose, and dark musk. 12ml roll-on.',
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&auto=format&fit=crop&q=80',
      650, 50, 1450, 40, new Date().toISOString()
    ]);
    prodSheet.appendRow([
      'PROD-103', 
      'Signature Full-Grain Leather Cardholder', 
      'Leather Goods',
      'Handcrafted full-grain vegetable-tanned cowhide leather with 6 card slots and center cash sleeve. Debossed gold emblem.',
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
      450, 60, 1150, 15, new Date().toISOString()
    ]);
    prodSheet.appendRow([
      'PROD-104', 
      'Minimalist Champagne Gold Chrono Watch', 
      'Accessories',
      'Precision Japanese quartz chronograph, sapphire-coated crystal glass, 18K champagne gold-plated 40mm case with genuine stitched leather strap.',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80',
      1800, 120, 3850, 10, new Date().toISOString()
    ]);
  } else {
    // Repair existing sheet if headers were shifted or missing
    repairProductsSheet(prodSheet);
  }

  // 2. Categories Sheet
  let catSheet = ss.getSheetByName(SHEETS.CATEGORIES);
  if (!catSheet) {
    catSheet = ss.insertSheet(SHEETS.CATEGORIES);
    catSheet.appendRow(HEADERS.CATEGORIES);
    formatHeaderRow(catSheet);

    const defaultCats = [
      ['CAT-1', 'Luxury Perfumes', 'Premium fragrances and concentrated attars', new Date().toISOString()],
      ['CAT-2', 'Leather Goods', 'Genuine handcrafted leather accessories', new Date().toISOString()],
      ['CAT-3', 'Accessories', 'Luxury lifestyle accessories & timepieces', new Date().toISOString()],
      ['CAT-4', 'Apparel', 'Signature custom apparel & lifestyle wear', new Date().toISOString()]
    ];
    defaultCats.forEach(row => catSheet.appendRow(row));
  }

  // 3. Memos Sheet
  let memoSheet = ss.getSheetByName(SHEETS.MEMOS);
  if (!memoSheet) {
    memoSheet = ss.insertSheet(SHEETS.MEMOS);
    memoSheet.appendRow(HEADERS.MEMOS);
    formatHeaderRow(memoSheet);
  } else {
    repairMemosSheet(memoSheet);
  }

  // 4. MemoItems Sheet
  let itemSheet = ss.getSheetByName(SHEETS.MEMO_ITEMS);
  if (!itemSheet) {
    itemSheet = ss.insertSheet(SHEETS.MEMO_ITEMS);
    itemSheet.appendRow(HEADERS.MEMO_ITEMS);
    formatHeaderRow(itemSheet);
  }

  // 5. TeamMembers Sheet
  let teamSheet = ss.getSheetByName(SHEETS.TEAM);
  if (!teamSheet) {
    teamSheet = ss.insertSheet(SHEETS.TEAM);
    teamSheet.appendRow(HEADERS.TEAM);
    formatHeaderRow(teamSheet);

    // Seed default Admin: email: admin@ravohouse.com, pass: ravo1234
    const salt = generateSalt();
    const hash = hashPassword('ravo1234', salt);
    teamSheet.appendRow([
      'USER-1', 'RAVO HOUSE Admin', 'admin@ravohouse.com', 'admin', hash, salt, 'active', new Date().toISOString()
    ]);
    
    // Seed sample Staff member: email: staff@ravohouse.com, pass: staff1234
    const staffSalt = generateSalt();
    const staffHash = hashPassword('staff1234', staffSalt);
    teamSheet.appendRow([
      'USER-2', 'Sales Staff', 'staff@ravohouse.com', 'staff', staffHash, staffSalt, 'active', new Date().toISOString()
    ]);
  }

  // 6. Settings Sheet
  let settingsSheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEETS.SETTINGS);
    settingsSheet.appendRow(HEADERS.SETTINGS);
    formatHeaderRow(settingsSheet);

    const defaultSettings = [
      ['shop_name', 'RAVO HOUSE'],
      ['shop_logo', ''],
      ['shop_tagline', 'Luxury & Lifestyle Management'],
      ['shop_phone', '+880 1711-000000'],
      ['shop_address', 'Gulshan 2, Dhaka, Bangladesh'],
      ['currency_symbol', '৳'],
      ['delivery_inside_dhaka', '60'],
      ['delivery_outside_dhaka', '130'],
      ['memo_prefix', 'RH'],
      ['invoice_footer_note', 'Thank you for shopping with RAVO HOUSE! No exchange after 7 days.']
    ];
    defaultSettings.forEach(row => settingsSheet.appendRow(row));
  } else {
    ensureDefaultSettings(settingsSheet);
  }

  // Remove empty default Sheet1 if exists
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch (e) {}
  }

  return { 
    status: 'success', 
    message: 'All RAVO HOUSE database sheets successfully initialized and schema verified.' 
  };
}

/**
 * Format Header Row Styling
 */
function formatHeaderRow(sheet) {
  const colCount = Math.max(sheet.getLastColumn(), 1);
  const headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0F172A');
  headerRange.setFontColor('#D4AF37');
  sheet.setFrozenRows(1);
}

/**
 * Repair Products Sheet schema and auto-correct shifted columns
 */
function repairProductsSheet(sheet) {
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastCol < 1) return;

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  
  // Check if Description column is missing
  if (headers.indexOf('Description') === -1) {
    const newCol = lastCol + 1;
    sheet.getRange(1, newCol).setValue('Description');
    headers.push('Description');
  }

  // Detect and fix shifted data from older buggy releases
  // Symptoms of shifted data: col 4 (Description) contains a URL and col 5 (ImageURL) contains a numeric price
  if (lastRow > 1) {
    const descIdx = headers.indexOf('Description');
    const imgIdx = headers.indexOf('ImageURL');
    const purchaseIdx = headers.indexOf('PurchasePrice');

    if (descIdx !== -1 && imgIdx !== -1) {
      const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      for (let r = 0; r < data.length; r++) {
        const row = data[r];
        const valDesc = String(row[descIdx] || '').trim();
        const valImg = row[imgIdx];

        const isUrlInDesc = valDesc.startsWith('http://') || 
                            valDesc.startsWith('https://') || 
                            valDesc.startsWith('data:image/') ||
                            valDesc.includes('unsplash.com') ||
                            valDesc.includes('cloudinary.com');
        const isNumericImg = !isNaN(Number(valImg)) && valImg !== '' && Number(valImg) > 0;

        // If the URL was accidentally saved into Description and numeric prices shifted into ImageURL
        if (isUrlInDesc && isNumericImg) {
          // Re-shift: Desc -> ImageURL, ImageURL -> PurchasePrice, etc.
          const actualUrl = row[descIdx];
          const actualPurchase = Number(row[imgIdx]) || 0;
          const actualPackaging = Number(row[imgIdx + 1]) || 0;
          const actualSelling = Number(row[imgIdx + 2]) || 0;
          const actualStock = Number(row[imgIdx + 3]) || 0;
          const actualCreated = String(row[imgIdx + 4] || new Date().toISOString());

          sheet.getRange(r + 2, descIdx + 1).setValue(''); // Clear corrupted description
          sheet.getRange(r + 2, imgIdx + 1).setValue(actualUrl);
          if (purchaseIdx !== -1) {
            sheet.getRange(r + 2, purchaseIdx + 1).setValue(actualPurchase);
            sheet.getRange(r + 2, purchaseIdx + 2).setValue(actualPackaging);
            sheet.getRange(r + 2, purchaseIdx + 3).setValue(actualSelling);
            sheet.getRange(r + 2, purchaseIdx + 4).setValue(actualStock);
            sheet.getRange(r + 2, purchaseIdx + 5).setValue(actualCreated);
          }
        }
      }
    }
  }

  formatHeaderRow(sheet);
}

/**
 * Repair Memos Sheet schema (adds OrderNotes column if missing)
 */
function repairMemosSheet(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  if (headers.indexOf('OrderNotes') === -1) {
    const statusCol = headers.indexOf('Status');
    if (statusCol !== -1) {
      sheet.insertColumnBefore(statusCol + 1);
      sheet.getRange(1, statusCol + 1).setValue('OrderNotes');
    } else {
      const newCol = lastCol + 1;
      sheet.getRange(1, newCol).setValue('OrderNotes');
    }
  }
  formatHeaderRow(sheet);
}

/**
 * Ensure default settings keys exist in Settings sheet
 */
function ensureDefaultSettings(sheet) {
  const data = sheet.getDataRange().getValues();
  const existingKeys = {};
  for (let i = 1; i < data.length; i++) {
    const k = String(data[i][0] || '').trim();
    if (k) existingKeys[k] = true;
  }

  const defaults = [
    ['shop_name', 'RAVO HOUSE'],
    ['shop_logo', ''],
    ['shop_tagline', 'Luxury & Lifestyle Management'],
    ['currency_symbol', '৳'],
    ['delivery_inside_dhaka', '60'],
    ['delivery_outside_dhaka', '130'],
    ['memo_prefix', 'RH']
  ];

  defaults.forEach(pair => {
    if (!existingKeys[pair[0]]) {
      sheet.appendRow(pair);
    }
  });
}

/**
 * Utility: Generate Salt
 */
function generateSalt() {
  return Utilities.getUuid().substring(0, 8);
}

/**
 * Utility: Hash Password with Salt using SHA-256
 */
function hashPassword(password, salt) {
  const signature = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + salt,
    Utilities.Charset.UTF_8
  );
  return signature.map(function(byte) {
    let v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * Handle Login
 */
function handleLogin(email, password) {
  if (!email || !password) {
    return { status: 'error', message: 'Email and password are required.' };
  }

  const teamData = getSheetData(SHEETS.TEAM);
  const user = teamData.find(u => {
    const userEmail = u.Email || u.email;
    return userEmail && String(userEmail).toLowerCase() === email.trim().toLowerCase();
  });

  if (!user) {
    return { status: 'error', message: 'Invalid email or user not found.' };
  }

  const status = (user.Status || user.status || '').toLowerCase();
  if (status !== 'active') {
    return { status: 'error', message: 'Account is deactivated. Contact the administrator.' };
  }

  const salt = user.Salt || user.salt || '';
  const storedHash = user.PasswordHash || user.passwordHash || '';
  const calculatedHash = hashPassword(password.trim(), salt);

  if (calculatedHash !== storedHash) {
    return { status: 'error', message: 'Incorrect password.' };
  }

  const userId = user.ID || user.id || 'USER-1';
  const userName = user.FullName || user.fullName || user.Name || 'Admin User';
  const userRole = user.Role || user.role || 'staff';
  const token = Utilities.base64Encode(userId + ':' + new Date().getTime());

  return {
    status: 'success',
    user: {
      id: userId,
      name: userName,
      email: user.Email || user.email,
      role: userRole,
      token: token
    }
  };
}

/**
 * Get Sheet Data as Array of Objects with trimmed, clean keys
 */
function getSheetData(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const rawHeaders = values[0];
  const headers = rawHeaders.map(h => String(h || '').trim());
  const results = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const item = {};
    let hasData = false;

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        const val = row[j];
        item[header] = val;
        if (val !== '' && val !== null && val !== undefined) {
          hasData = true;
        }
      }
    }
    if (hasData) {
      results.push(item);
    }
  }
  return results;
}

/**
 * Fetch Key-Value Settings with automatic chunk reassembly for large logos
 */
function getSettingsData() {
  const settingsArray = getSheetData(SHEETS.SETTINGS);
  const settings = {};
  settingsArray.forEach(row => {
    if (row.Key) {
      settings[row.Key] = row.Value;
    }
  });

  // Reassemble any chunked settings (e.g. large base64 logo that exceeded 45,000 chars)
  for (const key in settings) {
    const val = settings[key];
    if (typeof val === 'string' && val.indexOf('[CHUNKED:') === 0) {
      const chunkCount = Number(settings[key + '_chunks']) || 0;
      let fullStr = '';
      for (let i = 0; i < chunkCount; i++) {
        fullStr += (settings[key + '_part_' + i] || '');
      }
      if (fullStr) {
        settings[key] = fullStr;
      }
    }
  }

  return settings;
}

/**
 * Fetch Memos with their nested Line Items
 */
function getMemosData() {
  const memos = getSheetData(SHEETS.MEMOS);
  const items = getSheetData(SHEETS.MEMO_ITEMS);

  // Group items by MemoID
  const itemsByMemo = {};
  items.forEach(item => {
    const memoId = item.MemoID || item.memoId;
    if (memoId) {
      if (!itemsByMemo[memoId]) itemsByMemo[memoId] = [];
      itemsByMemo[memoId].push(item);
    }
  });

  memos.forEach(m => {
    const mId = m.MemoID || m.memoId;
    m.items = itemsByMemo[mId] || [];
  });

  // Return sorted descending by Date
  return memos.reverse();
}

/**
 * Get Initial Data Package for Fast Client Bootstrapping
 * Redacts costs and profits if role === 'staff'
 */
function getInitialData(role) {
  // Ensure database sheets exist and are verified
  setupDatabase();

  let products = getSheetData(SHEETS.PRODUCTS);
  const categories = getSheetData(SHEETS.CATEGORIES);
  let memos = getMemosData();
  const settings = getSettingsData();
  
  if (role === 'staff') {
    // Redact internal purchase prices, packaging costs and profits
    products = products.map(p => ({
      ID: p.ID || p.id,
      Name: p.Name || p.name,
      Category: p.Category || p.category,
      Description: p.Description || p.description || '',
      ImageURL: p.ImageURL || p.imageUrl || '',
      PurchasePrice: 0,
      PackagingCost: 0,
      SellingPrice: Number(p.SellingPrice || p.sellingPrice) || 0,
      Stock: Number(p.Stock || p.stock) || 0,
      CreatedAt: p.CreatedAt || p.createdAt || ''
    }));

    memos = memos.map(m => ({
      MemoID: m.MemoID || m.memoId,
      Date: m.Date || m.date,
      CustomerName: m.CustomerName || m.customerName,
      CustomerPhone: m.CustomerPhone || m.customerPhone,
      DeliveryAddress: m.DeliveryAddress || m.deliveryAddress,
      DeliveryZone: m.DeliveryZone || m.deliveryZone,
      DeliveryCharge: Number(m.DeliveryCharge || m.deliveryCharge) || 0,
      Discount: Number(m.Discount || m.discount) || 0,
      Subtotal: Number(m.Subtotal || m.subtotal) || 0,
      GrandTotal: Number(m.GrandTotal || m.grandTotal) || 0,
      OrderCost: 0,
      OrderProfit: 0,
      OrderNotes: m.OrderNotes || m.orderNotes || '',
      Status: m.Status || m.status || 'Pending',
      CreatedBy: m.CreatedBy || m.createdBy,
      items: (m.items || []).map(it => ({
        ID: it.ID || it.id,
        MemoID: it.MemoID || it.memoId,
        ProductID: it.ProductID || it.productId,
        ProductName: it.ProductName || it.productName,
        UnitPrice: Number(it.UnitPrice || it.unitPrice) || 0,
        Quantity: Number(it.Quantity || it.quantity) || 1,
        TotalPrice: Number(it.TotalPrice || it.totalPrice) || 0,
        UnitCost: 0
      }))
    }));

    return {
      status: 'success',
      data: {
        products: products,
        categories: categories,
        memos: memos,
        settings: settings,
        teamMembers: []
      }
    };
  }

  // Admin sees full data
  const teamRaw = getSheetData(SHEETS.TEAM);
  const teamMembers = teamRaw.map(u => ({
    id: u.ID || u.id,
    name: u.FullName || u.name,
    email: u.Email || u.email,
    role: u.Role || u.role,
    status: u.Status || u.status,
    createdAt: u.CreatedAt || u.createdAt
  }));

  return {
    status: 'success',
    data: {
      products: products,
      categories: categories,
      memos: memos,
      settings: settings,
      teamMembers: teamMembers
    }
  };
}

/**
 * Product: Add (Uses Dynamic Header Mapping to guarantee zero column mismatch)
 */
function addProduct(prod) {
  if (!prod) return { status: 'error', message: 'Product payload is required.' };

  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.PRODUCTS);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(SHEETS.PRODUCTS);
  }

  let headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(h => String(h || '').trim());
  if (headers.length === 0 || !headers[0]) {
    sheet.clear();
    sheet.appendRow(HEADERS.PRODUCTS);
    formatHeaderRow(sheet);
    headers = HEADERS.PRODUCTS;
  } else if (headers.indexOf('Description') === -1) {
    const newCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, newCol).setValue('Description');
    headers.push('Description');
  }

  const id = prod.id || ('PROD-' + (sheet.getLastRow() + 100));

  // Build row strictly matching each column header by name
  const row = headers.map(header => {
    switch (header) {
      case 'ID': return id;
      case 'Name': return prod.name || 'Untitled Product';
      case 'Category': return prod.category || 'General';
      case 'Description': return prod.description || '';
      case 'ImageURL': return prod.imageUrl || '';
      case 'PurchasePrice': return Number(prod.purchasePrice) || 0;
      case 'PackagingCost': return Number(prod.packagingCost) || 0;
      case 'SellingPrice': return Number(prod.sellingPrice) || 0;
      case 'Stock': return Number(prod.stock) || 0;
      case 'CreatedAt': return prod.createdAt || new Date().toISOString();
      default: return '';
    }
  });

  sheet.appendRow(row);
  return { status: 'success', message: 'Product added successfully.', id: id };
}

/**
 * Product: Update (Uses Dynamic Header Mapping to guarantee zero column mismatch)
 */
function updateProduct(prod) {
  if (!prod || !prod.id) return { status: 'error', message: 'Product ID is required for update.' };

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
  if (!sheet) return { status: 'error', message: 'Products sheet missing.' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'error', message: 'No products in database.' };

  let headers = data[0].map(h => String(h || '').trim());
  let descColIndex = headers.indexOf('Description');
  if (descColIndex === -1) {
    const newCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, newCol).setValue('Description');
    headers.push('Description');
  }

  const idColIndex = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : 0;
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(prod.id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { status: 'error', message: 'Product not found with ID: ' + prod.id };
  }

  // Update cells dynamically according to each header's column index
  headers.forEach((header, idx) => {
    const colIndex = idx + 1;
    switch (header) {
      case 'Name':
        sheet.getRange(rowIndex, colIndex).setValue(prod.name || '');
        break;
      case 'Category':
        sheet.getRange(rowIndex, colIndex).setValue(prod.category || '');
        break;
      case 'Description':
        sheet.getRange(rowIndex, colIndex).setValue(prod.description || '');
        break;
      case 'ImageURL':
        sheet.getRange(rowIndex, colIndex).setValue(prod.imageUrl || '');
        break;
      case 'PurchasePrice':
        sheet.getRange(rowIndex, colIndex).setValue(Number(prod.purchasePrice) || 0);
        break;
      case 'PackagingCost':
        sheet.getRange(rowIndex, colIndex).setValue(Number(prod.packagingCost) || 0);
        break;
      case 'SellingPrice':
        sheet.getRange(rowIndex, colIndex).setValue(Number(prod.sellingPrice) || 0);
        break;
      case 'Stock':
        sheet.getRange(rowIndex, colIndex).setValue(Number(prod.stock) || 0);
        break;
    }
  });

  return { status: 'success', message: 'Product updated successfully.' };
}

/**
 * Product: Delete
 */
function deleteProduct(id) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.PRODUCTS);
  if (!sheet) return { status: 'error', message: 'Products sheet missing.' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'error', message: 'No products in database.' };

  const headers = data[0].map(h => String(h || '').trim());
  const idColIndex = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : 0;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Product deleted successfully.' };
    }
  }
  return { status: 'error', message: 'Product not found with ID: ' + id };
}

/**
 * Category: Add
 */
function addCategory(cat) {
  if (!cat || !cat.name) return { status: 'error', message: 'Category name is required.' };

  const sheet = getSpreadsheet().getSheetByName(SHEETS.CATEGORIES);
  if (!sheet) setupDatabase();

  const id = cat.id || ('CAT-' + (sheet.getLastRow()));
  const row = [
    id,
    cat.name,
    cat.description || '',
    new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { status: 'success', message: 'Category added successfully.', id: id };
}

/**
 * Category: Delete
 */
function deleteCategory(id) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.CATEGORIES);
  if (!sheet) return { status: 'error', message: 'Categories sheet missing.' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'error', message: 'No categories in database.' };

  const headers = data[0].map(h => String(h || '').trim());
  const idColIndex = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : 0;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Category deleted successfully.' };
    }
  }
  return { status: 'error', message: 'Category not found with ID: ' + id };
}

/**
 * Memo: Create Memo and Memo Items Atomically
 * Fully handles OrderNotes and updates stock dynamically
 */
function createMemo(memo, items) {
  if (!memo) return { status: 'error', message: 'Memo payload is required.' };

  const ss = getSpreadsheet();
  let memoSheet = ss.getSheetByName(SHEETS.MEMOS);
  let itemsSheet = ss.getSheetByName(SHEETS.MEMO_ITEMS);
  const prodSheet = ss.getSheetByName(SHEETS.PRODUCTS);

  if (!memoSheet || !itemsSheet) {
    setupDatabase();
    memoSheet = ss.getSheetByName(SHEETS.MEMOS);
    itemsSheet = ss.getSheetByName(SHEETS.MEMO_ITEMS);
  }

  let memoHeaders = memoSheet.getRange(1, 1, 1, Math.max(memoSheet.getLastColumn(), 1)).getValues()[0].map(h => String(h || '').trim());
  if (memoHeaders.length === 0 || !memoHeaders[0]) {
    memoSheet.clear();
    memoSheet.appendRow(HEADERS.MEMOS);
    formatHeaderRow(memoSheet);
    memoHeaders = HEADERS.MEMOS;
  } else if (memoHeaders.indexOf('OrderNotes') === -1) {
    const notesCol = memoSheet.getLastColumn() + 1;
    memoSheet.getRange(1, notesCol).setValue('OrderNotes');
    memoHeaders.push('OrderNotes');
  }

  // Generate unique Memo ID if not supplied
  const dateStr = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyMMdd');
  const memoId = memo.memoId || ('RH-' + dateStr + '-' + Math.floor(1000 + Math.random() * 9000));

  // Compute Order Cost & Order Profit
  let totalOrderCost = 0;
  if (items && items.length > 0) {
    items.forEach(it => {
      const unitCost = Number(it.unitCost) || 0;
      const qty = Number(it.quantity) || 1;
      totalOrderCost += (unitCost * qty);
    });
  }

  const grandTotal = Number(memo.grandTotal) || 0;
  const deliveryCharge = Number(memo.deliveryCharge) || 0;
  const orderProfit = (Number(memo.subtotal) - Number(memo.discount || 0)) - totalOrderCost;

  // Build row strictly matching each column header by name
  const memoValues = {
    'MemoID': memoId,
    'Date': memo.date || Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss'),
    'CustomerName': memo.customerName || 'Walking Customer',
    'CustomerPhone': memo.customerPhone || '',
    'DeliveryAddress': memo.deliveryAddress || 'Dhaka',
    'DeliveryZone': memo.deliveryZone || 'Inside Dhaka',
    'DeliveryCharge': deliveryCharge,
    'Discount': Number(memo.discount) || 0,
    'Subtotal': Number(memo.subtotal) || 0,
    'GrandTotal': grandTotal,
    'OrderCost': totalOrderCost,
    'OrderProfit': orderProfit,
    'OrderNotes': memo.orderNotes || '',
    'Status': memo.status || 'Pending',
    'CreatedBy': memo.createdBy || 'Staff'
  };

  const memoRow = memoHeaders.map(h => memoValues[h] !== undefined ? memoValues[h] : '');
  memoSheet.appendRow(memoRow);

  // Append Memo Items Rows & Decrement Stock
  if (items && items.length > 0) {
    const prodData = prodSheet ? prodSheet.getDataRange().getValues() : [];
    let prodHeaders = [];
    let prodIdCol = 0;
    let prodStockCol = -1;

    if (prodData.length > 0) {
      prodHeaders = prodData[0].map(h => String(h || '').trim());
      prodIdCol = prodHeaders.indexOf('ID') !== -1 ? prodHeaders.indexOf('ID') : 0;
      prodStockCol = prodHeaders.indexOf('Stock');
    }

    items.forEach((it, idx) => {
      const itemId = 'ITEM-' + memoId + '-' + (idx + 1);
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      const lineTotal = Number(it.totalPrice) || (qty * unitPrice);
      const unitCost = Number(it.unitCost) || 0;

      itemsSheet.appendRow([
        itemId,
        memoId,
        it.productId || '',
        it.productName || 'Item',
        unitPrice,
        qty,
        lineTotal,
        unitCost
      ]);

      // Decrement stock accurately by finding the 'Stock' column header
      if (prodSheet && it.productId && prodStockCol !== -1) {
        for (let r = 1; r < prodData.length; r++) {
          if (String(prodData[r][prodIdCol]) === String(it.productId)) {
            const currentStock = Number(prodData[r][prodStockCol]) || 0;
            const newStock = Math.max(0, currentStock - qty);
            prodSheet.getRange(r + 1, prodStockCol + 1).setValue(newStock);
            prodData[r][prodStockCol] = newStock;
            break;
          }
        }
      }
    });
  }

  return {
    status: 'success',
    message: 'Order memo created and saved to Google Sheets successfully.',
    memoId: memoId,
    orderProfit: orderProfit
  };
}

/**
 * Memo: Update Status (Pending, Confirmed, Shipped, Delivered, Cancelled)
 */
function updateMemoStatus(memoId, newStatus) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.MEMOS);
  if (!sheet) return { status: 'error', message: 'Memos sheet missing.' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'error', message: 'No memos in database.' };

  const headers = data[0].map(h => String(h || '').trim());
  const idCol = headers.indexOf('MemoID') !== -1 ? headers.indexOf('MemoID') : 0;
  const statusCol = headers.indexOf('Status');
  const targetCol = statusCol !== -1 ? (statusCol + 1) : 13;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(memoId)) {
      sheet.getRange(i + 1, targetCol).setValue(newStatus);
      return { status: 'success', message: 'Memo status updated to ' + newStatus };
    }
  }
  return { status: 'error', message: 'Memo not found with ID: ' + memoId };
}

/**
 * Memo: Delete Memo and Associated Line Items
 */
function deleteMemo(memoId) {
  const ss = getSpreadsheet();
  const memoSheet = ss.getSheetByName(SHEETS.MEMOS);
  const itemsSheet = ss.getSheetByName(SHEETS.MEMO_ITEMS);

  if (!memoSheet) return { status: 'error', message: 'Memos sheet missing.' };

  let found = false;
  const memoData = memoSheet.getDataRange().getValues();
  const memoHeaders = memoData.length > 0 ? memoData[0].map(h => String(h || '').trim()) : [];
  const memoIdCol = memoHeaders.indexOf('MemoID') !== -1 ? memoHeaders.indexOf('MemoID') : 0;

  for (let i = 1; i < memoData.length; i++) {
    if (String(memoData[i][memoIdCol]) === String(memoId)) {
      memoSheet.deleteRow(i + 1);
      found = true;
      break;
    }
  }

  if (itemsSheet) {
    const itemData = itemsSheet.getDataRange().getValues();
    const itemHeaders = itemData.length > 0 ? itemData[0].map(h => String(h || '').trim()) : [];
    const itemMemoIdCol = itemHeaders.indexOf('MemoID') !== -1 ? itemHeaders.indexOf('MemoID') : 1;

    for (let j = itemData.length - 1; j >= 1; j--) {
      if (String(itemData[j][itemMemoIdCol]) === String(memoId)) {
        itemsSheet.deleteRow(j + 1);
      }
    }
  }

  if (found) {
    return { status: 'success', message: 'Memo deleted successfully.' };
  } else {
    return { status: 'error', message: 'Memo not found.' };
  }
}

/**
 * Team: Add Member with Secure Hash
 */
function addTeamMember(member) {
  if (!member || !member.email || !member.password) {
    return { status: 'error', message: 'Name, email, and password are required.' };
  }

  const sheet = getSpreadsheet().getSheetByName(SHEETS.TEAM);
  if (!sheet) setupDatabase();

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h || '').trim());
  const emailCol = headers.indexOf('Email') !== -1 ? headers.indexOf('Email') : 2;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][emailCol]).toLowerCase() === String(member.email).trim().toLowerCase()) {
      return { status: 'error', message: 'A team member with this email already exists.' };
    }
  }

  const salt = generateSalt();
  const hash = hashPassword(member.password, salt);
  const id = 'USER-' + (sheet.getLastRow());

  sheet.appendRow([
    id,
    member.name || 'Team Member',
    member.email.trim(),
    member.role || 'staff',
    hash,
    salt,
    'active',
    new Date().toISOString()
  ]);

  return { status: 'success', message: 'Team member added successfully.' };
}

/**
 * Team: Delete Member
 */
function deleteTeamMember(id) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.TEAM);
  if (!sheet) return { status: 'error', message: 'Team sheet missing.' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'error', message: 'No team members in database.' };

  const headers = data[0].map(h => String(h || '').trim());
  const idCol = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : 0;
  const roleCol = headers.indexOf('Role') !== -1 ? headers.indexOf('Role') : 3;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      if (data[i][roleCol] === 'admin' && i === 1) {
        return { status: 'error', message: 'Cannot delete primary root administrator.' };
      }
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Team member removed.' };
    }
  }
  return { status: 'error', message: 'Team member not found with ID: ' + id };
}

/**
 * Team: Change Password for Member or Administrator
 */
function changePassword(emailOrId, newPassword, currentPassword) {
  if (!emailOrId || !newPassword) {
    return { status: 'error', message: 'User identification and new password are required.' };
  }

  const cleanPass = String(newPassword).trim();
  if (cleanPass.length < 6) {
    return { status: 'error', message: 'Password must be at least 6 characters long.' };
  }

  const sheet = getSpreadsheet().getSheetByName(SHEETS.TEAM);
  if (!sheet) return { status: 'error', message: 'Team sheet not found.' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'error', message: 'No users found in database.' };

  const headers = data[0].map(h => String(h || '').trim());
  const idCol = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : 0;
  const emailCol = headers.indexOf('Email') !== -1 ? headers.indexOf('Email') : 2;
  const hashCol = headers.indexOf('PasswordHash') !== -1 ? headers.indexOf('PasswordHash') : 4;
  const saltCol = headers.indexOf('Salt') !== -1 ? headers.indexOf('Salt') : 5;

  let targetRow = -1;
  const searchVal = String(emailOrId).trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][idCol] || '').trim().toLowerCase();
    const rowEmail = String(data[i][emailCol] || '').trim().toLowerCase();
    if (rowId === searchVal || rowEmail === searchVal) {
      targetRow = i + 1;
      if (currentPassword) {
        const existingSalt = String(data[i][saltCol] || '');
        const existingHash = String(data[i][hashCol] || '');
        const calcHash = hashPassword(String(currentPassword).trim(), existingSalt);
        if (calcHash !== existingHash) {
          return { status: 'error', message: 'Current password is incorrect.' };
        }
      }
      break;
    }
  }

  if (targetRow === -1) {
    return { status: 'error', message: 'User not found in database: ' + emailOrId };
  }

  const newSalt = generateSalt();
  const newHash = hashPassword(cleanPass, newSalt);

  sheet.getRange(targetRow, hashCol + 1).setValue(newHash);
  sheet.getRange(targetRow, saltCol + 1).setValue(newSalt);

  return { status: 'success', message: 'Password updated successfully!' };
}

/**
 * Settings: Update Key-Value Settings
 * Protects against Google Sheets 50,000 character limit by automatically chunking large values
 */
function updateSettings(settingsObj) {
  if (!settingsObj || typeof settingsObj !== 'object') {
    return { status: 'error', message: 'Invalid settings object.' };
  }

  const sheet = getSpreadsheet().getSheetByName(SHEETS.SETTINGS);
  if (!sheet) setupDatabase();

  const data = sheet.getDataRange().getValues();
  const existingKeys = {};

  for (let i = 1; i < data.length; i++) {
    const k = String(data[i][0] || '').trim();
    if (k) existingKeys[k] = i + 1;
  }

  function setVal(key, val) {
    if (existingKeys[key]) {
      sheet.getRange(existingKeys[key], 2).setValue(val);
    } else {
      sheet.appendRow([key, val]);
      existingKeys[key] = sheet.getLastRow();
    }
  }

  for (const key in settingsObj) {
    const val = settingsObj[key];
    const valStr = (val !== null && val !== undefined) ? String(val) : '';

    // If setting exceeds Google Sheets 50,000 char per cell limit (e.g. large base64 logo)
    if (valStr.length > 45000) {
      const CHUNK_SIZE = 40000;
      const chunks = [];
      for (let c = 0; c < valStr.length; c += CHUNK_SIZE) {
        chunks.push(valStr.substring(c, c + CHUNK_SIZE));
      }

      setVal(key + '_chunks', chunks.length);
      for (let idx = 0; idx < chunks.length; idx++) {
        setVal(key + '_part_' + idx, chunks[idx]);
      }
      setVal(key, '[CHUNKED:' + chunks.length + ']');
    } else {
      setVal(key, val);
    }
  }

  return { status: 'success', message: 'Settings updated successfully.' };
}
