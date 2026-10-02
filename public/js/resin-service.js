/* ==========================================================================
   Llaveros y Arte en Resina ("Shelli Art") - Logic & Customizer Studio
   PediGochos Specialized Services Module
   ========================================================================== */

const ResinServiceApp = {
  activeQuote: null,
  ws: null,
  resinWhatsAppNumber: '573227949751',
  resinWhatsAppDisplay: '+57 322 794 9751',

  settings: {
    letterBasePriceUsd: 4.5,
    photoBasePriceUsd: 5.0,
    nfcExtraUsd: 2.0,
    charmExtraUsd: 1.0,
    resinWhatsApp: '573227949751',
    resinWhatsAppDisplay: '+57 322 794 9751',
    samplePhotos: [
      { id: 'sample-1', title: 'Pareja Romántica', url: '/images/services/shelliart_banner.jpg' },
      { id: 'sample-2', title: 'Mascota Querida', url: '/images/services/llavero_3d_pedigochos.jpg' }
    ]
  },

  shapes: [
    { id: 'rectangle', name: 'Plaquita Polaroid', icon: '🔲', desc: 'Marco vertical con foto' },
    { id: 'circle', name: 'Círculo Medalla', icon: '⚪', desc: 'Redondo clásico 1:1' },
    { id: 'heart', name: 'Corazón Romántico', icon: '💖', desc: 'Parejas y aniversarios' },
    { id: 'hexagon', name: 'Hexágono Chic', icon: '🔷', desc: 'Geométrico moderno' },
    { id: 'dogtag', name: 'Placa Dog Tag', icon: '🏷️', desc: 'Estilo militar urbano' }
  ],

  borderEffects: [
    { id: 'gold_flakes', name: 'Borde Pan de Oro 24K', desc: 'Copos dorados brillantes' },
    { id: 'silver_flakes', name: 'Borde Pan de Plata', desc: 'Copos plateados glaciares' },
    { id: 'glitter', name: 'Borde Glitter Rosa/Oro', desc: 'Destellos holográficos' },
    { id: 'crystal', name: 'Resina Cristalina Pura', desc: 'Transparencia total sin borde' }
  ],

  backOptions: [
    { id: 'photo', name: '2da Foto Personalizada', icon: '📷', desc: 'Subir otra foto para el reverso' },
    { id: 'spotify', name: 'Onda / Canción Spotify', icon: '🎵', desc: 'Canción y artista con barras musicales' },
    { id: 'phrase', name: 'Dedicatoria / Frase', icon: '✍️', desc: 'Frase o fecha en vinil caligráfico' },
    { id: 'glitter', name: 'Fondo Glitter & Oro', icon: '✨', desc: 'Fondo artesanal brillante' }
  ],

  nfcTypes: [
    { id: 'instagram', name: 'Instagram', icon: '📸', placeholder: 'https://instagram.com/tu_usuario' },
    { id: 'spotify', name: 'Canción Spotify', icon: '🎵', placeholder: 'https://open.spotify.com/track/...' },
    { id: 'whatsapp', name: 'WhatsApp Directo', icon: '💬', placeholder: 'https://wa.me/57...' },
    { id: 'web', name: 'Web / Portafolio', icon: '🌐', placeholder: 'https://tu-sitio.com' }
  ],

  alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],

  colors: [
    { name: 'Rosa Pastel', hex: '#F472B6', textColor: '#FFF' },
    { name: 'Azul Rey', hex: '#2563EB', textColor: '#FFF' },
    { name: 'Negro Ónix', hex: '#18181B', textColor: '#FFF' },
    { name: 'Blanco Perla', hex: '#F8FAFC', textColor: '#000' },
    { name: 'Lila Mágico', hex: '#C084FC', textColor: '#FFF' },
    { name: 'Verde Menta', hex: '#34D399', textColor: '#000' },
    { name: 'Amarillo Sol', hex: '#FACC15', textColor: '#000' },
    { name: 'Rojo Pasión', hex: '#EF4444', textColor: '#FFF' },
    { name: 'Dorado Silk', hex: '#EAB308', textColor: '#000' },
    { name: 'Esmeralda', hex: '#059669', textColor: '#FFF' }
  ],

  styles: [
    { id: 'bicolor', name: 'Bicolor con Glitter & Hoja de Oro', desc: 'Mitad color sólido y mitad cristal transparente con destellos' },
    { id: 'gold_flakes', name: 'Hoja de Oro 24K Encapsulada', desc: 'Elegante baño de láminas doradas flotando en resina' },
    { id: 'glitter_full', name: 'Glitter Holográfico Completo', desc: 'Brillo ultra reflectante en toda la pieza' },
    { id: 'silver_flakes', name: 'Hoja de Plata Glacial', desc: 'Copos de plata con acabado moderno y frío' },
    { id: 'flowers', name: 'Mini Flores Silvestres', desc: 'Flores secas naturales prensadas' },
    { id: 'crystal', name: 'Resina Cristalina Pulida', desc: 'Transparencia óptica con sutil toque perlado' }
  ],

  tassels: [
    { name: 'Sin Borla', hex: 'none' },
    { name: 'Rosa Pastel', hex: '#F472B6' },
    { name: 'Celeste Suave', hex: '#38BDF8' },
    { name: 'Menta Fresco', hex: '#34D399' },
    { name: 'Lila Claro', hex: '#C084FC' },
    { name: 'Negro Elegante', hex: '#18181B' },
    { name: 'Dorado Ocre', hex: '#EAB308' },
    { name: 'Durazno Cálido', hex: '#FB923C' },
    { name: 'Mostaza Chic', hex: '#CA8A04' }
  ],

  charms: [
    { id: 'none', name: 'Ninguno', icon: '❌', extraUsd: 0.0 },
    { id: 'corazon', name: 'Mini Corazón Esmaltado', icon: '💖', extraUsd: 0.8 },
    { id: 'huesito', name: 'Mini Huesito Mascota', icon: '🦴', extraUsd: 0.8 },
    { id: 'estrella', name: 'Mini Estrella Dorada', icon: '⭐', extraUsd: 0.8 },
    { id: 'patita', name: 'Mini Patita Pet', icon: '🐾', extraUsd: 0.8 },
    { id: 'inicial', name: 'Medallón con Inicial', icon: '🔤', extraUsd: 0.8 }
  ],

  // Current customization state
  state: {
    productType: 'photo', // 'photo' | 'letter'
    activeTab: 'shape', // 'shape' | 'photo' | 'nfc' | 'finishes'
    isFlipped: false, // false: front, true: back

    // Photo Transform & Framing Shape for each side:
    photoFrontTransform: { x: 0, y: 0, scale: 1.0, isSelected: false },
    photoBackTransform: { x: 0, y: 0, scale: 1.0, isSelected: false },
    photoFrontShape: 'full', // 'full' | 'polaroid' | 'circle' | 'heart' | 'square'
    photoBackShape: 'full',  // 'full' | 'polaroid' | 'circle' | 'heart' | 'square'

    // Photo Keychain properties:
    photoShape: 'rectangle',
    photoShapeName: 'Plaquita Polaroid',
    photoFrontUrl: '', // uploaded data URL
    photoBorderEffect: 'gold_flakes',
    photoBackType: 'photo', // 'photo' | 'spotify' | 'phrase' | 'glitter'
    photoBackUrl: '', // uploaded data URL for 2nd photo
    photoBackSpotifySong: '',
    photoBackSpotifyArtist: '',
    photoBackPhrase: '',

    // NFC Smart Chip:
    hasNfc: false,
    nfcType: 'instagram',
    nfcUrl: '',

    // Letter Keychain properties:
    letter: 'M',
    styleId: 'bicolor',
    baseColorHex: '#F472B6',
    baseColorName: 'Rosa Pastel',
    inclusions: 'Bicolor con Glitter & Hoja de Oro',
    customName: '',

    // Shared finishes:
    tasselName: 'Rosa Pastel',
    tasselHex: '#F472B6',
    hardware: 'gold', // 'gold' | 'silver'
    extraCharmId: 'none',
    quantity: 1,

    // Delivery fields: ZERO default values!
    customerName: '',
    customerPhone: '',
    deliveryCity: '',
    deliveryAddress: '',
    deliveryReference: '',
    paymentMethod: '',
    gps: null
  },

  async init() {
    await this.loadSettings();
    this.setupWebSocket();
    this.checkHashRoute();
    window.addEventListener('hashchange', () => this.checkHashRoute());
  },

  async loadSettings() {
    try {
      const res = await fetch('/api/resin-services/settings');
      if (res.ok) {
        const data = await res.json();
        this.settings = { ...this.settings, ...data };
        if (data.resinWhatsApp) {
          this.resinWhatsAppNumber = data.resinWhatsApp;
          this.resinWhatsAppDisplay = data.resinWhatsAppDisplay || data.resinWhatsApp;
        }
      }
    } catch(e) {
      console.warn('Could not load resin settings:', e);
    }
  },

  checkHashRoute() {
    const hash = window.location.hash || '';
    if (hash === '#servicios/resina' || hash.startsWith('#servicios/resina')) {
      this.open();
    }
  },

  setupWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'RESIN_QUOTE_MESSAGE' && this.activeQuote && data.quoteId === this.activeQuote.id) {
            this.appendChatMessage(data.message);
          } else if (data.type === 'RESIN_QUOTE_UPDATE' && this.activeQuote && data.quote.id === this.activeQuote.id) {
            this.activeQuote = data.quote;
            this.updateFichaTecnica(data.quote);
          } else if (data.type === 'RESIN_SETTINGS_UPDATE' && data.settings) {
            this.settings = { ...this.settings, ...data.settings };
            this.updateVisualPreview();
          }
        } catch(e) {
          console.warn('WS resin message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        setTimeout(() => this.setupWebSocket(), 5000);
      };
    } catch(e) {
      console.warn('WS resin connect error:', e);
    }
  },

  open() {
    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.updateFloatingAndHeaderSos) {
      MarketplaceApp.updateFloatingAndHeaderSos(true);
    }
    let modal = document.getElementById('resin-service-modal');
    if (!modal) {
      this.renderMainModalMarkup();
      modal = document.getElementById('resin-service-modal');
    }
    if (modal) {
      modal.classList.remove('hidden');
      window.history.pushState({ modal: 'resin-service' }, '', '#servicios/resina');
      this.updateVisualPreview();
      this.updateGuideBubble();
      this.initTransformEvents();
      this.init3dPhysicsTilt();
    }
  },

  close() {
    const modal = document.getElementById('resin-service-modal');
    if (modal) modal.classList.add('hidden');
    this.closeDeliveryDrawer();
    if (window.location.hash.startsWith('#servicios/resina')) {
      window.history.pushState(null, '', window.location.pathname);
    }
    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.updateFloatingAndHeaderSos && !MarketplaceApp.selectedEstablishment) {
      MarketplaceApp.updateFloatingAndHeaderSos(false);
    }
  },

  // Switch between Photo Keychain & Letter Keychain
  setProductType(type) {
    this.state.productType = type;
    const btnPhoto = document.getElementById('btn-mode-photo');
    const btnLetter = document.getElementById('btn-mode-letter');
    if (btnPhoto) btnPhoto.classList.toggle('active', type === 'photo');
    if (btnLetter) btnLetter.classList.toggle('active', type === 'letter');

    // Switch view content
    this.renderActiveTabContent();
    this.updateVisualPreview();
    this.updateGuideBubble();
  },

  // Switch active control tab (Shape, Photos, NFC, Finishes)
  setActiveTab(tab) {
    this.state.activeTab = tab;
    document.querySelectorAll('.resin-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    this.renderActiveTabContent();
  },

  // Toggle 3D card flip between Front and Back
  toggleFlip() {
    this.state.isFlipped = !this.state.isFlipped;
    const isBack = this.state.isFlipped;
    const inner = document.getElementById('keychain-flip-inner');
    const sideLbl = document.getElementById('lbl-flip-side');
    const sideBadge = document.getElementById('resin-side-badge');
    const uploadLbl = document.getElementById('lbl-stage-upload-photo');
    const stageTitle = document.getElementById('stage-shape-title');

    if (inner) {
      inner.style.transition = 'transform 0.7s cubic-bezier(0.34, 1.25, 0.64, 1)';
      inner.classList.toggle('is-flipped', isBack);
      inner.style.transform = isBack ? 'rotateY(180deg) rotateX(0deg)' : 'rotateY(0deg) rotateX(0deg)';
    }

    if (sideLbl) {
      sideLbl.textContent = isBack ? 'Volver al Frente' : 'Girar al Reverso';
    }
    if (sideBadge) {
      sideBadge.textContent = isBack ? '🔄 Reverso' : '✨ Frente';
    }
    if (uploadLbl) {
      const hasPhoto = isBack ? !!this.state.photoBackUrl : !!this.state.photoFrontUrl;
      uploadLbl.textContent = isBack
        ? (hasPhoto ? 'Cambiar Foto Reverso' : 'Agregar Foto Reverso')
        : (hasPhoto ? 'Cambiar Foto Frente' : 'Agregar Foto Frente');
    }
    if (stageTitle) {
      stageTitle.textContent = isBack ? 'Forma Foto (Reverso):' : 'Forma Foto (Frente):';
    }

    this.updateVisualPreview();
    this.updateGuideBubble();

    if (this.state.activeTab === 'photo') {
      this.renderActiveTabContent();
    }
  },

  updateGuideBubble() {
    const bubble = document.getElementById('resin-guide-bubble');
    if (!bubble) return;

    const isBack = this.state.isFlipped;
    const hasFront = !!this.state.photoFrontUrl;
    const hasBack = !!this.state.photoBackUrl;

    const stepBadge = document.getElementById('guide-bubble-step-badge');
    const title = document.getElementById('guide-bubble-title');
    const desc = document.getElementById('guide-bubble-desc');
    const flipBtnText = document.getElementById('btn-guide-flip-text');
    const statusFront = document.getElementById('status-front-photo');
    const statusBack = document.getElementById('status-back-photo');

    if (statusFront) {
      statusFront.className = `badge-photo-saved ${hasFront ? 'saved' : ''}`;
      statusFront.textContent = hasFront ? '✅ Frente: Guardada' : '📷 Frente: Pendiente';
    }
    if (statusBack) {
      const isPhotoBack = this.state.photoBackType === 'photo';
      statusBack.className = `badge-photo-saved ${hasBack ? 'saved' : ''}`;
      statusBack.textContent = hasBack ? '✅ Reverso: Guardada' : (isPhotoBack ? '📷 Reverso: Pendiente' : '✨ Reverso: Arte');
    }

    if (!isBack) {
      if (stepBadge) stepBadge.textContent = 'Paso 1 de 2: Foto Frontal';
      if (title) title.textContent = hasFront ? '¡Foto frontal lista! Ahora gira el llavero ➔' : '1º Elige la foto de este lado (Frente)';
      if (desc) {
        desc.innerHTML = hasFront 
          ? 'Tu foto frontal ya está colocada. Haz clic en <strong>"Girar para Foto Trasera"</strong> para personalizar el reverso. <em>(¡Esta foto se mantendrá siempre guardada!)</em>.'
          : 'Toca la vista previa para agregar y acomodar tu primera foto. Luego gira el llavero 🔄 para agregar la foto trasera. <em>(¡Ambas fotos se mantienen guardadas!)</em>';
      }
      if (flipBtnText) flipBtnText.textContent = '🔄 Girar para Foto Trasera';
    } else {
      if (stepBadge) stepBadge.textContent = 'Paso 2 de 2: Foto Trasera (Reverso)';
      if (title) title.textContent = hasBack ? '¡Ambas fotos están listas y guardadas!' : '2º Ahora personaliza la cara trasera (Reverso)';
      if (desc) {
        desc.innerHTML = hasBack
          ? '¡Excelente! Tienes ambas fotos configuradas en resina 3D. Puedes girar cuantas veces desees para revisarlas.'
          : '¡Tu foto del frente sigue 100% guardada! Ahora toca aquí para subir la foto trasera, dedicatoria o Spotify.';
      }
      if (flipBtnText) flipBtnText.textContent = '🔄 Volver al Frente';
    }
  },

  init3dPhysicsTilt() {
    if (this._tiltInitialized) return;
    this._tiltInitialized = true;

    const container = document.getElementById('keychain-flip-container');
    const inner = document.getElementById('keychain-flip-inner');
    const shadow = document.getElementById('keychain-3d-shadow');
    if (!container || !inner) return;

    let rafId = null;

    const onPointerMove = (e) => {
      if (this._isDraggingPhoto || this._isResizingPhoto) return;

      const rect = container.getBoundingClientRect();
      const clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length ? e.touches[0].clientY : e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const normX = Math.max(-1, Math.min(1, (x - centerX) / centerX));
      const normY = Math.max(-1, Math.min(1, (y - centerY) / centerY));

      const rotX = -normY * 13;
      const rotY = normX * 16;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const baseFlip = this.state.isFlipped ? 180 : 0;
        inner.style.transition = 'transform 0.08s ease-out';
        inner.style.transform = `rotateY(${baseFlip + rotY}deg) rotateX(${rotX}deg)`;
        if (shadow) {
          shadow.style.transition = 'transform 0.08s ease-out';
          shadow.style.transform = `translateX(${rotY * 1.5}px) translateY(${rotX * 0.7}px) scale(${1 - Math.abs(rotX)/90})`;
        }
      });
    };

    const onPointerLeave = () => {
      if (rafId) cancelAnimationFrame(rafId);
      const baseFlip = this.state.isFlipped ? 180 : 0;
      inner.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.25, 0.64, 1)';
      inner.style.transform = `rotateY(${baseFlip}deg) rotateX(0deg)`;
      if (shadow) {
        shadow.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.25, 0.64, 1)';
        shadow.style.transform = `scale(${this.state.isFlipped ? 0.92 : 1})`;
      }
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mouseleave', onPointerLeave);
    container.addEventListener('touchmove', onPointerMove, { passive: true });
    container.addEventListener('touchend', onPointerLeave);
  },

  setShape(shapeId) {
    this.state.photoShape = shapeId;
    const shapeObj = this.shapes.find(s => s.id === shapeId);
    if (shapeObj) this.state.photoShapeName = shapeObj.name;
    document.querySelectorAll('.resin-shape-card').forEach(c => {
      c.classList.toggle('active', c.dataset.shape === shapeId);
    });
    this.updateVisualPreview();
  },

  handleFrontPhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      this.state.photoFrontUrl = evt.target.result;
      this.updateVisualPreview();
      this.updateGuideBubble();
      this.renderActiveTabContent();
    };
    reader.readAsDataURL(file);
  },

  setSampleFrontPhoto(url) {
    this.state.photoFrontUrl = url;
    this.updateVisualPreview();
    this.updateGuideBubble();
    this.renderActiveTabContent();
  },

  setBorderEffect(effId) {
    this.state.photoBorderEffect = effId;
    document.querySelectorAll('.border-effect-card').forEach(c => {
      c.classList.toggle('active', c.dataset.effect === effId);
    });
    this.updateVisualPreview();
  },

  setBackType(typeId) {
    this.state.photoBackType = typeId;
    document.querySelectorAll('.back-type-card').forEach(c => {
      c.classList.toggle('active', c.dataset.backtype === typeId);
    });
    // Auto flip to back so user sees what they're configuring!
    if (!this.state.isFlipped) {
      this.toggleFlip();
    } else {
      this.renderActiveTabContent();
      this.updateVisualPreview();
      this.updateGuideBubble();
    }
  },

  handleBackPhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      this.state.photoBackUrl = evt.target.result;
      this.updateVisualPreview();
      this.updateGuideBubble();
      this.renderActiveTabContent();
    };
    reader.readAsDataURL(file);
  },

  handleBackSpotifySong(val) {
    this.state.photoBackSpotifySong = val;
    this.updateVisualPreview();
  },

  handleBackSpotifyArtist(val) {
    this.state.photoBackSpotifyArtist = val;
    this.updateVisualPreview();
  },

  handleBackPhrase(val) {
    this.state.photoBackPhrase = val;
    this.updateVisualPreview();
  },

  toggleNfc(checked) {
    this.state.hasNfc = checked;
    this.updateVisualPreview();
    this.renderActiveTabContent();
  },

  setNfcType(typeId) {
    this.state.nfcType = typeId;
    this.renderActiveTabContent();
  },

  handleNfcUrl(val) {
    this.state.nfcUrl = val.trim();
  },

  setLetter(letter) {
    this.state.letter = letter.toUpperCase();
    document.querySelectorAll('.btn-letter-pick').forEach(b => {
      b.classList.toggle('active', b.textContent.trim() === this.state.letter);
    });
    const lbl = document.getElementById('lbl-active-letter');
    if (lbl) lbl.textContent = this.state.letter;
    this.updateVisualPreview();
  },

  setStyle(styleId) {
    this.state.styleId = styleId;
    document.querySelectorAll('.resin-style-card').forEach(c => c.classList.remove('active'));
    const target = document.getElementById(`style-card-${styleId}`);
    if (target) target.classList.add('active');

    const styleObj = this.styles.find(s => s.id === styleId);
    if (styleObj) this.state.inclusions = styleObj.name;
    this.updateVisualPreview();
  },

  setColor(hex, name) {
    this.state.baseColorHex = hex;
    this.state.baseColorName = name;
    document.querySelectorAll('[id^="color-pill-"]').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`color-pill-${hex.replace('#','')}`);
    if (target) target.classList.add('active');
    const lbl = document.getElementById('lbl-active-color');
    if (lbl) lbl.textContent = name;
    this.updateVisualPreview();
  },

  setTassel(hex, name) {
    this.state.tasselHex = hex;
    this.state.tasselName = name;
    document.querySelectorAll('[id^="tassel-pill-"]').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`tassel-pill-${hex.replace('#','')}`);
    if (target) target.classList.add('active');
    const lbl = document.getElementById('lbl-active-tassel');
    if (lbl) lbl.textContent = name;
    this.updateVisualPreview();
  },

  setHardware(metal) {
    this.state.hardware = metal;
    const goldBtn = document.getElementById('btn-metal-gold');
    const silverBtn = document.getElementById('btn-metal-silver');
    if (goldBtn) goldBtn.classList.toggle('active', metal === 'gold');
    if (silverBtn) silverBtn.classList.toggle('active', metal === 'silver');
    this.updateVisualPreview();
  },

  setCharm(charmId) {
    this.state.extraCharmId = charmId;
    document.querySelectorAll('[id^="charm-pill-"]').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`charm-pill-${charmId}`);
    if (target) target.classList.add('active');
    this.updateVisualPreview();
  },

  handleCustomNameInput(val) {
    this.state.customName = val.trim();
    this.updateVisualPreview();
  },

  calculatePricing() {
    return {
      isQuote: true,
      statusText: 'Bajo Cotización Previa',
      basePrice: 0,
      nfcPrice: 0,
      charmPrice: 0,
      secondPhotoPrice: 0,
      totalUsd: 0,
      totalCop: 0,
      totalBs: 0
    };
  },

  // =========================================================================
  // Render Main Layout (Split Studio: Left/Top Stage, Right/Bottom Controls)
  // =========================================================================
  renderMainModalMarkup() {
    const modal = document.createElement('div');
    modal.id = 'resin-service-modal';
    modal.className = 'resin-service-modal hidden';
    modal.innerHTML = `
      <!-- Header -->
      <header class="resin-header">
        <div class="resin-header-brand">
          <span class="resin-brand-icon">✨</span>
          <div>
            <h2>Shelli Art</h2>
            <p>Llaveros Fotográficos & Letras Personalizadas</p>
          </div>
        </div>
        <button type="button" class="resin-close-btn" onclick="ResinServiceApp.close()" title="Cerrar">✕</button>
      </header>

      <!-- Main Container: Split Studio Layout -->
      <div class="resin-container">
        <div class="resin-studio-grid">

          <!-- Left / Sticky Column: Live 3D Keychain Preview Stage -->
          <div class="resin-studio-stage-col">
            <div class="resin-preview-stage">
              <div class="resin-stage-top-bar">
                <span class="resin-live-tag">🟢 Vista Previa 3D en Vivo</span>
                <span class="resin-side-badge" id="resin-side-badge">✨ Frente</span>
              </div>

              <!-- Interactive Step Guide Bubble (Compact & Clear) -->
              <div class="resin-guide-bubble" id="resin-guide-bubble">
                <div class="guide-bubble-compact-header">
                  <div class="guide-bubble-info-block">
                    <div style="display: flex; align-items: center; gap: 5px;">
                      <span class="guide-bubble-avatar">💡</span>
                      <strong id="guide-bubble-title" style="font-size: 11px; color: #FFF;">1º Elige foto de este lado (Frente)</strong>
                      <span class="guide-bubble-step-badge" id="guide-bubble-step-badge" style="font-size: 8.5px; padding: 1px 6px;">Paso 1/2</span>
                    </div>
                    <p id="guide-bubble-desc" style="margin: 2px 0 0 0; font-size: 9.5px; color: #CBD5E1; line-height: 1.25;">
                      Toca la vista previa para colocar tu foto. Al girar 🔄 ambas fotos se mantienen guardadas.
                    </p>
                  </div>
                  <button type="button" class="btn-guide-flip" id="btn-guide-flip" onclick="ResinServiceApp.toggleFlip()">
                    <span id="btn-guide-flip-text">🔄 Girar para Foto Trasera</span>
                  </button>
                </div>
                <div class="guide-bubble-photos-status" id="guide-bubble-photos-status" style="margin-top: 5px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
                  <span id="status-front-photo" class="badge-photo-saved">📷 Frente: Pendiente</span>
                  <span id="guide-bubble-preserve-pill" style="font-size: 8.5px; color: #34D399; font-weight: 800;">🔒 Tus fotos se mantienen al girar</span>
                  <span id="status-back-photo" class="badge-photo-saved">📷 Reverso: Pendiente</span>
                </div>
              </div>

              <!-- 3D Flip Card Assembly Wrapper with Physics / Realism -->
              <div class="keychain-flip-container" id="keychain-flip-container">
                <div class="keychain-flip-inner" id="keychain-flip-inner">
                  
                  <!-- Front Face -->
                  <div class="keychain-flip-front">
                    <svg id="resin-keychain-svg" viewBox="0 0 340 410" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
                      <!-- Filled dynamically in updateVisualPreview -->
                    </svg>
                  </div>

                  <!-- Back Face -->
                  <div class="keychain-flip-back">
                    <svg id="resin-keychain-svg-back" viewBox="0 0 340 410" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
                      <!-- Filled dynamically in updateVisualPreview -->
                    </svg>
                  </div>

                </div>
              </div>

              <!-- Realistic 3D Floor Shadow -->
              <div class="keychain-3d-shadow" id="keychain-3d-shadow"></div>

              <!-- Interactive Action Controls right beside/under preview -->
              <div class="resin-stage-action-bar">
                <button type="button" class="btn-stage-upload-photo" id="btn-stage-upload-photo" onclick="ResinServiceApp.triggerPhotoUpload()">
                  <span id="icon-stage-upload-photo">📸</span> <span id="lbl-stage-upload-photo">Agregar Foto Frente</span>
                </button>
                <button type="button" class="btn-flip-keychain" id="btn-flip-keychain" onclick="ResinServiceApp.toggleFlip()">
                  <span>🔄</span> <span id="lbl-flip-side">Girar al Reverso</span>
                </button>
                <div class="resin-stage-zoom-group" id="resin-stage-zoom-group">
                  <button type="button" class="btn-stage-zoom" onclick="ResinServiceApp.adjustPhotoScale(-0.15)" title="Reducir">➖</button>
                  <button type="button" class="btn-stage-zoom" onclick="ResinServiceApp.adjustPhotoScale(0.15)" title="Aumentar">➕</button>
                  <button type="button" class="btn-stage-zoom" onclick="ResinServiceApp.resetPhotoTransform()" title="Centrar">↺</button>
                </div>
                <button type="button" class="btn-stage-done-edit" id="btn-stage-done-edit" style="display: none;" onclick="ResinServiceApp.deselectPhoto()">
                  <span>✓</span> Fijar Foto
                </button>
              </div>

              <!-- Quick Photo Shape Selector on Preview Stage -->
              <div class="resin-stage-shape-chips" id="resin-stage-shape-chips">
                <span class="chips-title" id="stage-shape-title">Forma Foto (Frente):</span>
                <button type="button" class="chip-shape-btn active" data-shape="full" onclick="ResinServiceApp.setPhotoFramingShape('full')">🔲 Molde</button>
                <button type="button" class="chip-shape-btn" data-shape="polaroid" onclick="ResinServiceApp.setPhotoFramingShape('polaroid')">📸 Polaroid</button>
                <button type="button" class="chip-shape-btn" data-shape="circle" onclick="ResinServiceApp.setPhotoFramingShape('circle')">⭕ Círculo</button>
                <button type="button" class="chip-shape-btn" data-shape="heart" onclick="ResinServiceApp.setPhotoFramingShape('heart')">💖 Corazón</button>
                <button type="button" class="chip-shape-btn" data-shape="square" onclick="ResinServiceApp.setPhotoFramingShape('square')">⏹️ Cuadrado</button>
              </div>

              <input type="file" id="resin-direct-photo-input" accept="image/*" style="display: none;" onchange="ResinServiceApp.handleDirectPhotoUpload(event)">
            </div>
          </div>

          <!-- Right / Scrollable Column: Customization Controls Pane -->
          <div class="resin-studio-controls-col">
            
            <!-- Mode Switcher: Photo & NFC vs Initial Letter -->
            <div class="resin-mode-switcher">
              <button type="button" class="resin-mode-btn active" id="btn-mode-photo" onclick="ResinServiceApp.setProductType('photo')">
                <span>📸</span> Llavero Personalizado
              </button>
              <button type="button" class="resin-mode-btn" id="btn-mode-letter" onclick="ResinServiceApp.setProductType('letter')">
                <span>🔤</span> Llavero de Inicial (Letra)
              </button>
            </div>

            <!-- Tabs Navigation Bar -->
            <div class="resin-nav-tabs-bar" id="resin-nav-tabs-bar">
              <button type="button" class="resin-tab-btn active" data-tab="shape" onclick="ResinServiceApp.setActiveTab('shape')">
                <span>🔲</span> 1. Forma & Molde
              </button>
              <button type="button" class="resin-tab-btn" data-tab="photo" onclick="ResinServiceApp.setActiveTab('photo')">
                <span>📸</span> 2. Fotos & Caras
              </button>
              <button type="button" class="resin-tab-btn" data-tab="nfc" onclick="ResinServiceApp.setActiveTab('nfc')">
                <span>📶</span> 3. Chip NFC
              </button>
              <button type="button" class="resin-tab-btn" data-tab="finishes" onclick="ResinServiceApp.setActiveTab('finishes')">
                <span>✨</span> 4. Borla & Herrajes
              </button>
            </div>

            <!-- Tab Content Dynamic Container -->
            <div id="resin-tab-content-area">
              <!-- Rendered dynamically -->
            </div>

          </div>

        </div>
      </div>

      <!-- Fixed Bottom Price & Delivery Drawer Trigger Bar -->
      <footer class="resin-bottom-bar">
        <div class="resin-bottom-pricing">
          <span class="resin-price-total" id="resin-total-usd">🎨 Bajo Cotización Previa</span>
          <span class="resin-price-cop" id="resin-total-cop">Presupuesto personalizado según diseño, acabados y fotos</span>
        </div>

        <div class="resin-bottom-actions">
          <button type="button" class="btn-resin-order-wa-full" onclick="ResinServiceApp.openDeliveryDrawer()">
            <span>Solicitar Cotización</span> <span>➔</span>
          </button>
        </div>
      </footer>

      <!-- Separate Delivery & Location Drawer Modal (Clean / Zero Defaults) -->
      <div id="resin-delivery-drawer" class="resin-delivery-drawer" onclick="if(event.target === this) ResinServiceApp.closeDeliveryDrawer()">
        <div class="resin-delivery-sheet">
          <div class="resin-delivery-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" onclick="ResinServiceApp.closeDeliveryDrawer()" style="background: none; border: none; color: #FDA4AF; font-size: 16px; cursor: pointer; font-weight: 800;">← Volver</button>
              <strong style="color: #FFF; font-size: 14px;">📦 Datos de Entrega & Despacho</strong>
            </div>
            <button type="button" onclick="ResinServiceApp.closeDeliveryDrawer()" style="background: rgba(255,255,255,0.08); border: none; color: #FFF; width: 28px; height: 28px; border-radius: 50%; font-size: 14px; cursor: pointer;">✕</button>
          </div>

          <div class="resin-delivery-body">
            <!-- Order Summary Banner -->
            <div id="resin-delivery-summary-box" style="background: rgba(244, 114, 182, 0.1); border: 1px solid rgba(244, 114, 182, 0.3); border-radius: 14px; padding: 12px; font-size: 12px; color: #E2E8F0;">
              <!-- Filled dynamically in openDeliveryDrawer -->
            </div>

            <!-- Customer Inputs: Completely Empty / Clean for Google & Browser Autofill -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">TU NOMBRE Y APELLIDO *</label>
                <input type="text" class="resin-input-text" id="input-resin-customer-name" placeholder="Escribe tu nombre..." autocomplete="name" value="">
              </div>
              <div>
                <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">TELÉFONO / WHATSAPP *</label>
                <input type="tel" class="resin-input-text" id="input-resin-customer-phone" placeholder="Ej. 0414... / 320..." autocomplete="tel" value="">
              </div>
            </div>

            <div>
              <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">CIUDAD O MUNICIPIO DE ENTREGA *</label>
              <select class="resin-input-select" id="select-resin-city">
                <option value="" disabled selected>Selecciona tu ciudad...</option>
                <option value="San Antonio del Táchira">🇻🇪 San Antonio del Táchira (Frontera)</option>
                <option value="Ureña">🇻🇪 Pedro María Ureña</option>
                <option value="Cúcuta (Norte de Santander)">🇨🇴 Cúcuta / Villa del Rosario / Los Patios</option>
                <option value="San Cristóbal (Táchira)">🇻🇪 San Cristóbal y resto de Táchira</option>
                <option value="Envío Nacional (Venezuela)">📦 Envío Nacional Venezuela (MRW / Zoom / Tealca)</option>
                <option value="Envío Nacional (Colombia)">📦 Envío Nacional Colombia (Interrapidísimo / Servientrega)</option>
              </select>
            </div>

            <!-- GPS Detection -->
            <div style="background: rgba(56, 189, 248, 0.05); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 10px;">
              <button type="button" class="btn-resin-gps" id="btn-resin-gps-detect" onclick="ResinServiceApp.detectLiveGps()">
                <span id="resin-gps-icon">📡</span>
                <span id="resin-gps-btn-text">Detectar mi Ubicación GPS en Vivo</span>
              </button>
              <div id="resin-gps-status-box" class="resin-gps-status-box" style="display: none;"></div>
            </div>

            <div>
              <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">DIRECCIÓN EXACTA DE ENTREGA *</label>
              <textarea class="resin-textarea" id="input-resin-address" rows="2" placeholder="Calle, carrera, número de casa/apto, sector..." autocomplete="street-address"></textarea>
            </div>

            <div>
              <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">PUNTO DE REFERENCIA (FACHADA / COLOR DE CASA)</label>
              <input type="text" class="resin-input-text" id="input-resin-reference" placeholder="Ej. Casa de rejas blancas, frente a panadería..." value="">
            </div>

            <div>
              <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">MÉTODO DE PAGO PREFERIDO *</label>
              <select class="resin-input-select" id="select-resin-payment">
                <option value="" disabled selected>Selecciona método de pago...</option>
                <option value="Efectivo en Pesos COP (Contra Entrega / Acordar)">💵 Efectivo en Pesos COP</option>
                <option value="Transferencia Bancolombia / Nequi">📱 Transferencia Bancolombia / Nequi</option>
                <option value="Pago Móvil en Bolívares (Tasa del día)">🇻🇪 Pago Móvil en Bolívares (VES)</option>
                <option value="Efectivo en Divisas USD ($)">💵 Efectivo Divisas USD ($)</option>
                <option value="Binance USDT / Zelle">🌐 Binance Pay USDT / Zelle</option>
              </select>
            </div>

            <!-- Submit Buttons -->
            <button type="button" class="btn-resin-order-wa-full" onclick="ResinServiceApp.handleConfirmOrderClick()" style="margin-top: 6px;">
              <span>🟢 Solicitar Cotización por WhatsApp</span>
            </button>

            <button type="button" onclick="ResinServiceApp.submitInAppOrder()" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #FFF; padding: 10px; border-radius: 12px; font-size: 12px; font-weight: 800; cursor: pointer; text-align: center;">
              💬 Solicitar y Chatear con Shelli Art en la App
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.renderActiveTabContent();
  },

  // =========================================================================
  // Render Tab Content (Shape, Photo, NFC, Finishes)
  // =========================================================================
  renderActiveTabContent() {
    const area = document.getElementById('resin-tab-content-area');
    if (!area) return;

    const isPhoto = this.state.productType === 'photo';

    if (this.state.activeTab === 'shape') {
      if (isPhoto) {
        area.innerHTML = `
          <div class="resin-section-card">
            <div class="resin-section-title">
              <span>Silueta / Forma del Molde en Resina</span>
              <span class="badge-opt">${this.state.photoShapeName}</span>
            </div>
            <div class="resin-shapes-grid">
              ${this.shapes.map(s => `
                <div class="resin-shape-card ${s.id === this.state.photoShape ? 'active' : ''}" data-shape="${s.id}" onclick="ResinServiceApp.setShape('${s.id}')">
                  <span class="resin-shape-icon">${s.icon}</span>
                  <span class="resin-shape-name">${s.name}</span>
                  <span class="resin-shape-desc">${s.desc}</span>
                </div>
              `).join('')}
            </div>
            <p style="font-size: 11.5px; color: #94A3B8; margin: 4px 0 0 0; line-height: 1.4;">
              💡 Cada pieza se vacía artesanalmente con resina epóxica de alta pureza cristalina y filtro UV contra amarillamiento.
            </p>
          </div>
        `;
      } else {
        area.innerHTML = `
          <div class="resin-section-card">
            <div class="resin-section-title">
              <span>Elige tu Letra / Inicial</span>
              <span class="badge-opt">Letra: <strong style="color: #FFF; font-size: 14px;">${this.state.letter}</strong></span>
            </div>
            <div class="alphabet-grid" id="resin-alphabet-grid">
              ${this.alphabet.map(char => `
                <button type="button" class="btn-letter-pick ${char === this.state.letter ? 'active' : ''}" onclick="ResinServiceApp.setLetter('${char}')">
                  ${char}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="resin-section-card">
            <div class="resin-section-title">
              <span>Estilo de Vaciado & Textura</span>
            </div>
            <div class="resin-styles-grid">
              ${this.styles.map(st => `
                <div class="resin-style-card ${st.id === this.state.styleId ? 'active' : ''}" id="style-card-${st.id}" onclick="ResinServiceApp.setStyle('${st.id}')">
                  <strong>${st.name}</strong>
                  <span>${st.desc}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    } else if (this.state.activeTab === 'photo') {
      const isBack = this.state.isFlipped;
      if (isPhoto) {
        area.innerHTML = `
          <!-- Cara Delantera -->
          <div class="resin-section-card ${!isBack ? 'active-face-card' : ''}">
            <div class="resin-section-title">
              <span>1️⃣ Foto de la Cara Delantera (Frente) ${!isBack ? '<span class="resin-live-tag" style="font-size: 8.5px; padding: 1px 6px;">📍 En Pantalla</span>' : ''}</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge-opt">${this.state.photoFrontUrl ? '✅ Foto Lista' : '📷 Pendiente'}</span>
                ${isBack ? '<button type="button" class="btn-guide-flip" onclick="ResinServiceApp.toggleFlip()" style="font-size: 9px; padding: 2px 7px;">🔄 Ver Frente</button>' : ''}
              </div>
            </div>

            <div class="resin-photo-dropzone" onclick="document.getElementById('input-file-front-photo').click()">
              <input type="file" id="input-file-front-photo" accept="image/*" style="display: none;" onchange="ResinServiceApp.handleFrontPhotoUpload(event)">
              ${this.state.photoFrontUrl ? `
                <img src="${this.state.photoFrontUrl}" class="resin-photo-preview-thumb" alt="Frente">
                <span style="font-size: 11px; font-weight: 800; color: #FFF; display: block;">🔄 Toca para cambiar foto</span>
                <span style="font-size: 9.5px; color: #34D399;">Foto cargada y ajustada en el molde</span>
              ` : `
                <span style="font-size: 24px; display: block; margin-bottom: 2px;">📸</span>
                <strong style="font-size: 11.5px; color: #FFF; display: block;">Toca aquí para subir tu foto favorita</strong>
                <span style="font-size: 9.5px; color: #94A3B8;">Compatible con fotos de galería, retratos, parejas o mascotas</span>
              `}
            </div>

            <!-- Sample Photos Quick Pick -->
            ${this.settings.samplePhotos && this.settings.samplePhotos.length ? `
              <div style="margin-top: 8px;">
                <span style="font-size: 9.5px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">O prueba con fotos de muestra:</span>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  ${this.settings.samplePhotos.map(sp => `
                    <button type="button" onclick="ResinServiceApp.setSampleFrontPhoto('${sp.url}')" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #FFF; padding: 3px 8px; border-radius: 6px; font-size: 10px; cursor: pointer;">
                      ${sp.title}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Forma de la Foto Delantera -->
            <div style="margin-top: 8px; margin-bottom: 8px;">
              <label style="font-size: 9.5px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">FORMA DEL RECORTE / MARCO (FRENTE)</label>
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px;">
                <button type="button" class="btn-framing-shape ${this.state.photoFrontShape === 'full' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('full', false)">🔲 Molde</button>
                <button type="button" class="btn-framing-shape ${this.state.photoFrontShape === 'polaroid' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('polaroid', false)">📸 Polaroid</button>
                <button type="button" class="btn-framing-shape ${this.state.photoFrontShape === 'circle' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('circle', false)">⭕ Círculo</button>
                <button type="button" class="btn-framing-shape ${this.state.photoFrontShape === 'heart' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('heart', false)">💖 Corazón</button>
                <button type="button" class="btn-framing-shape ${this.state.photoFrontShape === 'square' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('square', false)">⏹️ Cuadrado</button>
              </div>
            </div>

            <!-- Acabado del Borde -->
            <div style="margin-top: 8px;">
              <label style="font-size: 9.5px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">ACABADO DEL BORDE / ENCAPSULADO</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                ${this.borderEffects.map(be => `
                  <div class="border-effect-card color-swatch-pill ${be.id === this.state.photoBorderEffect ? 'active' : ''}" data-effect="${be.id}" onclick="ResinServiceApp.setBorderEffect('${be.id}')" style="justify-content: center; padding: 5px 6px;">
                    <span>${be.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Cara Trasera -->
          <div class="resin-section-card ${isBack ? 'active-face-card' : ''}">
            <div class="resin-section-title">
              <span>2️⃣ ¿Qué deseas en la Cara Trasera (Reverso)? ${isBack ? '<span class="resin-live-tag" style="font-size: 8.5px; padding: 1px 6px;">📍 En Pantalla</span>' : ''}</span>
              ${!isBack ? '<button type="button" class="btn-guide-flip" onclick="ResinServiceApp.toggleFlip()" style="font-size: 9px; padding: 2px 7px;">🔄 Girar al Reverso</button>' : ''}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px;">
              ${this.backOptions.map(bo => `
                <div class="back-type-card color-swatch-pill ${bo.id === this.state.photoBackType ? 'active' : ''}" data-backtype="${bo.id}" onclick="ResinServiceApp.setBackType('${bo.id}')" style="justify-content: flex-start; padding: 6px 8px;">
                  <span>${bo.icon}</span> <span>${bo.name}</span>
                </div>
              `).join('')}
            </div>

            <!-- Dynamic Back Configuration Box -->
            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px;">
              ${this.state.photoBackType === 'photo' ? `
                <div class="resin-photo-dropzone" onclick="document.getElementById('input-file-back-photo').click()">
                  <input type="file" id="input-file-back-photo" accept="image/*" style="display: none;" onchange="ResinServiceApp.handleBackPhotoUpload(event)">
                  ${this.state.photoBackUrl ? `
                    <img src="${this.state.photoBackUrl}" class="resin-photo-preview-thumb" alt="Reverso">
                    <span style="font-size: 12px; font-weight: 800; color: #FFF; display: block;">🔄 Toca para cambiar 2da foto</span>
                  ` : `
                    <span style="font-size: 26px; display: block; margin-bottom: 2px;">🖼️</span>
                    <strong style="font-size: 12.5px; color: #FFF; display: block;">Subir Segunda Foto para el Reverso</strong>
                    <span style="font-size: 10.5px; color: #94A3B8;">Foto doble cara en resina cristalina</span>
                  `}
                </div>
                <!-- Forma de la Foto Trasera -->
                <div style="margin-top: 10px;">
                  <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 6px;">FORMA DEL RECORTE / MARCO (REVERSO)</label>
                  <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                    <button type="button" class="btn-framing-shape ${this.state.photoBackShape === 'full' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('full', true)">🔲 Molde</button>
                    <button type="button" class="btn-framing-shape ${this.state.photoBackShape === 'polaroid' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('polaroid', true)">📸 Polaroid</button>
                    <button type="button" class="btn-framing-shape ${this.state.photoBackShape === 'circle' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('circle', true)">⭕ Círculo</button>
                    <button type="button" class="btn-framing-shape ${this.state.photoBackShape === 'heart' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('heart', true)">💖 Corazón</button>
                    <button type="button" class="btn-framing-shape ${this.state.photoBackShape === 'square' ? 'active' : ''}" onclick="ResinServiceApp.setPhotoFramingShape('square', true)">⏹️ Cuadrado</button>
                  </div>
                </div>
              ` : ''}

              ${this.state.photoBackType === 'spotify' ? `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <span style="font-size: 11px; color: #10B981; font-weight: 800; display: flex; align-items: center; gap: 4px;">
                    <span>🎵</span> Personaliza tu Código / Onda Spotify
                  </span>
                  <input type="text" class="resin-input-text" placeholder="Nombre de la Canción..." value="${this.state.photoBackSpotifySong}" oninput="ResinServiceApp.handleBackSpotifySong(this.value)">
                  <input type="text" class="resin-input-text" placeholder="Nombre del Artista..." value="${this.state.photoBackSpotifyArtist}" oninput="ResinServiceApp.handleBackSpotifyArtist(this.value)">
                </div>
              ` : ''}

              ${this.state.photoBackType === 'phrase' ? `
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <span style="font-size: 11px; color: #F472B6; font-weight: 800;">✍️ Frase o Dedicatoria en Vinil Caligráfico</span>
                  <input type="text" class="resin-input-text" placeholder="Ej. Siempre juntos • 14.02.2023" maxlength="35" value="${this.state.photoBackPhrase}" oninput="ResinServiceApp.handleBackPhrase(this.value)">
                  <span style="font-size: 10.5px; color: #94A3B8;">Se sellará con relieve dorado o blanco dentro de la resina.</span>
                </div>
              ` : ''}

              ${this.state.photoBackType === 'glitter' ? `
                <div style="text-align: center; color: #E2E8F0; font-size: 12px; padding: 6px;">
                  ✨ Fondo artesanal en resina translúcida con lluvia de pan de oro y escarchas holográficas.
                </div>
              ` : ''}
            </div>
          </div>
        `;
      } else {
        area.innerHTML = `
          <div class="resin-section-card">
            <div class="resin-section-title">
              <span>Color / Pigmento Base de la Letra</span>
              <span class="badge-opt">${this.state.baseColorName}</span>
            </div>
            <div class="swatches-scroll-row">
              ${this.colors.map(c => `
                <div class="color-swatch-pill ${c.name === this.state.baseColorName ? 'active' : ''}" id="color-pill-${c.hex.replace('#','')}" onclick="ResinServiceApp.setColor('${c.hex}', '${c.name}')">
                  <span class="swatch-circle" style="background: ${c.hex};"></span>
                  <span>${c.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="resin-section-card">
            <div class="resin-section-title">
              <span>Nombre Personalizado en Vinil sobre la Letra</span>
            </div>
            <input type="text" class="resin-input-text" placeholder="Ej. Camila, Sofía, Andrés..." maxlength="14" value="${this.state.customName}" oninput="ResinServiceApp.handleCustomNameInput(this.value)">
          </div>
        `;
      }
    } else if (this.state.activeTab === 'nfc') {
      area.innerHTML = `
        <div class="resin-nfc-card">
          <div class="resin-nfc-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="resin-nfc-badge">((📶 NFC)) SMART CHIP</span>
              <strong style="color: #FFF; font-size: 13px;">Chip Inteligente Encapsulado</strong>
            </div>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="check-enable-nfc" ${this.state.hasNfc ? 'checked' : ''} onchange="ResinServiceApp.toggleNfc(this.checked)" style="width: 18px; height: 18px; accent-color: #38BDF8; cursor: pointer;">
              <span style="font-size: 12px; font-weight: 800; color: #38BDF8;">Incluir Chip NFC</span>
            </label>
          </div>

          <p style="font-size: 11.5px; color: #CBD5E1; margin: 0 0 10px 0; line-height: 1.45;">
            El chip NFC queda <strong>sellado e invisible dentro de la resina</strong>, 100% resistente al agua. Al acercar cualquier teléfono móvil (iPhone o Android) al llavero, se abrirá automáticamente tu enlace digital sin necesidad de descargar apps.
          </p>

          ${this.state.hasNfc ? `
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px;">
              <div>
                <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 6px;">¿QUÉ DESEAS QUE ABRA EL CHIP AL ACERCAR EL TELÉFONO?</label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px;">
                  ${this.nfcTypes.map(nt => `
                    <div class="color-swatch-pill ${nt.id === this.state.nfcType ? 'active' : ''}" onclick="ResinServiceApp.setNfcType('${nt.id}')" style="justify-content: center; font-size: 11.5px; padding: 7px;">
                      <span>${nt.icon}</span> <span>${nt.name}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div>
                <label style="font-size: 11px; color: #38BDF8; font-weight: 800; display: block; margin-bottom: 4px;">ENLACE / URL A PROGRAMAR EN EL CHIP *</label>
                <input type="url" class="resin-input-text" id="input-nfc-url" placeholder="${this.nfcTypes.find(n => n.id === this.state.nfcType)?.placeholder || 'https://...'}" value="${this.state.nfcUrl}" oninput="ResinServiceApp.handleNfcUrl(this.value)">
                <span style="font-size: 10.5px; color: #94A3B8; display: block; margin-top: 3px;">
                  ℹ️ Puedes programar tu perfil de Instagram, canción o playlist de Spotify, chat de WhatsApp o página web.
                </span>
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 8px; color: #94A3B8; font-size: 11.5px;">
              👆 Marca la casilla para agregar el chip NFC a tu llavero de resina.
            </div>
          `}
        </div>
      `;
    } else if (this.state.activeTab === 'finishes') {
      area.innerHTML = `
        <!-- Color de Borla -->
        <div class="resin-section-card">
          <div class="resin-section-title">
            <span>Color de la Borla Decorativa (Tassel de Gamuza)</span>
            <span class="badge-opt">${this.state.tasselName}</span>
          </div>
          <div class="swatches-scroll-row">
            ${this.tassels.map(t => `
              <div class="color-swatch-pill ${t.name === this.state.tasselName ? 'active' : ''}" id="tassel-pill-${t.hex.replace('#','')}" onclick="ResinServiceApp.setTassel('${t.hex}', '${t.name}')">
                <span class="swatch-circle" style="background: ${t.hex};"></span>
                <span>${t.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Herraje & Dije -->
        <div class="resin-section-card">
          <div class="resin-section-title">
            <span>Herraje Metálico & Dije Opcional</span>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 6px;">COLOR DE LA ARGOLLA Y CADENA</label>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="color-swatch-pill ${this.state.hardware === 'gold' ? 'active' : ''}" id="btn-metal-gold" onclick="ResinServiceApp.setHardware('gold')" style="flex: 1; justify-content: center;">
                ✨ Dorado de Lujo
              </button>
              <button type="button" class="color-swatch-pill ${this.state.hardware === 'silver' ? 'active' : ''}" id="btn-metal-silver" onclick="ResinServiceApp.setHardware('silver')" style="flex: 1; justify-content: center;">
                🔘 Plateado Cromado
              </button>
            </div>
          </div>

          <div>
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 6px;">DIJE ADICIONAL EN RESINA (OPCIONAL)</label>
            <div class="swatches-scroll-row">
              ${this.charms.map(ch => `
                <div class="color-swatch-pill ${ch.id === this.state.extraCharmId ? 'active' : ''}" id="charm-pill-${ch.id}" onclick="ResinServiceApp.setCharm('${ch.id}')">
                  <span>${ch.icon}</span>
                  <span>${ch.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
  },

  // =========================================================================
  // Update Live Visual Preview (SVG Shapes, Photos, Back Side, NFC, Reflections)
  // =========================================================================
  
  // =========================================================================
  // Photo Direct Upload, Framing Shapes & Interactive Transform Handlers
  // =========================================================================
  triggerPhotoUpload(side) {
    if (side === 'front') {
      if (this.state.isFlipped) this.toggleFlip();
    } else if (side === 'back') {
      if (!this.state.isFlipped) this.toggleFlip();
      this.state.photoBackType = 'photo';
    } else {
      if (this.state.isFlipped) {
        this.state.photoBackType = 'photo';
      }
    }
    const inp = document.getElementById('resin-direct-photo-input');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  },

  handleDirectPhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      if (this.state.isFlipped) {
        this.state.photoBackUrl = dataUrl;
        this.state.photoBackType = 'photo';
        this.state.photoBackTransform = { x: 0, y: 0, scale: 1.0, isSelected: true };
      } else {
        this.state.photoFrontUrl = dataUrl;
        this.state.photoFrontTransform = { x: 0, y: 0, scale: 1.0, isSelected: true };
      }
      this.updateVisualPreview();
      this.updateGuideBubble();
      this.renderActiveTabContent();
    };
    reader.readAsDataURL(file);
  },

  adjustPhotoScale(delta) {
    const isBack = this.state.isFlipped;
    const tf = isBack ? this.state.photoBackTransform : this.state.photoFrontTransform;
    const photoUrl = isBack ? this.state.photoBackUrl : this.state.photoFrontUrl;
    if (!photoUrl) {
      this.triggerPhotoUpload(isBack ? 'back' : 'front');
      return;
    }
    tf.scale = Math.min(3.5, Math.max(0.35, parseFloat((tf.scale + delta).toFixed(2))));
    tf.isSelected = true;
    this.updateVisualPreview();
  },

  resetPhotoTransform() {
    const isBack = this.state.isFlipped;
    const tf = isBack ? this.state.photoBackTransform : this.state.photoFrontTransform;
    tf.x = 0;
    tf.y = 0;
    tf.scale = 1.0;
    tf.isSelected = true;
    this.updateVisualPreview();
  },

  setPhotoFramingShape(shape, isBack = false) {
    if (isBack || this.state.isFlipped) {
      this.state.photoBackShape = shape;
    } else {
      this.state.photoFrontShape = shape;
    }
    this.updateVisualPreview();
    this.renderActiveTabContent();
  },

  deselectPhoto() {
    this.state.photoFrontTransform.isSelected = false;
    this.state.photoBackTransform.isSelected = false;
    this.updateVisualPreview();
  },

  selectPhoto(isBack = false) {
    if (isBack || this.state.isFlipped) {
      this.state.photoBackTransform.isSelected = true;
    } else {
      this.state.photoFrontTransform.isSelected = true;
    }
    this.updateVisualPreview();
  },

  getShapeAnchor(shape) {
    switch (shape) {
      case 'rectangle': return { x: 170, y: 114, rimY: 120, type: 'screw' };
      case 'circle':    return { x: 170, y: 119, rimY: 125, type: 'screw' };
      case 'heart':     return { x: 170, y: 159, rimY: 165, type: 'screw' };
      case 'hexagon':   return { x: 170, y: 119, rimY: 125, type: 'screw' };
      case 'dogtag':    return { x: 170, y: 118, rimY: 120, holeY: 134, type: 'ring' };
      default:          return { x: 170, y: 114, rimY: 120, type: 'screw' };
    }
  },

  getSvgPoint(svg, evt) {
    const clientX = evt.touches && evt.touches.length ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches && evt.touches.length ? evt.touches[0].clientY : evt.clientY;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const screenCTM = svg.getScreenCTM();
    if (screenCTM) {
      return pt.matrixTransform(screenCTM.inverse());
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 340,
      y: ((clientY - rect.top) / rect.height) * 430
    };
  },

  initTransformEvents() {
    if (this._eventsInitialized) return;
    this._eventsInitialized = true;

    const self = this;
    let isDragging = false;
    let isResizing = false;
    let activeHandle = null;
    let dragStartPt = { x: 0, y: 0 };
    let initialX = 0;
    let initialY = 0;
    let initialScale = 1.0;
    let activeSvg = null;

    const onStart = (e) => {
      const target = e.target;
      // Allow buttons inside SVG to fire their clicks naturally!
      if (target.closest && target.closest('.btn-svg-upload')) {
        return;
      }

      const isBack = self.state.isFlipped;
      activeSvg = isBack ? document.getElementById('resin-keychain-svg-back') : document.getElementById('resin-keychain-svg');
      if (!activeSvg) return;

      const tf = isBack ? self.state.photoBackTransform : self.state.photoFrontTransform;
      const photoUrl = isBack ? self.state.photoBackUrl : self.state.photoFrontUrl;

      // 1. Check if clicked a corner handle
      if (target.classList && target.classList.contains('resin-corner-handle')) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        self._isResizingPhoto = true;
        activeHandle = target.dataset.handle;
        dragStartPt = self.getSvgPoint(activeSvg, e);
        initialScale = tf.scale;
        return;
      }

      // 2. Check if clicked the photo drag body or photo image
      if (target.classList && (target.classList.contains('resin-drag-area') || target.tagName === 'image')) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        self._isDraggingPhoto = true;
        tf.isSelected = true;
        dragStartPt = self.getSvgPoint(activeSvg, e);
        initialX = tf.x;
        initialY = tf.y;
        self.updateVisualPreview();
        return;
      }

      // 3. If clicked outside photo area on SVG background, deselect
      if (tf.isSelected) {
        tf.isSelected = false;
        self.updateVisualPreview();
      }
    };

    const onMove = (e) => {
      if (!isDragging && !isResizing) return;
      if (!activeSvg) return;
      e.preventDefault();

      const isBack = self.state.isFlipped;
      const tf = isBack ? self.state.photoBackTransform : self.state.photoFrontTransform;
      const pt = self.getSvgPoint(activeSvg, e);

      if (isDragging) {
        const dx = pt.x - dragStartPt.x;
        const dy = pt.y - dragStartPt.y;
        tf.x = initialX + dx;
        tf.y = initialY + dy;
        self.updateVisualPreview();
      } else if (isResizing) {
        const centerX = 170 + tf.x;
        const centerY = 250 + tf.y;
        const currentDist = Math.hypot(pt.x - centerX, pt.y - centerY);
        const baseDist = Math.hypot(120, 135);
        const newScale = Math.min(3.5, Math.max(0.35, currentDist / baseDist));
        tf.scale = parseFloat(newScale.toFixed(3));
        self.updateVisualPreview();
      }
    };

    const onEnd = () => {
      isDragging = false;
      isResizing = false;
      self._isDraggingPhoto = false;
      self._isResizingPhoto = false;
      activeHandle = null;
    };

    // Attach listeners to flip container
    const stage = document.querySelector('.resin-preview-stage');
    if (stage) {
      stage.addEventListener('mousedown', onStart);
      stage.addEventListener('touchstart', onStart, { passive: false });
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
  },

  updateVisualPreview() {
    const isSilver = this.state.hardware === 'silver';
    const metalGrad = isSilver ? 'url(#silverHardwareGrad)' : 'url(#goldHardwareGrad)';
    const isPhoto = this.state.productType === 'photo';
    const shape = this.state.photoShape || 'rectangle';

    // Update Bottom Bar Pricing (100% Quotation model)
    const usdEl = document.getElementById('resin-total-usd');
    const copEl = document.getElementById('resin-total-cop');
    if (usdEl) usdEl.textContent = '🎨 Bajo Cotización Previa';
    if (copEl) copEl.textContent = 'Presupuesto personalizado según diseño, acabados y fotos';

    // Toggle Done Editing button on stage
    const isBack = this.state.isFlipped;
    const activeTf = isBack ? this.state.photoBackTransform : this.state.photoFrontTransform;
    const btnDone = document.getElementById('btn-stage-done-edit');
    if (btnDone) {
      btnDone.style.display = (activeTf && activeTf.isSelected) ? 'inline-flex' : 'none';
    }

    // Toggle chip active state on stage & update title per face
    const currentFraming = isBack ? (this.state.photoBackShape || 'full') : (this.state.photoFrontShape || 'full');
    document.querySelectorAll('.chip-shape-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === currentFraming);
    });
    const stageTitle = document.getElementById('stage-shape-title');
    if (stageTitle) {
      stageTitle.textContent = isBack ? 'Forma Foto (Reverso):' : 'Forma Foto (Frente):';
    }

    const uploadLbl = document.getElementById('lbl-stage-upload-photo');
    if (uploadLbl) {
      const hasPhoto = isBack ? !!this.state.photoBackUrl : !!this.state.photoFrontUrl;
      uploadLbl.textContent = isBack 
        ? (hasPhoto ? 'Cambiar Foto Reverso' : 'Agregar Foto Reverso') 
        : (hasPhoto ? 'Cambiar Foto Frente' : 'Agregar Foto Frente');
    }

    const sideLbl = document.getElementById('lbl-flip-side');
    if (sideLbl) {
      sideLbl.textContent = isBack ? 'Volver al Frente' : 'Girar al Reverso';
    }

    const sideBadge = document.getElementById('resin-side-badge');
    if (sideBadge) {
      sideBadge.textContent = isBack ? '🔄 Reverso' : '✨ Frente';
    }

    const svgFront = document.getElementById('resin-keychain-svg');
    const svgBack = document.getElementById('resin-keychain-svg-back');
    if (!svgFront || !svgBack) return;

    // Common SVG Defs (Gradients, Hardware, Glitter Patterns, Framing ClipPaths)
    const commonDefs = `
      <defs>
        <linearGradient id="goldHardwareGrad" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stop-color="#FFFDF2" />
          <stop offset="12%" stop-color="#FEF08A" />
          <stop offset="28%" stop-color="#EAB308" />
          <stop offset="48%" stop-color="#A16207" />
          <stop offset="68%" stop-color="#CA8A04" />
          <stop offset="85%" stop-color="#FACC15" />
          <stop offset="100%" stop-color="#713F12" />
        </linearGradient>

        <linearGradient id="silverHardwareGrad" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="15%" stop-color="#F1F5F9" />
          <stop offset="35%" stop-color="#94A3B8" />
          <stop offset="55%" stop-color="#475569" />
          <stop offset="75%" stop-color="#CBD5E1" />
          <stop offset="90%" stop-color="#FFFFFF" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>

        <linearGradient id="liquidGlossGrad" x1="0%" y1="0%" x2="35%" y2="100%">
          <stop offset="0%" stop-color="rgba(255, 255, 255, 0.90)" />
          <stop offset="30%" stop-color="rgba(255, 255, 255, 0.40)" />
          <stop offset="65%" stop-color="rgba(255, 255, 255, 0.08)" />
          <stop offset="100%" stop-color="rgba(255, 255, 255, 0.0)" />
        </linearGradient>

        <linearGradient id="resinMeniscusBevel" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stop-color="rgba(255, 255, 255, 0.95)" />
          <stop offset="35%" stop-color="rgba(255, 255, 255, 0.65)" />
          <stop offset="65%" stop-color="rgba(255, 255, 255, 0.2)" />
          <stop offset="100%" stop-color="rgba(0, 0, 0, 0.55)" />
        </linearGradient>

        <linearGradient id="resin3dWallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(255, 255, 255, 0.45)" />
          <stop offset="40%" stop-color="rgba(244, 114, 182, 0.35)" />
          <stop offset="70%" stop-color="rgba(168, 85, 247, 0.25)" />
          <stop offset="100%" stop-color="rgba(15, 23, 42, 0.85)" />
        </linearGradient>

        <pattern id="goldGlitterPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#CA8A04" />
          <circle cx="6" cy="8" r="1.8" fill="#FEF08A" />
          <circle cx="18" cy="4" r="1.2" fill="#FFF" />
          <circle cx="28" cy="12" r="2.2" fill="#FACC15" />
          <circle cx="34" cy="24" r="1.5" fill="#FEF08A" />
          <circle cx="12" cy="26" r="2.5" fill="#FDE047" />
          <polygon points="14,14 19,16 17,21 12,18" fill="#FEF08A" opacity="0.95" />
          <polygon points="26,2 30,6 28,10 24,6" fill="#FDE047" opacity="0.9" />
          <polygon points="22,18 29,22 26,28 20,24" fill="#F59E0B" opacity="0.95" />
        </pattern>

        <pattern id="chunkyGlitterPattern" width="45" height="45" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="12" r="2.5" fill="rgba(255,255,255,0.85)" />
          <circle cx="32" cy="8" r="3.2" fill="rgba(253,224,71,0.9)" />
          <circle cx="22" cy="24" r="2" fill="rgba(255,255,255,0.95)" />
          <polygon points="16,6 19,8 19,12 16,14 13,12 13,8" fill="rgba(254,240,138,0.85)" />
          <polygon points="26,36 29,38 29,42 26,44 23,42 23,38" fill="rgba(253,224,71,0.85)" />
        </pattern>

        <pattern id="silverGlitterPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#64748B" />
          <circle cx="8" cy="10" r="1.8" fill="#FFF" />
          <circle cx="26" cy="14" r="2.5" fill="#E2E8F0" />
          <polygon points="12,4 18,7 15,12 9,9" fill="#FFF" opacity="0.95" />
          <polygon points="24,22 31,25 28,31 21,28" fill="#CBD5E1" opacity="0.95" />
        </pattern>

        <!-- Mold Shape ClipPaths -->
        <clipPath id="clip-rectangle">
          <rect x="55" y="120" width="230" height="260" rx="26" />
        </clipPath>

        <clipPath id="clip-circle">
          <circle cx="170" cy="250" r="125" />
        </clipPath>

        <clipPath id="clip-heart">
          <path d="M 170,165 C 130,100 55,115 55,195 C 55,265 130,325 170,375 C 210,325 285,265 285,195 C 285,115 210,100 170,165 Z" />
        </clipPath>

        <clipPath id="clip-hexagon">
          <polygon points="170,125 285,190 285,315 170,380 55,315 55,190" />
        </clipPath>

        <clipPath id="clip-dogtag">
          <rect x="75" y="120" width="190" height="260" rx="38" />
        </clipPath>

        <!-- Internal Photo Framing Shapes -->
        <clipPath id="photo-frame-polaroid">
          <rect x="78" y="140" width="184" height="175" rx="4" />
        </clipPath>

        <clipPath id="photo-frame-circle">
          <circle cx="170" cy="250" r="105" />
        </clipPath>

        <clipPath id="photo-frame-heart">
          <path d="M 170,180 C 135,120 75,135 75,205 C 75,265 135,320 170,365 C 205,320 265,265 265,205 C 265,135 205,120 170,180 Z" />
        </clipPath>

        <clipPath id="photo-frame-square">
          <rect x="75" y="155" width="190" height="190" rx="20" />
        </clipPath>

        <!-- Master Letter ClipPath -->
        <clipPath id="resin-letter-clip">
          <text x="170" y="340" text-anchor="middle" font-family="'Arial Black', 'Montserrat', Impact, sans-serif" font-weight="900" font-size="205">${this.state.letter}</text>
        </clipPath>

        <filter id="softContactShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" />
        </filter>
      </defs>
    `;

    // Hardware Assembly (Key Ring + Unbroken Chains + Tassel + Charm)
    const renderHardwareAssembly = (anchorX = 170, anchorY = 114, shapeName = 'rectangle') => {
      return `
        <!-- Hardware Assembly -->
        <g id="svg-hardware-group">
          <!-- Split Key Ring -->
          <circle cx="170" cy="45" r="26" fill="none" stroke="${metalGrad}" stroke-width="7" />
          <circle cx="170" cy="45" r="23" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1" />
          <circle cx="170" cy="45" r="27" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.75" />
          <line x1="168" y1="19" x2="172" y2="71" stroke="rgba(0,0,0,0.3)" stroke-width="1.8" />

          <!-- Continuous Unbroken Chain Links & Bottom Anchor -->
          ${this.renderChain(anchorX, anchorY, isSilver, shapeName)}

          <!-- Suede Tassel (Optional) -->
          ${this.state.tasselHex && this.state.tasselHex !== 'none' ? `
            <g id="tassel-connector-chain" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.45))">
              <ellipse cx="145" cy="67" rx="4.0" ry="6.2" fill="none" stroke="${metalGrad}" stroke-width="2.8" transform="rotate(-30 145 67)" />
              <ellipse cx="124" cy="74" rx="3.8" ry="6.0" fill="none" stroke="${metalGrad}" stroke-width="2.8" transform="rotate(-18 124 74)" />
              <ellipse cx="103" cy="80" rx="3.8" ry="6.0" fill="none" stroke="${metalGrad}" stroke-width="2.8" transform="rotate(-10 103 80)" />
            </g>
            <g transform="translate(60, 82)">
              <ellipse cx="25" cy="5" rx="4" ry="5.5" fill="none" stroke="${metalGrad}" stroke-width="2.8" transform="rotate(15 25 5)" />
              <path d="M 16,10 Q 25,6 34,10 L 37,24 Q 25,28 13,24 Z" fill="${metalGrad}" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
              <ellipse cx="25" cy="11" rx="9" ry="2.5" fill="#FFF5BA" opacity="0.6" />
              <path d="M 14,24 Q 25,28 36,24 L 42,78 Q 25,84 8,78 Z" fill="${this.state.tasselHex}" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.35))" />
              <line x1="16" y1="28" x2="14" y2="76" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
              <line x1="22" y1="28" x2="21" y2="78" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
              <line x1="28" y1="28" x2="29" y2="78" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
              <line x1="34" y1="28" x2="36" y2="76" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
            </g>
          ` : ''}

          <!-- Extra Charm (Authentic SVG Detail) -->
          ${this.state.extraCharmId !== 'none' ? `
            <g id="charm-connector-chain" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.45))">
              <ellipse cx="192" cy="71" rx="3.8" ry="5.8" fill="none" stroke="${metalGrad}" stroke-width="2.8" transform="rotate(32 192 71)" />
              <ellipse cx="207" cy="83" rx="3.8" ry="5.8" fill="none" stroke="${metalGrad}" stroke-width="2.8" transform="rotate(45 207 83)" />
            </g>
            <g transform="translate(205, 95)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.35))">
              <ellipse cx="15" cy="5" rx="3.5" ry="5" fill="none" stroke="${metalGrad}" stroke-width="2.5" />
              ${this.state.extraCharmId === 'corazon' ? `
                <path d="M 15,14 C 11,9 5,12 5,18 C 5,25 15,31 15,31 C 15,31 25,25 25,18 C 25,12 19,9 15,14 Z" fill="#FB7185" stroke="${metalGrad}" stroke-width="1.8" />
                <path d="M 10,13 C 8,11 6,14 6,17" stroke="#FFF" stroke-width="1" stroke-linecap="round" opacity="0.6" fill="none" />
              ` : this.state.extraCharmId === 'huesito' ? `
                <path d="M 8,15 C 6,13 4,16 6,18 C 4,20 6,23 8,21 L 22,21 C 24,23 26,20 24,18 C 26,16 24,13 22,15 Z" fill="#F8FAFC" stroke="${metalGrad}" stroke-width="1.5" />
              ` : this.state.extraCharmId === 'patita' ? `
                <ellipse cx="15" cy="22" rx="5" ry="4" fill="#F472B6" stroke="${metalGrad}" stroke-width="1.2" />
                <ellipse cx="9" cy="15" rx="2" ry="2.8" fill="#F472B6" stroke="${metalGrad}" stroke-width="1" transform="rotate(-15 9 15)" />
                <ellipse cx="13" cy="13" rx="2" ry="3" fill="#F472B6" stroke="${metalGrad}" stroke-width="1" />
                <ellipse cx="17" cy="13" rx="2" ry="3" fill="#F472B6" stroke="${metalGrad}" stroke-width="1" />
                <ellipse cx="21" cy="15" rx="2" ry="2.8" fill="#F472B6" stroke="${metalGrad}" stroke-width="1" transform="rotate(15 21 15)" />
              ` : this.state.extraCharmId === 'estrella' ? `
                <polygon points="15,9 17.5,15 24,15.5 19,19.5 20.8,26 15,22 9.2,26 11,19.5 6,15.5 12.5,15" fill="${metalGrad}" stroke="${metalGrad}" stroke-width="1" />
                <polygon points="15,11 16.5,15.5 21,16 17.5,19 19,23.5 15,20.5 11,23.5 12.5,19 9,16 13.5,15.5" fill="#FFF5BA" opacity="0.6" />
              ` : this.state.extraCharmId === 'inicial' ? `
                <circle cx="15" cy="20" r="11" fill="${metalGrad}" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
                <circle cx="15" cy="20" r="9" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.8" />
                <text x="15" y="24" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="11" fill="#1E293B">${(this.state.customerName || this.state.letter || 'P')[0].toUpperCase()}</text>
              ` : `
                <circle cx="15" cy="18" r="10" fill="${metalGrad}" />
                <text x="15" y="22" text-anchor="middle" font-size="12" fill="#FFF">✨</text>
              `}
            </g>
          ` : ''}
        </g>
      `;
    };

    // Border Flakes HTML for Shape
    const getBorderFlakesHtml = (clipId) => {
      if (this.state.photoBorderEffect === 'gold_flakes') {
        return `<rect x="10" y="100" width="320" height="300" fill="url(#goldGlitterPattern)" clip-path="url(#${clipId})" opacity="0.45" />`;
      } else if (this.state.photoBorderEffect === 'silver_flakes') {
        return `<rect x="10" y="100" width="320" height="300" fill="url(#silverGlitterPattern)" clip-path="url(#${clipId})" opacity="0.4" />`;
      } else if (this.state.photoBorderEffect === 'glitter') {
        return `<rect x="10" y="100" width="320" height="300" fill="url(#chunkyGlitterPattern)" clip-path="url(#${clipId})" opacity="0.5" />`;
      }
      return '';
    };

    // NFC Encapsulated Badge
    const nfcBadgeHtml = this.state.hasNfc ? `
      <g transform="translate(220, 320)">
        <rect x="0" y="0" width="56" height="24" rx="12" fill="rgba(2, 132, 199, 0.85)" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))" />
        <text x="28" y="16" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="10" fill="#FFF" letter-spacing="0.5">((📶 NFC))</text>
      </g>
    ` : '';

    // ==========================================
    // 1. BUILD FRONT SVG
    // ==========================================
    if (isPhoto) {
      const moldClipId = `clip-${shape}`;
      const anchor = this.getShapeAnchor(shape);

      let shapePathOutline = '';
      if (shape === 'rectangle') shapePathOutline = `<rect x="55" y="120" width="230" height="260" rx="26" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;
      else if (shape === 'circle') shapePathOutline = `<circle cx="170" cy="250" r="125" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;
      else if (shape === 'heart') shapePathOutline = `<path d="M 170,165 C 130,100 55,115 55,195 C 55,265 130,325 170,375 C 210,325 285,265 285,195 C 285,115 210,100 170,165 Z" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;
      else if (shape === 'hexagon') shapePathOutline = `<polygon points="170,125 285,190 285,315 170,380 55,315 55,190" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;
      else if (shape === 'dogtag') shapePathOutline = `<rect x="75" y="120" width="190" height="260" rx="38" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;

      // Front Framing Shape
      const frontFraming = this.state.photoFrontShape || 'full';
      let activeFrontClip = moldClipId;
      let photoBackingDecor = '';

      if (frontFraming === 'polaroid') {
        activeFrontClip = 'photo-frame-polaroid';
        photoBackingDecor = `
          <rect x="68" y="130" width="204" height="240" rx="8" fill="#F8FAFC" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
          <rect x="76" y="138" width="188" height="179" rx="4" fill="#0F172A" />
        `;
      } else if (frontFraming === 'circle') {
        activeFrontClip = 'photo-frame-circle';
        photoBackingDecor = `
          <circle cx="170" cy="250" r="108" fill="#0F172A" stroke="rgba(255,255,255,0.7)" stroke-width="3" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
        `;
      } else if (frontFraming === 'heart') {
        activeFrontClip = 'photo-frame-heart';
        photoBackingDecor = `
          <path d="M 170,180 C 135,120 75,135 75,205 C 75,265 135,320 170,365 C 205,320 265,265 265,205 C 265,135 205,120 170,180 Z" fill="#0F172A" stroke="rgba(255,255,255,0.7)" stroke-width="3" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
        `;
      } else if (frontFraming === 'square') {
        activeFrontClip = 'photo-frame-square';
        photoBackingDecor = `
          <rect x="73" y="153" width="194" height="194" rx="22" fill="#0F172A" stroke="rgba(255,255,255,0.7)" stroke-width="3" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
        `;
      }

      const frontTf = this.state.photoFrontTransform;
      const frontPhotoHtml = this.state.photoFrontUrl ? `
        ${photoBackingDecor}
        <g clip-path="url(#${activeFrontClip})">
          <g transform="translate(${(170 + frontTf.x).toFixed(1)}, ${(250 + frontTf.y).toFixed(1)}) scale(${frontTf.scale}) translate(-170, -250)">
            <image href="${this.state.photoFrontUrl}" x="50" y="115" width="240" height="270" preserveAspectRatio="xMidYMid slice" />
          </g>
        </g>
        <g transform="translate(170, 362)" class="btn-svg-upload" style="cursor: pointer;" onclick="ResinServiceApp.triggerPhotoUpload('front')">
          <rect x="-68" y="-13" width="136" height="26" rx="13" fill="rgba(15,23,42,0.92)" stroke="#F472B6" stroke-width="1.4" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.7))" />
          <text x="0" y="4" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="800" font-size="10.5" fill="#FFF">📸 Cambiar Foto Frente</text>
        </g>
      ` : `
        <rect x="0" y="100" width="340" height="300" fill="linear-gradient(135deg, #831843 0%, #1E1B4B 100%)" />
        <g transform="translate(170, 240)" class="btn-svg-upload" style="cursor: pointer;" onclick="ResinServiceApp.triggerPhotoUpload('front')">
          <circle cx="0" cy="0" r="42" fill="rgba(244, 114, 182, 0.28)" stroke="#F472B6" stroke-width="2.2" filter="drop-shadow(0 4px 12px rgba(244,114,182,0.4))" />
          <text x="0" y="9" text-anchor="middle" font-size="32">📸</text>
          <text x="0" y="52" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="13.5" fill="#FFF">Toca para Subir Foto Frente</text>
          <text x="0" y="70" text-anchor="middle" font-size="10.5" fill="#FDA4AF">Paso 1: Sube la foto delantera</text>
        </g>
      `;

      // Front transform handles (ONLY visible when isSelected === true!)
      let frontTransformOverlay = '';
      if (this.state.photoFrontUrl && frontTf.isSelected) {
        const boxW = 240 * frontTf.scale;
        const boxH = 270 * frontTf.scale;
        const boxX = (170 + frontTf.x) - boxW / 2;
        const boxY = (250 + frontTf.y) - boxH / 2;

        frontTransformOverlay = `
          <!-- Interactive Photo Selection Box & Corner Resizing Handles -->
          <g id="resin-front-transform-overlay" class="resin-photo-overlay">
            <rect x="${boxX.toFixed(1)}" y="${boxY.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="rgba(56, 189, 248, 0.08)" stroke="#38BDF8" stroke-width="2" stroke-dasharray="6,4" class="resin-drag-area" style="cursor: move;" />
            
            <line x1="${boxX.toFixed(1)}" y1="${(boxY + boxH/2).toFixed(1)}" x2="${(boxX + boxW).toFixed(1)}" y2="${(boxY + boxH/2).toFixed(1)}" stroke="#38BDF8" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.6" />
            <line x1="${(boxX + boxW/2).toFixed(1)}" y1="${boxY.toFixed(1)}" x2="${(boxX + boxW/2).toFixed(1)}" y2="${(boxY + boxH).toFixed(1)}" stroke="#38BDF8" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.6" />

            <circle cx="${boxX.toFixed(1)}" cy="${boxY.toFixed(1)}" r="8.5" fill="#0284C7" stroke="#FFF" stroke-width="2.5" class="resin-corner-handle" data-handle="tl" style="cursor: nwse-resize;" />
            <circle cx="${(boxX + boxW).toFixed(1)}" cy="${boxY.toFixed(1)}" r="8.5" fill="#0284C7" stroke="#FFF" stroke-width="2.5" class="resin-corner-handle" data-handle="tr" style="cursor: nesw-resize;" />
            <circle cx="${boxX.toFixed(1)}" cy="${(boxY + boxH).toFixed(1)}" r="8.5" fill="#0284C7" stroke="#FFF" stroke-width="2.5" class="resin-corner-handle" data-handle="bl" style="cursor: nesw-resize;" />
            <circle cx="${(boxX + boxW).toFixed(1)}" cy="${(boxY + boxH).toFixed(1)}" r="8.5" fill="#0284C7" stroke="#FFF" stroke-width="2.5" class="resin-corner-handle" data-handle="br" style="cursor: nwse-resize;" />

            <g transform="translate(${(boxX + boxW/2).toFixed(1)}, ${(boxY - 14).toFixed(1)})">
              <rect x="-85" y="-12" width="170" height="24" rx="12" fill="#0F172A" stroke="#38BDF8" stroke-width="1.2" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))" />
              <text x="0" y="4" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="800" font-size="9.5" fill="#38BDF8">✂️ Arrastra • Esquinas para Escalar</text>
            </g>
          </g>
        `;
      }

      svgFront.innerHTML = `
        ${commonDefs}
        
        <!-- Drop Shadow -->
        <g opacity="0.65" filter="url(#softContactShadow)">
          ${shapePathOutline.replace(/fill="none"/g, 'fill="#000"').replace(/stroke="[^"]*"/g, 'stroke="#000"')}
        </g>

        <!-- 3D Resin Side Wall / Mold Rim (Depth Extrusion) -->
        <g transform="translate(0, 6)" opacity="0.5">
          ${shapePathOutline.replace(/fill="none"/g, 'fill="#831843"').replace(/stroke="[^"]*"/g, 'stroke="url(#resin3dWallGrad)" stroke-width="7"')}
        </g>
        <g transform="translate(0, 3)" opacity="0.7">
          ${shapePathOutline.replace(/fill="none"/g, 'fill="#BE185D"').replace(/stroke="[^"]*"/g, 'stroke="url(#resin3dWallGrad)" stroke-width="5"')}
        </g>

        <!-- Main Cast Front Content -->
        <g clip-path="url(#${moldClipId})">
          <rect x="0" y="100" width="340" height="300" fill="#1E293B" />
          ${frontPhotoHtml}
          ${getBorderFlakesHtml(moldClipId)}
          <path d="M 50,140 Q 170,200 290,150 L 290,210 Q 170,260 50,200 Z" fill="url(#liquidGlossGrad)" opacity="0.75" pointer-events="none" />
          <ellipse cx="120" cy="320" rx="35" ry="12" fill="rgba(255,255,255,0.25)" transform="rotate(-18 120 320)" pointer-events="none" />
          <text x="75" y="150" font-size="14" fill="#FFF" opacity="0.9" filter="drop-shadow(0 0 6px #FFF)" pointer-events="none">✦</text>
          <text x="255" y="345" font-size="11" fill="#FFF" opacity="0.75" filter="drop-shadow(0 0 4px #FFF)" pointer-events="none">✦</text>
        </g>

        <!-- Meniscus Border Bevel Line -->
        <g stroke="url(#resinMeniscusBevel)">
          ${shapePathOutline}
        </g>

        <!-- Encapsulated Smart NFC Chip Badge -->
        ${nfcBadgeHtml}

        <!-- Unbroken Hardware & Chains -->
        ${renderHardwareAssembly(anchor.x, anchor.y, shape)}

        <!-- Interactive Transformation Overlay -->
        ${frontTransformOverlay}
      `;
    } else {
      // Classic Letter Mode
      const letter = this.state.letter || 'M';
      const c = this.state.baseColorHex || '#F472B6';
      const anchor = this.getLetterAnchor(letter);

      svgFront.innerHTML = `
        ${commonDefs}
        
        <!-- Ambient Shadow -->
        <text x="172" y="352" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="#000" filter="url(#softContactShadow)">${letter}</text>

        <!-- 3D Sidewalls -->
        <text x="170" y="348" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="${this.adjustColor(c, -0.55)}">${letter}</text>
        <text x="170" y="346" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="${this.adjustColor(c, -0.38)}">${letter}</text>
        <text x="170" y="344" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="${this.adjustColor(c, -0.22)}">${letter}</text>

        <!-- Front Resin Letter -->
        <g clip-path="url(#resin-letter-clip)">
          <rect x="10" y="120" width="320" height="250" fill="${c}" />
          <rect x="10" y="120" width="320" height="250" fill="url(#chunkyGlitterPattern)" opacity="0.8" />
          
          ${this.state.styleId === 'bicolor' ? `
            <path d="M 0,210 Q 170,270 340,220 L 340,295 Q 170,345 0,285 Z" fill="url(#goldGlitterPattern)" />
          ` : ''}

          <text x="170" y="340" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="3">${letter}</text>
          <path d="M 50,150 Q 170,210 290,165 L 290,205 Q 170,250 50,195 Z" fill="url(#liquidGlossGrad)" opacity="0.65" />
        </g>

        ${this.state.customName ? `
          <text x="170" y="278" text-anchor="middle" font-family="'Caveat', cursive, sans-serif" font-weight="700" font-size="30" fill="#FFF" stroke="#0F172A" stroke-width="0.75" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.8))">${this.state.customName.toUpperCase()}</text>
        ` : ''}

        ${renderHardwareAssembly(anchor.x, anchor.y, 'letter')}
      `;
    }

    // ==========================================
    // 2. BUILD BACK SVG (REVERSO)
    // ==========================================
    if (isPhoto) {
      const moldClipId = `clip-${shape}`;
      const anchor = this.getShapeAnchor(shape);

      let shapePathOutline = '';
      if (shape === 'rectangle') shapePathOutline = `<rect x="55" y="120" width="230" height="260" rx="26" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;
      else if (shape === 'circle') shapePathOutline = `<circle cx="170" cy="250" r="125" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;
      else if (shape === 'heart') shapePathOutline = `<path d="M 170,165 C 130,100 55,115 55,195 C 55,265 130,325 170,375 C 210,325 285,265 285,195 C 285,115 210,100 170,165 Z" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;
      else if (shape === 'hexagon') shapePathOutline = `<polygon points="170,125 285,190 285,315 170,380 55,315 55,190" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;
      else if (shape === 'dogtag') shapePathOutline = `<rect x="75" y="120" width="190" height="260" rx="38" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />`;

      let backContentHtml = '';
      let backTransformOverlay = '';

      if (this.state.photoBackType === 'photo') {
        const backFraming = this.state.photoBackShape || 'full';
        let activeBackClip = moldClipId;
        let backBackingDecor = '';

        if (backFraming === 'polaroid') {
          activeBackClip = 'photo-frame-polaroid';
          backBackingDecor = `
            <rect x="68" y="130" width="204" height="240" rx="8" fill="#F8FAFC" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
            <rect x="76" y="138" width="188" height="179" rx="4" fill="#0F172A" />
          `;
        } else if (backFraming === 'circle') {
          activeBackClip = 'photo-frame-circle';
          backBackingDecor = `
            <circle cx="170" cy="250" r="108" fill="#0F172A" stroke="rgba(255,255,255,0.7)" stroke-width="3" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
          `;
        } else if (backFraming === 'heart') {
          activeBackClip = 'photo-frame-heart';
          backBackingDecor = `
            <path d="M 170,180 C 135,120 75,135 75,205 C 75,265 135,320 170,365 C 205,320 265,265 265,205 C 265,135 205,120 170,180 Z" fill="#0F172A" stroke="rgba(255,255,255,0.7)" stroke-width="3" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
          `;
        } else if (backFraming === 'square') {
          activeBackClip = 'photo-frame-square';
          backBackingDecor = `
            <rect x="73" y="153" width="194" height="194" rx="22" fill="#0F172A" stroke="rgba(255,255,255,0.7)" stroke-width="3" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
          `;
        }

        const backTf = this.state.photoBackTransform;
        if (this.state.photoBackUrl) {
          backContentHtml = `
            ${backBackingDecor}
            <g clip-path="url(#${activeBackClip})">
              <g transform="translate(${(170 + backTf.x).toFixed(1)}, ${(250 + backTf.y).toFixed(1)}) scale(${backTf.scale}) translate(-170, -250)">
                <image href="${this.state.photoBackUrl}" x="50" y="115" width="240" height="270" preserveAspectRatio="xMidYMid slice" />
              </g>
            </g>
            <g transform="translate(170, 362)" class="btn-svg-upload" style="cursor: pointer;" onclick="ResinServiceApp.triggerPhotoUpload('back')">
              <rect x="-70" y="-13" width="140" height="26" rx="13" fill="rgba(15,23,42,0.92)" stroke="#A78BFA" stroke-width="1.4" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.7))" />
              <text x="0" y="4" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="800" font-size="10.5" fill="#FFF">📸 Cambiar Foto Reverso</text>
            </g>
          `;

          if (backTf.isSelected) {
            const boxW = 240 * backTf.scale;
            const boxH = 270 * backTf.scale;
            const boxX = (170 + backTf.x) - boxW / 2;
            const boxY = (250 + backTf.y) - boxH / 2;

            backTransformOverlay = `
              <g id="resin-back-transform-overlay" class="resin-photo-overlay">
                <rect x="${boxX.toFixed(1)}" y="${boxY.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="rgba(56, 189, 248, 0.08)" stroke="#38BDF8" stroke-width="2" stroke-dasharray="6,4" class="resin-drag-area" style="cursor: move;" />
                <line x1="${boxX.toFixed(1)}" y1="${(boxY + boxH/2).toFixed(1)}" x2="${(boxX + boxW).toFixed(1)}" y2="${(boxY + boxH/2).toFixed(1)}" stroke="#38BDF8" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.6" />
                <line x1="${(boxX + boxW/2).toFixed(1)}" y1="${boxY.toFixed(1)}" x2="${(boxX + boxW/2).toFixed(1)}" y2="${(boxY + boxH).toFixed(1)}" stroke="#38BDF8" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.6" />

                <circle cx="${boxX.toFixed(1)}" cy="${boxY.toFixed(1)}" r="8.5" fill="#0284C7" stroke="#FFF" stroke-width="2.5" class="resin-corner-handle" data-handle="tl" style="cursor: nwse-resize;" />
                <circle cx="${(boxX + boxW).toFixed(1)}" cy="${boxY.toFixed(1)}" r="8.5" fill="#0284C7" stroke="#FFF" stroke-width="2.5" class="resin-corner-handle" data-handle="tr" style="cursor: nesw-resize;" />
                <circle cx="${boxX.toFixed(1)}" cy="${(boxY + boxH).toFixed(1)}" r="8.5" fill="#0284C7" stroke="#FFF" stroke-width="2.5" class="resin-corner-handle" data-handle="bl" style="cursor: nesw-resize;" />
                <circle cx="${(boxX + boxW).toFixed(1)}" cy="${(boxY + boxH).toFixed(1)}" r="8.5" fill="#0284C7" stroke="#FFF" stroke-width="2.5" class="resin-corner-handle" data-handle="br" style="cursor: nwse-resize;" />

                <g transform="translate(${(boxX + boxW/2).toFixed(1)}, ${(boxY - 14).toFixed(1)})">
                  <rect x="-85" y="-12" width="170" height="24" rx="12" fill="#0F172A" stroke="#38BDF8" stroke-width="1.2" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))" />
                  <text x="0" y="4" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="800" font-size="9.5" fill="#38BDF8">✂️ Arrastra • Esquinas para Escalar</text>
                </g>
              </g>
            `;
          }
        } else {
          backContentHtml = `
            <rect x="0" y="100" width="340" height="300" fill="linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)" />
            <g transform="translate(170, 240)" class="btn-svg-upload" style="cursor: pointer;" onclick="ResinServiceApp.triggerPhotoUpload('back')">
              <circle cx="0" cy="0" r="42" fill="rgba(167, 139, 250, 0.28)" stroke="#A78BFA" stroke-width="2.2" filter="drop-shadow(0 4px 12px rgba(167,139,250,0.4))" />
              <text x="0" y="9" text-anchor="middle" font-size="30">🖼️</text>
              <text x="0" y="52" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="13.5" fill="#FFF">Toca para Subir Foto Reverso</text>
              <text x="0" y="70" text-anchor="middle" font-size="10.5" fill="#C7D2FE">Paso 2: Sube la segunda foto</text>
            </g>
          `;
        }
      } else if (this.state.photoBackType === 'spotify') {
        const song = this.state.photoBackSpotifySong || 'Tu Canción Favorita';
        const artist = this.state.photoBackSpotifyArtist || 'Artista Especial';
        backContentHtml = `
          <rect x="0" y="100" width="340" height="300" fill="#0C101A" />
          <g transform="translate(170, 235)">
            <circle cx="0" cy="-35" r="22" fill="#1DB954" filter="drop-shadow(0 4px 10px rgba(29,185,84,0.4))" />
            <path d="M -11,-42 Q 0,-47 11,-42 M -9,-36 Q 0,-40 9,-36 M -7,-30 Q 0,-33 7,-30" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
            
            <g transform="translate(-60, 5)">
              <line x1="0" y1="0" x2="0" y2="24" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
              <line x1="12" y1="-8" x2="12" y2="30" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
              <line x1="24" y1="-14" x2="24" y2="36" stroke="#1DB954" stroke-width="3" stroke-linecap="round" />
              <line x1="36" y1="-5" x2="36" y2="28" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
              <line x1="48" y1="-18" x2="48" y2="40" stroke="#1DB954" stroke-width="3.5" stroke-linecap="round" />
              <line x1="60" y1="-10" x2="60" y2="32" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
              <line x1="72" y1="-16" x2="72" y2="38" stroke="#1DB954" stroke-width="3" stroke-linecap="round" />
              <line x1="84" y1="-6" x2="84" y2="28" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
              <line x1="96" y1="-12" x2="96" y2="34" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
              <line x1="108" y1="-2" x2="108" y2="24" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
              <line x1="120" y1="4" x2="120" y2="20" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
            </g>

            <text x="0" y="65" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="13" fill="#FFF">${song}</text>
            <text x="0" y="82" text-anchor="middle" font-family="'Inter', sans-serif" font-size="11" fill="#94A3B8">${artist}</text>
          </g>
        `;
      } else if (this.state.photoBackType === 'phrase') {
        const phrase = this.state.photoBackPhrase || 'Siempre Juntos ❤️';
        backContentHtml = `
          <rect x="0" y="100" width="340" height="300" fill="linear-gradient(135deg, #1A1E2E 0%, #2A1F3D 100%)" />
          <rect x="0" y="100" width="340" height="300" fill="url(#chunkyGlitterPattern)" opacity="0.3" />
          <g transform="translate(170, 245)">
            <text x="0" y="0" text-anchor="middle" font-family="'Caveat', 'Brush Script MT', cursive" font-weight="700" font-size="28" fill="#FDE047" stroke="#854D0E" stroke-width="0.75" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.8))">
              ${phrase}
            </text>
            <circle cx="0" cy="25" r="4" fill="#FDE047" />
          </g>
        `;
      } else { // glitter
        backContentHtml = `
          <rect x="0" y="100" width="340" height="300" fill="#CA8A04" />
          <rect x="0" y="100" width="340" height="300" fill="url(#goldGlitterPattern)" />
          <rect x="0" y="100" width="340" height="300" fill="url(#chunkyGlitterPattern)" opacity="0.6" />
        `;
      }

      svgBack.innerHTML = `
        ${commonDefs}
        
        <!-- Drop Shadow -->
        <g opacity="0.65" filter="url(#softContactShadow)">
          ${shapePathOutline.replace(/fill="none"/g, 'fill="#000"').replace(/stroke="[^"]*"/g, 'stroke="#000"')}
        </g>

        <!-- 3D Resin Side Wall / Mold Rim (Depth Extrusion) -->
        <g transform="translate(0, 6)" opacity="0.5">
          ${shapePathOutline.replace(/fill="none"/g, 'fill="#831843"').replace(/stroke="[^"]*"/g, 'stroke="url(#resin3dWallGrad)" stroke-width="7"')}
        </g>
        <g transform="translate(0, 3)" opacity="0.7">
          ${shapePathOutline.replace(/fill="none"/g, 'fill="#BE185D"').replace(/stroke="[^"]*"/g, 'stroke="url(#resin3dWallGrad)" stroke-width="5"')}
        </g>

        <!-- Main Cast Back Content -->
        <g clip-path="url(#${moldClipId})">
          <rect x="0" y="100" width="340" height="300" fill="#1E293B" />
          ${backContentHtml}
          ${getBorderFlakesHtml(moldClipId)}
          <path d="M 50,140 Q 170,200 290,150 L 290,210 Q 170,260 50,200 Z" fill="url(#liquidGlossGrad)" opacity="0.75" pointer-events="none" />
          <ellipse cx="120" cy="320" rx="35" ry="12" fill="rgba(255,255,255,0.25)" transform="rotate(-18 120 320)" pointer-events="none" />
          <text x="75" y="150" font-size="14" fill="#FFF" opacity="0.9" filter="drop-shadow(0 0 6px #FFF)" pointer-events="none">✦</text>
          <text x="255" y="345" font-size="11" fill="#FFF" opacity="0.75" filter="drop-shadow(0 0 4px #FFF)" pointer-events="none">✦</text>
        </g>

        <!-- Meniscus Border Bevel Line -->
        <g stroke="url(#resinMeniscusBevel)">
          ${shapePathOutline}
        </g>

        <!-- Unbroken Hardware & Chains -->
        ${renderHardwareAssembly(anchor.x, anchor.y, shape)}

        <!-- Interactive Transformation Overlay -->
        ${backTransformOverlay}
      `;
    } else {
      // Letter Mode back side (mirrored letter)
      svgBack.innerHTML = svgFront.innerHTML;
    }
  },

    // Helper for connecting chain links without breakage
  renderChain(anchorX, anchorY, isSilver, shape = 'rectangle') {
    const metalGrad = isSilver ? 'url(#silverHardwareGrad)' : 'url(#goldHardwareGrad)';
    const shadowColor = isSilver ? 'rgba(0,0,0,0.5)' : 'rgba(120,53,15,0.45)';
    const p0 = { x: 170, y: 71 }; // Bottom of split keyring
    const p2 = { x: anchorX, y: anchorY }; // Connection point into resin

    // Top Jump Ring (connecting through the split ring)
    let outputHtml = `
      <g filter="drop-shadow(0 2px 3px rgba(0,0,0,0.4))">
        <ellipse cx="170" cy="73" rx="4.5" ry="6.5" fill="none" stroke="${metalGrad}" stroke-width="2.8" />
        <ellipse cx="170" cy="73" rx="2.5" ry="4.5" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8" />
      </g>
    `;

    // Dynamic link calculation so every link overlaps smoothly without gaps
    const dist = Math.hypot(p2.x - p0.x, p2.y - p0.y);
    const linkPitch = 9.2; // Spacing between link centers
    const numLinks = Math.max(5, Math.ceil(dist / linkPitch));

    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;
    const p1 = { x: p0.x + dx * 0.15, y: p0.y + dy * 0.65 };

    for (let i = 0; i < numLinks; i++) {
      const t = (i + 0.6) / (numLinks + 0.2);
      const invT = 1 - t;
      const cx = invT * invT * p0.x + 2 * invT * t * p1.x + t * t * p2.x;
      const cy = invT * invT * p0.y + 2 * invT * t * p1.y + t * t * p2.y;

      const tx = 2 * invT * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const ty = 2 * invT * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      const angle = (Math.atan2(tx, ty) * 180) / Math.PI;

      if (i % 2 === 0) {
        // Front-facing link
        outputHtml += `
          <g transform="rotate(${angle.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" filter="drop-shadow(0 2px 3px ${shadowColor})">
            <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="4.8" ry="8.2" fill="none" stroke="${metalGrad}" stroke-width="3" />
            <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="2.4" ry="5.8" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8" />
          </g>
        `;
      } else {
        // Interlaced side-facing link (tilted to thread through adjacent links)
        const sideTilt = angle + (i % 4 === 1 ? 14 : -14);
        outputHtml += `
          <g transform="rotate(${sideTilt.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" filter="drop-shadow(0 2px 3px ${shadowColor})">
            <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="2.6" ry="8.0" fill="none" stroke="${metalGrad}" stroke-width="3.2" />
            <line x1="${cx.toFixed(1)}" y1="${(cy - 6).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(cy + 6).toFixed(1)}" stroke="rgba(255,255,255,0.5)" stroke-width="1" />
          </g>
        `;
      }
    }

    // Bottom Anchor: Eyelet Screw (Cáncamo) or Dogtag Jump Ring
    if (shape === 'dogtag') {
      outputHtml += `
        <g filter="drop-shadow(0 3px 5px rgba(0,0,0,0.5))">
          <circle cx="${anchorX}" cy="${anchorY + 16}" r="6" fill="#0F172A" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <ellipse cx="${anchorX}" cy="${anchorY + 8}" rx="6" ry="11" fill="none" stroke="${metalGrad}" stroke-width="3.4" />
          <ellipse cx="${anchorX}" cy="${anchorY + 8}" rx="3.2" ry="8" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.8" />
        </g>
      `;
    } else {
      outputHtml += `
        <g filter="drop-shadow(0 3px 5px rgba(0,0,0,0.5))">
          <circle cx="${anchorX}" cy="${anchorY}" r="5.5" fill="none" stroke="${metalGrad}" stroke-width="3.2" />
          <circle cx="${anchorX}" cy="${anchorY}" r="3" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8" />
          <ellipse cx="${anchorX}" cy="${anchorY + 6}" rx="3.8" ry="1.6" fill="${metalGrad}" />
          <!-- Screw stem entering into resin with thread ridges -->
          <line x1="${anchorX}" y1="${anchorY + 6}" x2="${anchorX}" y2="${anchorY + 20}" stroke="${metalGrad}" stroke-width="2.8" stroke-linecap="round" />
          <line x1="${anchorX - 0.7}" y1="${anchorY + 7}" x2="${anchorX - 0.7}" y2="${anchorY + 18}" stroke="rgba(255,255,255,0.6)" stroke-width="1" stroke-linecap="round" />
          <line x1="${anchorX - 2.5}" y1="${anchorY + 9}" x2="${anchorX + 2.5}" y2="${anchorY + 10.5}" stroke="${metalGrad}" stroke-width="1.2" stroke-linecap="round" />
          <line x1="${anchorX - 2.5}" y1="${anchorY + 13}" x2="${anchorX + 2.5}" y2="${anchorY + 14.5}" stroke="${metalGrad}" stroke-width="1.2" stroke-linecap="round" />
          <line x1="${anchorX - 2.5}" y1="${anchorY + 17}" x2="${anchorX + 2.5}" y2="${anchorY + 18.5}" stroke="${metalGrad}" stroke-width="1.2" stroke-linecap="round" />
        </g>
      `;
    }

    return outputHtml;
  },

  getLetterAnchor(letter) {
    const l = (letter || 'M').toUpperCase();
    const yAnchor = 186; // Screw eyelet hole placed right at top of letter so screw embeds into resin
    switch (l) {
      case 'A': return { x: 170, y: yAnchor };
      case 'B': return { x: 135, y: yAnchor };
      case 'C': return { x: 170, y: yAnchor };
      case 'D': return { x: 145, y: yAnchor };
      case 'E': return { x: 165, y: yAnchor };
      case 'F': return { x: 165, y: yAnchor };
      case 'G': return { x: 170, y: yAnchor };
      case 'H': return { x: 114, y: yAnchor };
      case 'I': return { x: 170, y: yAnchor };
      case 'J': return { x: 194, y: yAnchor };
      case 'K': return { x: 114, y: yAnchor };
      case 'L': return { x: 116, y: yAnchor };
      case 'M': return { x: 106, y: yAnchor };
      case 'N': return { x: 114, y: yAnchor };
      case 'O': return { x: 170, y: yAnchor };
      case 'P': return { x: 145, y: yAnchor };
      case 'Q': return { x: 170, y: yAnchor };
      case 'R': return { x: 145, y: yAnchor };
      case 'S': return { x: 170, y: yAnchor };
      case 'T': return { x: 170, y: yAnchor };
      case 'U': return { x: 116, y: yAnchor };
      case 'V': return { x: 116, y: yAnchor };
      case 'W': return { x: 170, y: yAnchor };
      case 'X': return { x: 116, y: yAnchor };
      case 'Y': return { x: 116, y: yAnchor };
      case 'Z': return { x: 170, y: yAnchor };
      default:  return { x: 140, y: yAnchor };
    }
  },

  adjustColor(hex, lum) {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    lum = lum || 0;
    let rgb = '#', c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ('00' + c).substr(c.length);
    }
    return rgb;
  },

  // =========================================================================
  // Delivery Drawer Management (Completely Separate / Zero Defaults)
  // =========================================================================
  openDeliveryDrawer() {
    const drawer = document.getElementById('resin-delivery-drawer');
    if (!drawer) return;

    const pricing = this.calculatePricing();
    const isPhoto = this.state.productType === 'photo';

    const summaryBox = document.getElementById('resin-delivery-summary-box');
    if (summaryBox) {
      let desc = isPhoto
        ? `📸 <strong>Llavero Fotográfico en Resina (${this.state.photoShapeName})</strong>`
        : `🔤 <strong>Llavero de Inicial "${this.state.letter}" (${this.state.baseColorName})</strong>`;

      if (isPhoto && this.state.hasNfc) {
        desc += `<br>📶 <em>Chip NFC Inteligente incluido (${this.state.nfcType})</em>`;
      }
      desc += `<br>✨ Herraje: ${this.state.hardware === 'gold' ? 'Dorado' : 'Plateado'} • Borla: ${this.state.tasselName}`;
      desc += `<br>🎨 <strong>Presupuesto: Bajo Cotización Previa (Presupuesto sin costo)</strong>`;

      summaryBox.innerHTML = desc;
    }

    drawer.classList.add('open');
  },

  closeDeliveryDrawer() {
    const drawer = document.getElementById('resin-delivery-drawer');
    if (drawer) drawer.classList.remove('open');
  },

  detectLiveGps() {
    const btn = document.getElementById('btn-resin-gps-detect');
    const icon = document.getElementById('resin-gps-icon');
    const btnText = document.getElementById('resin-gps-btn-text');
    const statusBox = document.getElementById('resin-gps-status-box');

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización satelital.');
      return;
    }

    if (btn) btn.disabled = true;
    if (icon) icon.textContent = '⏳';
    if (btnText) btnText.textContent = 'Detectando satélites GPS...';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        this.state.gps = { lat, lng, accuracy: acc, mapUrl };

        if (btn) btn.disabled = false;
        if (icon) icon.textContent = '✅';
        if (btnText) btnText.textContent = 'GPS Capturado con Éxito';

        if (statusBox) {
          statusBox.style.display = 'block';
          statusBox.innerHTML = `
            <div style="color: #34D399; font-weight: 800; margin-bottom: 2px;">
              📍 Ubicación satelital detectada (±${acc}m)
            </div>
            <div style="font-size: 11px; color: #CBD5E1;">
              Coords: <code>${lat.toFixed(5)}, ${lng.toFixed(5)}</code> &nbsp;•&nbsp;
              <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" style="color: #38BDF8; text-decoration: underline; font-weight: 700;">
                Ver en Google Maps ↗
              </a>
            </div>
          `;
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        if (btn) btn.disabled = false;
        if (icon) icon.textContent = '📡';
        if (btnText) btnText.textContent = 'Reintentar Captura GPS';
        if (statusBox) {
          statusBox.style.display = 'block';
          statusBox.innerHTML = `<span style="color: #F87171;">⚠️ No se pudo obtener la señal GPS. Escribe tu dirección en el campo de texto.</span>`;
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  },

  handleConfirmOrderClick(e) {
    if (e) e.preventDefault();

    const nameInput = document.getElementById('input-resin-customer-name');
    const phoneInput = document.getElementById('input-resin-customer-phone');
    const citySelect = document.getElementById('select-resin-city');
    const addressInput = document.getElementById('input-resin-address');
    const refInput = document.getElementById('input-resin-reference');
    const paymentSelect = document.getElementById('select-resin-payment');

    const customerName = (nameInput?.value || '').trim();
    const customerPhone = (phoneInput?.value || '').trim();
    const deliveryCity = (citySelect?.value || '').trim();
    const deliveryAddress = (addressInput?.value || '').trim();
    const deliveryReference = (refInput?.value || '').trim();
    const paymentMethod = (paymentSelect?.value || '').trim();

    if (!customerName) {
      alert('⚠️ Por favor ingresa tu Nombre y Apellido.');
      if (nameInput) nameInput.focus();
      return;
    }
    if (!customerPhone || customerPhone.length < 7) {
      alert('⚠️ Por favor ingresa tu número de Teléfono / WhatsApp.');
      if (phoneInput) phoneInput.focus();
      return;
    }
    if (!deliveryCity) {
      alert('⚠️ Por favor selecciona tu Ciudad o Municipio de entrega.');
      if (citySelect) citySelect.focus();
      return;
    }
    if (!deliveryAddress) {
      alert('⚠️ Por favor indica la dirección exacta de entrega.');
      if (addressInput) addressInput.focus();
      return;
    }

    this.state.customerName = customerName;
    this.state.customerPhone = customerPhone;
    this.state.deliveryCity = deliveryCity;
    this.state.deliveryAddress = deliveryAddress;
    this.state.deliveryReference = deliveryReference;
    this.state.paymentMethod = paymentMethod || 'Efectivo en Pesos COP';

    // Register quote to backend
    this.registerQuoteSilently();

    // Construct and open WhatsApp
    const waText = this.buildWhatsAppMessage();
    const targetWa = this.resinWhatsAppNumber || '573227949751';
    const waUrl = `https://wa.me/${targetWa}?text=${waText}`;

    try {
      const win = window.open(waUrl, '_blank');
      if (!win) window.location.href = waUrl;
    } catch(err) {
      window.location.href = waUrl;
    }
  },

  buildWhatsAppMessage() {
    const pricing = this.calculatePricing();
    const isPhoto = this.state.productType === 'photo';

    let itemBlock = '';
    if (isPhoto) {
      itemBlock += `📸 *PRODUCTO:* Llavero Fotográfico Personalizado en Resina\n`;
      itemBlock += `🔲 *Forma del Molde:* ${this.state.photoShapeName}\n`;
      itemBlock += `🖼️ *Cara Delantera:* ${this.state.photoFrontUrl ? 'Foto personalizada cargada (Te la adjunto en este chat 📷)' : 'Sin foto previa'}\n`;
      itemBlock += `✨ *Acabado de Bordes:* ${this.borderEffects.find(b => b.id === this.state.photoBorderEffect)?.name || 'Pan de Oro'}\n`;
      
      let backDesc = 'Fondo artesanal de resina con glitter';
      if (this.state.photoBackType === 'photo') {
        backDesc = 'Segunda foto personalizada (Te la adjunto en este chat 📷)';
      } else if (this.state.photoBackType === 'spotify') {
        backDesc = `Código Spotify: "${this.state.photoBackSpotifySong || 'Canción'}" de ${this.state.photoBackSpotifyArtist || 'Artista'}`;
      } else if (this.state.photoBackType === 'phrase') {
        backDesc = `Dedicatoria en Vinil: "${this.state.photoBackPhrase || 'Sin frase'}"`;
      }
      itemBlock += `🔄 *Cara Trasera:* ${backDesc}\n`;

      if (this.state.hasNfc) {
        itemBlock += `📶 *Chip NFC Inteligente:* ACTIVADO ((📶))\n`;
        itemBlock += `🔗 *Enlace para programar chip:* ${this.state.nfcUrl || 'Por definir con el taller'}\n`;
      } else {
        itemBlock += `📶 *Chip NFC:* No solicitado\n`;
      }
    } else {
      itemBlock += `🔤 *PRODUCTO:* Llavero de Letra / Inicial en Resina\n`;
      itemBlock += `🔤 *Letra:* "${this.state.letter}"\n`;
      itemBlock += `🎨 *Color Base:* ${this.state.baseColorName}\n`;
      itemBlock += `✨ *Estilo:* ${this.state.inclusions}\n`;
      if (this.state.customName) {
        itemBlock += `✍️ *Nombre en Vinil:* "${this.state.customName.toUpperCase()}"\n`;
      }
    }

    itemBlock += `🔘 *Herraje Metálico:* ${this.state.hardware === 'gold' ? 'Dorado de Lujo ✨' : 'Plateado Cromado 🔘'}\n`;
    itemBlock += `🪢 *Borla de Gamuza (Tassel):* ${this.state.tasselName}\n`;
    if (this.state.extraCharmId !== 'none') {
      const charmObj = this.charms.find(c => c.id === this.state.extraCharmId);
      itemBlock += `🧸 *Dije Extra:* ${charmObj ? charmObj.name : 'Ninguno'}\n`;
    }
    itemBlock += `🔢 *Cantidad:* ${this.state.quantity} unidad(es)\n`;

    let deliveryBlock = `📦 *DATOS DE ENTREGA & CONTACTO:*\n`;
    deliveryBlock += `👤 *Cliente:* ${this.state.customerName}\n`;
    deliveryBlock += `📱 *Teléfono / WhatsApp:* ${this.state.customerPhone}\n`;
    deliveryBlock += `🏙️ *Ciudad / Municipio:* ${this.state.deliveryCity}\n`;
    deliveryBlock += `🏠 *Dirección:* ${this.state.deliveryAddress}\n`;
    if (this.state.deliveryReference) {
      deliveryBlock += `📌 *Punto de Referencia:* ${this.state.deliveryReference}\n`;
    }
    deliveryBlock += `💳 *Método de Pago:* ${this.state.paymentMethod}\n`;

    if (this.state.gps && this.state.gps.mapUrl) {
      deliveryBlock += `📍 *Ubicación GPS Satelital:* ${this.state.gps.mapUrl}\n`;
    }

    const text =
`✨ *¡SOLICITUD DE COTIZACIÓN - SHELLI ART!* ✨
━━━━━━━━━━━━━━━━━━━━
${itemBlock}
━━━━━━━━━━━━━━━━━━━━
🎨 *PRESUPUESTO:* Bajo Cotización Previa
💡 *Acordar precio con el taller según diseño y fotos*
━━━━━━━━━━━━━━━━━━━━
${deliveryBlock}
━━━━━━━━━━━━━━━━━━━━
📍 *Enviado desde PediGochos App*
💬 *Taller Shelli Art WhatsApp Oficial: ${this.resinWhatsAppDisplay}*

_Hola Shelli Art, acabo de diseñar mi llavero personalizado en la app. ¿Podrían confirmarme el presupuesto y tiempo de elaboración para este diseño? ¡Gracias!_`;

    return encodeURIComponent(text);
  },

  async registerQuoteSilently() {
    try {
      const pricing = this.calculatePricing();
      const isPhoto = this.state.productType === 'photo';

      const payload = {
        clientName: this.state.customerName || 'Cliente WhatsApp',
        clientPhone: this.state.customerPhone || '',
        productType: isPhoto ? 'photo' : 'keychain_letter',
        productTitle: isPhoto ? `Llavero Personalizado (${this.state.photoShapeName})` : `Llavero de Inicial "${this.state.letter}"`,
        photoShape: this.state.photoShape,
        photoShapeName: this.state.photoShapeName,
        photoFrontUrl: this.state.photoFrontUrl,
        photoBackType: this.state.photoBackType,
        photoBackUrl: this.state.photoBackUrl,
        photoBackSpotify: `${this.state.photoBackSpotifySong} - ${this.state.photoBackSpotifyArtist}`,
        photoBackPhrase: this.state.photoBackPhrase,
        hasNfc: this.state.hasNfc,
        nfcType: this.state.nfcType,
        nfcUrl: this.state.nfcUrl,
        letter: this.state.letter,
        baseColor: this.state.baseColorHex,
        baseColorName: this.state.baseColorName,
        tasselColor: this.state.tasselName,
        hardwareColor: this.state.hardware === 'gold' ? 'Dorado' : 'Plateado',
        quantity: this.state.quantity,
        basePriceUsd: pricing.basePrice,
        estimatedPriceUsd: pricing.totalUsd,
        deliveryCity: this.state.deliveryCity,
        deliveryAddress: this.state.deliveryAddress,
        deliveryReference: this.state.deliveryReference,
        paymentMethod: this.state.paymentMethod,
        gps: this.state.gps,
        gpsMapUrl: this.state.gps?.mapUrl || ''
      };

      await fetch('/api/resin-services/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch(e) {
      console.warn('Silent resin quote save error:', e);
    }
  },

  async submitInAppOrder() {
    const nameInput = document.getElementById('input-resin-customer-name');
    const phoneInput = document.getElementById('input-resin-customer-phone');
    const citySelect = document.getElementById('select-resin-city');
    const addressInput = document.getElementById('input-resin-address');

    const customerName = (nameInput?.value || '').trim();
    const customerPhone = (phoneInput?.value || '').trim();
    const deliveryCity = (citySelect?.value || '').trim();
    const deliveryAddress = (addressInput?.value || '').trim();

    if (!customerName || !customerPhone || !deliveryAddress) {
      alert('⚠️ Por favor completa tu nombre, teléfono y dirección antes de enviar.');
      return;
    }

    const pricing = this.calculatePricing();
    const isPhoto = this.state.productType === 'photo';

    const payload = {
      clientName: customerName,
      clientPhone: customerPhone,
      productType: isPhoto ? 'photo' : 'keychain_letter',
      productTitle: isPhoto ? `Llavero Personalizado (${this.state.photoShapeName})` : `Llavero de Inicial "${this.state.letter}"`,
      photoShape: this.state.photoShape,
      photoShapeName: this.state.photoShapeName,
      photoFrontUrl: this.state.photoFrontUrl,
      photoBackType: this.state.photoBackType,
      photoBackUrl: this.state.photoBackUrl,
      photoBackSpotify: `${this.state.photoBackSpotifySong} - ${this.state.photoBackSpotifyArtist}`,
      photoBackPhrase: this.state.photoBackPhrase,
      hasNfc: this.state.hasNfc,
      nfcType: this.state.nfcType,
      nfcUrl: this.state.nfcUrl,
      letter: this.state.letter,
      baseColor: this.state.baseColorHex,
      baseColorName: this.state.baseColorName,
      tasselColor: this.state.tasselName,
      hardwareColor: this.state.hardware === 'gold' ? 'Dorado' : 'Plateado',
      quantity: this.state.quantity,
      basePriceUsd: pricing.basePrice,
      estimatedPriceUsd: pricing.totalUsd,
      deliveryCity: deliveryCity,
      deliveryAddress: deliveryAddress,
      deliveryReference: document.getElementById('input-resin-reference')?.value || '',
      paymentMethod: document.getElementById('select-resin-payment')?.value || '',
      gps: this.state.gps,
      gpsMapUrl: this.state.gps?.mapUrl || ''
    };

    try {
      const res = await fetch('/api/resin-services/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.closeDeliveryDrawer();
        this.openChatModal(data.quote);
      }
    } catch(e) {
      console.error('Error submitting resin order:', e);
      alert('Error enviando pedido. Por favor verifica tu conexión o pide por WhatsApp.');
    }
  },

  openChatModal(quote) {
    this.activeQuote = quote;
    let modal = document.getElementById('resin-chat-modal');
    if (!modal) {
      this.renderChatModalMarkup();
      modal = document.getElementById('resin-chat-modal');
    }
    this.updateFichaTecnica(quote);
    this.loadChatMessages(quote.id);
    modal.classList.remove('hidden');
  },

  closeChatModal() {
    const modal = document.getElementById('resin-chat-modal');
    if (modal) modal.classList.add('hidden');
  },

  renderChatModalMarkup() {
    const div = document.createElement('div');
    div.id = 'resin-chat-modal';
    div.className = 'resin-chat-modal';
    div.innerHTML = `
      <header class="resin-chat-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="resin-back-btn" onclick="ResinServiceApp.closeChatModal()">←</button>
          <div>
            <h3><span>✨</span> Chat con Shelli Art</h3>
            <span style="font-size: 11px; color: #F472B6; font-weight: 700;">Taller Artesanal • San Antonio & Cúcuta</span>
          </div>
        </div>
        <button type="button" onclick="ResinServiceApp.closeChatModal()" style="background: none; border: none; color: #94A3B8; font-size: 18px; cursor: pointer;">✕</button>
      </header>

      <main class="resin-chat-body">
        <div class="resin-quote-sheet" id="resin-ficha-tecnica"></div>
        <div class="resin-messages-area" id="resin-chat-messages"></div>
        <form class="resin-chat-input-bar" onsubmit="event.preventDefault(); ResinServiceApp.sendMessage();">
          <input type="text" id="resin-chat-input" placeholder="Escribe al taller de Shelli Art...">
          <button type="submit" class="btn-send-resin-msg" title="Enviar">➤</button>
        </form>
      </main>
    `;
    document.body.appendChild(div);
  },

  updateFichaTecnica(quote) {
    const el = document.getElementById('resin-ficha-tecnica');
    if (!el) return;

    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="color: #FFF; font-size: 14px;">Pedido #${quote.id.slice(-6)}: ${quote.productTitle}</strong>
        <span style="background: rgba(244, 114, 182, 0.2); color: #FBCFE8; padding: 2px 8px; border-radius: 10px; font-size: 10.5px; font-weight: 800;">${quote.status || 'Solicitado'}</span>
      </div>
      <div style="font-size: 11.5px; color: #CBD5E1; line-height: 1.45;">
        <span>Cliente: <strong>${quote.clientName}</strong> (${quote.clientPhone || 'Sin teléfono'})</span><br>
        ${quote.photoShape ? `<span>Molde: <strong>${quote.photoShapeName || quote.photoShape}</strong></span><br>` : ''}
        ${quote.hasNfc ? `<span>Chip NFC: <strong>${quote.nfcType} (${quote.nfcUrl || 'Enlace pendiente'})</strong></span><br>` : ''}
        <span>Presupuesto: <strong style="color: #38BDF8;">${quote.agreedPriceUsd ? `$${quote.agreedPriceUsd} USD` : 'Bajo Cotización Previa'}</strong></span>
      </div>
    `;
  },

  async loadChatMessages(quoteId) {
    const area = document.getElementById('resin-chat-messages');
    if (!area) return;

    try {
      const res = await fetch(`/api/resin-services/quotes/${quoteId}`);
      const quote = await res.json();
      area.innerHTML = '';
      (quote.messages || []).forEach(msg => {
        this.appendChatMessage(msg);
      });
      area.scrollTop = area.scrollHeight;
    } catch(e) {
      console.warn('Could not load resin chat messages:', e);
    }
  },

  appendChatMessage(msg) {
    const area = document.getElementById('resin-chat-messages');
    if (!area) return;

    const isIncoming = msg.senderRole === 'workshop' || msg.senderRole === 'admin';
    const div = document.createElement('div');
    div.className = `resin-msg-bubble ${isIncoming ? 'resin-msg-incoming' : 'resin-msg-outgoing'}`;
    div.innerHTML = `
      <div>${msg.text}</div>
      <div style="font-size: 10px; opacity: 0.7; margin-top: 4px; text-align: right;">
        ${new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    `;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  },

  async sendMessage() {
    const input = document.getElementById('resin-chat-input');
    if (!input || !this.activeQuote) return;
    const text = input.value.trim();
    if (!text) return;

    const payload = {
      text,
      senderRole: 'client',
      senderName: this.activeQuote.clientName || 'Cliente'
    };

    input.value = '';

    try {
      const res = await fetch(`/api/resin-services/quotes/${this.activeQuote.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        this.appendChatMessage(data.message);
      }
    } catch(e) {
      console.error('Error sending message:', e);
    }
  }
};

window.ResinServiceApp = ResinServiceApp;
document.addEventListener('DOMContentLoaded', () => ResinServiceApp.init());
