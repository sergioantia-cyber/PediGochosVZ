/* ==========================================================================
   El Retén del Casco - MT Helmets & Indumentaria Motera Module Logic
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

  getFilteredItems() {
    let items = this.catalog || [];

    // Filter by Category or Brand
    if (this.currentFilter === 'mt') {
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
    const totalMt = this.catalog.filter(it => it.isMt || (it.vendor && it.vendor.toLowerCase().includes('mt'))).length;
    const totalIntegrales = this.catalog.filter(it => it.category === 'integral').length;
    const totalAbatibles = this.catalog.filter(it => it.category === 'abatible').length;
    const totalAbiertos = this.catalog.filter(it => it.category === 'abierto').length;
    const totalLlantas = this.catalog.filter(it => it.category === 'llantas').length;
    const totalIndumentaria = this.catalog.filter(it => it.category === 'indumentaria').length;
    const totalAccesorios = this.catalog.filter(it => it.category === 'accesorios').length;

    const pills = [
      { key: 'all', label: '🌟 Todos', count: totalAll },
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
      const certBadgesHtml = (p.certifications || []).slice(0, 2).map(c => `
        <span class="casco-cert-badge ${c.includes('22.06') ? 'ece' : ''}">${c}</span>
      `).join('');

      const sizesHtml = (p.sizes || []).length > 0 ? `
        <div class="casco-sizes-row">
          <span class="casco-size-label">Tallas:</span>
          ${(p.sizes || []).slice(0, 4).map(s => `<span class="casco-size-pill">${s.size}</span>`).join('')}
          ${(p.sizes || []).length > 4 ? `<span style="font-size: 9.5px; color: #94A3B8; font-weight: 700;">+${p.sizes.length - 4}</span>` : ''}
        </div>
      ` : '';

      return `
        <div class="casco-card" id="card-${p.id}">
          <div class="casco-card-img-box" onclick="CascosServiceApp.openDetail('${p.id}')">
            <img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='https://retendelcasco.com/cdn/shop/files/Modo_de_aislamiento_6192cb98-c215-460f-af28-c73558f97f30.png?v=1776110226'">
            <span class="casco-brand-badge ${isMt ? 'mt-badge' : ''}">${p.vendor}</span>
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
                <div class="casco-price-note">+30 pesos incluidos</div>
              </div>
            </div>

            <div class="casco-card-actions">
              <button type="button" class="btn-casco-detail" onclick="CascosServiceApp.openDetail('${p.id}')" title="Ver fotos y ficha completa">
                👁️ Ficha
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
    this.activeSize = (item.sizes && item.sizes.length > 0) ? item.sizes[0].size : null;

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
  },

  renderDetailModal(p) {
    const container = document.getElementById('casco-detail-card-content');
    if (!container) return;

    const priceText = this.formatPrice(p.price);
    const isMt = p.isMt || (p.vendor && p.vendor.toLowerCase().includes('mt'));

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
      <div>
        <label style="font-size: 12px; font-weight: 800; color: #CBD5E1; display: block; margin-bottom: 6px;">
          Selecciona tu Talla:
        </label>
        <div class="casco-size-picker">
          ${p.sizes.map(s => `
            <button type="button" class="casco-size-btn ${this.activeSize === s.size ? 'selected' : ''}" data-size="${s.size}" onclick="CascosServiceApp.selectDetailSize('${s.size}')" ${!s.available ? 'disabled' : ''}>
              ${s.size} ${!s.available ? '(Agotada)' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    ` : '';

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

        <div style="display: flex; align-items: baseline; justify-content: space-between; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px 16px; border-radius: 14px;">
          <div>
            <span style="font-size: 11px; color: #6EE7B7; font-weight: 700; display: block;">Precio Final con Entrega en San Antonio:</span>
            <strong style="font-size: 24px; font-weight: 900; color: #10B981;">${priceText}</strong>
          </div>
          <span style="font-size: 11px; color: #CBD5E1; font-weight: 600;">+30 pesos de margen incluidos</span>
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
  },

  orderViaWhatsApp(productId, size = null) {
    const item = this.catalog.find(it => it.id === productId);
    if (!item) return;

    const chosenSize = size || this.activeSize || ((item.sizes && item.sizes.length > 0) ? item.sizes[0].size : 'Por coordinar');
    const priceText = this.formatPrice(item.price);
    const certText = (item.certifications && item.certifications.length > 0) ? item.certifications.join(', ') : 'DOT / Homologado';

    const custName = (typeof localStorage !== 'undefined' && (localStorage.getItem('pedigochos_user_name') || localStorage.getItem('customer_name'))) || '';
    const custPhone = (typeof localStorage !== 'undefined' && (localStorage.getItem('pedigochos_user_phone') || localStorage.getItem('customer_phone'))) || '';

    const message = 
`🪖 *¡NUEVA SOLICITUD DE CASCO - EL RETÉN DEL CASCO!* 🏍️
━━━━━━━━━━━━━━━━━━━━━
📦 *Modelo:* ${item.title}
🏷️ *Marca:* ${item.vendor}
📁 *Categoría:* ${item.categoryLabel}
📏 *Talla Deseada:* *${chosenSize}*
💰 *Precio Final:* *${priceText}* (+30 pesos incluidos)
🛡️ *Certificaciones:* ${certText}
📸 *Foto de Referencia:* ${item.image}
🔗 *Ficha Original:* ${item.urlOriginal}
━━━━━━━━━━━━━━━━━━━━━
👤 *Cliente:* ${custName || 'Cliente PediGochos'}
📱 *WhatsApp de Contacto:* ${custPhone || 'El de este chat'}
📍 *Destino de Entrega:* San Antonio del Táchira / Zona Frontera
━━━━━━━━━━━━━━━━━━━━━
💬 _Hola Central PediGochos, deseo solicitar este casco de El Retén del Casco con entrega a domicilio. Por favor confirmarme la disponibilidad de la talla y método de pago. ¡Gracias!_`;

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
                <img src="/images/services/retendelcasco_logo.png" alt="El Retén del Casco" onerror="this.src='https://retendelcasco.com/cdn/shop/files/Modo_de_aislamiento_6192cb98-c215-460f-af28-c73558f97f30.png?v=1776110226'">
              </div>
              <div class="cascos-title-box">
                <h3>El Retén del Casco <span>🪖</span></h3>
                <p>Distribuidor Oficial MT Helmets • ECE 22.06 • Despacho a San Antonio</p>
              </div>
            </div>

            <div class="cascos-header-actions">
              <a href="https://wa.me/${this.officialWhatsApp}?text=${encodeURIComponent('Hola Central PediGochos, consulto sobre el catálogo de cascos MT de El Retén del Casco.')}" target="_blank" rel="noopener noreferrer" class="cascos-wa-badge">
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
              <span>⚡ <strong>Catálogo en Vivo:</strong> Todos los precios reflejan el inventario oficial sumando <strong>+30 pesos</strong> de margen y logística express.</span>
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
