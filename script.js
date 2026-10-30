/**
 * =========================================================================
 * RAVO HOUSE - Luxury Product Management & Order Memo System
 * Operating in Bangladesh (BDT ৳)
 * Migrated to Tailwind CSS
 * Google Apps Script API & Google Sheets Integration
 * =========================================================================
 */

(function () {
  'use strict';

  // Application State
  const AppState = {
    products: [],
    categories: [],
    memos: [],
    teamMembers: [],
    settings: {
      apiUrl: 'https://script.google.com/macros/s/AKfycbxJyen7LVudk_XdQBVnNZuqWeG-PZnNzZK2hW0zn5ItYWN_suEnLgPDpzFL2aTGVWY/exec',
      shop_name: 'RAVO HOUSE',
      shop_logo: '',
      shop_tagline: 'Luxury & Lifestyle Management',
      shop_phone: '+880 1711-000000',
      shop_address: 'Gulshan 2, Dhaka - 1212, Bangladesh',
      currency_symbol: '৳',
      delivery_inside_dhaka: '60',
      delivery_outside_dhaka: '130',
      memo_prefix: 'RH',
      invoice_footer_note: 'Thank you for your patronage with RAVO HOUSE. Please check your items in front of the delivery courier.'
    },
    currentUser: null,
    activeTab: 'dashboard',
    currentCategoryFilter: 'all',
    memoLineItems: [],
    activeMemoDetails: null,
    backendStatus: 'checking', // 'connected', 'demo', 'error'
    searchQueries: {
      products: '',
      memos: ''
    }
  };

  /**
   * Centralized Branding Service & Configuration
   * Manages Website Name and Official Logo across the entire application
   */
  const Branding = {
    DEFAULT_NAME: 'RAVO HOUSE',
    DEFAULT_LOGO: 'src/image/logo.png',

    getName() {
      return (AppState.settings && AppState.settings.shop_name && AppState.settings.shop_name.trim())
        ? AppState.settings.shop_name.trim()
        : this.DEFAULT_NAME;
    },

    getLogo() {
      return (AppState.settings && AppState.settings.shop_logo && AppState.settings.shop_logo.trim())
        ? AppState.settings.shop_logo.trim()
        : this.DEFAULT_LOGO;
    },

    hasCustomLogo() {
      return !!(AppState.settings && AppState.settings.shop_logo && AppState.settings.shop_logo.trim());
    },

    setName(newName) {
      if (!AppState.settings) AppState.settings = {};
      AppState.settings.shop_name = String(newName || '').trim() || this.DEFAULT_NAME;
    },

    setLogo(logoVal) {
      if (!AppState.settings) AppState.settings = {};
      AppState.settings.shop_logo = logoVal ? String(logoVal).trim() : '';
    },

    removeLogo() {
      if (!AppState.settings) AppState.settings = {};
      AppState.settings.shop_logo = '';
    },

    apply() {
      const name = this.getName();
      const logo = this.getLogo();
      const hasCustom = this.hasCustomLogo();

      // 1. Browser window title
      document.title = `${name} | Luxury Product & Order Memo Management`;

      // 2. Login Screen Branding
      const loginTitle = document.getElementById('loginBrandTitle');
      if (loginTitle) loginTitle.textContent = name;
      const loginLogo = document.getElementById('loginLogoImg');
      if (loginLogo) {
        loginLogo.src = logo;
        loginLogo.alt = name;
      }

      // 3. Header Branding
      const headerTitle = document.getElementById('headerBrandTitle');
      if (headerTitle) headerTitle.textContent = name;
      const headerLogo = document.getElementById('headerLogoImg');
      if (headerLogo) {
        headerLogo.src = logo;
        headerLogo.alt = name;
      }

      // 4. Update all declarative branding text and image elements
      document.querySelectorAll('[data-branding="name"]').forEach(el => {
        el.textContent = name;
      });
      document.querySelectorAll('[data-branding="logo"]').forEach(el => {
        if (el.tagName === 'IMG') {
          el.src = logo;
          el.alt = name;
        }
      });

      // 5. Keep Settings Form inputs synchronized
      const settingWebsiteName = document.getElementById('settingWebsiteName');
      if (settingWebsiteName && document.activeElement !== settingWebsiteName) {
        settingWebsiteName.value = name;
      }
      const settingShopName = document.getElementById('settingShopName');
      if (settingShopName && document.activeElement !== settingShopName) {
        settingShopName.value = name;
      }

      // 6. Keep Settings Logo Preview Box and Status Badge updated
      const previewImg = document.getElementById('settingLogoPreviewImg');
      if (previewImg && !AppState._pendingLogoData) {
        previewImg.src = logo;
      }
      const statusBadge = document.getElementById('logoStatusBadge');
      if (statusBadge && !AppState._pendingLogoData) {
        if (hasCustom) {
          statusBadge.textContent = 'Custom Logo Active';
          statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
        } else {
          statusBadge.textContent = 'Default Logo';
          statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-semibold bg-navy-700 text-slate-300 border border-navy-border';
        }
      }
      const logoUrlInput = document.getElementById('settingLogoUrlInput');
      if (logoUrlInput && document.activeElement !== logoUrlInput && !AppState._pendingLogoData) {
        logoUrlInput.value = (hasCustom && !AppState.settings.shop_logo.startsWith('data:')) ? AppState.settings.shop_logo : '';
      }
    }
  };

  // Seed Fallback Data (used when backend is not yet deployed or in initial state)
  const SEED_DATA = {
    categories: [
      { id: 'CAT-1', name: 'Luxury Perfumes', description: 'Extrait de parfum & artisanal attars' },
      { id: 'CAT-2', name: 'Leather Goods', description: 'Handcrafted wallets, cardholders & belts' },
      { id: 'CAT-3', name: 'Accessories', description: 'Luxury timepieces & gold-plated cuff wear' },
      { id: 'CAT-4', name: 'Signature Apparel', description: 'Tailored jackets & minimalist polos' }
    ],
    products: [
      {
        id: 'PROD-101',
        name: 'Oud Royale Extrait de Parfum (50ml)',
        category: 'Luxury Perfumes',
        description: 'Rare Cambodian agarwood infused with velvety amber, warm cardamom, and Madagascar bourbon vanilla. 50ml concentrated extrait de parfum.',
        imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&auto=format&fit=crop&q=80',
        purchasePrice: 1200,
        packagingCost: 80,
        sellingPrice: 2450,
        stock: 28,
        createdAt: new Date().toISOString()
      },
      {
        id: 'PROD-102',
        name: 'Imperial Noir Velvet Attar (12ml)',
        category: 'Luxury Perfumes',
        description: 'Artisanal pure non-alcoholic concentrated perfume oil featuring deep woody notes, smoked Taif rose, and dark musk. 12ml roll-on.',
        imageUrl: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&auto=format&fit=crop&q=80',
        purchasePrice: 650,
        packagingCost: 50,
        sellingPrice: 1450,
        stock: 45,
        createdAt: new Date().toISOString()
      },
      {
        id: 'PROD-103',
        name: 'Signature Full-Grain Leather Cardholder',
        category: 'Leather Goods',
        description: 'Handcrafted full-grain vegetable-tanned cowhide leather with 6 card slots and center cash sleeve. Debossed gold emblem.',
        imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
        purchasePrice: 450,
        packagingCost: 60,
        sellingPrice: 1150,
        stock: 18,
        createdAt: new Date().toISOString()
      },
      {
        id: 'PROD-104',
        name: 'Minimalist Champagne Gold Chrono Watch',
        category: 'Accessories',
        description: 'Precision Japanese quartz chronograph, sapphire-coated crystal glass, 18K champagne gold-plated 40mm case with genuine stitched leather strap.',
        imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80',
        purchasePrice: 1800,
        packagingCost: 120,
        sellingPrice: 3850,
        stock: 12,
        createdAt: new Date().toISOString()
      }
    ],
    memos: [
      {
        memoId: 'RH-261012-1082',
        date: '2026-10-12 18:30:00',
        customerName: 'Zubair Al Mahmud',
        customerPhone: '01712345678',
        deliveryAddress: 'House 14, Road 7, Dhanmondi, Dhaka',
        deliveryZone: 'Inside Dhaka',
        deliveryCharge: 60,
        discount: 0,
        subtotal: 3900,
        grandTotal: 3960,
        orderCost: 1980,
        orderProfit: 1920,
        status: 'Delivered',
        createdBy: 'RAVO HOUSE Admin',
        items: [
          { productId: 'PROD-101', productName: 'Oud Royale Extrait de Parfum (50ml)', unitPrice: 2450, quantity: 1, totalPrice: 2450, unitCost: 1280 },
          { productId: 'PROD-102', productName: 'Imperial Noir Velvet Attar (12ml)', unitPrice: 1450, quantity: 1, totalPrice: 1450, unitCost: 700 }
        ]
      },
      {
        memoId: 'RH-261012-1094',
        date: '2026-10-12 21:15:00',
        customerName: 'Nusrat Jahan',
        customerPhone: '01898765432',
        deliveryAddress: 'Nasirabad Housing Society, Chattogram',
        deliveryZone: 'Outside Dhaka',
        deliveryCharge: 130,
        discount: 100,
        subtotal: 3850,
        grandTotal: 3880,
        orderCost: 1920,
        orderProfit: 1830,
        status: 'Confirmed',
        createdBy: 'Sales Staff',
        items: [
          { productId: 'PROD-104', productName: 'Minimalist Champagne Gold Chrono Watch', unitPrice: 3850, quantity: 1, totalPrice: 3850, unitCost: 1920 }
        ]
      }
    ],
    teamMembers: [
      { id: 'USER-1', name: 'RAVO HOUSE Admin', email: 'admin@ravohouse.com', role: 'admin', status: 'active', createdAt: '2026-10-01' },
      { id: 'USER-2', name: 'Sales Staff', email: 'staff@ravohouse.com', role: 'staff', status: 'active', createdAt: '2026-10-05' }
    ]
  };

  /**
   * Safe Local Cache Helpers
   */
  const Storage = {
    load() {
      try {
        const storedSettings = localStorage.getItem('ravo_settings');
        if (storedSettings) AppState.settings = Object.assign({}, AppState.settings, JSON.parse(storedSettings));

        if (!AppState.settings.apiUrl) {
          AppState.settings.apiUrl = 'https://script.google.com/macros/s/AKfycbxJyen7LVudk_XdQBVnNZuqWeG-PZnNzZK2hW0zn5ItYWN_suEnLgPDpzFL2aTGVWY/exec';
        }

        const storedAuth = sessionStorage.getItem('ravo_auth_user') || localStorage.getItem('ravo_auth_user');
        if (storedAuth) {
          try {
            AppState.currentUser = JSON.parse(storedAuth);
          } catch (e) {
            AppState.currentUser = null;
          }
        } else {
          AppState.currentUser = null;
        }

        if (AppState.currentUser) {
          const storedProducts = localStorage.getItem('ravo_products');
          if (storedProducts) {
            try {
              const parsed = JSON.parse(storedProducts);
              AppState.products = parsed.map(p => {
                const seedMatch = SEED_DATA.products.find(s => s.id === p.id);
                return {
                  ...p,
                  description: (p.description !== undefined && p.description !== '') ? p.description : (seedMatch ? seedMatch.description : '')
                };
              });
            } catch (e) {
              AppState.products = [...SEED_DATA.products];
            }
          } else {
            AppState.products = [...SEED_DATA.products];
          }

          const storedCategories = localStorage.getItem('ravo_categories');
          if (storedCategories) AppState.categories = JSON.parse(storedCategories);
          else AppState.categories = [...SEED_DATA.categories];

          const storedMemos = localStorage.getItem('ravo_memos');
          if (storedMemos) AppState.memos = JSON.parse(storedMemos);
          else AppState.memos = [...SEED_DATA.memos];

          const storedTeam = localStorage.getItem('ravo_team');
          if (storedTeam) AppState.teamMembers = JSON.parse(storedTeam);
          else AppState.teamMembers = [...SEED_DATA.teamMembers];

          if (AppState.currentUser.role === 'staff') {
            AppState.products = AppState.products.map(p => ({ ...p, purchasePrice: 0, packagingCost: 0 }));
            AppState.memos = AppState.memos.map(m => ({ ...m, orderCost: 0, orderProfit: 0 }));
            AppState.teamMembers = [];
          }
        } else {
          AppState.products = [];
          AppState.categories = [];
          AppState.memos = [];
          AppState.teamMembers = [];
        }
      } catch (e) {
        console.warn('Storage load error:', e);
      }
    },
    save() {
      try {
        localStorage.setItem('ravo_settings', JSON.stringify(AppState.settings));
        if (AppState.currentUser) {
          localStorage.setItem('ravo_products', JSON.stringify(AppState.products));
          localStorage.setItem('ravo_categories', JSON.stringify(AppState.categories));
          localStorage.setItem('ravo_memos', JSON.stringify(AppState.memos));
          localStorage.setItem('ravo_team', JSON.stringify(AppState.teamMembers));
        }
      } catch (e) {
        console.warn('Storage save error:', e);
      }
    }
  };

  /**
   * API Communications with Google Apps Script
   */
  const API = {
    async call(payload, method = 'POST') {
      const url = AppState.settings.apiUrl ? AppState.settings.apiUrl.trim() : '';

      if (!url) {
        throw new Error('Google Apps Script URL is not configured. Go to Settings to enter your Web App URL.');
      }

      // Attach session authorization tokens
      if (AppState.currentUser) {
        payload.token = payload.token || AppState.currentUser.token;
        payload.role = payload.role || AppState.currentUser.role;
        payload.userId = payload.userId || AppState.currentUser.id;
      }

      try {
        let fetchUrl = url;
        let options = {};

        if (method === 'GET') {
          const params = new URLSearchParams(payload).toString();
          fetchUrl = `${url}${url.includes('?') ? '&' : '?'}${params}`;
          options = {
            method: 'GET',
            mode: 'cors',
            redirect: 'follow'
          };
        } else {
          // Send plain text stringified JSON to avoid complex CORS preflights with GAS
          options = {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload),
            redirect: 'follow'
          };
        }

        const res = await fetch(fetchUrl, options);
        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        if (data.status === 'error') {
          throw new Error(data.message || 'Error reported by Apps Script backend.');
        }

        return data;
      } catch (err) {
        console.error('API call failure:', err);
        throw err;
      }
    }
  };

  /**
   * UI Notification Toast (Tailwind Styled)
   */
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');

    let typeClasses = 'bg-navy-800/95 border-gold-border text-gold-200';
    let icon = 'ℹ️';
    if (type === 'success') {
      typeClasses = 'bg-navy-800/95 border-emerald-500/50 text-emerald-200';
      icon = '✨';
    } else if (type === 'error') {
      typeClasses = 'bg-navy-800/95 border-rose-500/50 text-rose-200';
      icon = '⚠️';
    } else if (type === 'warning') {
      typeClasses = 'bg-navy-800/95 border-amber-500/50 text-amber-200';
      icon = '🔔';
    }

    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border backdrop-blur-md transition-all duration-300 ${typeClasses}`;
    toast.innerHTML = `
      <span class="text-base select-none">${icon}</span>
      <div class="flex-1 leading-snug">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Generate Unique Order Memo Number (Format: RH-YYMMDD-XXXX)
   */
  function generateMemoNumber() {
    const prefix = AppState.settings.memo_prefix || 'RH';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${yy}${mm}${dd}-${random}`;
  }

  /**
   * Currency Formatter
   */
  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return `৳ ${num.toLocaleString('en-IN')}`;
  }

  /**
   * Format Date String
   */
  function formatDate(isoOrDateStr) {
    if (!isoOrDateStr) return 'N/A';
    try {
      const d = new Date(isoOrDateStr);
      if (isNaN(d.getTime())) return String(isoOrDateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return String(isoOrDateStr);
    }
  }

  /**
   * Core Application Controller
   */
  window.App = {
    init() {
      Storage.load();
      Branding.apply();
      this.bindEvents();
      this.populateSettingsForm();

      if (!AppState.currentUser) {
        this.showLoginScreen();
      } else {
        this.hideLoginScreen();
        this.updateUserInterfaceForRole();
        this.renderAll();
        this.initMemoForm();
        this.checkBackendConnection();
      }
    },

    showLoginScreen() {
      const loginView = document.getElementById('loginScreenView');
      const appContainer = document.getElementById('appMainContainer');
      if (loginView) {
        loginView.style.display = 'flex';
        loginView.classList.remove('hidden');
      }
      if (appContainer) {
        appContainer.style.display = 'none';
        appContainer.classList.add('hidden');
        appContainer.classList.remove('flex');
      }
    },

    hideLoginScreen() {
      const loginView = document.getElementById('loginScreenView');
      const appContainer = document.getElementById('appMainContainer');
      if (loginView) {
        loginView.style.display = 'none';
        loginView.classList.add('hidden');
      }
      if (appContainer) {
        appContainer.style.display = 'flex';
        appContainer.classList.remove('hidden');
        appContainer.classList.add('flex');
      }
    },

    bindEvents() {
      // Global ESC key to close open modals & search dropdowns
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-overlay.open').forEach(modal => {
            modal.classList.remove('open');
          });
          const searchResults = document.getElementById('memoProductSearchResults');
          if (searchResults) searchResults.classList.add('hidden');
        }
      });

      // Click outside to close memo product search dropdown
      document.addEventListener('click', (e) => {
        const searchInput = document.getElementById('memoProductSearchInput');
        const searchResults = document.getElementById('memoProductSearchResults');
        if (searchResults && !searchResults.classList.contains('hidden')) {
          if (!searchInput?.contains(e.target) && !searchResults?.contains(e.target)) {
            searchResults.classList.add('hidden');
          }
        }
      });

      this.setupPhoneInputValidation();
    },

    /**
     * Bangladesh Mobile Number Validation & Formatting Helpers
     */
    validateBangladeshiPhone(phone) {
      const cleaned = String(phone || '').trim();
      if (!cleaned) {
        return { isValid: false, message: 'Please enter the customer phone number.' };
      }
      if (cleaned.length < 11) {
        return { isValid: false, message: `Phone number contains only ${cleaned.length} digits. A valid Bangladesh mobile number must contain exactly 11 digits.` };
      }
      if (cleaned.length > 11) {
        return { isValid: false, message: 'Phone number must not exceed 11 digits.' };
      }
      if (!cleaned.startsWith('01')) {
        return { isValid: false, message: 'Invalid mobile number. Bangladesh mobile numbers must start with 01 (e.g. 017XXXXXXXX).' };
      }
      if (!/^01[0-9]{9}$/.test(cleaned)) {
        return { isValid: false, message: 'Please enter a valid 11-digit Bangladesh mobile number starting with 01.' };
      }
      return { isValid: true, message: '' };
    },

    showPhoneError(message) {
      const phoneInput = document.getElementById('memoCustomerPhone');
      const errorEl = document.getElementById('memoCustomerPhoneError');
      const errorText = document.getElementById('memoCustomerPhoneErrorText');

      if (phoneInput) {
        phoneInput.setCustomValidity(message || 'Invalid phone number');
        phoneInput.classList.add('border-rose-500/80', 'focus:border-rose-500');
        phoneInput.classList.remove('focus:border-gold-500');
      }
      if (errorEl && errorText) {
        errorText.textContent = message;
        errorEl.classList.remove('hidden');
      }
    },

    clearPhoneError() {
      const phoneInput = document.getElementById('memoCustomerPhone');
      const errorEl = document.getElementById('memoCustomerPhoneError');
      const errorText = document.getElementById('memoCustomerPhoneErrorText');

      if (phoneInput) {
        phoneInput.setCustomValidity('');
        phoneInput.classList.remove('border-rose-500/80', 'focus:border-rose-500');
        phoneInput.classList.add('focus:border-gold-500');
      }
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
      if (errorText) {
        errorText.textContent = '';
      }
    },

    setupPhoneInputValidation() {
      const phoneInput = document.getElementById('memoCustomerPhone');
      if (!phoneInput || phoneInput._bdPhoneBound) return;
      phoneInput._bdPhoneBound = true;

      phoneInput.setAttribute('maxlength', '11');
      phoneInput.setAttribute('minlength', '11');
      phoneInput.setAttribute('pattern', '^01[0-9]{9}$');
      phoneInput.setAttribute('inputmode', 'numeric');

      const cleanPhone = (val) => {
        let cleaned = String(val || '').replace(/\D/g, '');
        if (cleaned.startsWith('8801') && cleaned.length >= 13) {
          cleaned = '0' + cleaned.slice(3);
        }
        return cleaned.slice(0, 11);
      };

      // Keydown: restrict to digits and max 11 digits, preserving shortcuts & nav keys
      phoneInput.addEventListener('keydown', (e) => {
        if (
          e.ctrlKey || e.metaKey || e.altKey ||
          [
            'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
            'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'
          ].includes(e.key)
        ) {
          return;
        }

        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          return;
        }

        const selStart = phoneInput.selectionStart;
        const selEnd = phoneInput.selectionEnd;
        if (selStart === selEnd && phoneInput.value.length >= 11) {
          e.preventDefault();
        }
      });

      // Paste: handle pasting into middle, replacing selection, sanitizing and limiting to 11 digits
      phoneInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const rawPaste = (e.clipboardData || window.clipboardData)?.getData('text') || '';
        if (!rawPaste) return;

        let cleanedPaste = rawPaste.replace(/\D/g, '');
        if (cleanedPaste.startsWith('8801') && cleanedPaste.length >= 13) {
          cleanedPaste = '0' + cleanedPaste.slice(3);
        }
        cleanedPaste = cleanedPaste.slice(0, 11);

        const currentVal = phoneInput.value || '';
        const start = phoneInput.selectionStart !== null ? phoneInput.selectionStart : currentVal.length;
        const end = phoneInput.selectionEnd !== null ? phoneInput.selectionEnd : currentVal.length;

        const before = currentVal.slice(0, start);
        const after = currentVal.slice(end);

        const combined = (before + cleanedPaste + after).slice(0, 11);
        phoneInput.value = combined;

        const newCursor = Math.min(start + cleanedPaste.length, combined.length);
        phoneInput.setSelectionRange(newCursor, newCursor);

        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // Input: sanitize non-digits, limit length, update validation state
      phoneInput.addEventListener('input', () => {
        const currentVal = phoneInput.value;
        const cleaned = cleanPhone(currentVal);

        if (currentVal !== cleaned) {
          const start = phoneInput.selectionStart;
          phoneInput.value = cleaned;
          if (start !== null) {
            const removedBefore = (currentVal.slice(0, start).match(/\D/g) || []).length;
            const newCursor = Math.max(0, Math.min(start - removedBefore, cleaned.length));
            phoneInput.setSelectionRange(newCursor, newCursor);
          }
        }

        const val = phoneInput.value;
        if (!val) {
          this.clearPhoneError();
          phoneInput.setCustomValidity('');
        } else if (val.length === 11) {
          if (/^01[0-9]{9}$/.test(val)) {
            this.clearPhoneError();
          } else {
            this.showPhoneError('Bangladesh mobile numbers must start with 01 (e.g. 017XXXXXXXX).');
          }
        } else if (val.length >= 2 && !val.startsWith('01')) {
          this.showPhoneError('Bangladesh mobile numbers must start with 01.');
        } else {
          this.clearPhoneError();
        }
      });

      // Blur: display validation status when focus leaves input
      phoneInput.addEventListener('blur', () => {
        const val = phoneInput.value.trim();
        if (!val) {
          this.clearPhoneError();
          return;
        }

        const res = this.validateBangladeshiPhone(val);
        if (!res.isValid) {
          this.showPhoneError(res.message);
        } else {
          this.clearPhoneError();
        }
      });
    },

    /**
     * Check Google Apps Script Backend Status
     */
    async checkBackendConnection() {
      const pill = document.getElementById('connectionStatusPill');
      const text = document.getElementById('connectionStatusText');
      if (!pill || !text) return;

      const baseClasses = 'connection-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-navy-700 border transition-all cursor-pointer';

      if (!AppState.settings.apiUrl || !AppState.settings.apiUrl.trim()) {
        pill.className = `${baseClasses} demo border-amber-500/40 text-amber-400`;
        text.textContent = 'Demo Mode (Sheets Not Set)';
        AppState.backendStatus = 'demo';
        return;
      }

      text.textContent = 'Connecting...';
      try {
        const res = await API.call({ action: 'ping' });
        if (res && res.status === 'success') {
          pill.className = `${baseClasses} connected border-emerald-500/40 text-emerald-400`;
          text.textContent = 'Google Sheets Connected';
          AppState.backendStatus = 'connected';
          this.syncFromCloud(true);
        }
      } catch (err) {
        pill.className = `${baseClasses} disconnected border-rose-500/40 text-rose-400`;
        text.textContent = 'Sheets Disconnected';
        AppState.backendStatus = 'error';
      }
    },

    /**
     * Test Connection Button in Settings
     */
    async testBackendConnection() {
      const input = document.getElementById('settingApiUrl');
      const testUrl = input ? input.value.trim() : '';

      if (!testUrl) {
        showToast('Please enter a Google Apps Script Web App URL first.', 'warning');
        return;
      }

      AppState.settings.apiUrl = testUrl;
      Storage.save();

      showToast('Testing connection with Apps Script...', 'info', 2000);

      try {
        const res = await API.call({ action: 'ping' });
        if (res && res.status === 'success') {
          showToast('Success! Google Sheets backend is connected.', 'success');
          this.checkBackendConnection();
          this.syncFromCloud();
        }
      } catch (err) {
        showToast(`Connection failed: ${err.message}`, 'error', 5000);
        this.checkBackendConnection();
      }
    },

    /**
     * Sync Full Database from Google Sheets
     */
    async syncFromCloud(silent = false) {
      if (!AppState.settings.apiUrl) {
        if (!silent) showToast('No Apps Script URL configured. Using local demo data.', 'warning');
        return;
      }

      if (!silent) showToast('Syncing data from Google Sheets...', 'info', 2000);

      try {
        const userRole = (AppState.currentUser && AppState.currentUser.role) ? AppState.currentUser.role : 'staff';
        const res = await API.call({ action: 'getInitialData', role: userRole });
        if (res && res.status === 'success' && res.data) {
          if (res.data.products && Array.isArray(res.data.products)) {
            AppState.products = res.data.products.map(p => ({
              id: p.ID || p.id,
              name: p.Name || p.name,
              category: p.Category || p.category,
              description: p.Description || p.description || '',
              imageUrl: p.ImageURL || p.imageUrl || '',
              purchasePrice: Number(p.PurchasePrice || p.purchasePrice) || 0,
              packagingCost: Number(p.PackagingCost || p.packagingCost) || 0,
              sellingPrice: Number(p.SellingPrice || p.sellingPrice) || 0,
              stock: Number(p.Stock || p.stock) || 0,
              createdAt: p.CreatedAt || p.createdAt || new Date().toISOString()
            }));
          }

          if (res.data.categories && Array.isArray(res.data.categories)) {
            AppState.categories = res.data.categories.map(c => ({
              id: c.ID || c.id,
              name: c.Name || c.name,
              description: c.Description || c.description || '',
              createdAt: c.CreatedAt || c.createdAt
            }));
          }

          if (res.data.memos && Array.isArray(res.data.memos)) {
            AppState.memos = res.data.memos.map(m => ({
              memoId: m.MemoID || m.memoId,
              date: m.Date || m.date,
              customerName: m.CustomerName || m.customerName,
              customerPhone: m.CustomerPhone || m.customerPhone,
              deliveryAddress: m.DeliveryAddress || m.deliveryAddress,
              deliveryZone: m.DeliveryZone || m.deliveryZone,
              deliveryCharge: Number(m.DeliveryCharge || m.deliveryCharge) || 0,
              discount: Number(m.Discount || m.discount) || 0,
              subtotal: Number(m.Subtotal || m.subtotal) || 0,
              grandTotal: Number(m.GrandTotal || m.grandTotal) || 0,
              orderCost: Number(m.OrderCost || m.orderCost) || 0,
              orderProfit: Number(m.OrderProfit || m.orderProfit) || 0,
              orderNotes: m.OrderNotes || m.orderNotes || '',
              status: m.Status || m.status || 'Pending',
              createdBy: m.CreatedBy || m.createdBy,
              items: Array.isArray(m.items) ? m.items.map(it => ({
                productId: it.ProductID || it.productId,
                productName: it.ProductName || it.productName,
                unitPrice: Number(it.UnitPrice || it.unitPrice) || 0,
                quantity: Number(it.Quantity || it.quantity) || 1,
                totalPrice: Number(it.TotalPrice || it.totalPrice) || 0,
                unitCost: Number(it.UnitCost || it.unitCost) || 0
              })) : []
            }));
          }

          if (res.data.settings && typeof res.data.settings === 'object') {
            AppState.settings = Object.assign({}, AppState.settings, res.data.settings);
          }

          if (res.data.teamMembers && Array.isArray(res.data.teamMembers)) {
            AppState.teamMembers = res.data.teamMembers;
          }

          Storage.save();
          this.renderAll();
          this.populateSettingsForm();
          if (!silent) showToast('Database synchronized successfully with Google Sheets!', 'success');
        }
      } catch (err) {
        if (!silent) showToast(`Sync failed: ${err.message}`, 'error', 4500);
      }
    },

    /**
     * Switch Navigation Tab
     */
    navigateTo(tabName) {
      AppState.activeTab = tabName;

      // Update Nav Buttons
      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });

      // Update Panes
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });

      const activePane = document.getElementById(`pane-${tabName}`);
      if (activePane) activePane.classList.add('active');

      if (tabName === 'dashboard') this.renderDashboard();
      if (tabName === 'products') this.renderProducts();
      if (tabName === 'createMemo') this.renderMemoCreationOptions();
      if (tabName === 'memos') this.renderMemos();
      if (tabName === 'categories') this.renderCategories();
      if (tabName === 'team') this.renderTeam();
      if (tabName === 'settings') this.populateSettingsForm();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Role-Based Access Control Adjustments
     */
    updateUserInterfaceForRole() {
      const user = AppState.currentUser;
      if (!user) return;
      const isAdmin = user.role === 'admin';

      const nameEl = document.getElementById('userNameDisplay');
      const roleEl = document.getElementById('userRoleDisplay');
      const avatarEl = document.getElementById('userAvatarChar');
      const authBtnText = document.getElementById('authBtnText');

      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) roleEl.textContent = isAdmin ? 'Administrator' : 'Sales Staff';
      if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
      if (authBtnText) authBtnText.textContent = 'Logout';

      const teamTab = document.getElementById('teamNavTab');
      if (teamTab) teamTab.style.display = isAdmin ? 'block' : 'none';

      const settingsTab = document.getElementById('settingsNavTab');
      if (settingsTab) settingsTab.style.display = isAdmin ? 'block' : 'none';

      const categoriesTab = document.getElementById('categoriesNavTab');
      if (categoriesTab) categoriesTab.style.display = isAdmin ? 'block' : 'none';

      const profitCard = document.getElementById('kpiProfitCard');
      if (profitCard) profitCard.style.display = isAdmin ? 'block' : 'none';

      const memoProfitPanel = document.getElementById('summaryProfitPanel');
      if (memoProfitPanel) memoProfitPanel.style.display = isAdmin ? 'flex' : 'none';

      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
      });

      if (!isAdmin && ['team', 'settings', 'categories'].includes(AppState.activeTab)) {
        this.navigateTo('dashboard');
      }
    },

    /**
     * Re-render all views
     */
    renderAll() {
      this.renderDashboard();
      this.renderProducts();
      this.renderCategories();
      this.renderMemos();
      this.renderTeam();
      this.renderMemoCreationOptions();
    },

    /**
     * Helper for status badge HTML (Tailwind Styled)
     */
    getStatusBadgeHtml(status) {
      const s = (status || 'Pending').toLowerCase();
      if (s === 'delivered') {
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">${status}</span>`;
      }
      if (s === 'shipped') {
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">${status}</span>`;
      }
      if (s === 'confirmed') {
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-dim text-gold-300 border border-gold-border">${status}</span>`;
      }
      if (s === 'cancelled') {
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">${status}</span>`;
      }
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">${status}</span>`;
    },

    /**
     * Render Dashboard
     */
    renderDashboard() {
      const totalProducts = AppState.products.length;
      const totalMemos = AppState.memos.length;
      const deliveredCount = AppState.memos.filter(m => m.status === 'Delivered').length;
      const totalSales = AppState.memos.reduce((sum, m) => sum + (Number(m.grandTotal) || 0), 0);
      const totalProfit = AppState.memos.reduce((sum, m) => sum + (Number(m.orderProfit) || 0), 0);
      const avgOrder = totalMemos > 0 ? Math.round(totalSales / totalMemos) : 0;
      const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0.0';

      const prodEl = document.getElementById('kpiTotalProducts');
      const catCountEl = document.getElementById('kpiCategoriesCount');
      const memosEl = document.getElementById('kpiTotalMemos');
      const delEl = document.getElementById('kpiDeliveredMemos');
      const salesEl = document.getElementById('kpiTotalSales');
      const avgEl = document.getElementById('kpiAvgOrderVal');
      const profitEl = document.getElementById('kpiTotalProfit');
      const marginEl = document.getElementById('kpiProfitMargin');

      if (prodEl) prodEl.textContent = totalProducts;
      if (catCountEl) catCountEl.textContent = `Across ${AppState.categories.length} categories`;
      if (memosEl) memosEl.textContent = totalMemos;
      if (delEl) delEl.textContent = `${deliveredCount} delivered`;
      if (salesEl) salesEl.textContent = formatMoney(totalSales);
      if (avgEl) avgEl.textContent = `Avg order: ${formatMoney(avgOrder)}`;
      if (profitEl) profitEl.textContent = formatMoney(totalProfit);
      if (marginEl) marginEl.textContent = `Margin: ${profitMargin}%`;

      // Render Recent 5 Memos
      const recentBody = document.getElementById('dashboardRecentMemosBody');
      if (!recentBody) return;

      const recentMemos = [...AppState.memos].slice(0, 5);
      if (recentMemos.length === 0) {
        recentBody.innerHTML = `<tr><td colspan="8" class="text-center text-slate-500 py-8">No orders recorded yet. Click "New Order Memo" to create one.</td></tr>`;
        return;
      }

      recentBody.innerHTML = recentMemos.map(m => `
        <tr class="hover:bg-navy-700/40 transition-colors">
          <td class="py-3 px-4 font-mono font-bold text-gold-300">${m.memoId}</td>
          <td class="py-3 px-4 text-slate-400 text-xs">${formatDate(m.date)}</td>
          <td class="py-3 px-4 font-medium text-slate-100">${this.escapeHtml(m.customerName)}</td>
          <td class="py-3 px-4 text-slate-400 text-xs">${this.escapeHtml(m.customerPhone || 'N/A')}</td>
          <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gold-dim text-gold-300 border border-gold-border/60">${m.deliveryZone}</span></td>
          <td class="py-3 px-4 font-bold text-gold-400">${formatMoney(m.grandTotal)}</td>
          <td class="py-3 px-4">${this.getStatusBadgeHtml(m.status)}</td>
          <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
            <button class="px-2.5 py-1 rounded-md text-xs font-semibold bg-navy-700 hover:bg-navy-600 text-slate-200 border border-navy-border transition-all cursor-pointer" onclick="App.viewMemoDetails('${m.memoId}')">View</button>
            <button class="btn-copy inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gold-dim hover:bg-gold-500 text-gold-200 hover:text-navy-950 border border-gold-border hover:border-gold-500 transition-all cursor-pointer" onclick="App.copyMemoById('${m.memoId}')" title="Copy customer memo text">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copy
            </button>
            <button class="px-2.5 py-1 rounded-md text-xs font-semibold bg-transparent hover:bg-gold-dim text-gold-500 hover:text-gold-200 border border-gold-border hover:border-gold-500 transition-all cursor-pointer" onclick="App.printMemoById('${m.memoId}')">Print</button>
          </td>
        </tr>
      `).join('');
    },

    /**
     * Render Products Grid
     */
    renderProducts() {
      const container = document.getElementById('productsGridContainer');
      const pillsContainer = document.getElementById('productCategoryPills');
      if (!container) return;

      const currentFilter = (AppState.currentCategoryFilter || 'all').trim();
      const currentFilterLower = currentFilter.toLowerCase();

      // Deduplicate and gather all unique categories from categories list and product catalog
      const catMap = new Map();
      AppState.categories.forEach(c => {
        if (c && c.name && c.name.trim()) {
          const trimmed = c.name.trim();
          const key = trimmed.toLowerCase();
          if (!catMap.has(key)) catMap.set(key, trimmed);
        }
      });
      AppState.products.forEach(p => {
        if (p && p.category && p.category.trim()) {
          const trimmed = p.category.trim();
          const key = trimmed.toLowerCase();
          const matchedCat = AppState.categories.find(c => 
            String(c.id || '').trim().toLowerCase() === key
          );
          if (matchedCat && matchedCat.name) {
            const mKey = matchedCat.name.trim().toLowerCase();
            if (!catMap.has(mKey)) catMap.set(mKey, matchedCat.name.trim());
          } else {
            if (!catMap.has(key)) catMap.set(key, trimmed);
          }
        }
      });

      const uniqueCats = ['all', ...Array.from(catMap.values())];

      if (pillsContainer) {
        pillsContainer.innerHTML = uniqueCats.map(cat => {
          const isAll = cat === 'all';
          const isSelected = isAll 
            ? (currentFilterLower === 'all')
            : this.isCategoryMatch(cat, currentFilter);

          // Calculate product count for this category
          const count = isAll 
            ? AppState.products.length 
            : AppState.products.filter(p => this.isCategoryMatch(p.category, cat)).length;

          const label = isAll ? 'All Products' : cat;

          return `
            <button type="button"
                    class="cat-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${isSelected ? 'bg-gold-500 text-navy-950 font-bold border-gold-300 shadow-gold-sm' : 'bg-navy-700 text-slate-400 border-navy-border hover:text-gold-200 hover:border-gold-border'}" 
                    data-category="${this.escapeHtml(cat)}">
              <span>${this.escapeHtml(label)}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-navy-950/20 text-navy-950 font-bold' : 'bg-navy-800 text-slate-400'}">${count}</span>
            </button>
          `;
        }).join('');

        // Safe event delegation: reads data-category attribute directly
        pillsContainer.onclick = (e) => {
          const btn = e.target.closest('.cat-pill');
          if (btn && btn.dataset.category !== undefined) {
            App.filterProductsByCategory(btn.dataset.category);
          }
        };
      }

      const query = (AppState.searchQueries.products || '').toLowerCase().trim();

      const filtered = AppState.products.filter(p => {
        const matchesCategory = this.isCategoryMatch(p.category, currentFilter);
        const prodCat = String(p.category || '').toLowerCase();

        const matchesSearch = !query || 
          String(p.name || '').toLowerCase().includes(query) || 
          prodCat.includes(query) || 
          String(p.description || '').toLowerCase().includes(query) || 
          String(p.id || '').toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        const isFiltered = currentFilterLower !== 'all';
        container.innerHTML = `
          <div class="col-span-full text-center py-12 px-4 bg-navy-800 border border-dashed border-navy-border rounded-xl">
            <p class="text-base font-semibold text-gold-100 mb-1">
              ${isFiltered ? `No products found in category "${this.escapeHtml(currentFilter)}"` : 'No products found matching your search'}
            </p>
            <p class="text-xs text-slate-400 mb-4">
              ${query ? 'Try clearing your search query or switch category.' : 'Add a new luxury product to this category.'}
            </p>
            <div class="flex items-center justify-center gap-3">
              ${isFiltered || query ? `
                <button type="button" class="inline-flex items-center gap-1.5 font-semibold px-3.5 py-2 rounded-lg text-xs bg-navy-700 hover:bg-navy-600 text-slate-200 border border-navy-border transition-all cursor-pointer" onclick="App.filterProductsByCategory('all')">
                  Show All Products
                </button>
              ` : ''}
              <button type="button" class="inline-flex items-center gap-1.5 font-semibold px-3.5 py-2 rounded-lg text-xs bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-600 hover:to-gold-500 text-navy-950 shadow-gold-sm transition-all cursor-pointer" onclick="App.openAddProductModal()">
                + Add New Product
              </button>
            </div>
          </div>
        `;
        return;
      }

      const isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';

      container.innerHTML = filtered.map(p => {
        const purchase = Number(p.purchasePrice) || 0;
        const packaging = Number(p.packagingCost) || 0;
        const selling = Number(p.sellingPrice) || 0;
        const totalCost = purchase + packaging;
        const unitProfit = selling - totalCost;
        const marginPct = selling > 0 ? ((unitProfit / selling) * 100).toFixed(1) : 0;

        let stockBadge = 'border-emerald-500/40 text-emerald-300';
        let stockLabel = `${p.stock} in stock`;
        if (p.stock <= 0) {
          stockBadge = 'border-rose-500/40 text-rose-300';
          stockLabel = 'Out of Stock';
        } else if (p.stock <= 5) {
          stockBadge = 'border-amber-500/40 text-amber-300';
          stockLabel = `${p.stock} remaining`;
        }

        return `
          <div class="product-card bg-navy-700 border border-gold-cardBorder hover:border-gold-500 rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-gold-glow shadow-card group" data-id="${p.id}">
            <div class="relative w-full pt-[75%] bg-navy-850 overflow-hidden">
              <button type="button" class="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-navy-900/85 hover:bg-gold-500 hover:text-navy-950 backdrop-blur-sm border border-gold-border text-gold-200 transition-colors cursor-pointer" data-category="${this.escapeHtml(p.category)}" onclick="App.filterProductsByCategory(this.dataset.category); event.stopPropagation();" title="Filter by ${this.escapeHtml(p.category)}">
                ${this.escapeHtml(p.category)}
              </button>
              <span class="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy-900/85 backdrop-blur-sm border ${stockBadge}">${stockLabel}</span>
              ${p.imageUrl ? `
                <img src="${this.escapeHtml(p.imageUrl)}" alt="${this.escapeHtml(p.name)}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="absolute inset-0 w-full h-full hidden flex-col items-center justify-center text-slate-500 bg-navy-800 text-xs font-serif tracking-widest text-gold-400">
                  ${this.escapeHtml(Branding.getName())}
                </div>
              ` : `
                <div class="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-slate-500 bg-navy-800 text-xs font-serif tracking-widest text-gold-400">
                  ${this.escapeHtml(Branding.getName())}
                </div>
              `}
            </div>

            <div class="p-4 flex flex-col flex-1 justify-between">
              <div>
                <h3 class="font-bold text-sm text-slate-100 line-clamp-2 min-h-[2.5rem] mb-2 leading-snug" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</h3>

                <!-- Product Description Box & Copy Button -->
                <div class="mb-3 bg-navy-800/70 border border-navy-border/70 hover:border-gold-border/60 rounded-lg p-2.5 transition-all">
                  <div class="flex items-center justify-between gap-1 mb-1.5">
                    <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                      <svg class="w-3 h-3 text-gold-400/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
                      </svg>
                      Description
                    </span>
                    <button 
                      type="button" 
                      class="btn-copy-desc inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gold-dim hover:bg-gold-500 text-gold-200 hover:text-navy-950 border border-gold-border hover:border-gold-500 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0" 
                      onclick="App.copyProductDescription('${p.id}', this)" 
                      title="Copy product description to clipboard"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                      <span>Copy</span>
                    </button>
                  </div>
                  <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed ${p.description ? '' : 'italic text-slate-500'}" title="${this.escapeHtml(p.description || 'No description provided')}">
                    ${this.escapeHtml(p.description || 'No description provided')}
                  </p>
                </div>

                <div class="bg-navy-800/80 border border-navy-border/60 rounded-lg p-2.5 mb-3 space-y-1 text-xs">
                  ${isAdmin ? `
                    <div class="flex justify-between text-slate-400">
                      <span>Purchase:</span>
                      <span class="font-semibold text-slate-200">${formatMoney(purchase)}</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                      <span>Packaging:</span>
                      <span class="font-semibold text-slate-200">${formatMoney(packaging)}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between items-center ${isAdmin ? 'pt-1.5 border-t border-dashed border-navy-border/60' : ''}">
                    <span class="font-semibold text-slate-300">Selling Price:</span>
                    <span class="font-bold text-sm text-gold-400">${formatMoney(selling)}</span>
                  </div>
                </div>

                ${isAdmin ? `
                  <div class="flex justify-between items-center px-2.5 py-1.5 mb-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs">
                    <span class="text-slate-400">Profit/Unit:</span>
                    <div class="flex items-center gap-1.5 font-bold text-emerald-400">
                      <span>${formatMoney(unitProfit)}</span>
                      <span class="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300">${marginPct}%</span>
                    </div>
                  </div>
                ` : ''}
              </div>

              <div class="flex items-center gap-2 pt-2 border-t border-navy-border/40">
                ${isAdmin ? `
                  <button class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-navy-600 hover:bg-navy-500 text-slate-200 border border-navy-border transition-all cursor-pointer" onclick="App.openEditProductModal('${p.id}')">
                    Edit
                  </button>
                ` : ''}
                <button class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-600 hover:to-gold-500 text-navy-950 shadow-gold-sm transition-all cursor-pointer text-center" onclick="App.quickAddProductToMemo('${p.id}')">
                  + Add to Memo
                </button>
                ${isAdmin ? `
                  <button class="p-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer" onclick="App.deleteProduct('${p.id}')" title="Delete product">
                    &times;
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    /**
     * Category Matching Helper (Case-insensitive, whitespace-trimmed, handles Name & ID)
     */
    isCategoryMatch(productCategory, filterCategory) {
      const fNorm = String(filterCategory || 'all').trim().toLowerCase();
      if (fNorm === 'all' || !fNorm) return true;

      const pNorm = String(productCategory || '').trim().toLowerCase();
      if (!pNorm) return false;
      if (pNorm === fNorm) return true;

      // Check against categories in AppState.categories
      const filterCatObj = AppState.categories.find(c => 
        String(c.name || '').trim().toLowerCase() === fNorm ||
        String(c.id || '').trim().toLowerCase() === fNorm
      );

      const prodCatObj = AppState.categories.find(c => 
        String(c.name || '').trim().toLowerCase() === pNorm ||
        String(c.id || '').trim().toLowerCase() === pNorm
      );

      if (filterCatObj) {
        const fName = String(filterCatObj.name || '').trim().toLowerCase();
        const fId = String(filterCatObj.id || '').trim().toLowerCase();
        if (pNorm === fName || pNorm === fId) return true;
      }

      if (prodCatObj) {
        const pName = String(prodCatObj.name || '').trim().toLowerCase();
        const pId = String(prodCatObj.id || '').trim().toLowerCase();
        if (fNorm === pName || fNorm === pId) return true;
      }

      if (filterCatObj && prodCatObj && filterCatObj.id === prodCatObj.id) {
        return true;
      }

      return false;
    },

    /**
     * Navigate to products view and activate category filter
     */
    viewCategoryProducts(categoryName) {
      this.navigateTo('products');
      this.filterProductsByCategory(categoryName);
    },

    filterProductsByCategory(cat) {
      AppState.currentCategoryFilter = (cat || 'all').trim();
      // Clear product text search input when switching category tabs so full category is displayed
      const input = document.getElementById('productSearchInput');
      if (input && input.value) {
        input.value = '';
        AppState.searchQueries.products = '';
      }
      this.renderProducts();
    },

    handleProductSearch() {
      const input = document.getElementById('productSearchInput');
      AppState.searchQueries.products = input ? input.value : '';
      this.renderProducts();
    },

    openAddProductModal() {
      document.getElementById('productModalTitle').textContent = 'Add New Product';
      document.getElementById('prodFormId').value = '';
      document.getElementById('prodFormName').value = '';
      const descInput = document.getElementById('prodFormDescription');
      if (descInput) descInput.value = '';
      document.getElementById('prodFormStock').value = '25';
      document.getElementById('prodFormImageUrl').value = '';
      document.getElementById('prodFormPurchasePrice').value = '';
      document.getElementById('prodFormPackagingCost').value = '';
      document.getElementById('prodFormSellingPrice').value = '';

      // Automatically preselect the active category filter if one is selected
      const defaultCat = (AppState.currentCategoryFilter && AppState.currentCategoryFilter !== 'all') 
        ? AppState.currentCategoryFilter 
        : undefined;
      this.populateCategorySelect('prodFormCategory', defaultCat);
      this.previewProductImage();
      this.recalculateProductModalProfit();

      document.getElementById('productModal').classList.add('open');
    },

    openEditProductModal(id) {
      const prod = AppState.products.find(p => p.id === id);
      if (!prod) return;

      document.getElementById('productModalTitle').textContent = 'Edit Product';
      document.getElementById('prodFormId').value = prod.id;
      document.getElementById('prodFormName').value = prod.name;
      const descInput = document.getElementById('prodFormDescription');
      if (descInput) descInput.value = prod.description || '';
      document.getElementById('prodFormStock').value = prod.stock;
      document.getElementById('prodFormImageUrl').value = prod.imageUrl || '';
      document.getElementById('prodFormPurchasePrice').value = prod.purchasePrice || 0;
      document.getElementById('prodFormPackagingCost').value = prod.packagingCost || 0;
      document.getElementById('prodFormSellingPrice').value = prod.sellingPrice || 0;

      this.populateCategorySelect('prodFormCategory', prod.category);
      this.previewProductImage();
      this.recalculateProductModalProfit();

      document.getElementById('productModal').classList.add('open');
    },

    closeProductModal() {
      document.getElementById('productModal').classList.remove('open');
    },

    populateCategorySelect(selectId, selectedVal) {
      const select = document.getElementById(selectId);
      if (!select) return;

      const normSelected = selectedVal ? String(selectedVal).trim().toLowerCase() : '';

      select.innerHTML = AppState.categories.map(c => {
        const isSelected = normSelected && (
          String(c.name || '').trim().toLowerCase() === normSelected ||
          String(c.id || '').trim().toLowerCase() === normSelected
        );
        return `
          <option value="${this.escapeHtml(c.name)}" ${isSelected ? 'selected' : ''}>
            ${this.escapeHtml(c.name)}
          </option>
        `;
      }).join('');

      // If selectedVal is specified but not yet in categories list, append it so selection is not lost
      if (selectedVal && !AppState.categories.some(c => 
        String(c.name || '').trim().toLowerCase() === normSelected || 
        String(c.id || '').trim().toLowerCase() === normSelected
      )) {
        select.innerHTML += `
          <option value="${this.escapeHtml(selectedVal)}" selected>
            ${this.escapeHtml(selectedVal)}
          </option>
        `;
      }
    },

    previewProductImage() {
      const urlInput = document.getElementById('prodFormImageUrl');
      const previewImg = document.getElementById('prodImagePreview');
      const placeholder = document.getElementById('prodImagePlaceholder');

      const url = urlInput ? urlInput.value.trim() : '';
      if (url && previewImg && placeholder) {
        previewImg.src = url;
        previewImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
        placeholder.classList.remove('flex');
        previewImg.onerror = () => {
          previewImg.classList.add('hidden');
          placeholder.classList.remove('hidden');
          placeholder.classList.add('flex');
        };
      } else if (previewImg && placeholder) {
        previewImg.src = '';
        previewImg.classList.add('hidden');
        placeholder.classList.remove('hidden');
        placeholder.classList.add('flex');
      }
    },

    recalculateProductModalProfit() {
      const purchase = Number(document.getElementById('prodFormPurchasePrice')?.value) || 0;
      const packaging = Number(document.getElementById('prodFormPackagingCost')?.value) || 0;
      const selling = Number(document.getElementById('prodFormSellingPrice')?.value) || 0;

      const totalCost = purchase + packaging;
      const profit = selling - totalCost;
      const margin = selling > 0 ? ((profit / selling) * 100).toFixed(1) : '0.0';

      const profitEl = document.getElementById('prodModalProfitDisplay');
      const marginEl = document.getElementById('prodModalMarginDisplay');

      if (profitEl) profitEl.textContent = formatMoney(profit);
      if (marginEl) marginEl.textContent = `${margin}%`;
    },

    async saveProduct() {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required.', 'error');
        return;
      }

      const id = document.getElementById('prodFormId').value;
      const name = document.getElementById('prodFormName').value.trim();
      const category = document.getElementById('prodFormCategory').value;
      const description = document.getElementById('prodFormDescription') ? document.getElementById('prodFormDescription').value.trim() : '';
      const stock = Number(document.getElementById('prodFormStock').value) || 0;
      const imageUrl = document.getElementById('prodFormImageUrl').value.trim();
      const purchasePrice = Number(document.getElementById('prodFormPurchasePrice').value) || 0;
      const packagingCost = Number(document.getElementById('prodFormPackagingCost').value) || 0;
      const sellingPrice = Number(document.getElementById('prodFormSellingPrice').value) || 0;

      if (!name) {
        showToast('Please enter the product name.', 'warning');
        return;
      }
      if (sellingPrice <= 0) {
        showToast('Please enter a valid selling price.', 'warning');
        return;
      }

      const productPayload = {
        id: id || ('PROD-' + Math.floor(100 + Math.random() * 900)),
        name,
        category,
        description,
        stock,
        imageUrl,
        purchasePrice,
        packagingCost,
        sellingPrice,
        createdAt: new Date().toISOString()
      };

      const isUpdate = Boolean(id);

      if (AppState.settings.apiUrl) {
        showToast(isUpdate ? 'Updating product in Google Sheets...' : 'Saving product to Google Sheets...', 'info');
        try {
          const action = isUpdate ? 'updateProduct' : 'addProduct';
          const res = await API.call({ action, product: productPayload });
          if (res && res.status === 'success') {
            showToast(res.message || 'Product saved successfully to Sheets!', 'success');
          }
        } catch (err) {
          showToast(`Backend save failed: ${err.message}. Changes not saved.`, 'error', 5000);
          return;
        }
      }

      if (isUpdate) {
        const index = AppState.products.findIndex(p => p.id === id);
        if (index !== -1) AppState.products[index] = productPayload;
      } else {
        AppState.products.unshift(productPayload);
      }

      Storage.save();
      this.closeProductModal();
      this.renderProducts();
      this.renderDashboard();
      this.renderMemoCreationOptions();
      showToast(`Product "${name}" successfully saved.`, 'success');
    },

    async deleteProduct(id) {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required.', 'error');
        return;
      }

      const prod = AppState.products.find(p => p.id === id);
      if (!prod) return;

      if (!confirm(`Are you sure you want to permanently delete "${prod.name}"?`)) {
        return;
      }

      if (AppState.settings.apiUrl) {
        showToast('Deleting product from Google Sheets...', 'info');
        try {
          const res = await API.call({ action: 'deleteProduct', id });
          if (res && res.status === 'success') {
            showToast('Product deleted from Google Sheets.', 'success');
          }
        } catch (err) {
          showToast(`Backend delete failed: ${err.message}`, 'error', 5000);
          return;
        }
      }

      AppState.products = AppState.products.filter(p => p.id !== id);
      Storage.save();
      this.renderProducts();
      this.renderDashboard();
      this.renderMemoCreationOptions();
      showToast(`Product removed.`, 'info');
    },

    /**
     * Categories Management
     */
    renderCategories() {
      const container = document.getElementById('categoriesGridContainer');
      if (!container) return;

      const isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';

      container.innerHTML = AppState.categories.map(c => {
        const productCount = AppState.products.filter(p => this.isCategoryMatch(p.category, c.name)).length;
        return `
          <div class="category-card bg-navy-700 border border-gold-cardBorder hover:border-gold-500 rounded-xl p-5 shadow-card hover:shadow-gold-glow transition-all duration-300 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-navy-border">
                <span class="font-serif font-bold text-gold-200 text-base">${this.escapeHtml(c.name)}</span>
                <button type="button" 
                        data-category="${this.escapeHtml(c.name)}" 
                        onclick="App.viewCategoryProducts(this.dataset.category)" 
                        class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-dim hover:bg-gold-500 text-gold-400 hover:text-navy-950 border border-gold-border hover:border-gold-500 transition-all cursor-pointer shadow-sm active:scale-95" 
                        title="View ${productCount} products in ${this.escapeHtml(c.name)}">
                  ${productCount} Products &rarr;
                </button>
              </div>
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs text-slate-400 leading-relaxed flex-1">${this.escapeHtml(c.description || 'No description provided')}</p>
                ${c.description ? `
                  <button type="button" class="btn-copy-desc inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gold-dim hover:bg-gold-500 text-gold-200 hover:text-navy-950 border border-gold-border hover:border-gold-500 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0" onclick="App.copyCategoryDescription('${c.id}', this)" title="Copy category description">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Copy
                  </button>
                ` : ''}
              </div>
            </div>
            ${isAdmin ? `
              <div class="flex justify-end pt-4 mt-4 border-t border-navy-border/40">
                <button class="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer" onclick="App.deleteCategory('${c.id}')">
                  Delete Category
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    },

    openCategoryModal() {
      document.getElementById('catFormName').value = '';
      document.getElementById('catFormDesc').value = '';
      document.getElementById('categoryModal').classList.add('open');
    },

    closeCategoryModal() {
      document.getElementById('categoryModal').classList.remove('open');
    },

    async saveCategory() {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required.', 'error');
        return;
      }

      const name = document.getElementById('catFormName').value.trim();
      const description = document.getElementById('catFormDesc').value.trim();

      if (!name) {
        showToast('Please enter category name.', 'warning');
        return;
      }

      const exists = AppState.categories.some(c => 
        String(c.name || '').trim().toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        showToast(`Category "${name}" already exists.`, 'warning');
        return;
      }

      const newCat = {
        id: 'CAT-' + (AppState.categories.length + 1),
        name,
        description,
        createdAt: new Date().toISOString()
      };

      if (AppState.settings.apiUrl) {
        showToast('Saving category to Google Sheets...', 'info');
        try {
          const res = await API.call({ action: 'addCategory', category: newCat });
          if (res && res.status === 'success') {
            showToast('Category saved to Google Sheets.', 'success');
          }
        } catch (err) {
          showToast(`Backend error: ${err.message}`, 'error', 5000);
          return;
        }
      }

      AppState.categories.push(newCat);
      Storage.save();
      this.closeCategoryModal();
      this.renderCategories();
      this.renderProducts();
      this.populateCategorySelect('prodFormCategory', name);
      showToast(`Category "${name}" added.`, 'success');
    },

    async deleteCategory(id) {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required.', 'error');
        return;
      }

      const cat = AppState.categories.find(c => c.id === id);
      if (!cat) return;

      const hasProducts = AppState.products.some(p => this.isCategoryMatch(p.category, cat.name));
      if (hasProducts) {
        alert(`Cannot delete category "${cat.name}" because it still contains active products. Reassign or delete products first.`);
        return;
      }

      if (!confirm(`Delete category "${cat.name}"?`)) return;

      if (AppState.settings.apiUrl) {
        showToast('Deleting category from Google Sheets...', 'info');
        try {
          await API.call({ action: 'deleteCategory', id });
        } catch (err) {
          showToast(`Failed to delete: ${err.message}`, 'error', 5000);
          return;
        }
      }

      AppState.categories = AppState.categories.filter(c => c.id !== id);
      if (this.isCategoryMatch(AppState.currentCategoryFilter, cat.name)) {
        AppState.currentCategoryFilter = 'all';
      }
      Storage.save();
      this.renderCategories();
      this.renderProducts();
      showToast(`Category removed.`, 'info');
    },

    /**
     * ORDER MEMO CREATION (POS Desk)
     */
    initMemoForm() {
      this.resetMemoForm();
    },

    resetMemoForm() {
      const newMemoId = generateMemoNumber();
      const memoIdDisplay = document.getElementById('generatedMemoIdDisplay');
      if (memoIdDisplay) memoIdDisplay.textContent = newMemoId;

      const nameInput = document.getElementById('memoCustomerName');
      const phoneInput = document.getElementById('memoCustomerPhone');
      const addrInput = document.getElementById('memoCustomerAddress');
      const notesInput = document.getElementById('memoOrderNotes');
      const discInput = document.getElementById('memoDiscountInput');

      if (nameInput) nameInput.value = '';
      if (phoneInput) {
        phoneInput.value = '';
        phoneInput.setCustomValidity('');
      }
      this.clearPhoneError();
      if (addrInput) addrInput.value = '';
      if (notesInput) notesInput.value = '';
      const notesBox = document.getElementById('summaryOrderNotesBox');
      if (notesBox) notesBox.classList.add('hidden');
      const notesDisplay = document.getElementById('summaryOrderNotesDisplay');
      if (notesDisplay) notesDisplay.textContent = '';
      if (discInput) discInput.value = '0';

      this.handleZoneChange('inside');

      AppState.memoLineItems = [];
      this.clearMemoProductSearch();

      this.renderMemoItemRows();
      this.recalculateMemoTotals();
    },

    renderMemoCreationOptions() {
      const insideRate = AppState.settings.delivery_inside_dhaka || '60';
      const outsideRate = AppState.settings.delivery_outside_dhaka || '130';

      const insidePriceLabel = document.getElementById('zoneInsideLabelPrice');
      const outsidePriceLabel = document.getElementById('zoneOutsideLabelPrice');

      if (insidePriceLabel) insidePriceLabel.textContent = `৳ ${insideRate}`;
      if (outsidePriceLabel) outsidePriceLabel.textContent = `৳ ${outsideRate}`;

      this.renderMemoItemRows();
      this.recalculateMemoTotals();
    },

    handleZoneChange(zone) {
      const insideCard = document.getElementById('zoneInsideDhakaCard');
      const outsideCard = document.getElementById('zoneOutsideDhakaCard');

      if (zone === 'inside') {
        if (insideCard) insideCard.classList.add('selected');
        if (outsideCard) outsideCard.classList.remove('selected');
      } else {
        if (insideCard) insideCard.classList.remove('selected');
        if (outsideCard) outsideCard.classList.add('selected');
      }

      this.recalculateMemoTotals();
    },

    addMemoItemRow() {
      const searchInput = document.getElementById('memoProductSearchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.handleMemoProductSearch(searchInput.value || '');
      }
    },

    handleMemoProductSearch(query) {
      const q = (query || '').toLowerCase().trim();
      const clearBtn = document.getElementById('memoProductSearchClearBtn');
      const resultsEl = document.getElementById('memoProductSearchResults');
      if (!resultsEl) return;

      if (clearBtn) {
        clearBtn.classList.toggle('hidden', !query);
      }

      if (AppState.products.length === 0) {
        resultsEl.innerHTML = `
          <div class="p-4 text-center text-xs text-slate-400">
            No products in catalog. Please add products first.
          </div>
        `;
        resultsEl.classList.remove('hidden');
        return;
      }

      const matches = AppState.products.filter(p => {
        if (!q) return true;
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const catMatch = (p.category || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const skuMatch = (p.sku || '').toLowerCase().includes(q);
        return nameMatch || catMatch || descMatch || skuMatch;
      });

      if (matches.length === 0) {
        resultsEl.innerHTML = `
          <div class="p-4 text-center text-xs text-slate-400">
            No products found matching &ldquo;<span class="text-gold-300 font-medium">${this.escapeHtml(query)}</span>&rdquo;.
          </div>
        `;
        resultsEl.classList.remove('hidden');
        return;
      }

      this.memoProductSearchSelectedIndex = 0;

      const headerHtml = `
        <div class="px-3 py-1.5 bg-navy-850 border-b border-navy-border/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Catalog Products (${matches.length})</span>
          <span class="text-[10px] text-gold-400/80">Press Enter or click to add</span>
        </div>
      `;

      const listHtml = matches.map((p, idx) => `
        <div class="memo-search-item p-2.5 sm:p-3 hover:bg-navy-700 cursor-pointer flex items-center justify-between gap-3 transition-colors ${idx === 0 ? 'bg-navy-700' : ''}"
             data-index="${idx}"
             data-id="${p.id}"
             onclick="App.addProductToMemoFromSearch('${p.id}')">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-xs sm:text-sm text-slate-100 truncate">${this.escapeHtml(p.name)}</span>
              ${p.category ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-navy-900 text-gold-300 border border-gold-border/30 whitespace-nowrap">${this.escapeHtml(p.category)}</span>` : ''}
            </div>
            <div class="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
              <span>Stock: <strong class="${(p.stock || 0) <= 5 ? 'text-amber-400' : 'text-slate-300'}">${p.stock || 0} units</strong></span>
              ${p.sku ? `<span>SKU: ${this.escapeHtml(p.sku)}</span>` : ''}
            </div>
          </div>
          <div class="text-right flex items-center gap-2.5">
            <span class="font-bold text-xs sm:text-sm text-gold-400 whitespace-nowrap">${formatMoney(p.sellingPrice)}</span>
            <button type="button" class="px-2.5 py-1 rounded-md text-xs font-semibold bg-gold-dim hover:bg-gold-500 text-gold-200 hover:text-navy-950 border border-gold-border hover:border-gold-500 transition-all cursor-pointer whitespace-nowrap">
              + Add
            </button>
          </div>
        </div>
      `).join('');

      resultsEl.innerHTML = headerHtml + listHtml;
      resultsEl.classList.remove('hidden');
    },

    handleMemoProductSearchKeydown(event) {
      const resultsEl = document.getElementById('memoProductSearchResults');
      if (!resultsEl || resultsEl.classList.contains('hidden')) {
        if (event.key === 'ArrowDown' || event.key === 'Enter') {
          this.handleMemoProductSearch(event.target.value || '');
        }
        return;
      }

      const items = resultsEl.querySelectorAll('.memo-search-item');
      if (items.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.memoProductSearchSelectedIndex = Math.min((this.memoProductSearchSelectedIndex ?? -1) + 1, items.length - 1);
        this.updateMemoSearchSelection(items);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.memoProductSearchSelectedIndex = Math.max((this.memoProductSearchSelectedIndex ?? 1) - 1, 0);
        this.updateMemoSearchSelection(items);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selectedIdx = this.memoProductSearchSelectedIndex ?? 0;
        const targetItem = items[selectedIdx] || items[0];
        if (targetItem && targetItem.dataset.id) {
          this.addProductToMemoFromSearch(targetItem.dataset.id);
        }
      } else if (event.key === 'Escape') {
        this.clearMemoProductSearch();
      }
    },

    updateMemoSearchSelection(items) {
      items.forEach((item, idx) => {
        const isSelected = idx === this.memoProductSearchSelectedIndex;
        if (isSelected) {
          item.classList.add('bg-navy-700');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('bg-navy-700');
        }
      });
    },

    addProductToMemoFromSearch(productId) {
      const prod = AppState.products.find(p => p.id === productId);
      if (!prod) return;

      const existing = AppState.memoLineItems.find(it => it.productId === productId);
      if (existing) {
        existing.quantity += 1;
        existing.totalPrice = existing.quantity * existing.unitPrice;
        showToast(`Increased quantity for "${prod.name}" to ${existing.quantity}`, 'info');
      } else {
        AppState.memoLineItems.push({
          productId: prod.id,
          productName: prod.name,
          unitPrice: prod.sellingPrice,
          quantity: 1,
          totalPrice: prod.sellingPrice,
          unitCost: (prod.purchasePrice || 0) + (prod.packagingCost || 0)
        });
        showToast(`Added "${prod.name}" to memo`, 'success');
      }

      this.clearMemoProductSearch();
      this.renderMemoItemRows();
      this.recalculateMemoTotals();
    },

    clearMemoProductSearch() {
      const input = document.getElementById('memoProductSearchInput');
      const clearBtn = document.getElementById('memoProductSearchClearBtn');
      const resultsEl = document.getElementById('memoProductSearchResults');
      if (input) input.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
      if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
      }
      this.memoProductSearchSelectedIndex = 0;
    },

    quickAddProductToMemo(productId) {
      const prod = AppState.products.find(p => p.id === productId);
      if (!prod) return;

      const existing = AppState.memoLineItems.find(it => it.productId === productId);
      if (existing) {
        existing.quantity += 1;
        existing.totalPrice = existing.quantity * existing.unitPrice;
      } else {
        AppState.memoLineItems.push({
          productId: prod.id,
          productName: prod.name,
          unitPrice: prod.sellingPrice,
          quantity: 1,
          totalPrice: prod.sellingPrice,
          unitCost: (prod.purchasePrice || 0) + (prod.packagingCost || 0)
        });
      }

      this.navigateTo('createMemo');
      this.renderMemoItemRows();
      this.recalculateMemoTotals();
      showToast(`Added "${prod.name}" to Order Memo.`, 'info');
    },

    renderMemoItemRows() {
      const body = document.getElementById('memoItemsTableBody');
      const countIndicator = document.getElementById('memoItemsCountIndicator');
      if (!body) return;

      const validItems = AppState.memoLineItems.filter(it => it.productId);
      const totalQty = validItems.reduce((acc, it) => acc + it.quantity, 0);

      if (countIndicator) {
        if (validItems.length === 0) {
          countIndicator.textContent = '0 Products (0 units)';
        } else {
          countIndicator.textContent = `${validItems.length} Product${validItems.length > 1 ? 's' : ''} (${totalQty} unit${totalQty > 1 ? 's' : ''})`;
        }
      }

      if (AppState.memoLineItems.length === 0) {
        body.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-8 px-4">
              <div class="flex flex-col items-center justify-center gap-2">
                <div class="w-10 h-10 rounded-full bg-navy-700/80 border border-gold-border/30 flex items-center justify-center text-gold-400 shadow-sm">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <p class="text-xs text-slate-200 font-semibold">No products added yet</p>
                <p class="text-[11px] text-slate-400">Search products in the search bar above to add to this memo</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      body.innerHTML = AppState.memoLineItems.map((item, idx) => {
        const prod = AppState.products.find(p => p.id === item.productId);
        return `
        <tr data-index="${idx}" class="hover:bg-navy-700/30 transition-colors">
          <td class="py-2.5 px-3">
            <div class="flex flex-col">
              <span class="font-semibold text-xs sm:text-sm text-slate-100">${this.escapeHtml(item.productName || 'Product')}</span>
              ${prod && (prod.category || prod.sku) ? `
                <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  ${prod.category ? `<span class="text-gold-400/90">${this.escapeHtml(prod.category)}</span>` : ''}
                  ${prod.sku ? `<span>SKU: ${this.escapeHtml(prod.sku)}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </td>
          <td class="py-2.5 px-3">
            <input type="number" 
                   class="w-full bg-navy-800 border border-navy-border focus:border-gold-500 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none" 
                   value="${item.unitPrice}" 
                   placeholder="0"
                   min="0" 
                   oninput="App.handleItemPriceChange(${idx}, this.value)">
          </td>
          <td class="py-2.5 px-3">
            <div class="flex items-center justify-center gap-1">
              <button type="button" class="w-6 h-6 rounded bg-navy-700 hover:bg-navy-600 text-slate-200 border border-navy-border flex items-center justify-center text-xs font-bold cursor-pointer" onclick="App.adjustItemQty(${idx}, -1)">&minus;</button>
              <input type="number" class="w-10 bg-navy-800 border border-navy-border rounded px-1 py-0.5 text-center text-xs text-slate-100 font-bold" value="${item.quantity}" min="1" onchange="App.setItemQty(${idx}, this.value)">
              <button type="button" class="w-6 h-6 rounded bg-navy-700 hover:bg-navy-600 text-slate-200 border border-navy-border flex items-center justify-center text-xs font-bold cursor-pointer" onclick="App.adjustItemQty(${idx}, 1)">&plus;</button>
            </div>
          </td>
          <td class="py-2.5 px-3 text-right font-bold text-gold-300">
            ${formatMoney(item.totalPrice)}
          </td>
          <td class="py-2.5 px-2 text-center">
            <button type="button" class="text-rose-400 hover:text-rose-200 text-base font-bold cursor-pointer transition-colors" onclick="App.removeMemoItemRow(${idx})" title="Remove item">
              &times;
            </button>
          </td>
        </tr>
      `;
      }).join('');
    },

    handleItemProductChange(index, newProductId) {
      if (!AppState.memoLineItems[index]) return;

      if (!newProductId) {
        const item = AppState.memoLineItems[index];
        item.productId = '';
        item.productName = '';
        item.unitPrice = 0;
        item.totalPrice = 0;
        item.unitCost = 0;
        this.renderMemoItemRows();
        this.recalculateMemoTotals();
        return;
      }

      const prod = AppState.products.find(p => p.id === newProductId);
      if (!prod) return;

      const item = AppState.memoLineItems[index];
      item.productId = prod.id;
      item.productName = prod.name;
      item.unitPrice = prod.sellingPrice;
      item.totalPrice = item.quantity * prod.sellingPrice;
      item.unitCost = (prod.purchasePrice || 0) + (prod.packagingCost || 0);

      this.renderMemoItemRows();
      this.recalculateMemoTotals();
    },

    handleItemPriceChange(index, newPrice) {
      if (!AppState.memoLineItems[index]) return;
      const price = Math.max(0, Number(newPrice) || 0);
      const item = AppState.memoLineItems[index];
      item.unitPrice = price;
      item.totalPrice = item.quantity * price;

      this.renderMemoItemRows();
      this.recalculateMemoTotals();
    },

    adjustItemQty(index, delta) {
      if (!AppState.memoLineItems[index]) return;
      const item = AppState.memoLineItems[index];
      const newQty = Math.max(1, item.quantity + delta);
      item.quantity = newQty;
      item.totalPrice = newQty * item.unitPrice;

      this.renderMemoItemRows();
      this.recalculateMemoTotals();
    },

    setItemQty(index, val) {
      if (!AppState.memoLineItems[index]) return;
      const item = AppState.memoLineItems[index];
      const qty = Math.max(1, parseInt(val, 10) || 1);
      item.quantity = qty;
      item.totalPrice = qty * item.unitPrice;

      this.renderMemoItemRows();
      this.recalculateMemoTotals();
    },

    removeMemoItemRow(index) {
      AppState.memoLineItems.splice(index, 1);
      this.renderMemoItemRows();
      this.recalculateMemoTotals();
    },

    recalculateMemoTotals() {
      let subtotal = 0;
      let totalCost = 0;

      const validItems = AppState.memoLineItems.filter(it => it.productId);

      validItems.forEach(it => {
        subtotal += (Number(it.totalPrice) || 0);
        totalCost += ((Number(it.unitCost) || 0) * (Number(it.quantity) || 1));
      });

      const isInsideDhaka = document.querySelector('input[name="deliveryZone"]:checked')?.value === 'inside';
      let deliveryCharge = isInsideDhaka 
        ? Number(AppState.settings.delivery_inside_dhaka || 60)
        : Number(AppState.settings.delivery_outside_dhaka || 130);

      const discountInput = document.getElementById('memoDiscountInput');
      const discount = Math.max(0, Number(discountInput ? discountInput.value : 0) || 0);
      const grandTotal = validItems.length > 0 
        ? Math.max(0, (subtotal + deliveryCharge) - discount) 
        : 0;
      const netProfit = validItems.length > 0 
        ? (subtotal - discount) - totalCost 
        : 0;

      const subtotalDisplay = document.getElementById('summarySubtotalDisplay');
      const deliveryDisplay = document.getElementById('summaryDeliveryDisplay');
      const grandTotalDisplay = document.getElementById('summaryGrandTotalDisplay');
      const totalCostDisplay = document.getElementById('summaryTotalCostDisplay');
      const netProfitDisplay = document.getElementById('summaryNetProfitDisplay');

      if (subtotalDisplay) subtotalDisplay.textContent = formatMoney(subtotal);
      if (deliveryDisplay) deliveryDisplay.textContent = formatMoney(validItems.length > 0 ? deliveryCharge : 0);
      if (grandTotalDisplay) grandTotalDisplay.textContent = formatMoney(grandTotal);
      if (totalCostDisplay) totalCostDisplay.textContent = formatMoney(totalCost);
      if (netProfitDisplay) netProfitDisplay.textContent = formatMoney(netProfit);
    },

    async submitMemo(shouldPrint = false) {
      const memoId = document.getElementById('generatedMemoIdDisplay').textContent.trim();
      const customerName = document.getElementById('memoCustomerName').value.trim();
      const customerPhone = document.getElementById('memoCustomerPhone').value.trim();
      const deliveryAddress = document.getElementById('memoCustomerAddress').value.trim();
      const isInsideDhaka = document.querySelector('input[name="deliveryZone"]:checked')?.value === 'inside';
      const deliveryZone = isInsideDhaka ? 'Inside Dhaka' : 'Outside Dhaka';

      if (!customerName) {
        showToast('Please enter the customer name.', 'warning');
        document.getElementById('memoCustomerName').focus();
        return;
      }

      if (!customerPhone) {
        this.showPhoneError('Please enter the customer phone number.');
        showToast('Please enter the customer phone number.', 'warning');
        document.getElementById('memoCustomerPhone').focus();
        return;
      }

      const phoneValidation = this.validateBangladeshiPhone(customerPhone);
      if (!phoneValidation.isValid) {
        this.showPhoneError(phoneValidation.message);
        showToast(phoneValidation.message, 'warning');
        const phoneInput = document.getElementById('memoCustomerPhone');
        if (phoneInput) {
          phoneInput.focus();
          phoneInput.setCustomValidity(phoneValidation.message);
          phoneInput.reportValidity?.();
        }
        return;
      }
      this.clearPhoneError();

      if (!deliveryAddress) {
        showToast('Please enter the delivery address.', 'warning');
        document.getElementById('memoCustomerAddress').focus();
        return;
      }

      const validItems = AppState.memoLineItems.filter(it => it.productId);
      if (validItems.length === 0) {
        showToast('Please select at least one product for this order memo.', 'warning');
        return;
      }

      let subtotal = 0;
      let totalCost = 0;
      validItems.forEach(it => {
        subtotal += Number(it.totalPrice) || 0;
        totalCost += (Number(it.unitCost) || 0) * (Number(it.quantity) || 1);
      });

      const deliveryCharge = isInsideDhaka 
        ? Number(AppState.settings.delivery_inside_dhaka || 60)
        : Number(AppState.settings.delivery_outside_dhaka || 130);

      const discount = Math.max(0, Number(document.getElementById('memoDiscountInput').value) || 0);
      const grandTotal = Math.max(0, (subtotal + deliveryCharge) - discount);
      const orderProfit = (subtotal - discount) - totalCost;

      const memoObject = {
        memoId,
        date: new Date().toISOString(),
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryZone,
        deliveryCharge,
        discount,
        subtotal,
        grandTotal,
        orderCost: totalCost,
        orderProfit,
        orderNotes: document.getElementById('memoOrderNotes')?.value.trim() || '',
        status: 'Pending',
        createdBy: AppState.currentUser ? AppState.currentUser.name : 'Sales Staff',
        items: JSON.parse(JSON.stringify(validItems))
      };

      if (AppState.settings.apiUrl) {
        showToast('Persisting memo into Google Sheets...', 'info');
        try {
          const res = await API.call({
            action: 'createMemo',
            memo: memoObject,
            items: memoObject.items
          });
          if (res && res.status === 'success') {
            showToast('Order memo permanently recorded in Google Sheets!', 'success');
          }
        } catch (err) {
          showToast(`Backend error: ${err.message}. Memo could not be saved to Google Sheets.`, 'error', 6000);
          return;
        }
      }

      memoObject.items.forEach(it => {
        const prod = AppState.products.find(p => p.id === it.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - it.quantity);
        }
      });

      AppState.memos.unshift(memoObject);
      Storage.save();

      showToast(`Order Memo ${memoId} created successfully!`, 'success');

      if (shouldPrint) {
        this.printMemoObject(memoObject);
      }

      this.resetMemoForm();
      this.renderDashboard();
      this.renderProducts();
      this.renderMemos();
    },

    getStatusSelectHtml(memoId, status) {
      const s = (status || 'Pending').toLowerCase();
      let colorClass = 'text-amber-400 border-amber-500/40';
      if (s === 'confirmed') colorClass = 'text-gold-300 border-gold-border';
      else if (s === 'shipped') colorClass = 'text-sky-300 border-sky-500/30';
      else if (s === 'delivered') colorClass = 'text-emerald-400 border-emerald-500/40';
      else if (s === 'cancelled') colorClass = 'text-rose-400 border-rose-500/40';

      return `
        <select class="bg-navy-700 ${colorClass} border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all cursor-pointer"
                style="background-color: #152037; color-scheme: dark;"
                onchange="App.updateMemoStatus('${memoId}', this.value)">
          <option class="bg-navy-900 text-amber-400" style="background-color: #0B1120; color: #FBBF24;" value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option class="bg-navy-900 text-gold-300" style="background-color: #0B1120; color: #EED482;" value="Confirmed" ${status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option class="bg-navy-900 text-sky-300" style="background-color: #0B1120; color: #7DD3FC;" value="Shipped" ${status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option class="bg-navy-900 text-emerald-400" style="background-color: #0B1120; color: #34D399;" value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option class="bg-navy-900 text-rose-400" style="background-color: #0B1120; color: #FB7185;" value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      `;
    },

    /**
     * Memos History View
     */
    renderMemos() {
      const body = document.getElementById('memosTableBody');
      if (!body) return;

      const query = (AppState.searchQueries.memos || '').toLowerCase().trim();
      const statusFilter = document.getElementById('memoStatusFilter')?.value || 'all';

      const filtered = AppState.memos.filter(m => {
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        const matchesQuery = !query ||
          m.memoId.toLowerCase().includes(query) ||
          m.customerName.toLowerCase().includes(query) ||
          (m.customerPhone && m.customerPhone.toLowerCase().includes(query));
        return matchesStatus && matchesQuery;
      });

      if (filtered.length === 0) {
        body.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-slate-500 py-8">
              No memos found matching your criteria.
            </td>
          </tr>
        `;
        return;
      }

      body.innerHTML = filtered.map(m => `
        <tr class="hover:bg-navy-700/40 transition-colors">
          <td class="py-3 px-4 font-mono font-bold text-gold-300">${m.memoId}</td>
          <td class="py-3 px-4 text-slate-400 text-xs">${formatDate(m.date)}</td>
          <td class="py-3 px-4 font-medium text-slate-100">${this.escapeHtml(m.customerName)}</td>
          <td class="py-3 px-4 text-slate-400 text-xs">${this.escapeHtml(m.customerPhone || 'N/A')}</td>
          <td class="py-3 px-4 text-slate-300 text-xs max-w-[200px] truncate" title="${this.escapeHtml(m.deliveryAddress)}">
            ${this.escapeHtml(m.deliveryAddress)}
          </td>
          <td class="py-3 px-4 font-bold text-gold-400">${formatMoney(m.grandTotal)}</td>
          <td class="py-3 px-4">
            ${this.getStatusSelectHtml(m.memoId, m.status)}
          </td>
          <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
            <button class="px-2.5 py-1 rounded-md text-xs font-semibold bg-navy-700 hover:bg-navy-600 text-slate-200 border border-navy-border transition-all cursor-pointer" onclick="App.viewMemoDetails('${m.memoId}')">Details</button>
            <button class="btn-copy inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gold-dim hover:bg-gold-500 text-gold-200 hover:text-navy-950 border border-gold-border hover:border-gold-500 transition-all cursor-pointer" onclick="App.copyMemoById('${m.memoId}')" title="Copy customer memo text">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copy
            </button>
            <button class="px-2.5 py-1 rounded-md text-xs font-semibold bg-transparent hover:bg-gold-dim text-gold-500 hover:text-gold-200 border border-gold-border hover:border-gold-500 transition-all cursor-pointer" onclick="App.printMemoById('${m.memoId}')">Print</button>
          </td>
        </tr>
      `).join('');
    },

    handleMemoSearch() {
      const input = document.getElementById('memoSearchInput');
      AppState.searchQueries.memos = input ? input.value : '';
      this.renderMemos();
    },

    async updateMemoStatus(memoId, newStatus) {
      const memo = AppState.memos.find(m => m.memoId === memoId);
      if (!memo) return;

      memo.status = newStatus;

      if (AppState.settings.apiUrl) {
        try {
          await API.call({
            action: 'updateMemoStatus',
            memoId,
            newStatus
          });
          showToast(`Memo status updated to ${newStatus}`, 'success');
        } catch (err) {
          showToast(`Failed to update status on Sheets: ${err.message}`, 'error');
        }
      }

      Storage.save();
      this.renderDashboard();
      this.renderMemos();
    },

    /**
     * Memo Details Modal
     */
    viewMemoDetails(memoId) {
      const memo = AppState.memos.find(m => m.memoId === memoId);
      if (!memo) return;

      AppState.activeMemoDetails = memo;
      const content = document.getElementById('memoDetailsModalContent');
      const title = document.getElementById('memoDetailsModalTitle');
      if (!content) return;

      title.textContent = `Order Memo: ${memo.memoId}`;

      const isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';

      content.innerHTML = `
        <div class="flex items-center justify-between pb-3.5 mb-4 border-b border-navy-border/80">
          <div class="flex items-center gap-3">
            <img src="${this.escapeHtml(Branding.getLogo())}" alt="${this.escapeHtml(Branding.getName())}" class="w-11 h-11 object-contain rounded-xl border border-gold-border/40 bg-navy-800 p-1" onerror="this.style.display='none'">
            <div>
              <h3 class="font-serif text-base sm:text-lg font-bold text-gold-100 tracking-wide leading-none">${this.escapeHtml(Branding.getName())}</h3>
              <span class="text-[10px] text-slate-400 uppercase tracking-widest mt-1 block">Official Customer Order Memo</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs sm:text-sm font-bold text-gold-400 font-mono block">${memo.memoId}</span>
            <span class="text-[11px] text-slate-400">${formatDate(memo.date)}</span>
          </div>
        </div>

        <div class="bg-navy-700 border border-navy-border rounded-xl p-4 mb-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <span class="text-slate-400 block mb-0.5">Customer Name</span>
              <strong class="text-slate-100 font-semibold text-base">${this.escapeHtml(memo.customerName)}</strong>
            </div>
            <div>
              <span class="text-slate-400 block mb-0.5">Phone Number</span>
              <strong class="text-gold-300 font-semibold">${this.escapeHtml(memo.customerPhone || 'N/A')}</strong>
            </div>
            <div class="sm:col-span-2">
              <span class="text-slate-400 block mb-0.5">Delivery Address</span>
              <span class="text-slate-200 leading-relaxed">${this.escapeHtml(memo.deliveryAddress)}</span>
            </div>
            <div>
              <span class="text-slate-400 block mb-0.5">Delivery Zone</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-dim text-gold-300 border border-gold-border inline-block">${memo.deliveryZone}</span>
            </div>
            <div>
              <span class="text-slate-400 block mb-0.5">Order Date</span>
              <span class="text-slate-200">${formatDate(memo.date)}</span>
            </div>
          </div>
        </div>

        <h4 class="font-serif text-sm font-bold text-gold-100 mb-2">Order Line Items</h4>
        <div class="bg-navy-700 border border-navy-border rounded-xl overflow-hidden mb-4">
          <table class="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr class="bg-navy-850 text-gold-200 text-xs font-semibold uppercase">
                <th class="py-2.5 px-3">Product Description</th>
                <th class="py-2.5 px-3">Unit Price</th>
                <th class="py-2.5 px-3 text-center">Qty</th>
                <th class="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-navy-border/40 text-slate-300">
              ${(memo.items || []).map(it => `
                <tr>
                  <td class="py-2.5 px-3 font-medium text-slate-100">${this.escapeHtml(it.productName)}</td>
                  <td class="py-2.5 px-3">${formatMoney(it.unitPrice)}</td>
                  <td class="py-2.5 px-3 text-center">${it.quantity}</td>
                  <td class="py-2.5 px-3 text-right font-bold text-gold-300">${formatMoney(it.totalPrice)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="bg-navy-700 border border-navy-border rounded-xl p-4 text-xs sm:text-sm space-y-2">
          <div class="flex justify-between text-slate-300">
            <span>Subtotal:</span>
            <span class="font-bold text-slate-100">${formatMoney(memo.subtotal)}</span>
          </div>
          <div class="flex justify-between text-slate-300">
            <span>Delivery Fee:</span>
            <span class="font-bold text-slate-100">${formatMoney(memo.deliveryCharge)}</span>
          </div>
          ${memo.discount > 0 ? `
            <div class="flex justify-between text-rose-400">
              <span>Discount / Advance:</span>
              <span class="font-bold">&minus; ${formatMoney(memo.discount)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between items-center pt-2.5 border-t border-dashed border-gold-border/60">
            <span class="font-bold text-base text-gold-100">Grand Total Payable:</span>
            <span class="font-bold text-xl text-gold-400">${formatMoney(memo.grandTotal)}</span>
          </div>

          ${isAdmin ? `
            <div class="flex justify-between items-center pt-2 border-t border-emerald-500/20 text-xs text-emerald-400">
              <span>Total Cost: ${formatMoney(memo.orderCost || 0)}</span>
              <strong>Estimated Net Profit: ${formatMoney(memo.orderProfit || 0)}</strong>
            </div>
          ` : ''}
        </div>
      `;

      document.getElementById('memoDetailsModal').classList.add('open');
    },

    closeMemoDetailsModal() {
      document.getElementById('memoDetailsModal').classList.remove('open');
    },

    printActiveMemo() {
      if (AppState.activeMemoDetails) {
        this.printMemoObject(AppState.activeMemoDetails);
      }
    },

    printMemoById(memoId) {
      const memo = AppState.memos.find(m => m.memoId === memoId);
      if (memo) this.printMemoObject(memo);
    },

    /**
     * Official Invoice Printing Engine
     */
    printMemoObject(memo) {
      const printArea = document.getElementById('printInvoiceArea');
      if (!printArea) return;

      const shopName = Branding.getName();
      const shopLogo = Branding.getLogo();
      const shopPhone = AppState.settings.shop_phone || '+880 1711-000000';
      const shopAddress = AppState.settings.shop_address || 'Dhaka, Bangladesh';
      const footerNote = AppState.settings.invoice_footer_note || `Thank you for shopping with ${shopName}!`;

      printArea.innerHTML = `
        <div class="inv-header flex justify-between items-start border-b-2 border-gold-500 pb-3 mb-5">
          <div class="inv-brand flex items-center gap-4">
            <img src="${this.escapeHtml(shopLogo)}" alt="${this.escapeHtml(shopName)}" class="w-16 h-16 object-contain rounded-lg border border-slate-200 p-0.5" onerror="this.style.display='none'" />
            <div>
              <h1 class="font-serif text-2xl font-bold text-navy-800 m-0 tracking-wider">${this.escapeHtml(shopName)}</h1>
              <p class="text-xs text-slate-500 uppercase tracking-widest mt-1">Official Customer Order Memo</p>
              <div class="text-xs text-slate-600 mt-1">
                ${this.escapeHtml(shopAddress)}<br>
                Hotline / WhatsApp: ${this.escapeHtml(shopPhone)}
              </div>
            </div>
          </div>
          <div class="inv-meta text-right text-xs text-slate-700">
            <div class="text-base font-bold text-navy-900 mb-1">MEMO: ${memo.memoId}</div>
            <div><strong>Date:</strong> ${formatDate(memo.date)}</div>
            <div><strong>Created By:</strong> ${this.escapeHtml(memo.createdBy || 'Staff')}</div>
            <div class="mt-1"><strong>Zone:</strong> ${memo.deliveryZone}</div>
          </div>
        </div>

        <div class="inv-customer-box bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Billed To</div>
            <strong class="text-sm text-navy-900 font-bold block">${this.escapeHtml(memo.customerName)}</strong>
            <div class="mt-0.5">Phone: <strong>${this.escapeHtml(memo.customerPhone || 'N/A')}</strong></div>
          </div>
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Delivery Destination</div>
            <div class="text-slate-800 leading-relaxed">${this.escapeHtml(memo.deliveryAddress)}</div>
          </div>
        </div>

        <table class="inv-table w-full border-collapse mb-5 text-xs">
          <thead>
            <tr class="bg-navy-900 text-white">
              <th class="p-2 text-left w-[8%] font-semibold uppercase text-[10px]">#</th>
              <th class="p-2 text-left w-[52%] font-semibold uppercase text-[10px]">Description</th>
              <th class="p-2 text-right w-[15%] font-semibold uppercase text-[10px]">Unit Price</th>
              <th class="p-2 text-center w-[10%] font-semibold uppercase text-[10px]">Qty</th>
              <th class="p-2 text-right w-[15%] font-semibold uppercase text-[10px]">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 text-slate-800">
            ${(memo.items || []).map((it, idx) => `
              <tr>
                <td class="p-2">${idx + 1}</td>
                <td class="p-2 font-medium">${this.escapeHtml(it.productName)}</td>
                <td class="p-2 text-right">৳ ${Number(it.unitPrice).toLocaleString('en-IN')}</td>
                <td class="p-2 text-center">${it.quantity}</td>
                <td class="p-2 text-right font-bold">৳ ${Number(it.totalPrice).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="inv-totals-wrap flex justify-end mb-6">
          <div class="inv-totals-box w-72 text-xs space-y-1">
            <div class="inv-totals-row flex justify-between text-slate-600">
              <span>Items Subtotal:</span>
              <span class="font-semibold text-slate-800">৳ ${Number(memo.subtotal).toLocaleString('en-IN')}</span>
            </div>
            <div class="inv-totals-row flex justify-between text-slate-600">
              <span>Delivery Charge:</span>
              <span class="font-semibold text-slate-800">৳ ${Number(memo.deliveryCharge).toLocaleString('en-IN')}</span>
            </div>
            ${memo.discount > 0 ? `
              <div class="inv-totals-row flex justify-between text-rose-600 font-medium">
                <span>Discount / Advance:</span>
                <span>- ৳ ${Number(memo.discount).toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div class="inv-totals-row grand flex justify-between border-t-2 border-navy-900 pt-2 font-bold text-sm text-navy-900">
              <span>Grand Total:</span>
              <span>৳ ${Number(memo.grandTotal).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div class="inv-footer border-t border-dashed border-slate-300 pt-4 flex justify-between items-end text-xs text-slate-500">
          <div class="max-w-[65%]">
            <strong class="text-navy-900">Note:</strong><br>
            <span>${this.escapeHtml(footerNote)}</span>
          </div>
          <div class="inv-sign-line text-center border-t border-slate-400 w-44 pt-1 font-semibold text-slate-700">
            Authorized Signature
          </div>
        </div>
      `;

      // Pre-load check: ensure logo finishes loading before triggering window.print()
      const triggerPrint = () => {
        window.print();
      };

      const logoImg = printArea.querySelector('.inv-brand img');
      if (logoImg && !logoImg.complete) {
        logoImg.onload = triggerPrint;
        logoImg.onerror = triggerPrint;
        setTimeout(triggerPrint, 400); // Failsafe timeout
      } else {
        triggerPrint();
      }
    },

    /**
     * Format Memo for Clipboard (Strict Customer-Facing Layout)
     */
    formatMemoForClipboard(memo) {
      const shopName = Branding.getName();
      const lines = [];
      lines.push(shopName);
      lines.push('Customer Order Memo');
      lines.push('');
      lines.push(`Memo No: ${memo.memoId}`);
      lines.push(`Date: ${formatDate(memo.date)}`);
      lines.push('');
      lines.push(`Customer Name: ${memo.customerName || 'Customer'}`);
      lines.push(`Phone: ${memo.customerPhone || 'N/A'}`);
      lines.push(`Address: ${memo.deliveryAddress || 'N/A'}`);
      lines.push('');
      lines.push('Products:');

      const items = memo.items || [];
      if (items.length > 0) {
        items.forEach((it, idx) => {
          const unitP = Number(it.unitPrice) || 0;
          const qty = Number(it.quantity) || 1;
          const lineTotal = Number(it.totalPrice) || (unitP * qty);
          if (qty > 1) {
            lines.push(`${idx + 1}. ${it.productName} (৳${unitP.toLocaleString('en-IN')}) x ${qty} = ৳${lineTotal.toLocaleString('en-IN')}`);
          } else {
            lines.push(`${idx + 1}. ${it.productName} x 1 = ৳${lineTotal.toLocaleString('en-IN')}`);
          }
        });
      } else {
        lines.push('(No items)');
      }

      lines.push('');
      lines.push(`Subtotal: ৳${Number(memo.subtotal || 0).toLocaleString('en-IN')}`);
      const zoneLabel = memo.deliveryZone ? ` (${memo.deliveryZone})` : '';
      lines.push(`Delivery Charge${zoneLabel}: ৳${Number(memo.deliveryCharge || 0).toLocaleString('en-IN')}`);
      if (Number(memo.discount) > 0) {
        lines.push(`Discount / Advance: - ৳${Number(memo.discount).toLocaleString('en-IN')}`);
      }
      lines.push(`Grand Total: ৳${Number(memo.grandTotal || 0).toLocaleString('en-IN')}`);
      if (memo.orderNotes && memo.orderNotes.trim()) {
        lines.push(`Order Notes: ${memo.orderNotes.trim()}`);
      }
      lines.push('');
      lines.push(`Thank you for shopping with ${shopName}.`);

      return lines.join('\n');
    },

    /**
     * Universal Plain Text Clipboard Copy with Modern & Fallback Support
     */
    async copyTextToClipboard(text, successToastMsg = null) {
      if (!text) {
        showToast('No text available to copy.', 'warning');
        return false;
      }

      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          copied = true;
        } else {
          throw new Error('Fallback required');
        }
      } catch (err) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.top = '0';
          textArea.style.left = '-9999px';
          textArea.setAttribute('readonly', '');
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          copied = document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch (fallbackErr) {
          copied = false;
        }
      }

      if (copied) {
        if (successToastMsg) {
          showToast(successToastMsg, 'success', 3500);
        }
        return true;
      } else {
        try {
          window.prompt('Copy text below (Ctrl+C / Cmd+C):', text);
          showToast('Text ready to copy.', 'info');
          return true;
        } catch (e) {
          showToast('Failed to copy text to clipboard.', 'error');
          return false;
        }
      }
    },

    async copyMemoTextToClipboard(text) {
      return this.copyTextToClipboard(text, 'Memo copied successfully!');
    },

    /**
     * Copy Product Description directly from Card with Visual Feedback
     */
    async copyProductDescription(productId, btnElement) {
      const prod = AppState.products.find(p => p.id === productId);
      if (!prod) {
        showToast('Product not found.', 'error');
        return;
      }

      const desc = (prod.description && prod.description.trim()) ? prod.description.trim() : '';
      const textToCopy = desc || `${prod.name} - ${formatMoney(prod.sellingPrice)}`;

      if (!textToCopy) {
        showToast('No description available to copy.', 'warning');
        return;
      }

      const success = await this.copyTextToClipboard(textToCopy);
      if (success) {
        showToast(desc ? `Copied description for "${prod.name}"!` : `Copied info for "${prod.name}"!`, 'success');
        if (btnElement) {
          const originalHtml = btnElement.innerHTML;
          btnElement.classList.add('bg-emerald-500', 'text-navy-950', 'border-emerald-400');
          btnElement.classList.remove('bg-gold-dim', 'text-gold-200', 'border-gold-border');
          btnElement.innerHTML = `
            <svg class="w-3 h-3 text-navy-950 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            <span class="font-bold text-navy-950">Copied!</span>
          `;
          setTimeout(() => {
            btnElement.innerHTML = originalHtml;
            btnElement.classList.remove('bg-emerald-500', 'text-navy-950', 'border-emerald-400');
            btnElement.classList.add('bg-gold-dim', 'text-gold-200', 'border-gold-border');
          }, 1800);
        }
      }
    },

    /**
     * Copy Category Description
     */
    async copyCategoryDescription(catId, btnElement) {
      const cat = AppState.categories.find(c => c.id === catId);
      if (!cat) {
        showToast('Category not found.', 'error');
        return;
      }
      const textToCopy = (cat.description && cat.description.trim()) ? cat.description.trim() : cat.name;
      const success = await this.copyTextToClipboard(textToCopy, 'Category description copied!');
      if (success && btnElement) {
        const orig = btnElement.innerHTML;
        btnElement.classList.add('bg-emerald-500', 'text-navy-950', 'border-emerald-400');
        btnElement.classList.remove('bg-gold-dim', 'text-gold-200', 'border-gold-border');
        btnElement.innerHTML = `
          <svg class="w-2.5 h-2.5 text-navy-950 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          <span class="font-bold text-navy-950">Copied!</span>
        `;
        setTimeout(() => {
          btnElement.innerHTML = orig;
          btnElement.classList.remove('bg-emerald-500', 'text-navy-950', 'border-emerald-400');
          btnElement.classList.add('bg-gold-dim', 'text-gold-200', 'border-gold-border');
        }, 1800);
      }
    },

    /**
     * Live Order Description / Notes input change handler
     */
    handleMemoNotesChange() {
      const val = document.getElementById('memoOrderNotes')?.value.trim() || '';
      const box = document.getElementById('summaryOrderNotesBox');
      const display = document.getElementById('summaryOrderNotesDisplay');
      if (box && display) {
        if (val) {
          display.textContent = `"${val}"`;
          box.classList.remove('hidden');
        } else {
          display.textContent = '';
          box.classList.add('hidden');
        }
      }
    },

    /**
     * Copy Order Description from Summary Card
     */
    async copyOrderDescription(btnElement) {
      const val = document.getElementById('memoOrderNotes')?.value.trim() || '';
      if (!val) {
        showToast('No order description or notes entered.', 'warning');
        return;
      }
      const success = await this.copyTextToClipboard(val, 'Order description copied to clipboard!');
      if (success && btnElement) {
        const orig = btnElement.innerHTML;
        btnElement.classList.add('bg-emerald-500', 'text-navy-950', 'border-emerald-400');
        btnElement.classList.remove('bg-gold-dim', 'text-gold-200', 'border-gold-border');
        btnElement.innerHTML = `
          <svg class="w-2.5 h-2.5 text-navy-950 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          <span class="font-bold text-navy-950">Copied!</span>
        `;
        setTimeout(() => {
          btnElement.innerHTML = orig;
          btnElement.classList.remove('bg-emerald-500', 'text-navy-950', 'border-emerald-400');
          btnElement.classList.add('bg-gold-dim', 'text-gold-200', 'border-gold-border');
        }, 1800);
      }
    },

    copyMemoById(memoId) {
      const memo = AppState.memos.find(m => m.memoId === memoId);
      if (!memo) {
        showToast('Order memo not found to copy.', 'error');
        return;
      }
      const text = this.formatMemoForClipboard(memo);
      this.copyMemoTextToClipboard(text);
    },

    copyActiveMemo() {
      if (!AppState.activeMemoDetails) {
        showToast('No active memo to copy.', 'error');
        return;
      }
      const text = this.formatMemoForClipboard(AppState.activeMemoDetails);
      this.copyMemoTextToClipboard(text);
    },

    copyCurrentDraftMemo() {
      const memoId = document.getElementById('generatedMemoIdDisplay').textContent.trim();
      const customerName = document.getElementById('memoCustomerName').value.trim();
      const customerPhone = document.getElementById('memoCustomerPhone').value.trim();
      const deliveryAddress = document.getElementById('memoCustomerAddress').value.trim();
      const orderNotes = document.getElementById('memoOrderNotes')?.value.trim() || '';
      const isInsideDhaka = document.querySelector('input[name="deliveryZone"]:checked')?.value === 'inside';
      const deliveryZone = isInsideDhaka ? 'Inside Dhaka' : 'Outside Dhaka';

      if (!customerName || !customerPhone || !deliveryAddress) {
        showToast('Please fill in Customer Name, Phone, and Address first.', 'warning');
        return;
      }

      const phoneValidation = this.validateBangladeshiPhone(customerPhone);
      if (!phoneValidation.isValid) {
        this.showPhoneError(phoneValidation.message);
        showToast(phoneValidation.message, 'warning');
        document.getElementById('memoCustomerPhone')?.focus();
        return;
      }

      const validItems = AppState.memoLineItems.filter(it => it.productId);
      if (validItems.length === 0) {
        showToast('Please select at least one product for the memo.', 'warning');
        return;
      }

      let subtotal = 0;
      validItems.forEach(it => {
        subtotal += (Number(it.totalPrice) || 0);
      });

      const deliveryCharge = isInsideDhaka 
        ? Number(AppState.settings.delivery_inside_dhaka || 60)
        : Number(AppState.settings.delivery_outside_dhaka || 130);

      const discount = Math.max(0, Number(document.getElementById('memoDiscountInput').value) || 0);
      const grandTotal = Math.max(0, (subtotal + deliveryCharge) - discount);

      const draftMemo = {
        memoId,
        date: new Date().toISOString(),
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryZone,
        deliveryCharge,
        discount,
        subtotal,
        grandTotal,
        orderNotes,
        items: validItems
      };

      const text = this.formatMemoForClipboard(draftMemo);
      this.copyMemoTextToClipboard(text);
    },

    /**
     * Team Management (Admin Only)
     */
    renderTeam() {
      const body = document.getElementById('teamTableBody');
      if (!body) return;

      body.innerHTML = AppState.teamMembers.map(u => `
        <tr class="hover:bg-navy-700/40 transition-colors">
          <td class="py-3 px-4 font-mono font-bold text-gold-300">${u.id}</td>
          <td class="py-3 px-4 font-medium text-slate-100">${this.escapeHtml(u.name)}</td>
          <td class="py-3 px-4 text-slate-400 text-xs">${this.escapeHtml(u.email)}</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-gold-dim text-gold-300 border border-gold-primary' : 'bg-navy-700 text-slate-300 border border-navy-border'}">
              ${u.role.toUpperCase()}
            </span>
          </td>
          <td class="py-3 px-4"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">${u.status}</span></td>
          <td class="py-3 px-4 text-slate-400 text-xs">${formatDate(u.createdAt)}</td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button class="px-2.5 py-1 rounded-md text-xs font-semibold bg-gold-500/15 hover:bg-gold-500 text-gold-300 hover:text-navy-950 border border-gold-500/30 transition-all cursor-pointer mr-1.5" onclick="App.openChangePasswordModal('${u.id}', '${this.escapeHtml(u.email)}', '${this.escapeHtml(u.name)}')">Change Password</button>
            ${u.id !== 'USER-1' ? `
              <button class="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer" onclick="App.deleteTeamMember('${u.id}')">Delete</button>
            ` : '<span class="text-xs text-slate-500 font-mono inline-block px-1.5 py-0.5">Root</span>'}
          </td>
        </tr>
      `).join('');
    },

    openTeamMemberModal() {
      document.getElementById('teamFormName').value = '';
      document.getElementById('teamFormEmail').value = '';
      document.getElementById('teamFormPassword').value = '';
      document.getElementById('teamFormRole').value = 'staff';
      document.getElementById('teamModal').classList.add('open');
    },

    closeTeamModal() {
      document.getElementById('teamModal').classList.remove('open');
    },

    async saveTeamMember() {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required.', 'error');
        return;
      }

      const name = document.getElementById('teamFormName').value.trim();
      const email = document.getElementById('teamFormEmail').value.trim();
      const password = document.getElementById('teamFormPassword').value.trim();
      const role = document.getElementById('teamFormRole').value;

      if (!name || !email || !password) {
        showToast('Please fill all required member fields.', 'warning');
        return;
      }

      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'warning');
        return;
      }

      const newMember = {
        name,
        email,
        password,
        role
      };

      if (AppState.settings.apiUrl) {
        showToast('Registering team member in Google Sheets...', 'info');
        try {
          const res = await API.call({ action: 'addTeamMember', member: newMember });
          if (res && res.status === 'success') {
            showToast('Member created successfully in Google Sheets.', 'success');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error', 5000);
          return;
        }
      }

      const localMemberObj = {
        id: 'USER-' + (AppState.teamMembers.length + 1),
        name,
        email,
        role,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      AppState.teamMembers.push(localMemberObj);
      const newPassHash = await this.hashPasswordStr(password);
      this.setStoredUserHash(email, newPassHash);
      Storage.save();

      this.closeTeamModal();
      this.renderTeam();
      showToast(`Team member "${name}" registered.`, 'success');
    },

    async deleteTeamMember(id) {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required.', 'error');
        return;
      }

      if (!confirm('Are you sure you want to remove this team member?')) return;

      if (AppState.settings.apiUrl) {
        try {
          await API.call({ action: 'deleteTeamMember', id });
          showToast('Team member removed from Google Sheets.', 'success');
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error', 5000);
          return;
        }
      }

      AppState.teamMembers = AppState.teamMembers.filter(u => u.id !== id);
      Storage.save();
      this.renderTeam();
      showToast('Team member removed.', 'info');
    },

    /**
     * Password Management
     */
    getStoredUserHash(email) {
      if (!email) return null;
      try {
        const custom = JSON.parse(localStorage.getItem('ravo_custom_passwords') || '{}');
        if (custom[email.toLowerCase()]) return custom[email.toLowerCase()];
      } catch (e) {
        console.warn('Error reading stored hashes:', e);
      }
      if (email.toLowerCase() === 'admin@ravohouse.com') {
        return 'a0837458539a59d33e17bee12f95f8db46350a56e5b8ba527037a8dfb3799172';
      }
      if (email.toLowerCase() === 'staff@ravohouse.com') {
        return '02defbfb8190f9d0719ef7a23da2049bd2e61442bc14021a6d8a4ae35ca334b7';
      }
      return null;
    },

    setStoredUserHash(email, hash) {
      if (!email || !hash) return;
      try {
        const custom = JSON.parse(localStorage.getItem('ravo_custom_passwords') || '{}');
        custom[email.toLowerCase()] = hash;
        localStorage.setItem('ravo_custom_passwords', JSON.stringify(custom));
      } catch (e) {
        console.warn('Error saving custom password hash:', e);
      }
    },

    openChangePasswordModal(userId, email, name) {
      const current = AppState.currentUser;
      const targetUserId = userId || (current ? current.id : 'USER-1');
      const targetEmail = email || (current ? current.email : 'admin@ravohouse.com');
      const targetName = name || (current ? current.name : 'Account');

      const modal = document.getElementById('changePasswordModal');
      const sub = document.getElementById('changePassTargetSubtitle');
      const idInput = document.getElementById('changePassTargetUserId');
      const emailInput = document.getElementById('changePassTargetEmail');
      const newPass = document.getElementById('changePassNew');
      const confPass = document.getElementById('changePassConfirm');

      if (idInput) idInput.value = targetUserId;
      if (emailInput) emailInput.value = targetEmail;
      if (newPass) newPass.value = '';
      if (confPass) confPass.value = '';

      if (sub) {
        sub.textContent = `Updating password for ${targetName} (${targetEmail})`;
      }

      if (modal) {
        modal.classList.add('open');
        setTimeout(() => { if (newPass) newPass.focus(); }, 100);
      }
    },

    closeChangePasswordModal() {
      const modal = document.getElementById('changePasswordModal');
      const newPass = document.getElementById('changePassNew');
      const confPass = document.getElementById('changePassConfirm');
      if (newPass) newPass.value = '';
      if (confPass) confPass.value = '';
      if (modal) modal.classList.remove('open');
    },

    togglePasswordVisibility(inputId, btnEl) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      if (btnEl) {
        btnEl.innerHTML = isPassword ? `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
        ` : `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        `;
      }
    },

    async submitChangePassword() {
      const idInput = document.getElementById('changePassTargetUserId');
      const emailInput = document.getElementById('changePassTargetEmail');
      const newPassInput = document.getElementById('changePassNew');
      const confPassInput = document.getElementById('changePassConfirm');
      const submitBtn = document.getElementById('changePassSubmitBtn');

      const userId = idInput ? idInput.value : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const newPass = newPassInput ? newPassInput.value.trim() : '';
      const confPass = confPassInput ? confPassInput.value.trim() : '';

      if (!email || !newPass) {
        showToast('Please enter the new password.', 'warning');
        return;
      }

      if (newPass.length < 6) {
        showToast('Password must be at least 6 characters long.', 'warning');
        return;
      }

      if (newPass !== confPass) {
        showToast('Passwords do not match. Please re-check.', 'warning');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Password...';
      }

      try {
        // Cloud Google Apps Script update if API is connected
        if (AppState.settings.apiUrl) {
          try {
            const res = await API.call({
              action: 'changePassword',
              email: email,
              userId: userId,
              newPassword: newPass
            });
            if (res && res.status === 'success') {
              showToast(res.message || 'Password successfully updated in Google Sheets!', 'success', 4000);
            }
          } catch (cloudErr) {
            console.warn('Backend password change warning:', cloudErr);
            showToast(`Cloud update note: ${cloudErr.message}`, 'warning', 4000);
          }
        }

        // Always update local/offline hash as well
        const passHash = await this.hashPasswordStr(newPass);
        this.setStoredUserHash(email, passHash);

        this.closeChangePasswordModal();
        showToast(`Password for "${email}" updated successfully.`, 'success', 4000);
      } catch (err) {
        showToast(`Error changing password: ${err.message}`, 'error', 4500);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Password';
        }
      }
    },

    /**
     * Settings Management
     */
    populateSettingsForm() {
      const s = AppState.settings;
      const apiInput = document.getElementById('settingApiUrl');
      const insideInput = document.getElementById('settingInsideDhaka');
      const outsideInput = document.getElementById('settingOutsideDhaka');
      const prefixInput = document.getElementById('settingMemoPrefix');
      const websiteNameInput = document.getElementById('settingWebsiteName');
      const shopNameInput = document.getElementById('settingShopName');
      const phoneInput = document.getElementById('settingShopPhone');
      const addrInput = document.getElementById('settingShopAddress');
      const footerInput = document.getElementById('settingInvoiceFooter');

      if (apiInput) apiInput.value = s.apiUrl || '';
      if (insideInput) insideInput.value = s.delivery_inside_dhaka || '60';
      if (outsideInput) outsideInput.value = s.delivery_outside_dhaka || '130';
      if (prefixInput) prefixInput.value = s.memo_prefix || 'RH';
      if (websiteNameInput) websiteNameInput.value = Branding.getName();
      if (shopNameInput) shopNameInput.value = Branding.getName();
      if (phoneInput) phoneInput.value = s.shop_phone || '+880 1711-000000';
      if (addrInput) addrInput.value = s.shop_address || 'Gulshan 2, Dhaka';
      if (footerInput) footerInput.value = s.invoice_footer_note || '';

      Branding.apply();
    },

    /**
     * Branding: Save Website Name
     */
    async saveWebsiteName() {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required to modify website branding.', 'error');
        return;
      }

      const input = document.getElementById('settingWebsiteName');
      const newName = input ? input.value.trim() : '';
      if (!newName) {
        showToast('Website name cannot be empty.', 'warning');
        return;
      }

      Branding.setName(newName);
      const shopInput = document.getElementById('settingShopName');
      if (shopInput) shopInput.value = newName;

      Storage.save();
      Branding.apply();

      if (AppState.settings.apiUrl) {
        try {
          await API.call({
            action: 'updateSettings',
            settings: {
              shop_name: newName
            }
          });
        } catch (e) {
          console.warn('Backend sync warning for website name:', e);
        }
      }

      showToast(`Website name updated to "${newName}".`, 'success');
    },

    /**
     * Branding: Handle Logo File Selection
     */
    handleLogoFileSelect(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      const validExtensions = /\.(png|jpe?g|webp|svg)$/i;

      if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
        showToast('Unsupported format! Please upload a PNG, JPG, WEBP, or SVG file.', 'error', 4000);
        event.target.value = '';
        return;
      }

      // Max 2MB file size
      if (file.size > 2 * 1024 * 1024) {
        showToast('File size exceeds 2MB limit! Please upload a smaller image file.', 'error', 4000);
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        AppState._pendingLogoData = dataUrl;

        const previewImg = document.getElementById('settingLogoPreviewImg');
        if (previewImg) previewImg.src = dataUrl;

        const badge = document.getElementById('logoStatusBadge');
        if (badge) {
          badge.textContent = 'Preview (Unsaved)';
          badge.className = 'px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40';
        }

        const info = document.getElementById('logoUploadFileInfo');
        if (info) {
          const sizeKb = (file.size / 1024).toFixed(1);
          info.innerHTML = `<span class="text-gold-300 truncate">${this.escapeHtml(file.name)}</span><span>${sizeKb} KB</span>`;
        }

        showToast('Logo preview loaded. Click "Save Logo" to apply permanently.', 'info');
      };
      reader.onerror = () => {
        showToast('Failed to read the selected image file.', 'error');
      };
      reader.readAsDataURL(file);
    },

    /**
     * Branding: Handle Direct Logo URL Input
     */
    handleLogoUrlInput(event) {
      const url = event.target.value.trim();
      if (!url) {
        if (!AppState._pendingLogoData) {
          Branding.apply();
        }
        return;
      }

      AppState._pendingLogoData = url;
      const previewImg = document.getElementById('settingLogoPreviewImg');
      if (previewImg) previewImg.src = url;

      const badge = document.getElementById('logoStatusBadge');
      if (badge) {
        badge.textContent = 'Preview (Unsaved)';
        badge.className = 'px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40';
      }
    },

    /**
     * Branding: Optimize Image to Lightweight Data URL
     * Keeps aspect ratio perfectly intact and creates crisp, compact base64
     */
    async optimizeLogoDataUrl(dataUrl) {
      // SVGs or remote URLs don't need raster compression
      if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:image/svg+xml')) {
        return dataUrl;
      }

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 400; // Optimal for crisp high-DPI logo display
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Preserve transparency using PNG
          const optimized = canvas.toDataURL('image/png', 0.9);
          resolve(optimized);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    },

    /**
     * Branding: Save Logo Permanently
     */
    async saveLogo() {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required to modify website branding.', 'error');
        return;
      }

      let candidateLogo = AppState._pendingLogoData;
      const urlInput = document.getElementById('settingLogoUrlInput');
      if (!candidateLogo && urlInput && urlInput.value.trim()) {
        candidateLogo = urlInput.value.trim();
      }

      if (!candidateLogo) {
        showToast('Please upload an image or enter a logo URL first.', 'warning');
        return;
      }

      showToast('Processing and saving logo...', 'info');

      try {
        const finalLogo = await this.optimizeLogoDataUrl(candidateLogo);
        Branding.setLogo(finalLogo);
        delete AppState._pendingLogoData;

        Storage.save();
        Branding.apply();

        if (AppState.settings.apiUrl) {
          try {
            await API.call({
              action: 'updateSettings',
              settings: {
                shop_logo: finalLogo,
                shop_name: Branding.getName()
              }
            });
          } catch (err) {
            console.warn('Backend sync warning for logo:', err);
          }
        }

        const fileInput = document.getElementById('settingLogoFileInput');
        if (fileInput) fileInput.value = '';

        showToast('Brand logo successfully saved and persisted!', 'success');
      } catch (err) {
        showToast(`Failed to save logo: ${err.message}`, 'error');
      }
    },

    /**
     * Branding: Remove Custom Logo
     */
    async removeLogo() {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required to modify website branding.', 'error');
        return;
      }

      if (!Branding.hasCustomLogo() && !AppState._pendingLogoData) {
        showToast('Default logo is already in use.', 'info');
        return;
      }

      Branding.removeLogo();
      delete AppState._pendingLogoData;

      const fileInput = document.getElementById('settingLogoFileInput');
      if (fileInput) fileInput.value = '';
      const urlInput = document.getElementById('settingLogoUrlInput');
      if (urlInput) urlInput.value = '';
      const info = document.getElementById('logoUploadFileInfo');
      if (info) {
        info.innerHTML = '<span>Formats: PNG, JPG, WEBP, SVG</span><span>Max: 2MB</span>';
      }

      Storage.save();
      Branding.apply();

      if (AppState.settings.apiUrl) {
        try {
          await API.call({
            action: 'updateSettings',
            settings: {
              shop_logo: '',
              shop_name: Branding.getName()
            }
          });
        } catch (e) {
          console.warn('Backend sync warning for removing logo:', e);
        }
      }

      showToast('Custom logo removed. Default logo restored.', 'info');
    },

    async saveSettings() {
      if (AppState.currentUser && AppState.currentUser.role !== 'admin') {
        showToast('Unauthorized: Administrator privilege required.', 'error');
        return;
      }

      const s = AppState.settings;
      s.apiUrl = document.getElementById('settingApiUrl').value.trim();
      s.delivery_inside_dhaka = document.getElementById('settingInsideDhaka').value.trim();
      s.delivery_outside_dhaka = document.getElementById('settingOutsideDhaka').value.trim();
      s.memo_prefix = document.getElementById('settingMemoPrefix').value.trim();

      const websiteNameInput = document.getElementById('settingWebsiteName');
      if (websiteNameInput && websiteNameInput.value.trim()) {
        s.shop_name = websiteNameInput.value.trim();
      } else {
        s.shop_name = document.getElementById('settingShopName').value.trim();
      }

      s.shop_phone = document.getElementById('settingShopPhone').value.trim();
      s.shop_address = document.getElementById('settingShopAddress').value.trim();
      s.invoice_footer_note = document.getElementById('settingInvoiceFooter').value.trim();

      Storage.save();
      Branding.apply();

      if (s.apiUrl) {
        showToast('Saving settings to Google Sheets...', 'info');
        try {
          await API.call({
            action: 'updateSettings',
            settings: {
              delivery_inside_dhaka: s.delivery_inside_dhaka,
              delivery_outside_dhaka: s.delivery_outside_dhaka,
              memo_prefix: s.memo_prefix,
              shop_name: s.shop_name,
              shop_logo: s.shop_logo || '',
              shop_phone: s.shop_phone,
              shop_address: s.shop_address,
              invoice_footer_note: s.invoice_footer_note
            }
          });
          showToast('Settings saved to Google Sheets!', 'success');
        } catch (err) {
          showToast(`Notice: Settings saved locally, but backend update failed: ${err.message}`, 'warning', 5000);
        }
      }

      this.checkBackendConnection();
      this.renderMemoCreationOptions();
      showToast('Settings successfully updated.', 'success');
    },

    openSettingsModal() {
      this.navigateTo('settings');
    },

    resetToSeedData() {
      if (!confirm('Reset local catalog and orders to default sample luxury data?')) return;
      AppState.products = [...SEED_DATA.products];
      AppState.categories = [...SEED_DATA.categories];
      AppState.memos = [...SEED_DATA.memos];
      AppState.teamMembers = [...SEED_DATA.teamMembers];
      Storage.save();
      this.renderAll();
      showToast('Sample dataset restored.', 'info');
    },

    /**
     * Web Crypto SHA-256 helper (ensures zero plain-text passwords in frontend code)
     */
    async hashPasswordStr(str) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        return '';
      }
    },

    /**
     * Authentication & Login
     */
    handleAuthClick() {
      if (AppState.currentUser) {
        AppState.currentUser = null;
        sessionStorage.removeItem('ravo_auth_user');
        localStorage.removeItem('ravo_auth_user');
        localStorage.removeItem('ravo_products');
        localStorage.removeItem('ravo_categories');
        localStorage.removeItem('ravo_memos');
        localStorage.removeItem('ravo_team');

        AppState.products = [];
        AppState.categories = [];
        AppState.memos = [];
        AppState.teamMembers = [];

        const passInput = document.getElementById('loginPassword');
        if (passInput) passInput.value = '';

        this.showLoginScreen();
        this.updateUserInterfaceForRole();

        showToast('You have been logged out securely.', 'info', 3000);
      } else {
        this.showLoginScreen();
      }
    },

    fillLogin(email, pass) {
      const emailInput = document.getElementById('loginEmail');
      const passInput = document.getElementById('loginPassword');
      if (emailInput) emailInput.value = email;
      if (pass && passInput) passInput.value = pass;
      else if (passInput) passInput.focus();
    },

    async submitLogin() {
      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');
      const submitBtn = document.getElementById('loginSubmitBtn');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';

      if (!email || !password) {
        showToast('Please enter both email and password.', 'warning');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying Credentials...';
      }

      try {
        // Authenticate with Google Apps Script backend if configured
        if (AppState.settings.apiUrl) {
          try {
            const res = await API.call({ action: 'login', email, password });
            if (res && res.status === 'success' && res.user) {
              AppState.currentUser = res.user;
              sessionStorage.setItem('ravo_auth_user', JSON.stringify(res.user));
              localStorage.setItem('ravo_auth_user', JSON.stringify(res.user));

              this.hideLoginScreen();
              this.updateUserInterfaceForRole();

              await this.syncFromCloud(true);

              this.renderAll();
              this.initMemoForm();
              this.navigateTo('dashboard');

              if (passwordInput) passwordInput.value = '';
              showToast(`Welcome back, ${res.user.name}!`, 'success', 3500);
              return;
            }
          } catch (err) {
            if (err.message && (err.message.includes('password') || err.message.includes('user') || err.message.includes('account') || err.message.includes('deactivated'))) {
              showToast(`Login failed: ${err.message}`, 'error', 4500);
              return;
            }
            console.warn('Backend login network warning, falling back to local credentials:', err);
          }
        }

        // Offline / initial fallback verification using SHA-256 hash (never storing plain-text passwords)
        const passHash = await this.hashPasswordStr(password);
        const expectedAdminHash = this.getStoredUserHash('admin@ravohouse.com');
        const expectedStaffHash = this.getStoredUserHash('staff@ravohouse.com');

        if (email.toLowerCase() === 'admin@ravohouse.com' && passHash === expectedAdminHash) {
          AppState.currentUser = {
            id: 'USER-1',
            name: 'RAVO HOUSE Admin',
            email: 'admin@ravohouse.com',
            role: 'admin',
            token: 'demo-admin-token'
          };
        } else if (email.toLowerCase() === 'staff@ravohouse.com' && passHash === expectedStaffHash) {
          AppState.currentUser = {
            id: 'USER-2',
            name: 'Sales Staff',
            email: 'staff@ravohouse.com',
            role: 'staff',
            token: 'demo-staff-token'
          };
        } else {
          // Check any custom local team members
          const localMember = AppState.teamMembers.find(m => m.email && m.email.toLowerCase() === email.toLowerCase());
          const customHash = this.getStoredUserHash(email);
          if (localMember && customHash && passHash === customHash) {
            AppState.currentUser = {
              id: localMember.id,
              name: localMember.name,
              email: localMember.email,
              role: localMember.role || 'staff',
              token: 'demo-member-token'
            };
          } else {
            showToast('Invalid credentials. Please verify your email and password.', 'error', 4500);
            return;
          }
        }

        sessionStorage.setItem('ravo_auth_user', JSON.stringify(AppState.currentUser));
        localStorage.setItem('ravo_auth_user', JSON.stringify(AppState.currentUser));

        if (AppState.products.length === 0) {
          AppState.products = [...SEED_DATA.products];
          AppState.categories = [...SEED_DATA.categories];
          AppState.memos = [...SEED_DATA.memos];
          AppState.teamMembers = [...SEED_DATA.teamMembers];

          if (AppState.currentUser.role === 'staff') {
            AppState.products = AppState.products.map(p => ({ ...p, purchasePrice: 0, packagingCost: 0 }));
            AppState.memos = AppState.memos.map(m => ({ ...m, orderCost: 0, orderProfit: 0 }));
            AppState.teamMembers = [];
          }
        }

        Storage.save();
        this.hideLoginScreen();
        this.updateUserInterfaceForRole();
        this.renderAll();
        this.initMemoForm();
        this.navigateTo('dashboard');

        if (passwordInput) passwordInput.value = '';
        showToast(`Welcome back, ${AppState.currentUser.name}!`, 'success', 3500);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Dashboard';
        }
      }
    },

    /**
     * Setup Guide Modal
     */
    openSetupGuideModal() {
      document.getElementById('setupGuideModal').classList.add('open');
    },

    closeSetupGuideModal() {
      document.getElementById('setupGuideModal').classList.remove('open');
    },

    /**
     * Utility: HTML Escape
     */
    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  // Bootstrap when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
  });
})();
