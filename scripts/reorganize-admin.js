const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.join(__dirname, '..', 'public', 'admin.html');
let html = fs.readFileSync(adminHtmlPath, 'utf8');

const mainStart = html.indexOf('<main class="admin-main-workspace">');
const mainEnd = html.indexOf('</main>', mainStart);

const beforeMain = html.substring(0, mainStart);
const mainContent = html.substring(mainStart + '<main class="admin-main-workspace">'.length, mainEnd);
const afterMain = html.substring(mainEnd);

// Identify card boundaries
const posRestaurants = mainContent.lastIndexOf('<div class="admin-card"', mainContent.indexOf('id="admin-restaurants-card"'));
const posDriverChat = mainContent.lastIndexOf('<!-- Card', mainContent.indexOf('id="admin-driver-chat-card"'));
const posServices = mainContent.lastIndexOf('<!-- Card', mainContent.indexOf('id="admin-services-manager-card"'));
const posLiveOrders = mainContent.lastIndexOf('<!-- Card', mainContent.indexOf('id="admin-live-orders-card"'));
const posFleet = mainContent.lastIndexOf('<!-- Card', mainContent.indexOf('Flota de Repartidores y Drivers'));
const posAnalytics = mainContent.lastIndexOf('<!-- Card', mainContent.indexOf('id="admin-analytics-pro-card"'));
const posMasterCatalog = mainContent.lastIndexOf('<!-- Card', mainContent.indexOf('Catálogo Maestro (Dueño)'));

let blockRestaurants = mainContent.substring(posRestaurants, posDriverChat).trim();
let blockDriverChat = mainContent.substring(posDriverChat, posServices).trim();
let blockServices = mainContent.substring(posServices, posLiveOrders).trim();
let blockLiveOrders = mainContent.substring(posLiveOrders, posFleet).trim();
let blockFleet = mainContent.substring(posFleet, posAnalytics).trim();
let blockAnalytics = mainContent.substring(posAnalytics, posMasterCatalog).trim();
let blockMasterCatalog = mainContent.substring(posMasterCatalog).trim();

// Top Navigation Dock
const dockNavHtml = `
    <!-- Gemini 3.8 Edition: Top Workspace Navigation Dock -->
    <nav class="admin-nav-dock">
      <button type="button" class="admin-dock-tab active btn-3d" id="dock-btn-orders" onclick="AdminApp.switchWorkspace('orders')">
        <span class="dock-tab-icon">📋</span>
        <span class="dock-tab-title">Pedidos en Vivo</span>
        <span class="dock-tab-badge" id="dock-orders-badge" style="display: none;">0</span>
      </button>
      <button type="button" class="admin-dock-tab btn-3d" id="dock-btn-restaurants" onclick="AdminApp.switchWorkspace('restaurants')">
        <span class="dock-tab-icon">🏪</span>
        <span class="dock-tab-title">Restaurantes & Comercios</span>
      </button>
      <button type="button" class="admin-dock-tab btn-3d" id="dock-btn-menu-tables" onclick="AdminApp.switchWorkspace('menu-tables')">
        <span class="dock-tab-icon">🍽️</span>
        <span class="dock-tab-title">Taller de Menú & Mesas</span>
      </button>
      <button type="button" class="admin-dock-tab btn-3d" id="dock-btn-services" onclick="AdminApp.switchWorkspace('services')">
        <span class="dock-tab-icon">✨</span>
        <span class="dock-tab-title">Servicios Aliados</span>
      </button>
      <button type="button" class="admin-dock-tab btn-3d" id="dock-btn-fleet" onclick="AdminApp.switchWorkspace('fleet')">
        <span class="dock-tab-icon">🛵</span>
        <span class="dock-tab-title">Flota & Repartidores</span>
      </button>
      <button type="button" class="admin-dock-tab btn-3d" id="dock-btn-finance" onclick="AdminApp.switchWorkspace('finance')">
        <span class="dock-tab-icon">📊</span>
        <span class="dock-tab-title">Finanzas & Tasas</span>
      </button>
    </nav>
`;

// Taller de Menú & Mesas Dedicated Studio
const studioLayoutHtml = `
      <!-- Workspace 3: Taller de Menú & Mesas (Studio Gemini 3.8 Edition) -->
      <div class="admin-card studio-card" style="border: 1.5px solid rgba(255, 107, 0, 0.4); background: linear-gradient(135deg, #131E2C 0%, #0F172A 100%); border-radius: 18px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); color: #fff; margin-bottom: 24px;">
        
        <!-- Top Bar: Active Restaurant Selector & Quick Actions -->
        <div class="studio-top-selector-card">
          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 28px;">🍽️</span>
              <div>
                <h3 style="margin: 0; color: #FFF; font-size: 18px; font-weight: 900;">Taller de Menú & Mesas</h3>
                <p style="margin: 2px 0 0 0; color: #94A3B8; font-size: 12px;">Gestor central de carta, inventario, modificadores, mesas y códigos QR</p>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px;">
              <label for="studio-active-restaurant-select" style="font-size: 12px; font-weight: 800; color: #FCD34D;">Comercio Activo:</label>
              <select id="studio-active-restaurant-select" class="studio-restaurant-dropdown" onchange="AdminApp.onStudioRestaurantSelect(this.value)">
                <!-- Loaded dynamically -->
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;" id="studio-header-quick-actions">
            <button type="button" class="btn-3d btn-3d-amber" onclick="AdminApp.openActiveStoreKitchen()" title="Abrir cocina en vivo (KDS)">
              <span>🍳</span> KDS Cocina
            </button>
            <button type="button" class="btn-3d btn-3d-cyan" onclick="AdminApp.openActiveStoreQR()" title="Ver enlace y QR para compartir">
              <span>📱</span> Ver QR
            </button>
            <button type="button" class="btn-3d btn-3d-purple" onclick="AdminApp.openActiveStoreInfo()" title="Editar información del comercio">
              <span>⚙️</span> Info Local
            </button>
          </div>
        </div>

        <!-- Studio Navigation Tabs -->
        <div class="studio-nav-tabs">
          <button type="button" class="studio-nav-tab active btn-3d" id="studio-tab-btn-menu" onclick="AdminApp.switchStudioTab('menu')">
            <span>🍔 Carta & Productos</span>
          </button>
          <button type="button" class="studio-nav-tab btn-3d" id="studio-tab-btn-tables" onclick="AdminApp.switchStudioTab('tables')">
            <span>🪑 Mesas & Códigos QR</span>
          </button>
          <button type="button" class="studio-nav-tab btn-3d" id="studio-tab-btn-daily" onclick="AdminApp.switchStudioTab('daily')">
            <span>📅 Menú del Día</span>
          </button>
          <button type="button" class="studio-nav-tab btn-3d" id="studio-tab-btn-ai" onclick="AdminApp.switchStudioTab('ai')" style="border-color: rgba(168, 85, 247, 0.45); color: #C084FC;">
            <span>🤖 Escanear Carta IA</span>
          </button>
          <button type="button" class="studio-nav-tab btn-3d" id="studio-tab-btn-catalog" onclick="AdminApp.switchStudioTab('catalog')">
            <span>⚡ Catálogo Maestro</span>
          </button>
        </div>

        <!-- Subtab 1: Carta & Productos -->
        <div id="studio-tab-content-menu" class="studio-tab-pane active">
          <!-- Missing Prices Alert Banner -->
          <div id="studio-missing-prices-banner" class="hidden" style="background: rgba(245, 158, 11, 0.12); border: 1.5px solid #F59E0B; border-radius: 12px; padding: 10px 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">⚠️</span>
              <div>
                <strong id="studio-missing-prices-text" style="color: #FCD34D; font-size: 12.5px;">Tienes adicionales/platos sin precio registrado</strong>
                <p style="margin: 0; font-size: 11px; color: #CBD5E1;">Completa los precios rápidamente para habilitarlos para tus clientes.</p>
              </div>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="btn-3d btn-3d-danger" onclick="AdminApp.openClearModifiersModal()" style="padding: 6px 12px; font-size: 11px;">
                🗑️ Limpiar Adicionales
              </button>
              <button type="button" class="btn-3d btn-3d-amber" onclick="AdminApp.openQuickFillPricesModal()" style="padding: 6px 12px; font-size: 11px;">
                ⚡ Llenar Precios
              </button>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🍔</span>
              <h4 style="color: #ffffff; font-size: 15px; margin: 0; font-weight: 800;">Carta y Productos del Restaurante Activo</h4>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-3d btn-3d-amber" onclick="AdminApp.openPizzaCrustsManagerModal()" style="padding: 7px 12px; font-size: 11.5px;">
                <span>🧀</span> Bordes Pizza
              </button>
              <button type="button" class="btn-3d btn-3d-purple" onclick="AdminApp.switchStudioTab('ai')" style="padding: 7px 12px; font-size: 11.5px;">
                <span>✨📸</span> Escanear con IA
              </button>
              <button type="button" class="btn-3d btn-3d-cyan" onclick="createNewCategory()" style="padding: 7px 12px; font-size: 11.5px;">
                <span>➕</span> Categoría
              </button>
              <button type="button" class="btn-3d btn-3d-primary" onclick="AdminApp.openMenuModal()" style="padding: 7px 14px; font-size: 11.5px;">
                <span>➕</span> Nuevo Producto
              </button>
            </div>
          </div>

          <!-- Categorías horizontales -->
          <ul class="category-list-horizontal" id="studio-categories-bar" style="margin-bottom: 14px;">
            <li class="category-item active" onclick="filterCategoryModal('all')">Todos</li>
          </ul>

          <!-- Cuadrícula de Productos -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 14px; max-height: 580px; overflow-y: auto;" class="premium-scroll">
            <div class="catalog-grid" id="studio-products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px;">
              <!-- Loaded dynamically -->
            </div>
          </div>
        </div>

        <!-- Subtab 2: Mesas & Códigos QR -->
        <div id="studio-tab-content-tables" class="studio-tab-pane" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; margin-bottom: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">🪑</span>
                <h4 style="color: #ffffff; font-size: 15px; margin: 0; font-weight: 800;">Mesas del Restaurante y Códigos QR</h4>
              </div>
              <p style="font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0 0;">Cada mesa tiene su Código QR exclusivo generado automáticamente para que los clientes pidan directo a su mesa.</p>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-3d btn-3d-primary" onclick="AdminApp.addNewTablePrompt()" style="padding: 7px 14px; font-size: 11.5px;">
                <span>➕</span> Agregar Mesa
              </button>
              <button type="button" class="btn-3d btn-3d-dark" onclick="AdminApp.downloadAllTablesQRBatch()" style="padding: 7px 12px; font-size: 11.5px;">
                <span>📦</span> Descargar Lote QR (1-10)
              </button>
            </div>
          </div>

          <!-- Cards Grid of Tables with their QR Codes -->
          <div id="studio-tables-grid" class="premium-scroll" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; max-height: 520px; overflow-y: auto;">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Subtab 3: Menú del Día -->
        <div id="studio-tab-content-daily" class="studio-tab-pane" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; margin-bottom: 12px;">
            <div>
              <h4 style="color: #ffffff; font-size: 15px; margin: 0; font-weight: 800;">📅 Menú y Especiales por Día de la Semana</h4>
              <p style="font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0 0;">Configura qué platos están disponibles según el día (sopas, ejecutivos, platos del día) y sus opciones cambiantes.</p>
            </div>
            <button type="button" class="btn-3d btn-3d-primary" onclick="AdminApp.openMenuModal()" style="padding: 7px 14px; font-size: 11.5px;">
              <span>➕</span> Nuevo Plato
            </button>
          </div>

          <!-- Selector de Días de la Semana -->
          <div class="day-pill-selector" id="studio-daily-day-selector" style="margin-bottom: 14px;">
            <span class="day-pill active" data-day="todos" onclick="AdminApp.selectDailySpecialsDay('todos')">Todos los días</span>
            <span class="day-pill" data-day="lunes" onclick="AdminApp.selectDailySpecialsDay('lunes')">Lunes</span>
            <span class="day-pill" data-day="martes" onclick="AdminApp.selectDailySpecialsDay('martes')">Martes</span>
            <span class="day-pill" data-day="miercoles" onclick="AdminApp.selectDailySpecialsDay('miercoles')">Miércoles</span>
            <span class="day-pill" data-day="jueves" onclick="AdminApp.selectDailySpecialsDay('jueves')">Jueves</span>
            <span class="day-pill" data-day="viernes" onclick="AdminApp.selectDailySpecialsDay('viernes')">Viernes</span>
            <span class="day-pill" data-day="sabado" onclick="AdminApp.selectDailySpecialsDay('sabado')">Sábado</span>
            <span class="day-pill" data-day="domingo" onclick="AdminApp.selectDailySpecialsDay('domingo')">Domingo</span>
          </div>

          <!-- Grid de Platos del Día -->
          <div id="studio-daily-grid" class="daily-specials-grid">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Subtab 4: Escanear Menú con IA -->
        <div id="studio-tab-content-ai" class="studio-tab-pane" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
            <div>
              <h4 style="color: #ffffff; font-size: 16px; margin: 0; font-weight: 800; display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 20px;">🤖</span> Digitalización Automática de Menú con IA
              </h4>
              <p style="font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0 0;">
                Sube una foto o PDF de la carta física y Gemini creará todos los productos, categorías, ingredientes y adicionales en segundos.
              </p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
            <div style="background: rgba(255,255,255,0.03); border: 1.5px dashed rgba(168, 85, 247, 0.4); border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">
              <div style="text-align: center; padding: 8px 0;">
                <span style="font-size: 38px; display: block; margin-bottom: 6px;">📸</span>
                <h5 style="margin: 0 0 4px 0; color: #FFF; font-size: 14px; font-weight: 800;">Selecciona o Toma una Foto del Menú</h5>
                <p style="font-size: 11.5px; color: var(--text-muted); margin: 0;">Formatos: JPG, PNG, WebP o PDF</p>
              </div>
              <button type="button" class="btn-3d btn-3d-purple" onclick="document.getElementById('ai-menu-file-input').click()" style="padding: 12px; font-size: 13px;">
                <span>📁</span> Subir Foto o Carta
              </button>
              <button type="button" class="btn-3d btn-3d-primary" onclick="AdminApp.startAIMenuScan()" style="padding: 13px; font-size: 13.5px;">
                <span>🚀</span> Analizar y Extraer Menú con IA
              </button>
            </div>
          </div>
        </div>

        <!-- Subtab 5: Catálogo Maestro -->
        <div id="studio-tab-content-catalog" class="studio-tab-pane" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
            <div>
              <h4 style="color: #ffffff; font-size: 14.5px; margin: 0; font-weight: 800;">⚡ Catálogo Global de Platos</h4>
              <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Importa platos globales con sus fotos e ingredientes con 1 toque hacia este restaurante.</p>
            </div>
            <div style="width: 100%; max-width: 280px;">
              <input type="text" id="studio-import-search" oninput="AdminApp.filterImportCatalogTable()" placeholder="🔍 Buscar en catálogo maestro..." style="width: 100%; background: rgba(18,18,22,0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 12px;">
            </div>
          </div>

          <div style="overflow-x: auto; max-height: 440px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); background: rgba(15, 23, 42, 0.6);" class="premium-scroll">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; color: #fff;">
              <thead>
                <tr style="background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); font-size: 10.5px; text-transform: uppercase;">
                  <th style="padding: 8px 10px; width: 50px;">Foto</th>
                  <th style="padding: 8px 10px;">Producto</th>
                  <th style="padding: 8px 10px;">Descripción</th>
                  <th style="padding: 8px 10px; width: 100px;">Precio</th>
                  <th style="padding: 8px 10px; text-align: center; width: 120px;">Acción</th>
                </tr>
              </thead>
              <tbody id="studio-import-catalog-tbody">
                <tr>
                  <td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">Cargando catálogo maestro...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
`;

// Build new main workspace with panes
const newMainContent = `
      <!-- Workspace 1: Pedidos en Vivo (Active by default) -->
      <div class="admin-workspace-pane active" id="ws-orders">
        ${blockLiveOrders}
      </div>

      <!-- Workspace 2: Restaurantes & Comercios Activos -->
      <div class="admin-workspace-pane" id="ws-restaurants" style="display: none;">
        ${blockRestaurants}
      </div>

      <!-- Workspace 3: Taller de Menú & Mesas Studio -->
      <div class="admin-workspace-pane" id="ws-menu-tables" style="display: none;">
        ${studioLayoutHtml}
      </div>

      <!-- Workspace 4: Servicios Aliados & Asistencia -->
      <div class="admin-workspace-pane" id="ws-services" style="display: none;">
        ${blockServices}
      </div>

      <!-- Workspace 5: Flota de Repartidores & Chat Grupal -->
      <div class="admin-workspace-pane" id="ws-fleet" style="display: none;">
        ${blockFleet}
        ${blockDriverChat}
      </div>

      <!-- Workspace 6: Finanzas, Analytics Pro & Catálogo Maestro -->
      <div class="admin-workspace-pane" id="ws-finance" style="display: none;">
        ${blockAnalytics}
        ${blockMasterCatalog}
      </div>
`;

// Insert dock nav right before <main
let updatedHtml = beforeMain + dockNavHtml + '\n    <main class="admin-main-workspace">' + newMainContent + '\n    ' + afterMain;

fs.writeFileSync(adminHtmlPath, updatedHtml, 'utf8');
console.log('🎉 public/admin.html successfully reorganized into 6 workspaces with Taller de Menú & Mesas Studio!');
