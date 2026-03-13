<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --wine:       #6B1A2A;
    --wine-light: #9B3A4E;
    --wine-pale:  #F5E8EB;
    --gold:       #C9963A;
    --gold-light: #F0D49A;
    --ink:        #1A1014;
    --slate:      #3D2B33;
    --mist:       #F9F4F5;
    --border:     #E2CDD1;
    --code-bg:    #1E0F14;
    --code-text:  #F0C0C8;
    --shadow:     0 4px 24px rgba(107,26,42,0.10);
    --shadow-lg:  0 12px 48px rgba(107,26,42,0.18);
  }

  body, .markdown-body {
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
    color: var(--ink);
    background: var(--mist);
    line-height: 1.8;
    max-width: 960px;
    margin: 0 auto;
    padding: 0 2rem 4rem;
  }

  /* ── CABECERA PRINCIPAL ─────────────────────────────── */
  .hero {
    background: linear-gradient(135deg, var(--wine) 0%, #3D0A14 60%, #1A0008 100%);
    border-radius: 0 0 2rem 2rem;
    padding: 4rem 3rem 3rem;
    margin: 0 -2rem 3rem;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 40% at 80% 20%, rgba(201,150,58,0.18) 0%, transparent 70%),
      repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 40px,
        rgba(255,255,255,0.015) 40px,
        rgba(255,255,255,0.015) 41px
      );
    pointer-events: none;
  }
  .hero-badge {
    display: inline-block;
    background: rgba(201,150,58,0.20);
    border: 1px solid rgba(201,150,58,0.50);
    color: var(--gold-light);
    font-family: 'DM Mono', monospace;
    font-size: 0.70rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 0.30rem 0.90rem;
    border-radius: 2rem;
    margin-bottom: 1.2rem;
  }
  .hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2.2rem, 5vw, 3.4rem);
    font-weight: 900;
    color: #fff;
    margin: 0 0 0.5rem;
    letter-spacing: -0.02em;
    line-height: 1.15;
    text-shadow: 0 2px 20px rgba(0,0,0,0.4);
  }
  .hero h1 span {
    color: var(--gold-light);
  }
  .hero-sub {
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
    color: rgba(255,255,255,0.65);
    font-size: 1rem;
    margin: 0;
    letter-spacing: 0.02em;
  }
  .hero-meta {
    display: flex;
    gap: 1.5rem;
    margin-top: 2rem;
    flex-wrap: wrap;
  }
  .hero-pill {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.80);
    font-family: 'DM Mono', monospace;
    font-size: 0.75rem;
    padding: 0.35rem 0.85rem;
    border-radius: 2rem;
  }
  .hero-pill .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--gold);
    flex-shrink: 0;
  }

  /* ── TIPOGRAFÍA GENERAL ─────────────────────────────── */
  h1, h2, h3, h4 {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    color: var(--wine);
    letter-spacing: -0.01em;
  }
  h2 {
    font-size: 1.75rem;
    margin: 3rem 0 1.2rem;
    padding-bottom: 0.6rem;
    border-bottom: 2px solid var(--border);
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  h3 {
    font-size: 1.2rem;
    color: var(--slate);
    margin: 2rem 0 0.8rem;
  }
  h4 {
    font-size: 1rem;
    color: var(--wine-light);
    font-family: 'DM Mono', monospace;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 1.5rem 0 0.5rem;
  }
  p { margin: 0.7rem 0 1rem; }
  strong { color: var(--wine); font-weight: 500; }

  /* ── SECCIONES ──────────────────────────────────────── */
  .section {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 2rem 2.2rem;
    margin-bottom: 2rem;
    box-shadow: var(--shadow);
    position: relative;
  }
  .section::before {
    content: '';
    position: absolute;
    left: 0; top: 1.5rem; bottom: 1.5rem;
    width: 4px;
    background: linear-gradient(to bottom, var(--wine), var(--gold));
    border-radius: 0 2px 2px 0;
  }

  /* ── ÁRBOL DE ESTRUCTURA ────────────────────────────── */
  .tree {
    background: var(--code-bg);
    border-radius: 0.75rem;
    padding: 1.5rem 1.8rem;
    margin: 1.2rem 0;
    border: 1px solid rgba(201,150,58,0.20);
    overflow-x: auto;
  }
  .tree pre {
    font-family: 'DM Mono', monospace;
    font-size: 0.82rem;
    color: var(--code-text);
    margin: 0;
    line-height: 1.7;
  }
  .tree .dir  { color: var(--gold-light); }
  .tree .file { color: #b0c4cc; }
  .tree .note { color: rgba(240,192,200,0.45); }

  /* ── TABLAS ─────────────────────────────────────────── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.2rem 0;
    font-size: 0.90rem;
  }
  thead tr {
    background: linear-gradient(90deg, var(--wine) 0%, var(--wine-light) 100%);
    color: #fff;
  }
  thead th {
    font-family: 'DM Mono', monospace;
    font-weight: 500;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.75rem 1rem;
    text-align: left;
  }
  tbody tr { border-bottom: 1px solid var(--border); }
  tbody tr:nth-child(even) { background: var(--wine-pale); }
  tbody tr:hover { background: var(--gold-light); transition: background 0.2s; }
  td {
    padding: 0.65rem 1rem;
    vertical-align: top;
    color: var(--slate);
  }
  td:first-child {
    font-family: 'DM Mono', monospace;
    font-size: 0.82rem;
    color: var(--wine);
    white-space: nowrap;
    font-weight: 500;
  }

  /* ── CÓDIGO INLINE ──────────────────────────────────── */
  code {
    font-family: 'DM Mono', monospace;
    font-size: 0.82em;
    background: var(--wine-pale);
    color: var(--wine);
    padding: 0.15em 0.45em;
    border-radius: 0.30rem;
    border: 1px solid var(--border);
  }

  /* ── BLOQUES DE CÓDIGO ──────────────────────────────── */
  pre {
    background: var(--code-bg);
    color: var(--code-text);
    border-radius: 0.75rem;
    padding: 1.4rem 1.6rem;
    overflow-x: auto;
    font-family: 'DM Mono', monospace;
    font-size: 0.83rem;
    line-height: 1.7;
    border: 1px solid rgba(201,150,58,0.20);
    margin: 1rem 0 1.5rem;
  }
  pre code {
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font-size: inherit;
  }

  /* ── BADGES DE MÉTODO HTTP ──────────────────────────── */
  .badge {
    display: inline-block;
    font-family: 'DM Mono', monospace;
    font-size: 0.68rem;
    font-weight: 500;
    padding: 0.15rem 0.55rem;
    border-radius: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-right: 0.4rem;
  }
  .badge-post   { background: #d4edda; color: #1a6b35; border: 1px solid #a8d5b5; }
  .badge-get    { background: #cce5ff; color: #1a4a7a; border: 1px solid #9ecaef; }
  .badge-put    { background: #fff3cd; color: #7a5200; border: 1px solid #f0d49a; }
  .badge-delete { background: #f8d7da; color: #7a1a22; border: 1px solid #f0a8ae; }

  /* ── FLUJO DE PASOS ─────────────────────────────────── */
  .flow {
    counter-reset: step;
    list-style: none;
    padding: 0;
    margin: 1.2rem 0;
  }
  .flow li {
    counter-increment: step;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    padding: 0.9rem 0;
    border-bottom: 1px solid var(--border);
  }
  .flow li:last-child { border-bottom: none; }
  .flow li::before {
    content: counter(step);
    flex-shrink: 0;
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--wine), var(--wine-light));
    color: #fff;
    font-family: 'DM Mono', monospace;
    font-size: 0.72rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(107,26,42,0.30);
    margin-top: 0.1rem;
  }
  .flow li .step-title {
    font-weight: 500;
    color: var(--wine);
  }
  .flow li .step-desc {
    font-size: 0.88rem;
    color: var(--slate);
    margin-top: 0.2rem;
  }

  /* ── GRILLA DE MÓDULOS ──────────────────────────────── */
  .module-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .module-card {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 0.85rem;
    padding: 1.3rem 1.5rem;
    box-shadow: var(--shadow);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .module-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
  }
  .module-card .mc-icon {
    font-size: 1.6rem;
    margin-bottom: 0.6rem;
  }
  .module-card .mc-name {
    font-family: 'DM Mono', monospace;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--wine);
    margin-bottom: 0.35rem;
  }
  .module-card .mc-path {
    font-family: 'DM Mono', monospace;
    font-size: 0.70rem;
    color: #999;
    margin-bottom: 0.6rem;
  }
  .module-card .mc-desc {
    font-size: 0.83rem;
    color: var(--slate);
    line-height: 1.55;
  }

  /* ── DICCIONARIO ────────────────────────────────────── */
  .dict-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
    margin: 1.2rem 0;
  }
  .dict-card {
    background: var(--wine-pale);
    border: 1px solid var(--border);
    border-radius: 0.65rem;
    padding: 0.9rem 1.1rem;
  }
  .dict-card .dc-name {
    font-family: 'DM Mono', monospace;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--wine);
    margin-bottom: 0.35rem;
  }
  .dict-card .dc-desc {
    font-size: 0.80rem;
    color: var(--slate);
    line-height: 1.5;
  }

  /* ── CALLOUT ────────────────────────────────────────── */
  .callout {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.3rem;
    border-radius: 0.75rem;
    margin: 1.2rem 0;
    align-items: flex-start;
  }
  .callout-info {
    background: #e8f4fd;
    border: 1px solid #b3d9f5;
  }
  .callout-warn {
    background: #fff8e6;
    border: 1px solid var(--gold-light);
  }
  .callout-success {
    background: #eafaf1;
    border: 1px solid #a8d5b5;
  }
  .callout-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 0.1rem; }
  .callout-body { font-size: 0.875rem; color: var(--slate); line-height: 1.6; }
  .callout-body strong { color: var(--ink); }

  /* ── FOOTER ─────────────────────────────────────────── */
  .doc-footer {
    margin-top: 4rem;
    padding: 2rem;
    background: linear-gradient(135deg, var(--wine) 0%, #3D0A14 100%);
    border-radius: 1rem;
    text-align: center;
    color: rgba(255,255,255,0.60);
    font-size: 0.82rem;
  }
  .doc-footer strong { color: var(--gold-light); font-weight: 500; }

  /* ── UTILIDADES ─────────────────────────────────────── */
  .tag {
    display: inline-block;
    background: var(--wine-pale);
    border: 1px solid var(--border);
    color: var(--wine);
    font-family: 'DM Mono', monospace;
    font-size: 0.70rem;
    padding: 0.15rem 0.55rem;
    border-radius: 2rem;
    margin: 0.15rem;
  }
  .tag-gold {
    background: #fdf3de;
    border-color: var(--gold-light);
    color: #7a5200;
  }
  hr.divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2.5rem 0;
  }

  @media (max-width: 640px) {
    .hero { padding: 2.5rem 1.5rem 2rem; margin: 0 -1rem 2rem; }
    .section { padding: 1.5rem; }
    .module-grid { grid-template-columns: 1fr; }
    .dict-grid { grid-template-columns: 1fr 1fr; }
    body, .markdown-body { padding: 0 1rem 3rem; }
  }
</style>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  CABECERA                                               -->
<!-- ═══════════════════════════════════════════════════════ -->

<div class="hero">
  <div class="hero-badge">Documentación Técnica · v1.6.0</div>
  <h1>Puente <span>Clos Apalta</span></h1>
  <p class="hero-sub">Sincronización bidireccional entre Oracle OPERA Cloud (OHIP) y HubSpot CRM</p>
  <div class="hero-meta">
    <div class="hero-pill"><span class="dot"></span>Node.js + TypeScript</div>
    <div class="hero-pill"><span class="dot"></span>Express 5</div>
    <div class="hero-pill"><span class="dot"></span>HubSpot SDK v13.4.0</div>
    <div class="hero-pill"><span class="dot"></span>Oracle OHIP REST API</div>
    <div class="hero-pill"><span class="dot"></span>WebSocket (OHIP Streaming)</div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  1. ARQUITECTURA                                        -->
<!-- ═══════════════════════════════════════════════════════ -->

## 🏗️ Arquitectura General

<div class="section">

El proyecto es un **servidor Express en Node.js + TypeScript** que actúa como puente de sincronización bidireccional entre **Oracle OPERA Cloud (OHIP)** y **HubSpot CRM**. Está organizado en 4 capas con separación clara de responsabilidades.

<div class="tree">
<pre>
<span class="dir">src/</span>
<span class="file">├── index.ts               </span><span class="note">← Servidor principal, rutas HTTP</span>
<span class="dir">├── config/</span>
<span class="file">│   └── index.ts           </span><span class="note">← Variables de entorno y validación de arranque</span>
<span class="dir">├── domain/</span>
<span class="file">│   └── types.ts           </span><span class="note">← Interfaces y tipos compartidos</span>
<span class="dir">├── application/</span>
<span class="file">│   └── mappers.ts         </span><span class="note">← Lógica de transformación de datos</span>
<span class="dir">├── infrastructure/</span>
<span class="dir">│   ├── oracle/</span>
<span class="file">│   │   ├── OracleClient.ts    </span><span class="note">← Cliente REST Oracle OHIP</span>
<span class="file">│   │   └── OracleStreamer.ts  </span><span class="note">← WebSocket OHIP Streaming</span>
<span class="dir">│   └── hubspot/</span>
<span class="file">│       └── HubSpotClient.ts   </span><span class="note">← Cliente SDK HubSpot</span>
<span class="dir">└── webhooks/</span>
<span class="file">    └── server.ts          </span><span class="note">← Router auxiliar (Oracle → HubSpot)</span>
</pre>
</div>

<div class="module-grid">
  <div class="module-card">
    <div class="mc-icon">⚙️</div>
    <div class="mc-name">config</div>
    <div class="mc-path">src/config/index.ts</div>
    <div class="mc-desc">Carga y valida las variables de entorno en el arranque. Detiene el proceso si falta alguna variable crítica.</div>
  </div>
  <div class="module-card">
    <div class="mc-icon">📐</div>
    <div class="mc-name">domain</div>
    <div class="mc-path">src/domain/types.ts</div>
    <div class="mc-desc">Define los contratos de datos: interfaces <code>UnifiedContact</code>, <code>UnifiedReservation</code> y <code>GuestProfile</code>.</div>
  </div>
  <div class="module-card">
    <div class="mc-icon">🔄</div>
    <div class="mc-name">application</div>
    <div class="mc-path">src/application/mappers.ts</div>
    <div class="mc-desc">Toda la lógica de traducción entre Oracle y HubSpot. Ningún cliente externo transforma datos directamente.</div>
  </div>
  <div class="module-card">
    <div class="mc-icon">🟠</div>
    <div class="mc-name">OracleClient</div>
    <div class="mc-path">src/infrastructure/oracle/</div>
    <div class="mc-desc">Comunicación REST con Oracle OHIP: autenticación OAuth 2.0, perfiles y reservas.</div>
  </div>
  <div class="module-card">
    <div class="mc-icon">💜</div>
    <div class="mc-name">HubSpotClient</div>
    <div class="mc-path">src/infrastructure/hubspot/</div>
    <div class="mc-desc">Comunicación con el SDK oficial de HubSpot v13: contactos, negocios y asociaciones.</div>
  </div>
  <div class="module-card">
    <div class="mc-icon">🌐</div>
    <div class="mc-name">Servidor Principal</div>
    <div class="mc-path">src/index.ts</div>
    <div class="mc-desc">Orquesta los 5 endpoints HTTP, el flujo multi-huésped y el rastreador de confirmaciones.</div>
  </div>
</div>

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  2. CONFIGURACIÓN                                       -->
<!-- ═══════════════════════════════════════════════════════ -->

## ⚙️ `src/config/index.ts` — Configuración

<div class="section">

Carga variables de entorno desde `.env` mediante `dotenv` y expone el objeto `config` con tres secciones.

<div class="callout callout-warn">
  <div class="callout-icon">⚠️</div>
  <div class="callout-body">
    <strong>Validación de arranque:</strong> Si falta alguna variable crítica, el proceso se detiene con un mensaje claro antes de intentar cualquier conexión. Esto evita errores silenciosos en producción.
  </div>
</div>

| Variable | Sección | Descripción |
|---|---|---|
| `PORT` | `server.port` | Puerto del servidor Express (default: `3000`) |
| `HUBSPOT_ACCESS_TOKEN` | `hubspot.accessToken` | Token de acceso del SDK de HubSpot (**requerido**) |
| `HUBSPOT_APP_ID` | `hubspot.appId` | ID de la aplicación HubSpot |
| `ORACLE_BASE_URL` | `oracle.baseUrl` | URL base de la API OHIP (**requerido**) |
| `ORACLE_CLIENT_ID` | `oracle.clientId` | Client ID para OAuth 2.0 (**requerido**) |
| `ORACLE_CLIENT_SECRET` | `oracle.clientSecret` | Client Secret para OAuth 2.0 (**requerido**) |
| `ORACLE_APP_KEY` | `oracle.appKey` | Application Key OHIP (**requerido**) |
| `ORACLE_HOTEL_ID` | `oracle.hotelId` | Código del hotel (default: `CAR`) |
| `ORACLE_ENTERPRISE_ID` | `oracle.enterpriseId` | Enterprise ID OHIP (default: `CLOSAP`) |
| `ORACLE_USERNAME` | `oracle.username` | Usuario de integración Oracle |
| `ORACLE_PASSWORD` | `oracle.password` | Contraseña de integración Oracle |

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  3. TIPOS DE DOMINIO                                    -->
<!-- ═══════════════════════════════════════════════════════ -->

## 📐 `src/domain/types.ts` — Contratos de Datos

<div class="section">

Define tres interfaces que actúan como el **lenguaje común** entre Oracle y HubSpot. Todo flujo de datos pasa por estas estructuras antes de llegar a cualquier cliente externo.

### `UnifiedContact` — Modelo de Huésped

| Campo | Tipo | Descripción |
|---|---|---|
| `id_oracle` | `string` | ID del perfil en Oracle OPERA |
| `email` | `string` | Correo electrónico principal |
| `firstName` / `lastName` | `string` | Nombre y apellido |
| `address`, `city`, `state`, `zip` | `string` | Dirección postal |
| `country` / `nacionalidad` | `string` | Código de país |
| `phone` | `string` | Teléfono de contacto |
| `idioma_preferido` | `string` | Idioma en texto legible (ej. `"Español"`) |
| `fecha_de_nacimiento` | `string` | Fecha en formato `YYYY-MM-DD` |
| `sexo__genero_huesped_principal` | `string` | Género del huésped |
| `pasaporte` | `string` | Número de pasaporte |
| `huesped_vip` | `string` | `"Sí"` o `"No"` |
| `numero_de_fidelidad__relais__chateaux` | `string` | Número de membresía RC |

### `UnifiedReservation` — Modelo de Reserva

| Campo | Tipo | Descripción |
|---|---|---|
| `id_oracle` | `string` | ID del perfil del huésped principal |
| `numero_de_reserva` | `string` | Número de confirmación Oracle (9 dígitos) |
| `arrival` / `departure` | `string` | Fechas de llegada y salida (`YYYY-MM-DD`) |
| `estado_de_reserva` | `string` | Estado traducido al español |
| `habitacion` | `string` | Nombre completo de la habitación |
| `tipo_de_tarifa` | `string` | Tarifa (Overnight, Half Board, Full Board) |
| `tipo_de_pago` | `string` | Método de pago |
| `fuente_de_reserva` | `string` | Canal de origen |
| `numero_de_vuelo`, `transporte`, `nombre_chofer_clos_apalta` | `string` | Datos de traslado |
| `id_synxis` | `string?` | Referencia externa Synxis |

### `GuestProfile` — Perfil de Huésped en Reserva

```typescript
interface GuestProfile {
  id:        string;   // ID del perfil en Oracle
  isPrimary: boolean;  // true = huésped principal de la reserva
}
```

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  4. MAPPERS                                             -->
<!-- ═══════════════════════════════════════════════════════ -->

## 🔄 `src/application/mappers.ts` — Transformación de Datos

<div class="section">

Centraliza **toda** la lógica de conversión entre sistemas. Los clientes externos no realizan ninguna transformación por sí mismos.

### Utilidades Internas

| Función | Descripción |
|---|---|
| `formatDate()` | Convierte timestamps Unix, strings ISO o cualquier formato a `YYYY-MM-DD`. Retorna `""` si el valor es inválido, nunca genera fechas incorrectas |
| `translate()` | Aplica un diccionario de traducción con fallback: devuelve la clave original si no hay traducción |

### Diccionarios Bidireccionales

<div class="dict-grid">
  <div class="dict-card">
    <div class="dc-name">Maps.Status.ToHS</div>
    <div class="dc-desc">Estado Oracle → texto español para HubSpot<br><span class="tag">RESERVED</span><span class="tag">CHECKED IN</span><span class="tag">CANCELED</span></div>
  </div>
  <div class="dict-card">
    <div class="dc-name">Maps.Room.ToHS / ToOracle</div>
    <div class="dc-desc">14 tipos de habitación de Clos Apalta en ambas direcciones<br><span class="tag">CASITA</span><span class="tag">VILLA</span><span class="tag">PLCASITA</span></div>
  </div>
  <div class="dict-card">
    <div class="dc-name">Maps.Rates.ToHS / ToOracle</div>
    <div class="dc-desc">Códigos de tarifa en ambas direcciones<br><span class="tag">BAROV</span><span class="tag">BARHB</span><span class="tag">BARFB</span></div>
  </div>
  <div class="dict-card">
    <div class="dc-name">Maps.Source.ToHS</div>
    <div class="dc-desc">Fuentes de reserva Oracle → texto descriptivo<br><span class="tag">WLK</span><span class="tag">GDS</span><span class="tag">OTA</span><span class="tag">WSBE</span><span class="tag">HS</span></div>
  </div>
  <div class="dict-card">
    <div class="dc-name">Maps.Payment.ToHS</div>
    <div class="dc-desc">Métodos de pago → texto legible<br><span class="tag">CASH</span><span class="tag">DP</span><span class="tag">CO</span><span class="tag">VI</span><span class="tag">MC</span></div>
  </div>
  <div class="dict-card">
    <div class="dc-name">Maps.Language.ToHS / ToOracle</div>
    <div class="dc-desc">Idiomas en ambas direcciones<br><span class="tag">ES</span><span class="tag">EN</span><span class="tag">PT</span><span class="tag">DE</span><span class="tag">FR</span></div>
  </div>
</div>

### Funciones Exportadas

| Función | Dirección | Descripción |
|---|---|---|
| `mapOracleToUnified()` | Oracle → Unificado | Extrae nombre, email, dirección, teléfono, pasaporte, membresía RC, idioma, género, fecha de nacimiento y estado VIP |
| `mapHubSpotToOracle()` | Unificado → Oracle | Construye el payload para `POST/PUT /crm/v1/profiles` |
| `mapOracleReservation()` | Oracle → Unificado | Extrae todos los campos de reserva incluyendo transporte, agencia y referencia Synxis |
| `mapHubSpotReservationToOracle()` | HubSpot → Oracle | Construye payload para `POST /rsv/v1/hotels/{hotelId}/reservations`. Respeta `isPrimary` y lanza error explícito si faltan fechas |

<div class="callout callout-warn">
  <div class="callout-icon">🚨</div>
  <div class="callout-body">
    <strong>Validación de fechas:</strong> Si un Negocio de HubSpot no tiene <code>check_in</code> o <code>check_out</code> válidos, <code>mapHubSpotReservationToOracle()</code> lanza un error explícito. Nunca usa fechas de fallback hardcodeadas que crearían reservas ficticias en Oracle.
  </div>
</div>

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  5. ORACLE CLIENT                                       -->
<!-- ═══════════════════════════════════════════════════════ -->

## 🟠 `src/infrastructure/oracle/OracleClient.ts` — Cliente Oracle

<div class="section">

Encapsula toda la comunicación con la API REST de Oracle OHIP mediante `axios`.

### Autenticación OAuth 2.0

| Método | Descripción |
|---|---|
| `authenticate()` | OAuth 2.0 `client_credentials`. Lee `expires_in` de la respuesta y guarda el timestamp de expiración |
| `ensureAuthenticated()` | Llamado antes de cada operación. Renueva el token automáticamente con buffer de **60 segundos** antes del vencimiento real |
| `getAccessToken()` | Expone el token de forma segura para uso del `OracleStreamer` sin romper encapsulamiento |

<div class="callout callout-success">
  <div class="callout-icon">✅</div>
  <div class="callout-body">
    <strong>Renovación automática de token:</strong> Los tokens Oracle tienen una vida de ~3600 segundos (1 hora). El método <code>ensureAuthenticated()</code> compara <code>Date.now()</code> contra <code>tokenExpiresAt - 60s</code> y renueva proactivamente, eliminando el fallo silencioso que ocurría tras 1 hora de uptime.
  </div>
</div>

### Gestión de Perfiles — `POST /crm/v1/profiles`

| Método | <span class="badge badge-post">POST</span><span class="badge badge-put">PUT</span><span class="badge badge-delete">DELETE</span> | Descripción |
|---|---|---|
| `createGuestProfile()` | <span class="badge badge-post">POST</span> | Crea perfil tipo `"Guest"`. Extrae el ID desde `profileIdList[0].id` o del header `Location` |
| `updateGuestProfile()` | <span class="badge badge-put">PUT</span> | Actualiza nombre y email. Requiere apellido; propaga errores al caller |
| `deleteGuestProfile()` | <span class="badge badge-delete">DELETE</span> | Elimina un perfil. Retorna `boolean` según HTTP 200/204 |

### Gestión de Reservas — `POST/PUT /rsv/v1/hotels/{hotelId}/reservations`

| Método | HTTP | Body (verificado vs. `ApiOracleReservations.json`) |
|---|---|---|
| `createReservationInOracle()` | <span class="badge badge-post">POST</span> | `{ reservations: { reservation: [...] } }` — objeto con array interno (`hotelReservationsType`) |
| `updateReservation()` | <span class="badge badge-put">PUT</span> | `{ reservations: [...] }` — array directo (`changeReservation`) |
| `getReservation()` | <span class="badge badge-get">GET</span> | Consulta reserva por ID. Retorna `null` en error sin romper el flujo |

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  6. HUBSPOT CLIENT                                      -->
<!-- ═══════════════════════════════════════════════════════ -->

## 💜 `src/infrastructure/hubspot/HubSpotClient.ts` — Cliente HubSpot

<div class="section">

Encapsula toda la comunicación con el **SDK oficial `@hubspot/api-client` v13.4.0**.

<div class="callout callout-info">
  <div class="callout-icon">ℹ️</div>
  <div class="callout-body">
    <strong>Tipo derivado del SDK:</strong> <code>ContactSearchFilter</code> se extrae de la firma del método <code>doSearch()</code> mediante inferencia de TypeScript. Esto garantiza que el campo <code>operator</code> sea siempre del tipo correcto (<code>FilterOperatorEnum</code>) sin depender de rutas internas del paquete que pueden cambiar entre versiones.
  </div>
</div>

### Contactos — `crm.contacts`

| Método | Descripción |
|---|---|
| `findContactByOracleId()` | Busca contacto por la propiedad personalizada `id_oracle` usando `searchApi` |
| `getContactById()` | Obtiene `firstname`, `lastname`, `email` e `id_oracle` por ID de HubSpot |
| `updateContact()` | Actualiza propiedades. Filtra valores `undefined` antes de pasar al SDK (que exige `{ [key: string]: string }`) |
| `updateOracleId()` | Shortcut para escribir `id_oracle` en un contacto |
| `getOracleIdFromContact()` | Lee el `id_oracle`; retorna `null` si no existe o hay error |
| `syncContact()` | **Upsert inteligente**: intenta crear; si recibe HTTP 409 (email duplicado), actualiza usando el email como `idProperty` |

### Negocios / Deals — `crm.deals`

| Método | Descripción |
|---|---|
| `getDealById()` | Obtiene el Negocio con 10 campos relevantes para Oracle: fechas, habitación, tarifa, pago, huéspedes, IDs |
| `updateDeal()` | Escribe `id_oracle`, `numero_de_reserva`, `id_synxis` y/o `estado_de_reserva`. Omite campos vacíos/nulos |

### Asociaciones — `crm.associations.v4`

| Método | Descripción |
|---|---|
| `getAssociatedContacts()` | Devuelve todos los contactos de un Negocio **con sus etiquetas**. Usa la API v4, la única que soporta labels personalizadas como `"huésped principal"` |
| `getContactIdFromDeal()` | *(Deprecated)* Solo devuelve el primer contacto sin etiquetas |

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  7. ORACLE STREAMER                                     -->
<!-- ═══════════════════════════════════════════════════════ -->

## 🔌 `src/infrastructure/oracle/OracleStreamer.ts` — WebSocket OHIP

<div class="section">

Implementa la conexión en tiempo real con el servicio de streaming de Oracle OHIP mediante el protocolo **GraphQL over WebSocket** (`graphql-transport-ws`).

<div class="callout callout-warn">
  <div class="callout-icon">🚧</div>
  <div class="callout-body">
    <strong>Estado:</strong> Implementado y listo, pero <strong>no activo</strong>. La llamada a <code>oracleStreamer.connect()</code> está comentada en <code>index.ts</code> hasta que el ticket de activación de Oracle esté listo. Descomentar esa línea para activar.
  </div>
</div>

| Método | Descripción |
|---|---|
| `connect()` | Autentica con OAuth, construye la URL `wss://` y abre la conexión WebSocket |
| `getHashedAppKey()` | Aplica SHA256 al `appKey` según la especificación OHIP para URLs de streaming |
| `handleMessage()` | Gestiona los mensajes del protocolo: `connection_ack`, `pong`, `next` (eventos), `error`, `complete` |
| `subscribeToEvents()` | Envía la query GraphQL para suscribirse a cambios de perfiles en la cadena `CAR` |
| `startPing()` / `stopPing()` | Mantiene la conexión activa con pings cada **15 segundos** |

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  8. SERVIDOR PRINCIPAL — RUTAS                         -->
<!-- ═══════════════════════════════════════════════════════ -->

## 🌐 `src/index.ts` — Servidor Principal

<div class="section">

Servidor Express que orquesta los 5 endpoints y la lógica de negocio central.

### Endpoints HTTP

| Ruta | Método | Función |
|---|---|---|
| `/` | <span class="badge badge-get">GET</span> | Health check — confirma que el puente está activo, retorna versión |
| `/webhook/hubspot/deal` | <span class="badge badge-post">POST</span> | Flujo completo de creación/actualización de reserva multi-huésped |
| `/sync-to-oracle/:hsId` | <span class="badge badge-get">GET</span> | Sync manual — fuerza la creación de perfil Oracle para un contacto HubSpot |
| `/webhook/oracle` | <span class="badge badge-post">POST</span> | Recibe perfil de Oracle y lo sincroniza a HubSpot |
| `/webhook/oracle/reservation` | <span class="badge badge-post">POST</span> | Recibe reserva de Oracle y vincula el `id_oracle` al contacto en HubSpot |

### Flujo Principal — `POST /webhook/hubspot/deal`

El webhook más complejo del sistema: sincroniza un Negocio de HubSpot con múltiples huéspedes a Oracle en 7 pasos.

<ol class="flow">
  <li>
    <div>
      <div class="step-title">Descarga del Negocio</div>
      <div class="step-desc">Obtiene la ficha fresca y completa del Negocio desde HubSpot, incluyendo <code>id_oracle</code> y <code>numero_de_reserva</code> existentes.</div>
    </div>
  </li>
  <li>
    <div>
      <div class="step-title">Obtención de contactos asociados</div>
      <div class="step-desc">Consulta todos los contactos vinculados al Negocio con sus etiquetas usando la API de Asociaciones v4.</div>
    </div>
  </li>
  <li>
    <div>
      <div class="step-title">Handshake múltiple</div>
      <div class="step-desc">Para cada contacto: verifica que tenga <code>id_oracle</code>. Si no lo tiene, crea el perfil en Oracle y guarda el vínculo en HubSpot. Se ejecutan en paralelo con <code>Promise.all()</code>.</div>
    </div>
  </li>
  <li>
    <div>
      <div class="step-title">Identificación del huésped principal</div>
      <div class="step-desc">Detecta quién tiene la etiqueta <code>"huésped principal"</code>. Si nadie la tiene, asigna al primero de la lista como fallback de seguridad.</div>
    </div>
  </li>
  <li>
    <div>
      <div class="step-title">Crear o actualizar en Oracle</div>
      <div class="step-desc">Si ya existe <code>id_oracle</code> válido: <strong>actualiza</strong> con <code>PUT</code> usando el payload <code>{ reservations: [...] }</code>. Si no: <strong>crea</strong> con <code>POST</code> usando <code>{ reservations: { reservation: [...] } }</code>.</div>
    </div>
  </li>
  <li>
    <div>
      <div class="step-title">Rastreador de Confirmation Number</div>
      <div class="step-desc">Busca recursivamente el número de confirmación de 9 dígitos en cualquier nivel del JSON de respuesta. Si no aparece en la primera respuesta, espera 600ms y re-consulta la reserva.</div>
    </div>
  </li>
  <li>
    <div>
      <div class="step-title">Actualización final en HubSpot</div>
      <div class="step-desc">Escribe <code>id_oracle</code>, <code>numero_de_reserva</code> e <code>id_synxis</code> de vuelta en el Negocio de HubSpot para mantener ambos sistemas sincronizados.</div>
    </div>
  </li>
</ol>

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  9. WEBHOOKS AUXILIARES                                 -->
<!-- ═══════════════════════════════════════════════════════ -->

## 📡 `src/webhooks/server.ts` — Router Auxiliar

<div class="section">

Router de Express preparado para la dirección **Oracle → HubSpot** vía webhook entrante. No es una app independiente — usa `express.Router()` para evitar conflictos de puerto con `index.ts`.

<div class="callout callout-info">
  <div class="callout-icon">🔧</div>
  <div class="callout-body">
    <strong>Integración futura:</strong> Para activarlo, importar <code>oracleWebhookRouter</code> en <code>index.ts</code> y registrarlo como:<br>
    <code>app.use('/webhooks', oracleWebhookRouter);</code>
  </div>
</div>

| Ruta registrada | Evento Oracle | Acción |
|---|---|---|
| `POST /oracle` | `ProfileCreated` | Mapea el perfil y lo sincroniza a HubSpot vía `syncContact()` |
| `POST /oracle` | `ProfileUpdated` | Mismo flujo que creación; el upsert de HubSpot lo maneja correctamente |
| `POST /oracle` | Otros eventos | Responde HTTP 200 para que Oracle no reintente indefinidamente |

</div>

<hr class="divider">

<!-- ═══════════════════════════════════════════════════════ -->
<!--  FOOTER                                                 -->
<!-- ═══════════════════════════════════════════════════════ -->

<div class="doc-footer">
  <strong>Puente Clos Apalta</strong> · Versión 1.6.0<br>
  Oracle OPERA Cloud (OHIP) ↔ HubSpot CRM · Sincronización Bidireccional<br><br>
  <span>TypeScript · Express 5 · HubSpot SDK v13.4.0 · Oracle OHIP REST API v26.1.0.0</span>
</div>