<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Puente Clos Apalta &middot; Documentaci&oacute;n T&eacute;cnica</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0c0f;--bg2:#10141a;--bg3:#161c24;--bg4:#1d2530;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
  --text:#e8eaed;--text2:#8f9bb3;--text3:#5c6880;
  --accent:#4f9cf9;--accent2:#7bc8f6;
  --green:#34d399;--green-bg:rgba(52,211,153,0.08);
  --amber:#fbbf24;--amber-bg:rgba(251,191,36,0.08);
  --red:#f87171;--red-bg:rgba(248,113,113,0.09);
  --blue-bg:rgba(79,156,249,0.09);
  --mono:'JetBrains Mono',monospace;
  --sans:'DM Sans',sans-serif;
  --display:'Syne',sans-serif;
}
html{scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--bg);color:var(--text);font-size:15px;line-height:1.75;min-height:100vh}
.page{max-width:960px;margin:0 auto;padding:0 32px 100px}
/* HERO */
.hero{padding:80px 0 64px;border-bottom:1px solid var(--border);position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;top:-60px;right:-120px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(79,156,249,0.07) 0%,transparent 70%);pointer-events:none}
.hero-tag{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;font-weight:500;color:var(--accent);background:var(--blue-bg);border:1px solid rgba(79,156,249,0.2);padding:4px 12px;border-radius:100px;margin-bottom:24px;letter-spacing:0.04em}
.hero-tag::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
h1{font-family:var(--display);font-size:clamp(36px,5vw,58px);font-weight:800;line-height:1.1;letter-spacing:-0.02em;color:#fff;margin-bottom:16px}
h1 span{color:var(--accent)}
.hero-desc{font-size:17px;color:var(--text2);max-width:560px;line-height:1.7;font-weight:300;margin-bottom:36px}
.hero-stats{display:flex;flex-wrap:wrap;border:1px solid var(--border);border-radius:12px;overflow:hidden;width:fit-content}
.stat{padding:14px 28px;border-right:1px solid var(--border);background:var(--bg2)}
.stat:last-child{border-right:none}
.stat-n{font-family:var(--display);font-size:26px;font-weight:700;line-height:1;color:#fff}
.stat-l{font-size:11px;color:var(--text3);margin-top:3px;letter-spacing:0.06em;text-transform:uppercase;font-weight:500}
.stat-n.red{color:var(--red)}.stat-n.amber{color:var(--amber)}.stat-n.blue{color:var(--accent)}.stat-n.green{color:var(--green)}
/* NAV */
.toc{position:sticky;top:0;z-index:50;background:rgba(10,12,15,0.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);margin:0 -32px 60px}
.toc-inner{max-width:960px;margin:0 auto;padding:0 32px;display:flex;overflow-x:auto}
.toc a{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--text3);text-decoration:none;padding:14px 16px;letter-spacing:0.03em;white-space:nowrap;border-bottom:2px solid transparent;transition:color 0.15s,border-color 0.15s}
.toc a:hover{color:var(--text);border-color:var(--border2)}
/* SECTIONS */
section{margin-bottom:80px;scroll-margin-top:52px}
.section-header{margin-bottom:32px}
.section-label{font-family:var(--mono);font-size:11px;font-weight:500;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px}
h2{font-family:var(--display);font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.01em;line-height:1.2}
.section-desc{color:var(--text2);font-size:15px;margin-top:8px;font-weight:300;max-width:600px}
/* ARCH */
.arch{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:32px;margin-bottom:40px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap}
.arch-node{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:14px 20px;text-align:center;min-width:130px}
.arch-node .icon{font-size:22px;margin-bottom:6px}
.arch-node .name{font-family:var(--display);font-size:13px;font-weight:700;color:#fff}
.arch-node .sub{font-size:11px;color:var(--text3);margin-top:2px;font-family:var(--mono)}
.arch-arrow{display:flex;flex-direction:column;align-items:center;padding:0 8px;color:var(--text3);font-size:11px;font-family:var(--mono);gap:3px}
.arch-arrow .line{width:48px;height:1px;background:var(--border2);position:relative}
.arch-arrow .line::after{content:'&#9658;';position:absolute;right:-6px;top:-7px;font-size:9px;color:var(--text3)}
.arch-arrow .line.bi::before{content:'&#9668;';position:absolute;left:-6px;top:-7px;font-size:9px;color:var(--text3)}
.arch-bridge{background:linear-gradient(135deg,rgba(79,156,249,0.12),rgba(79,156,249,0.04));border:1px solid rgba(79,156,249,0.25);border-radius:10px;padding:14px 20px;text-align:center;min-width:130px}
.arch-bridge .name{font-family:var(--display);font-size:13px;font-weight:700;color:var(--accent2)}
.arch-bridge .sub{font-size:11px;color:rgba(123,200,246,0.5);margin-top:2px;font-family:var(--mono)}
/* STACK */
.stack-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:16px}
.stack-item{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;transition:border-color 0.15s}
.stack-item:hover{border-color:var(--border2)}
.stack-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.stack-name{font-size:13px;font-weight:500;color:var(--text)}
.stack-role{font-size:11px;color:var(--text3);margin-top:1px}
/* FLOWS */
.flows{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
@media(max-width:640px){.flows{grid-template-columns:1fr}}
/* BUG CARDS */
.bug-grid{display:flex;flex-direction:column;gap:10px}
.severity-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px}
.sev-chip{display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:13px}
.sev-n{font-family:var(--display);font-size:18px;font-weight:700;line-height:1}
details.bug{border-radius:12px;overflow:hidden;border:1px solid var(--border);background:var(--bg2);transition:border-color 0.15s}
details.bug:hover{border-color:var(--border2)}
details.bug[open].crit{border-color:rgba(248,113,113,0.3)}
details.bug[open].warn{border-color:rgba(251,191,36,0.25)}
details.bug[open].info{border-color:rgba(79,156,249,0.25)}
details.bug summary{padding:16px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;list-style:none;user-select:none;flex-wrap:wrap}
details.bug summary::-webkit-details-marker{display:none}
.bug-badge{font-size:10px;font-weight:600;padding:3px 9px;border-radius:100px;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;flex-shrink:0}
.badge-crit{background:var(--red-bg);color:var(--red);border:1px solid rgba(248,113,113,0.2)}
.badge-warn{background:var(--amber-bg);color:var(--amber);border:1px solid rgba(251,191,36,0.2)}
.badge-info{background:var(--blue-bg);color:var(--accent2);border:1px solid rgba(79,156,249,0.2)}
.bug-title-text{font-size:14px;font-weight:500;color:var(--text);flex:1;min-width:200px}
.bug-file-badge{font-family:var(--mono);font-size:11px;color:var(--text3);background:var(--bg3);padding:2px 8px;border-radius:6px;white-space:nowrap}
.chevron{color:var(--text3);font-size:12px;transition:transform 0.2s;flex-shrink:0}
details[open] .chevron{transform:rotate(90deg)}
.bug-body{padding:0 20px 20px;border-top:1px solid var(--border)}
.bug-explain{font-size:14px;color:var(--text2);line-height:1.7;margin:14px 0 12px;font-weight:300}
.impact-box{background:var(--bg3);border-left:2px solid;border-radius:0 8px 8px 0;padding:10px 14px;margin:10px 0 14px;font-size:13px;color:var(--text2);line-height:1.6}
.impact-box.crit{border-color:var(--red)}.impact-box.warn{border-color:var(--amber)}.impact-box.info{border-color:var(--accent)}
.impact-label{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px}
.impact-box.crit .impact-label{color:var(--red)}.impact-box.warn .impact-label{color:var(--amber)}.impact-box.info .impact-label{color:var(--accent2)}
.code-compare{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
@media(max-width:640px){.code-compare{grid-template-columns:1fr}}
.code-block{background:var(--bg);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.code-block-header{padding:6px 12px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-bottom:1px solid var(--border)}
.code-block-header.bad{color:var(--red);background:rgba(248,113,113,0.06)}
.code-block-header.good{color:var(--green);background:rgba(52,211,153,0.06)}
.code-block-header.neutral{color:var(--text3);background:rgba(255,255,255,0.02)}
pre{font-family:var(--mono);font-size:12px;line-height:1.7;padding:12px 14px;overflow-x:auto;color:var(--text2)}
code.inline{font-family:var(--mono);font-size:11px;background:var(--bg3);border:1px solid var(--border2);padding:1px 5px;border-radius:4px;color:var(--accent2)}
.c-red{color:var(--red)}.c-green{color:var(--green)}.c-amb{color:var(--amber)}.c-blue{color:var(--accent2)}.c-dim{color:var(--text3)}
/* DEPLOY */
.deploy-grid{display:flex;flex-direction:column;gap:14px}
.deploy-card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.deploy-card.recommended{border-color:rgba(79,156,249,0.3)}
.deploy-header{padding:20px 24px;display:flex;align-items:flex-start;gap:16px;cursor:pointer}
.deploy-num{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:18px;font-weight:800;flex-shrink:0;color:#fff}
.num-a{background:linear-gradient(135deg,#0f5132,#1a7a4a)}
.num-b{background:linear-gradient(135deg,#0d3461,#1a5fa5)}
.num-c{background:linear-gradient(135deg,#5c3d0a,#9a6514)}
.deploy-meta{flex:1}
.deploy-title{font-family:var(--display);font-size:17px;font-weight:700;color:#fff}
.deploy-subtitle{font-size:13px;color:var(--text2);margin-top:3px;font-weight:300}
.deploy-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.dbadge{font-size:11px;padding:2px 8px;border-radius:100px;font-weight:500;background:var(--bg3);color:var(--text2);border:1px solid var(--border2)}
.deploy-body{padding:0 24px 24px;border-top:1px solid var(--border);display:none}
.deploy-body.open{display:block}
.deploy-intro{font-size:14px;color:var(--text2);margin:16px 0 20px;line-height:1.7;font-weight:300}
.sub-options{display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
.sub-opt{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.sub-opt-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px}
.sub-opt-desc{font-size:13px;color:var(--text2);line-height:1.65;font-weight:300}
.sub-opt-tag{display:inline-block;font-family:var(--mono);font-size:10px;color:var(--green);background:var(--green-bg);border:1px solid rgba(52,211,153,0.2);padding:2px 7px;border-radius:4px;margin-left:8px;vertical-align:middle}
.pros-cons{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:560px){.pros-cons{grid-template-columns:1fr}}
.pros,.cons{background:var(--bg3);border-radius:10px;padding:14px 16px}
.pc-head{font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:10px}
.pros .pc-head{color:var(--green)}.cons .pc-head{color:var(--amber)}
.pc-item{font-size:13px;color:var(--text2);padding:4px 0;display:flex;align-items:flex-start;gap:8px;line-height:1.5}
.pc-item::before{content:'·';color:var(--text3);flex-shrink:0}
.best-for{margin-top:14px;padding:12px 16px;background:var(--blue-bg);border:1px solid rgba(79,156,249,0.15);border-radius:10px;font-size:13px;color:var(--text2);line-height:1.6}
.best-for strong{color:var(--accent2);font-weight:600}
.deploy-steps{margin-top:20px}
.steps-title{font-size:12px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--text3);margin-bottom:12px}
.step{display:flex;gap:14px;margin-bottom:12px;align-items:flex-start}
.step-n{width:22px;height:22px;border-radius:50%;background:var(--bg3);border:1px solid var(--border2);font-family:var(--mono);font-size:11px;color:var(--text3);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.step-label{font-size:13px;font-weight:500;color:var(--text);margin-bottom:4px}
.step-detail{font-size:12px;color:var(--text3);line-height:1.6}
/* ENV TABLE */
.env-table{width:100%;border-collapse:collapse}
.env-table th{text-align:left;font-family:var(--mono);font-size:10px;font-weight:600;color:var(--text3);letter-spacing:0.08em;text-transform:uppercase;padding:7px 10px;border-bottom:1px solid var(--border)}
.env-table td{font-family:var(--mono);font-size:12px;color:var(--text2);padding:7px 10px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.5}
.env-table td.var-name{color:var(--accent2)}
.env-table td.var-desc{font-family:var(--sans);font-size:12px;color:var(--text3)}
.env-req{color:var(--red);font-size:10px;margin-left:4px}
/* FOOTER */
footer{border-top:1px solid var(--border);padding-top:32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.footer-left{font-size:13px;color:var(--text3)}
.footer-left strong{color:var(--text2)}
.version-pill{font-family:var(--mono);font-size:11px;color:var(--accent2);background:var(--blue-bg);border:1px solid rgba(79,156,249,0.2);padding:4px 10px;border-radius:100px}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px}
</style>
</head>
<body>
<div class="page">

<header class="hero">
  <div class="hero-tag">v1.5.0 &middot; Clos Apalta &middot; Integraci&oacute;n Bidireccional</div>
  <h1>Puente<br/><span>Oracle &#8596; HubSpot</span></h1>
  <p class="hero-desc">Middleware de integraci&oacute;n entre Oracle OPERA Cloud (OHIP) y HubSpot CRM. Sincroniza perfiles de hu&eacute;spedes y reservas en tiempo real mediante webhooks REST y streaming WebSocket (GraphQL-WS).</p>
  <div class="hero-stats">
    <div class="stat"><div class="stat-n red">4</div><div class="stat-l">Bugs cr&iacute;ticos</div></div>
    <div class="stat"><div class="stat-n amber">3</div><div class="stat-l">Advertencias</div></div>
    <div class="stat"><div class="stat-n blue">3</div><div class="stat-l">Mejoras</div></div>
    <div class="stat"><div class="stat-n green">3</div><div class="stat-l">Opciones deploy</div></div>
  </div>
</header>

<nav class="toc">
  <div class="toc-inner">
    <a href="#arquitectura">Arquitectura</a>
    <a href="#bugs">An&aacute;lisis de bugs</a>
    <a href="#deploy">Opciones de despliegue</a>
    <a href="#env">Variables de entorno</a>
  </div>
</nav>

<!-- ARQUITECTURA -->
<section id="arquitectura">
  <div class="section-header">
    <div class="section-label">01 &middot; Arquitectura</div>
    <h2>&iquest;C&oacute;mo funciona el sistema?</h2>
    <p class="section-desc">El puente act&uacute;a como intermediario entre dos sistemas que no hablan el mismo idioma. Traduce eventos de Oracle a objetos de HubSpot y viceversa.</p>
  </div>
  <div class="arch">
    <div class="arch-node"><div class="icon">&#127968;</div><div class="name">OPERA Cloud</div><div class="sub">Oracle OHIP</div></div>
    <div class="arch-arrow"><div class="line bi"></div><div style="font-size:10px;color:var(--text3)">REST + WS</div></div>
    <div class="arch-bridge"><div style="font-size:22px;margin-bottom:6px">&#127755;</div><div class="name">El Puente</div><div class="sub">Node.js &middot; Express</div></div>
    <div class="arch-arrow"><div class="line bi"></div><div style="font-size:10px;color:var(--text3)">REST + SDK</div></div>
    <div class="arch-node"><div class="icon">&#128994;</div><div class="name">HubSpot CRM</div><div class="sub">Contacts &middot; Deals</div></div>
  </div>
  <div class="section-label" style="margin-bottom:12px">Stack tecnol&oacute;gico</div>
  <div class="stack-grid">
    <div class="stack-item"><div class="stack-dot" style="background:#3178c6"></div><div><div class="stack-name">TypeScript</div><div class="stack-role">Lenguaje principal</div></div></div>
    <div class="stack-item"><div class="stack-dot" style="background:#68a063"></div><div><div class="stack-name">Node.js</div><div class="stack-role">Runtime</div></div></div>
    <div class="stack-item"><div class="stack-dot" style="background:#f0db4f"></div><div><div class="stack-name">Express</div><div class="stack-role">Servidor HTTP + webhooks</div></div></div>
    <div class="stack-item"><div class="stack-dot" style="background:#ff7a59"></div><div><div class="stack-name">HubSpot SDK</div><div class="stack-role">@hubspot/api-client</div></div></div>
    <div class="stack-item"><div class="stack-dot" style="background:#e6522c"></div><div><div class="stack-name">Axios</div><div class="stack-role">Llamadas REST a Oracle</div></div></div>
    <div class="stack-item"><div class="stack-dot" style="background:#c62a2a"></div><div><div class="stack-name">WebSocket (ws)</div><div class="stack-role">OHIP Streaming</div></div></div>
    <div class="stack-item"><div class="stack-dot" style="background:#888"></div><div><div class="stack-name">OAuth 2.0</div><div class="stack-role">Autenticaci&oacute;n Oracle</div></div></div>
    <div class="stack-item"><div class="stack-dot" style="background:#e10098"></div><div><div class="stack-name">GraphQL-WS</div><div class="stack-role">Protocolo streaming OHIP</div></div></div>
  </div>
  <div style="margin-top:28px">
    <div class="section-label" style="margin-bottom:12px">Flujos principales</div>
    <div class="flows">
      <div class="sub-opt"><div class="sub-opt-title">&#128276; Webhook HubSpot &#8594; Oracle</div><div class="sub-opt-desc">Cuando un Deal (reserva) se crea o actualiza en HubSpot, el webhook <code class="inline">POST /webhook/hubspot/deal</code> dispara el proceso: verifica perfiles en Oracle, crea o actualiza la reserva en OPERA Cloud y escribe el ID de confirmaci&oacute;n de vuelta en HubSpot.</div></div>
      <div class="sub-opt"><div class="sub-opt-title">&#128225; Streaming Oracle &#8594; HubSpot</div><div class="sub-opt-desc">El <code class="inline">OracleStreamer</code> abre una conexi&oacute;n WebSocket permanente con OHIP usando el protocolo <code class="inline">graphql-transport-ws</code>. Cuando Oracle emite un evento de perfil, el puente lo transforma y sincroniza el contacto en HubSpot autom&aacute;ticamente.</div></div>
    </div>
  </div>
</section>

<!-- BUGS -->
<section id="bugs">
  <div class="section-header">
    <div class="section-label">02 &middot; An&aacute;lisis de c&oacute;digo</div>
    <h2>Bugs identificados</h2>
    <p class="section-desc">Revisi&oacute;n l&iacute;nea a l&iacute;nea de los 5 archivos TypeScript. Todos los problemas fueron verificados contra el c&oacute;digo fuente antes de ser reportados. Hacer clic en cada card para ver el detalle y la correcci&oacute;n.</p>
  </div>
  <div class="severity-bar">
    <div class="sev-chip"><div class="sev-n" style="color:var(--red)">4</div><div><div style="font-size:12px;font-weight:500;color:var(--text)">Cr&iacute;ticos</div><div style="font-size:11px;color:var(--text3)">Rompen funcionalidad</div></div></div>
    <div class="sev-chip"><div class="sev-n" style="color:var(--amber)">3</div><div><div style="font-size:12px;font-weight:500;color:var(--text)">Advertencias</div><div style="font-size:11px;color:var(--text3)">L&oacute;gica incorrecta</div></div></div>
    <div class="sev-chip"><div class="sev-n" style="color:var(--accent)">3</div><div><div style="font-size:12px;font-weight:500;color:var(--text)">Mejoras</div><div style="font-size:11px;color:var(--text3)">Calidad de c&oacute;digo</div></div></div>
  </div>
  <div class="bug-grid">
    <details class="bug crit">
      <summary><span class="bug-badge badge-crit">Cr&iacute;tico 1/4</span><span class="bug-title-text">Typo en propiedad: n&uacute;mero de reserva nunca llega a HubSpot</span><span class="bug-file-badge">index.ts &middot; L150</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain">La propiedad enviada a HubSpot tiene un underscore extra al final: <code class="inline">numero_de_reserva_</code>. HubSpot no reconoce esa propiedad y la descarta silenciosamente. El campo correcto es <code class="inline">numero_de_reserva</code>. Es un typo de un solo car&aacute;cter con consecuencias totales: el n&uacute;mero de confirmaci&oacute;n de Oracle nunca queda registrado en ning&uacute;n negocio.</p>
        <div class="impact-box crit"><div class="impact-label">Impacto en producci&oacute;n</div>El campo numero_de_reserva quedar&aacute; vac&iacute;o en el 100% de los negocios sincronizados. Cualquier flujo que dependa de ese campo para identificar reservas fallar&aacute;.</div>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; c&oacute;digo actual</div><pre><span class="c-red">await hubspot.updateDeal(dealId, {
  "id_oracle": internalId,
  "numero_de_reserva_": ..., <span class="c-dim">// underscore extra</span>
  "id_synxis": "SINCRO_OK"
} as any);</span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; correcci&oacute;n</div><pre><span class="c-green">await hubspot.updateDeal(dealId, {
  "id_oracle": internalId,
  "numero_de_reserva": ...,  <span class="c-dim">// correcto</span>
  "id_synxis": "SINCRO_OK"
});</span></pre></div>
        </div>
      </div>
    </details>
    <details class="bug crit">
      <summary><span class="bug-badge badge-crit">Cr&iacute;tico 2/4</span><span class="bug-title-text">Error 409 de HubSpot mal capturado + update con firma incorrecta</span><span class="bug-file-badge">HubSpotClient.ts &middot; L115</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain">El SDK de HubSpot no expone el c&oacute;digo HTTP en <code class="inline">error.code</code> sino en <code class="inline">error.response.status</code> o <code class="inline">error.statusCode</code>. La condici&oacute;n <code class="inline">error.code === 409</code> nunca es verdadera. Adem&aacute;s, el m&eacute;todo <code class="inline">update()</code> no acepta <code class="inline">idProperty</code> dentro del cuerpo del objeto: es el cuarto argumento posicional de la funci&oacute;n.</p>
        <div class="impact-box crit"><div class="impact-label">Impacto en producci&oacute;n</div>syncContact() falla en el 100% de los contactos duplicados, lanzando una excepci&oacute;n no controlada que corta el flujo del webhook completo.</div>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; c&oacute;digo actual</div><pre><span class="c-red">if (error.code === 409) { <span class="c-dim">// nunca true</span>
            return await this.client.crm
    .contacts.basicApi.update(
      email,
      { properties, idProperty: "email" }
      <span class="c-dim">// idProperty en lugar incorrecto</span>
    );
}</span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; correcci&oacute;n</div><pre><span class="c-green">if (error.response?.status === 409
    || error.statusCode === 409) {
  return await this.client.crm
    .contacts.basicApi.update(
      email,
      { properties },
      undefined,
      "email"  <span class="c-dim">// 4to argumento</span>
    );
}</span></pre></div>
        </div>
      </div>
    </details>
    <details class="bug crit">
      <summary><span class="bug-badge badge-crit">Cr&iacute;tico 3/4</span><span class="bug-title-text">Token OAuth sin manejo de expiraci&oacute;n &mdash; servidor falla despu&eacute;s de ~1 hora</span><span class="bug-file-badge">OracleClient.ts &middot; L40</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain">La autenticaci&oacute;n solo ocurre cuando <code class="inline">this.accessToken === null</code>. Oracle emite tokens con TTL de ~1 hora. Despu&eacute;s de ese tiempo, el token expira y todas las llamadas devuelven <code class="inline">401 Unauthorized</code>. Como el token no es <code class="inline">null</code> (sigue siendo el string del token vencido), la re-autenticaci&oacute;n nunca se dispara. El servidor falla silenciosamente en todas las operaciones de Oracle hasta ser reiniciado manualmente.</p>
        <div class="impact-box crit"><div class="impact-label">Impacto en producci&oacute;n</div>Exactamente 1 hora despu&eacute;s de iniciar, todas las operaciones hacia Oracle fallan con 401. El proceso sigue vivo pero es completamente in&uacute;til. Sin alerta autom&aacute;tica.</div>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; c&oacute;digo actual</div><pre><span class="c-red">private accessToken: string | null = null;
async authenticate() {
  this.accessToken = data.access_token;
  <span class="c-dim">// no guarda cuándo expira</span>
}
<span class="c-dim">// En cada método:</span>
if (!this.accessToken)
  await this.authenticate();</span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; correcci&oacute;n</div><pre><span class="c-green">private accessToken: string | null = null;
private tokenExpiresAt: number = 0;

async authenticate() {
  this.accessToken = data.access_token;
  const ttl = (data.expires_in ?? 3600) * 1000;
  this.tokenExpiresAt = Date.now() + ttl;
}
private async ensureToken() {
  const margin = 60_000; <span class="c-dim">// 60s antes</span>
  if (!this.accessToken
      || Date.now() >= this.tokenExpiresAt - margin)
    await this.authenticate();
}</span></pre></div>
        </div>
      </div>
    </details>
    <details class="bug crit">
      <summary><span class="bug-badge badge-crit">Cr&iacute;tico 4/4</span><span class="bug-title-text">server.ts duplica rutas de index.ts con imports rotos</span><span class="bug-file-badge">server.ts &middot; todo el archivo</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain"><code class="inline">server.ts</code> define rutas que ya existen en <code class="inline">index.ts</code> y sus imports usan paths relativos incorrectos: <code class="inline">'../config/index.js'</code> y <code class="inline">'../application/mappers.js'</code> no existen en la estructura real del proyecto, lo que rompe el build de TypeScript. Si llegara a ser importado, causar&iacute;a conflictos de rutas e instancias duplicadas de los clientes.</p>
        <div class="impact-box warn"><div class="impact-label">Acci&oacute;n recomendada</div>Eliminar server.ts completamente. Todo el c&oacute;digo activo ya vive en index.ts. Mantener archivos con c&oacute;digo muerto e imports rotos genera confusi&oacute;n y puede introducir bugs involuntariamente.</div>
      </div>
    </details>
    <details class="bug warn">
      <summary><span class="bug-badge badge-warn">Advertencia 1/3</span><span class="bug-title-text">isPrimary se calcula pero el mapper lo ignora completamente</span><span class="bug-file-badge">index.ts L94 + mappers.ts L188</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain"><code class="inline">index.ts</code> extrae el label "hu&eacute;sped principal" de las asociaciones de HubSpot y calcula correctamente <code class="inline">isPrimary</code> para cada perfil. Sin embargo, <code class="inline">mappers.ts</code> ignora ese campo e implementa su propia l&oacute;gica: <code class="inline">primary: index === 0</code>. Si el hu&eacute;sped principal no es el primero del array devuelto por la API de asociaciones, Oracle recibir&aacute; el perfil equivocado marcado como titular.</p>
        <div class="impact-box warn"><div class="impact-label">Impacto</div>En reservas multi-hu&eacute;sped, OPERA Cloud puede registrar la reserva con el perfil equivocado como titular si el orden del array de HubSpot no coincide con la etiqueta.</div>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; mappers.ts actual</div><pre><span class="c-red">reservationGuests: guestProfiles.map(
  (profile, index) => ({
    profileInfo: { ... },
    primary: index === 0 <span class="c-dim">// siempre el primero</span>
  })
)</span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; correcci&oacute;n</div><pre><span class="c-green">reservationGuests: guestProfiles.map(
  (profile) => ({
    profileInfo: { ... },
    primary: profile.isPrimary === true
  })
)</span></pre></div>
        </div>
      </div>
    </details>
    <details class="bug warn">
      <summary><span class="bug-badge badge-warn">Advertencia 2/3</span><span class="bug-title-text">updateGuestProfile silencia errores &mdash; el caller nunca sabe que fall&oacute;</span><span class="bug-file-badge">OracleClient.ts &middot; L131</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain">El bloque <code class="inline">catch</code> de <code class="inline">updateGuestProfile</code> imprime un <code class="inline">console.error</code> pero no hace <code class="inline">throw</code>. La funci&oacute;n retorna <code class="inline">undefined</code> impl&iacute;citamente. Cualquier c&oacute;digo que la llame asumir&aacute; que la actualizaci&oacute;n fue exitosa, ya que no recibe ninguna se&ntilde;al de error. Este patr&oacute;n es especialmente peligroso porque puede generar inconsistencias de datos entre Oracle y HubSpot dif&iacute;ciles de detectar.</p>
        <div class="impact-box warn"><div class="impact-label">Impacto</div>Un error de red, un 401, o un rechazo de schema por parte de Oracle durante un update de perfil pasa completamente desapercibido para el caller. El log muestra error, pero el flujo contin&uacute;a como si todo estuviera bien.</div>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; actual</div><pre><span class="c-red">catch (error: any) {
  console.error("Error en updateGuestProfile");
  <span class="c-dim">// falta throw error</span>
}</span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; correcci&oacute;n</div><pre><span class="c-green">catch (error: any) {
  const detail = error.response?.data?.detail
    || error.message;
  console.error(
    `Error updateGuestProfile [${error.response?.status}]:`,
    detail
  );
  throw error; <span class="c-dim">// propagar al caller</span>
}</span></pre></div>
        </div>
      </div>
    </details>
    <details class="bug warn">
      <summary><span class="bug-badge badge-warn">Advertencia 3/3</span><span class="bug-title-text">WebSocket se cierra sin reconexi&oacute;n &mdash; Oracle Streamer queda mudo permanentemente</span><span class="bug-file-badge">OracleStreamer.ts &middot; L55</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain">El evento <code class="inline">close</code> del WebSocket llama a <code class="inline">stopPing()</code> pero no intenta reconectar. En producci&oacute;n, cualquier ca&iacute;da de red o timeout de inactividad cierra la conexi&oacute;n definitivamente. El proceso sigue vivo pero deja de recibir eventos del stream para siempre, sin ninguna alerta. La l&oacute;gica de reconexi&oacute;n solo existe como comentario: <code class="inline">// en el futuro</code>.</p>
        <div class="impact-box warn"><div class="impact-label">Impacto</div>Una sola desconexi&oacute;n de red silencia todo el flujo Oracle &#8594; HubSpot permanentemente. Solo se recupera reiniciando manualmente el servidor del puente.</div>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; actual</div><pre><span class="c-red">this.ws.on("close", (code, reason) => {
  this.stopPing();
  <span class="c-dim">// Reconexión en el futuro</span>
});</span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; backoff exponencial</div><pre><span class="c-green">private reconnectDelay = 5_000;
this.ws.on("close", (code) => {
  this.stopPing();
  if (code !== 1000) { <span class="c-dim">// no fue intencional</span>
    setTimeout(() => this.connect(),
      this.reconnectDelay);
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2, 60_000);
  }
});</span></pre></div>
        </div>
      </div>
    </details>
    <details class="bug info">
      <summary><span class="bug-badge badge-info">Limpieza 1/3</span><span class="bug-title-text">Variable muerta en OracleStreamer &mdash; TypeScript emite warning TS6133</span><span class="bug-file-badge">OracleStreamer.ts &middot; L51</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain">La variable <code class="inline">message</code> se declara con el resultado de <code class="inline">JSON.stringify(data.toString())</code> pero nunca se usa en ninguna l&iacute;nea posterior. TypeScript la marca como <code class="inline">TS6133: 'message' is declared but its value is never read</code>. Es c&oacute;digo muerto que puede confundir a quien lea el c&oacute;digo esperando que esa variable tenga alg&uacute;n prop&oacute;sito.</p>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; actual</div><pre><span class="c-red">this.ws.on("message", (data: string) => {
  const message = JSON.stringify( <span class="c-dim">// nunca se usa</span>
    data.toString()
  );
  this.handleMessage(
    JSON.parse(data.toString())
  );
});</span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; correcci&oacute;n</div><pre><span class="c-green">this.ws.on("message", (data: Buffer) => {
  this.handleMessage(
    JSON.parse(data.toString())
  );
});</span></pre></div>
        </div>
      </div>
    </details>
    <details class="bug info">
      <summary><span class="bug-badge badge-info">Limpieza 2/3</span><span class="bug-title-text">Doble validaci&oacute;n redundante en la ruta /sync-to-oracle</span><span class="bug-file-badge">index.ts &middot; L167</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain">La ruta valida <code class="inline">hsId</code> dos veces seguidas. La segunda condici&oacute;n (<code class="inline">typeof hsId !== "string"</code>) es siempre falsa despu&eacute;s de la primera guarda: si <code class="inline">hsId</code> pas&oacute; la primera verificaci&oacute;n, existe, y Express siempre lo provee como string. La segunda guarda es c&oacute;digo muerto que el compilador puede detectar.</p>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; actual (redundante)</div><pre><span class="c-red">if (!hsId)
  return res.status(400)...
if (!hsId || typeof hsId !== "string")
  return res.status(400)... <span class="c-dim">// nunca true</span></span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; validaci&oacute;n unificada</div><pre><span class="c-green">if (!hsId || !/^\d+$/.test(hsId)) {
  return res.status(400).json({
    error: "ID de HubSpot inv&aacute;lido"
  });
}</span></pre></div>
        </div>
      </div>
    </details>
    <details class="bug info">
      <summary><span class="bug-badge badge-info">Limpieza 3/3</span><span class="bug-title-text">Firma amb&iacute;gua en mapHubSpotReservationToOracle</span><span class="bug-file-badge">mappers.ts &middot; L172</span><span class="chevron">&#9658;</span></summary>
      <div class="bug-body">
        <p class="bug-explain">La funci&oacute;n recibe <code class="inline">hubspotDeal</code> pero internamente hace <code class="inline">hubspotDeal?.properties || hubspotDeal</code>. El caller la invoca con <code class="inline">props</code> (ya desempaquetado), entonces <code class="inline">hubspotDeal?.properties</code> devuelve <code class="inline">undefined</code> y el fallback corrige el error accidentalmente. Funciona, pero la intenci&oacute;n no es clara y puede romperse si alguien cambia el caller.</p>
        <div class="code-compare">
          <div class="code-block"><div class="code-block-header bad">&#10060; firma confusa</div><pre><span class="c-red">export function mapHubSpotReservationToOracle(
  hubspotDeal: any, <span class="c-dim">// Deal o props?</span>
  guestProfiles: any[]
) {
  const props = hubspotDeal?.properties
    || hubspotDeal; <span class="c-dim">// fallback accidental</span></span></pre></div>
          <div class="code-block"><div class="code-block-header good">&#10003; firma expl&iacute;cita</div><pre><span class="c-green">interface GuestProfile {
  id: string; isPrimary: boolean;
}
export function mapHubSpotReservationToOracle(
  dealProperties: Record&lt;string, any&gt;,
  guestProfiles: GuestProfile[]
) {
  const props = dealProperties;</span></pre></div>
        </div>
      </div>
    </details>

  </div>
</section>

<!-- DESPLIEGUE -->
<section id="deploy">
  <div class="section-header">
    <div class="section-label">03 &middot; Despliegue</div>
    <h2>Opciones de implementaci&oacute;n</h2>
    <p class="section-desc">Tres rutas viables evaluadas seg&uacute;n compatibilidad con Oracle, costo y velocidad de puesta en marcha. Hacer clic en cada opci&oacute;n para ver detalles y pasos de implementaci&oacute;n.</p>
  </div>
  <div class="deploy-grid">
    <div class="deploy-card">
      <div class="deploy-header" onclick="toggleDeploy('a')">
        <div class="deploy-num num-a">A</div>
        <div class="deploy-meta">
          <div class="deploy-title">Servidor VPS &mdash; Railway / Render / Fly.io</div>
          <div class="deploy-subtitle">Node.js + Express desplegado directamente. M&iacute;nima fricci&oacute;n, m&aacute;xima velocidad.</div>
          <div class="deploy-badges"><span class="dbadge">M&aacute;s simple</span><span class="dbadge">$5&ndash;20/mes</span><span class="dbadge">Deploy en horas</span><span class="dbadge">Git push</span></div>
        </div>
        <span class="chevron" id="chev-a">&#9658;</span>
      </div>
      <div class="deploy-body" id="body-a">
        <p class="deploy-intro">La ruta de menor fricci&oacute;n. Las tres plataformas aceptan proyectos Node.js/TypeScript directamente desde GitHub, generan una URL p&uacute;blica HTTPS estable en minutos y permiten configurar variables de entorno desde su panel. No requieren conocimientos de infraestructura.</p>
        <div class="sub-options">
          <div class="sub-opt"><div class="sub-opt-title">Railway <span class="sub-opt-tag">recomendado para empezar</span></div><div class="sub-opt-desc">Deploy desde GitHub en menos de 5 minutos. Auto-detecta Node.js y ejecuta el script de build. Variables de entorno con secrets cifrados. Plan Hobby a $5/mes con sleeps o $20/mes siempre activo. Soporta WebSocket sin configuraci&oacute;n adicional. URL del tipo <code class="inline">puente.railway.app</code> disponible inmediatamente.</div></div>
          <div class="sub-opt"><div class="sub-opt-title">Render</div><div class="sub-opt-desc">Opci&oacute;n gratuita con "spin-down" (el proceso se duerme despu&eacute;s de 15 min de inactividad y tarda ~30s en despertar). Para el puente, que necesita recibir webhooks en cualquier momento y mantener una conexi&oacute;n WebSocket activa, el plan gratuito no es suficiente. El plan Starter a $7/mes garantiza el proceso siempre activo. Build autom&aacute;tico en cada push a main.</div></div>
          <div class="sub-opt"><div class="sub-opt-title">Fly.io</div><div class="sub-opt-desc">Corre contenedores Docker. Regi&oacute;n m&aacute;s cercana: S&atilde;o Paulo (GRU). Requiere un <code class="inline">Dockerfile</code> y la CLI de Fly. El plan gratuito incluye 3 VMs compartidas (256 MB RAM), suficiente para el puente. Ideal si el equipo ya trabaja con Docker.</div></div>
        </div>
        <div class="pros-cons">
          <div class="pros"><div class="pc-head">Ventajas</div><div class="pc-item">Deploy con un <code class="inline">git push</code></div><div class="pc-item">Logs en tiempo real desde el browser</div><div class="pc-item">Sin aprender infraestructura nueva</div><div class="pc-item">Rollback inmediato a deploy anterior</div><div class="pc-item">HTTPS y dominio incluidos sin configuraci&oacute;n</div></div>
          <div class="cons"><div class="pc-head">Consideraciones</div><div class="pc-item">WebSocket requiere plan pagado</div><div class="pc-item">Sin SLA formal en tiers b&aacute;sicos</div><div class="pc-item">Datos viajan fuera del ecosistema Oracle</div><div class="pc-item">Mayor latencia vs. Oracle Cloud</div></div>
        </div>
        <div class="deploy-steps">
          <div class="steps-title">Pasos para Railway</div>
          <div class="step"><div class="step-n">1</div><div><div class="step-label">Crear cuenta y conectar GitHub</div><div class="step-detail">En <code class="inline">railway.app</code> &rarr; New Project &rarr; Deploy from GitHub Repo. Autorizar acceso al repositorio del puente.</div></div></div>
          <div class="step"><div class="step-n">2</div><div><div class="step-label">Confirmar el script de start</div><div class="step-detail">Railway busca <code class="inline">npm start</code>. Verificar que existe: <code class="inline">"start": "node dist/index.js"</code> y que el build compila TypeScript a <code class="inline">dist/</code>.</div></div></div>
          <div class="step"><div class="step-n">3</div><div><div class="step-label">Configurar variables de entorno</div><div class="step-detail">En Variables del proyecto, agregar todas las variables listadas en la secci&oacute;n de abajo. Railway las inyecta como <code class="inline">process.env.*</code>.</div></div></div>
          <div class="step"><div class="step-n">4</div><div><div class="step-label">Obtener la URL p&uacute;blica</div><div class="step-detail">Settings &rarr; Domains &rarr; Generate Domain. Esa URL es el webhook endpoint: <code class="inline">https://proyecto.railway.app/webhook/hubspot/deal</code>.</div></div></div>
          <div class="step"><div class="step-n">5</div><div><div class="step-label">Registrar webhook en HubSpot</div><div class="step-detail">HubSpot &rarr; Configuraci&oacute;n &rarr; Apps Privadas &rarr; Webhooks. Suscribir a <code class="inline">deal.creation</code> y <code class="inline">deal.propertyChange</code>.</div></div></div>
        </div>
        <div class="best-for"><strong>Ideal si:</strong> el objetivo es tener el puente funcionando esta semana. Es la ruta m&aacute;s r&aacute;pida para validar la integraci&oacute;n completa Oracle &#8596; HubSpot antes de decidir infraestructura definitiva.</div>
      </div>
    </div>
    <div class="deploy-card recommended">
      <div class="deploy-header" onclick="toggleDeploy('b')">
        <div class="deploy-num num-b">B</div>
        <div class="deploy-meta">
          <div class="deploy-title">Oracle Cloud Infrastructure (OCI)</div>
          <div class="deploy-subtitle">Misma nube que OPERA Cloud. M&aacute;xima compatibilidad y confianza del proveedor.</div>
          <div class="deploy-badges"><span class="dbadge">Misma nube Oracle</span><span class="dbadge">Always Free VM</span><span class="dbadge">SLA enterprise</span><span class="dbadge" style="color:var(--accent2);border-color:rgba(79,156,249,0.3)">Recomendado</span></div>
        </div>
        <span class="chevron" id="chev-b">&#9658;</span>
      </div>
      <div class="deploy-body" id="body-b">
        <p class="deploy-intro">Alojar el puente en OCI tiene una ventaja estrat&eacute;gica: vivir en la misma infraestructura que OPERA Cloud. Reduce la latencia de las llamadas API, simplifica la configuraci&oacute;n de redes y da confianza al equipo de Oracle en caso de soporte t&eacute;cnico. El programa Always Free incluye una VM ARM con recursos suficientes para el puente, sin costo adicional.</p>
        <div class="sub-options">
          <div class="sub-opt"><div class="sub-opt-title">OCI Compute VM &mdash; Always Free <span class="sub-opt-tag">recomendado</span></div><div class="sub-opt-desc">OCI ofrece 2 VMs ARM (Ampere A1) con 1 OCPU y 6 GB RAM cada una, permanentemente gratuitas. Se instala Node.js 20 LTS y PM2 para gesti&oacute;n de procesos. Se asigna una IP p&uacute;blica est&aacute;tica. Se configura el Security Group para abrir el puerto. Regi&oacute;n recomendada: <code class="inline">us-ashburn-1</code> o <code class="inline">us-phoenix-1</code> (datacenters de OPERA Cloud).</div></div>
          <div class="sub-opt"><div class="sub-opt-title">OCI Container Instances</div><div class="sub-opt-desc">Alternativa serverless de contenedores: no hay que gestionar una VM. Se sube la imagen Docker y OCI la ejecuta. Se paga por segundos de ejecuci&oacute;n (~$0.0015/hora para 1 OCPU + 2 GB). Requiere tener el proyecto Dockerizado. El contenedor arranca instant&aacute;neamente al llegar una petici&oacute;n.</div></div>
          <div class="sub-opt"><div class="sub-opt-title">Oracle Functions &mdash; solo REST, incompatible con Streaming</div><div class="sub-opt-desc">Serverless puro. Incompatible con OracleStreamer: las funciones son stateless y no pueden mantener una conexi&oacute;n WebSocket abierta. Solo viable si se descarta el streaming y se usa &uacute;nicamente el flujo de webhooks REST. Primeras 2 millones de invocaciones gratuitas por mes.</div></div>
        </div>
        <div class="pros-cons">
          <div class="pros"><div class="pc-head">Ventajas</div><div class="pc-item">Red interna Oracle = latencia m&iacute;nima</div><div class="pc-item">VM Always Free sin costo adicional</div><div class="pc-item">SLA 99.9% en compute shapes</div><div class="pc-item">Integraci&oacute;n con Oracle Identity</div><div class="pc-item">Soporte conjunto con el equipo de OHIP posible</div></div>
          <div class="cons"><div class="pc-head">Consideraciones</div><div class="pc-item">Console OCI m&aacute;s compleja que Railway</div><div class="pc-item">Requiere configurar VCN (red virtual)</div><div class="pc-item">Oracle Functions no soporta WebSocket</div><div class="pc-item">Curva de aprendizaje de 1&ndash;2 d&iacute;as</div></div>
        </div>
        <div class="deploy-steps">
          <div class="steps-title">Pasos para OCI Compute VM</div>
          <div class="step"><div class="step-n">1</div><div><div class="step-label">Crear cuenta OCI y confirmar regi&oacute;n</div><div class="step-detail">En <code class="inline">cloud.oracle.com</code>. Si el hotel ya tiene cuenta de OPERA Cloud, confirmar con el equipo de Oracle si se puede usar la misma tenancy.</div></div></div>
          <div class="step"><div class="step-n">2</div><div><div class="step-label">Crear VM Always Free (ARM)</div><div class="step-detail">Compute &rarr; Instances &rarr; Create. Shape: <code class="inline">VM.Standard.A1.Flex</code> (1 OCPU, 6 GB). OS: Ubuntu 22.04. Descargar la clave SSH generada.</div></div></div>
          <div class="step"><div class="step-n">3</div><div><div class="step-label">Configurar Security Group (firewall)</div><div class="step-detail">Networking &rarr; VCN &rarr; Security Lists. Agregar Ingress Rule: TCP, puerto del puente (ej. 3000). Sin esto, los webhooks de HubSpot no llegar&aacute;n al servidor.</div></div></div>
          <div class="step"><div class="step-n">4</div><div><div class="step-label">Instalar Node.js 20 + PM2</div><div class="step-detail"><code class="inline">curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -</code> y luego <code class="inline">npm install -g pm2</code>. PM2 reinicia el proceso autom&aacute;ticamente si cae.</div></div></div>
          <div class="step"><div class="step-n">5</div><div><div class="step-label">Clonar repo, configurar .env e iniciar</div><div class="step-detail">Crear el archivo <code class="inline">.env</code>, compilar TypeScript, luego iniciar: <code class="inline">pm2 start dist/index.js --name puente &amp;&amp; pm2 save</code>.</div></div></div>
        </div>
        <div class="best-for"><strong>Ideal si:</strong> el hotel ya tiene cuenta OCI activa (frecuente en clientes de OPERA Cloud). La VM Always Free corre el puente sin costo, con m&aacute;xima compatibilidad con los APIs de Oracle.</div>
      </div>
    </div>
    <div class="deploy-card">
      <div class="deploy-header" onclick="toggleDeploy('c')">
        <div class="deploy-num num-c">C</div>
        <div class="deploy-meta">
          <div class="deploy-title">iPaaS / Middleware de integraci&oacute;n</div>
          <div class="deploy-subtitle">Plataforma visual especializada en conectar sistemas. Sin gestionar servidores.</div>
          <div class="deploy-badges"><span class="dbadge">Sin infraestructura</span><span class="dbadge">Visual + c&oacute;digo</span><span class="dbadge">Make / n8n / MuleSoft</span></div>
        </div>
        <span class="chevron" id="chev-c">&#9658;</span>
      </div>
      <div class="deploy-body" id="body-c">
        <p class="deploy-intro">Una plataforma iPaaS abstrae completamente la infraestructura. En vez de gestionar un servidor, se definen flujos visuales que conectan sistemas mediante nodos. La l&oacute;gica de TypeScript del puente se convierte en nodos de transformaci&oacute;n. Ideal si el cliente quiere ver y modificar los flujos de integraci&oacute;n sin tocar c&oacute;digo.</p>
        <div class="sub-options">
          <div class="sub-opt"><div class="sub-opt-title">Make (ex-Integromat) <span class="sub-opt-tag">m&aacute;s f&aacute;cil</span></div><div class="sub-opt-desc">UI visual de flujos drag-and-drop. Conector nativo de HubSpot (Contacts, Deals, Associations). Oracle OPERA Cloud no tiene conector nativo: se usa el m&oacute;dulo HTTP para llamar los endpoints REST con credenciales OAuth. La l&oacute;gica de los mappers se convierte en m&oacute;dulos JSON Transformer. Precio: desde $9/mes. Reintentos autom&aacute;ticos y logs incluidos sin configuraci&oacute;n.</div></div>
          <div class="sub-opt"><div class="sub-opt-title">n8n &mdash; open source, self-hosted o cloud</div><div class="sub-opt-desc">Open source. Se puede hostear gratis en la VM de OCI (combinando Opciones B + C). Nodos de c&oacute;digo JavaScript nativo donde la l&oacute;gica de TypeScript se porta directamente. Soporta WebSocket mediante nodo trigger personalizado. n8n Cloud: $20/mes. Self-hosted en OCI VM: $0. Es la opci&oacute;n m&aacute;s flexible: c&oacute;digo + visual, control total.</div></div>
          <div class="sub-opt"><div class="sub-opt-title">MuleSoft / Boomi &mdash; enterprise</div><div class="sub-opt-desc">Conectores oficiales certificados de Oracle OPERA Cloud y HubSpot. SLA, monitoreo avanzado, gesti&oacute;n de errores enterprise. Costo: $500&ndash;2,000+/mes. Solo justificable si el cliente ya usa una de estas plataformas o tiene un equipo de integraci&oacute;n dedicado. No recomendado para un proyecto de este tama&ntilde;o.</div></div>
        </div>
        <div class="pros-cons">
          <div class="pros"><div class="pc-head">Ventajas</div><div class="pc-item">Sin gestionar ning&uacute;n servidor</div><div class="pc-item">Reintentos y alertas ya incluidos</div><div class="pc-item">Logs visuales sin configuraci&oacute;n adicional</div><div class="pc-item">El cliente puede ver y editar los flujos</div><div class="pc-item">n8n + OCI = costo m&iacute;nimo combinado</div></div>
          <div class="cons"><div class="pc-head">Consideraciones</div><div class="pc-item">Make no soporta WebSocket de Oracle</div><div class="pc-item">Sin conector nativo de OPERA Cloud</div><div class="pc-item">L&oacute;gica compleja requiere nodos de c&oacute;digo</div><div class="pc-item">Debugging m&aacute;s dif&iacute;cil que c&oacute;digo puro</div></div>
        </div>
        <div class="best-for"><strong>Ideal si:</strong> el cliente prefiere delegar la infraestructura. La combinaci&oacute;n <strong>n8n self-hosted en OCI VM</strong> es la m&aacute;s estrat&eacute;gica: costo $0, JavaScript nativo, soporte WebSocket, y desplegado en la misma nube que Oracle.</div>
      </div>
    </div>

  </div>
</section>

<!-- ENV VARS -->
<section id="env">
  <div class="section-header">
    <div class="section-label">04 &middot; Configuraci&oacute;n</div>
    <h2>Variables de entorno requeridas</h2>
    <p class="section-desc">Todas las variables sensibles deben configurarse en el panel de la plataforma elegida &mdash; nunca en el repositorio de c&oacute;digo ni en archivos que se suban a Git.</p>
  </div>
  <div class="code-block" style="margin-bottom:20px">
    <div class="code-block-header neutral">.env &mdash; estructura de referencia (nunca commitear este archivo)</div>
    <pre style="line-height:1.9">
<span class="c-dim"># ── Oracle OHIP ──────────────────────────────────────</span>
<span class="c-amb">ORACLE_BASE_URL</span>      = https://[tenant].ohip.oracle.com
<span class="c-amb">ORACLE_CLIENT_ID</span>     = [client_id_de_oauth]
<span class="c-amb">ORACLE_CLIENT_SECRET</span> = [client_secret_de_oauth]
<span class="c-amb">ORACLE_APP_KEY</span>       = [app_key_del_portal_ohip]
<span class="c-amb">ORACLE_HOTEL_ID</span>      = CAR

<span class="c-dim"># ── HubSpot ───────────────────────────────────────────</span>
<span class="c-amb">HUBSPOT_ACCESS_TOKEN</span> = pat-na1-[token_de_app_privada]

<span class="c-dim"># ── Servidor ──────────────────────────────────────────</span>
<span class="c-amb">PORT</span>                 = 3000
<span class="c-amb">NODE_ENV</span>             = production</pre>
  </div>
  <table class="env-table">
    <thead><tr><th>Variable</th><th>Descripci&oacute;n</th><th>D&oacute;nde obtenerla</th></tr></thead>
    <tbody>
      <tr><td class="var-name">ORACLE_BASE_URL<span class="env-req">*</span></td><td class="var-desc">URL base del tenant de OHIP. Incluye el identificador &uacute;nico del hotel en el path.</td><td>Portal OHIP &rarr; My Apps</td></tr>
      <tr><td class="var-name">ORACLE_CLIENT_ID<span class="env-req">*</span></td><td class="var-desc">Client ID del flujo OAuth 2.0 client_credentials. Par con CLIENT_SECRET.</td><td>Portal OHIP &rarr; OAuth Credentials</td></tr>
      <tr><td class="var-name">ORACLE_CLIENT_SECRET<span class="env-req">*</span></td><td class="var-desc">Client Secret. Nunca exponer en logs ni en respuestas HTTP. Rotar si se compromete.</td><td>Portal OHIP &rarr; OAuth Credentials</td></tr>
      <tr><td class="var-name">ORACLE_APP_KEY<span class="env-req">*</span></td><td class="var-desc">Application Key del portal OHIP. Se env&iacute;a en el header x-app-key y tambi&eacute;n se hashea SHA-256 para la URL del WebSocket de streaming.</td><td>Portal OHIP &rarr; My Apps &rarr; App Key</td></tr>
      <tr><td class="var-name">ORACLE_HOTEL_ID<span class="env-req">*</span></td><td class="var-desc">Identificador del hotel en OPERA Cloud. Actualmente hardcodeado como "CAR" en varios lugares del c&oacute;digo. Centralizar aqu&iacute; es una mejora pendiente importante.</td><td>Configuraci&oacute;n del hotel en OPERA Cloud</td></tr>
      <tr><td class="var-name">HUBSPOT_ACCESS_TOKEN<span class="env-req">*</span></td><td class="var-desc">Token de acceso de una App Privada de HubSpot. Requiere scopes: crm.objects.contacts.read/write, crm.objects.deals.read/write, crm.associations.read/write.</td><td>HubSpot &rarr; Configuraci&oacute;n &rarr; Apps Privadas</td></tr>
      <tr><td class="var-name">PORT</td><td class="var-desc">Puerto del servidor Express. Railway y Render lo inyectan autom&aacute;ticamente. OCI VM requiere configurarlo manualmente y abrirlo en el Security Group del firewall.</td><td>Libre elecci&oacute;n (default: 3000)</td></tr>
      <tr><td class="var-name">NODE_ENV</td><td class="var-desc">Entorno de ejecuci&oacute;n. En producci&oacute;n, algunos SDKs optimizan su comportamiento reduciendo logs verbosos y habilitando mejoras de rendimiento.</td><td>Configurar como "production"</td></tr>
    </tbody>
  </table>
  <p style="font-size:12px;color:var(--text3);margin-top:10px;font-family:var(--mono)"><span class="env-req">*</span> requerida &mdash; el servidor no arrancar&aacute; correctamente sin estas variables</p>
</section>

<footer>
  <div class="footer-left"><strong>Puente Clos Apalta</strong> &middot; Documentaci&oacute;n t&eacute;cnica &middot; Oracle OHIP &#8596; HubSpot CRM<br/>Generado el <span id="fecha"></span></div>
  <div class="version-pill">v1.5.0</div>
</footer>

</div>
<script>
document.getElementById('fecha').textContent =
  new Date().toLocaleDateString('es-CL',{year:'numeric',month:'long',day:'numeric'});
function toggleDeploy(id){
  var body=document.getElementById('body-'+id);
  var chev=document.getElementById('chev-'+id);
  var isOpen=body.classList.contains('open');
  ['a','b','c'].forEach(function(x){
    document.getElementById('body-'+x).classList.remove('open');
    document.getElementById('chev-'+x).classList.remove('open');
  });
  if(!isOpen){body.classList.add('open');chev.classList.add('open');}
}
</script>
</body>
</html>