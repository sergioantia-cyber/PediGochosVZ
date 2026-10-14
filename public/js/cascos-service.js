/* ==========================================================================
   PediGochos Rider - MT Helmets & Indumentaria Motera Module Logic
   PediGochos Specialized Services Module
   ========================================================================== */

const CascosServiceApp = {
  catalog: [],
  currentFilter: 'all',
  searchQuery: '',
  selectedCurrency: 'COP',
  copToUsdRate: 4000,
  copToVesRate: 0.025,
  officialWhatsApp: '573227949751',
  officialWhatsAppDisplay: '+57 322 794 9751',

  // Detail Modal State
  activeProduct: null,
  activeDetailImage: '',
  activeSize: null,

  async init() {
    this.syncRatesFromMarketplace();
    await this.loadCatalog();
  },

  syncRatesFromMarketplace() {
    if (typeof MarketplaceApp !== 'undefined') {
      if (MarketplaceApp.copToUsdRate && MarketplaceApp.copToUsdRate > 0) {
        this.copToUsdRate = MarketplaceApp.copToUsdRate;
      }
      if (MarketplaceApp.copToVesRate && MarketplaceApp.copToVesRate > 0) {
        this.copToVesRate = MarketplaceApp.copToVesRate;
      }
      if (MarketplaceApp.selectedCurrency) {
        this.selectedCurrency = MarketplaceApp.selectedCurrency;
      }
    }
  },

  async loadCatalog() {
    try {
      const res = await fetch(`/api/cascos-services/catalog?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.catalog = data;
          return;
        }
      }
    } catch (e) {
      console.warn('API endpoint failed, trying static fallback:', e);
    }

    // Fallback 1: Static public file
    try {
      const staticRes = await fetch(`/cascos_catalog.json?t=${Date.now()}`);
      if (staticRes.ok) {
        const data = await staticRes.json();
        if (Array.isArray(data) && data.length > 0) {
          this.catalog = data;
          return;
        }
      }
    } catch (_) {}

    // Fallback 2: Supabase direct storage CDN
    try {
      const cloudRes = await fetch('https://bvdwxgfixirisqaavskj.supabase.co/storage/v1/object/public/menu_images/cascos_catalog.json');
      if (cloudRes.ok) {
        const data = await cloudRes.json();
        if (Array.isArray(data) && data.length > 0) {
          this.catalog = data;
          return;
        }
      }
    } catch (_) {}
  },

  open() {
    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.updateFloatingAndHeaderSos) {
      MarketplaceApp.updateFloatingAndHeaderSos(true);
    }

    let modal = document.getElementById('cascos-service-modal');
    if (!modal) {
      this.renderModalMarkup();
      modal = document.getElementById('cascos-service-modal');
    }

    this.syncRatesFromMarketplace();
    if (modal) {
      modal.classList.remove('hidden');
      if (window.location.hash !== '#servicios/cascos-mt') {
        window.history.pushState({ modal: 'cascos-service' }, '', '#servicios/cascos-mt');
      }

      if (this.catalog.length === 0) {
        this.loadCatalog().then(() => {
          this.renderFilterPills();
          this.renderGrid();
        });
      } else {
        this.renderFilterPills();
        this.renderGrid();
      }
    }
  },

  close() {
    const modal = document.getElementById('cascos-service-modal');
    if (modal) modal.classList.add('hidden');
    if (window.location.hash === '#servicios/cascos-mt') {
      window.history.pushState(null, '', window.location.pathname);
    }
  },

  setCurrency(curr) {
    this.selectedCurrency = curr;
    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.setCurrency) {
      MarketplaceApp.selectedCurrency = curr;
    }
    // Update currency buttons
    document.querySelectorAll('.cascos-curr-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.curr === curr);
    });
    this.renderGrid();
    if (this.activeProduct) {
      this.renderDetailModal(this.activeProduct);
    }
  },

  formatPrice(priceCop) {
    const num = parseFloat(priceCop) || 0;
    if (this.selectedCurrency === 'USD') {
      const usd = (num / this.copToUsdRate).toFixed(2);
      return `$${usd} USD`;
    } else if (this.selectedCurrency === 'VES') {
      const ves = (num * this.copToVesRate).toFixed(2);
      return `${ves} Bs.`;
    }
    return `$${Math.round(num).toLocaleString('de-DE')} COP`;
  },

  setFilter(filterKey) {
    this.currentFilter = filterKey;
    document.querySelectorAll('.cascos-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filterKey);
    });
    this.renderGrid();
  },

  handleSearch(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.renderGrid();
  },

  getStockInfo(p) {
    const total = typeof p.stockTotal === 'number' ? p.stockTotal : 0;
    const status = p.stockStatus || (total === 0 ? 'out_of_stock' : (total <= 3 ? 'low_stock' : 'in_stock'));

    if (status === 'out_of_stock' || total === 0) {
      return {
        status: 'out_of_stock',
        badgeClass: 'stock-out',
        badgeText: '🔴 Agotado / Encargo',
        noteText: '⏱️ Disponible bajo encargo',
        detailStatus: 'Bajo Pedido Express (Sin stock inmediato)',
        color: '#EF4444',
        total: 0
      };
    } else if (status === 'low_stock' || total <= 3) {
      return {
        status: 'low_stock',
        badgeClass: 'stock-low',
        badgeText: `🟡 ¡Últimas ${total} unid.!`,
        noteText: `⚡ ¡Solo ${total} en existencia!`,
        detailStatus: `¡Pocas unidades! Solo ${total} disponibles`,
        color: '#F59E0B',
        total: total
      };
    } else {
      return {
        status: 'in_stock',
        badgeClass: 'stock-in',
        badgeText: `🟢 En Stock (${total})`,
        noteText: `🟢 ${total} disponibles en bodega`,
        detailStatus: `En Stock: ${total} unidades listas para despacho`,
        color: '#10B981',
        total: total
      };
    }
  },

  getFilteredItems() {
    let items = this.catalog || [];

    // Filter by Stock, Category or Brand
    if (this.currentFilter === 'in_stock') {
      items = items.filter(it => (typeof it.stockTotal === 'number' ? it.stockTotal > 0 : true) && it.stockStatus !== 'out_of_stock');
    } else if (this.currentFilter === 'mt') {
      items = items.filter(it => it.isMt || (it.vendor && it.vendor.toLowerCase().includes('mt')));
    } else if (this.currentFilter !== 'all') {
      items = items.filter(it => it.category === this.currentFilter);
    }

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery;
      items = items.filter(it => {
        const text = `${it.title} ${it.vendor} ${it.categoryLabel} ${(it.tags || []).join(' ')} ${(it.certifications || []).join(' ')}`.toLowerCase();
        return text.includes(q);
      });
    }

    return items;
  },

  renderFilterPills() {
    const container = document.getElementById('cascos-filter-pills-box');
    if (!container) return;

    const totalAll = this.catalog.length;
    const totalInStock = this.catalog.filter(it => (typeof it.stockTotal === 'number' ? it.stockTotal > 0 : true) && it.stockStatus !== 'out_of_stock').length;
    const totalMt = this.catalog.filter(it => it.isMt || (it.vendor && it.vendor.toLowerCase().includes('mt'))).length;
    const totalIntegrales = this.catalog.filter(it => it.category === 'integral').length;
    const totalAbatibles = this.catalog.filter(it => it.category === 'abatible').length;
    const totalAbiertos = this.catalog.filter(it => it.category === 'abierto').length;
    const totalLlantas = this.catalog.filter(it => it.category === 'llantas').length;
    const totalIndumentaria = this.catalog.filter(it => it.category === 'indumentaria').length;
    const totalAccesorios = this.catalog.filter(it => it.category === 'accesorios').length;

    const pills = [
      { key: 'all', label: '🌟 Todos', count: totalAll },
      { key: 'in_stock', label: '🟢 En Existencia', count: totalInStock },
      { key: 'mt', label: '🪖 MT Helmets Oficial', count: totalMt },
      { key: 'integral', label: '🏍️ Integrales', count: totalIntegrales },
      { key: 'abatible', label: '🔄 Abatibles / Modulares', count: totalAbatibles },
      { key: 'abierto', label: '🌬️ Abiertos / Jet', count: totalAbiertos },
      { key: 'llantas', label: '🛞 Llantas', count: totalLlantas },
      { key: 'indumentaria', label: '🎒 Indumentaria', count: totalIndumentaria },
      { key: 'accesorios', label: '🛠️ Accesorios', count: totalAccesorios }
    ];

    container.innerHTML = pills.map(p => `
      <button type="button" class="cascos-pill-btn ${this.currentFilter === p.key ? 'active' : ''}" data-filter="${p.key}" onclick="CascosServiceApp.setFilter('${p.key}')">
        <span>${p.label}</span>
        <span class="cascos-pill-badge">${p.count}</span>
      </button>
    `).join('');
  },

  renderGrid() {
    const grid = document.getElementById('cascos-products-grid');
    const countEl = document.getElementById('cascos-results-count');
    if (!grid) return;

    const items = this.getFilteredItems();
    if (countEl) {
      countEl.textContent = `${items.length} producto${items.length !== 1 ? 's' : ''}`;
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: rgba(255,255,255,0.02); border: 1.5px dashed rgba(255,255,255,0.1); border-radius: 20px;">
          <span style="font-size: 42px; display: block; margin-bottom: 8px;">🔍</span>
          <h4 style="color: #FFF; font-size: 16px; margin: 0 0 6px 0;">No se encontraron cascos o accesorios</h4>
          <p style="color: #94A3B8; font-size: 12.5px; margin: 0 0 14px 0;">Prueba con otra palabra o categoría.</p>
          <button type="button" onclick="CascosServiceApp.setFilter('all'); document.getElementById('cascos-search-input').value='';" style="background: var(--cascos-brand); color: #FFF; border: none; padding: 8px 18px; border-radius: 12px; font-weight: 800; font-size: 12px; cursor: pointer;">
            Ver Todo el Catálogo
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(p => {
      const priceText = this.formatPrice(p.price);
      const isMt = p.isMt || (p.vendor && p.vendor.toLowerCase().includes('mt'));
      const stockInfo = this.getStockInfo(p);
      const certBadgesHtml = (p.certifications || []).slice(0, 2).map(c => `
        <span class="casco-cert-badge ${c.includes('22.06') ? 'ece' : ''}">${c}</span>
      `).join('');

      const sizesHtml = (p.sizes || []).length > 0 ? `
        <div class="casco-sizes-row">
          <span class="casco-size-label">Tallas:</span>
          ${(p.sizes || []).slice(0, 5).map(s => {
            const qty = typeof s.stock === 'number' ? s.stock : (s.available ? 1 : 0);
            const inStock = qty > 0;
            return `
              <span class="casco-size-pill ${inStock ? 'has-stock' : 'no-stock'}" title="${s.size}: ${inStock ? `${qty} unid. disponibles` : 'Agotada'}">
                ${s.size}${inStock ? `<span class="size-qty">(${qty})</span>` : ''}
              </span>
            `;
          }).join('')}
          ${(p.sizes || []).length > 5 ? `<span style="font-size: 9.5px; color: #94A3B8; font-weight: 700;">+${p.sizes.length - 5}</span>` : ''}
        </div>
      ` : `
        <div class="casco-stock-single-row">
          <span class="casco-stock-dot ${stockInfo.badgeClass}"></span>
          <span class="casco-stock-single-text">${stockInfo.noteText}</span>
        </div>
      `;

      return `
        <div class="casco-card" id="card-${p.id}">
          <div class="casco-card-img-box" onclick="CascosServiceApp.openDetail('${p.id}')">
            <img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='/images/services/pedigochos_cascos_logo.svg'">
            <span class="casco-brand-badge ${isMt ? 'mt-badge' : ''}">${p.vendor}</span>
            <span class="casco-stock-pill-floating ${stockInfo.badgeClass}">${stockInfo.badgeText}</span>
            ${(p.certifications && p.certifications.length > 0 && p.certifications[0].includes('22.06')) ? `<span class="casco-cert-pill-floating">🛡️ 22.06</span>` : ''}
            ${(p.images && p.images.length > 1) ? `<span class="casco-photos-count">📷 ${p.images.length} fotos</span>` : ''}
          </div>

          <div class="casco-card-body">
            <div class="casco-card-category">
              <span>${p.categoryIcon || '🪖'}</span>
              <span>${p.categoryLabel}</span>
            </div>

            <h4 class="casco-card-title" title="${p.title}" onclick="CascosServiceApp.openDetail('${p.id}')" style="cursor: pointer;">
              ${p.title}
            </h4>

            ${certBadgesHtml ? `<div class="cascos-certs-row">${certBadgesHtml}</div>` : ''}
            ${sizesHtml}

            <div class="casco-card-price-box">
              <div>
                <div class="casco-price-val">${priceText}</div>
                <div class="casco-stock-live-note ${stockInfo.badgeClass}">
                  ${stockInfo.noteText}
                </div>
              </div>
            </div>

            <div class="casco-card-actions">
              <button type="button" class="btn-casco-detail" onclick="CascosServiceApp.openDetail('${p.id}')" title="Ver existencias, fotos y ficha completa">
                👁️ Ficha & Stock
              </button>
              <button type="button" class="btn-casco-order-wa" onclick="CascosServiceApp.orderViaWhatsApp('${p.id}')">
                <span>💬</span> Pedir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openDetail(productId) {
    const item = this.catalog.find(it => it.id === productId);
    if (!item) return;

    this.activeProduct = item;
    this.activeDetailImage = item.image;
    
    // Auto-select first size with available stock
    if (item.sizes && item.sizes.length > 0) {
      const inStockSize = item.sizes.find(s => (typeof s.stock === 'number' ? s.stock > 0 : s.available));
      this.activeSize = inStockSize ? inStockSize.size : item.sizes[0].size;
    } else {
      this.activeSize = null;
    }

    this.renderDetailModal(item);
    const modal = document.getElementById('casco-detail-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeDetail() {
    const modal = document.getElementById('casco-detail-modal');
    if (modal) modal.classList.add('hidden');
    this.activeProduct = null;
  },

  selectDetailImage(imgUrl) {
    this.activeDetailImage = imgUrl;
    const mainImg = document.getElementById('casco-detail-main-img');
    if (mainImg) mainImg.src = imgUrl;

    document.querySelectorAll('.casco-thumb').forEach(thumb => {
      thumb.classList.toggle('active', thumb.dataset.img === imgUrl);
    });
  },

  selectDetailSize(size) {
    this.activeSize = size;
    document.querySelectorAll('.casco-size-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.size === size);
    });
    this.updateSizeFeedback();
  },

  updateSizeFeedback() {
    const feedbackEl = document.getElementById('casco-selected-size-feedback');
    if (!feedbackEl || !this.activeProduct) return;

    if (!this.activeProduct.sizes || this.activeProduct.sizes.length === 0) {
      feedbackEl.style.display = 'none';
      return;
    }

    const currentVariant = this.activeProduct.sizes.find(s => s.size === this.activeSize);
    if (!currentVariant) {
      feedbackEl.innerHTML = `<span>👆 Selecciona una talla para consultar existencias.</span>`;
      return;
    }

    const qty = typeof currentVariant.stock === 'number' ? currentVariant.stock : (currentVariant.available ? 1 : 0);
    if (qty > 0) {
      feedbackEl.className = 'casco-size-feedback has-stock';
      feedbackEl.innerHTML = `
        <span class="feedback-icon">🟢</span>
        <div>
          <strong>Talla ${currentVariant.size}: ${qty} ${qty === 1 ? 'unidad disponible' : 'unidades disponibles'}</strong> para entrega hoy en San Antonio del Táchira.
        </div>
      `;
    } else {
      feedbackEl.className = 'casco-size-feedback no-stock';
      feedbackEl.innerHTML = `
        <span class="feedback-icon">🟡</span>
        <div>
          <strong>Talla ${currentVariant.size}: Agotada en bodega inmediata.</strong> Puedes solicitarla por encargo express (despacho en 24-48h).
        </div>
      `;
    }
  },

  renderDetailModal(p) {
    const container = document.getElementById('casco-detail-card-content');
    if (!container) return;

    const priceText = this.formatPrice(p.price);
    const isMt = p.isMt || (p.vendor && p.vendor.toLowerCase().includes('mt'));
    const stockInfo = this.getStockInfo(p);

    const thumbnailsHtml = (p.images && p.images.length > 1) ? `
      <div class="casco-thumbnails-row">
        ${p.images.map(img => `
          <div class="casco-thumb ${this.activeDetailImage === img ? 'active' : ''}" data-img="${img}" onclick="CascosServiceApp.selectDetailImage('${img}')">
            <img src="${img}" alt="Vista">
          </div>
        `).join('')}
      </div>
    ` : '';

    const sizesHtml = (p.sizes && p.sizes.length > 0) ? `
      <div class="casco-detail-sizes-section">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
          <label style="font-size: 12px; font-weight: 800; color: #CBD5E1;">
            Selecciona tu Talla:
          </label>
          <span style="font-size: 11px; color: #94A3B8; font-weight: 600;">(Existencias por talla)</span>
        </div>
        <div class="casco-size-picker">
          ${p.sizes.map(s => {
            const qty = typeof s.stock === 'number' ? s.stock : (s.available ? 1 : 0);
            const inStock = qty > 0;
            const isSelected = this.activeSize === s.size;
            return `
              <button type="button" 
                class="casco-size-btn ${isSelected ? 'selected' : ''} ${!inStock ? 'is-out' : 'is-in'}" 
                data-size="${s.size}" 
                onclick="CascosServiceApp.selectDetailSize('${s.size}')"
                title="Talla ${s.size}: ${qty} disponibles">
                <span class="size-btn-name">${s.size}</span>
                <span class="size-btn-stock ${inStock ? 'in' : 'out'}">
                  ${inStock ? `${qty} unid.` : 'Agotada'}
                </span>
              </button>
            `;
          }).join('')}
        </div>
        <div id="casco-selected-size-feedback" class="casco-size-feedback">
          <!-- Dynamically populated -->
        </div>
      </div>
    ` : `
      <div class="casco-detail-single-stock">
        <span class="casco-inv-icon">📦</span>
        <div>
          <strong style="color: #FFF; font-size: 12.5px; display: block;">Disponibilidad de este producto:</strong>
          <span style="font-size: 11.5px; color: #94A3B8;">${stockInfo.detailStatus}</span>
        </div>
      </div>
    `;

    const certsHtml = (p.certifications && p.certifications.length > 0) ? `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px;">
        <strong style="color: #FFF; font-size: 12px; display: block; margin-bottom: 6px;">🛡️ Seguridad & Certificaciones Oficiales:</strong>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${p.certifications.map(c => `
            <span style="background: rgba(245, 158, 11, 0.15); border: 1px solid #F59E0B; color: #FCD34D; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 8px;">
              ${c}
            </span>
          `).join('')}
        </div>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="casco-detail-header">
        <div>
          <span style="font-size: 11px; color: #FDA4AF; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
            ${p.vendor} • ${p.categoryLabel}
          </span>
          <h4 style="margin: 2px 0 0 0; color: #FFF; font-size: 16px; font-weight: 900;">
            ${p.title}
          </h4>
        </div>
        <button type="button" class="cascos-close-btn" onclick="CascosServiceApp.closeDetail()">✕</button>
      </div>

      <div class="casco-detail-body">
        <div class="casco-gallery-main">
          <img id="casco-detail-main-img" src="${this.activeDetailImage || p.image}" alt="${p.title}">
        </div>

        ${thumbnailsHtml}

        <!-- Inventory Status Card -->
        <div class="casco-detail-inventory-card ${stockInfo.badgeClass}">
          <div class="casco-inv-header">
            <span class="casco-inv-icon">📦</span>
            <div style="flex: 1;">
              <div class="casco-inv-title">Disponibilidad en Bodega PediGochos</div>
              <div class="casco-inv-status">${stockInfo.detailStatus}</div>
            </div>
            <span class="casco-inv-badge ${stockInfo.badgeClass}">${stockInfo.badgeText}</span>
          </div>
        </div>

        <div style="display: flex; align-items: baseline; justify-content: space-between; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px 16px; border-radius: 14px;">
          <div>
            <span style="font-size: 11px; color: #6EE7B7; font-weight: 700; display: block;">Precio Final con Entrega en San Antonio:</span>
            <strong style="font-size: 24px; font-weight: 900; color: #10B981;">${priceText}</strong>
          </div>
          <span style="font-size: 11px; color: #6EE7B7; font-weight: 700;">✅ Entrega garantizada</span>
        </div>

        ${sizesHtml}
        ${certsHtml}

        <div>
          <strong style="color: #FFF; font-size: 13px; display: block; margin-bottom: 6px;">📝 Descripción del Producto:</strong>
          <p style="color: #94A3B8; font-size: 12.5px; line-height: 1.55; margin: 0; white-space: pre-line;">
            ${p.description || 'Casco certificado de alta resistencia con acabados aerodinámicos, ventilación avanzada e interior desmontable y lavable.'}
          </p>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 6px;">
          <button type="button" class="btn-casco-order-wa" style="padding: 14px; font-size: 14px;" onclick="CascosServiceApp.orderViaWhatsApp('${p.id}', CascosServiceApp.activeSize)">
            <span>💬</span> Solicitar y Coordinar Entrega por WhatsApp
          </button>
        </div>
      </div>
    `;

    this.updateSizeFeedback();
  },

  orderViaWhatsApp(productId, size = null) {
    const item = this.catalog.find(it => it.id === productId);
    if (!item) return;

    const chosenSize = size || this.activeSize || ((item.sizes && item.sizes.length > 0) ? item.sizes[0].size : 'Única');
    const matchedSize = (item.sizes || []).find(s => s.size === chosenSize);

    let stockText = '';
    if (matchedSize) {
      const qty = typeof matchedSize.stock === 'number' ? matchedSize.stock : (matchedSize.available ? 1 : 0);
      if (qty > 0) {
        stockText = `🟢 En Stock (${qty} unid. en talla ${chosenSize} listas para entrega)`;
      } else {
        stockText = `🟡 Bajo Pedido Express (Talla ${chosenSize} agotada en tienda)`;
      }
    } else {
      const stockInfo = this.getStockInfo(item);
      if (stockInfo.total > 0) {
        stockText = `🟢 En Stock (${stockInfo.total} unid. disponibles en almacén)`;
      } else {
        stockText = `🟡 Bajo Pedido Express`;
      }
    }

    const priceText = this.formatPrice(item.price);
    const certText = (item.certifications && item.certifications.length > 0) ? item.certifications.join(', ') : 'DOT / Homologado';

    const custName = (typeof localStorage !== 'undefined' && (localStorage.getItem('pedigochos_user_name') || localStorage.getItem('customer_name'))) || '';
    const custPhone = (typeof localStorage !== 'undefined' && (localStorage.getItem('pedigochos_user_phone') || localStorage.getItem('customer_phone'))) || '';

    const message = 
`🪖 *¡NUEVA SOLICITUD DE CASCO - PEDIGOCHOS RIDER!* 🏍️
━━━━━━━━━━━━━━━━━━━━━
📦 *Modelo:* ${item.title}
🏷️ *Marca:* ${item.vendor}
📁 *Categoría:* ${item.categoryLabel}
📏 *Talla Deseada:* *${chosenSize}*
📊 *Existencias:* *${stockText}*
💰 *Precio Final:* *${priceText}*
🛡️ *Certificaciones:* ${certText}
📸 *Foto de Referencia:* ${item.image}
━━━━━━━━━━━━━━━━━━━━━
👤 *Cliente:* ${custName || 'Cliente PediGochos'}
📱 *WhatsApp de Contacto:* ${custPhone || 'El de este chat'}
📍 *Destino de Entrega:* San Antonio del Táchira / Zona Frontera
━━━━━━━━━━━━━━━━━━━━━
💬 _Hola Central PediGochos, deseo solicitar este casco de PediGochos Rider con entrega a domicilio. Por favor confirmarme la disponibilidad de la talla y método de pago. ¡Gracias!_`;

    const waUrl = `https://wa.me/${this.officialWhatsApp}?text=${encodeURIComponent(message)}`;

    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.openWhatsAppUrl) {
      MarketplaceApp.openWhatsAppUrl(waUrl);
    } else {
      window.open(waUrl, '_blank');
    }

    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.showToast) {
      MarketplaceApp.showToast('🚀 Abriendo WhatsApp con los datos de tu casco...');
    }
  },

  renderModalMarkup() {
    if (document.getElementById('cascos-service-modal')) return;

    const modalHtml = `
      <div id="cascos-service-modal" class="cascos-service-modal hidden">
        <div class="cascos-service-container">
          
          <!-- Header -->
          <div class="cascos-header">
            <div class="cascos-header-left">
              <div class="cascos-logo-box">
                <img src="/images/services/pedigochos_cascos_logo.svg" alt="PediGochos Rider" onerror="this.src='/images/services/pedigochos_cascos_logo.svg'">
              </div>
              <div class="cascos-title-box">
                <h3>PediGochos Rider <span>🪖</span></h3>
                <p>Tienda Oficial MT Helmets • ECE 22.06 • Despacho a San Antonio</p>
              </div>
            </div>

            <div class="cascos-header-actions">
              <a href="https://wa.me/${this.officialWhatsApp}?text=${encodeURIComponent('Hola Central PediGochos, consulto sobre el catálogo de cascos y protección de PediGochos Rider.')}" target="_blank" rel="noopener noreferrer" class="cascos-wa-badge">
                <span>💬</span> WhatsApp Oficial
              </a>
              <button type="button" class="cascos-close-btn" onclick="CascosServiceApp.close()" title="Cerrar Catálogo">✕</button>
            </div>
          </div>

          <!-- Controls Bar -->
          <div class="cascos-controls-bar">
            <div class="cascos-search-currency-row">
              <div class="cascos-search-box">
                <span class="cascos-search-icon">🔍</span>
                <input type="text" id="cascos-search-input" placeholder="Buscar por modelo (Stinger, Atom 2, Revenge, Shaft, Kov...)" oninput="CascosServiceApp.handleSearch(this.value)">
              </div>

              <div class="cascos-currency-toggle">
                <button type="button" class="cascos-curr-btn ${this.selectedCurrency === 'COP' ? 'active' : ''}" data-curr="COP" onclick="CascosServiceApp.setCurrency('COP')">🇨🇴 COP</button>
                <button type="button" class="cascos-curr-btn ${this.selectedCurrency === 'USD' ? 'active' : ''}" data-curr="USD" onclick="CascosServiceApp.setCurrency('USD')">💵 USD</button>
                <button type="button" class="cascos-curr-btn ${this.selectedCurrency === 'VES' ? 'active' : ''}" data-curr="VES" onclick="CascosServiceApp.setCurrency('VES')">🇻🇪 Bs.</button>
              </div>
            </div>

            <!-- Category Filter Pills -->
            <div class="cascos-filter-pills" id="cascos-filter-pills-box">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- Notice Banner -->
          <div class="cascos-notice-banner">
            <div>
              <span>⚡ <strong>Catálogo en Vivo:</strong> Inventario oficial con garantía de autenticidad, certificación ECE 22.06 y entrega express a domicilio.</span>
            </div>
            <span id="cascos-results-count" style="font-weight: 800; color: #FFF; white-space: nowrap;">66 productos</span>
          </div>

          <!-- Products Grid Content Area -->
          <div class="cascos-content-area">
            <div class="cascos-grid" id="cascos-products-grid">
              <!-- Dynamically populated -->
            </div>
          </div>

        </div>
      </div>

      <!-- Detail Modal -->
      <div id="casco-detail-modal" class="casco-detail-modal hidden">
        <div class="casco-detail-card" id="casco-detail-card-content">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
};

window.CascosServiceApp = CascosServiceApp;

document.addEventListener('DOMContentLoaded', () => {
  CascosServiceApp.init();
});
