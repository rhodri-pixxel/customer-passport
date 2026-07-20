import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, ChevronLeft, Download, Bell, FileText, MapPin, Users, Target,
  AlertTriangle, CheckCircle2, Circle, Clock, Paperclip, Send, BarChart3,
  LayoutGrid, Eye, Pencil, ExternalLink, Building2, Mail, Satellite, Layers,
  Activity, TrendingUp, X, Lock, Gauge, AtSign, Plus, Radar, ChevronDown,
  MessageSquare, Hash, Zap, RefreshCw, CheckCheck, Camera, ListChecks, CalendarClock, Upload, Trash2, UserPlus, Link2, Star, ArrowRightCircle
} from "lucide-react";
import shp from "shpjs";
import proj4 from "proj4";
import { kml as kmlToGeoJson } from "@tmcw/togeojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import PrototypesView from "./components/PrototypesView.jsx";

/* ------------------------------------------------------------------ */
/*  Design system (spectral / Earth-observation theme)                */
/* ------------------------------------------------------------------ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Inter:wght@400;450;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.cp-root{
  /* ── Pixxel brand: electric blue on a light canvas (deepened for legible text) ── */
  --ink:#0B1220; --ink2:#1B2433; --muted:#5A6577; --muted2:#929BAB;
  --line:#E4E8EF; --line-soft:#EEF1F6; --surface:#F5F7FB; --card:#FFFFFF;
  --accent:#0399C9; --accent-deep:#036E8C; --accent-soft:#E1F7FE; --accent-bright:#03d4ff; --sky:#06bdff;
  --se:#2D7FF9; --se-soft:#E7F0FE; --cs:#E07A2B; --cs-soft:#FBEEDF;
  --an:#7A5AF5; --an-soft:#EDE8FE;
  --ok:#2FB67A; --warn:#E0B02B; --bad:#E5564B;
  /* industry-wise sector colours (from brand guidelines) */
  --agri:#98eb00; --energy:#ecb423; --mining:#f76e2f; --env:#00ffbb; --gov:#06bdff; --forest:#00c030;
  --font-display:'Barlow',ui-sans-serif,system-ui,sans-serif;
  --font-body:'Inter',ui-sans-serif,system-ui,sans-serif;
  --font-mono:'IBM Plex Mono',ui-monospace,monospace;
  font-family:var(--font-body); color:var(--ink); background:var(--surface);
  min-height:100vh; -webkit-font-smoothing:antialiased;
}
/* Dark "space canvas" — brand-forward theme, scoped to a wrapper for now
   (preview it on the Prototypes route before making it the global default). */
.space-canvas{
  --ink:#F2FAFD; --ink2:#C4D2DA; --muted:#8A97A4; --muted2:#5C6773;
  --line:#1C2430; --line-soft:#141A24; --surface:#04060B; --card:#0E121B;
  --accent:#03d4ff; --accent-deep:#5FE6FF; --accent-soft:rgba(3,212,255,.12); --accent-bright:#03d4ff; --sky:#06bdff;
  --se-soft:rgba(45,127,249,.16); --an-soft:rgba(122,90,245,.18);
  color:var(--ink); background:var(--surface);
}
.cp-root *{box-sizing:border-box;}
.cp-root button{font-family:inherit; cursor:pointer; border:none; background:none;}
.mono{font-family:var(--font-mono);}
.disp{font-family:var(--font-display);}

/* top bar */
.cp-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:18px;
  padding:12px 24px;background:rgba(255,255,255,.82);backdrop-filter:blur(10px);
  border-bottom:1px solid var(--line);}
.cp-brand{display:flex;align-items:center;gap:10px;font-family:var(--font-display);
  font-weight:600;font-size:15px;letter-spacing:-.01em;}
.cp-brand .mark{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;
  background:linear-gradient(135deg,#0B1220,#13314a);color:#fff;}
.cp-brand small{display:block;font-family:var(--font-mono);font-weight:500;font-size:9.5px;
  letter-spacing:.14em;color:var(--muted2);text-transform:uppercase;margin-top:1px;}
.cp-nav{display:flex;gap:4px;margin-left:6px;}
.cp-nav button{display:flex;align-items:center;gap:7px;padding:7px 13px;border-radius:8px;
  font-size:13px;font-weight:500;color:var(--muted);}
.cp-nav button.on{background:var(--ink);color:#fff;}
.cp-nav button:not(.on):hover{background:var(--line-soft);color:var(--ink);}
.cp-spacer{flex:1;}
.cp-viewtoggle{display:flex;align-items:center;background:var(--line-soft);border-radius:9px;
  padding:3px;gap:2px;}
.cp-viewtoggle button{display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:7px;
  font-size:12px;font-weight:500;color:var(--muted);}
.cp-viewtoggle button.on{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(11,18,32,.08);}

.cp-page{max-width:1180px;margin:0 auto;padding:26px 24px 80px;}

/* readonly banner */
.cp-banner{display:flex;align-items:center;gap:10px;background:var(--cs-soft);
  border:1px solid #F0D9BE;color:#8a571f;border-radius:11px;padding:10px 14px;
  font-size:13px;margin-bottom:18px;}

/* filters */
.cp-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;}
.cp-search{flex:1;min-width:240px;display:flex;align-items:center;gap:9px;background:#fff;
  border:1px solid var(--line);border-radius:11px;padding:10px 14px;}
.cp-search input{border:none;outline:none;font-size:14px;flex:1;background:none;color:var(--ink);}
.cp-search input::placeholder{color:var(--muted2);}
.cp-select{position:relative;}
.cp-select select{appearance:none;background:#fff;border:1px solid var(--line);border-radius:11px;
  padding:10px 32px 10px 13px;font-size:13px;color:var(--ink);font-family:inherit;cursor:pointer;}
.cp-select .chev{position:absolute;right:11px;top:50%;transform:translateY(-50%);
  pointer-events:none;color:var(--muted2);}

/* deal grid */
.cp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;}
.cp-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;
  cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;}
.cp-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px -14px rgba(11,18,32,.28);
  border-color:#D4DAE4;}
.cp-card .row{display:flex;justify-content:space-between;gap:12px;}
.cp-card h3{font-family:var(--font-display);font-size:16.5px;font-weight:600;margin:0;
  letter-spacing:-.01em;line-height:1.2;}
.cp-sector{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);
  margin-top:5px;}
.cp-amount{font-family:var(--font-mono);font-size:13px;font-weight:500;color:var(--ink2);}
.cp-card .owners{display:flex;gap:6px;margin-top:16px;}
.cp-card .meta{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted2);
  margin-top:14px;}

/* avatar / owner chip */
.av{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:10px;
  font-weight:600;font-family:var(--font-mono);color:#fff;flex:none;}
.av.empty{background:#fff;border:1.5px dashed var(--line);color:var(--muted2);}
.av.se{background:var(--se);} .av.cs{background:var(--cs);} .av.an{background:var(--an);}
.role-tag{font-size:9px;font-family:var(--font-mono);letter-spacing:.1em;text-transform:uppercase;
  font-weight:600;}

/* stage chip */
.chip{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:7px;
  font-size:11px;font-weight:600;letter-spacing:.01em;}
.chip.live{background:var(--accent-soft);color:var(--accent-deep);}
.chip.won{background:#E3F7EC;color:#1f8a57;}
.chip.early{background:var(--line-soft);color:var(--muted);}

/* mini ring */
.ring-wrap{display:grid;place-items:center;position:relative;}
.ring-val{position:absolute;font-family:var(--font-mono);font-weight:600;}

/* ---- passport detail ---- */
.cp-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);
  font-weight:500;margin-bottom:16px;}
.cp-back:hover{color:var(--ink);}

.cp-head{position:relative;overflow:hidden;background:linear-gradient(180deg,#0B1220,#10243a);
  border-radius:20px;padding:24px 26px;color:#fff;margin-bottom:18px;}
.cp-head .grat{position:absolute;inset:0;opacity:.5;pointer-events:none;
  background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);
  background-size:34px 34px;
  mask-image:radial-gradient(120% 120% at 80% -10%,#000,transparent 70%);}
.cp-head .spectral{position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,#6D5DF6,#2D7FF9,#0EA5B7,#2FB67A,#E0B02B,#E5564B);}
.cp-head .htop{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;
  position:relative;}
.cp-head h1{font-family:var(--font-display);font-size:24px;font-weight:600;margin:0;
  letter-spacing:-.015em;}
.cp-head .hsub{display:flex;align-items:center;gap:14px;margin-top:7px;font-size:12.5px;
  color:#9fb3c9;}
.cp-head .hsub .dot{width:3px;height:3px;border-radius:50%;background:#54708c;}
.h-actions{display:flex;gap:8px;flex-wrap:wrap;}
.btn{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:9px;
  font-size:12.5px;font-weight:500;transition:.12s;}
.btn.ghost{background:rgba(255,255,255,.08);color:#dbe6f2;border:1px solid rgba(255,255,255,.12);}
.btn.ghost:hover{background:rgba(255,255,255,.15);}
.btn.solid{background:var(--accent);color:#06262b;font-weight:600;}
.btn.solid:hover{background:#15b9cc;}
.btn:disabled{opacity:.45;cursor:not-allowed;}

/* stage progress */
.stage-bar{display:flex;gap:5px;margin-top:20px;position:relative;}
.stage-seg{flex:1;}
.stage-seg .bar{height:5px;border-radius:3px;background:rgba(255,255,255,.13);}
.stage-seg.done .bar{background:var(--accent);}
.stage-seg.cur .bar{background:linear-gradient(90deg,var(--accent),#7fe3ee);}
.stage-seg .lbl{font-size:9.5px;margin-top:7px;color:#7e93aa;font-weight:500;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.stage-seg.done .lbl,.stage-seg.cur .lbl{color:#cfe0f0;}

/* ownership + readiness rail */
.cp-railrow{display:grid;grid-template-columns:1fr auto;gap:16px;margin-bottom:18px;
  align-items:stretch;}
@media(max-width:760px){.cp-railrow{grid-template-columns:1fr;}}
.owners-panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 18px;
  display:flex;gap:26px;flex-wrap:wrap;align-items:center;}
.owner-slot{display:flex;align-items:center;gap:10px;position:relative;}
.owner-slot .meta .role-tag{color:var(--muted2);}
.owner-slot .meta .nm{font-size:13px;font-weight:500;margin-top:2px;}
.owner-slot .assign{font-size:12px;color:var(--accent-deep);font-weight:500;}
.assign-menu{position:absolute;top:42px;left:0;z-index:20;background:#fff;border:1px solid var(--line);
  border-radius:11px;box-shadow:0 14px 40px -16px rgba(11,18,32,.35);padding:6px;min-width:170px;}
.assign-menu button{display:block;width:100%;text-align:left;padding:8px 10px;border-radius:8px;
  font-size:13px;color:var(--ink);}
.assign-menu button:hover{background:var(--line-soft);}

.add-row{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border:1px dashed var(--line);
  border-radius:9px;background:transparent;color:var(--accent-deep);font-size:12.5px;font-weight:500;
  cursor:pointer;margin-top:6px;width:100%;justify-content:center;}
.add-row:hover{border-color:var(--accent);background:var(--accent-soft);}
.qc-table{width:100%;border-collapse:collapse;font-size:12.5px;}
.qc-table th{text-align:left;padding:10px 12px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--muted2);border-bottom:1px solid var(--line);white-space:nowrap;}
.qc-table td{padding:9px 12px;border-bottom:1px solid var(--line-soft);vertical-align:middle;white-space:nowrap;}
.qc-table tr:last-child td{border-bottom:none;}
.qc-table tr:hover td{background:var(--line-soft);}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:9px;padding:2px;background:#fff;}
.seg button{padding:6px 13px;border-radius:7px;border:none;background:transparent;font-size:12.5px;
  color:var(--muted);cursor:pointer;font-weight:500;}
.seg button.on{background:var(--accent);color:#fff;}
@keyframes spin{to{transform:rotate(360deg);}}
.spin{animation:spin 0.9s linear infinite;}

.readiness-panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 20px;
  display:flex;align-items:center;gap:16px;cursor:pointer;min-width:230px;}
.readiness-panel:hover{border-color:#D4DAE4;}
.readiness-panel .txt .k{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--muted2);}
.readiness-panel .txt .v{font-family:var(--font-display);font-size:15px;font-weight:600;margin-top:2px;}
.readiness-panel .txt small{font-size:11px;color:var(--muted);}

/* checklist popover */
.checklist{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 18px;
  margin-bottom:18px;}
.checklist h4{font-family:var(--font-display);font-size:13px;font-weight:600;margin:0 0 12px;}
.checklist .items{display:grid;grid-template-columns:1fr 1fr;gap:8px 22px;}
@media(max-width:620px){.checklist .items{grid-template-columns:1fr;}}
.cl-item{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--ink2);}
.cl-item.miss{color:var(--muted2);}

/* tabs */
.cp-tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);margin-bottom:22px;}
.cp-tabs button{display:flex;align-items:center;gap:7px;padding:11px 16px;font-size:13.5px;
  font-weight:500;color:var(--muted);position:relative;}
.cp-tabs button.on{color:var(--ink);font-weight:600;}
.cp-tabs button.on::after{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:2px;
  background:var(--accent);border-radius:2px;}

/* content blocks */
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:760px){.cols{grid-template-columns:1fr;}}
.block{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 20px;
  margin-bottom:16px;}
.block .bhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.block .bhead .lhs{display:flex;align-items:center;gap:9px;}
.block h3{font-family:var(--font-display);font-size:13.5px;font-weight:600;margin:0;
  letter-spacing:.005em;}
.block .ic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;
  background:var(--accent-soft);color:var(--accent-deep);}
.kv{display:flex;flex-direction:column;gap:11px;}
.kv .k{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted2);margin-bottom:3px;}
.kv .v{font-size:13.5px;line-height:1.55;color:var(--ink2);}
.tags{display:flex;flex-wrap:wrap;gap:6px;}
.tag{font-size:11.5px;font-weight:500;padding:4px 9px;border-radius:7px;background:var(--line-soft);
  color:var(--ink2);}
.tag.spec{background:var(--accent-soft);color:var(--accent-deep);font-family:var(--font-mono);}
.li{display:flex;gap:10px;font-size:13.5px;line-height:1.5;color:var(--ink2);margin-bottom:9px;}
.li .b{color:var(--accent);flex:none;margin-top:5px;width:5px;height:5px;border-radius:50%;
  background:var(--accent);}
.link{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--accent-deep);
  font-weight:500;}
.empty{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted2);
  border:1px dashed var(--line);border-radius:11px;padding:13px 14px;}
.empty button{margin-left:auto;font-size:12px;color:var(--accent-deep);font-weight:500;
  display:inline-flex;align-items:center;gap:5px;}

/* AOI map */
.aoi{border-radius:14px;overflow:hidden;border:1px solid var(--line);position:relative;
  background:#0c1a26;}
.aoi .cap{position:absolute;left:12px;bottom:12px;background:rgba(8,18,28,.72);
  backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.12);border-radius:9px;
  padding:8px 11px;color:#dfeaf3;font-family:var(--font-mono);font-size:10.5px;line-height:1.6;}
.aoi .badge{position:absolute;right:12px;top:12px;background:rgba(8,18,28,.72);
  border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:5px 9px;color:#9fe7ef;
  font-family:var(--font-mono);font-size:10px;display:flex;align-items:center;gap:6px;}

/* risk rows */
.risk{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--line-soft);}
.risk:first-child{border-top:none;}
.risk .sev{font-size:9.5px;font-family:var(--font-mono);font-weight:600;letter-spacing:.08em;
  padding:3px 7px;border-radius:6px;flex:none;text-transform:uppercase;}
.sev.high{background:#FCE6E4;color:#b13b32;} .sev.med{background:#FBF1D8;color:#9a7415;}
.sev.low{background:#E7F1FE;color:#2c66c4;}

/* notes / activity */
.composer{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 16px;
  margin-bottom:16px;}
.composer textarea{width:100%;border:none;outline:none;resize:none;font-family:inherit;
  font-size:13.5px;color:var(--ink);min-height:54px;background:none;}
.composer textarea::placeholder{color:var(--muted2);}
.composer .crow{display:flex;align-items:center;justify-content:space-between;margin-top:8px;
  padding-top:10px;border-top:1px solid var(--line-soft);}
.composer .hint{font-size:11.5px;color:var(--muted2);display:flex;align-items:center;gap:6px;}
.feed-item{display:flex;gap:12px;padding:13px 0;border-top:1px solid var(--line-soft);}
.feed-item:first-child{border-top:none;}
.feed-item .ft{font-size:13.5px;line-height:1.55;color:var(--ink2);}
.feed-item .fm{font-size:11px;color:var(--muted2);margin-top:4px;font-family:var(--font-mono);}
.feed-item .mention{color:var(--se);font-weight:500;}
.attach{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid var(--line);
  border-radius:11px;margin-bottom:8px;}
.attach .ai{width:34px;height:34px;border-radius:8px;background:var(--line-soft);display:grid;
  place-items:center;color:var(--muted);flex:none;}
.attach .an2{font-size:13px;font-weight:500;} .attach .as{font-size:11px;color:var(--muted2);}

/* dashboard */
.dash-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;}
@media(max-width:820px){.dash-grid{grid-template-columns:repeat(2,1fr);}}
.stat{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 18px;}
.stat .k{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--muted2);}
.stat .v{font-family:var(--font-display);font-size:27px;font-weight:600;margin-top:6px;
  letter-spacing:-.02em;}
.stat .d{font-size:11.5px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:5px;}
.barlist{display:flex;flex-direction:column;gap:13px;}
.barlist .br{display:grid;grid-template-columns:150px 1fr 38px;align-items:center;gap:12px;
  font-size:12.5px;}
.barlist .track{height:8px;background:var(--line-soft);border-radius:5px;overflow:hidden;}
.barlist .fill{height:100%;border-radius:5px;background:linear-gradient(90deg,var(--accent),#6fd9e6);}
.alert-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line-soft);
  cursor:pointer;}
.alert-row:first-child{border-top:none;}
.alert-row:hover .anm{color:var(--accent-deep);}
.alert-row .anm{font-size:13.5px;font-weight:500;}
.alert-row .as2{font-size:11.5px;color:var(--muted);}

/* toast */
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:60;
  background:var(--ink);color:#fff;padding:12px 18px;border-radius:12px;font-size:13px;
  display:flex;align-items:center;gap:10px;box-shadow:0 16px 40px -12px rgba(11,18,32,.5);}
.toast .spectral-dot{width:7px;height:7px;border-radius:50%;
  background:linear-gradient(90deg,#0EA5B7,#2FB67A);}

.section-title{font-family:var(--font-display);font-size:18px;font-weight:600;margin:0 0 4px;
  letter-spacing:-.01em;}
.section-sub{font-size:13px;color:var(--muted);margin:0 0 22px;}

/* logo / wordmark */
.cp-root{--dir:#0B6E7A;}
.av.dir{background:var(--dir);}
.cp-logo-img{height:22px;width:auto;display:block;}
/* Keep the dark-ink top-bar logo readable when the OS/browser forces a dark or
   high-contrast ("contrast theme") view: sit it on a light plate that opts out
   of forced-colors and browser auto-darkening. */
.cp-logo-plate{display:inline-flex;align-items:center;padding:3px 7px;border-radius:7px;
  background:#fff;color-scheme:light;forced-color-adjust:none;}
.cp-wordmark{font-family:var(--font-display);font-weight:700;font-size:21px;letter-spacing:-.045em;
  color:var(--ink);line-height:1;}
.cp-wordmark .x{color:var(--accent);}
.cp-brand-div{width:1px;height:22px;background:var(--line);margin:0 2px;}

/* HubSpot sync pill */
.hs-pill{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);
  border-radius:9px;padding:6px 8px 6px 11px;font-size:11.5px;color:var(--muted);}
.hs-dot{width:7px;height:7px;border-radius:50%;background:var(--ok);
  box-shadow:0 0 0 3px rgba(47,182,122,.15);}
.hs-pill b{color:var(--ink);font-weight:600;}
.hs-pill .syncnow{display:inline-flex;align-items:center;gap:5px;color:var(--accent-deep);
  font-weight:500;font-size:11.5px;padding:4px 8px;border-radius:7px;}
.hs-pill .syncnow:hover{background:var(--accent-soft);}
.hs-writeback{display:inline-flex;align-items:center;gap:7px;margin-top:14px;position:relative;
  font-size:11px;color:#9fb3c9;font-family:var(--font-mono);}

/* notification bell + panel */
.bell{position:relative;}
.bell .btn-bell{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;
  color:var(--muted);border:1px solid var(--line);background:#fff;}
.bell .btn-bell:hover{color:var(--ink);border-color:#D4DAE4;}
.bell .badge{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;
  border-radius:9px;background:var(--bad);color:#fff;font-size:10px;font-weight:700;
  display:grid;place-items:center;font-family:var(--font-mono);border:2px solid #fff;}
.notif-panel{position:absolute;top:46px;right:0;z-index:40;width:340px;background:#fff;
  border:1px solid var(--line);border-radius:14px;box-shadow:0 22px 60px -22px rgba(11,18,32,.4);
  overflow:hidden;}
.notif-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;
  border-bottom:1px solid var(--line-soft);}
.notif-head h4{font-family:var(--font-display);font-size:13.5px;font-weight:600;margin:0;}
.notif-head button{font-size:11.5px;color:var(--accent-deep);font-weight:500;}
.notif-list{max-height:340px;overflow-y:auto;}
.notif-item{display:flex;gap:11px;padding:12px 15px;border-bottom:1px solid var(--line-soft);
  position:relative;}
.notif-item:last-child{border-bottom:none;}
.notif-item.unread{background:#F3FBFC;}
.notif-item .nt{font-size:12.5px;line-height:1.5;color:var(--ink2);}
.notif-item .nt b{font-weight:600;}
.notif-item .nch{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:10.5px;
  color:var(--muted2);font-family:var(--font-mono);}
.notif-empty{padding:26px 15px;text-align:center;font-size:12.5px;color:var(--muted2);}

/* Slack integration */
.slack-pill{display:flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);
  border-radius:9px;padding:6px 10px;font-size:11.5px;color:var(--muted);}
.slack-dot{width:7px;height:7px;border-radius:50%;background:#4A154B;}
.slack-pill b{color:var(--ink);font-weight:600;}
.slack-btn{display:inline-flex;align-items:center;gap:5px;color:#4A154B;font-weight:600;
  font-size:11.5px;padding:4px 8px;border-radius:7px;background:rgba(74,21,75,.06);}
.slack-btn:hover{background:rgba(74,21,75,.12);}
.slack-btn.sending{opacity:.55;pointer-events:none;}
.btn.slack{background:#4A154B;color:#fff;font-weight:600;}
.btn.slack:hover{background:#3d1040;}
.btn.slack.sending{opacity:.55;pointer-events:none;}
.slack-status{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#F9F5FA;
  border:1px solid #e5d5e6;border-radius:11px;font-size:12.5px;color:#4A154B;margin-top:10px;}
.slack-status.err{background:#FEF2F2;border-color:#fcc;color:#b91c1c;}
.channel-select{display:flex;align-items:center;gap:8px;background:var(--line-soft);
  border-radius:9px;padding:7px 12px;margin-top:12px;}
.channel-select label{font-size:11.5px;color:var(--muted);font-weight:500;white-space:nowrap;}
.channel-select select{background:transparent;border:none;outline:none;font-size:12.5px;
  color:var(--ink);font-family:inherit;cursor:pointer;flex:1;}

/* ---- Customer Feedback tab ---- */
.fb-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
.fb-sat-bar{display:flex;gap:8px;flex-wrap:wrap;}
.sat-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:20px;
  font-size:11.5px;font-weight:600;cursor:pointer;border:1.5px solid transparent;}
.sat-chip.all{background:var(--line-soft);color:var(--muted);border-color:var(--line);}
.sat-chip.all.on{background:var(--ink);color:#fff;border-color:var(--ink);}
.sat-chip.vs{background:#FCE6E4;color:#b13b32;} .sat-chip.vs.on{border-color:#b13b32;}
.sat-chip.s{background:#FBF1D8;color:#9a7415;} .sat-chip.s.on{border-color:#9a7415;}
.sat-chip.sat{background:#E3F7EC;color:#1f8a57;} .sat-chip.sat.on{border-color:#1f8a57;}
.sat-chip.vsat{background:var(--accent-soft);color:var(--accent-deep);} .sat-chip.vsat.on{border-color:var(--accent-deep);}
.sat-chip.neu{background:var(--line-soft);color:var(--muted);} .sat-chip.neu.on{border-color:var(--muted);}
.fb-notion-btn{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:500;
  color:var(--muted);border:1px solid var(--line);border-radius:9px;padding:7px 13px;background:#fff;}
.fb-notion-btn:hover{color:var(--ink);border-color:#D4DAE4;}
.fb-card{background:#fff;border:1px solid var(--line);border-radius:16px;margin-bottom:14px;overflow:hidden;}
.fb-card-head{display:flex;align-items:center;gap:14px;padding:16px 20px;cursor:pointer;}
.fb-card-head:hover{background:var(--line-soft);}
.fb-card-head .sat-badge{flex:none;}
.fb-card-head .co{flex:1;}
.fb-card-head .co .title{font-size:14px;font-weight:600;font-family:var(--font-display);}
.fb-card-head .co .meta{font-size:11.5px;color:var(--muted2);margin-top:3px;display:flex;
  align-items:center;gap:8px;font-family:var(--font-mono);}
.fb-card-body{padding:0 20px 18px;border-top:1px solid var(--line-soft);}
.fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-top:16px;}
@media(max-width:640px){.fb-grid{grid-template-columns:1fr;}}
.fb-grid .k{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted2);margin-bottom:4px;}
.fb-grid .v{font-size:13px;color:var(--ink2);line-height:1.5;}
.fb-insights{margin-top:14px;padding:14px;background:var(--surface);border-radius:10px;
  border-left:3px solid var(--accent);font-size:13.5px;line-height:1.6;color:var(--ink2);}
.fb-ids{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.fb-id{font-family:var(--font-mono);font-size:11px;padding:3px 7px;background:var(--line-soft);
  border-radius:6px;color:var(--ink2);}
.fb-add{display:flex;align-items:center;gap:9px;padding:14px 18px;border:1.5px dashed var(--line);
  border-radius:14px;font-size:13px;color:var(--muted);cursor:pointer;margin-top:4px;}
.fb-add:hover{border-color:var(--accent);color:var(--accent-deep);background:var(--accent-soft);}
.sat-dot{width:9px;height:9px;border-radius:50%;flex:none;}
.fb-empty{text-align:center;padding:40px 20px;color:var(--muted2);}
.fb-empty h4{font-family:var(--font-display);font-size:16px;font-weight:600;color:var(--muted);margin:12px 0 6px;}
.fb-notion-banner{display:flex;align-items:center;gap:12px;background:#FAFAFA;border:1px solid var(--line);
  border-radius:12px;padding:13px 16px;margin-bottom:18px;font-size:12.5px;color:var(--muted);}
.fb-notion-banner .nb-title{font-weight:600;color:var(--ink);font-size:13px;}
.fb-notion-banner .nb-status{display:flex;align-items:center;gap:6px;margin-top:3px;}
.notion-dot{width:7px;height:7px;border-radius:50%;background:#888;}
.notion-dot.linked{background:var(--ok);}
.fb-notion-banner .connect-btn{margin-left:auto;display:inline-flex;align-items:center;gap:6px;
  background:var(--ink);color:#fff;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:500;white-space:nowrap;}
.fb-notion-banner .connect-btn:hover{background:#1B2433;}

/* ── Feature: per-section last-updated stamp ── */
.sec-stamp{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-family:var(--font-mono);
  color:var(--muted2);padding:3px 7px;background:var(--line-soft);border-radius:6px;}

/* ── Feature: last contact (HubSpot) in deal header ── */
.last-contact{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.13);border-radius:9px;padding:7px 12px;font-size:12px;
  color:#cfe0f0;margin-top:14px;flex-wrap:wrap;gap:14px;}
.last-contact .lc-item{display:flex;align-items:center;gap:6px;}
.last-contact .lc-dot{width:7px;height:7px;border-radius:50%;}
.lc-dot.warm{background:#2FB67A;} .lc-dot.cool{background:#E0B02B;} .lc-dot.cold{background:#E5564B;}
.last-contact .lc-label{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.1em;
  text-transform:uppercase;color:#7e93aa;margin-right:2px;}

/* ── Feature: capture / image progress log ── */
.clog-wrap{display:flex;flex-direction:column;gap:0;}
.clog-entry{display:flex;gap:14px;align-items:flex-start;padding:11px 0;
  border-bottom:1px solid var(--line-soft);}
.clog-entry:last-child{border-bottom:none;}
.clog-timeline{display:flex;flex-direction:column;align-items:center;gap:0;flex:none;padding-top:3px;}
.clog-dot{width:10px;height:10px;border-radius:50%;flex:none;}
.clog-line{width:2px;flex:1;background:var(--line);min-height:16px;margin-top:3px;}
.clog-status{font-size:10.5px;font-weight:700;font-family:var(--font-mono);padding:3px 8px;
  border-radius:6px;flex:none;text-transform:uppercase;letter-spacing:.06em;}
.cs-tasked{background:#E7F0FE;color:var(--se);}
.cs-captured{background:var(--accent-soft);color:var(--accent-deep);}
.cs-qcprog{background:#FBF1D8;color:#9a7415;}
.cs-qcpass{background:#E3F7EC;color:#1f8a57;}
.cs-qcfail{background:#FCE6E4;color:#b13b32;}
.cs-shared{background:#EDE8FE;color:var(--an);}
.clog-meta{font-size:11px;font-family:var(--font-mono);color:var(--muted2);margin-top:3px;}
.clog-note{font-size:13px;color:var(--ink2);line-height:1.5;margin-top:4px;}
.clog-reason{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;
  color:#b13b32;background:#FCE6E4;border-radius:6px;padding:2px 7px;margin-top:5px;}
.clog-add{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1.5px dashed var(--line);
  border-radius:11px;font-size:13px;color:var(--muted);cursor:pointer;margin-top:10px;}
.clog-add:hover{border-color:var(--accent);color:var(--accent-deep);background:var(--accent-soft);}
.clog-form{background:var(--surface);border-radius:12px;padding:16px;margin-top:10px;
  border:1px solid var(--line);}
.clog-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
@media(max-width:600px){.clog-form-row{grid-template-columns:1fr;}}

/* ── Feature: structured action plan ── */
.ap-tabs{display:flex;gap:4px;margin-bottom:16px;}
.ap-tab{padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:500;color:var(--muted);
  border:1px solid transparent;}
.ap-tab.on{background:#fff;border-color:var(--line);color:var(--ink);
  box-shadow:0 1px 3px rgba(11,18,32,.07);}
.ap-item{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:12px;
  margin-bottom:8px;border:1px solid var(--line);background:#fff;transition:.12s;}
.ap-item:hover{border-color:#D4DAE4;}
.ap-item.done-item{opacity:.55;}
.ap-check{width:20px;height:20px;border-radius:6px;border:2px solid var(--line);
  display:grid;place-items:center;cursor:pointer;flex:none;margin-top:1px;}
.ap-check.checked{background:var(--ok);border-color:var(--ok);}
.ap-item .ap-task{font-size:13.5px;flex:1;line-height:1.45;}
.ap-item .ap-task.done-text{text-decoration:line-through;color:var(--muted2);}
.ap-item .ap-meta{font-size:11px;font-family:var(--font-mono);color:var(--muted2);margin-top:4px;
  display:flex;gap:10px;flex-wrap:wrap;}
.ap-due.overdue{color:var(--bad);font-weight:600;}
.ap-due.thisweek{color:var(--warn);font-weight:600;}
.ap-add-row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
.ap-add-row input,.ap-add-row select{border:1px solid var(--line);border-radius:9px;
  padding:8px 12px;font-size:13px;font-family:inherit;outline:none;background:#fff;}
.ap-add-row input{flex:1;min-width:180px;}
.ap-add-row select{min-width:130px;}
.ap-add-row input[type=date]{min-width:140px;}
`;



/* ------------------------------------------------------------------ */
/*  Constants + mock data                                             */
/* ------------------------------------------------------------------ */
const STAGES = ["Discovery", "Technical Qualification", "Solution Validation", "Proposal", "Negotiation", "Closed Won"];
// ── Official Pixxel logo. Files live in /public so Vercel serves them at
//    these root paths. If a file is missing, the <img> onError handler
//    falls back to the text wordmark / falls back gracefully. ──
const PIXXEL_LOGO_URL = "/pixxel-logo-light.svg";  // dark-ink logo for the light top bar
const PIXXEL_LOGO_DARK = "/pixxel-logo-dark.svg";  // white logo for dark surfaces
const PASSPORT_LOGO = "/passport_light.png";       // sign-in screen logo

// ── Real Pixxel roster, grouped by team ──────────────────────
// Source: HubSpot users export (active only). Each person has a clean
// display name, email (matches HubSpot + Gmail), and Slack ID where known.
// "owner" = Sales Owner (the HubSpot deal owner). SE / CS / Analytics
// are assigned manually and only members of that team are pickable.
const TEAM_MEMBERS = {
  owner: [
    { name: "Alex Koh Hock Poh", email: "alex@pixxel.space", slack: "U08Q0722W82" },
    { name: "Allyson Jenkins", email: "allyson@pixxel.space", slack: "U085JVDKCMR" },
    { name: "Anjul Garg", email: "anjul@pixxel.co.in", slack: "U03DEGHSEM6" },
    { name: "Ashay Deo", email: "ashay@pixxel.co.in", slack: "U078BTL1TJT" },
    { name: "Awais Ahmed", email: "awais@pixxel.co.in", slack: null },
    { name: "Caio Miranda", email: "caio@pixxel.space", slack: "U0983ARJA5U" },
    { name: "Gp Capt Debashish Sengupta (Retd)", email: "debashish@pixxel.co.in", slack: "U06UHEYB65U" },
    { name: "Jimmy Greco", email: "jimmy@pixxel.space", slack: "U057D8LTT6K" },
    { name: "Karan Mali", email: "karan@pixxel.co.in", slack: "U07FE2KPZBR" },
    { name: "Markus Heynen", email: "markus@pixxel.space", slack: "U03MLS656U9" },
    { name: "Mauricio Meira", email: "mauricio@pixxel.space", slack: "U08NXMHA1NJ" },
    { name: "Ryan McKinney", email: "ryan.mckinney@pixxel.space", slack: "U0ACVKZ837T" },
    { name: "Shantanu Thada", email: "shantanu@pixxel.co.in", slack: "U05T154T9L5" },
    { name: "Shridutta Banerjee", email: "shridutta.banerjee@pixxel.co.in", slack: "U027F7R2EQ3" },
    { name: "Usha Simhadri", email: "usha@pixxel.co.in", slack: "U03EAV4FZSB" },
  ],
  se: [
    { name: "Amy Zammit", email: "amy@pixxel.space", slack: "U050FJYSEUU" },
    { name: "Megan Gallagher", email: "megan@pixxel.space", slack: "U056T9UE23V" },
    { name: "Rhodri Phillips", email: "rhodri@pixxel.space", slack: "U092KJ4AKPC" },
    { name: "Ryan Hammock", email: "ryan@pixxel.space", slack: "U057QQ2BA8J" },
    { name: "Spencer Wahrman", email: "spencer@pixxel.space", slack: "U07RWUTR22X" },
    { name: "Terence Yuchen Xie", email: "terence@pixxel.space", slack: "U0B8T6ZSL7N" },
  ],
  cs: [
    { name: "Aditya Chintalapati", email: "aditya@pixxel.co.in", slack: "U03MA603292" },
    { name: "Ananya Banerjee", email: "ananya.banerjee@pixxel.co.in", slack: "U0A3M8TLWVD" },
    { name: "Bandi Jay", email: "jaya.bandi@pixxel.co.in", slack: "U09UQH43Z5E" },
    { name: "Megha Devaraju", email: "megha@pixxel.co.in", slack: "U07N71LAVU0" },
    { name: "Meghana Shetty", email: "meghana.shetty@pixxel.co.in", slack: "U0A10SR26JX" },
    { name: "Shubhavi P", email: "shubhavi@pixxel.co.in", slack: "U053Z522G20" },
  ],
  analytics: [
    { name: "Jeremy Kravitz", email: "jeremy@pixxel.space", slack: "U064U233N2V" },
    { name: "Subash Yeggina", email: "subash@pixxel.co.in", slack: "U01TK168BKR" },
  ],
};

// Name-only arrays for dropdowns (role-restricted)
const TEAM = {
  owner: TEAM_MEMBERS.owner.map(p => p.name),
  se: TEAM_MEMBERS.se.map(p => p.name),
  cs: TEAM_MEMBERS.cs.map(p => p.name),
  analytics: TEAM_MEMBERS.analytics.map(p => p.name),
};

// Flat lookup: name -> {email, slack}, and email -> name (for HubSpot matching)
const PERSON_BY_NAME = {};
const NAME_BY_EMAIL = {};
Object.values(TEAM_MEMBERS).flat().forEach(p => {
  PERSON_BY_NAME[p.name] = p;
  if (p.email) NAME_BY_EMAIL[p.email.toLowerCase()] = p.name;
});

const ROLE_LABEL = { owner: "Sales Owner", se: "Sales Engineering", cs: "Customer Success", analytics: "Analytics" };
const ROLE_SHORT = { owner: "dir", se: "se", cs: "cs", analytics: "an" };
const ORDER = ["owner", "se", "cs", "analytics"];
const emailFor = (n) => PERSON_BY_NAME[n] ? PERSON_BY_NAME[n].email : "";
const slackFor = (n) => PERSON_BY_NAME[n] ? PERSON_BY_NAME[n].slack : null;
// kept for existing references
const SES = TEAM.se, CSS_OWN = TEAM.cs, ANS = TEAM.analytics;

/* ------------------------------------------------------------------ */
/*  Slack integration helpers                                         */
/* ------------------------------------------------------------------ */
// Real channels discovered from your Pixxel workspace
// Create these in Slack — the IDs below are placeholders until they exist;
// once created, paste the real channel IDs from Slack's channel settings.
const SLACK_CHANNELS = [
  { id: "C0BB1DC6LNB", name: "#customer-passport", label: "#customer-passport" },
];
const DEFAULT_CHANNEL = SLACK_CHANNELS[0];

// Sends a Slack message via the Anthropic API with the Slack MCP server.
// Returns { ok, error? }
async function sendToSlack(channelId, message) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "You are a Slack notification bot. When asked to send a Slack message, use the slack_send_message tool immediately with the channel_id and message provided. Do nothing else.",
        messages: [{
          role: "user",
          content: `Send this message to Slack channel_id="${channelId}":\n\n${message}`
        }],
        mcp_servers: [{ type: "url", url: "https://mcp.slack.com/mcp", name: "slack" }],
      }),
    });
    if (!res.ok) return { ok: false, error: `API error ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function fmtSlackAssignment(person, roleLabel, deal, score) {
  return `:satellite: *Pixxel Customer Passport — New Assignment*\n\n` +
    `*${person}* has been assigned as *${roleLabel}* on *${deal.company}*.\n\n` +
    `> *Deal:* ${deal.company} (${deal.id})\n` +
    `> *Stage:* ${STAGES[deal.stage]}\n` +
    `> *ACV:* ${deal.amount ? "$" + (deal.amount / 1000).toFixed(0) + "k" : "TBD"}\n` +
    `> *Handover readiness:* ${score}%\n\n` +
    `_Log in to the Customer Passport to view the full briefing._`;
}

function fmtSlackDealSummary(deal, score) {
  const o = deal.owners;
  return `:earth_americas: *Deal Update — ${deal.company}* (${deal.id})\n\n` +
    `*Stage:* ${STAGES[deal.stage]}   *ACV:* ${deal.amount ? "$" + (deal.amount / 1000).toFixed(0) + "k" : "TBD"}   *Readiness:* ${score}%\n\n` +
    `*Owners:*\n` +
    (o.owner ? `• Sales Owner: ${o.owner}\n` : "") +
    (o.se ? `• Sales Engineering: ${o.se}\n` : "") +
    (o.cs ? `• Customer Success: ${o.cs}\n` : "") +
    (o.analytics ? `• Analytics: ${o.analytics}\n` : "") +
    `\n_Posted from the Pixxel Customer Passport_`;
}

const initials = (n) => n ? n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "";

const DEALS = [
  {
    id: "PX-1042", company: "AgriSense Global", sector: "Precision Agriculture",
    stage: 2, amount: 480000, hubspotId: "HS-88412", lastActivity: "2 days ago",
    lastContact: { date: "14 Jun 2026", owner: "Ravi Menon", warmth: "warm", daysAgo: 4 },
    sectionStamps: {
      profile: { by: "Ravi Menon", at: "Jun 12 · 14:30" },
      context: { by: "Ravi Menon", at: "May 30 · 10:00" },
      execution: { by: "Priya Shah", at: "Jun 14 · 09:00" },
    },
    owners: { director: "Anita Desai", se: "Ravi Menon", cs: "Priya Shah", analytics: "Yuki Tanaka" },
    profile: {
      contacts: [
        { name: "Dr. Elena Voss", role: "VP Agronomy", email: "evoss@agrisense.io" },
        { name: "Caleb Ruiz", role: "Head of Data", email: "cruiz@agrisense.io" },
      ],
      team: "Mature data-science team (8 FTE), existing Sentinel-2 pipeline, Python/GEE proficient. Comfortable with reflectance products, new to hyperspectral indices.",
      useCase: "Field-level crop stress and nitrogen status mapping across managed farmland to drive variable-rate fertilizer prescriptions for enterprise growers.",
      painPoints: "Multispectral indices (NDVI) saturate at canopy closure and miss early nutrient stress. They need narrow-band sensitivity to catch problems 10–14 days earlier.",
      supportNeeds: "Spectral index cookbook, onboarding workshop for the data team, and API access for automated tasking.",
      tech: {
        dataSources: ["Hyperspectral (Firefly)", "Multispectral fusion"],
        bandset: "VNIR 400–1000nm, 5nm sampling (~120 bands)",
        cadence: "Weekly revisit, growing season (Apr–Sep)",
        aoiLink: true, feasibilityLink: true,
      },
    },
    context: {
      problem: "Existing NDVI-based prescriptions miss sub-clinical nitrogen and water stress until yield is already affected, costing an estimated 6–9% of potential output on high-value crops.",
      objectives: [
        "Detect nitrogen stress 10+ days before visible symptoms",
        "Deliver field-ready prescription maps within 48h of capture",
        "Validate against ground-truth tissue sampling on 12 pilot fields",
      ],
      aoi: { name: "Central Valley pilot block", center: "36.74°N, 119.77°W", area: "4,180 ha", poly: "18,72 30,40 52,30 74,44 80,68 60,82 34,86" },
    },
    execution: {
      successCriteria: [
        "≥ 0.8 correlation between spectral N-index and lab tissue analysis",
        "Stress detection lead time ≥ 10 days vs. NDVI baseline",
        "Data team can run the workflow unaided after onboarding",
      ],
      pocs: [
        { name: "Nitrogen index validation", status: "In progress", note: "3 of 12 fields captured" },
      ],
      sampleData: ["2 hyperspectral scenes delivered (Mar)", "Reflectance + N-index GeoTIFFs"],
      risks: [
        { sev: "med", text: "Cloud cover in target window may compress the weekly cadence." },
        { sev: "low", text: "Tissue-sampling schedule depends on grower availability." },
      ],
      nextSteps: "Complete remaining 9 field captures, run validation, then move to Proposal with a per-hectare subscription model and a 3-year framework.",
      commercial: "Annual subscription, per-hectare tiered. Est. ACV $480k expanding to $1.2M at full acreage.",
      captureLog: [
        { id:"cl1", date:"2026-05-30", status:"Tasked", failReason:"", note:"First capture window opened. Tasked over NV-3 block.", author:"Ravi Menon", ts:"May 30 · 09:10" },
        { id:"cl2", date:"2026-06-02", status:"QC Failed", failReason:"Cloud cover", note:"Scene unusable — >60% cloud cover over AOI. Re-task requested.", author:"Yuki Tanaka", ts:"Jun 02 · 11:45" },
        { id:"cl3", date:"2026-06-07", status:"Captured", failReason:"", note:"Clean scene acquired. Forwarded to QC pipeline.", author:"Yuki Tanaka", ts:"Jun 07 · 16:20" },
        { id:"cl4", date:"2026-06-09", status:"QC Passed", failReason:"", note:"LSF FWHM within spec. Geolocation shift <2px. Reflectance calibration validated.", author:"Yuki Tanaka", ts:"Jun 09 · 14:05" },
        { id:"cl5", date:"2026-06-10", status:"Shared", failReason:"", note:"N-index GeoTIFF delivered to AgriSense data team via secure link.", author:"Ravi Menon", ts:"Jun 10 · 10:30" },
        { id:"cl6", date:"2026-06-15", status:"QC Failed", failReason:"BBR", note:"Second scene failed BBR threshold on 3 bands. Escalated to imagery team.", author:"Yuki Tanaka", ts:"Jun 15 · 08:50" },
        { id:"cl7", date:"2026-06-17", status:"Captured", failReason:"", note:"Re-capture successful. In QC queue.", author:"Yuki Tanaka", ts:"Jun 17 · 17:00" },
      ],
      sampleAoi: { name: "Sample delivery area — field blocks A3–A7", center: "36.71°N, 119.74°W", area: "1,240 ha", poly: "22,44 38,32 58,38 62,56 46,68 28,62" },
      actionItems: [
        { id:"a1", task:"Send N-index derivation notebook to AgriSense data team", owner:"Ravi Menon", due:"2026-06-20", done:false },
        { id:"a2", task:"Schedule onboarding workshop — confirm date with Dr. Voss", owner:"Priya Shah", due:"2026-06-21", done:false },
        { id:"a3", task:"Chase AgriSense for ground-truth tissue samples from 3 pilot fields", owner:"Ravi Menon", due:"2026-06-25", done:false },
        { id:"a4", task:"Complete feasibility check for weekly revisit cadence Apr–Sep", owner:"Yuki Tanaka", due:"2026-06-18", done:true },
        { id:"a5", task:"Resolve BBR failure on Jun 15 scene — re-deliver by EOM", owner:"Yuki Tanaka", due:"2026-06-30", done:false },
      ],
    },
    notes: {
      meetings: [
        { date: "Jun 12", author: "Ravi Menon", text: "Workshop scoping call. Data team wants index recipes in a notebook, not a black box. Adjusting onboarding plan." },
        { date: "May 30", author: "Ravi Menon", text: "Technical validation kickoff. AOI confirmed, feasibility check passed for weekly revisit." },
      ],
      activity: [
        { date: "Jun 14 · 09:12", author: "Priya Shah", text: "Reviewed handover readiness — looks ready for CS shadowing once POC closes. @Ravi Menon can you add the onboarding deck?", mentions: ["Ravi Menon"] },
        { date: "Jun 12 · 16:40", author: "Ravi Menon", text: "Updated support needs after workshop call." },
        { date: "Jun 10 · 11:05", author: "Yuki Tanaka", text: "Assigned as Analytics owner." },
      ],
      attachments: [
        { name: "AgriSense_Feasibility_v2.pdf", type: "pdf", size: "1.4 MB" },
        { name: "N-index_validation_plan.xlsx", type: "sheet", size: "88 KB" },
      ],
    },
    feedback: [
      {
        id: "fb-1", date: "2026-06-05", type: "Client",
        satisfaction: "Satisfied",
        keyInsights: "Team impressed with VNIR index sensitivity vs. NDVI. Requested a worked notebook showing the N-index derivation so they can self-serve future analyses.",
        imageBandsets: ["VNIR 400–1000nm"],
        imageIds: ["FF03_20260605_00501045_00000812_L2A"],
        customerExpertise: "Expert",
        softwareUsed: "Python / GEE",
        followUpDate: "2026-06-19",
        followUpAssignedTo: "Priya Shah",
        supportingFiles: [],
        notionPageId: "",
      },
    ],
  },
  {
    id: "PX-1039", company: "Permian Methane Watch", sector: "Energy · Oil & Gas",
    stage: 1, amount: 720000, hubspotId: "HS-88207", lastActivity: "5 hours ago",
    lastContact: { date: "17 Jun 2026", owner: "Lena Hofer", warmth: "warm", daysAgo: 1 },
    sectionStamps: { profile: { by: "Lena Hofer", at: "Jun 16 · 15:00" }, context: { by: "Lena Hofer", at: "Jun 16 · 15:00" }, execution: { by: "Marcus Webb", at: "Jun 17 · 06:30" } },
    owners: { director: "Greg Powell", se: "Lena Hofer", cs: "Marcus Webb", analytics: null },
    profile: {
      contacts: [
        { name: "James Holloway", role: "Director, ESG & Emissions", email: "jholloway@permianmw.com" },
      ],
      team: "Small remote-sensing group (3 FTE) inside ESG function. Strong domain knowledge, limited hyperspectral experience.",
      useCase: "Detect, quantify and attribute methane plumes across upstream assets to meet OGMP 2.0 reporting and reduce fugitive emissions.",
      painPoints: "Current aerial surveys are infrequent and expensive; they miss intermittent leaks and can't cover the full asset footprint at the needed frequency.",
      supportNeeds: "Plume quantification methodology, regulatory-grade reporting outputs, alerting workflow.",
      tech: {
        dataSources: ["Hyperspectral (Firefly)", "SWIR methane bands"],
        bandset: "SWIR 2000–2400nm (CH4 absorption), targeted band subset",
        cadence: "Bi-weekly over priority assets",
        aoiLink: true, feasibilityLink: false,
      },
    },
    context: {
      problem: "Fugitive methane is both a climate liability and a regulatory exposure. Without frequent wide-area monitoring, leaks persist undetected between costly aerial campaigns.",
      objectives: [
        "Detect plumes down to a defined emission-rate threshold",
        "Provide source attribution to asset/equipment level",
        "Generate OGMP-aligned reporting outputs",
      ],
      aoi: { name: "Delaware Basin priority assets", center: "31.9°N, 103.5°W", area: "12,600 ha", poly: "14,30 46,18 82,26 86,58 64,80 28,74 10,52" },
    },
    execution: {
      successCriteria: [
        "Detection of controlled-release plumes in blind test",
        "False-positive rate within agreed tolerance",
      ],
      pocs: [
        { name: "Controlled-release blind test", status: "Scheduled", note: "Vendor comparison, Q3" },
      ],
      sampleData: ["1 SWIR demo scene (archive)"],
      risks: [
        { sev: "high", text: "Detection threshold vs. competitor airborne LIDAR is the key commercial battleground — must prove in blind test." },
        { sev: "med", text: "Feasibility check for SWIR cadence not yet linked." },
      ],
      nextSteps: "Link feasibility study, lock blind-test protocol with customer, and assign an Analytics owner before POC.",
      commercial: "",
      captureLog: [
        { id:"pcl1", date:"2026-06-10", status:"Tasked", failReason:"", note:"SWIR window opened over Delaware Basin priority assets.", author:"Lena Hofer", ts:"Jun 10 · 10:00" },
      ],
      sampleAoi: null,
      actionItems: [
        { id:"pa1", task:"Link feasibility study to passport", owner:"Lena Hofer", due:"2026-06-20", done:false },
        { id:"pa2", task:"Assign Analytics owner before POC scoping", owner:"Greg Powell", due:"2026-06-19", done:false },
      ],
    },
    notes: {
      meetings: [
        { date: "Jun 16", author: "Lena Hofer", text: "Customer wants a head-to-head blind test against their current airborne provider. High bar but winnable." },
      ],
      activity: [
        { date: "Jun 17 · 06:30", author: "Lena Hofer", text: "Flagged: still need an Analytics owner before the POC can be scoped." },
        { date: "Jun 16 · 15:20", author: "Marcus Webb", text: "Joined as CS owner — will sit in on blind-test planning." },
      ],
      attachments: [
        { name: "OGMP_reporting_requirements.pdf", type: "pdf", size: "640 KB" },
      ],
    },
    feedback: [],
  },
  {
    id: "PX-1051", company: "AquaClear Water District", sector: "Environmental · Water",
    stage: 5, amount: 310000, hubspotId: "HS-88599", lastActivity: "1 day ago",
    lastContact: { date: "16 Jun 2026", owner: "Dana Cole", warmth: "warm", daysAgo: 2 },
    sectionStamps: { profile: { by: "Tom Castellano", at: "Jun 09 · 17:00" }, context: { by: "Tom Castellano", at: "Jun 09 · 17:00" }, execution: { by: "Dana Cole", at: "Jun 16 · 10:00" } },
    owners: { director: "Anita Desai", se: "Tom Castellano", cs: "Dana Cole", analytics: "Sam Okoro" },
    profile: {
      contacts: [
        { name: "Maria Santos", role: "Water Quality Manager", email: "msantos@aquaclear.gov" },
        { name: "Derek Lin", role: "GIS Analyst", email: "dlin@aquaclear.gov" },
      ],
      team: "GIS team of 4, ArcGIS-based, no prior hyperspectral. Will need full onboarding and managed delivery.",
      useCase: "Monitor harmful algal blooms (HABs) and turbidity across reservoirs to protect drinking-water intake and trigger treatment responses early.",
      painPoints: "Manual water sampling is sparse and lagging; blooms are detected after they've already reached intake points.",
      supportNeeds: "Fully managed bloom-alert service, dashboard, integration with their incident workflow.",
      tech: {
        dataSources: ["Hyperspectral (Firefly)"],
        bandset: "VNIR with red-edge & phycocyanin bands (~620nm, 650nm)",
        cadence: "Twice weekly, year-round",
        aoiLink: true, feasibilityLink: true,
      },
    },
    context: {
      problem: "Algal blooms threaten drinking-water safety and are detected too late by manual sampling, forcing reactive and costly treatment.",
      objectives: [
        "Detect bloom onset across all 3 reservoirs",
        "Provide a turbidity & chlorophyll-a proxy product",
        "Deliver alerts into the district's incident system",
      ],
      aoi: { name: "Three-reservoir network", center: "44.05°N, 121.3°W", area: "2,240 ha", poly: "20,28 44,20 50,42 72,38 78,64 50,78 24,66 16,46" },
    },
    execution: {
      successCriteria: [
        "Bloom onset detected ≥ 5 days before manual sampling",
        "Alert delivered to incident system within 24h of capture",
        "GIS team adopts dashboard as primary monitoring tool",
      ],
      pocs: [
        { name: "Bloom detection pilot", status: "Complete", note: "Validated on 2024 bloom season archive" },
      ],
      sampleData: ["Full 2024 season reprocessed", "Chlorophyll-a proxy maps delivered"],
      risks: [
        { sev: "low", text: "Onboarding load on a small GIS team — phase the rollout." },
      ],
      nextSteps: "Contract signed. Begin CS-led onboarding, stand up the alert integration, and schedule the kickoff workshop.",
      commercial: "3-year managed-service agreement, $310k ACV. Renewal hinges on demonstrated alert reliability.",
      captureLog: [
        { id:"acl1", date:"2026-05-20", status:"Captured", failReason:"", note:"Full bloom-season archive reprocessed.", author:"Sam Okoro", ts:"May 20 · 14:00" },
        { id:"acl2", date:"2026-05-28", status:"QC Passed", failReason:"", note:"Chlorophyll-a proxy validated against manual samples.", author:"Sam Okoro", ts:"May 28 · 09:30" },
        { id:"acl3", date:"2026-06-02", status:"Shared", failReason:"", note:"Full 2024 season maps delivered to AquaClear GIS team.", author:"Dana Cole", ts:"Jun 02 · 11:00" },
      ],
      sampleAoi: { name: "Reservoir 2 sample delivery area", center: "44.02°N, 121.28°W", area: "680 ha", poly: "30,35 50,28 62,45 55,62 36,58" },
      actionItems: [
        { id:"aa1", task:"Stand up bloom-alert integration with district incident system", owner:"Sam Okoro", due:"2026-06-28", done:false },
        { id:"aa2", task:"Schedule kickoff onboarding workshop with GIS team", owner:"Dana Cole", due:"2026-06-22", done:false },
        { id:"aa3", task:"Chase AquaClear for incident system API credentials", owner:"Dana Cole", due:"2026-06-24", done:false },
      ],
    },
    notes: {
      meetings: [
        { date: "Jun 9", author: "Tom Castellano", text: "Closed won! Handover to Dana for onboarding. POC results were the deciding factor." },
      ],
      activity: [
        { date: "Jun 16 · 10:00", author: "Dana Cole", text: "Onboarding plan drafted. @Sam Okoro let's align on the alert-integration spec this week.", mentions: ["Sam Okoro"] },
        { date: "Jun 09 · 17:30", author: "Tom Castellano", text: "Moved deal to Closed Won. Handover initiated." },
      ],
      attachments: [
        { name: "AquaClear_POC_results.pdf", type: "pdf", size: "2.1 MB" },
        { name: "Onboarding_plan.docx", type: "doc", size: "120 KB" },
      ],
    },
    feedback: [
      {
        id: "fb-2", date: "2026-06-10", type: "Client",
        satisfaction: "Very Satisfied",
        keyInsights: "Bloom detection exceeded expectations — alert lead time was 7 days ahead of manual sampling. GIS team appreciated the ArcGIS-compatible outputs. Requested a higher revisit frequency during peak summer bloom season.",
        imageBandsets: ["VNIR red-edge", "Phycocyanin 620nm"],
        imageIds: ["FF01_20260608_00501045_00010124_L2A", "FF01_20260610_00501045_00010985_L2A"],
        customerExpertise: "Intermediate",
        softwareUsed: "ArcGIS Pro",
        followUpDate: "2026-06-24",
        followUpAssignedTo: "Dana Cole",
        supportingFiles: ["AquaClear_POC_results.pdf"],
        notionPageId: "",
      },
      {
        id: "fb-3", date: "2026-05-15", type: "Client",
        satisfaction: "Satisfied",
        keyInsights: "Mid-POC check-in. Data delivery workflow smooth. Some confusion around L2A vs. reflectance products — needs a short technical brief for the GIS team.",
        imageBandsets: ["VNIR 400–750nm"],
        imageIds: ["FF01_20260514_00501045_00009812_L2A"],
        customerExpertise: "Intermediate",
        softwareUsed: "ArcGIS Pro",
        followUpDate: "2026-05-22",
        followUpAssignedTo: "Tom Castellano",
        supportingFiles: [],
        notionPageId: "",
      },
    ],
  },
  {
    id: "PX-1047", company: "NorthVein Minerals", sector: "Mining · Exploration",
    stage: 3, amount: 560000, hubspotId: "HS-88471", lastActivity: "3 days ago",
    lastContact: { date: "11 Jun 2026", owner: "Ravi Menon", warmth: "cool", daysAgo: 7 },
    sectionStamps: { profile: { by: "Ravi Menon", at: "Jun 11 · 14:00" }, context: { by: "Ravi Menon", at: "Jun 11 · 14:00" }, execution: { by: "Elise Berg", at: "Jun 11 · 14:05" } },
    owners: { director: "Sofia Marchetti", se: "Ravi Menon", cs: null, analytics: "Elise Berg" },
    profile: {
      contacts: [
        { name: "Anja Kowalski", role: "Chief Geologist", email: "akowalski@northvein.com" },
      ],
      team: "Exploration geology team, strong on spectral mineralogy concepts, uses ENVI.",
      useCase: "Map alteration mineralogy over greenfield licence areas to prioritise drill targets and de-risk exploration spend.",
      painPoints: "Ground surveys are slow and expensive over remote terrain; they want to narrow drill targets before mobilising crews.",
      supportNeeds: "Mineral mapping deliverables, integration with their ENVI workflow.",
      tech: {
        dataSources: ["Hyperspectral (Firefly)", "SWIR mineralogy"],
        bandset: "VNIR–SWIR 400–2500nm, full spectrum",
        cadence: "One-time campaign + targeted re-fly",
        aoiLink: true, feasibilityLink: false,
      },
    },
    context: {
      problem: "",
      objectives: [
        "Produce alteration-mineral maps over 3 licence blocks",
        "Identify and rank candidate drill targets",
      ],
      aoi: { name: "Licence block NV-3", center: "23.4°S, 119.7°E", area: "8,900 ha", poly: "22,24 56,16 84,32 78,62 50,80 22,70 12,46" },
    },
    execution: {
      successCriteria: [],
      pocs: [],
      sampleData: ["1 archive SWIR scene shared"],
      risks: [
        { sev: "med", text: "No CS owner assigned yet; commercial pathway undefined." },
      ],
      nextSteps: "Build proposal once feasibility and success criteria are defined. Assign CS owner.",
      commercial: "",
      captureLog: [
        { id:"ncl1", date:"2026-06-11", status:"Tasked", failReason:"", note:"SWIR capture tasked over NV-3 licence block pending fresh scene approval.", author:"Elise Berg", ts:"Jun 11 · 14:30" },
      ],
      sampleAoi: null,
      actionItems: [
        { id:"na1", task:"Define success criteria with Anja Kowalski before next call", owner:"Ravi Menon", due:"2026-06-24", done:false },
        { id:"na2", task:"Assign CS owner to unblock commercial pathway", owner:"Sofia Marchetti", due:"2026-06-19", done:false },
      ],
    },
    notes: {
      meetings: [
        { date: "Jun 11", author: "Ravi Menon", text: "Promising fit — geology team already thinks in spectral terms. Need to firm up success criteria before proposal." },
      ],
      activity: [
        { date: "Jun 11 · 14:00", author: "Elise Berg", text: "Assigned as Analytics owner." },
      ],
      attachments: [],
    },
    feedback: [
      {
        id: "fb-4", date: "2026-06-11", type: "Client",
        satisfaction: "Neutral",
        keyInsights: "Geology team can see the spectral differentiation potential for clay mineralogy but want to see real SWIR data over their licence block before committing. Archive scene insufficient — needs a fresh capture over NV-3.",
        imageBandsets: ["SWIR 2000–2400nm"],
        imageIds: ["FF03_20260411_00501045_00008812_L2A (archive)"],
        customerExpertise: "Expert",
        softwareUsed: "ENVI Classic",
        followUpDate: "2026-06-25",
        followUpAssignedTo: "Ravi Menon",
        supportingFiles: [],
        notionPageId: "",
      },
    ],
  },
  {
    id: "PX-1044", company: "Sentinel Defense Solutions", sector: "Defense · Intelligence",
    stage: 4, amount: 1250000, hubspotId: "HS-88333", lastActivity: "6 days ago",
    lastContact: { date: "06 Jun 2026", owner: "Lena Hofer", warmth: "cool", daysAgo: 12 },
    sectionStamps: { profile: { by: "Lena Hofer", at: "Jun 06 · 12:00" }, context: { by: "Lena Hofer", at: "Jun 06 · 12:00" }, execution: { by: "Marcus Webb", at: "Jun 06 · 12:05" } },
    owners: { director: "Greg Powell", se: "Lena Hofer", cs: "Marcus Webb", analytics: "Yuki Tanaka" },
    profile: {
      contacts: [
        { name: "Col. (Ret.) David Pearce", role: "Program Lead", email: "dpearce@sentinel-ds.com" },
      ],
      team: "Cleared geospatial analysts. Detailed requirements, procurement-heavy process.",
      useCase: "Wide-area change detection and material identification for monitoring activity in areas of strategic interest.",
      painPoints: "",
      supportNeeds: "Secure delivery, tasking flexibility, change-detection products.",
      tech: {
        dataSources: ["Hyperspectral (Firefly)"],
        bandset: "Full VNIR–SWIR, change-detection product",
        cadence: "On-demand tasking, priority queue",
        aoiLink: false, feasibilityLink: true,
      },
    },
    context: {
      problem: "Persistent monitoring of strategic areas requires frequent, taskable wide-area coverage that current assets can't sustain affordably.",
      objectives: [],
      aoi: null,
    },
    execution: {
      successCriteria: [
        "Tasking turnaround within agreed SLA",
        "Change-detection accuracy meets program threshold",
      ],
      pocs: [
        { name: "Change-detection demo", status: "Complete", note: "Passed technical evaluation" },
      ],
      sampleData: ["Classified demo (details restricted)"],
      risks: [
        { sev: "high", text: "Long procurement cycle and security review may slip timeline by a quarter." },
        { sev: "med", text: "AOI not yet linked in passport (handling separately due to sensitivity)." },
      ],
      nextSteps: "In contract negotiation. Finalise SLA terms and security annex.",
      commercial: "Multi-year framework, $1.25M ACV. Negotiating tasking-volume tiers.",
      captureLog: [
        { id:"scl1", date:"2026-05-15", status:"Captured", failReason:"", note:"Demo scene acquired. Details restricted.", author:"Lena Hofer", ts:"May 15 · 09:00" },
        { id:"scl2", date:"2026-05-20", status:"QC Passed", failReason:"", note:"Internal QC passed. Demo delivered via secure channel.", author:"Yuki Tanaka", ts:"May 20 · 11:00" },
        { id:"scl3", date:"2026-05-22", status:"Shared", failReason:"", note:"Shared with program evaluation team.", author:"Lena Hofer", ts:"May 22 · 14:00" },
      ],
      sampleAoi: null,
      actionItems: [
        { id:"sa1", task:"Finalise SLA tasking-priority tiers with program lead", owner:"Lena Hofer", due:"2026-06-25", done:false },
        { id:"sa2", task:"Legal review of security annex", owner:"Marcus Webb", due:"2026-06-30", done:false },
      ],
    },
    notes: {
      meetings: [
        { date: "Jun 6", author: "Lena Hofer", text: "Negotiation focused on SLA and tasking priority. Technical eval already passed." },
      ],
      activity: [
        { date: "Jun 06 · 12:00", author: "Marcus Webb", text: "Reviewing security annex requirements for handover readiness." },
      ],
      attachments: [
        { name: "Change_detection_eval.pdf", type: "pdf", size: "3.0 MB" },
      ],
    },
    feedback: [
      {
        id: "fb-5", date: "2026-06-06", type: "Client",
        satisfaction: "Very Satisfied",
        keyInsights: "Technical evaluation passed. Change-detection product met all accuracy thresholds. Program lead specifically noted the tasking-responsiveness as a differentiator vs. current providers.",
        imageBandsets: ["Full VNIR–SWIR"],
        imageIds: ["RESTRICTED"],
        customerExpertise: "Expert",
        softwareUsed: "Classified",
        followUpDate: "2026-06-20",
        followUpAssignedTo: "Marcus Webb",
        supportingFiles: ["Change_detection_eval.pdf"],
        notionPageId: "",
      },
    ],
  },
  {
    id: "PX-1053", company: "Cerrado Forest Authority", sector: "Environmental · Forestry",
    stage: 0, amount: 0, hubspotId: "HS-88640", lastActivity: "4 days ago",
    lastContact: { date: "13 Jun 2026", owner: "Tom Castellano", warmth: "cold", daysAgo: 5 },
    sectionStamps: { profile: { by: "Tom Castellano", at: "Jun 13 · 09:00" }, context: {}, execution: {} },
    owners: { director: null, se: "Tom Castellano", cs: null, analytics: null },
    profile: {
      contacts: [
        { name: "Bruno Almeida", role: "Conservation Lead", email: "balmeida@cerrado.org.br" },
      ],
      team: "",
      useCase: "Monitor land-use change and degradation across protected savanna for enforcement and reporting.",
      painPoints: "",
      supportNeeds: "",
      tech: { dataSources: [], bandset: "", cadence: "", aoiLink: false, feasibilityLink: false },
    },
    context: {
      problem: "",
      objectives: [],
      aoi: null,
    },
    execution: { successCriteria: [], pocs: [], sampleData: [], risks: [], nextSteps: "", commercial: "", captureLog: [], sampleAoi: null, actionItems: [] },
    notes: {
      meetings: [
        { date: "Jun 13", author: "Tom Castellano", text: "Intro call. Early days — exploring whether hyperspectral adds value over their current optical monitoring." },
      ],
      activity: [
        { date: "Jun 13 · 09:00", author: "Tom Castellano", text: "Created passport after discovery call." },
      ],
      attachments: [],
    },
    feedback: [],
  },
];

/* ------------------------------------------------------------------ */
/*  Readiness scoring                                                 */
/* ------------------------------------------------------------------ */
function readiness(d) {
  const items = [
    { label: "Key contacts", done: d.profile.contacts.length > 0 },
    { label: "Use case", done: !!d.profile.useCase },
    { label: "Pain points", done: !!d.profile.painPoints },
    { label: "Data sources", done: d.profile.tech.dataSources.length > 0 },
    { label: "Bandset", done: !!d.profile.tech.bandset },
    { label: "Cadence", done: !!d.profile.tech.cadence },
    { label: "AOI defined", done: !!(d.context.aoi && d.context.aoi.poly) },
    { label: "Problem statement", done: !!d.context.problem },
    { label: "Objectives", done: d.context.objectives.length > 0 },
    { label: "Success criteria", done: d.execution.successCriteria.length > 0 },
    { label: "Next steps", done: !!d.execution.nextSteps },
    { label: "All owners assigned", done: !!(d.owners.se && d.owners.cs && d.owners.analytics) },
  ];
  const score = Math.round((items.filter(i => i.done).length / items.length) * 100);
  return { score, items };
}

/* ------------------------------------------------------------------ */
/*  Small components                                                  */
/* ------------------------------------------------------------------ */
function Ring({ value, size = 56, stroke = 6, showVal = true }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  const id = "rg" + Math.round(value) + size;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6D5DF6" />
            <stop offset="35%" stopColor="#0EA5B7" />
            <stop offset="70%" stopColor="#2FB67A" />
            <stop offset="100%" stopColor="#E0B02B" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F6" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      {showVal && <span className="ring-val" style={{ fontSize: size * 0.26, color: "var(--ink)" }}>{value}</span>}
    </div>
  );
}

function OwnerAvatar({ name, role }) {
  if (!name) return <div className={`av empty`} title={`${role} — unassigned`}>+</div>;
  return <div className={`av ${role}`} title={`${role.toUpperCase()}: ${name}`}>{initials(name)}</div>;
}

function StageChip({ stage }) {
  if (stage === 5) return <span className="chip won"><CheckCircle2 size={12} />Closed Won</span>;
  if (stage <= 1) return <span className="chip early">{STAGES[stage]}</span>;
  return <span className="chip live">{STAGES[stage]}</span>;
}

function fmt(n) {
  if (!n) return "—";
  return "$" + (n / 1000).toFixed(0) + "k";
}

// ── Real GeoJSON renderer (SVG, self-contained, no tiles) ─────
function geoJsonBounds(gj) {
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  const walk = (coords) => {
    if (typeof coords[0] === "number") {
      const [x,y] = coords;
      if (x<minX)minX=x; if (x>maxX)maxX=x; if (y<minY)minY=y; if (y>maxY)maxY=y;
    } else coords.forEach(walk);
  };
  const feats = gj.type === "FeatureCollection" ? gj.features : [gj];
  feats.forEach(f => { const g = f.geometry || f; if (g && g.coordinates) walk(g.coordinates); });
  return { minX, minY, maxX, maxY };
}

function geoJsonToSvgPaths(gj, b, W=100, H=100) {
  const pad = 6;
  const spanX = (b.maxX - b.minX) || 0.001;
  const spanY = (b.maxY - b.minY) || 0.001;
  const scale = Math.min((W - pad*2)/spanX, (H - pad*2)/spanY);
  const offX = (W - spanX*scale)/2;
  const offY = (H - spanY*scale)/2;
  const proj = ([x,y]) => [offX + (x - b.minX)*scale, H - (offY + (y - b.minY)*scale)];
  const paths = [];
  const ring2path = (ring) => "M" + ring.map(c => { const [px,py] = proj(c); return `${px.toFixed(2)},${py.toFixed(2)}`; }).join(" L") + "Z";
  const handleGeom = (g) => {
    if (!g) return;
    if (g.type === "Polygon") g.coordinates.forEach(r => paths.push(ring2path(r)));
    else if (g.type === "MultiPolygon") g.coordinates.forEach(poly => poly.forEach(r => paths.push(ring2path(r))));
    else if (g.type === "LineString") paths.push("M" + g.coordinates.map(c => { const [px,py]=proj(c); return `${px.toFixed(2)},${py.toFixed(2)}`; }).join(" L"));
    else if (g.type === "Point") { const [px,py]=proj(g.coordinates); paths.push(`M${px},${py} m-1.4,0 a1.4,1.4 0 1,0 2.8,0 a1.4,1.4 0 1,0 -2.8,0`); }
  };
  const feats = gj.type === "FeatureCollection" ? gj.features : [gj];
  feats.forEach(f => handleGeom(f.geometry || f));
  return paths;
}

function GeoJsonMap({ geojson, overlay, onClear, canEdit }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [meta, setMeta] = useState({ features: 0, center: "" });
  const [renderError, setRenderError] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Heal AOIs stored before the projection fix: reproject to lat/lng on display.
  const healed = useMemo(() => {
    if (!geojson) return { gj: null, err: "" };
    try { return { gj: normalizeGeoJson(geojson), err: "" }; }
    catch (e) { return { gj: null, err: e.message || "Unrecognised coordinate system." }; }
  }, [geojson]);

  // Optional read-only overlay (e.g. parsed AOI files) drawn alongside the base.
  const healedOverlay = useMemo(() => {
    if (!overlay) return null;
    try { return normalizeGeoJson(overlay); }
    catch (e) { return null; }
  }, [overlay]);

  // Fit the map to whichever layers currently exist (base + overlay).
  const fitToLayers = (map) => {
    const ls = [map._aoiLayer, map._overlayLayer].filter(Boolean);
    if (!ls.length) return;
    let bounds = ls[0].getBounds();
    for (let i = 1; i < ls.length; i++) bounds = bounds.extend(ls[i].getBounds());
    if (!bounds.isValid()) return;
    let attempts = 0;
    const tryFit = () => {
      attempts++;
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
      if (attempts < 4) setTimeout(tryFit, 150 * attempts);
    };
    tryFit();
  };

  useEffect(() => {
    if (!containerRef.current) return;
    setRenderError(false); setErrMsg("");
    if (healed.err) { setRenderError(true); setErrMsg(healed.err); return; }
    // Nothing to draw and no overlay → keep the original empty behaviour.
    if (!healed.gj && !healedOverlay) return;
    // Init map once (basemap renders as soon as there's something to show).
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true, attributionControl: false, scrollWheelZoom: false,
      }).setView([20, 0], 2);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19, subdomains: "abcd",
      }).addTo(mapRef.current);
    }
    const map = mapRef.current;
    // Clear previous layers
    if (map._aoiLayer) { map.removeLayer(map._aoiLayer); map._aoiLayer = null; }
    if (map._overlayLayer) { map.removeLayer(map._overlayLayer); map._overlayLayer = null; }
    try {
      let feats = 0;
      if (healed.gj) {
        const layer = L.geoJSON(healed.gj, {
          style: { color: "#0B7E8C", weight: 2.5, fillColor: "#0EA5B7", fillOpacity: 0.35 },
          pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 5, color: "#0B7E8C", fillColor: "#0EA5B7", fillOpacity: 0.8 }),
        });
        layer.addTo(map); map._aoiLayer = layer;
        feats += healed.gj.type === "FeatureCollection" ? healed.gj.features.length : 1;
      }
      if (healedOverlay) {
        const olayer = L.geoJSON(healedOverlay, {
          style: { color: "#7B2FBE", weight: 2, fillColor: "#9d5be0", fillOpacity: 0.22, dashArray: "5 3" },
          pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 5, color: "#7B2FBE", fillColor: "#9d5be0", fillOpacity: 0.85 }),
        });
        olayer.addTo(map); map._overlayLayer = olayer;
        feats += healedOverlay.type === "FeatureCollection" ? healedOverlay.features.length : 1;
      }
      // The container can report 0×0 if it was hidden (e.g. behind an inactive
      // tab) when the map initialized. fitToLayers retries invalidateSize +
      // fitBounds a few times so the AOI reliably ends up framed correctly.
      const drawn = [map._aoiLayer, map._overlayLayer].filter(Boolean);
      if (drawn.length) {
        let bounds = drawn[0].getBounds();
        for (let i = 1; i < drawn.length; i++) bounds = bounds.extend(drawn[i].getBounds());
        if (bounds.isValid()) {
          const c = bounds.getCenter();
          setMeta({ features: feats, center: `${c.lat.toFixed(3)}°, ${c.lng.toFixed(3)}°` });
          fitToLayers(map);
        } else {
          setRenderError(true);
        }
      }
    } catch (e) {
      console.error("AOI render error", e);
      setRenderError(true);
    }
  }, [healed, healedOverlay]);

  // Re-fit whenever the container is resized (e.g. tab becomes visible,
  // window resizes) rather than only once on mount.
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) { mapRef.current.invalidateSize(); fitToLayers(mapRef.current); }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Clean up on unmount
  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  const downloadAoi = () => {
    // Export base + overlay merged (all AOIs) as one WGS84 GeoJSON.
    const base = healed.gj || geojson;
    const out = (base && healedOverlay) ? mergeGeoJson(base, healedOverlay) : (base || healedOverlay);
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aoi.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
      <div ref={containerRef} style={{ height: 300, width: "100%", background: "#e8eef2" }} />
      {renderError && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(232,238,242,0.92)", flexDirection:"column", gap:6, color:"var(--muted)", fontSize:12.5, textAlign:"center", padding:16 }}>
          <AlertTriangle size={18} color="var(--warn)" />
          {errMsg || "Couldn't render this AOI's geometry. The file may have an unexpected coordinate format — try re-uploading, or download the raw data below to check it."}
        </div>
      )}
      <div style={{ position:"absolute", bottom:8, left:8, zIndex:500, background:"rgba(11,18,32,0.78)", color:"#cdd6e3", fontSize:11, padding:"4px 9px", borderRadius:6, fontFamily:"var(--font-mono)", pointerEvents:"none" }}>
        {meta.features} feature{meta.features !== 1 ? "s" : ""} · ◎ {meta.center}
      </div>
      <div style={{ position:"absolute", top:8, right:8, zIndex:500, display:"flex", gap:6 }}>
        <button onClick={downloadAoi} title="Download this AOI as GeoJSON"
          style={{ background:"rgba(11,18,32,0.78)", border:"none", borderRadius:6, color:"#fff", padding:"5px 9px", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
          <Download size={11} /> Download
        </button>
        {canEdit && onClear && (
          <button onClick={onClear} title="Remove AOI"
            style={{ background:"rgba(11,18,32,0.78)", border:"none", borderRadius:6, color:"#fff", padding:"5px 9px", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
            <Trash2 size={11} /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

/* ── AOI coordinate normalization ─────────────────────────────────
   Leaflet expects WGS84 lat/lng. Files exported from GIS tools often
   arrive in a projected CRS (UTM, Web Mercator, national grids) whose
   coordinates are metres, not degrees — they plot off the edge of the
   world. These helpers detect that and reproject to WGS84, both on
   upload and on display (so already-stored broken AOIs heal themselves). */

// proj4 strings for common projected systems seen in customer files.
const COMMON_PROJ_DEFS = {
  "EPSG:3857": "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs",
  "EPSG:900913": "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs",
  "EPSG:102100": "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs",
  "EPSG:31287": "+proj=lcc +lat_0=47.5 +lon_0=13.33333333333333 +lat_1=49 +lat_2=46 +x_0=400000 +y_0=400000 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs", // MGI / Austria Lambert
  "EPSG:25832": "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs", // ETRS89 / UTM 32N
  "EPSG:25833": "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs", // ETRS89 / UTM 33N
  "EPSG:2154":  "+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs", // RGF93 / Lambert-93 (France)
  "EPSG:27700": "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs", // OSGB (UK)
};

// Extract an EPSG-style code from a GeoJSON `crs` member (legacy but common).
// Handles "EPSG:32633", "urn:ogc:def:crs:EPSG::32633", "urn:ogc:def:crs:OGC:1.3:CRS84".
function crsCodeOf(gj) {
  const name = gj && gj.crs && gj.crs.properties && gj.crs.properties.name;
  if (!name) return null;
  if (/CRS84/i.test(name)) return "EPSG:4326";
  const m = String(name).match(/EPSG[:\s]*:?[:\s]*(\d+)/i);
  return m ? "EPSG:" + m[1] : null;
}

// proj4 definition string for a CRS code, or null if already geographic,
// or undefined if we don't know this code.
function projDefFor(code) {
  if (!code) return undefined;
  if (code === "EPSG:4326") return null; // already lat/lng
  if (COMMON_PROJ_DEFS[code]) return COMMON_PROJ_DEFS[code];
  const m = code.match(/^EPSG:32([67])(\d\d)$/); // WGS84 UTM zones 326xx N / 327xx S
  if (m) {
    const south = m[1] === "7" ? " +south" : "";
    return `+proj=utm +zone=${parseInt(m[2], 10)}${south} +datum=WGS84 +units=m +no_defs`;
  }
  return undefined;
}

// Do all coordinates already look like lat/lng degrees?
function coordsLookGeographic(gj) {
  let ok = true;
  const walk = (c) => {
    if (!ok || !c) return;
    if (typeof c[0] === "number") { if (Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) ok = false; }
    else c.forEach(walk);
  };
  const feats = gj.type === "FeatureCollection" ? (gj.features || []) : [gj];
  feats.forEach(f => { const g = f.geometry || f; if (g && g.coordinates) walk(g.coordinates); });
  return ok;
}

// Conservative guess when coords are projected but the file declares no CRS.
// Only guesses Web Mercator when values clearly exceed what UTM produces;
// anything ambiguous (e.g. bare UTM with unknown zone) returns undefined.
function guessProjDef(gj) {
  let maxAbsX = 0, minY = Infinity, maxAbsY = 0;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      maxAbsX = Math.max(maxAbsX, Math.abs(c[0]));
      maxAbsY = Math.max(maxAbsY, Math.abs(c[1]));
      minY = Math.min(minY, c[1]);
    } else c.forEach(walk);
  };
  const feats = gj.type === "FeatureCollection" ? (gj.features || []) : [gj];
  feats.forEach(f => { const g = f.geometry || f; if (g && g.coordinates) walk(g.coordinates); });
  const inWebMercator = maxAbsX <= 20037508.35 && maxAbsY <= 20048966.11;
  // UTM eastings stay under ~900,000 and northings are never negative —
  // so a big |x| or a negative y can only sensibly be Web Mercator.
  if (inWebMercator && (maxAbsX > 950000 || minY < 0)) return COMMON_PROJ_DEFS["EPSG:3857"];
  return undefined;
}

// Apply fn to every coordinate pair in a (deep-cloned) GeoJSON value.
function mapGeoJsonCoords(gj, fn) {
  const clone = JSON.parse(JSON.stringify(gj));
  const walk = (c) => (typeof c[0] === "number") ? fn(c) : c.map(walk);
  const feats = clone.type === "FeatureCollection" ? (clone.features || []) : [clone];
  feats.forEach(f => { const g = f.geometry || f; if (g && g.coordinates) g.coordinates = walk(g.coordinates); });
  delete clone.crs; // it's WGS84 now
  return clone;
}

// Normalize any GeoJSON to WGS84 lat/lng. Returns the input untouched when
// it's already geographic; throws with a human-readable message when the
// projection can't be determined safely.
function normalizeGeoJson(gj) {
  if (!gj || typeof gj !== "object") return gj;
  if (coordsLookGeographic(gj)) return gj;
  const code = crsCodeOf(gj);
  let def = projDefFor(code);
  if (def === null) {
    // Declared geographic but coords out of range — corrupt file
    throw new Error("File claims lat/lng but coordinates are out of range. Re-export it as WGS84 GeoJSON.");
  }
  if (def === undefined) def = guessProjDef(gj);
  if (!def) {
    throw new Error(
      (code ? `Unsupported CRS ${code}. ` : "Coordinates are projected (metres) but the file declares no CRS. ") +
      "Re-export as WGS84 (EPSG:4326) GeoJSON, or upload the zipped Shapefile — its .prj lets us convert automatically."
    );
  }
  const t = proj4(def, proj4.WGS84);
  return mapGeoJsonCoords(gj, ([x, y]) => {
    const [lng, lat] = t.forward([x, y]);
    return [lng, lat];
  });
}

// Parse an uploaded AOI file (GeoJSON / KML / KMZ / zipped Shapefile) → GeoJSON
async function parseAoiFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".geojson") || name.endsWith(".json")) {
    const text = await file.text();
    return JSON.parse(text);
  }
  if (name.endsWith(".kml")) {
    const text = await file.text();
    const dom = new DOMParser().parseFromString(text, "text/xml");
    return kmlToGeoJson(dom);
  }
  if (name.endsWith(".zip")) {
    // Shapefile (zipped) — shpjs handles the arraybuffer
    const buf = await file.arrayBuffer();
    return await shp(buf);
  }
  if (name.endsWith(".kmz")) {
    throw new Error("KMZ: please unzip and upload the .kml inside, or upload as GeoJSON.");
  }
  throw new Error("Unsupported file. Use GeoJSON, KML, or a zipped Shapefile.");
}

// Normalize any GeoJSON value (Feature, FeatureCollection, or bare geometry) into a Feature[] array
function toFeatures(gj) {
  if (!gj) return [];
  if (gj.type === "FeatureCollection") return gj.features || [];
  if (gj.type === "Feature") return [gj];
  if (gj.coordinates) return [{ type: "Feature", properties: {}, geometry: gj }];
  return [];
}

// Combine two GeoJSON values into one FeatureCollection (for multi-AOI maps)
function mergeGeoJson(existing, added) {
  return { type: "FeatureCollection", features: [...toFeatures(existing), ...toFeatures(added)] };
}

function AoiUploader({ aoi, canEdit, which, onSetAoi, multi, overlay }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputId = `aoi-up-${which}-${Math.random().toString(36).slice(2,7)}`;

  // aoi may be the new GeoJSON (object) or the legacy {poly,...} shape
  const isGeoJson = aoi && (aoi.type === "FeatureCollection" || aoi.type === "Feature" || aoi.type === "Polygon" || aoi.type === "MultiPolygon");
  const count = isGeoJson ? toFeatures(aoi).length : 0;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const parsed = await parseAoiFile(file);
      if (!parsed || (!parsed.features && !parsed.coordinates)) throw new Error("No geometry found in file.");
      // Reproject to WGS84 lat/lng if the file arrived in a projected CRS
      const gj = normalizeGeoJson(parsed);
      // In multi mode, append to what's already mapped instead of replacing it
      await onSetAoi(multi && isGeoJson ? mergeGeoJson(normalizeGeoJson(aoi), gj) : gj);
    } catch (ex) {
      setErr(ex.message || "Failed to parse file");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  // Legacy mock {poly} shape → keep the old SVG renderer
  if (aoi && aoi.poly && !isGeoJson) return <AoiMap aoi={aoi} />;

  // Always render the basemap. Show the upload control when there's no AOI yet,
  // and also keep it visible in multi mode so more AOI files can be added.
  const showUpload = canEdit && (!isGeoJson || multi);
  return (
    <div style={{ position:"relative" }}>
      <GeoJsonMap geojson={isGeoJson ? aoi : null} overlay={overlay} canEdit={canEdit}
        onClear={isGeoJson ? () => onSetAoi(null) : null} />
      {showUpload && (
        <div style={{ position:"absolute", top:8, left:56, zIndex:500, display:"flex", flexDirection:"column", gap:6, alignItems:"flex-start", maxWidth:"calc(100% - 64px)" }}>
          <span style={{ background:"rgba(11,18,32,0.78)", color:"#cdd6e3", fontSize:11, padding:"4px 9px", borderRadius:6, fontFamily:"var(--font-mono)" }}>
            {!isGeoJson ? (overlay ? "AOI files shown on map" : "No area of interest mapped yet") : `${count} AOI${count !== 1 ? "s" : ""} delivered`}
          </span>
          <label htmlFor={inputId} title="GeoJSON · KML · zipped Shapefile" style={{
            display:"inline-flex", alignItems:"center", gap:7, cursor: busy?"wait":"pointer",
            padding:"8px 14px", borderRadius:8, background:"var(--accent)", color:"#fff",
            fontSize:12.5, fontWeight:600,
          }}>
            {isGeoJson && multi ? <Plus size={14} /> : <Upload size={14} />} {busy ? "Parsing…" : (isGeoJson && multi ? "Add another AOI" : "Upload AOI file")}
          </label>
          <input id={inputId} type="file" accept=".geojson,.json,.kml,.zip" onChange={handleFile} style={{ display:"none" }} />
          {err && <span style={{ background:"rgba(229,86,75,0.96)", color:"#fff", fontSize:11, padding:"3px 8px", borderRadius:6 }}>{err}</span>}
        </div>
      )}
    </div>
  );
}

function AoiMap({ aoi }) {
  if (!aoi) {
    return (
      <div className="empty"><MapPin size={16} /> No area of interest mapped yet.</div>
    );
  }
  return (
    <div className="aoi" style={{ height: 280 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
        <defs>
          <radialGradient id="terrain" cx="40%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#13384a" />
            <stop offset="55%" stopColor="#0e2735" />
            <stop offset="100%" stopColor="#0a1822" />
          </radialGradient>
          <linearGradient id="aoifill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0EA5B7" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2FB67A" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#terrain)" />
        {/* faux satellite blocks */}
        {[...Array(7)].map((_, i) => [...Array(7)].map((_, j) => (
          <rect key={`${i}-${j}`} x={i * 14.3} y={j * 14.3} width="14.3" height="14.3"
            fill="#ffffff" opacity={((i * 3 + j * 7) % 11) / 220 + 0.005} />
        )))}
        {/* graticule */}
        {[...Array(9)].map((_, i) => (
          <line key={"v" + i} x1={i * 12.5} y1="0" x2={i * 12.5} y2="100" stroke="#5e8aa3" strokeWidth="0.2" opacity="0.25" />
        ))}
        {[...Array(9)].map((_, i) => (
          <line key={"h" + i} x1="0" y1={i * 12.5} x2="100" y2={i * 12.5} stroke="#5e8aa3" strokeWidth="0.2" opacity="0.25" />
        ))}
        {/* AOI polygon */}
        <polygon points={aoi.poly} fill="url(#aoifill)" stroke="#3fe0ee" strokeWidth="0.7"
          strokeLinejoin="round" />
        {aoi.poly.split(" ").map((p, i) => {
          const [x, y] = p.split(",");
          return <circle key={i} cx={x} cy={y} r="0.9" fill="#7ff0fb" />;
        })}
      </svg>
      <div className="badge"><Layers size={11} /> AOI · GeoJSON</div>
      <div className="cap">
        {aoi.name}<br />
        ◎ {aoi.center}<br />
        ▦ {aoi.area}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deal list                                                         */
/* ------------------------------------------------------------------ */
function DealList({ deals, onOpen }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [person, setPerson] = useState("all");

  const filtered = deals.filter(d => {
    const matchQ = (d.company + d.sector + d.id).toLowerCase().includes(q.toLowerCase());
    const matchS = stage === "all" || String(d.stage) === stage;
    const matchP = person === "all" ||
      [d.owners.director, d.owners.se, d.owners.cs, d.owners.analytics].includes(person);
    return matchQ && matchS && matchP;
  });

  return (
    <>
      <h2 className="section-title">Deals</h2>
      <p className="section-sub">Customer passports across the Pixxel sales pipeline · {deals.length} active</p>
      <div className="cp-filters">
        <div className="cp-search">
          <Search size={17} color="var(--muted2)" />
          <input placeholder="Search company, sector or deal ID…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="cp-select">
          <select value={stage} onChange={e => setStage(e.target.value)}>
            <option value="all">All stages</option>
            {STAGES.map((s, i) => <option key={i} value={i}>{s}</option>)}
          </select>
          <ChevronDown size={15} className="chev" />
        </div>
        <div className="cp-select">
          <select value={person} onChange={e => setPerson(e.target.value)}>
            <option value="all">All team members</option>
            {ORDER.map(role => (
              <optgroup key={role} label={ROLE_LABEL[role] + (role === "owner" ? "s" : role === "analytics" ? " team" : "s")}>
                {(TEAM[role] || []).map(p => <option key={role + p} value={p}>{p}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={15} className="chev" />
        </div>
      </div>

      <div className="cp-grid">
        {filtered.map(d => {
          const { score } = readiness(d);
          return (
            <div key={d.id} className="cp-card" onClick={() => onOpen(d.id)}>
              <div className="row">
                <div>
                  <h3>{d.company}</h3>
                  <div className="cp-sector"><Satellite size={13} /> {d.sector}</div>
                </div>
                <Ring value={score} size={46} stroke={5} />
              </div>
              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <StageChip stage={d.stage} />
                <span className="cp-amount">{fmt(d.amount)}</span>
              </div>
              <div className="owners">
                <OwnerAvatar name={d.owners.director} role="dir" />
                <OwnerAvatar name={d.owners.se} role="se" />
                <OwnerAvatar name={d.owners.cs} role="cs" />
                <OwnerAvatar name={d.owners.analytics} role="an" />
                <div style={{ flex: 1 }} />
                <span className="cp-amount" style={{ color: "var(--muted2)", fontSize: 11 }}>{d.id}</span>
              </div>
              <div className="meta"><Clock size={12} /> Updated {d.lastActivity} · synced from HubSpot</div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="empty" style={{ marginTop: 8 }}>No deals match these filters. Try clearing the search.</div>}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Passport detail                                                   */
/* ------------------------------------------------------------------ */
function exportPassportPdf(deal) {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const list = (arr) => (arr && arr.length) ? "<ul>" + arr.map(x => `<li>${esc(typeof x === "string" ? x : (x.text || x.task || x.name || ""))}</li>`).join("") + "</ul>" : "<p class='muted'>—</p>";
  const p = deal.profile || {};
  const c = deal.context || {};
  const e = deal.execution || {};
  const t = p.tech || {};
  const o = deal.owners || {};
  const contacts = (p.contacts || []).map(x => `<div><strong>${esc(x.name)}</strong>${x.role ? " · " + esc(x.role) : ""}${x.email ? " · " + esc(x.email) : ""}</div>`).join("") || "<p class='muted'>No contacts</p>";
  const pocs = (e.pocs || []).map(x => `<li><strong>${esc(x.name)}</strong> — ${esc(x.status)}${x.note ? ": " + esc(x.note) : ""}</li>`).join("");
  const risks = (e.risks || []).map(x => `<li>[${esc(x.sev)}] ${esc(x.text)}</li>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(deal.company)} — Customer Passport</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a2230; margin: 0; padding: 40px; line-height: 1.5; }
  .bar { height: 4px; background: linear-gradient(90deg,#7B2FBE,#2D7FF9,#0EA5B7,#2FB67A,#F0A429,#E5564B); margin: -40px -40px 28px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #6b7480; font-size: 12px; font-family: monospace; margin-bottom: 24px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #0B7E8C; border-bottom: 1px solid #e3e8ef; padding-bottom: 5px; margin: 24px 0 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .k { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #97a0ad; margin-top: 8px; }
  .v { font-size: 13px; }
  .muted { color: #97a0ad; }
  ul { margin: 4px 0; padding-left: 18px; font-size: 13px; }
  .owners { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; }
  .owners div span { display: block; font-size: 10px; text-transform: uppercase; color: #97a0ad; }
  @media print { body { padding: 24px; } .bar { margin: -24px -24px 20px; } }
</style></head><body>
  <div class="bar"></div>
  <h1>${esc(deal.company)}</h1>
  <div class="sub">${esc(deal.pipeline)} · HubSpot ${esc(deal.hubspotId)} · ${esc(deal.hubsotStage || deal.hubspot_stage || "")}</div>

  <div class="owners">
    <div><span>Sales Owner</span>${esc(o.owner || "—")}</div>
    <div><span>Sales Engineering</span>${esc(o.se || "—")}</div>
    <div><span>Customer Success</span>${esc(o.cs || "—")}</div>
    <div><span>Analytics</span>${esc(o.analytics || "—")}</div>
  </div>

  <h2>Company &amp; Contacts</h2>
  ${contacts}
  <div class="k">Customer team</div><div class="v">${esc(p.team) || "<span class='muted'>—</span>"}</div>
  <div class="k">Expertise level</div><div class="v">${esc(p.expertiseLevel) || "<span class='muted'>—</span>"}</div>

  <h2>Use case &amp; needs</h2>
  <div class="k">Use case</div><div class="v">${esc(p.useCase) || "—"}</div>
  <div class="k">Pain points</div><div class="v">${esc(p.painPoints) || "—"}</div>
  <div class="k">Support needs</div><div class="v">${esc(p.supportNeeds) || "—"}</div>

  <h2>Technical requirements</h2>
  <div class="grid">
    <div><div class="k">Data sources</div><div class="v">${(t.dataSources||[]).map(esc).join(", ") || "—"}</div></div>
    <div><div class="k">Bandset</div><div class="v">${esc(t.bandset) || "—"}</div></div>
    <div><div class="k">Cadence / revisit</div><div class="v">${esc(t.cadence) || "—"}</div></div>
  </div>

  <h2>Context</h2>
  <div class="k">Problem statement</div><div class="v">${esc(c.problem) || "—"}</div>
  <div class="k">Objectives</div>${list(c.objectives)}

  <h2>Execution</h2>
  <div class="k">Success criteria</div>${list(e.successCriteria)}
  <div class="k">Proofs of concept</div>${pocs ? "<ul>"+pocs+"</ul>" : "<p class='muted'>—</p>"}
  <div class="k">Sample data delivered</div>${list(e.sampleData)}
  <div class="k">Risks</div>${risks ? "<ul>"+risks+"</ul>" : "<p class='muted'>—</p>"}
  <div class="k">Next steps</div><div class="v">${esc(e.nextSteps) || "—"}</div>
  <div class="k">Commercial model</div><div class="v">${esc(e.commercial) || "—"}</div>

  <p class="sub" style="margin-top:32px">Generated from Pixxel Customer Passport · ${new Date().toLocaleDateString("en-GB")}</p>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Please allow popups to export the PDF."); return; }
  w.document.write(html);
  w.document.close();
}

function CollaboratorsRow({ collaborators, canEdit, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const atMax = collaborators.length >= 3;
  // Everyone in the roster, flat, for picking
  const allPeople = Object.values(TEAM_MEMBERS).flat();
  const alreadyEmails = collaborators.map(c => c.email);

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
      padding:"10px 14px", marginTop:10, background:"var(--card)",
      border:"1px solid var(--line)", borderRadius:12,
    }}>
      <span style={{ fontSize:11, letterSpacing:1, textTransform:"uppercase", color:"var(--muted2)", fontWeight:600 }}>
        <Users size={12} style={{ verticalAlign:"-2px", marginRight:5 }} />Additional people
      </span>
      {collaborators.map((c, i) => (
        <span key={c.id || i} style={{
          display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px",
          borderRadius:20, background:"var(--line-soft)", fontSize:12.5,
        }}>
          <span style={{ fontWeight:500 }}>{c.name}</span>
          {canEdit && <button onClick={() => onDelete(c.id)} title="Remove" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:12, lineHeight:1 }}>✕</button>}
        </span>
      ))}
      {collaborators.length === 0 && <span style={{ fontSize:12.5, color:"var(--muted2)" }}>None added</span>}
      {canEdit && !atMax && (
        <div style={{ position:"relative" }}>
          <button onClick={() => setOpen(o => !o)} style={{
            display:"inline-flex", alignItems:"center", gap:5, padding:"4px 12px",
            borderRadius:20, border:"1px dashed var(--accent)", background:"transparent",
            color:"var(--accent)", fontSize:12.5, fontWeight:500, cursor:"pointer",
          }}><UserPlus size={13} /> Add person</button>
          {open && (
            <div className="assign-menu" style={{ top:34, maxHeight:280, overflowY:"auto", minWidth:220 }}>
              {allPeople.filter(p => !alreadyEmails.includes(p.email)).map(p => (
                <button key={p.email} onClick={() => { onAdd({ name:p.name, email:p.email }); setOpen(false); }}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {atMax && <span style={{ fontSize:11.5, color:"var(--muted2)" }}>Max 3 reached</span>}
    </div>
  );
}

// ── Quality Checks (global table across all deals) ─────────────
async function fetchAllQc() {
  return sbGet("quality_checks", "?order=created_at.desc&limit=500");
}
async function addQcEntry(entry) {
  const result = await sbPost("quality_checks", entry);
  // Notify the assignee in Slack when a QC entry is assigned to them
  if (entry.assignee && entry.assignee_email) {
    const slackId = slackFor(entry.assignee);
    if (slackId) {
      const resultText = entry.qc_result === "Fail" ? ":x: *Failed*" : ":white_check_mark: *Passed*";
      fetch(`${SUPABASE_URL}/functions/v1/slack-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          event: "qc_assignment",
          mentioned_slack: slackId,
          assignee: entry.assignee,
          organization: entry.organization,
          usecase: entry.usecase || "",
          image_id: entry.image_id || "",
          qc_result: entry.qc_result,
          qc_notes: entry.qc_notes || "",
        }),
      }).catch(() => {});
    }
  }
  return result;
}
async function deleteQcEntry(id) {
  return sbDelete("quality_checks", id);
}
async function updateQcEntry(id, entry) {
  return sbPatch("quality_checks", id, entry);
}

// ── IPR Image Status integration ──────────────────────────────
// Pulls satellite-image metadata from the internal IPR portal so QC rows can be
// created automatically (by ID/name, or auto-synced per deal) instead of typed
// by hand. See supabase/functions/ipr-sync for the scheduled server-side twin.
const IPR_API = "https://ipr-image-status.portals.pixxel.dev";
// Processing states that mean an image is captured + ready for our team to QC.
const IPR_QC_READY_STATUSES = ["Sent to Aurora", "Datahub upload completed"];

// Low-level GET against the IPR metadata API. `params` = plain object of filters
// (query, satImagePairs, processingStatus, startDate, …). Returns { items, total }.
async function iprFetch(params = {}) {
  const qs = new URLSearchParams();
  qs.set("page", "1");
  qs.set("pageSize", String(params.pageSize || 200));
  Object.entries(params).forEach(([k, v]) => {
    if (k === "pageSize") return;
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const r = await fetch(`${IPR_API}/api/metadata/detailed?${qs.toString()}`);
  if (!r.ok) throw new Error(`IPR ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const items = Array.isArray(data) ? data : (data.items || []);
  return { items, total: Number(data && data.total != null ? data.total : items.length) };
}

// Parse free-form "FF03 4320", "FF03:4320", "FF01-456", comma/newline-separated
// input into the API's satImagePairs param (e.g. "FF03:0000004320,FF01:0000000456").
// Mirrors the IPR dashboard's own parser (pads numeric image ids to 10 digits).
function iprParsePairs(raw) {
  if (!raw) return "";
  let s = String(raw).replace(/[\r\n,;:]+/g, " ").replace(/([a-zA-Z]+\d*)[_\-]+(\d+)/g, "$1 $2");
  const parts = s.split(/\s+/).filter(Boolean);
  const pairs = [];
  for (let i = 0; i < parts.length - 1; i += 2) {
    const sat = parts[i].toUpperCase();
    const num = parts[i + 1];
    const img = /^\d+$/.test(num) ? num.padStart(10, "0") : num;
    if (sat && img) pairs.push(`${sat}:${img}`);
  }
  return pairs.join(",");
}

// Stable, human-readable image id: satellite + frame, e.g. "FF03 0000004320".
function iprImageId(item) {
  return [(item.satellite_id || "").trim(), (item.image_id || "").trim()].filter(Boolean).join(" ");
}

// Best-effort link of an IPR item to a deal by company name appearing in its AOI/
// target text. Unreliable by design (AOI ids are generic) — accepted trade-off
// until captures carry a shared customer id. Returns the matched deal or null.
function iprMatchDeal(item, deals) {
  const hay = `${item.aoi_id || ""} ${item.target || ""}`.toLowerCase();
  if (!hay.trim()) return null;
  return (deals || []).find(d => d.company && hay.includes(d.company.toLowerCase())) || null;
}

// Map one IPR metadata item → a quality_checks row payload. `deal` (optional)
// links the row to a passport and seeds the SE as assignee.
function mapIprItemToQc(item, deal) {
  const assigneeName = deal && deal.owners ? deal.owners.se : null;
  const assigneePerson = assigneeName
    ? Object.values(TEAM_MEMBERS).flat().find(p => p.name === assigneeName) : null;
  const cloud = item.cloud_cover_percentage != null ? `${Math.round(item.cloud_cover_percentage)}% cloud` : "";
  // IPR-provenance data lives in its own column, not in the reviewer's QC notes.
  const iprInfo = [item.processing_status || "", cloud].filter(Boolean).join(" · ");
  const location = item.aoi_id
    || (item.latitude != null && item.longitude != null ? `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}` : "");
  return {
    organization: (deal && deal.company) || item.aoi_id || "Unknown",
    passport_id: deal ? deal.id : null,
    usecase: "",                  // customer use case is unknown from IPR — leave for the reviewer
    bandset: item.bandset || "",
    qc_result: "Awaiting QC",
    image_id: iprImageId(item),
    type: "Sample",
    assignee: assigneeName || null,
    assignee_email: assigneePerson ? assigneePerson.email : null,
    qc_notes: "",                 // reviewer fills this in during QC
    ipr_info: iprInfo,
    location,
    mvp_image: false,
    created_by: "IPR import",
  };
}

// Existing image ids already in quality_checks (lowercased) — used to skip dups.
async function existingQcImageIds() {
  const rows = await sbGet("quality_checks", "?select=image_id&limit=5000");
  return new Set(rows.map(r => (r.image_id || "").trim().toLowerCase()).filter(Boolean));
}

// Auto-populate: for each active deal, pull captured/QC-ready images whose AOI text
// matches the company name, and create QC rows assigned to that deal's SE. Company
// matching is intentionally loose. Inserts directly (not via addQcEntry) so the SE
// gets ONE summary Slack ping per deal instead of one per image. Returns { added, skipped }.
async function autoPopulateFromIpr(deals) {
  let added = 0, skipped = 0;
  const existing = await existingQcImageIds();
  for (const deal of (deals || [])) {
    if (!deal.company) continue;
    let items = [];
    try {
      for (const status of IPR_QC_READY_STATUSES) {
        const { items: got } = await iprFetch({ query: deal.company, processingStatus: status, pageSize: 200 });
        items = items.concat(got);
      }
    } catch (_) { continue; }
    let dealNew = 0;
    for (const item of items) {
      const id = iprImageId(item).toLowerCase();
      if (!id || existing.has(id)) { skipped++; continue; }
      await sbPost("quality_checks", mapIprItemToQc(item, deal));
      existing.add(id);
      added++; dealNew++;
    }
    // One summary DM to the deal's SE for the images just added (no SE → no ping).
    const seName = deal.owners ? deal.owners.se : null;
    if (dealNew && seName && slackFor(seName)) {
      try {
        await sendSlackNotification("mention", {
          mentionedPerson: seName, mentioned_slack: slackFor(seName), mentionedBy: "IPR sync",
          company: deal.company, dealId: deal.id,
          noteText: `${dealNew} new image${dealNew === 1 ? "" : "s"} captured for ${deal.company} — awaiting your QC.`,
        }, deal.id);
      } catch (_) { /* best-effort */ }
    }
  }
  return { added, skipped };
}

// Notify the linked deal's CS when a QC entry becomes complete (result set to
// Pass/Fail from a non-complete state). No CS on the deal → no notification.
async function notifyCsQcComplete({ prevResult, entry, csName }) {
  const nowComplete = entry.qc_result === "Pass" || entry.qc_result === "Fail";
  const wasComplete = prevResult === "Pass" || prevResult === "Fail";
  if (!nowComplete || wasComplete || !csName) return;
  const slackId = slackFor(csName);
  if (!slackId) return;
  try {
    await sendSlackNotification("mention", {
      mentionedPerson: csName,
      mentioned_slack: slackId,
      mentionedBy: "QC",
      company: entry.organization,
      dealId: entry.passport_id,
      noteText: `QC ${entry.qc_result} — image ${entry.image_id || "(no id)"}${entry.usecase ? " · " + entry.usecase : ""}. ${entry.qc_notes || ""}`.trim(),
    }, entry.passport_id);
  } catch (_) { /* best-effort */ }
}

// Searchable deal picker — type to filter instead of scrolling a long dropdown
function DealSearchPicker({ deals, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = deals.find(d => d.id === value);
  const matches = q.trim()
    ? deals.filter(d => d.company.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : deals.slice(0, 8);
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} className="cp-select" style={{ cursor: "pointer" }}>
        <div style={{ padding: "8px 11px", fontSize: 13, color: selected ? "var(--ink)" : "var(--muted2)" }}>
          {selected ? selected.company : "— none · click to search —"}
        </div>
        <ChevronDown size={13} className="chev" />
      </div>
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:40, marginTop:4, background:"#fff", border:"1px solid var(--line)", borderRadius:10, boxShadow:"0 14px 40px -16px rgba(11,18,32,.35)", padding:6 }}>
          <input autoFocus placeholder="Search deals…" value={q} onChange={e => setQ(e.target.value)}
            style={{ width:"100%", border:"1px solid var(--line)", borderRadius:7, padding:"7px 10px", fontSize:13, fontFamily:"inherit", outline:"none", marginBottom:4 }} />
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <button onClick={() => { onChange(""); setOpen(false); setQ(""); }}
              style={{ display:"block", width:"100%", textAlign:"left", padding:"7px 10px", borderRadius:6, border:"none", background:"transparent", cursor:"pointer", fontSize:12.5, color:"var(--muted2)" }}>— none —</button>
            {matches.map(d => (
              <button key={d.id} onClick={() => { onChange(d.id); setOpen(false); setQ(""); }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                style={{ display:"block", width:"100%", textAlign:"left", padding:"7px 10px", borderRadius:6, border:"none", background:"transparent", cursor:"pointer", fontSize:12.5, color:"var(--ink)" }}>
                {d.company}
              </button>
            ))}
            {matches.length === 0 && <div style={{ padding:"8px 10px", fontSize:12, color:"var(--muted2)" }}>No matching deals</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function QcForm({ onSubmit, onCancel, defaultOrg, defaultPassportId, deals, initial }) {
  // `initial` = an existing QC row → the form opens pre-filled in edit mode
  const [form, setForm] = useState({
    organization: (initial && initial.organization) || defaultOrg || "",
    usecase: (initial && initial.usecase) || "",
    bandset: (initial && initial.bandset) || "",
    ipr_info: (initial && initial.ipr_info) || "",  // preserved on edit; not user-editable
    priority: (initial && initial.priority) || "Medium",
    qc_result: (initial && initial.qc_result) || "Awaiting QC",
    image_id: (initial && initial.image_id) || "",
    type: (initial && initial.type) || "Sample",
    assignee: (initial && initial.assignee) || "",
    qc_notes: (initial && initial.qc_notes) || "",
    location: (initial && initial.location) || "",
    mvp_image: !!(initial && initial.mvp_image),
    feedback_milestone: (initial && initial.feedback_milestone) || "",
    qc_required_by: (initial && initial.qc_required_by) || "",
    passport_id: (initial && initial.passport_id) || defaultPassportId || "",
  });
  const [uploading, setUploading] = useState(false);
  const [shotPath, setShotPath] = useState((initial && initial.photo_evidence_path) || "");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.organization.trim()) return;
    const assigneePerson = Object.values(TEAM_MEMBERS).flat().find(p => p.name === form.assignee);
    const payload = {
      ...form,
      passport_id: form.passport_id || null,   // empty string → null (uuid column)
      assignee: form.assignee || null,
      assignee_email: assigneePerson ? assigneePerson.email : null,
      feedback_milestone: form.feedback_milestone || null,
      qc_required_by: form.qc_required_by || null,
      photo_evidence_path: shotPath || null,
    };
    if (!initial) payload.created_by = "You"; // don't overwrite original author on edit
    onSubmit(payload);
  };
  const handleShot = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try { const path = await uploadFile(form.passport_id || "general", file); setShotPath(path); }
    finally { setUploading(false); e.target.value = ""; }
  };
  return (
    <div className="clog-form" style={{ marginBottom: 16 }}>
      <div className="clog-form-row">
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Organization</div>
          <input value={form.organization} onChange={e => set("organization", e.target.value)} placeholder="Customer / org name"
            style={{ width:"100%", border:"1px solid var(--accent)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none" }} />
        </div>
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Linked deal (optional)</div>
          <DealSearchPicker deals={deals} value={form.passport_id} onChange={(id) => set("passport_id", id)} />
        </div>
      </div>
      <div className="clog-form-row">
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Usecase</div>
          <input value={form.usecase} onChange={e => set("usecase", e.target.value)} placeholder="e.g. Forest Monitoring"
            style={{ width:"100%", border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none" }} />
        </div>
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Image ID</div>
          <input value={form.image_id} onChange={e => set("image_id", e.target.value)} placeholder="e.g. FF03 2790"
            style={{ width:"100%", border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none" }} />
        </div>
      </div>
      <div className="clog-form-row">
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Bandset</div>
          <input value={form.bandset} onChange={e => set("bandset", e.target.value)} placeholder="e.g. Vegetation"
            style={{ width:"100%", border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none" }} />
        </div>
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>IPR info</div>
          <input value={form.ipr_info} readOnly placeholder="— (auto-filled from IPR)"
            style={{ width:"100%", border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none", background:"var(--line-soft)", color:"var(--muted)" }} />
        </div>
      </div>
      <div className="clog-form-row">
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Quality Check</div>
          <div style={{ display:"flex", gap:8 }}>
            {[["Awaiting QC","#B5720E","#FEF3E0","#F0A429"],["Pass","#1f8a57","#E3F7EC","var(--ok)"],["Fail","#c0392b","#FCE9E7","var(--bad)"]].map(([r,fg,bg,br]) => (
              <button key={r} onClick={() => set("qc_result", r)} type="button"
                style={{ flex:1, padding:"7px 4px", borderRadius:8, border:"1px solid "+(form.qc_result===r ? br : "var(--line)"),
                  background: form.qc_result===r ? bg : "transparent",
                  color: form.qc_result===r ? fg : "var(--muted)", fontSize:12.5, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>{r}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Type</div>
          <div className="cp-select">
            <select value={form.type} onChange={e => set("type", e.target.value)}>
              <option>Sample</option><option>Paid</option>
            </select>
            <ChevronDown size={13} className="chev" />
          </div>
        </div>
      </div>
      <div className="clog-form-row">
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Assignee</div>
          <div className="cp-select">
            <select value={form.assignee} onChange={e => set("assignee", e.target.value)}>
              <option value="">— unassigned —</option>
              {Object.values(TEAM_MEMBERS).flat().map(p => <option key={p.email} value={p.name}>{p.name}</option>)}
            </select>
            <ChevronDown size={13} className="chev" />
          </div>
        </div>
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Location</div>
          <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Mae Taen — Thailand"
            style={{ width:"100%", border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none" }} />
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>QC Notes</div>
        <textarea value={form.qc_notes} onChange={e => set("qc_notes", e.target.value)} placeholder="What did the QC reviewer find?"
          style={{ width:"100%", border:"1px solid var(--line)", borderRadius:9, padding:"9px 12px", fontFamily:"inherit", fontSize:13, resize:"vertical", minHeight:64, outline:"none" }} />
      </div>
      <div className="clog-form-row">
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>QC required by</div>
          <input type="date" value={form.qc_required_by} onChange={e => set("qc_required_by", e.target.value)}
            style={{ width:"100%", border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none" }} />
        </div>
        <div>
          <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Feedback milestone</div>
          <input type="date" value={form.feedback_milestone} onChange={e => set("feedback_milestone", e.target.value)}
            style={{ width:"100%", border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none" }} />
        </div>
      </div>
      <div className="clog-form-row">
        <label style={{ display:"flex", alignItems:"center", gap:7, fontSize:12.5, cursor:"pointer" }}>
          <input type="checkbox" checked={form.mvp_image} onChange={e => set("mvp_image", e.target.checked)} style={{ accentColor:"var(--accent)" }} />
          MVP image
        </label>
        <div style={{ fontSize:11.5, color:"var(--muted2)", alignSelf:"center" }}>
          {form.mvp_image ? "After saving, open the MVP Images tab to add details & sync this image to Notion." : ""}
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Photo evidence</div>
        {shotPath ? (
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"var(--ok)" }}>
            <CheckCircle2 size={14} /> Image attached
            <button onClick={() => setShotPath("")} style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer" }}>✕</button>
          </div>
        ) : (
          <>
            <label htmlFor="qc-shot" style={{ display:"inline-flex", alignItems:"center", gap:7, cursor: uploading?"wait":"pointer", padding:"7px 13px", borderRadius:8, border:"1px solid var(--line)", fontSize:12.5, color:"var(--accent-deep)" }}>
              <Upload size={13} /> {uploading ? "Uploading…" : "Attach or drop a file"}
            </label>
            <input id="qc-shot" type="file" accept=".jpg,.jpeg,.png" style={{ display:"none" }} onChange={handleShot} />
          </>
        )}
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <button className="btn ghost" style={{ color:"var(--muted)", border:"1px solid var(--line)", background:"#fff" }} onClick={onCancel}>Cancel</button>
        <button className="btn solid" onClick={submit}><Camera size={13} /> {initial ? "Save changes" : "Save QC entry"}</button>
      </div>
    </div>
  );
}

function QcRow({ row, canEdit, onDelete, onEdit, showOrg }) {
  return (
    <tr>
      {showOrg && <td style={{ fontWeight:600 }}>{row.organization}</td>}
      <td>{row.usecase || "—"}</td>
      <td>{row.bandset || "—"}</td>
      <td><span className="tag" style={{ background: row.qc_result === "Pass" ? "#E3F7EC" : row.qc_result === "Fail" ? "#FCE9E7" : "#FEF3E0", color: row.qc_result === "Pass" ? "#1f8a57" : row.qc_result === "Fail" ? "#c0392b" : "#B5720E", fontWeight:600 }}>{row.qc_result}</span></td>
      <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{row.image_id || "—"}</td>
      <td><span className="tag" style={{ background: row.type === "Paid" ? "var(--accent-soft)" : "var(--line-soft)", color: row.type === "Paid" ? "var(--accent-deep)" : "var(--muted)" }}>{row.type}</span></td>
      <td>{row.assignee || "—"}</td>
      <td style={{ maxWidth: 240, fontSize: 12.5, color: "var(--muted)" }}>{row.qc_notes ? (row.qc_notes.length > 60 ? row.qc_notes.slice(0,60)+"…" : row.qc_notes) : "—"}</td>
      <td style={{ fontSize: 12, color: "var(--muted2)" }}>{row.location || "—"}</td>
      <td>{row.mvp_image ? <CheckCircle2 size={14} color="var(--ok)" /> : "—"}</td>
      <td>{row.photo_evidence_path ? <a href={`${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${row.photo_evidence_path}`} target="_blank" rel="noreferrer"><Camera size={14} color="var(--accent-deep)" /></a> : "—"}</td>
      <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted2)" }}>{row.feedback_milestone || "—"}</td>
      <td style={{ fontSize: 11.5, color: "var(--muted2)", maxWidth: 180 }}>{row.ipr_info || "—"}</td>
      {canEdit && (
        <td style={{ whiteSpace: "nowrap" }}>
          <button onClick={() => onEdit && onEdit(row)} title="Edit this QC entry" style={{ border:"none", background:"none", color:"var(--accent-deep)", cursor:"pointer", padding:"0 4px" }}><Pencil size={13} /></button>
          <button onClick={() => onDelete(row.id)} title="Delete" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:13, padding:"0 4px" }}>✕</button>
        </td>
      )}
    </tr>
  );
}

// Modal: manually pull images from the IPR portal by satellite/image ID or by a
// name/AOI search, preview them, then create QC rows (Awaiting QC). Each imported
// image is linked to a deal when its AOI text matches a company name; matched rows
// inherit that deal's SE as assignee, unmatched rows get the chosen fallback (or none).
function IprImportModal({ deals, onClose, onDone, toast }) {
  const TEAM_FLAT = Object.values(TEAM_MEMBERS).flat();
  const [mode, setMode] = useState("id");            // "id" | "name"
  const [idInput, setIdInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [readyOnly, setReadyOnly] = useState(true);  // name mode: only captured/QC-ready
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [items, setItems] = useState([]);
  const [existing, setExisting] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [fallbackAssignee, setFallbackAssignee] = useState("");
  const [importing, setImporting] = useState(false);

  const rowsView = useMemo(() => items.map(it => {
    const id = iprImageId(it);
    const deal = iprMatchDeal(it, deals);
    const isDup = existing.has(id.toLowerCase());
    return { it, id, deal, isDup };
  }), [items, deals, existing]);

  const runSearch = async () => {
    setLoading(true); setSearched(true);
    try {
      let res;
      if (mode === "id") {
        const pairs = iprParsePairs(idInput);
        if (!pairs) {
          // No sat:id pairs parsed — treat a bare number as a free-text id search
          const bare = idInput.trim();
          if (!bare) { toast("Enter an ID like 'FF03 4320'"); setLoading(false); return; }
          res = await iprFetch({ query: bare, pageSize: 100 });
        } else {
          res = await iprFetch({ satImagePairs: pairs, pageSize: 100 });
        }
      } else {
        if (!nameInput.trim()) { toast("Enter a name / AOI to search"); setLoading(false); return; }
        const base = { query: nameInput.trim(), pageSize: 200 };
        if (readyOnly) {
          const acc = [];
          for (const status of IPR_QC_READY_STATUSES) {
            const { items: got } = await iprFetch({ ...base, processingStatus: status });
            acc.push(...got);
          }
          res = { items: acc };
        } else {
          res = await iprFetch(base);
        }
      }
      const dedupSeen = new Set();
      const uniq = res.items.filter(it => { const k = iprImageId(it).toLowerCase(); if (dedupSeen.has(k)) return false; dedupSeen.add(k); return true; });
      const existSet = await existingQcImageIds();
      setExisting(existSet);
      setItems(uniq);
      // Pre-select everything not already imported
      setSelected(new Set(uniq.map(iprImageId).filter(id => !existSet.has(id.toLowerCase()))));
    } catch (e) {
      toast("IPR search failed: " + e.message);
      setItems([]); setSelected(new Set());
    } finally { setLoading(false); }
  };

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doImport = async () => {
    const chosen = rowsView.filter(r => selected.has(r.id));
    if (!chosen.length) { toast("Nothing selected"); return; }
    setImporting(true);
    let added = 0;
    const fbPerson = TEAM_FLAT.find(p => p.name === fallbackAssignee);
    try {
      for (const r of chosen) {
        const payload = mapIprItemToQc(r.it, r.deal);
        if (!r.deal && fbPerson) { payload.assignee = fbPerson.name; payload.assignee_email = fbPerson.email; }
        await addQcEntry(payload);
        added++;
      }
      toast(`Imported ${added} image${added === 1 ? "" : "s"} into Quality Checks`);
      onDone && onDone();
      onClose();
    } catch (e) {
      toast(`Imported ${added}, then failed: ${e.message}`);
      onDone && onDone();
    } finally { setImporting(false); }
  };

  const selectableCount = rowsView.filter(r => !r.isDup).length;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(8,18,28,.45)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"6vh 16px", overflowY:"auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:760, background:"#fff", borderRadius:16, border:"1px solid var(--line)", boxShadow:"0 30px 80px -20px rgba(11,18,32,.5)", overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid var(--line)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <Satellite size={17} color="var(--accent-deep)" />
            <h3 style={{ margin:0, fontSize:16 }}>Import images from IPR</h3>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:"var(--muted2)" }}><X size={18} /></button>
        </div>

        <div style={{ padding:"16px 20px" }}>
          <div className="seg" style={{ marginBottom:12 }}>
            <button className={mode==="id"?"on":""} onClick={() => { setMode("id"); setSearched(false); setItems([]); }}>By ID</button>
            <button className={mode==="name"?"on":""} onClick={() => { setMode("name"); setSearched(false); setItems([]); }}>By Name / AOI</button>
          </div>

          {mode === "id" ? (
            <div>
              <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Satellite + image ID(s)</div>
              <textarea value={idInput} onChange={e => setIdInput(e.target.value)} placeholder="e.g. FF03 4320  ·  FF01:456, FF02-1289  (one or many)"
                style={{ width:"100%", border:"1px solid var(--line)", borderRadius:9, padding:"9px 12px", fontFamily:"inherit", fontSize:13, resize:"vertical", minHeight:52, outline:"none" }} />
            </div>
          ) : (
            <div>
              <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Name / AOI contains</div>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} placeholder="e.g. rhodri, Australia, FARMLAND_2476…"
                style={{ width:"100%", border:"1px solid var(--line)", borderRadius:9, padding:"9px 12px", fontFamily:"inherit", fontSize:13, outline:"none" }} />
              <label style={{ display:"flex", alignItems:"center", gap:7, fontSize:12.5, cursor:"pointer", marginTop:8, color:"var(--muted)" }}>
                <input type="checkbox" checked={readyOnly} onChange={e => setReadyOnly(e.target.checked)} style={{ accentColor:"var(--accent)" }} />
                Only captured &amp; QC-ready ({IPR_QC_READY_STATUSES.join(" / ")})
              </label>
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
            <button className="btn solid" onClick={runSearch} disabled={loading}>
              {loading ? <><RefreshCw size={13} className="spin" /> Searching…</> : <><Search size={13} /> Search IPR</>}
            </button>
          </div>

          {searched && !loading && (
            <div style={{ marginTop:14 }}>
              {rowsView.length === 0 ? (
                <div className="empty"><Satellite size={15} /> No images found for that {mode === "id" ? "ID" : "search"}.</div>
              ) : (
                <>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                    <div style={{ fontSize:12.5, color:"var(--muted)" }}>{rowsView.length} found · {selected.size} selected · {rowsView.length - selectableCount} already imported</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:"var(--muted2)" }}>Assign unmatched to</span>
                      <div className="cp-select" style={{ minWidth:170 }}>
                        <select value={fallbackAssignee} onChange={e => setFallbackAssignee(e.target.value)}>
                          <option value="">— none —</option>
                          {TEAM_FLAT.map(p => <option key={p.email} value={p.name}>{p.name}</option>)}
                        </select>
                        <ChevronDown size={13} className="chev" />
                      </div>
                    </div>
                  </div>
                  <div style={{ maxHeight:300, overflowY:"auto", border:"1px solid var(--line)", borderRadius:10 }}>
                    <table className="qc-table" style={{ margin:0 }}>
                      <thead><tr><th></th><th>Image ID</th><th>AOI / location</th><th>Status</th><th>Deal → assignee</th></tr></thead>
                      <tbody>
                        {rowsView.map(r => {
                          const assignee = r.deal ? (r.deal.owners && r.deal.owners.se) : (fallbackAssignee || null);
                          return (
                            <tr key={r.id} style={{ opacity: r.isDup ? .5 : 1 }}>
                              <td><input type="checkbox" checked={selected.has(r.id)} disabled={r.isDup} onChange={() => toggle(r.id)} style={{ accentColor:"var(--accent)" }} /></td>
                              <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{r.id}{r.isDup && <span style={{ marginLeft:6, fontSize:10, color:"var(--muted2)" }}>(exists)</span>}</td>
                              <td style={{ fontSize:12, color:"var(--muted)", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.it.aoi_id || "—"}</td>
                              <td style={{ fontSize:11.5 }}>{r.it.processing_status || "—"}</td>
                              <td style={{ fontSize:12 }}>{r.deal ? <span><strong>{r.deal.company}</strong> → {assignee || "—"}</span> : <span style={{ color:"var(--muted2)" }}>no match → {assignee || "unassigned"}</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", padding:"14px 20px", borderTop:"1px solid var(--line)" }}>
          <button className="btn ghost" style={{ color:"var(--muted)", border:"1px solid var(--line)", background:"#fff" }} onClick={onClose}>Cancel</button>
          <button className="btn solid" onClick={doImport} disabled={importing || selected.size === 0}>
            {importing ? <><RefreshCw size={13} className="spin" /> Importing…</> : <><Plus size={13} /> Import {selected.size || ""} to QC</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function QualityChecksGlobal({ deals, canEdit, onOpen, toast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null); // the QC entry being edited, or null
  const [filter, setFilter] = useState("all"); // all | Pass | Fail
  const [showImport, setShowImport] = useState(false); // IPR import modal
  const [syncing, setSyncing] = useState(false);       // auto-populate in progress

  const load = async () => {
    setLoading(true);
    try { setRows(await fetchAllQc()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (entry) => {
    try {
      if (editRow) {
        const prevResult = editRow.qc_result;
        await updateQcEntry(editRow.id, entry);
        toast("QC entry updated");
        // Notify the linked deal's CS when this QC has just been completed
        const deal = deals.find(d => d.id === (entry.passport_id || editRow.passport_id));
        notifyCsQcComplete({ prevResult, entry: { ...editRow, ...entry }, csName: deal && deal.owners ? deal.owners.cs : null });
      }
      else { await addQcEntry(entry); toast("QC entry saved"); }
      setShowForm(false); setEditRow(null);
      await load();
    }
    catch (e) { toast("Save failed: " + e.message); }
  };

  const syncCaptured = async () => {
    setSyncing(true);
    try {
      const { added, skipped } = await autoPopulateFromIpr(deals);
      toast(added ? `Synced ${added} new image${added === 1 ? "" : "s"} (${skipped} already present)` : `No new captured images to add (${skipped} already present)`);
      await load();
    } catch (e) { toast("Sync failed: " + e.message); }
    finally { setSyncing(false); }
  };
  const remove = async (id) => {
    try { await deleteQcEntry(id); toast("QC entry deleted"); await load(); }
    catch (e) { toast("Delete failed: " + e.message); }
  };

  const filtered = filter === "all" ? rows : rows.filter(r => r.qc_result === filter);
  const passCount = rows.filter(r => r.qc_result === "Pass").length;
  const failCount = rows.filter(r => r.qc_result === "Fail").length;
  const awaitingCount = rows.filter(r => r.qc_result === "Awaiting QC").length;

  return (
    <div className="cp-page-inner">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 18, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 2 }}>Quality Checks</h2>
          <div style={{ fontSize:13, color:"var(--muted)" }}>{rows.length} entries · {awaitingCount} awaiting · {passCount} pass · {failCount} fail</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div className="seg">
            <button className={filter==="all"?"on":""} onClick={() => setFilter("all")}>All</button>
            <button className={filter==="Awaiting QC"?"on":""} onClick={() => setFilter("Awaiting QC")}>Awaiting</button>
            <button className={filter==="Pass"?"on":""} onClick={() => setFilter("Pass")}>Pass</button>
            <button className={filter==="Fail"?"on":""} onClick={() => setFilter("Fail")}>Fail</button>
          </div>
          {canEdit && !showForm && !editRow && (
            <>
              <button className="btn ghost" style={{ color:"var(--accent-deep)", border:"1px solid var(--line)", background:"#fff" }} onClick={syncCaptured} disabled={syncing} title="Pull newly captured images (Sent to Aurora / Datahub upload completed) for all deals">
                {syncing ? <><RefreshCw size={14} className="spin" /> Syncing…</> : <><RefreshCw size={14} /> Sync captured images</>}
              </button>
              <button className="btn ghost" style={{ color:"var(--accent-deep)", border:"1px solid var(--line)", background:"#fff" }} onClick={() => setShowImport(true)}><Satellite size={14} /> Import from IPR</button>
              <button className="btn solid" onClick={() => setShowForm(true)}><Plus size={14} /> New QC entry</button>
            </>
          )}
        </div>
      </div>

      {showImport && (
        <IprImportModal deals={deals} toast={toast}
          onClose={() => setShowImport(false)} onDone={load} />
      )}

      {(showForm || editRow) && (
        <QcForm key={editRow ? editRow.id : "new"} deals={deals} initial={editRow}
          onSubmit={submit} onCancel={() => { setShowForm(false); setEditRow(null); }} />
      )}

      {loading ? <div className="empty"><RefreshCw size={15} className="spin" /> Loading…</div> : (
        <div style={{ overflowX: "auto", background:"#fff", border:"1px solid var(--line)", borderRadius: 14 }}>
          <table className="qc-table">
            <thead>
              <tr>
                <th>Organization</th><th>Usecase</th><th>Bandset</th><th>QC</th><th>Image ID</th><th>Type</th>
                <th>Assignee</th><th>Notes</th><th>Location</th><th>MVP</th><th>Evidence</th><th>Milestone</th><th>IPR info</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map(r => <QcRow key={r.id} row={r} canEdit={canEdit} onDelete={remove} onEdit={(row) => { setEditRow(row); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} showOrg />)
                : <tr><td colSpan={canEdit ? 13 : 12} style={{ textAlign:"center", padding:30, color:"var(--muted2)" }}>No QC entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Per-deal QC tab (filtered to this passport)
function QcTab({ d, canEdit, toast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await sbGet("quality_checks", `?passport_id=eq.${d.id}&order=created_at.desc`)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [d.id]);

  const submit = async (entry) => {
    try {
      if (editRow) {
        const prevResult = editRow.qc_result;
        await updateQcEntry(editRow.id, entry);
        toast("QC entry updated");
        // Notify this deal's CS when the QC has just been completed
        notifyCsQcComplete({ prevResult, entry: { ...editRow, ...entry }, csName: d.owners ? d.owners.cs : null });
      }
      else { await addQcEntry(entry); toast("QC entry saved"); }
      setShowForm(false); setEditRow(null);
      await load();
    }
    catch (e) { toast("Save failed: " + e.message); }
  };
  const remove = async (id) => {
    try { await deleteQcEntry(id); toast("QC entry deleted"); await load(); }
    catch (e) { toast("Delete failed: " + e.message); }
  };

  return (
    <Block icon={Camera} title="Quality Checks">
      {canEdit && !showForm && !editRow && (
        <button onClick={() => setShowForm(true)} className="add-row"><Plus size={14} /> Log QC entry</button>
      )}
      {(showForm || editRow) && (
        <QcForm key={editRow ? editRow.id : "new"} deals={[]} initial={editRow}
          defaultOrg={d.company} defaultPassportId={d.id}
          onSubmit={submit} onCancel={() => { setShowForm(false); setEditRow(null); }} />
      )}
      {loading ? <div className="empty"><RefreshCw size={15} className="spin" /> Loading…</div> : (
        rows.length ? (
          <div style={{ overflowX: "auto" }}>
            <table className="qc-table">
              <thead><tr><th>Usecase</th><th>Bandset</th><th>QC</th><th>Image ID</th><th>Type</th><th>Assignee</th><th>Notes</th><th>Location</th><th>MVP</th><th>Evidence</th><th>Milestone</th><th>IPR info</th>{canEdit && <th></th>}</tr></thead>
              <tbody>{rows.map(r => <QcRow key={r.id} row={r} canEdit={canEdit} onDelete={remove} onEdit={(row) => { setEditRow(row); setShowForm(false); }} />)}</tbody>
            </table>
          </div>
        ) : !showForm && !editRow && <div className="empty"><Camera size={15} /> No QC entries for this deal yet.</div>
      )}
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/*  Maps tab — Leaflet maps fed live from the Notion databases         */
/* ------------------------------------------------------------------ */

// Colored Leaflet pins (pointhi/leaflet-color-markers), cached per colour.
const _leafletIconCache = {};
function leafletColorIcon(color) {
  if (_leafletIconCache[color]) return _leafletIconCache[color];
  const icon = new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  });
  _leafletIconCache[color] = icon;
  return icon;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Pick a pin colour from a row value (handles multi_select arrays), default blue.
function pinColorFor(row, colorBy, rules) {
  const raw = row[colorBy];
  const v = Array.isArray(raw) ? (raw[0] || "") : (raw || "");
  return rules[String(v).trim()] || "blue";
}

// Build a marker popup from a Notion row (inline-styled so it needs no extra CSS).
function mapPopupHtml(row, titleFields, fields, thumbnailField) {
  const title = titleFields.map((f) => row[f]).find((v) => v && String(v).trim()) || "Details";
  let html = `<div style="max-height:240px;overflow-y:auto;font-size:12.5px;line-height:1.45;padding-right:4px;">`;
  html += `<h3 style="margin:0 0 8px;font-size:15px;border-bottom:1px solid #e4e8ef;padding-bottom:4px;">${escapeHtml(title)}</h3>`;
  if (thumbnailField && Array.isArray(row[thumbnailField]) && row[thumbnailField][0]) {
    html += `<img src="${encodeURI(row[thumbnailField][0])}" alt="" style="width:100%;border-radius:6px;margin-bottom:8px;display:block;" />`;
  }
  fields.forEach((f) => {
    let value = row[f];
    if (Array.isArray(value)) value = value.join(", ");
    if (value === null || value === undefined || String(value).trim() === "") return;
    value = String(value);
    const rendered = /^https?:\/\//.test(value)
      ? `<a href="${encodeURI(value)}" target="_blank" rel="noreferrer">Open link</a>`
      : escapeHtml(value);
    html += `<div style="margin-bottom:3px;"><b>${escapeHtml(f)}:</b> ${rendered}</div>`;
  });
  return html + "</div>";
}

// One Leaflet map, clustered, fetched from a Notion-backed edge-function action.
function NotionLeafletMap({ action, colorBy, colorRules, fields, titleFields, thumbnailField }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([20, 0], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    }).addTo(map);
    // Container is sized by CSS after mount — recalc so tiles fill it.
    setTimeout(() => { if (!cancelled) map.invalidateSize(); }, 0);

    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/hubspot-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok) { setStatus("error"); return; }
        const cluster = L.markerClusterGroup();
        const bounds = [];
        (data.rows || []).forEach((row) => {
          const lat = parseFloat(row.Latitude), lng = parseFloat(row.Longitude);
          if (!isFinite(lat) || !isFinite(lng)) return;
          const marker = L.marker([lat, lng], { icon: leafletColorIcon(pinColorFor(row, colorBy, colorRules)) });
          marker.bindPopup(mapPopupHtml(row, titleFields, fields, thumbnailField), { maxWidth: 300 });
          cluster.addLayer(marker);
          bounds.push([lat, lng]);
        });
        map.addLayer(cluster);
        if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
        setCount(bounds.length);
        setStatus("ready");
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => { cancelled = true; map.remove(); };
  }, [action]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} style={{ height: "70vh", width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }} />
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 500, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 7 }}>
        {status === "loading" ? <><RefreshCw size={13} className="spin" /> Loading from Notion…</>
          : status === "error" ? <><AlertTriangle size={13} color="var(--bad)" /> Couldn't load from Notion</>
          : <>{count} location{count !== 1 ? "s" : ""}</>}
      </div>
    </div>
  );
}

const SAMPLE_MAP_CONFIG = {
  action: "list_sample_ammo",
  colorBy: "Sensor",
  colorRules: { FF01: "green", FF02: "red", FF03: "orange" },
  titleFields: ["Location", "Image ID"],
  thumbnailField: "Thumbnail",
  fields: ["Image ID", "Bandset", "Centre coordinates", "Latitude", "Longitude", "Date of capture", "Industry", "LBC (10x10)", "Location", "Region", "S3 URL L2A", "Sensor", "Use Case", "Version"],
  legend: [["Sensor FF01", "green"], ["FF02", "red"], ["FF03", "orange"], ["Other", "blue"]],
};
const EXHIBITS_MAP_CONFIG = {
  action: "list_exhibits",
  colorBy: "Vertical",
  colorRules: { Agriculture: "green", Defense: "red", Mining: "orange", Energy: "yellow", Urban: "violet" },
  titleFields: ["Site name", "Image ID"],
  thumbnailField: null,
  fields: ["Image ID", "Bandset", "Capture Date", "Latitude", "Longitude", "Description", "Marketing content", "Notes", "Overall Region", "POC", "Region", "SE Slide deck", "Satellite sensor", "Site name", "Spatial Resolution", "Use-case", "Vertical"],
  legend: [["Agriculture", "green"], ["Defense", "red"], ["Mining", "orange"], ["Energy", "yellow"], ["Urban", "violet"], ["Other", "blue"]],
};

function MapsGlobal() {
  const [which, setWhich] = useState("sample");
  const cfg = which === "sample" ? SAMPLE_MAP_CONFIG : EXHIBITS_MAP_CONFIG;
  const segBtn = (active) => ({
    padding: "7px 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", border: "none",
    background: active ? "var(--ink)" : "#fff", color: active ? "#fff" : "var(--muted)",
  });
  return (
    <div className="cp-page-inner">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 2 }}>Maps</h2>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Live from Notion · {which === "sample" ? "FF Sample Image Ammo" : "FF Exhibits Directory"}</div>
        </div>
        <div style={{ display: "inline-flex", borderRadius: 9, overflow: "hidden", border: "1px solid var(--line)" }}>
          <button style={{ ...segBtn(which === "sample"), borderRight: "1px solid var(--line)" }} onClick={() => setWhich("sample")}>Sample-Ready Images</button>
          <button style={segBtn(which === "exhibits")} onClick={() => setWhich("exhibits")}>Exhibits</button>
        </div>
      </div>
      <NotionLeafletMap key={cfg.action} {...cfg} />
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
        {cfg.legend.map(([label, color]) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <img src={`https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`} alt="" style={{ height: 16 }} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Modal: collect the full Sample Ammo field set (prefilled from the QC entry)
// then push a complete row to the Notion DB. Notion is the source of truth, so
// these values live in Notion — we only stamp notion_page_id back on the QC row.
function MvpSyncModal({ row, deal, onClose, onDone, toast }) {
  const evidenceUrl = row.photo_evidence_path
    ? `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${row.photo_evidence_path}`
    : "";
  const [f, setF] = useState({
    imageId: row.image_id || "",
    useCase: row.usecase || row.organization || "",
    location: row.location || "",
    version: "", region: "", sensor: "", bandset: "",
    latitude: "", longitude: "", centreCoords: "",
    industry: "", lbc: "", s3Url: "",
    dateOfCapture: row.created_at ? String(row.created_at).slice(0, 10) : "",
    thumbnailUrl: evidenceUrl,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Plain render helper (NOT a nested component — that would drop input focus each keystroke).
  const field = (label, k, opts = {}) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: opts.wide ? "1 / -1" : "auto" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
      <input type={opts.type || "text"} value={f[k]} placeholder={opts.ph || ""}
        onChange={(e) => set(k, e.target.value)}
        style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit" }} />
    </label>
  );

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hubspot-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: "push_mvp_to_notion", qc_id: row.id, fields: f }),
      });
      const data = await res.json();
      if (data.ok) { toast("✓ Added to FF Sample Image Ammo in Notion"); onDone(); }
      else toast("Notion: " + (data.error || "not configured yet"));
    } catch (e) { toast("Notion push failed: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(11,18,32,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(680px,100%)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px -12px rgba(11,18,32,.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontFamily: "var(--font-display)" }}>Sync image to Notion</h3>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>FF Sample Image Ammo{deal ? ` · ${deal.company}` : ""}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Fill in as much as you have — blanks are skipped. Fields match the Sample Ammo database; <b>Latitude &amp; Longitude</b> are needed for the image to show on the map.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Image ID", "imageId", { ph: "e.g. 15687" })}
            {field("Version", "version")}
            {field("Use Case", "useCase", { wide: true })}
            {field("Location", "location")}
            {field("Region", "region")}
            {field("Latitude", "latitude", { type: "number", ph: "-13.57" })}
            {field("Longitude", "longitude", { type: "number", ph: "-46.03" })}
            {field("Sensor", "sensor", { ph: "FF01 / FF02 …" })}
            {field("Bandset", "bandset")}
            {field("Industry", "industry", { ph: "comma-separated", wide: true })}
            {field("Centre coordinates", "centreCoords", { wide: true })}
            {field("LBC (10x10) URL", "lbc", { wide: true })}
            {field("S3 URL L2A", "s3Url", { wide: true })}
            {field("Date of capture", "dateOfCapture", { type: "date" })}
            {field("Thumbnail URL", "thumbnailUrl", { wide: true })}
          </div>
          {evidenceUrl && <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--muted2)" }}>Thumbnail prefilled from the QC evidence image.</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--line)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", color: "var(--muted)", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--ink)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: saving ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {saving ? <><RefreshCw size={13} className="spin" /> Syncing…</> : <><Send size={13} /> Sync to Notion</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// MVP Images — QC entries flagged as MVP for this deal, with Notion push
function MvpImagesGlobal({ deals, canEdit, onOpen, toast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncRow, setSyncRow] = useState(null);

  const dealById = {};
  (deals || []).forEach(d => { dealById[d.id] = d; });

  const load = async () => {
    setLoading(true);
    try { setRows(await sbGet("quality_checks", `?mvp_image=eq.true&order=created_at.desc&limit=500`)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Export the MVP table as a CSV shaped for the Notion "FF Sample Image Ammo"
  // database. Columns mirror that database so it imports/merges cleanly.
  const downloadCsv = () => {
    // CSV-escape: wrap in quotes, double any internal quotes
    const esc = (v) => {
      const s = (v === null || v === undefined) ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const headers = ["Region","Bandset","Industry","Use Case","Date of capture","Location","Version","Organization","QC Result","Type","Assignee","QC Notes","Evidence URL"];
    const lines = [headers.map(esc).join(",")];
    for (const r of rows) {
      const deal = dealById[r.passport_id];
      const evidenceUrl = r.photo_evidence_path ? `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${r.photo_evidence_path}` : "";
      const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" }) : "";
      lines.push([
        "",                       // Region — fill on import
        r.bandset || "",          // Bandset (from IPR)
        "",                       // Industry — fill on import
        r.usecase || "",          // Use Case
        dateStr,                  // Date of capture (QC entry date)
        r.location || "",         // Location
        r.image_id || "",         // Version / Image ID
        r.organization || (deal ? deal.company : ""),
        r.qc_result || "",
        r.type || "",
        r.assignee || "",
        r.qc_notes || "",
        evidenceUrl,
      ].map(esc).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mvp-images-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("CSV downloaded — import it into Notion via Import → CSV");
  };

  return (
    <div className="cp-page-inner">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 6, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 2 }}>MVP Images</h2>
          <div style={{ fontSize:13, color:"var(--muted)" }}>{rows.length} image{rows.length !== 1 ? "s" : ""} flagged as MVP across all deals</div>
        </div>
        {rows.length > 0 && (
          <button onClick={downloadCsv}
            style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:9,
              border:"none", background:"#0B1220", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer",
              boxShadow:"0 2px 8px -2px rgba(11,18,32,.4)" }}>
            <Download size={14} /> Download CSV for Notion
          </button>
        )}
      </div>
      <div style={{ fontSize:12.5, color:"var(--muted)", marginBottom:16 }}>
        Any Quality Check entry with "MVP image" ticked appears here automatically. Use <strong>Download CSV for Notion</strong> to export this table, then in Notion open the FF Sample Image Ammo database and choose <strong>•••  →  Merge with CSV</strong> (or Import → CSV) to pull these in.
      </div>

      {loading ? <div className="empty"><RefreshCw size={15} className="spin" /> Loading…</div> : (
        rows.length ? (
          <div style={{ overflowX: "auto", background:"#fff", border:"1px solid var(--line)", borderRadius: 14 }}>
            <table className="qc-table">
              <thead>
                <tr>
                  <th>Thumbnail</th><th>Organization</th><th>Use Case</th><th>Image ID / Version</th>
                  <th>Type</th><th>QC</th><th>Location</th><th>Deal</th><th>Notion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const deal = dealById[r.passport_id];
                  return (
                    <tr key={r.id}>
                      <td>
                        {r.photo_evidence_path ? (
                          <a href={`${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${r.photo_evidence_path}`} target="_blank" rel="noreferrer">
                            <img src={`${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${r.photo_evidence_path}`}
                              alt={r.image_id || ""} style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 6, display: "block", background: "var(--line-soft)" }} />
                          </a>
                        ) : <div style={{ width:46, height:46, borderRadius:6, background:"var(--line-soft)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted2)" }}><Camera size={16} /></div>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.organization}</td>
                      <td>{r.usecase || "—"}</td>
                      <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{r.image_id || "—"}</td>
                      <td><span className="tag" style={{ background: r.type === "Paid" ? "var(--accent-soft)" : "var(--line-soft)", color: r.type === "Paid" ? "var(--accent-deep)" : "var(--muted)" }}>{r.type}</span></td>
                      <td><span className="tag" style={{ background: r.qc_result === "Pass" ? "#E3F7EC" : r.qc_result === "Fail" ? "#FCE9E7" : "#FEF3E0", color: r.qc_result === "Pass" ? "#1f8a57" : r.qc_result === "Fail" ? "#c0392b" : "#B5720E", fontWeight:600 }}>{r.qc_result}</span></td>
                      <td style={{ fontSize:12, color:"var(--muted)" }}>{r.location || "—"}</td>
                      <td>{deal ? <button onClick={() => onOpen(deal.id)} style={{ border:"none", background:"none", color:"var(--accent-deep)", cursor:"pointer", fontSize:12.5, padding:0, textDecoration:"underline" }}>{deal.company}</button> : <span style={{ color:"var(--muted2)", fontSize:12 }}>—</span>}</td>
                      <td>
                        {canEdit && (
                          r.notion_page_id ? (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, color:"var(--muted)", whiteSpace:"nowrap" }}>
                              <CheckCircle2 size={11} color="var(--ok)" /> In Notion
                            </span>
                          ) : (
                            <button onClick={() => setSyncRow(r)}
                              style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:7, border:"1px solid var(--line)", background:"#fff", color:"var(--accent-deep)", fontSize:11.5, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap" }}>
                              <ExternalLink size={11} /> Add details &amp; sync
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="empty"><Star size={15} /> No MVP images yet. Tick "MVP image" on a Quality Check entry to add one here.</div>
      )}
      {syncRow && (
        <MvpSyncModal row={syncRow} deal={dealById[syncRow.passport_id] || null}
          onClose={() => setSyncRow(null)} onDone={() => { setSyncRow(null); load(); }} toast={toast} />
      )}
    </div>
  );
}

// Tracks whether a deal has been formally handed to CS and/or Analytics.
// Independent toggles since the two handovers often happen at different times.
function HandoverStatus({ d, canEdit, onUpdate }) {
  const h = d.handover || {};
  const toggle = (team, isOn) => onUpdate({ _handoverToggle: { team, value: !isOn } });
  const [handbackOpen, setHandbackOpen] = useState(false);
  const [handbackNote, setHandbackNote] = useState("");
  const se = d.owners ? d.owners.se : null;

  const Row = ({ team, label, on, at, by, assignee, accent }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
      border: "1px solid " + (on ? "#bfe6cf" : "var(--line)"),
      background: on ? "#F2FBF6" : "#fff", flex: 1, minWidth: 240,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
        background: on ? "#E3F7EC" : "var(--line-soft)",
      }}>
        {on ? <CheckCircle2 size={18} color="#1f8a57" /> : <ArrowRightCircle size={18} color={accent} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted2)" }}>
          Handover to {label}
        </div>
        {on ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1f8a57" }}>
            Handed over{assignee ? ` to ${assignee}` : ""}
            <div style={{ fontSize: 10.5, fontWeight: 400, color: "var(--muted2)" }}>
              {at ? new Date(at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : ""}{by ? ` · by ${by}` : ""}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
            {assignee ? assignee : "Awaiting handover"}
            <div style={{ fontSize: 10.5, fontWeight: 400, color: "var(--muted2)" }}>Not yet handed over</div>
          </div>
        )}
      </div>
      {canEdit && (
        <button onClick={() => toggle(team, on)}
          style={{
            flex: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: "1px solid " + (on ? "var(--line)" : accent),
            background: on ? "#fff" : accent, color: on ? "var(--muted)" : "#fff",
          }}>
          {on ? "Undo" : "Mark handed over"}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted2)", marginBottom: 8 }}>
        Handover status
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Row team="cs" label="Customer Success" on={h.cs} at={h.csAt} by={h.csBy} assignee={d.owners ? d.owners.cs : null} accent="#E07A2B" />
        <Row team="analytics" label="Analytics" on={h.analytics} at={h.analyticsAt} by={h.analyticsBy} assignee={d.owners ? d.owners.analytics : null} accent="#7A5AF5" />

        {/* Hand back to SE — the ball is in the SE's court for the next step */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
          border: "1px solid " + (h.backToSe ? "#F0C99A" : "var(--line)"),
          background: h.backToSe ? "#FEF6EC" : "#fff", flex: 1, minWidth: 240,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
            background: h.backToSe ? "#FCEBD3" : "var(--line-soft)",
          }}>
            <ArrowRightCircle size={18} color={h.backToSe ? "#C77C1E" : "var(--se)"} style={h.backToSe ? { transform: "scaleX(-1)" } : undefined} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted2)" }}>Next step owned by SE</div>
            {h.backToSe ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#B5720E" }}>
                Handed back to SE{se ? ` · ${se}` : ""}
                {h.backToSeNote && <div style={{ fontSize: 11.5, fontWeight: 400, color: "var(--muted)", marginTop: 2 }}>“{h.backToSeNote}”</div>}
                <div style={{ fontSize: 10.5, fontWeight: 400, color: "var(--muted2)" }}>
                  {h.backToSeAt ? new Date(h.backToSeAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : ""}{h.backToSeBy ? ` · by ${h.backToSeBy}` : ""}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                {se || "No SE assigned"}
                <div style={{ fontSize: 10.5, fontWeight: 400, color: "var(--muted2)" }}>SE not flagged for next step</div>
              </div>
            )}
          </div>
          {canEdit && (h.backToSe
            ? <button onClick={() => onUpdate({ _handbackToSe: { value: false } })}
                style={{ flex: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--line)", background: "#fff", color: "var(--muted)" }}>Clear</button>
            : <button onClick={() => setHandbackOpen(o => !o)}
                style={{ flex: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #C77C1E", background: "#C77C1E", color: "#fff" }}>Hand back to SE</button>
          )}
        </div>
      </div>

      {canEdit && handbackOpen && !h.backToSe && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={handbackNote} onChange={e => setHandbackNote(e.target.value)} autoFocus
            placeholder="What does the SE need to do? (optional)"
            onKeyDown={e => { if (e.key === "Enter") { onUpdate({ _handbackToSe: { value: true, note: handbackNote.trim() } }); setHandbackOpen(false); setHandbackNote(""); } }}
            style={{ flex: 1, minWidth: 260, border: "1px solid var(--accent)", borderRadius: 8, padding: "8px 11px", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
          <button onClick={() => { onUpdate({ _handbackToSe: { value: true, note: handbackNote.trim() } }); setHandbackOpen(false); setHandbackNote(""); }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#C77C1E", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Confirm hand-back</button>
          <button onClick={() => { setHandbackOpen(false); setHandbackNote(""); }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", color: "var(--muted)", fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function Passport({ deal, onBack, canEdit, canPostNote, onUpdate, onAssign, onNotifyAll, onPostToSlack, onPushPlanhat, slackChannel, slackSending, slackStatus, toast }) {
  const [tab, setTab] = useState("profile");
  const [showChecklist, setShowChecklist] = useState(false);
  const [assignOpen, setAssignOpen] = useState(null);
  const { score, items } = readiness(deal);
  const missing = items.filter(i => !i.done);

  const assign = (role, name) => {
    onAssign(role, name);
    setAssignOpen(null);
  };

  return (
    <>
      <button className="cp-back" onClick={onBack}><ChevronLeft size={16} /> All deals</button>

      {deal.archived && (
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"#c0392b", background:"#FCE9E7", border:"1px solid #f0c4bf", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
          <AlertTriangle size={15} />
          <span><strong>Archived</strong> — no longer found in HubSpot{deal.archivedAt ? ` as of ${new Date(deal.archivedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}` : ""}. {deal.archivedReason || "Nothing has been deleted; this passport's history is fully preserved."}</span>
        </div>
      )}

      {/* header */}
      <div className="cp-head">
        <div className="spectral" />
        <div className="grat" />
        <div className="htop">
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {deal.company}
              <button onClick={() => canEdit && onUpdate({ _toggleEap: { value: !deal.isEap } })} disabled={!canEdit}
                title={canEdit ? "Toggle Early Access Program" : ""}
                style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", padding: "3px 9px", borderRadius: 20,
                  border: "1px solid " + (deal.isEap ? "#F0A429" : "var(--line)"),
                  background: deal.isEap ? "#FEF3E0" : "transparent",
                  color: deal.isEap ? "#B5720E" : "var(--muted2)",
                  cursor: canEdit ? "pointer" : "default", textTransform: "uppercase",
                }}>
                {deal.isEap ? "★ EAP" : "+ EAP"}
              </button>
            </h1>
            <div className="hsub">
              <span>{deal.sector}</span><span className="dot" />
              <span className="mono">HubSpot {deal.hubspotId}</span><span className="dot" />
              <span>{fmt(deal.amount)} ACV</span>
            </div>
          </div>
          <div className="h-actions">
            <button className="btn ghost" onClick={() => {
              const url = new URL(window.location.origin + window.location.pathname);
              url.searchParams.set("deal", deal.id);
              navigator.clipboard.writeText(url.toString());
              toast("Link copied — share it with anyone on the team");
            }}>
              <Link2 size={14} /> Copy link
            </button>
            <button className="btn ghost" onClick={() => exportPassportPdf(deal)}>
              <Download size={14} /> Export PDF
            </button>
            <button className="btn ghost" onClick={onPushPlanhat}>
              <ExternalLink size={14} /> Push to PlanHat
            </button>
            <button className={`btn slack${slackSending ? " sending" : ""}`} onClick={onPostToSlack}>
              <MessageSquare size={14} /> {slackSending ? "Posting…" : `Post to ${slackChannel ? slackChannel.name : "Slack"}`}
            </button>
            <button className="btn solid" onClick={onNotifyAll}>
              <Bell size={14} /> Notify owners
            </button>
          </div>
        </div>

        {slackStatus && (
          <div className={`slack-status${slackStatus.ok ? "" : " err"}`}>
            {slackStatus.ok ? <CheckCheck size={14} /> : <AlertTriangle size={14} />}
            {slackStatus.msg}
          </div>
        )}

        {/* stage bar */}
        <div className="stage-bar">
          {STAGES.map((s, i) => (
            <div key={i} className={"stage-seg " + (i < deal.stage ? "done" : i === deal.stage ? "cur" : "")}>
              <div className="bar" />
              <div className="lbl">{s}</div>
            </div>
          ))}
        </div>
        <div className="hs-writeback">
          <span className="hs-dot" /> Stage, amount &amp; deal owner sync live with HubSpot · {deal.hubspotId}
        </div>
        {deal.lastContact && (() => {
          const lc = deal.lastContact;
          const warmthLabel = lc.daysAgo <= 3 ? "Warm" : lc.daysAgo <= 14 ? "Cooling" : "Cold";
          const dotCls = lc.daysAgo <= 3 ? "warm" : lc.daysAgo <= 14 ? "cool" : "cold";
          return (
            <div className="last-contact">
              <div className="lc-item"><span className="lc-label">Last HubSpot contact</span> {lc.date}</div>
              <div className="lc-item"><span className="lc-label">Owner</span> {lc.owner}</div>
              <div className="lc-item"><span className={`lc-dot ${dotCls}`} /> {warmthLabel} — {lc.daysAgo}d ago</div>
            </div>
          );
        })()}
      </div>

      {/* ownership + readiness */}
      <div className="cp-railrow">
        <div className="owners-panel">
          {ORDER.map(role => {
            const short = ROLE_SHORT[role];
            const name = deal.owners[role];
            const label = ROLE_LABEL[role];
            const isOwnerRole = role === "owner";
            const editable = canEdit && !isOwnerRole;
            return (
              <div className="owner-slot" key={role}>
                <OwnerAvatar name={name} role={short} />
                <div className="meta">
                  <div className="role-tag">{label}{isOwnerRole && <span style={{fontSize:10,color:"var(--muted2)",marginLeft:4}}>via HubSpot</span>}</div>
                  {name ? (
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div
                        className="nm"
                        style={editable ? {cursor:"pointer",textDecoration:"underline dotted",textUnderlineOffset:3} : {}}
                        onClick={editable ? () => setAssignOpen(assignOpen === role ? null : role) : undefined}
                        title={editable ? "Click to reassign" : undefined}
                      >{name}</div>
                      {editable && <button onClick={() => assign(role, null)} style={{fontSize:11,color:"var(--muted2)",lineHeight:1,padding:"0 2px"}} title="Clear assignment">✕</button>}
                    </div>
                  ) : (
                    editable
                      ? <button className="assign" onClick={() => setAssignOpen(assignOpen === role ? null : role)}>+ Assign owner</button>
                      : <div className="nm" style={{ color: "var(--muted2)" }}>Unassigned</div>
                  )}
                </div>
                {assignOpen === role && editable && (
                  <div className="assign-menu">
                    {TEAM[role].map(p => (
                      <button key={p} onClick={() => assign(role, p)} style={p === name ? {fontWeight:600,color:"var(--accent)"} : {}}>{p}{p === name ? " ✓" : ""}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="readiness-panel" onClick={() => setShowChecklist(s => !s)}>
          <Ring value={score} size={58} stroke={6} />
          <div className="txt">
            <div className="k">Handover readiness</div>
            <div className="v">{score === 100 ? "Ready" : missing.length + " items left"}</div>
            <small>{showChecklist ? "Hide checklist" : "View checklist"}</small>
          </div>
        </div>
      </div>

      <HandoverStatus d={deal} canEdit={canEdit} onUpdate={onUpdate} />

      {/* Additional collaborators */}
      <CollaboratorsRow
        collaborators={deal.collaborators || []}
        canEdit={canEdit}
        onAdd={(person) => onUpdate({ _addCollaborator: person })}
        onDelete={(id) => onUpdate({ _deleteRecord: { table:"deal_collaborators", id } })}
      />

      {showChecklist && (
        <div className="checklist">
          <h4>What's needed for a clean SE → CS handover</h4>
          <div className="items">
            {items.map((it, i) => (
              <div key={i} className={"cl-item " + (it.done ? "" : "miss")}>
                {it.done ? <CheckCircle2 size={16} color="var(--ok)" /> : <Circle size={16} color="var(--muted2)" />}
                {it.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* tabs */}
      <div className="cp-tabs">
        {[["profile", Building2, "Profile"], ["context", Target, "Context"], ["execution", Activity, "Execution"], ["csummary", LayoutGrid, "CS Summary"], ["qc", Camera, "Quality Checks"], ["notes", FileText, "Notes"], ["feedback", MessageSquare, "Customer Feedback"]].map(([k, Ic, lbl]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Ic size={15} />{lbl}</button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab d={deal} canEdit={canEdit} onSaveField={(f,v) => onUpdate({ _fieldUpdate: { field: f, value: v } })} onUpdate={onUpdate} />}
      {tab === "context" && <ContextTab d={deal} canEdit={canEdit} onSaveField={(f,v) => onUpdate({ _fieldUpdate: { field: f, value: v } })} onUpdate={onUpdate} />}
      {tab === "execution" && <ExecutionTab d={deal} canEdit={canEdit} onUpdate={onUpdate} onSaveField={(f,v) => onUpdate({ _fieldUpdate: { field: f, value: v } })} />}
      {tab === "csummary" && <CSSummaryTab d={deal} canEdit={canEdit} onUpdate={onUpdate} onSaveField={(f,v) => onUpdate({ _fieldUpdate: { field: f, value: v } })} />}
      {tab === "notes" && <NotesTab d={deal} canEdit={canEdit} canPostNote={canPostNote} onUpdate={onUpdate} toast={toast} />}
      {tab === "qc" && <QcTab d={deal} canEdit={canEdit} toast={toast} />}
      {tab === "feedback" && <FeedbackTab d={deal} canEdit={canEdit} onUpdate={onUpdate} toast={toast} />}
    </>
  );
}

/* ---- tab blocks ---- */
function SecStamp({ stamp }) {
  if (!stamp || !stamp.by) return null;
  return <span className="sec-stamp"><Clock size={10} /> {stamp.by} · {stamp.at}</span>;
}

function Block({ icon: Ic, title, children, action, stamp }) {
  return (
    <div className="block">
      <div className="bhead">
        <div className="lhs"><div className="ic"><Ic size={15} /></div><h3>{title}</h3></div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {stamp && <SecStamp stamp={stamp} />}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}
// Link-or-upload control: paste a URL or upload a file
// Up to 10 feasibility / supporting files — each either an uploaded file or a link
function FeasibilityFiles({ files, canEdit, onUpload, onAddLink, onRemove, title = "Feasibility & supporting files", accept, icon: RowIcon = FileText, showLink = true }) {
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const list = files || [];
  const atLimit = list.length >= 10;
  const inputId = `feas-${Math.random().toString(36).slice(2,7)}`;
  const isLink = (f) => f.type === "link";
  const isInline = (f) => f.type === "geojson";  // AOI imported into the list (inline GeoJSON, no storage file)
  const downloadInline = (f) => {
    const blob = new Blob([JSON.stringify(f.geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = (f.name || "aoi").replace(/\.geojson$/i, "") + ".geojson";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const submitLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    onAddLink(linkName.trim() || url, /^https?:\/\//.test(url) ? url : `https://${url}`);
    setLinkName(""); setLinkUrl(""); setLinkOpen(false);
  };
  return (
    <div>
      <div className="k" style={{ marginBottom: 6 }}>{title} <span style={{ color:"var(--muted2)", fontWeight:400 }}>({list.length}/10)</span></div>
      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {list.map((f, i) => (
            <div key={i} className="attach" style={{ margin: 0 }}>
              <div className="ai">{isLink(f) ? <Link2 size={15} /> : <RowIcon size={15} />}</div>
              <div><div className="an2">{f.name}</div><div className="as">{isLink(f) ? "LINK" : isInline(f) ? "GEOJSON" : "FILE"}</div></div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                {isInline(f) ? (
                  <button onClick={() => downloadInline(f)} title="Download" style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "inline-flex" }}>
                    <Download size={14} color="var(--muted2)" />
                  </button>
                ) : (
                  <a href={isLink(f) ? f.url : `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${f.url}`} target="_blank" rel="noreferrer">
                    {isLink(f) ? <ExternalLink size={14} color="var(--muted2)" /> : <Download size={14} color="var(--muted2)" />}
                  </a>
                )}
                {canEdit && <button onClick={() => onRemove(i)} title="Remove" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:13 }}>✕</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {canEdit && !atLimit && (
        <>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <label htmlFor={inputId} className="add-row" style={{ cursor: busy?"wait":"pointer", margin:0, flex:1, minWidth:120 }}>
              <Upload size={13} /> {busy ? "Uploading…" : "Upload file"}
            </label>
            {showLink && (
              <button onClick={() => setLinkOpen(o => !o)} className="add-row" style={{ margin:0, flex:1, minWidth:120 }}>
                <Link2 size={13} /> Add link
              </button>
            )}
          </div>
          <input id={inputId} type="file" accept={accept} style={{ display:"none" }}
            onChange={async (e) => { const f = e.target.files[0]; if (!f) return; setBusy(true); try { await onUpload(f); } finally { setBusy(false); e.target.value=""; } }} />
          {linkOpen && (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
              <input autoFocus placeholder="Label (e.g. Feasibility report Q1)" value={linkName} onChange={e => setLinkName(e.target.value)}
                style={{ border:"1px solid var(--line)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <input placeholder="Paste URL (https://…)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitLink(); if (e.key === "Escape") setLinkOpen(false); }}
                style={{ border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={submitLink} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Add link</button>
                <button onClick={() => setLinkOpen(false)} style={{ padding:"6px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
      {atLimit && <div style={{ fontSize: 11.5, color: "var(--muted2)" }}>Maximum of 10 files reached.</div>}
    </div>
  );
}

/* ── Time of Interest ──────────────────────────────────────────────
   One or more capture windows the customer wants imagery for.
   Stored as [{start:'YYYY-MM-DD', end:'YYYY-MM-DD', label}] in the
   time_of_interest jsonb column. Supports a whole-month shortcut and
   arbitrary date ranges; multiple windows cover phased capture plans
   (e.g. 1–15 Aug, then 1–15 Sep, then 1–15 Oct). */
function TimeOfInterest({ windows, canEdit, onChange }) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState("month"); // 'month' | 'range'
  const [month, setMonth] = useState("");
  const [form, setForm] = useState({ start: "", end: "", label: "" });
  const list = windows || [];

  const fmtD = (s) => s ? new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
  // "July 2026" when a window spans exactly one full calendar month
  const windowLabel = (w) => {
    const s = new Date(w.start + "T00:00:00"), e = new Date(w.end + "T00:00:00");
    const lastDay = new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
    if (s.getDate() === 1 && e.getDate() === lastDay && s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return s.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    }
    return `${fmtD(w.start)} – ${fmtD(w.end)}`;
  };

  const reset = () => { setForm({ start: "", end: "", label: "" }); setMonth(""); setAdding(false); };
  const add = () => {
    let start = form.start, end = form.end;
    if (mode === "month") {
      if (!month) return;
      const [y, m] = month.split("-").map(Number);
      start = `${month}-01`;
      end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    }
    if (!start || !end) return;
    if (end < start) { const t = start; start = end; end = t; }
    onChange([...list, { start, end, label: form.label.trim() }]);
    reset();
  };
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));

  const inputStyle = { border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" };
  return (
    <div>
      <div className="k" style={{ marginBottom: 6 }}>Time of interest <span style={{ color: "var(--muted2)", fontWeight: 400 }}>· {list.length ? `${list.length} capture window${list.length !== 1 ? "s" : ""}` : "when should imagery be captured?"}</span></div>
      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {list.map((w, i) => (
            <div key={i} className="attach" style={{ margin: 0 }}>
              <div className="ai"><CalendarClock size={15} /></div>
              <div>
                <div className="an2">{windowLabel(w)}</div>
                <div className="as">{w.label ? w.label.toUpperCase() : `CAPTURE WINDOW ${i + 1}`}</div>
              </div>
              {canEdit && (
                <div style={{ marginLeft: "auto" }}>
                  <button onClick={() => remove(i)} title="Remove window" style={{ border: "none", background: "none", color: "var(--muted2)", cursor: "pointer", fontSize: 13 }}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="add-row" style={{ margin: 0 }}>
          <Plus size={13} /> Add capture window
        </button>
      )}
      {canEdit && adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4, border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "var(--line-soft, #f7f9fb)" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[["month", "Whole month"], ["range", "Date range"]].map(([m, lbl]) => (
              <button key={m} onClick={() => setMode(m)} type="button"
                style={{ flex: 1, padding: "6px 8px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: "1px solid " + (mode === m ? "var(--accent)" : "var(--line)"),
                  background: mode === m ? "var(--accent-soft, #E4F5F7)" : "transparent",
                  color: mode === m ? "var(--accent-deep, #0B7E8C)" : "var(--muted)" }}>{lbl}</button>
            ))}
          </div>
          {mode === "month" ? (
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={inputStyle} />
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="date" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
              <span style={{ alignSelf: "center", color: "var(--muted2)", fontSize: 12 }}>to</span>
              <input type="date" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
            </div>
          )}
          <input placeholder="Label (optional — e.g. First capture, Growing season)" value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") reset(); }}
            style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={add} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Add window</button>
            <button onClick={reset} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
      {!canEdit && list.length === 0 && <div style={{ fontSize: 12, color: "var(--muted2)" }}>No capture windows defined.</div>}
    </div>
  );
}

function LinkOrUpload({ label, icon: Icon, canEdit, currentUrl, accept, onSetLink, onUploadFile, emptyLabel }) {
  const [mode, setMode] = useState(null); // null | 'link'
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const inputId = `lou-${label.replace(/\s/g,"")}-${Math.random().toString(36).slice(2,6)}`;

  if (currentUrl) {
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
        <a className="link" href={currentUrl} target="_blank" rel="noreferrer"><Icon size={13} /> {label} <ExternalLink size={12} /></a>
        {canEdit && <button onClick={() => onSetLink("")} title="Remove" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:12 }}>✕</button>}
      </span>
    );
  }

  if (!canEdit) {
    return <span className="empty" style={{ flex:"none", padding:"7px 11px" }}><Icon size={13} /> {emptyLabel}</span>;
  }

  if (mode === "link") {
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
        <input autoFocus placeholder="Paste URL…" value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && url.trim()) { onSetLink(url.trim()); setMode(null); setUrl(""); } if (e.key==="Escape") setMode(null); }}
          style={{ border:"1px solid var(--accent)", borderRadius:7, padding:"6px 10px", fontSize:12.5, fontFamily:"inherit", outline:"none", width:220 }} />
        <button onClick={() => { if (url.trim()) { onSetLink(url.trim()); setMode(null); setUrl(""); } }}
          style={{ padding:"5px 10px", borderRadius:6, border:"none", background:"var(--accent)", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Save</button>
        <button onClick={() => setMode(null)} style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:12 }}>✕</button>
      </span>
    );
  }

  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
      <span className="empty" style={{ flex:"none", padding:"7px 11px" }}><Icon size={13} /> {emptyLabel}</span>
      <button onClick={() => setMode("link")} style={{ border:"1px solid var(--line)", background:"transparent", borderRadius:6, padding:"5px 9px", fontSize:11.5, color:"var(--accent)", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}><Link2 size={12}/> Link</button>
      <label htmlFor={inputId} style={{ border:"1px solid var(--line)", background:"transparent", borderRadius:6, padding:"5px 9px", fontSize:11.5, color:"var(--accent)", cursor: busy?"wait":"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>
        <Upload size={12}/> {busy?"…":"Upload"}
      </label>
      <input id={inputId} type="file" accept={accept} style={{ display:"none" }}
        onChange={async (e) => { const f = e.target.files[0]; if (!f) return; setBusy(true); try { await onUploadFile(f); } finally { setBusy(false); e.target.value=""; } }} />
    </span>
  );
}

// Inline-editable dropdown with optional "Custom" free-text option
function EditableSelect({ k, value, field, canEdit, onSave, options, customLabel = "Custom" }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  // Determine if current value is one of the preset options or a custom string
  const isPreset = options.includes(value);
  const [choice, setChoice] = useState(isPreset ? value : (value ? customLabel : ""));
  const [customText, setCustomText] = useState(isPreset ? "" : (value || ""));
  useEffect(() => {
    const preset = options.includes(value);
    setChoice(preset ? value : (value ? customLabel : ""));
    setCustomText(preset ? "" : (value || ""));
  }, [value]);

  const save = async () => {
    setSaving(true);
    try {
      const final = choice === customLabel ? customText.trim() : choice;
      await onSave(field, final);
      setEditing(false);
    } finally { setSaving(false); }
  };

  if (!canEdit) {
    return <div><div className="k">{k}</div><div className="v">{value || <span style={{ color:"var(--muted2)" }}>Not captured yet</span>}</div></div>;
  }

  if (editing) {
    return (
      <div>
        <div className="k">{k}</div>
        <select autoFocus value={choice} onChange={e => setChoice(e.target.value)}
          style={{ width:"100%", border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", marginTop:4, outline:"none" }}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
          <option value={customLabel}>{customLabel}…</option>
        </select>
        {choice === customLabel && (
          <input autoFocus placeholder="Describe the custom bandset…" value={customText} onChange={e => setCustomText(e.target.value)}
            style={{ width:"100%", border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", marginTop:6, outline:"none" }} />
        )}
        <div style={{ display:"flex", gap:8, marginTop:6 }}>
          <button onClick={save} disabled={saving} style={{ padding:"5px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => setEditing(false)} style={{ padding:"5px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="k">{k}</div>
      <div className="v" onClick={() => setEditing(true)}
        style={{ cursor:"pointer", borderRadius:6, padding:"2px 4px", margin:"-2px -4px" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--line-soft)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        title="Click to edit">
        {value || <span style={{ color:"var(--muted2)" }}>Not captured yet · <span style={{ color:"var(--accent)" }}>click to add</span></span>}
      </div>
    </div>
  );
}

const BANDSET_OPTIONS = [
  "Vegetation","Water","Rare Earth Elements","Transitional Metals","Urban",
  "Unified-1","Unified-2","Unified-3","All Bands","Sentinel-2 MSI","Landsat-9 OLI-2",
];

// Lightweight rich-text renderer: **bold**, *italic*, line breaks, - bullets
function renderRichText(text) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const out = [];
  let bullets = [];
  const flushBullets = (key) => {
    if (bullets.length) {
      out.push(<ul key={"ul"+key} style={{ margin:"4px 0", paddingLeft:18 }}>{bullets.map((b,i) => <li key={i} style={{ marginBottom:2 }}>{b}</li>)}</ul>);
      bullets = [];
    }
  };
  const inline = (s) => {
    // Split on **bold** and *italic*
    const parts = [];
    let rem = s; let k = 0;
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0; let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith("**")) parts.push(<strong key={k++}>{tok.slice(2,-2)}</strong>);
      else parts.push(<em key={k++}>{tok.slice(1,-1)}</em>);
      last = m.index + tok.length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts;
  };
  lines.forEach((ln, i) => {
    const trimmed = ln.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bullets.push(inline(trimmed.slice(2)));
    } else {
      flushBullets(i);
      if (trimmed) out.push(<div key={"l"+i} style={{ marginBottom:3 }}>{inline(ln)}</div>);
    }
  });
  flushBullets("end");
  return <div>{out}</div>;
}

function Field({ k, children }) {
  return <div><div className="k">{k}</div><div className="v">{children || <span style={{ color: "var(--muted2)" }}>Not captured yet</span>}</div></div>;
}

// Inline-editable text field. Click to edit (when canEdit), textarea with save/cancel.
function EditableField({ k, value, field, canEdit, onSave, mono, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(value || ""); }, [value]);

  const save = async () => {
    setSaving(true);
    try { await onSave(field, draft.trim()); setEditing(false); }
    finally { setSaving(false); }
  };

  if (!canEdit) {
    return <div><div className="k">{k}</div><div className="v">{value || <span style={{ color: "var(--muted2)" }}>Not captured yet</span>}</div></div>;
  }

  if (editing) {
    return (
      <div>
        <div className="k">{k}</div>
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder || "Type here…"}
          style={{
            width:"100%", border:"1px solid var(--accent)", borderRadius:9,
            padding:"9px 12px", fontSize:13.5, fontFamily: mono ? "var(--font-mono)" : "inherit",
            marginTop:4, resize:"vertical", minHeight:64, outline:"none",
          }}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); if (e.key === "Escape") { setDraft(value||""); setEditing(false); } }}
        />
        <div style={{ display:"flex", gap:8, marginTop:6 }}>
          <button onClick={save} disabled={saving}
            style={{ padding:"5px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => { setDraft(value||""); setEditing(false); }}
            style={{ padding:"5px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>
            Cancel
          </button>
          <span style={{ fontSize:11, color:"var(--muted2)", alignSelf:"center" }}>⌘↵ to save · Esc to cancel · **bold** *italic* · - bullets</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="k">{k}</div>
      <div
        className="v"
        onClick={() => setEditing(true)}
        style={{ cursor:"pointer", borderRadius:6, padding:"2px 4px", margin:"-2px -4px", transition:"background 0.12s" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--line-soft)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        title="Click to edit"
      >
        {value ? renderRichText(value) : <span style={{ color: "var(--muted2)" }}>Not captured yet · <span style={{ color:"var(--accent)" }}>click to add</span></span>}
      </div>
    </div>
  );
}

// Inline-editable comma-separated tags (e.g. data sources).
function EditableTags({ k, values, field, canEdit, onSave, cls, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState((values || []).join(", "));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft((values || []).join(", ")); }, [values]);

  const save = async () => {
    setSaving(true);
    try {
      const arr = draft.split(",").map(s => s.trim()).filter(Boolean);
      await onSave(field, arr);
      setEditing(false);
    } finally { setSaving(false); }
  };

  if (editing && canEdit) {
    return (
      <div>
        <div className="k">{k}</div>
        <input
          autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={placeholder || "Comma-separated, e.g. FireFly VNIR, Sentinel-2, PlanetScope"}
          style={{ width:"100%", border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", marginTop:4, outline:"none" }}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft((values||[]).join(", ")); setEditing(false); } }}
        />
        <div style={{ display:"flex", gap:8, marginTop:6 }}>
          <button onClick={save} disabled={saving} style={{ padding:"5px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => { setDraft((values||[]).join(", ")); setEditing(false); }} style={{ padding:"5px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="k">{k}</div>
      <div className="tags" style={{ marginTop: 4, cursor: canEdit ? "pointer" : "default" }}
        onClick={() => canEdit && setEditing(true)} title={canEdit ? "Click to edit" : undefined}>
        {(values && values.length) ? values.map((s, i) => <span key={i} className={`tag ${cls||""}`}>{s}</span>)
          : <span style={{ color: "var(--muted2)", fontSize: 13 }}>Not captured yet{canEdit && <span style={{ color:"var(--accent)" }}> · click to add</span>}</span>}
      </div>
    </div>
  );
}

// Inline-editable bullet list (objectives, success criteria).
function EditableList({ items, field, canEdit, onSave, emptyIcon: EmptyIcon, emptyText }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState((items || []).join("\n"));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft((items || []).join("\n")); }, [items]);

  const save = async () => {
    setSaving(true);
    try {
      const arr = draft.split("\n").map(s => s.trim()).filter(Boolean);
      await onSave(field, arr);
      setEditing(false);
    } finally { setSaving(false); }
  };

  if (editing && canEdit) {
    return (
      <div>
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="One item per line"
          style={{ width:"100%", border:"1px solid var(--accent)", borderRadius:9, padding:"9px 12px", fontSize:13.5, fontFamily:"inherit", resize:"vertical", minHeight:90, outline:"none" }}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); if (e.key === "Escape") { setDraft((items||[]).join("\n")); setEditing(false); } }}
        />
        <div style={{ display:"flex", gap:8, marginTop:6 }}>
          <button onClick={save} disabled={saving} style={{ padding:"5px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => { setDraft((items||[]).join("\n")); setEditing(false); }} style={{ padding:"5px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
          <span style={{ fontSize:11, color:"var(--muted2)", alignSelf:"center" }}>One per line · ⌘↵ to save</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => canEdit && setEditing(true)} style={{ cursor: canEdit ? "pointer" : "default" }} title={canEdit ? "Click to edit" : undefined}>
      {(items && items.length) ? items.map((o, i) => (
        <div className="li" key={i}><span className="b" />{o}</div>
      )) : <div className="empty"><EmptyIcon size={15} /> {emptyText}{canEdit && <span style={{ color:"var(--accent)" }}> · click to add</span>}</div>}
    </div>
  );
}

function ProfileTab({ d, canEdit, onSaveField, onUpdate }) {
  const t = d.profile.tech;
  const st = d.sectionStamps || {};
  const links = d.links || {};
  return (
    <>
      <div className="cols">
        <Block icon={Building2} title="Company & contacts" stamp={st.profile}>
          <ContactsEditor contacts={d.profile.contacts} canEdit={canEdit}
            onAdd={(c) => onUpdate({ _addContact: c })}
            onDelete={(id) => onUpdate({ _deleteRecord: { table:"deal_contacts", id } })} />
        </Block>
        <Block icon={Users} title="Team & expertise">
          <div className="kv">
            <EditableSelect k="Expertise level" value={d.profile.expertiseLevel} field="expertise_level" canEdit={canEdit} onSave={onSaveField} options={["Beginner","Intermediate","Advanced","Expert"]} customLabel="Other" />
            <EditableField k="Customer team" value={d.profile.team} field="customer_team" canEdit={canEdit} onSave={onSaveField} />
          </div>
        </Block>
      </div>

      <Block icon={Target} title="Use case · pain points · support needs">
        <div className="kv">
          <EditableField k="Use case" value={d.profile.useCase} field="use_case" canEdit={canEdit} onSave={onSaveField} />
          <EditableField k="Pain points" value={d.profile.painPoints} field="pain_points" canEdit={canEdit} onSave={onSaveField} />
          <EditableField k="Support needs" value={d.profile.supportNeeds} field="support_needs" canEdit={canEdit} onSave={onSaveField} />
        </div>
      </Block>

      <Block icon={Star} title="What the customer wants">
        <div className="kv">
          <EditableTags k="Imagery priorities" values={d.profile.imageryPriorities} field="imagery_priorities" canEdit={canEdit} onSave={onSaveField} cls="spec"
            placeholder="Comma-separated, e.g. Spectral fidelity, Spatial resolution, Capture frequency, Coastal monitoring" />
          <EditableField k="Expected value from Pixxel" value={d.profile.expectedValue} field="expected_value" canEdit={canEdit} onSave={onSaveField}
            placeholder="What outcome/value does the customer expect, based on earlier conversations?" />
        </div>
      </Block>

      <Block icon={Radar} title="Technical requirements">
        <div className="kv">
          <EditableTags k="Data sources" values={t.dataSources} field="data_sources" canEdit={canEdit} onSave={onSaveField} cls="spec" />
          <EditableSelect k="Bandset" value={t.bandset} field="bandset" canEdit={canEdit} onSave={onSaveField} options={BANDSET_OPTIONS} customLabel="Custom" />
          <EditableField k="Cadence / revisit" value={t.cadence} field="cadence" canEdit={canEdit} onSave={onSaveField} />
          <TimeOfInterest
            windows={t.timeOfInterest} canEdit={canEdit}
            onChange={(w) => onUpdate({ _setToi: w })}
          />
          <FeasibilityFiles
            files={t.feasibilityFiles} canEdit={canEdit}
            onUpload={(file) => onUpdate({ _uploadFeasibilityFile: { file } })}
            onAddLink={(name, url) => onUpdate({ _addFeasibilityLink: { name, url } })}
            onRemove={(idx) => onUpdate({ _removeFeasibilityFile: { idx } })}
          />
          <FeasibilityFiles
            title="Area of interest — files" icon={MapPin}
            accept=".geojson,.json,.kml,.kmz,.zip,.shp,.gpkg"
            files={t.aoiFiles} canEdit={canEdit}
            onUpload={(file) => onUpdate({ _uploadAoiFile: { file } })}
            onAddLink={(name, url) => onUpdate({ _addAoiLink: { name, url } })}
            onRemove={(idx) => onUpdate({ _removeAoiFile: { idx } })}
          />
          <span style={{ fontSize:11.5, color:"var(--muted2)", display:"inline-flex", alignItems:"center", gap:5, marginTop:4 }}>
            <MapPin size={12} /> The interactive AOI map lives on the Context tab
          </span>
        </div>
      </Block>
    </>
  );
}

// Context-tab AOI: one list + one map. A legacy interactive AOI (aoi_geojson) is
// surfaced as the first list row (inline geojson) so already-uploaded AOIs appear
// in the list AND on the map automatically — no migration. Every list entry (that
// row + each uploaded file) is parsed and drawn together in one style.
function ContextAoi({ d, canEdit, onUpdate }) {
  const rawFiles = d.profile.tech.aoiFiles || [];
  const base = d.context.aoi || null;
  const baseEntry = base ? { name: "AOI (imported)", type: "geojson", geojson: base } : null;
  const listFiles = baseEntry ? [baseEntry, ...rawFiles] : rawFiles;

  const [mapGeo, setMapGeo] = useState(null);
  const key = listFiles.length + ":" + listFiles.map(f => f.url || (f.geojson ? "inline" : "")).join("|");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const feats = [];
      for (const f of listFiles) {
        if (f.type === "link") continue;
        try {
          if (f.geojson) {
            // Inline GeoJSON entry (the surfaced legacy AOI).
            feats.push(...toFeatures(normalizeGeoJson(f.geojson)));
          } else if (f.url && /\.(geojson|json|kml|zip)$/i.test(f.name || "")) {
            const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${f.url}`);
            if (!res.ok) continue;
            const blob = await res.blob();
            const parsed = await parseAoiFile(new File([blob], f.name));
            feats.push(...toFeatures(normalizeGeoJson(parsed)));
          }
        } catch (e) { console.error("AOI file map-parse failed:", f.name, e); }
      }
      if (!cancelled) setMapGeo(feats.length ? { type: "FeatureCollection", features: feats } : null);
    })();
    return () => { cancelled = true; };
  }, [key]);

  return (
    <>
      <GeoJsonMap geojson={mapGeo} canEdit={canEdit} />
      <div style={{ marginTop: 14 }}>
        <FeasibilityFiles
          title="AOI files" icon={MapPin} showLink={false}
          accept=".geojson,.json,.kml,.kmz,.zip,.shp,.gpkg"
          files={listFiles} canEdit={canEdit}
          onUpload={(file) => onUpdate({ _uploadAoiFile: { file } })}
          onRemove={(i) => {
            // Row 0 is the surfaced legacy AOI → clears aoi_geojson; the rest map
            // back to their index in the real aoi_files array.
            if (baseEntry && i === 0) onUpdate({ _setAoi: { geojson: null, which: "aoi" } });
            else onUpdate({ _removeAoiFile: { idx: i - (baseEntry ? 1 : 0) } });
          }}
        />
      </div>
    </>
  );
}

function ContextTab({ d, canEdit, onSaveField, onUpdate }) {
  return (
    <>
      <Block icon={Target} title="Problem statement">
        <div className="kv"><EditableField k="What the customer is trying to solve" value={d.context.problem} field="problem_statement" canEdit={canEdit} onSave={onSaveField} /></div>
      </Block>
      <div className="cols">
        <Block icon={CheckCircle2} title="Objectives">
          <EditableList items={d.context.objectives} field="objectives" canEdit={canEdit} onSave={onSaveField} emptyIcon={Target} emptyText="No objectives defined." />
        </Block>
        <Block icon={MapPin} title="Area of interest">
          <ContextAoi d={d} canEdit={canEdit} onUpdate={onUpdate} />
        </Block>
      </div>
    </>
  );
}

const CAPTURE_STATUSES = ["Tasked","Captured","QC In Progress","QC Passed","QC Failed","Shared"];
const QC_FAIL_REASONS = ["BBR","Cloud cover","Geometric","Bounding-box","Striping","Geolocation","Other"];
const STATUS_CLS = { "Tasked":"cs-tasked","Captured":"cs-captured","QC In Progress":"cs-qcprog","QC Passed":"cs-qcpass","QC Failed":"cs-qcfail","Shared":"cs-shared" };
const STATUS_DOT = { "Tasked":"var(--se)","Captured":"var(--accent)","QC In Progress":"var(--warn)","QC Passed":"var(--ok)","QC Failed":"var(--bad)","Shared":"var(--an)" };

function CaptureLog({ entries, canEdit, onAdd, onEdit, onDelete, onUploadShot }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);   // id of the entry being edited, or null for a new one
  const emptyForm = () => ({ date: new Date().toISOString().slice(0,10), status:"Tasked", failReasons:[], otherText:"", note:"", shotPath:"" });
  const [form, setForm] = useState(emptyForm());
  const [uploading, setUploading] = useState(false);
  const toggleReason = (r) => setForm(f => ({ ...f, failReasons: f.failReasons.includes(r) ? f.failReasons.filter(x => x !== r) : [...f.failReasons, r] }));
  const closeForm = () => { setOpen(false); setEditId(null); setForm(emptyForm()); };
  // Split a stored "BBR, Other: Color balance" string back into checkboxes + free text
  const parseReasons = (failReason) => {
    const failReasons = [], others = [];
    (failReason || "").split(",").map(s => s.trim()).filter(Boolean).forEach(part => {
      if (/^Other\s*:/i.test(part)) { failReasons.push("Other"); others.push(part.replace(/^Other\s*:\s*/i, "")); }
      else if (QC_FAIL_REASONS.includes(part)) failReasons.push(part);
      else { failReasons.push("Other"); others.push(part); }
    });
    return { failReasons: [...new Set(failReasons)], otherText: others.join(", ") };
  };
  const startEdit = (entry) => {
    const parsed = entry.status === "QC Failed" ? parseReasons(entry.failReason) : { failReasons: [], otherText: "" };
    setForm({ date: entry.date || new Date().toISOString().slice(0,10), status: entry.status || "Tasked", failReasons: parsed.failReasons, otherText: parsed.otherText, note: entry.note || "", shotPath: entry.shotPath || "" });
    setEditId(entry.id);
    setOpen(true);
  };
  const submit = () => {
    if (!form.note.trim() && form.failReasons.length === 0) { return; }
    // Build a readable failReason string from the selected reasons + other text
    let reasonStr = "";
    if (form.status === "QC Failed") {
      const parts = form.failReasons.map(r => r === "Other" && form.otherText.trim() ? `Other: ${form.otherText.trim()}` : r);
      reasonStr = parts.join(", ");
    }
    const payload = { date: form.date, status: form.status, failReason: reasonStr, note: form.note, shotPath: form.shotPath, author:"You" };
    if (editId) onEdit(editId, payload); else onAdd(payload);
    closeForm();
  };
  const handleShot = async (e) => {
    const file = e.target.files[0];
    if (!file || !onUploadShot) return;
    setUploading(true);
    try { const path = await onUploadShot(file); setForm(f => ({ ...f, shotPath: path })); }
    finally { setUploading(false); e.target.value = ""; }
  };
  return (
    <div className="clog-wrap">
      {entries.map((e, i) => (
        <div className="clog-entry" key={e.id}>
          <div className="clog-timeline">
            <span className="clog-dot" style={{ background: STATUS_DOT[e.status] || "var(--muted2)" }} />
            {i < entries.length - 1 && <span className="clog-line" />}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap" }}>
              <span className={`clog-status ${STATUS_CLS[e.status]||""}`}>{e.status}</span>
              <span style={{ fontSize:11.5, fontFamily:"var(--font-mono)", color:"var(--muted2)" }}>{e.date}</span>
              {e.failReason && <span className="clog-reason"><AlertTriangle size={11} /> {e.failReason}</span>}
              {canEdit && (
                <span style={{ marginLeft:"auto", display:"inline-flex", gap:2 }}>
                  <button onClick={() => startEdit(e)} title="Edit entry" style={{ border:"none", background:"none", color:"var(--accent-deep)", cursor:"pointer", padding:3, display:"inline-flex" }}><Pencil size={13} /></button>
                  <button onClick={() => onDelete(e.id)} title="Remove entry" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", padding:3, display:"inline-flex" }}><Trash2 size={13} /></button>
                </span>
              )}
            </div>
            <div className="clog-note">{e.note}</div>
            {e.shotPath && <a href={`${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${e.shotPath}`} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"var(--accent-deep)", marginTop:4 }}><Camera size={12} /> View failed image</a>}
            <div className="clog-meta">{e.author} · {e.ts}</div>
          </div>
        </div>
      ))}
      {entries.length === 0 && <div className="empty"><Camera size={15} /> No capture events logged yet.</div>}
      {canEdit && !open && (
        <div className="clog-add" onClick={() => setOpen(true)}><Plus size={15} /> Log capture event</div>
      )}
      {open && (
        <div className="clog-form">
          <div className="clog-form-row">
            <div>
              <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Date</div>
              <input type="date" style={{ width:"100%", border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontFamily:"inherit", fontSize:13, outline:"none" }}
                value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))} />
            </div>
            <div>
              <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Status</div>
              <div className="cp-select">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status:e.target.value, failReasons:[], otherText:"" }))}>
                  {CAPTURE_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} className="chev" />
              </div>
            </div>
          </div>
          {form.status === "QC Failed" && (
            <div style={{ marginBottom:10 }}>
              <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:6 }}>Failure reasons (select all that apply)</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {QC_FAIL_REASONS.map(r => (
                  <label key={r} style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12.5, padding:"5px 10px", borderRadius:8, border:"1px solid " + (form.failReasons.includes(r) ? "var(--accent)" : "var(--line)"), background: form.failReasons.includes(r) ? "var(--accent-soft)" : "transparent", cursor:"pointer" }}>
                    <input type="checkbox" checked={form.failReasons.includes(r)} onChange={() => toggleReason(r)} style={{ accentColor:"var(--accent)" }} />
                    {r}
                  </label>
                ))}
              </div>
              {form.failReasons.includes("Other") && (
                <input autoFocus placeholder="Describe the other reason…" value={form.otherText} onChange={e => setForm(f => ({ ...f, otherText:e.target.value }))}
                  style={{ width:"100%", border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", marginTop:8, outline:"none" }} />
              )}
            </div>
          )}
          <div>
            <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Note</div>
            <textarea style={{ width:"100%", border:"1px solid var(--line)", borderRadius:9, padding:"9px 12px", fontFamily:"inherit", fontSize:13, resize:"vertical", minHeight:72, outline:"none" }}
              placeholder="What happened? Any details about the capture, QC result, or delivery…"
              value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))} />
          </div>
          {form.status === "QC Failed" && canEdit && (
            <div style={{ marginTop:10 }}>
              <div className="k" style={{ fontFamily:"var(--font-mono)", fontSize:"9.5px", letterSpacing:".1em", textTransform:"uppercase", color:"var(--muted2)", marginBottom:4 }}>Screenshot of failed image</div>
              {form.shotPath ? (
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"var(--ok)" }}>
                  <CheckCircle2 size={14} /> Image attached
                  <button onClick={() => setForm(f => ({ ...f, shotPath:"" }))} style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer" }}>✕</button>
                </div>
              ) : (
                <>
                  <label htmlFor="clog-shot" style={{ display:"inline-flex", alignItems:"center", gap:7, cursor: uploading?"wait":"pointer", padding:"7px 13px", borderRadius:8, border:"1px solid var(--line)", fontSize:12.5, color:"var(--accent-deep)" }}>
                    <Upload size={13} /> {uploading ? "Uploading…" : "Upload screenshot (JPG/PNG)"}
                  </label>
                  <input id="clog-shot" type="file" accept=".jpg,.jpeg,.png" style={{ display:"none" }} onChange={handleShot} />
                </>
              )}
            </div>
          )}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:10 }}>
            <button className="btn ghost" style={{ color:"var(--muted)", border:"1px solid var(--line)", background:"#fff" }} onClick={closeForm}>Cancel</button>
            <button className="btn solid" onClick={submit}><Camera size={13} /> {editId ? "Save changes" : "Save event"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionPlan({ items, canEdit, onToggle, onAdd }) {
  const [apView, setApView] = useState("open");   // open | thisweek | done
  const [newTask, setNewTask] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newDue, setNewDue] = useState("");
  const today = new Date();
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const parseDate = s => s ? new Date(s) : null;
  const isOverdue = d => { const pd = parseDate(d); return pd && pd < today; };
  const isThisWeek = d => { const pd = parseDate(d); return pd && pd >= today && pd <= weekEnd; };
  const dueCls = d => isOverdue(d) ? "overdue" : isThisWeek(d) ? "thisweek" : "";

  const filtered = items.filter(a =>
    apView === "open" ? !a.done :
    apView === "thisweek" ? (!a.done && isThisWeek(a.due)) :
    a.done
  );

  const add = () => {
    if (!newTask.trim()) return;
    onAdd({ id:"a"+Date.now(), task:newTask.trim(), owner:newOwner, due:newDue, done:false });
    setNewTask(""); setNewOwner(""); setNewDue("");
  };

  return (
    <>
      <div className="ap-tabs">
        {[["open","Open"],["thisweek","This week"],["done","Done"]].map(([k,l]) => (
          <button key={k} className={`ap-tab${apView===k?" on":""}`} onClick={() => setApView(k)}>{l}
            <span style={{ marginLeft:5, fontSize:10.5, opacity:.65 }}>
              {k==="open" ? items.filter(a=>!a.done).length : k==="thisweek" ? items.filter(a=>!a.done&&isThisWeek(a.due)).length : items.filter(a=>a.done).length}
            </span>
          </button>
        ))}
      </div>
      {filtered.map(a => (
        <div className={`ap-item${a.done?" done-item":""}`} key={a.id}>
          <div className={`ap-check${a.done?" checked":""}`} onClick={() => onToggle(a.id)}>
            {a.done && <CheckCircle2 size={13} color="#fff" />}
          </div>
          <div style={{ flex:1 }}>
            <div className={`ap-task${a.done?" done-text":""}`}>{a.task}</div>
            <div className="ap-meta">
              {a.owner && <span>👤 {a.owner}</span>}
              {a.due && <span className={`ap-due ${dueCls(a.due)}`}><CalendarClock size={10} /> {a.due}{isOverdue(a.due) && !a.done ? " · Overdue" : isThisWeek(a.due) && !a.done ? " · This week" : ""}</span>}
            </div>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <div className="empty" style={{ marginBottom:10 }}><ListChecks size={15} /> No {apView === "thisweek" ? "items due this week" : apView + " items"}.</div>}
      {canEdit && (
        <div className="ap-add-row">
          <input placeholder="Add action item…" value={newTask} onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key==="Enter" && add()} />
          <select value={newOwner} onChange={e => setNewOwner(e.target.value)}>
            <option value="">Owner…</option>
            {[...TEAM.se,...TEAM.cs,...TEAM.analytics].map(p => <option key={p}>{p}</option>)}
          </select>
          <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} />
          <button className="btn solid" onClick={add} style={{ whiteSpace:"nowrap" }}><Plus size={13} /> Add</button>
        </div>
      )}
    </>
  );
}

// ── Small inline adders for child records ─────────────────────
function ContactsEditor({ contacts, canEdit, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name:"", role:"", email:"" });
  const submit = () => { if (!form.name.trim()) return; onAdd({ name: form.name.trim(), role: form.role.trim(), email: form.email.trim() }); setForm({ name:"", role:"", email:"" }); setOpen(false); };
  return (
    <div className="kv">
      {contacts.length ? contacts.map((c, i) => (
        <div key={c.id || i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
            {c.role && <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.role}</div>}
            {c.email && <div className="link" style={{ marginTop: 3 }}><Mail size={12} /> {c.email}</div>}
          </div>
          {canEdit && c.id && <button onClick={() => onDelete(c.id)} title="Remove" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:13 }}>✕</button>}
        </div>
      )) : !open && <div className="empty"><Users size={15} /> No contacts captured.</div>}
      {canEdit && (open ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:6 }}>
          <input autoFocus placeholder="Name" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))}
            style={{ border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
          <input placeholder="Role / title" value={form.role} onChange={e => setForm(f => ({...f, role:e.target.value}))}
            style={{ border:"1px solid var(--line)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
          <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))}
            style={{ border:"1px solid var(--line)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={submit} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Add contact</button>
            <button onClick={() => setOpen(false)} style={{ padding:"6px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="add-row"><Plus size={14} /> Add contact</button>
      ))}
    </div>
  );
}

function PocAdder({ pocs, canEdit, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name:"", status:"Planned", note:"" });
  const POC_STATUSES = ["Planned","In Progress","Complete","Blocked"];
  const submit = () => { if (!form.name.trim()) return; onAdd({ name: form.name.trim(), status: form.status, note: form.note.trim() }); setForm({ name:"", status:"Planned", note:"" }); setOpen(false); };
  return (
    <>
      {pocs.length ? pocs.map((p, i) => (
        <div key={p.id || i} style={{ marginBottom: 12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13.5, fontWeight:600 }}>{p.name}</span>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span className="tag" style={{ background: p.status === "Complete" ? "#E3F7EC" : "var(--accent-soft)", color: p.status === "Complete" ? "#1f8a57" : "var(--accent-deep)" }}>{p.status}</span>
              {canEdit && <button onClick={() => onDelete(p.id)} title="Delete" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:13 }}>✕</button>}
            </div>
          </div>
          {p.note && <div style={{ fontSize:12.5, color:"var(--muted)", marginTop:3 }}>{p.note}</div>}
        </div>
      )) : !open && <div className="empty"><Activity size={15} /> No POCs logged.</div>}
      {canEdit && (open ? (
        <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
          <input autoFocus placeholder="POC name (e.g. Crop classification accuracy test)" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))}
            style={{ border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
          <select value={form.status} onChange={e => setForm(f => ({...f, status:e.target.value}))}
            style={{ border:"1px solid var(--line)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }}>
            {POC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <textarea placeholder="Notes…" value={form.note} onChange={e => setForm(f => ({...f, note:e.target.value}))}
            style={{ border:"1px solid var(--line)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", resize:"vertical", minHeight:52, outline:"none" }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={submit} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Add POC</button>
            <button onClick={() => setOpen(false)} style={{ padding:"6px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="add-row"><Plus size={14} /> Add POC</button>
      ))}
    </>
  );
}

function RiskAdder({ risks, canEdit, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ severity:"med", description:"" });
  const submit = () => { if (!form.description.trim()) return; onAdd({ severity: form.severity, description: form.description.trim() }); setForm({ severity:"med", description:"" }); setOpen(false); };
  return (
    <>
      {risks.length ? risks.map((r, i) => (
        <div className="risk" key={r.id || i} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
          <span className={"sev " + r.sev}>{r.sev}</span>
          <span style={{ fontSize:13, color:"var(--ink2)", lineHeight:1.5, flex:1 }}>{r.text}</span>
          {canEdit && <button onClick={() => onDelete(r.id)} title="Delete" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:13 }}>✕</button>}
        </div>
      )) : !open && <div className="empty"><AlertTriangle size={15} /> No risks flagged.</div>}
      {canEdit && (open ? (
        <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
          <select value={form.severity} onChange={e => setForm(f => ({...f, severity:e.target.value}))}
            style={{ border:"1px solid var(--line)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }}>
            <option value="low">low</option><option value="med">med</option><option value="high">high</option>
          </select>
          <textarea autoFocus placeholder="Describe the risk…" value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))}
            style={{ border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", resize:"vertical", minHeight:52, outline:"none" }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={submit} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Add risk</button>
            <button onClick={() => setOpen(false)} style={{ padding:"6px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="add-row"><Plus size={14} /> Add risk</button>
      ))}
    </>
  );
}

function SampleDataAdder({ items, canEdit, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const submit = () => { if (!text.trim()) return; onAdd(text.trim()); setText(""); setOpen(false); };
  return (
    <>
      {items.length ? items.map((s, i) => (
        <div className="li" key={s.id || i} style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
          <span className="b" /><span style={{ flex:1 }}>{s.text}</span>
          {canEdit && <button onClick={() => onDelete(s.id)} title="Delete" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:13 }}>✕</button>}
        </div>
      )) : !open && <div className="empty"><Layers size={15} /> Nothing delivered yet.</div>}
      {canEdit && (open ? (
        <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
          <textarea autoFocus placeholder="Image IDs and notes, e.g. FF03_20260421_xyz — delivered to client 21 Apr" value={text} onChange={e => setText(e.target.value)}
            style={{ border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", resize:"vertical", minHeight:52, outline:"none" }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={submit} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Add</button>
            <button onClick={() => setOpen(false)} style={{ padding:"6px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="add-row"><Plus size={14} /> Add sample data</button>
      ))}
    </>
  );
}

// Common commercial/legal formalities offered as quick-add chips.
const COMMERCIAL_LEGAL_PRESETS = ["NDA", "Order form", "Contract / MSA", "DPA", "SOW", "Security review"];
// status label → [text colour, background]
const CL_STATUS_STYLE = {
  "Not started": ["#6B7480", "var(--line-soft)"],
  "In progress": ["#B5720E", "#FEF3E0"],
  "Complete":    ["#1f8a57", "#E3F7EC"],
};

// Structured tracker for completed legal/commercial formalities (NDA, order form,
// contract, …). Stored as a jsonb array on the passport; each change saves the
// whole array via onSave("commercial_legal", next).
function CommercialLegalTracker({ items, canEdit, onSave }) {
  const rows = Array.isArray(items) ? items : [];
  const [custom, setCustom] = useState("");
  const commit = (next) => onSave("commercial_legal", next);
  const addRow = (label) => {
    const l = String(label || "").trim();
    if (!l || rows.some(r => (r.label || "").toLowerCase() === l.toLowerCase())) return;
    commit([...rows, { label: l, status: "Not started", date: "", note: "" }]);
  };
  const updateRow = (i, patch) => commit(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const removeRow = (i) => commit(rows.filter((_, idx) => idx !== i));
  const used = new Set(rows.map(r => (r.label || "").toLowerCase()));

  return (
    <div>
      {rows.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="qc-table" style={{ margin: 0 }}>
            <thead><tr><th>Item</th><th>Status</th><th>Date</th><th>Note</th>{canEdit && <th></th>}</tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const [fg, bg] = CL_STATUS_STYLE[r.status] || CL_STATUS_STYLE["Not started"];
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.label}</td>
                    <td>
                      {canEdit ? (
                        <div className="cp-select" style={{ display: "inline-flex", minWidth: 128 }}>
                          <select value={r.status || "Not started"} onChange={ev => updateRow(i, { status: ev.target.value })}>
                            {Object.keys(CL_STATUS_STYLE).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown size={13} className="chev" />
                        </div>
                      ) : <span className="tag" style={{ background: bg, color: fg, fontWeight: 600 }}>{r.status || "Not started"}</span>}
                    </td>
                    <td>
                      {canEdit
                        ? <input type="date" defaultValue={r.date || ""} onChange={ev => updateRow(i, { date: ev.target.value })}
                            style={{ border: "1px solid var(--line)", borderRadius: 7, padding: "5px 8px", fontFamily: "inherit", fontSize: 12.5, outline: "none" }} />
                        : <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted2)" }}>{r.date || "—"}</span>}
                    </td>
                    <td style={{ minWidth: 180 }}>
                      {canEdit
                        ? <input defaultValue={r.note || ""} placeholder="e.g. signed via DocuSign" onBlur={ev => { if ((ev.target.value || "") !== (r.note || "")) updateRow(i, { note: ev.target.value }); }}
                            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 8px", fontFamily: "inherit", fontSize: 12.5, outline: "none" }} />
                        : <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.note || "—"}</span>}
                    </td>
                    {canEdit && <td><button onClick={() => removeRow(i)} title="Remove" style={{ border: "none", background: "none", color: "var(--muted2)", cursor: "pointer", fontSize: 13 }}>✕</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className="empty"><FileText size={15} /> No formalities tracked yet{canEdit && " — add one below"}.</div>}

      {canEdit && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 }}>
          {COMMERCIAL_LEGAL_PRESETS.filter(p => !used.has(p.toLowerCase())).map(p => (
            <button key={p} onClick={() => addRow(p)} className="tag" style={{ cursor: "pointer", border: "1px dashed var(--line)", background: "transparent", color: "var(--accent-deep)" }}>+ {p}</button>
          ))}
          <input value={custom} onChange={ev => setCustom(ev.target.value)} placeholder="Add custom…"
            onKeyDown={ev => { if (ev.key === "Enter") { addRow(custom); setCustom(""); } }}
            style={{ border: "1px solid var(--line)", borderRadius: 7, padding: "5px 10px", fontFamily: "inherit", fontSize: 12.5, outline: "none", width: 150 }} />
        </div>
      )}
    </div>
  );
}

function ExecutionTab({ d, canEdit, onUpdate, onSaveField }) {
  const e = d.execution;
  const st = d.sectionStamps || {};

  const addCaptureEvent = (entry) => {
    onUpdate({ _captureEntry: {
      entry_date: entry.date,
      status: entry.status,
      fail_reason: entry.failReason || null,
      note: entry.note,
      screenshot_path: entry.shotPath || null,
      author: "You",
    }});
  };
  const editCaptureEvent = (id, entry) => {
    onUpdate({ _updateCaptureEntry: { id, fields: {
      entry_date: entry.date,
      status: entry.status,
      fail_reason: entry.failReason || null,
      note: entry.note,
      screenshot_path: entry.shotPath || null,
    }}});
  };
  const toggleAction = (id) => {
    const item = (e.actionItems||[]).find(a => a.id === id);
    onUpdate({ _toggleAction: { id, done: item ? !item.done : true } });
  };
  const addAction = (item) => {
    onUpdate({ _addAction: {
      task: item.task,
      owner: item.owner || null,
      due_date: item.due || null,
      done: false,
      created_by: "You",
    }});
  };

  return (
    <>
      <div className="cols">
        <Block icon={CheckCircle2} title="Success criteria" stamp={st.execution}>
          <EditableList items={e.successCriteria} field="success_criteria" canEdit={canEdit} onSave={onSaveField} emptyIcon={CheckCircle2} emptyText="No success criteria yet — needed before handover." />
        </Block>
        <Block icon={Activity} title="Proofs of concept">
          <PocAdder pocs={e.pocs} canEdit={canEdit}
            onAdd={(poc) => onUpdate({ _addPoc: poc })}
            onDelete={(id) => onUpdate({ _deleteRecord: { table:"deal_pocs", id } })} />
        </Block>
      </div>

      {/* Tasked AOIs — the order/AOI names this client has tasked */}
      <Block icon={MapPin} title="Tasked AOIs">
        <EditableList items={e.taskedAois} field="tasked_aois" canEdit={canEdit} onSave={onSaveField} emptyIcon={MapPin} emptyText="No tasked AOIs yet — add the order / AOI names." />
      </Block>

      {/* Capture / image progress log */}
      <Block icon={Camera} title="Capture & image progress log">
        <CaptureLog entries={e.captureLog||[]} canEdit={canEdit} onAdd={addCaptureEvent}
          onEdit={editCaptureEvent}
          onDelete={(id) => onUpdate({ _deleteRecord: { table:"capture_log", id } })}
          onUploadShot={async (file) => await uploadFile(d.id, file)} />
      </Block>

      <div className="cols">
        <Block icon={Layers} title="Sample data delivered">
          <SampleDataAdder items={e.sampleData} canEdit={canEdit}
            onAdd={(text) => onUpdate({ _addSample: text })}
            onDelete={(id) => onUpdate({ _deleteRecord: { table:"deal_sample_data", id } })} />
        </Block>
        <Block icon={MapPin} title="Sample delivery AOI">
          <AoiUploader aoi={e.sampleAoi} canEdit={canEdit} which="sample" multi
            onSetAoi={(geojson) => onUpdate({ _setAoi: { geojson, which:"sample" } })} />
        </Block>
      </div>

      <div className="cols">
        <Block icon={AlertTriangle} title="Risks">
          <RiskAdder risks={e.risks} canEdit={canEdit}
            onAdd={(risk) => onUpdate({ _addRisk: risk })}
            onDelete={(id) => onUpdate({ _deleteRecord: { table:"deal_risks", id } })} />
        </Block>
        <Block icon={TrendingUp} title="Next steps & commercial pathway">
          <div className="kv">
            <EditableField k="Next steps" value={e.nextSteps} field="next_steps" canEdit={canEdit} onSave={onSaveField} />
            <EditableField k="Commercial model" value={e.commercial} field="commercial_model" canEdit={canEdit} onSave={onSaveField} />
          </div>
        </Block>
      </div>

      <div className="cols">
        {/* Aurora workspace */}
        <Block icon={Layers} title="Aurora workspace">
          <div className="kv">
            {e.auroraUrl && (
              <a href={e.auroraUrl} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, color:"var(--accent-deep)", fontWeight:500, marginBottom:6 }}>
                <ExternalLink size={13} /> Open workspace
              </a>
            )}
            <EditableField k="Workspace / project" value={e.auroraWorkspace} field="aurora_workspace" canEdit={canEdit} onSave={onSaveField}
              placeholder="Aurora workspace name or ID" />
            <EditableField k="Workspace link" value={e.auroraUrl} field="aurora_url" canEdit={canEdit} onSave={onSaveField}
              placeholder="https://…" mono />
          </div>
        </Block>

        {/* Completed legal / commercial formalities */}
        <Block icon={FileText} title="Commercial & legal formalities">
          <CommercialLegalTracker items={e.commercialLegal} canEdit={canEdit}
            onSave={onSaveField} />
        </Block>
      </div>

      {/* Structured action plan */}
      <Block icon={ListChecks} title="Action plan">
        <ActionPlan items={e.actionItems||[]} canEdit={canEdit} onToggle={toggleAction} onAdd={addAction} />
      </Block>
    </>
  );
}

const CADENCE_OPTIONS = ["Weekly", "Fortnightly", "Monthly", "Quarterly", "Ad-hoc / reactive"];

// A small read-only key/value row for the summary.
function SummaryKV({ k, v, mono }) {
  return (
    <div>
      <div className="k">{k}</div>
      <div className="v" style={mono ? { fontFamily: "var(--font-mono)", fontSize: 12.5 } : undefined}>
        {v ? v : <span style={{ color: "var(--muted2)" }}>Not captured</span>}
      </div>
    </div>
  );
}

// CS Summary — a read-oriented digest that pulls the fields a CS needs to run the
// account, aggregated from the Profile / Context / Execution tabs. Files remain
// downloadable; cadence and commercial/legal are editable here since CS owns them.
function CSSummaryTab({ d, canEdit, onSaveField, onUpdate }) {
  const t = d.profile.tech;
  const e = d.execution;
  const pocs = e.pocs || [];
  return (
    <>
      {/* Customer cadence — how often CS should check in */}
      <Block icon={CalendarClock} title="Customer cadence">
        <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 8 }}>How often should CS check in with this customer?</div>
        <div className="kv">
          <EditableSelect k="Check-in cadence" value={d.profile.customerCadence} field="customer_cadence" canEdit={canEdit} onSave={onSaveField} options={CADENCE_OPTIONS} customLabel="Custom" />
        </div>
      </Block>

      {/* What the customer wants */}
      <Block icon={Target} title="What the customer wants">
        <div className="kv">
          <SummaryKV k="Use case" v={d.profile.useCase} />
          <SummaryKV k="Pain points" v={d.profile.painPoints} />
          <SummaryKV k="Support needs" v={d.profile.supportNeeds} />
          <div>
            <div className="k">Imagery priorities</div>
            <div className="tags" style={{ marginTop: 4 }}>
              {(d.profile.imageryPriorities && d.profile.imageryPriorities.length)
                ? d.profile.imageryPriorities.map((s, i) => <span key={i} className="tag spec">{s}</span>)
                : <span style={{ color: "var(--muted2)", fontSize: 13 }}>Not captured</span>}
            </div>
          </div>
          <SummaryKV k="Expected value from Pixxel" v={d.profile.expectedValue} />
        </div>
      </Block>

      {/* Technical requirements pulled from Profile */}
      <Block icon={Radar} title="Technical requirements">
        <div className="kv">
          <div>
            <div className="k">Data sources</div>
            <div className="tags" style={{ marginTop: 4 }}>
              {(t.dataSources && t.dataSources.length)
                ? t.dataSources.map((s, i) => <span key={i} className="tag spec">{s}</span>)
                : <span style={{ color: "var(--muted2)", fontSize: 13 }}>Not captured</span>}
            </div>
          </div>
          <SummaryKV k="Bandset" v={t.bandset} />
          <SummaryKV k="Cadence / revisit" v={t.cadence} />
        </div>
        <div style={{ marginTop: 12 }}>
          <TimeOfInterest windows={t.timeOfInterest} canEdit={false} onChange={() => {}} />
        </div>
      </Block>

      <div className="cols">
        <Block icon={MapPin} title="Area of interest — files">
          <FeasibilityFiles title="AOI files" icon={MapPin} showLink={false}
            accept=".geojson,.json,.kml,.kmz,.zip,.shp,.gpkg"
            files={t.aoiFiles} canEdit={false} />
          <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 6 }}>
            <MapPin size={11} style={{ verticalAlign: "-1px" }} /> The interactive AOI map is on the Context tab.
          </div>
        </Block>
        <Block icon={Paperclip} title="Attachments">
          <AttachmentsManager attachments={d.notes.attachments} canEdit={false} />
        </Block>
      </div>

      <div className="cols">
        <Block icon={Layers} title="Aurora workspace">
          <div className="kv">
            {e.auroraUrl && (
              <a href={e.auroraUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--accent-deep)", fontWeight: 500, marginBottom: 6 }}>
                <ExternalLink size={13} /> Open workspace
              </a>
            )}
            <SummaryKV k="Workspace / project / org ID" v={e.auroraWorkspace} />
            <SummaryKV k="Workspace link" v={e.auroraUrl} mono />
          </div>
        </Block>
        <Block icon={FileText} title="Commercial & legal formalities">
          <CommercialLegalTracker items={e.commercialLegal} canEdit={canEdit} onSave={onSaveField} />
        </Block>
      </div>

      {/* Proofs of concept (read-only summary) */}
      <Block icon={Activity} title="Proofs of concept">
        {pocs.length ? (
          <div className="kv">
            {pocs.map(poc => (
              <div key={poc.id} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--line-soft)" }}>
                <span className="tag" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)", fontWeight: 600 }}>{poc.status || "Planned"}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{poc.name}</div>
                  {poc.note && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{poc.note}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty"><Activity size={15} /> No proof of concept recorded.</div>}
      </Block>
    </>
  );
}

function NotesTab({ d, canEdit, canPostNote, onUpdate, toast }) {
  // Directors get the composer (post updates) even when read-only elsewhere.
  const canCompose = canPostNote !== undefined ? canPostNote : canEdit;
  const [draft, setDraft] = useState("");
  const [mentionQuery, setMentionQuery] = useState(null); // null = no active mention
  const [mentionPos, setMentionPos] = useState(0);
  const [selIdx, setSelIdx] = useState(0);
  const taRef = useRef(null);

  // Flat roster for matching
  const ALL_PEOPLE = Object.values(TEAM_MEMBERS).flat();

  const matches = mentionQuery !== null
    ? ALL_PEOPLE.filter(p => p.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  const onDraftChange = (e) => {
    const val = e.target.value;
    setDraft(val);
    // Detect an active @mention being typed (the @ token right before the cursor)
    const cursor = e.target.selectionStart;
    const textToCursor = val.slice(0, cursor);
    const m = textToCursor.match(/@([\w]*)$/);
    if (m) {
      setMentionQuery(m[1]);
      setMentionPos(cursor - m[1].length - 1); // position of the @
      setSelIdx(0);
    } else {
      setMentionQuery(null);
    }
  };

  const pickMention = (person) => {
    // Replace the @query with @Full Name + trailing space
    const before = draft.slice(0, mentionPos);
    const after = draft.slice(mentionPos + 1 + (mentionQuery ? mentionQuery.length : 0));
    const next = `${before}@${person.name} ${after}`;
    setDraft(next);
    setMentionQuery(null);
    setTimeout(() => taRef.current && taRef.current.focus(), 0);
  };

  const onKeyDown = (e) => {
    if (mentionQuery !== null && matches.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx(i => (i + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx(i => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pickMention(matches[selIdx]); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
  };

  const post = () => {
    if (!draft.trim()) return;
    // Match mentions against known roster names (longest first to avoid partial overlap)
    const names = ALL_PEOPLE.map(p => p.name).sort((a,b) => b.length - a.length);
    const mentions = [];
    names.forEach(n => { if (draft.includes("@" + n)) mentions.push(n); });
    const mentionEmails = mentions.map(n => {
      const person = ALL_PEOPLE.find(p => p.name === n);
      return person ? person.email : null;
    }).filter(Boolean);
    onUpdate({ _activityPost: { author: "You", body: draft.trim(), mentions, mentionEmails } });
    setDraft("");
    toast(mentions.length ? `Update posted · notified ${mentions.join(", ")}` : "Update posted to the activity feed");
  };

  const renderText = (t, mentions) => {
    if (!mentions || !mentions.length) return t;
    let parts = [t];
    mentions.forEach(m => {
      parts = parts.flatMap(p => typeof p === "string"
        ? p.split("@" + m).flatMap((seg, i) => i === 0 ? [seg] : [<span key={m + i} className="mention">@{m}</span>, seg])
        : [p]);
    });
    return parts;
  };

  return (
    <>
      {canCompose && (
        <div className="composer">
          <div style={{ position: "relative" }}>
            <textarea ref={taRef} placeholder="Post an update… type @ to mention a teammate"
              value={draft} onChange={onDraftChange} onKeyDown={onKeyDown} />
            {mentionQuery !== null && matches.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, zIndex: 30, marginTop: 4,
                background: "#fff", border: "1px solid var(--line)", borderRadius: 10,
                boxShadow: "0 14px 40px -16px rgba(11,18,32,.35)", padding: 6, minWidth: 240,
              }}>
                {matches.map((p, i) => (
                  <button key={p.email} onClick={() => pickMention(p)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%",
                      textAlign: "left", padding: "7px 10px", borderRadius: 7, border: "none",
                      background: i === selIdx ? "var(--accent-soft)" : "transparent", cursor: "pointer",
                    }}
                    onMouseEnter={() => setSelIdx(i)}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: "var(--muted2)" }}>{p.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="crow">
            <span className="hint"><AtSign size={13} /> Mentions notify that person by email</span>
            <button className="btn solid" onClick={post}><Send size={13} /> Post update</button>
          </div>
        </div>
      )}

      <div className="cols">
        <div>
          <Block icon={FileText} title="Meeting notes">
            <MeetingNotesAdder notes={d.notes.meetings} canEdit={canEdit}
              onAdd={(note) => onUpdate({ _addMeetingNote: note })}
              onDelete={(id) => onUpdate({ _deleteRecord: { table:"meeting_notes", id } })}
              onSyncFromHubspot={() => onUpdate({ _syncNotes: true })} />
          </Block>
          <Block icon={Paperclip} title="Attachments">
            <AttachmentsManager attachments={d.notes.attachments} canEdit={canEdit}
              onUpload={(file) => onUpdate({ _uploadFile: { file, kind:"attachment" } })}
              onAddLink={(name, url) => onUpdate({ _addAttachmentLink: { name, url } })}
              onDelete={(id) => onUpdate({ _deleteRecord: { table:"attachments", id } })} />
          </Block>
        </div>

        <Block icon={Activity} title="Activity & change history">
          {d.notes.activity.map((a, i) => (
            <div className="feed-item" key={i}>
              <div className="av" style={{ background: a.author === "You" ? "var(--accent)" : "var(--ink2)", width: 30, height: 30 }}>
                {a.author === "You" ? "★" : initials(a.author)}
              </div>
              <div>
                <div className="ft"><strong>{a.author}</strong> {renderText(a.text, a.mentions)}</div>
                <div className="fm">{a.date}</div>
              </div>
            </div>
          ))}
        </Block>
      </div>
    </>
  );
}

function MeetingNotesAdder({ notes, canEdit, onAdd, onDelete, onSyncFromHubspot }) {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ note_date: new Date().toISOString().slice(0,10), body:"" });
  const submit = () => { if (!form.body.trim()) return; onAdd({ note_date: form.note_date, author: "You", body: form.body.trim() }); setForm({ note_date: new Date().toISOString().slice(0,10), body:"" }); setOpen(false); };
  const doSync = async () => { setSyncing(true); try { await onSyncFromHubspot(); } finally { setSyncing(false); } };
  return (
    <>
      {canEdit && onSyncFromHubspot && (
        <button onClick={doSync} disabled={syncing}
          style={{ display:"inline-flex", alignItems:"center", gap:6, marginBottom:10, padding:"6px 12px",
            borderRadius:8, border:"1px solid var(--line)", background:"transparent", color:"var(--accent-deep)",
            fontSize:12, fontWeight:500, cursor: syncing?"wait":"pointer" }}>
          <RefreshCw size={13} className={syncing ? "spin" : ""} /> {syncing ? "Pulling from HubSpot…" : "Sync notes & contacts from HubSpot"}
        </button>
      )}
      {notes.length ? notes.map((m, i) => (
        <div key={m.id || i} style={{ marginBottom: 14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted2)" }}>{m.date} · {m.author}</div>
            {canEdit && <button onClick={() => onDelete(m.id)} title="Delete" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:12 }}>✕</button>}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.55, marginTop: 4 }}>{renderRichText(m.text)}</div>
        </div>
      )) : !open && <div className="empty"><FileText size={15} /> No meeting notes yet.</div>}
      {canEdit && (open ? (
        <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
          <input type="date" value={form.note_date} onChange={e => setForm(f => ({...f, note_date:e.target.value}))}
            style={{ border:"1px solid var(--line)", borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
          <textarea autoFocus placeholder="Meeting notes…" value={form.body} onChange={e => setForm(f => ({...f, body:e.target.value}))}
            style={{ border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", resize:"vertical", minHeight:72, outline:"none" }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={submit} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Add note</button>
            <button onClick={() => setOpen(false)} style={{ padding:"6px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="add-row"><Plus size={14} /> Add meeting note</button>
      ))}
    </>
  );
}

function AttachmentsManager({ attachments, canEdit, onUpload, onAddLink, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const inputId = `att-${Math.random().toString(36).slice(2,7)}`;
  const isLink = (a) => (a.type || "").toLowerCase() === "link" || /^https?:\/\//.test(a.path || "");
  const hrefFor = (a) => isLink(a) ? a.path : `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${a.path}`;
  const submitLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    onAddLink(linkName.trim() || url, /^https?:\/\//.test(url) ? url : `https://${url}`);
    setLinkName(""); setLinkUrl(""); setLinkOpen(false);
  };
  return (
    <>
      {attachments.length ? attachments.map((a, i) => (
        <div className="attach" key={a.id || i}>
          <div className="ai">{isLink(a) ? <Link2 size={16} /> : <FileText size={16} />}</div>
          <div><div className="an2">{a.name}</div><div className="as">{isLink(a) ? "LINK" : (a.type||"file").toUpperCase() + " · " + a.size}</div></div>
          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            {a.path && <a href={hrefFor(a)} target="_blank" rel="noreferrer" title={isLink(a) ? "Open link" : "Download"}>{isLink(a) ? <ExternalLink size={15} color="var(--muted2)" /> : <Download size={15} color="var(--muted2)" />}</a>}
            {canEdit && <button onClick={() => onDelete(a.id)} title="Delete" style={{ border:"none", background:"none", color:"var(--muted2)", cursor:"pointer", fontSize:13 }}>✕</button>}
          </div>
        </div>
      )) : !linkOpen && <div className="empty"><Paperclip size={15} /> No attachments.</div>}
      {canEdit && (
        <>
          <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
            <label htmlFor={inputId} className="add-row" style={{ cursor: busy?"wait":"pointer", margin:0, flex:1, minWidth:140 }}>
              <Upload size={14} /> {busy ? "Uploading…" : "Upload file"}
            </label>
            <button onClick={() => setLinkOpen(o => !o)} className="add-row" style={{ margin:0, flex:1, minWidth:140 }}>
              <Link2 size={14} /> Add link
            </button>
          </div>
          <input id={inputId} type="file" style={{ display:"none" }}
            onChange={async (e) => { const f = e.target.files[0]; if (!f) return; setBusy(true); try { await onUpload(f); } finally { setBusy(false); e.target.value=""; } }} />
          {linkOpen && (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
              <input autoFocus placeholder="Label (e.g. Delivery folder — Google Drive)" value={linkName} onChange={e => setLinkName(e.target.value)}
                style={{ border:"1px solid var(--line)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <input placeholder="Paste URL (https://…)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitLink(); if (e.key === "Escape") setLinkOpen(false); }}
                style={{ border:"1px solid var(--accent)", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={submitLink} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"var(--accent)", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Add link</button>
                <button onClick={() => setLinkOpen(false)} style={{ padding:"6px 14px", borderRadius:7, border:"1px solid var(--line)", background:"transparent", color:"var(--muted)", fontSize:12.5, cursor:"pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Leadership dashboard                                              */
/* ------------------------------------------------------------------ */
function Dashboard({ deals, onOpen }) {
  const scores = deals.map(d => readiness(d).score);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / deals.length);
  const pipeline = deals.reduce((a, d) => a + d.amount, 0);
  const ready = deals.filter(d => readiness(d).score >= 90).length;
  const atRisk = deals.filter(d => readiness(d).score < 60).map(d => ({ ...d, s: readiness(d).score }));

  const byStage = STAGES.map((s, i) => ({ name: s, count: deals.filter(d => d.stage === i).length }));
  const maxStage = Math.max(...byStage.map(b => b.count), 1);

  return (
    <>
      <h2 className="section-title">Leadership view</h2>
      <p className="section-sub">Portfolio handover health across all active passports</p>

      <div className="dash-grid">
        <div className="stat"><div className="k">Avg readiness</div><div className="v">{avg}%</div>
          <div className="d"><Gauge size={13} /> across {deals.length} deals</div></div>
        <div className="stat"><div className="k">Handover-ready</div><div className="v">{ready}</div>
          <div className="d"><CheckCircle2 size={13} color="var(--ok)" /> ≥ 90% complete</div></div>
        <div className="stat"><div className="k">Pipeline ACV</div><div className="v">${(pipeline / 1000000).toFixed(2)}M</div>
          <div className="d"><TrendingUp size={13} /> synced from HubSpot</div></div>
        <div className="stat"><div className="k">Need attention</div><div className="v">{atRisk.length}</div>
          <div className="d"><AlertTriangle size={13} color="var(--warn)" /> below 60%</div></div>
      </div>

      <div className="cols">
        <Block icon={BarChart3} title="Deals by stage">
          <div className="barlist">
            {byStage.map((b, i) => (
              <div className="br" key={i}>
                <span style={{ color: "var(--muted)" }}>{b.name}</span>
                <div className="track"><div className="fill" style={{ width: `${(b.count / maxStage) * 100}%` }} /></div>
                <span className="mono" style={{ textAlign: "right" }}>{b.count}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block icon={AlertTriangle} title="Low readiness — needs SE input">
          {atRisk.length ? atRisk.map(d => (
            <div className="alert-row" key={d.id} onClick={() => onOpen(d.id)}>
              <Ring value={d.s} size={38} stroke={4} />
              <div>
                <div className="anm">{d.company}</div>
                <div className="as2">{STAGES[d.stage]} · {readiness(d).items.filter(i => !i.done).length} items missing</div>
              </div>
              <ChevronLeft size={16} color="var(--muted2)" style={{ marginLeft: "auto", transform: "rotate(180deg)" }} />
            </div>
          )) : <div className="empty"><CheckCircle2 size={15} /> Every passport is in good shape.</div>}
        </Block>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer Feedback tab                                             */
/* ------------------------------------------------------------------ */
const SAT_META = {
  "Very Satisfied":   { cls: "vsat", dot: "var(--accent)",  label: "Very Satisfied" },
  "Satisfied":        { cls: "sat",  dot: "var(--ok)",      label: "Satisfied" },
  "Neutral":          { cls: "neu",  dot: "var(--muted2)",  label: "Neutral" },
  "Unsatisfied":      { cls: "s",    dot: "var(--warn)",    label: "Unsatisfied" },
  "Very Unsatisfied": { cls: "vs",   dot: "var(--bad)",     label: "Very Unsatisfied" },
};

function SatBadge({ sat, size = "md" }) {
  const m = SAT_META[sat] || SAT_META["Neutral"];
  return (
    <span className={`sat-chip ${m.cls}`} style={{ fontSize: size === "sm" ? 10.5 : 11.5 }}>
      <span className="sat-dot" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

// Map a Notion "Satellite Imagery Customer Feedback" row → the card's entry shape.
function mapNotionFeedback(r) {
  const arr = (v) => Array.isArray(v) ? v : (v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : []);
  const str = (v) => Array.isArray(v) ? v.join(", ") : (v || "");
  return {
    id: "notion-" + r._id,
    notionPageId: r._id,
    _fromNotion: true,
    satisfaction: r["Satisfaction Rating"] || "Neutral",
    keyInsights: r["Key Insights"] || "",
    date: r["Feedback Date"] || "",
    type: r["Type"] || "",
    customerExpertise: r["Customer Expertise"] || "",
    softwareUsed: str(r["Software Used"]),
    imageBandsets: arr(r["Image Bandset(s)"]),
    imageIds: arr(r["Image IDs"]),
    followUpDate: r["Follow-up Date"] || "",
    followUpAssignedTo: str(r["Follow Up Assigned To"]),
    supportingFiles: Array.isArray(r["Supporting Files & Images"]) ? r["Supporting Files & Images"] : [],
  };
}

function FeedbackTab({ d, canEdit, onUpdate, toast }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    satisfaction: "Satisfied", keyInsights: "", imageBandsets: "",
    imageIds: "", customerExpertise: "Intermediate", softwareUsed: "",
    followUpDate: "", followUpAssignedTo: "", type: "Client",
  });

  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [notionEntries, setNotionEntries] = useState([]);

  // Pull existing feedback for this customer from Notion. Match on the dedicated
  // "Hubspot name" column (the exact HubSpot company name), normalized for
  // case/whitespace. All matching rows are kept — including intentional duplicates.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/hubspot-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ action: "list_feedback" }),
        });
        const data = await res.json();
        if (cancelled || !data.ok) return;
        const norm = (s) => String(s || "").trim().toLowerCase();
        const target = norm(d.company);
        const matched = target ? (data.rows || []).filter(r => norm(r["Hubspot name"]) === target) : [];
        setNotionEntries(matched.map(mapNotionFeedback));
      } catch (e) { /* best-effort pull */ }
    })();
    return () => { cancelled = true; };
  }, [d.company, d.id]);

  // Merge local (Supabase) entries with Notion-only entries, deduped by page id.
  const localEntries = d.feedback || [];
  const localPageIds = new Set(localEntries.map(f => f.notionPageId).filter(Boolean));
  const pulledOnly = notionEntries.filter(ne => !localPageIds.has(ne.notionPageId));
  const allEntries = [...localEntries, ...pulledOnly].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const items = allEntries.filter(f => filter === "all" || f.satisfaction === filter);
  const counts = Object.fromEntries(Object.keys(SAT_META).map(k => [k, allEntries.filter(f => f.satisfaction === k).length]));
  const unsynced = localEntries.filter(f => !f.notionPageId);

  const syncOne = async (fb) => {
    setSyncingId(fb.id);
    try { await onUpdate({ _syncFeedbackToNotion: { feedback_id: fb.id } }); }
    finally { setSyncingId(null); }
  };
  const syncAll = async () => {
    setSyncingAll(true);
    try { for (const fb of unsynced) { await onUpdate({ _syncFeedbackToNotion: { feedback_id: fb.id } }); } }
    finally { setSyncingAll(false); }
  };

  const submitFeedback = () => {
    if (!form.keyInsights.trim()) { toast("Key insights are required"); return; }
    onUpdate({ _feedbackEntry: {
      feedback_date: new Date().toISOString().slice(0, 10),
      feedback_type: form.type,
      satisfaction: form.satisfaction,
      key_insights: form.keyInsights,
      image_bandsets: form.imageBandsets.split(",").map(s => s.trim()).filter(Boolean),
      image_ids: form.imageIds.split(",").map(s => s.trim()).filter(Boolean),
      customer_expertise: form.customerExpertise,
      software_used: form.softwareUsed,
      follow_up_date: form.followUpDate || null,
      follow_up_assigned_to: form.followUpAssignedTo || null,
      supporting_files: [],
    }});
    setShowForm(false);
    setForm({ satisfaction: "Satisfied", keyInsights: "", imageBandsets: "", imageIds: "", customerExpertise: "Intermediate", softwareUsed: "", followUpDate: "", followUpAssignedTo: "", type: "Client" });
    toast("Feedback entry added");
  };

  return (
    <>
      {/* Notion connection banner */}
      <div className="fb-notion-banner">
        <div style={{ fontSize: 22 }}>𝗡</div>
        <div>
          <div className="nb-title">Notion · Satellite Imagery Customer Feedback</div>
          <div className="nb-status">
            <span className="notion-dot linked" />
            <span>Connected — {[
              pulledOnly.length ? `${pulledOnly.length} pulled from Notion` : null,
              unsynced.length ? `${unsynced.length} not yet synced` : null,
            ].filter(Boolean).join(" · ") || "all entries synced"}</span>
          </div>
        </div>
        {canEdit && unsynced.length > 0 && (
          <button className="connect-btn" onClick={syncAll} disabled={syncingAll}>
            {syncingAll ? <><RefreshCw size={13} className="spin" /> Syncing…</> : <>Sync all ({unsynced.length}) →</>}
          </button>
        )}
      </div>

      {/* Header + filters */}
      <div className="fb-header">
        <div className="fb-sat-bar">
          <button className={`sat-chip all${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
            All · {allEntries.length}
          </button>
          {Object.entries(SAT_META).map(([k, m]) => counts[k] > 0 && (
            <button key={k} className={`sat-chip ${m.cls}${filter === k ? " on" : ""}`} onClick={() => setFilter(f => f === k ? "all" : k)}>
              <span className="sat-dot" style={{ background: m.dot }} />{m.label} · {counts[k]}
            </button>
          ))}
        </div>
        {canEdit && (
          <button className="fb-notion-btn" onClick={() => setShowForm(s => !s)}>
            <Plus size={14} /> {showForm ? "Cancel" : "Add feedback"}
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="block" style={{ marginBottom: 16 }}>
          <div className="bhead"><div className="lhs"><div className="ic"><MessageSquare size={15} /></div><h3>New feedback entry</h3></div></div>
          <div className="fb-grid">
            <div>
              <div className="k">Satisfaction</div>
              <div className="cp-select" style={{ marginTop: 4 }}>
                <select value={form.satisfaction} onChange={e => setForm(f => ({ ...f, satisfaction: e.target.value }))}>
                  {Object.keys(SAT_META).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <ChevronDown size={13} className="chev" />
              </div>
            </div>
            <div>
              <div className="k">Type</div>
              <div className="cp-select" style={{ marginTop: 4 }}>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {["Client", "Internal", "POC review", "Renewal"].map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} className="chev" />
              </div>
            </div>
            <div>
              <div className="k">Customer expertise</div>
              <div className="cp-select" style={{ marginTop: 4 }}>
                <select value={form.customerExpertise} onChange={e => setForm(f => ({ ...f, customerExpertise: e.target.value }))}>
                  {["Beginner", "Intermediate", "Advanced", "Expert"].map(l => <option key={l}>{l}</option>)}
                </select>
                <ChevronDown size={13} className="chev" />
              </div>
            </div>
            <div>
              <div className="k">Software used</div>
              <input style={{ width:"100%",border:"1px solid var(--line)",borderRadius:8,padding:"8px 11px",fontSize:13,fontFamily:"inherit",marginTop:4,outline:"none" }}
                placeholder="e.g. Python, ENVI, ArcGIS" value={form.softwareUsed}
                onChange={e => setForm(f => ({ ...f, softwareUsed: e.target.value }))} />
            </div>
            <div>
              <div className="k">Image bandsets (comma-separated)</div>
              <input style={{ width:"100%",border:"1px solid var(--line)",borderRadius:8,padding:"8px 11px",fontSize:13,fontFamily:"inherit",marginTop:4,outline:"none" }}
                placeholder="e.g. VNIR 400–1000nm, SWIR" value={form.imageBandsets}
                onChange={e => setForm(f => ({ ...f, imageBandsets: e.target.value }))} />
            </div>
            <div>
              <div className="k">Image IDs (comma-separated)</div>
              <input style={{ width:"100%",border:"1px solid var(--line)",borderRadius:8,padding:"8px 11px",fontSize:13,marginTop:4,outline:"none",fontFamily:"var(--font-mono)" }}
                placeholder="FF03_20260421_..." value={form.imageIds}
                onChange={e => setForm(f => ({ ...f, imageIds: e.target.value }))} />
            </div>
            <div>
              <div className="k">Follow-up date</div>
              <input type="date" style={{ width:"100%",border:"1px solid var(--line)",borderRadius:8,padding:"8px 11px",fontSize:13,fontFamily:"inherit",marginTop:4,outline:"none" }}
                value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} />
            </div>
            <div>
              <div className="k">Follow-up assigned to</div>
              <div className="cp-select" style={{ marginTop: 4 }}>
                <select value={form.followUpAssignedTo} onChange={e => setForm(f => ({ ...f, followUpAssignedTo: e.target.value }))}>
                  <option value="">— select —</option>
                  {[...TEAM.se, ...TEAM.cs, ...TEAM.analytics].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={13} className="chev" />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="k">Key insights *</div>
            <textarea style={{ width:"100%",border:"1px solid var(--line)",borderRadius:10,padding:"11px 13px",fontSize:13.5,fontFamily:"inherit",marginTop:4,resize:"vertical",minHeight:90,outline:"none" }}
              placeholder="What did the customer say? What worked, what didn't? Any commitments or action points?"
              value={form.keyInsights} onChange={e => setForm(f => ({ ...f, keyInsights: e.target.value }))} />
          </div>
          <div style={{ marginTop: 12, display:"flex", justifyContent:"flex-end", gap:8 }}>
            <button className="btn ghost" style={{ color:"var(--muted)", border:"1px solid var(--line)", background:"#fff" }} onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn solid" onClick={submitFeedback}><Send size={13} /> Save entry</button>
          </div>
        </div>
      )}

      {/* Feedback entries */}
      {items.length === 0 ? (
        <div className="fb-empty">
          <MessageSquare size={32} color="var(--line)" />
          <h4>{filter === "all" ? "No feedback yet" : `No ${filter} feedback`}</h4>
          <p style={{ fontSize:13, maxWidth:320, margin:"0 auto" }}>
            {filter === "all"
              ? "Add the first feedback entry above — you can then sync it to the Satellite Imagery Customer Feedback database in Notion."
              : "Try clearing the satisfaction filter."}
          </p>
        </div>
      ) : (
        items.map(fb => (
          <div className="fb-card" key={fb.id}>
            <div className="fb-card-head" onClick={() => setExpanded(expanded === fb.id ? null : fb.id)}>
              <SatBadge sat={fb.satisfaction} />
              <div className="co">
                <div className="title">{fb.keyInsights.slice(0, 72)}{fb.keyInsights.length > 72 ? "…" : ""}</div>
                <div className="meta">
                  <span>{fb.date}</span>
                  <span>·</span>
                  <span>{fb.type}</span>
                  <span>·</span>
                  <span>{fb.customerExpertise}</span>
                  {fb.followUpDate && <><span>·</span><span>Follow-up {fb.followUpDate}</span></>}
                  {fb._fromNotion && <><span>·</span><span style={{ color:"var(--accent-deep)", fontWeight:600 }}>From Notion</span></>}
                </div>
              </div>
              <ChevronDown size={16} color="var(--muted2)" style={{ transform: expanded === fb.id ? "rotate(180deg)" : "none", transition:".15s" }} />
            </div>
            {expanded === fb.id && (
              <div className="fb-card-body">
                <div className="fb-insights">{fb.keyInsights}</div>
                <div className="fb-grid" style={{ marginTop: 16 }}>
                  <div>
                    <div className="k">Image bandsets</div>
                    <div className="v">{fb.imageBandsets.length ? fb.imageBandsets.join(", ") : "—"}</div>
                  </div>
                  <div>
                    <div className="k">Image IDs</div>
                    <div className="fb-ids">{fb.imageIds.length ? fb.imageIds.map((id, i) => <span className="fb-id" key={i}>{id}</span>) : <span className="v">—</span>}</div>
                  </div>
                  <div>
                    <div className="k">Customer expertise</div>
                    <div className="v">{fb.customerExpertise || "—"}</div>
                  </div>
                  <div>
                    <div className="k">Software used</div>
                    <div className="v">{fb.softwareUsed || "—"}</div>
                  </div>
                  <div>
                    <div className="k">Follow-up date</div>
                    <div className="v">{fb.followUpDate || "—"}</div>
                  </div>
                  <div>
                    <div className="k">Follow-up assigned to</div>
                    <div className="v">{fb.followUpAssignedTo || "—"}</div>
                  </div>
                  {fb.supportingFiles && fb.supportingFiles.length > 0 && (
                    <div style={{ gridColumn: "span 2" }}>
                      <div className="k">Supporting files</div>
                      <div className="tags" style={{ marginTop: 4 }}>{fb.supportingFiles.map((f, i) => <span className="tag" key={i}>{f}</span>)}</div>
                    </div>
                  )}
                </div>
                {fb.notionPageId ? (
                  <div style={{ marginTop: 14 }}>
                    <a className="link" href={`https://www.notion.so/${String(fb.notionPageId).replace(/-/g, "")}`} target="_blank" rel="noreferrer"><ExternalLink size={12} /> View in Notion</a>
                  </div>
                ) : canEdit ? (
                  <div style={{ marginTop: 14 }}>
                    <button onClick={() => syncOne(fb)} disabled={syncingId === fb.id}
                      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, border:"1px solid var(--line)", background:"#fff", color:"var(--accent-deep)", fontSize:12, fontWeight:500, cursor: syncingId === fb.id ? "wait" : "pointer" }}>
                      {syncingId === fb.id ? <><RefreshCw size={12} className="spin" /> Syncing…</> : <><ExternalLink size={12} /> Sync to Notion</>}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--muted2)", fontFamily: "var(--font-mono)", display:"flex", alignItems:"center", gap:6 }}>
                    <span className="notion-dot" /> Not yet synced to Notion
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  App shell                                                         */
/* ------------------------------------------------------------------ */
/* ================================================================
   SUPABASE DATA LAYER
   ================================================================ */

const SUPABASE_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL)
  || "https://plspunlkmkvplgcsncpa.supabase.co";
const SUPABASE_ANON_KEY = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY)
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3B1bmxrbWt2cGxnY3NuY3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzA3NTMsImV4cCI6MjA5NzM0Njc1M30.SMybWhOWztQFzXSlosW1c_MVdndXsVOLcyfGJUd63eE";

// ── Auth-aware Supabase client ────────────────────────────────
// We keep a mutable session token so all REST calls automatically
// use the authenticated user's JWT once they've signed in.
let _authToken = SUPABASE_ANON_KEY;
function setAuthToken(tok) { _authToken = tok || SUPABASE_ANON_KEY; }
function getHeaders(extra = {}) {
  return {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${_authToken}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    ...extra,
  };
}

// ── Auth API helpers ──────────────────────────────────────────
const AUTH_URL = `${SUPABASE_URL}/auth/v1`;

async function signInWithGoogle() {
  // Redirect to Supabase Google OAuth — comes back to current URL, including
  // any ?deal=<id> so a shared link still opens the right passport after sign-in.
  const redirectTo = encodeURIComponent(window.location.origin + window.location.pathname + window.location.search);
  window.location.href = `${AUTH_URL}/authorize?provider=google&redirect_to=${redirectTo}`;
}

async function signOut() {
  await fetch(`${AUTH_URL}/logout`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${_authToken}` },
  });
  setAuthToken(null);
  // Clear hash/query params and reload
  window.location.href = window.location.origin + window.location.pathname;
}

async function getSession() {
  // Check URL hash for access_token (OAuth callback)
  const hash = window.location.hash;
  if (hash && hash.includes("access_token")) {
    const params = new URLSearchParams(hash.replace("#", "?"));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken) {
      // Store in sessionStorage so refresh survives navigation
      sessionStorage.setItem("sb_access_token", accessToken);
      if (refreshToken) sessionStorage.setItem("sb_refresh_token", refreshToken);
      // Clean up URL
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return accessToken;
    }
  }
  // Check sessionStorage
  const stored = sessionStorage.getItem("sb_access_token");
  if (stored) {
    // Verify it's still valid
    try {
      const res = await fetch(`${AUTH_URL}/user`, {
        headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${stored}` },
      });
      if (res.ok) return stored;
      // Token expired — try refresh
      const refresh = sessionStorage.getItem("sb_refresh_token");
      if (refresh) {
        const rRes = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
          method: "POST",
          headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (rRes.ok) {
          const data = await rRes.json();
          sessionStorage.setItem("sb_access_token", data.access_token);
          if (data.refresh_token) sessionStorage.setItem("sb_refresh_token", data.refresh_token);
          return data.access_token;
        }
      }
    } catch (e) {}
    sessionStorage.removeItem("sb_access_token");
    sessionStorage.removeItem("sb_refresh_token");
  }
  return null;
}

async function getUserFromToken(token) {
  const res = await fetch(`${AUTH_URL}/user`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Resolve access level from email
// - In roster → 'member' (full edit access)
// - @pixxel.space or @pixxel.co.in but not in roster → 'viewer'
// - Anything else → 'denied'
function resolveRoleFromEmail(email) {
  const e = (email || "").toLowerCase();
  // Return the person's team (owner = Sales Director, se, cs, analytics) so edit
  // rights can differ by function; any other Pixxel email is a read-only viewer.
  for (const [group, members] of Object.entries(TEAM_MEMBERS)) {
    if (members.some(p => p.email === e)) return group;
  }
  if (e.endsWith("@pixxel.space") || e.endsWith("@pixxel.co.in")) return "viewer";
  return "denied";
}

function resolveNameFromEmail(email) {
  const e = (email || "").toLowerCase();
  const all = Object.values(TEAM_MEMBERS).flat();
  const match = all.find(p => p.email === e);
  return match ? match.name : null;
}

// Wraps a fetch call: on a 401 (expired JWT), tries to refresh the session
// once and retries the original request before giving up.
async function sbFetchWithRefresh(doFetch) {
  let r = await doFetch();
  if (r.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      r = await doFetch();
    }
  }
  return r;
}

async function tryRefreshSession() {
  const refresh = sessionStorage.getItem("sb_refresh_token");
  if (!refresh) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    sessionStorage.setItem("sb_access_token", data.access_token);
    if (data.refresh_token) sessionStorage.setItem("sb_refresh_token", data.refresh_token);
    setAuthToken(data.access_token);
    return true;
  } catch (e) { return false; }
}

async function sbGet(table, params = "") {
  const r = await sbFetchWithRefresh(() => fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, { headers: getHeaders() }));
  if (!r.ok) {
    if (r.status === 401) throw new Error("Your session has expired — please sign in again.");
    throw new Error(`${r.status}: ${await r.text()}`);
  }
  return r.json();
}

async function sbPost(table, body) {
  const r = await sbFetchWithRefresh(() => fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(body),
  }));
  if (!r.ok) {
    if (r.status === 401) throw new Error("Your session has expired — please sign in again.");
    throw new Error(`${r.status}: ${await r.text()}`);
  }
  const text = await r.text();
  return text ? JSON.parse(text) : {};
}

async function sbPatch(table, id, body) {
  const r = await sbFetchWithRefresh(() => fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: getHeaders({ "Prefer": "return=minimal" }),
    body: JSON.stringify(body),
  }));
  if (!r.ok) {
    if (r.status === 401) throw new Error("Your session has expired — please sign in again.");
    throw new Error(`${r.status}: ${await r.text()}`);
  }
}

// ── Sign-in screen ────────────────────────────────────────────
function PassportSignInLogo() {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img src={PASSPORT_LOGO} alt="Pixxel Customer Passport"
        style={{ width: 200, maxWidth: "72vw", height: "auto" }}
        onError={() => setFailed(true)} />
    );
  }
  // Fallback placeholder mark if the logo file isn't deployed yet
  const ACCENT = "#0EA5B7";
  const MUTED = "#7C8595";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="6" stroke="white" strokeWidth="1.5" fill="none"/>
          <circle cx="11" cy="11" r="2.5" fill="white"/>
          <path d="M11 2v3M11 17v3M2 11h3M17 11h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ color: "white", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>pixxel</div>
        <div style={{ color: MUTED, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Customer Passport</div>
      </div>
    </div>
  );
}

function SignInScreen({ loading }) {
  const INK = "#0B1220";
  const MUTED = "#7C8595";
  const ACCENT = "#0EA5B7";
  return (
    <div style={{
      minHeight: "100vh", background: INK, display: "flex",
      alignItems: "center", justifyContent: "center", flexDirection: "column",
      fontFamily: "Inter, sans-serif",
    }}>
      {/* Spectral header line */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg,#7B2FBE,#2D7FF9,#0EA5B7,#2FB67A,#F0A429,#E5564B)",
      }} />
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <PassportSignInLogo />
        </div>

        <h1 style={{ color: "white", fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8, letterSpacing: -0.5 }}>
          Welcome back
        </h1>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 40, lineHeight: 1.6 }}>
          Sign in with your Pixxel Google account to access deal passports, manage handovers, and track customer engagements.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: "14px 20px", borderRadius: 12, border: "none",
            background: loading ? "#E2E5EA" : "#FFFFFF", color: "#1F2433", fontSize: 15,
            fontWeight: 600, cursor: loading ? "wait" : "pointer",
            transition: "all 0.15s", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#F0F2F5"; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#FFFFFF"; }}
        >
          {loading ? (
            <span style={{ color: "#5B6472" }}>Signing in…</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p style={{ color: MUTED, fontSize: 12, marginTop: 24, lineHeight: 1.5 }}>
          Access is restricted to the Pixxel Sales org.<br/>Use your <code style={{ color: ACCENT, fontSize: 11 }}>@pixxel.space</code> or <code style={{ color: ACCENT, fontSize: 11 }}>@pixxel.co.in</code> account.
        </p>
      </div>
    </div>
  );
}

const CORE_PIPELINES_LIST = [
  "Global Commercial Pipeline",
  "Bespoke Analytics (EMEA & APAC)",
  "Reseller Pipeline",
];

async function fetchPassports({ pipeline, stage, ownerFilter, search, archivedView } = {}) {
  const pipes = (pipeline && pipeline !== "all") ? [pipeline] : CORE_PIPELINES_LIST;
  // Use `in.()` with double-quoted values — required so pipeline names with
  // special chars (e.g. "Bespoke Analytics (EMEA & APAC)") are treated literally.
  // The `or=(pipeline.eq.…)` form lets raw parentheses break the filter parse,
  // silently dropping every pipeline listed after the one with parens (Reseller).
  const pipeQ = pipes.map(p => `"${encodeURIComponent(p)}"`).join(",");
  let params = `?select=id,hubspot_deal_id,company,deal_id_display,hubspot_stage,hubspot_stage_idx,hubspot_amount,hubspot_last_contacted,hubspot_last_contact_owner,hubspot_synced_at,owner_director,owner_se,owner_cs,owner_analytics,pipeline,last_activity_label,updated_at,handed_to_cs,handed_to_analytics,is_eap,archived,archived_at,archived_reason&pipeline=in.(${pipeQ})&order=updated_at.desc&limit=300`;
  if (stage !== undefined && stage !== "all") params += `&hubspot_stage_idx=eq.${stage}`;
  // archivedView: "active" (default, hide archived) | "archived" (only archived) | "all"
  if (!archivedView || archivedView === "active") params += `&archived=eq.false`;
  else if (archivedView === "archived") params += `&archived=eq.true`;
  let data = await sbGet("handover_passports", params);
  if (ownerFilter) {
    // Match an assigned role OR someone under "Additional People" (deal_collaborators),
    // so filtering by a person also surfaces deals where they're only a collaborator.
    let collabByPassport = {};
    try {
      const collabs = await sbGet("deal_collaborators", `?select=passport_id,name`);
      for (const c of (collabs || [])) {
        if (!collabByPassport[c.passport_id]) collabByPassport[c.passport_id] = new Set();
        collabByPassport[c.passport_id].add(c.name);
      }
    } catch (_) { /* best-effort — fall back to role-only matching */ }
    data = data.filter(d =>
      [d.owner_se, d.owner_cs, d.owner_analytics, d.owner_director].includes(ownerFilter) ||
      (collabByPassport[d.id] && collabByPassport[d.id].has(ownerFilter))
    );
  }
  if (search) {
    const s = search.toLowerCase();
    data = data.filter(d => (d.company||"").toLowerCase().includes(s) || (d.deal_id_display||"").toLowerCase().includes(s));
  }
  return data;
}

async function fetchPassportDetail(id) {
  const [passport, contacts, pocs, risks, sampleData, captureLog, actionItems, meetingNotes, activityFeed, attachments, feedback, collaborators] = await Promise.all([
    sbGet("handover_passports", `?id=eq.${id}`).then(r => r[0]),
    sbGet("deal_contacts", `?passport_id=eq.${id}`),
    sbGet("deal_pocs", `?passport_id=eq.${id}`),
    sbGet("deal_risks", `?passport_id=eq.${id}`),
    sbGet("deal_sample_data", `?passport_id=eq.${id}`),
    sbGet("capture_log", `?passport_id=eq.${id}&order=entry_date.desc`),
    sbGet("action_items", `?passport_id=eq.${id}&order=due_date.asc`),
    sbGet("meeting_notes", `?passport_id=eq.${id}&order=created_at.desc`),
    sbGet("activity_feed", `?passport_id=eq.${id}&order=created_at.desc`),
    sbGet("attachments", `?passport_id=eq.${id}`),
    sbGet("customer_feedback", `?passport_id=eq.${id}&order=feedback_date.desc`),
    sbGet("deal_collaborators", `?passport_id=eq.${id}&order=created_at.asc`).catch(() => []),
  ]);
  return { passport, contacts: contacts||[], pocs: pocs||[], risks: risks||[], sampleData: sampleData||[], captureLog: captureLog||[], actionItems: actionItems||[], meetingNotes: meetingNotes||[], activityFeed: activityFeed||[], attachments: attachments||[], feedback: feedback||[], collaborators: collaborators||[] };
}

function calcReadiness(passport, contacts) {
  const p = passport || {};
  const items = [
    { label: "Key contacts",      done: contacts && contacts.length > 0 },
    { label: "Use case",          done: !!p.use_case },
    { label: "Pain points",       done: !!p.pain_points },
    { label: "Data sources",      done: p.data_sources && p.data_sources.length > 0 },
    { label: "Bandset",           done: !!p.bandset },
    { label: "Cadence",           done: !!p.cadence },
    { label: "AOI defined",       done: !!p.aoi_geojson },
    { label: "Problem statement", done: !!p.problem_statement },
    { label: "Objectives",        done: p.objectives && p.objectives.length > 0 },
    { label: "Success criteria",  done: p.success_criteria && p.success_criteria.length > 0 },
    { label: "Next steps",        done: !!p.next_steps },
    { label: "All owners",        done: !!(p.owner_se && p.owner_cs && p.owner_analytics) },
  ];
  return { score: Math.round(items.filter(i => i.done).length / items.length * 100), items };
}

async function assignOwner(passportId, role, name) {
  const patch = { [`owner_${role}`]: name };
  // SE mirrors HubSpot's PSE field. Any in-app change (assign OR remove) makes the
  // app the source of truth, so the sync writes it back and won't re-import the PSE.
  if (role === "se") {
    patch.owner_se_source = "app";
    patch.owner_se_updated_at = new Date().toISOString();
  }
  await sbPatch("handover_passports", passportId, patch);
}

async function addActivityEntry(passportId, author, body, mentions = []) {
  await sbPost("activity_feed", { passport_id: passportId, author, body, mentions, entry_type: "note" });
}

async function addCaptureLogEntry(passportId, entry) {
  await sbPost("capture_log", { passport_id: passportId, ...entry });
}

async function toggleActionItem(itemId, done) {
  await sbPatch("action_items", itemId, { done, done_at: done ? new Date().toISOString() : null });
}

async function addActionItem(passportId, item) {
  await sbPost("action_items", { passport_id: passportId, ...item });
}

async function addFeedbackEntry(passportId, entry) {
  await sbPost("customer_feedback", { passport_id: passportId, ...entry });
}

// ── New child-record helpers ──────────────────────────────────
async function sbDelete(table, id) {
  const r = await sbFetchWithRefresh(() => fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE", headers: getHeaders({ "Prefer": "return=minimal" }),
  }));
  if (!r.ok) {
    if (r.status === 401) throw new Error("Your session has expired — please sign in again.");
    throw new Error(`${r.status}: ${await r.text()}`);
  }
}

async function addPoc(passportId, poc) {
  await sbPost("deal_pocs", { passport_id: passportId, ...poc });
}
async function addContactRecord(passportId, contact) {
  await sbPost("deal_contacts", { passport_id: passportId, ...contact });
}
async function addRisk(passportId, risk) {
  await sbPost("deal_risks", { passport_id: passportId, ...risk });
}
async function addSampleData(passportId, description) {
  await sbPost("deal_sample_data", { passport_id: passportId, description });
}
async function addMeetingNote(passportId, note) {
  await sbPost("meeting_notes", { passport_id: passportId, ...note });
}
async function addCollaborator(passportId, person) {
  await sbPost("deal_collaborators", { passport_id: passportId, ...person });
}
async function addAttachmentRecord(passportId, rec) {
  await sbPost("attachments", { passport_id: passportId, ...rec });
}

// ── Supabase Storage ──────────────────────────────────────────
const STORAGE_BUCKET = "passport-files";
async function uploadFile(passportId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${passportId}/${Date.now()}_${safeName}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${_authToken}` },
    body: file,
  });
  if (!r.ok) throw new Error(`Upload failed: ${r.status} ${await r.text()}`);
  return path;
}
function publicFileUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}
async function downloadFileText(path) {
  // For parsing AOI files — fetch as text/arraybuffer
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${_authToken}` },
  });
  if (!r.ok) throw new Error(`Download failed: ${r.status}`);
  return r;
}

async function triggerHubspotSync() {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/hubspot-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({}),
  });
  return r.json();
}

async function sendSlackNotification(event, payload, passportId, channelId) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/slack-notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ event, ...payload, passport_id: passportId, channel_id: channelId }),
  });
  return r.json();
}

function stampNow() {
  const d = new Date();
  const md = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  const hm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${md} · ${hm}`;
}

// Best-effort Slack ping to a set of passport owners. Reuses the "mention"
// event the slack-notify function already handles (one message per owner so
// each gets a direct, attributable notification).
async function notifyOwnersOnSlack(owners, { company, dealId, dealUrl, text, by, channelId, passportId }) {
  const recipients = [...new Set((owners || []).filter(Boolean))];
  let sent = 0;
  for (const name of recipients) {
    try {
      const r = await sendSlackNotification("mention", {
        mentionedPerson: name, mentioned_slack: slackFor(name),
        mentionedBy: by, company, dealId, deal_url: dealUrl, noteText: text,
      }, passportId, channelId);
      if (r && r.ok) sent++;
    } catch (_) { /* best-effort */ }
  }
  return sent;
}

/* ================================================================
   LIVE DEAL LIST  (replaces mock DealList)
   ================================================================ */

// Pipeline colour dots
const PIPE_COLORS = {
  "EAP Private Sector": "#2D7FF9",
  "EAP (ROW)": "#0EA5B7",
  "Bespoke Analytics (EMEA & APAC)": "#7A5AF5",
  "Public Sector (USA)": "#E07A2B",
  "Public Sector (India)": "#2FB67A",
  "Global Commercial Pipeline": "#E5564B",
  "Reseller Pipeline": "#2D7FF9",
  "Other": "#929BAB",
};

function DealListLive({ deals, loading, onOpen, pipelineFilter, setPipelineFilter, stageFilter, setStageFilter, ownerFilter, setOwnerFilter, searchQ, setSearchQ, archivedView, setArchivedView }) {
  return (
    <>
      <h2 className="section-title">Deals</h2>
      <p className="section-sub">
        Core pipeline passports · {deals.length} loaded
        {loading && <span style={{ color: "var(--accent)", marginLeft: 8 }}>Refreshing…</span>}
      </p>

      <div className="cp-filters">
        <div className="cp-search">
          <Search size={17} color="var(--muted2)" />
          <input
            placeholder="Search company or deal ID…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          {searchQ && <button onClick={() => setSearchQ("")} style={{ color:"var(--muted2)", padding:2 }}><X size={14}/></button>}
        </div>

        {/* Pipeline filter */}
        <div className="cp-select">
          <select value={pipelineFilter} onChange={e => setPipelineFilter(e.target.value)}>
            <option value="all">All core pipelines</option>
            {CORE_PIPELINES_LIST.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown size={15} className="chev" />
        </div>

        {/* Stage filter */}
        <div className="cp-select">
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}>
            <option value="all">All stages</option>
            {["Discovery","Technical Validation","Quote / Solution Scoping","Proposal","Contracting & Negotiation","Closed Won","Closed Lost"].map((s,i) =>
              <option key={i} value={i}>{s}</option>
            )}
          </select>
          <ChevronDown size={15} className="chev" />
        </div>

        {/* Owner filter — grouped by team */}
        <div className="cp-select">
          <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
            <option value="">All team members</option>
            <optgroup label="Sales Owners">
              {TEAM.owner.map(p => <option key={"o-"+p} value={p}>{p}</option>)}
            </optgroup>
            <optgroup label="Sales Engineers">
              {TEAM.se.map(p => <option key={"s-"+p} value={p}>{p}</option>)}
            </optgroup>
            <optgroup label="Customer Success">
              {TEAM.cs.map(p => <option key={"c-"+p} value={p}>{p}</option>)}
            </optgroup>
            <optgroup label="Analytics">
              {TEAM.analytics.map(p => <option key={"a-"+p} value={p}>{p}</option>)}
            </optgroup>
          </select>
          <ChevronDown size={15} className="chev" />
        </div>

        {/* Archived filter */}
        <div className="seg">
          <button className={archivedView==="active"?"on":""} onClick={() => setArchivedView("active")}>Active</button>
          <button className={archivedView==="archived"?"on":""} onClick={() => setArchivedView("archived")}>Archived</button>
          <button className={archivedView==="all"?"on":""} onClick={() => setArchivedView("all")}>All</button>
        </div>
      </div>

      {archivedView === "archived" && (
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"var(--muted)", background:"var(--line-soft)", border:"1px solid var(--line)", borderRadius:10, padding:"9px 14px", marginBottom:16 }}>
          <AlertTriangle size={14} color="var(--warn)" />
          These deals are no longer found in HubSpot (deleted, or moved out of a tracked pipeline). Nothing has been deleted here — the full passport history is preserved below.
        </div>
      )}

      {loading && deals.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}>
          <Satellite size={32} color="var(--accent)" style={{ display:"block", margin:"0 auto 12px", opacity:.5 }} />
          Loading deals from HubSpot…
        </div>
      ) : deals.length === 0 ? (
        <div className="empty">No deals match these filters.</div>
      ) : (
        <div className="cp-grid">
          {deals.map(d => {
            const { score } = calcReadiness(d, []);
            const pipeColor = PIPE_COLORS[d.pipeline] || "#929BAB";
            const warmth = d.hubspot_last_contacted
              ? Math.floor((Date.now() - new Date(d.hubspot_last_contacted).getTime()) / 86400000)
              : null;
            return (
              <div key={d.id} className="cp-card" onClick={() => onOpen(d.id)} style={d.archived ? { opacity: 0.72 } : undefined}>
                <div className="row">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", background:pipeColor, flex:"none" }} />
                      <span style={{ fontSize:10.5, color:"var(--muted2)", fontFamily:"var(--font-mono)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.pipeline}</span>
                      {d.archived && <span className="tag" style={{ background:"#FCE9E7", color:"#c0392b", fontSize:10, marginLeft:"auto", flex:"none" }}>Archived</span>}
                      {d.is_eap && <span style={{ fontSize:10, color:"#B5720E" }}><Star size={10} fill="#F0A429" color="#F0A429" style={{ verticalAlign:-1 }} /></span>}
                    </div>
                    <h3 style={{ margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.company}</h3>
                  </div>
                  <Ring value={score} size={46} stroke={5} />
                </div>
                <div style={{ marginTop:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <StageChip stage={d.hubspot_stage_idx} />
                  <span className="cp-amount">{d.hubspot_amount ? "$" + (d.hubspot_amount/1000).toFixed(0) + "k" : "—"}</span>
                </div>
                <div className="owners" style={{ marginTop:14 }}>
                  <OwnerAvatar name={d.owner_director} role="dir" />
                  <OwnerAvatar name={d.owner_se} role="se" />
                  <OwnerAvatar name={d.owner_cs} role="cs" />
                  <OwnerAvatar name={d.owner_analytics} role="an" />
                  <div style={{ flex:1 }} />
                  <span className="cp-amount" style={{ color:"var(--muted2)", fontSize:11 }}>{d.deal_id_display}</span>
                </div>
                <div className="meta" style={{ marginTop:10 }}>
                  <Clock size={12} />
                  {d.last_activity_label || "Unknown"}
                  {warmth !== null && (
                    <span style={{ marginLeft:6, color: warmth <= 3 ? "var(--ok)" : warmth <= 14 ? "var(--warn)" : "var(--bad)", fontSize:11 }}>
                      · contacted {warmth}d ago
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ================================================================
   PASSPORT DETAIL ADAPTER
   Maps Supabase shape → existing Passport component props
   ================================================================ */

function PassportDetail({ data, onBack, canEdit, canPostNote, onRefresh, onAssign, onNotifyAll, onPostToSlack, slackChannel, slackSending, slackStatus, toast, currentUserName }) {
  const { passport: p, contacts, pocs, risks, sampleData, captureLog, actionItems, meetingNotes, activityFeed, attachments, feedback, collaborators } = data;
  const { score, items: readinessItems } = calcReadiness(p, contacts);

  // Map Supabase passport → the shape Passport component expects
  const deal = {
    id: p.id,
    company: p.company,
    sector: p.sector || p.pipeline || "",
    hubspotId: p.hubspot_deal_id,
    lastActivity: p.last_activity_label || "Unknown",
    lastContact: p.hubspot_last_contacted ? {
      date: new Date(p.hubspot_last_contacted).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }),
      owner: p.hubspot_last_contact_owner || p.owner_se || "—",
      warmth: (() => { const d = Math.floor((Date.now() - new Date(p.hubspot_last_contacted).getTime()) / 86400000); return d <= 3 ? "warm" : d <= 14 ? "cool" : "cold"; })(),
      daysAgo: Math.floor((Date.now() - new Date(p.hubspot_last_contacted).getTime()) / 86400000),
    } : null,
    stage: p.hubspot_stage_idx || 0,
    amount: p.hubspot_amount,
    owners: { owner: p.owner_director, se: p.owner_se, cs: p.owner_cs, analytics: p.owner_analytics },
    sectionStamps: { profile: p.stamp_profile, context: p.stamp_context, execution: p.stamp_execution },
    handover: {
      cs: !!p.handed_to_cs, csAt: p.handed_to_cs_at, csBy: p.handed_to_cs_by,
      analytics: !!p.handed_to_analytics, analyticsAt: p.handed_to_analytics_at, analyticsBy: p.handed_to_analytics_by,
      backToSe: !!p.handed_back_to_se, backToSeAt: p.handed_back_to_se_at, backToSeBy: p.handed_back_to_se_by, backToSeNote: p.handed_back_to_se_note || "",
    },
    isEap: !!p.is_eap,
    archived: !!p.archived, archivedAt: p.archived_at, archivedReason: p.archived_reason,
    profile: {
      contacts: contacts.map(c => ({ id: c.id, name: c.name, role: c.role, email: c.email })),
      team: p.customer_team || "",
      expertiseLevel: p.expertise_level || "",
      useCase: p.use_case || "",
      painPoints: p.pain_points || "",
      supportNeeds: p.support_needs || "",
      imageryPriorities: p.imagery_priorities || [],
      expectedValue: p.expected_value || "",
      customerCadence: p.customer_cadence || "",
      tech: {
        dataSources: p.data_sources || [],
        bandset: p.bandset || "",
        cadence: p.cadence || "",
        aoiLink: !!p.aoi_link,
        feasibilityLink: !!p.feasibility_link,
        feasibilityFiles: p.feasibility_files || [],
        aoiFiles: p.aoi_files || [],
        timeOfInterest: p.time_of_interest || [],
      },
    },
    context: {
      problem: p.problem_statement || "",
      objectives: p.objectives || [],
      aoi: p.aoi_geojson || null,
    },
    execution: {
      successCriteria: p.success_criteria || [],
      pocs: pocs.map(poc => ({ id: poc.id, name: poc.name, status: poc.status, note: poc.note })),
      sampleData: sampleData.map(s => ({ id: s.id, text: s.description })),
      risks: risks.map(r => ({ id: r.id, sev: r.severity, text: r.description })),
      nextSteps: p.next_steps || "",
      commercial: p.commercial_model || "",
      auroraWorkspace: p.aurora_workspace || "",
      auroraUrl: p.aurora_url || "",
      commercialLegal: Array.isArray(p.commercial_legal) ? p.commercial_legal : [],
      captureLog: captureLog.map(e => ({
        id: e.id, date: e.entry_date, status: e.status, failReason: e.fail_reason || "",
        note: e.note, author: e.author, shotPath: e.screenshot_path || "",
        ts: new Date(e.created_at).toLocaleString("en-GB", { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" }),
      })),
      sampleAoi: p.sample_aoi_geojson || null,
      taskedAois: p.tasked_aois || [],
      actionItems: actionItems.map(a => ({
        id: a.id, task: a.task, owner: a.owner, due: a.due_date, done: a.done,
      })),
    },
    notes: {
      meetings: meetingNotes.map(n => ({ id: n.id, date: n.note_date || "", author: n.author, text: n.body })),
      activity: activityFeed.map(a => ({
        date: new Date(a.created_at).toLocaleString("en-GB", { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" }),
        author: a.author, text: a.body, mentions: a.mentions || [],
      })),
      attachments: attachments.map(a => ({ id: a.id, name: a.file_name, type: a.file_type, size: a.file_size, path: a.storage_path })),
    },
    collaborators: (collaborators || []).map(c => ({ id: c.id, name: c.name, email: c.email, note: c.note })),
    links: { aoiLink: p.aoi_link || "", feasibilityLink: p.feasibility_link || "" },    feedback: feedback.map(f => ({
      id: f.id, date: f.feedback_date, type: f.feedback_type,
      satisfaction: f.satisfaction, keyInsights: f.key_insights || "",
      imageBandsets: f.image_bandsets || [], imageIds: f.image_ids || [],
      customerExpertise: f.customer_expertise, softwareUsed: f.software_used,
      followUpDate: f.follow_up_date, followUpAssignedTo: f.follow_up_assigned_to,
      supportingFiles: f.supporting_files || [], notionPageId: f.notion_page_id || "",
    })),
  };

  // Intercept onUpdate to persist changes
  const handleUpdate = async (updated) => {
   try {
    // Activity feed post
    if (updated._activityPost) {
      const { author, body, mentions, mentionEmails } = updated._activityPost;
      await addActivityEntry(p.id, author, body, mentions);
      // Notify each mentioned person by email
      if (mentionEmails && mentionEmails.length) {
        for (const email of mentionEmails) {
          fetch(`${SUPABASE_URL}/functions/v1/slack-notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({
              event: "mention_email",
              to_email: email,
              company: p.company,
              dealId: p.deal_id_display,
              noteText: body,
              mentionedBy: author,
            }),
          }).catch(() => {});
        }
      }
      await onRefresh();
      return;
    }
    // Capture log entry
    if (updated._captureEntry) {
      await addCaptureLogEntry(p.id, updated._captureEntry);
      await onRefresh();
      // Notify the passport owners in Slack about the new capture event
      const ce = updated._captureEntry;
      const reason = ce.fail_reason ? ` — ${ce.fail_reason}` : "";
      const sent = await notifyOwnersOnSlack(
        [p.owner_director, p.owner_se, p.owner_cs, p.owner_analytics],
        { company: p.company, dealId: p.deal_id_display,
          text: `:satellite: Capture log update on *${p.company}*: *${ce.status}*${reason}. ${ce.note || ""}`.trim(),
          by: currentUserName, channelId: slackChannel ? slackChannel.id : undefined, passportId: p.id });
      if (sent) toast(`Capture logged · notified ${sent} owner${sent !== 1 ? "s" : ""} in Slack`);
      return;
    }
    // Capture log entry — edit
    if (updated._updateCaptureEntry) {
      await sbPatch("capture_log", updated._updateCaptureEntry.id, updated._updateCaptureEntry.fields);
      await onRefresh();
      return;
    }
    // Action item toggle
    if (updated._toggleAction) {
      await toggleActionItem(updated._toggleAction.id, updated._toggleAction.done);
      await onRefresh();
      return;
    }
    // Action item add
    if (updated._addAction) {
      await addActionItem(p.id, updated._addAction);
      await onRefresh();
      // Notify the assigned owner in Slack of their new action item
      const ai = updated._addAction;
      if (ai.owner) {
        const due = ai.due_date ? ` (due ${ai.due_date})` : "";
        const sent = await notifyOwnersOnSlack([ai.owner], {
          company: p.company, dealId: p.deal_id_display,
          text: `:ballot_box_with_check: New action item for you on *${p.company}*: "${ai.task}"${due}`,
          by: currentUserName, channelId: slackChannel ? slackChannel.id : undefined, passportId: p.id });
        if (sent) toast(`Action added · ${ai.owner} notified in Slack`);
      }
      return;
    }
    // Feedback entry
    if (updated._feedbackEntry) {
      await addFeedbackEntry(p.id, updated._feedbackEntry);
      await onRefresh();
      return;
    }
    // Push a feedback entry to the Notion "Satellite Imagery Customer Feedback" DB
    if (updated._syncFeedbackToNotion) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hubspot-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: "push_feedback_to_notion", feedback_id: updated._syncFeedbackToNotion.feedback_id, customer_name: p.company }),
      });
      const data = await res.json();
      if (data.ok) { toast("✓ Feedback synced to Notion"); await onRefresh(); }
      else toast("Notion: " + (data.error || "not configured yet"));
      return;
    }
    // ── New child records ──────────────────────────────────────
    if (updated._addPoc) { await addPoc(p.id, updated._addPoc); await onRefresh(); return; }
    if (updated._addContact) { await addContactRecord(p.id, updated._addContact); await onRefresh(); return; }
    if (updated._addRisk) { await addRisk(p.id, updated._addRisk); await onRefresh(); return; }
    if (updated._addSample) { await addSampleData(p.id, updated._addSample); await onRefresh(); return; }
    if (updated._addMeetingNote) { await addMeetingNote(p.id, updated._addMeetingNote); await onRefresh(); return; }
    if (updated._addCollaborator) {
      await addCollaborator(p.id, updated._addCollaborator);
      await onRefresh();
      // Notify the newly-added additional contact (best-effort).
      const person = updated._addCollaborator;
      sendSlackNotification("collaborator", {
        person: person.name, person_slack: slackFor(person.name),
        company: p.company, dealId: p.deal_id_display, addedBy: currentUserName || "Team",
      }, p.id, slackChannel ? slackChannel.id : undefined).catch(() => {});
      return;
    }
    // Attachment that's a link (e.g. Google Drive) rather than an uploaded file
    if (updated._addAttachmentLink) {
      const { name, url } = updated._addAttachmentLink;
      await addAttachmentRecord(p.id, {
        file_name: name || url, file_type: "link", file_size: "link", storage_path: url,
      });
      await onRefresh();
      return;
    }
    if (updated._deleteRecord) {
      await sbDelete(updated._deleteRecord.table, updated._deleteRecord.id);
      await onRefresh();
      return;
    }
    // ── File upload (attachment / feasibility PDF) ─────────────
    if (updated._uploadFile) {
      const { file, kind } = updated._uploadFile;
      const path = await uploadFile(p.id, file);
      if (kind === "attachment") {
        await addAttachmentRecord(p.id, {
          file_name: file.name, file_type: file.type || "file",
          file_size: (file.size/1024).toFixed(0) + " KB", storage_path: path,
        });
      } else if (kind === "feasibility") {
        await sbPatch("handover_passports", p.id, { feasibility_link: publicFileUrl(path) });
      }
      await onRefresh();
      return;
    }
    // ── Feasibility / supporting files (up to 10, JSONB array) ──
    if (updated._uploadFeasibilityFile) {
      const { file } = updated._uploadFeasibilityFile;
      const path = await uploadFile(p.id, file);
      const current = Array.isArray(p.feasibility_files) ? p.feasibility_files : [];
      if (current.length < 10) {
        const next = [...current, { name: file.name, url: path, type: "file" }];
        await sbPatch("handover_passports", p.id, { feasibility_files: next });
      }
      await onRefresh();
      return;
    }
    if (updated._addFeasibilityLink) {
      const { name, url } = updated._addFeasibilityLink;
      const current = Array.isArray(p.feasibility_files) ? p.feasibility_files : [];
      if (current.length < 10) {
        const next = [...current, { name, url, type: "link" }];
        await sbPatch("handover_passports", p.id, { feasibility_files: next });
      }
      await onRefresh();
      return;
    }
    if (updated._removeFeasibilityFile) {
      const { idx } = updated._removeFeasibilityFile;
      const current = Array.isArray(p.feasibility_files) ? p.feasibility_files : [];
      const next = current.filter((_, i) => i !== idx);
      await sbPatch("handover_passports", p.id, { feasibility_files: next });
      await onRefresh();
      return;
    }
    // ── AOI files (separate section, up to 10, JSONB array) ─────
    if (updated._uploadAoiFile) {
      const { file } = updated._uploadAoiFile;
      const path = await uploadFile(p.id, file);
      const current = Array.isArray(p.aoi_files) ? p.aoi_files : [];
      if (current.length < 10) {
        const next = [...current, { name: file.name, url: path, type: "file" }];
        await sbPatch("handover_passports", p.id, { aoi_files: next });
      }
      await onRefresh();
      return;
    }
    if (updated._addAoiLink) {
      const { name, url } = updated._addAoiLink;
      const current = Array.isArray(p.aoi_files) ? p.aoi_files : [];
      if (current.length < 10) {
        const next = [...current, { name, url, type: "link" }];
        await sbPatch("handover_passports", p.id, { aoi_files: next });
      }
      await onRefresh();
      return;
    }
    if (updated._removeAoiFile) {
      const { idx } = updated._removeAoiFile;
      const current = Array.isArray(p.aoi_files) ? p.aoi_files : [];
      const next = current.filter((_, i) => i !== idx);
      await sbPatch("handover_passports", p.id, { aoi_files: next });
      await onRefresh();
      return;
    }
    // ── Time of Interest capture windows ────────────────────────
    if (updated._setToi) {
      await sbPatch("handover_passports", p.id, { time_of_interest: updated._setToi });
      await onRefresh();
      return;
    }
    // ── AOI upload (parsed GeoJSON) ────────────────────────────
    if (updated._setAoi) {
      const { geojson, which } = updated._setAoi; // which: 'aoi' | 'sample'
      const col = which === "sample" ? "sample_aoi_geojson" : "aoi_geojson";
      await sbPatch("handover_passports", p.id, { [col]: geojson });
      await onRefresh();
      return;
    }
    // ── AOI / feasibility link (text URL) ──────────────────────
    if (updated._setLink) {
      const { field, url } = updated._setLink; // field: 'aoi_link' | 'feasibility_link'
      await sbPatch("handover_passports", p.id, { [field]: url });
      await onRefresh();
      return;
    }
    // Handover status toggle (SE → CS / SE → Analytics)
    if (updated._handoverToggle) {
      const { team, value } = updated._handoverToggle; // team: 'cs' | 'analytics'
      const patch = value
        ? { [`handed_to_${team}`]: true, [`handed_to_${team}_at`]: new Date().toISOString(), [`handed_to_${team}_by`]: currentUserName || "You" }
        : { [`handed_to_${team}`]: false, [`handed_to_${team}_at`]: null, [`handed_to_${team}_by`]: null };
      await sbPatch("handover_passports", p.id, patch);
      await onRefresh();
      if (value) {
        const owner = team === "cs" ? p.owner_cs : p.owner_analytics;
        const teamLabel = team === "cs" ? "Customer Success" : "Analytics";
        let sent = 0;
        if (owner) {
          // Deep-link straight to this deal's passport (the app opens ?deal=<id> on load).
          const dealUrl = `${window.location.origin}/?deal=${p.id}`;
          sent = await notifyOwnersOnSlack([owner], {
            company: p.company, dealId: p.deal_id_display, dealUrl,
            text: `:incoming_envelope: <${dealUrl}|${p.company}> has been handed over to ${teamLabel}. It's now on your radar.`,
            by: currentUserName, channelId: slackChannel ? slackChannel.id : undefined, passportId: p.id });
          // Also email the owner
          const person = Object.values(TEAM_MEMBERS).flat().find(x => x.name === owner);
          if (person && person.email) {
            fetch(`${SUPABASE_URL}/functions/v1/slack-notify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
              body: JSON.stringify({
                event: "mention_email", to_email: person.email,
                company: p.company, dealId: p.deal_id_display,
                noteText: `${p.company} has been handed over to ${teamLabel} by ${currentUserName || "the SE"}. It's now on your radar in the Customer Passport.`,
                mentionedBy: currentUserName || "SE team",
              }),
            }).catch(() => {});
          }
        }
        toast(`Marked as handed to ${team === "cs" ? "CS" : "Analytics"}` + (owner ? ` · ${owner} notified (Slack + email)` : ""));
      }
      return;
    }
    // Hand back to SE — flags that the SE owns the next step (tasks to finish
    // before CS/Analytics can proceed). Optional note explains what's needed.
    if (updated._handbackToSe) {
      const { value, note } = updated._handbackToSe;
      const patch = value
        ? { handed_back_to_se: true, handed_back_to_se_at: new Date().toISOString(), handed_back_to_se_by: currentUserName || "You", handed_back_to_se_note: note || null }
        : { handed_back_to_se: false, handed_back_to_se_at: null, handed_back_to_se_by: null, handed_back_to_se_note: null };
      await sbPatch("handover_passports", p.id, patch);
      await onRefresh();
      if (value && p.owner_se) {
        const noteLine = note ? `\n> ${note}` : "";
        await notifyOwnersOnSlack([p.owner_se], {
          company: p.company, dealId: p.deal_id_display,
          text: `:back: *${p.company}* has been handed back to you (SE) — the next step is yours.${noteLine}`,
          by: currentUserName, channelId: slackChannel ? slackChannel.id : undefined, passportId: p.id });
        const person = Object.values(TEAM_MEMBERS).flat().find(x => x.name === p.owner_se);
        if (person && person.email) {
          fetch(`${SUPABASE_URL}/functions/v1/slack-notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({
              event: "mention_email", to_email: person.email,
              company: p.company, dealId: p.deal_id_display,
              noteText: `${p.company} has been handed back to you (SE) by ${currentUserName || "CS"}. The next step is yours.${note ? " Note: " + note : ""}`,
              mentionedBy: currentUserName || "CS team",
            }),
          }).catch(() => {});
        }
      }
      toast(value ? `Handed back to SE${p.owner_se ? ` · ${p.owner_se} notified` : ""}` : "Hand-back cleared");
      return;
    }
    // EAP (Early Access Program) flag
    if (updated._toggleEap) {
      await sbPatch("handover_passports", p.id, { is_eap: updated._toggleEap.value });
      await onRefresh();
      return;
    }
    // Pull HubSpot notes/meetings for this one deal
    if (updated._syncNotes) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/hubspot-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            action: "sync_notes_for_deal",
            hubspot_deal_id: p.hubspot_deal_id,
            passport_id: p.id,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          const bits = [];
          if (data.notes_added > 0) bits.push(`${data.notes_added} note${data.notes_added!==1?"s":""}`);
          if (data.contacts_added > 0) bits.push(`${data.contacts_added} contact${data.contacts_added!==1?"s":""}`);
          toast(bits.length ? `Pulled ${bits.join(" and ")} from HubSpot` : "Already up to date with HubSpot");
        }
        else toast("Sync failed: " + (data.error || "unknown"));
        await onRefresh();
      } catch (e) { toast("Notes sync failed: " + e.message); }
      return;
    }
    // General single-field update (text, tags, lists) → persist to passport row
    if (updated._fieldUpdate) {
      const { field, value } = updated._fieldUpdate;
      const ALLOWED = [
        "customer_team","use_case","pain_points","support_needs","data_sources",
        "bandset","cadence","problem_statement","objectives","success_criteria",
        "next_steps","commercial_model","expertise_level","tasked_aois",
        "imagery_priorities","expected_value","aurora_workspace","aurora_url","commercial_legal",
        "customer_cadence",
      ];
      if (ALLOWED.includes(field)) {
        // Record this field as app-edited so the HubSpot sync won't overwrite it
        const prevEdited = Array.isArray(p.app_edited_fields) ? p.app_edited_fields : [];
        const nextEdited = prevEdited.includes(field) ? prevEdited : [...prevEdited, field];
        const patch = { [field]: value, app_edited_fields: nextEdited };
        // Single passport-wide "last updated by / when" stamp (stored in stamp_profile)
        if (currentUserName) patch.stamp_profile = { by: currentUserName, at: stampNow() };
        await sbPatch("handover_passports", p.id, patch);
        await onRefresh();
      }
      return;
    }
    // General passport field update — build Supabase fields from changed deal
    const fields = {};
    if (updated.owners) {
      if (updated.owners.owner !== deal.owners.owner) fields.owner_director = updated.owners.owner;
      if (updated.owners.se !== deal.owners.se) {
        fields.owner_se = updated.owners.se;
        // Mark the app as the source (for assign OR remove) so the sync writes this
        // back to HubSpot and never re-imports it from the PSE field.
        fields.owner_se_source = "app";
        fields.owner_se_updated_at = new Date().toISOString();
      }
      if (updated.owners.cs !== deal.owners.cs) fields.owner_cs = updated.owners.cs;
      if (updated.owners.analytics !== deal.owners.analytics) fields.owner_analytics = updated.owners.analytics;
    }
    if (Object.keys(fields).length) {
      await sbPatch("handover_passports", p.id, fields);
      await onRefresh();
    }
   } catch (e) {
     // Surface previously-silent save/delete failures (RLS, schema, network)
     // so "nothing happened" becomes a visible, diagnosable error.
     toast("Save failed: " + (e.message || e));
   }
  };

  return (
    <Passport
      deal={deal}
      onBack={onBack}
      canEdit={canEdit}
      canPostNote={canPostNote}
      onUpdate={handleUpdate}
      onAssign={(r, name) => onAssign(r, name)}
      onNotifyAll={onNotifyAll}
      onPostToSlack={onPostToSlack}
      onPushPlanhat={async () => {
        toast("Pushing to PlanHat…");
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/hubspot-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ action: "push_to_planhat", passport_id: p.id }),
          });
          const data = await res.json();
          if (data.ok) {
            const who = data.company_name ? `"${data.company_name}"` : "company";
            const how = data.company_created ? `created ${who}` : `matched ${who}${data.matched_by === "externalId" ? " by HubSpot ID" : ""}`;
            const link = data.passport_field_set ? " · passport link set" : " · couldn't set Customer Passport field (check field name)";
            toast(`✓ PlanHat: ${how}${link}`);
          }
          else toast("PlanHat: " + (data.error || "failed"));
        } catch (e) { toast("PlanHat push failed: " + e.message); }
      }}
      slackChannel={slackChannel}
      slackSending={slackSending}
      slackStatus={slackStatus}
      toast={toast}
    />
  );
}

/* ================================================================
   LIVE DASHBOARD  (replaces mock Dashboard)
   ================================================================ */

// Maps a Sales Owner name to their region. Anyone not listed falls into "Other".
const REGION_BY_OWNER = {
  "Alex Koh Hock Poh": "APAC",
  "Caio Miranda": "EMEA",
  "Jimmy Greco": "Americas",
  "Mauricio Meira": "Americas",
  "Gp Capt Debashish Sengupta (Retd)": "India",
};
// Fallback when the owner isn't mapped: infer from pipelines whose name clearly
// encodes a region (kept conservative to avoid mis-labelling ambiguous pipelines).
const REGION_BY_PIPELINE = {
  "Public Sector (USA)": "Americas",
  "Americas Private Sector": "Americas",
  "Public Sector (India)": "India",
};
function regionFor(d) {
  return REGION_BY_OWNER[d.owner_director] || REGION_BY_PIPELINE[d.pipeline] || "Other";
}
const REGION_ORDER = ["EMEA", "APAC", "Americas", "India", "Other"];
const REGION_COLORS = { EMEA: "#7A5AF5", APAC: "#0EA5B7", Americas: "#E07A2B", India: "#2FB67A", Other: "#929BAB" };

function StatSource({ children }) {
  return <span style={{ fontSize: 10.5, color: "var(--muted2)", fontStyle: "italic" }}>{children}</span>;
}

function DashboardLive({ deals, onOpen }) {
  const [feedbackCounts, setFeedbackCounts] = useState({}); // passport_id -> count
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setFeedbackLoading(true);
      try {
        const rows = await sbGet("customer_feedback", "?select=passport_id");
        const counts = {};
        (rows || []).forEach(r => { counts[r.passport_id] = (counts[r.passport_id] || 0) + 1; });
        setFeedbackCounts(counts);
      } catch (e) { /* non-fatal — feedback stat just won't show */ }
      finally { setFeedbackLoading(false); }
    })();
  }, [deals.length]);

  const active = deals.filter(d => d.hubspot_stage_idx < 6);
  const pipeline = active.reduce((a, d) => a + (d.hubspot_amount || 0), 0);
  const closedWon = deals.filter(d => d.hubspot_stage_idx === 5).length;
  const noOwner = deals.filter(d => !d.owner_cs || !d.owner_se).length;
  const withFeedback = deals.filter(d => feedbackCounts[d.id] > 0);
  const eapDeals = deals.filter(d => d.is_eap);
  const totalFeedbackEntries = Object.values(feedbackCounts).reduce((a, c) => a + c, 0);

  const byStage = ["Discovery","Technical Validation","Quote / Solution Scoping","Proposal","Contracting & Negotiation","Closed Won"]
    .map((s, i) => ({ name: s, count: deals.filter(d => d.hubspot_stage_idx === i).length }));
  const maxStage = Math.max(...byStage.map(b => b.count), 1);

  const byPipeline = CORE_PIPELINES_LIST.map(name => ({
    name, count: deals.filter(d => d.pipeline === name).length, color: PIPE_COLORS[name],
  }));
  const maxPipe = Math.max(...byPipeline.map(b => b.count), 1);

  // Region breakdown — grouped by Sales Owner's mapped region
  const byRegion = REGION_ORDER.map(region => {
    const regionDeals = deals.filter(d => regionFor(d) === region);
    const regionActive = regionDeals.filter(d => d.hubspot_stage_idx < 6);
    return {
      region,
      count: regionDeals.length,
      activeCount: regionActive.length,
      acv: regionActive.reduce((a, d) => a + (d.hubspot_amount || 0), 0),
      closedWon: regionDeals.filter(d => d.hubspot_stage_idx === 5).length,
      color: REGION_COLORS[region],
    };
  }).filter(r => r.count > 0);
  const maxRegion = Math.max(...byRegion.map(r => r.count), 1);

  const needsAttention = deals.filter(d => {
    const { score } = calcReadiness(d, []);
    return score < 50 && d.hubspot_stage_idx >= 1 && d.hubspot_stage_idx < 5;
  }).slice(0, 8);

  return (
    <>
      <h2 className="section-title">Leadership view</h2>
      <p className="section-sub">Live pipeline health across core Pixxel deals</p>
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11.5, color: "var(--muted)",
        background: "var(--line-soft)", border: "1px solid var(--line)", borderRadius: 10,
        padding: "8px 14px", marginBottom: 18,
      }}>
        <span><strong>Where these numbers come from:</strong></span>
        <span><span style={{ color:"var(--accent-deep)", fontWeight:600 }}>●</span> HubSpot — stage, amount, owner, close date</span>
        <span><span style={{ color:"#7A5AF5", fontWeight:600 }}>●</span> App — readiness, feedback entries, SE/CS assignment</span>
      </div>

      <div className="dash-grid">
        <div className="stat">
          <div className="k">Active deals</div>
          <div className="v">{active.length}</div>
          <div className="d"><Activity size={13} /> across core pipelines</div>
          <StatSource>HubSpot · stage</StatSource>
        </div>
        <div className="stat">
          <div className="k">Pipeline ACV</div>
          <div className="v">${(pipeline/1000000).toFixed(1)}M</div>
          <div className="d"><TrendingUp size={13} /> live from HubSpot</div>
          <StatSource>HubSpot · amount</StatSource>
        </div>
        <div className="stat">
          <div className="k">Closed Won</div>
          <div className="v">{closedWon}</div>
          <div className="d"><CheckCircle2 size={13} color="var(--ok)" /> active customers</div>
          <StatSource>HubSpot · stage</StatSource>
        </div>
        <div className="stat">
          <div className="k">Needs SE/CS</div>
          <div className="v">{noOwner}</div>
          <div className="d"><AlertTriangle size={13} color="var(--warn)" /> unassigned owners</div>
          <StatSource>App · owner fields</StatSource>
        </div>
        <div className="stat">
          <div className="k">Deals with feedback</div>
          <div className="v">{feedbackLoading ? "…" : withFeedback.length}</div>
          <div className="d"><MessageSquare size={13} color="var(--accent-deep)" /> {totalFeedbackEntries} entries logged</div>
          <StatSource>App · Customer Feedback tab</StatSource>
        </div>
        <div className="stat">
          <div className="k">EAP customers</div>
          <div className="v">{eapDeals.length}</div>
          <div className="d"><Star size={13} color="#F0A429" /> Early Access Program</div>
          <StatSource>App · EAP flag</StatSource>
        </div>
      </div>

      <div className="cols">
        <Block icon={BarChart3} title="Deals by stage">
          <div className="barlist">
            {byStage.map((b, i) => (
              <div className="br" key={i}>
                <span style={{ color:"var(--muted)", fontSize:12.5 }}>{b.name}</span>
                <div className="track"><div className="fill" style={{ width:`${(b.count/maxStage)*100}%` }} /></div>
                <span className="mono" style={{ textAlign:"right", fontSize:12 }}>{b.count}</span>
              </div>
            ))}
          </div>
          <StatSource>HubSpot · deal stage, synced live</StatSource>
        </Block>

        <Block icon={Satellite} title="Deals by pipeline">
          <div className="barlist">
            {byPipeline.map((b, i) => (
              <div className="br" key={i}>
                <span style={{ color:"var(--muted)", fontSize:12.5 }}>{b.name.replace(" (EMEA & APAC)","").replace("Public Sector ","PS ")}</span>
                <div className="track"><div className="fill" style={{ width:`${(b.count/maxPipe)*100}%`, background:`linear-gradient(90deg, ${b.color}, ${b.color}88)` }} /></div>
                <span className="mono" style={{ textAlign:"right", fontSize:12 }}>{b.count}</span>
              </div>
            ))}
          </div>
          <StatSource>HubSpot · pipeline field</StatSource>
        </Block>
      </div>

      <Block icon={MapPin} title="Deals by region">
        <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 10 }}>
          Region is derived from the Sales Owner (Alex Koh Hock Poh → APAC, Caio Miranda → EMEA, Jimmy Greco / Mauricio Meira → Americas, Gp Capt Debashish Sengupta → India); if the owner isn't mapped, it falls back to the pipeline (Public Sector USA / Americas Private Sector → Americas, Public Sector India → India). Anything else is Other.
        </div>
        <div className="cols">
          <div className="barlist">
            {byRegion.map((r, i) => (
              <div className="br" key={i}>
                <span style={{ color:"var(--muted)", fontSize:12.5 }}>{r.region}</span>
                <div className="track"><div className="fill" style={{ width:`${(r.count/maxRegion)*100}%`, background:`linear-gradient(90deg, ${r.color}, ${r.color}88)` }} /></div>
                <span className="mono" style={{ textAlign:"right", fontSize:12 }}>{r.count}</span>
              </div>
            ))}
          </div>
          <div className="kv" style={{ fontSize: 12.5 }}>
            {byRegion.map((r, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom: i < byRegion.length-1 ? "1px solid var(--line-soft)" : "none" }}>
                <span style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ width:8, height:8, borderRadius:99, background:r.color, display:"inline-block" }} />
                  {r.region}
                </span>
                <span style={{ color:"var(--muted)" }}>{r.activeCount} active · ${(r.acv/1000).toFixed(0)}k ACV · {r.closedWon} won</span>
              </div>
            ))}
          </div>
        </div>
        <StatSource>HubSpot (owner) + manual region mapping in app</StatSource>
      </Block>

      <Block icon={AlertTriangle} title="Active deals missing SE or CS owner">
        {needsAttention.length ? needsAttention.map(d => {
          const { score } = calcReadiness(d, []);
          return (
            <div className="alert-row" key={d.id} onClick={() => onOpen(d.id)}>
              <Ring value={score} size={38} stroke={4} />
              <div>
                <div className="anm">{d.company}</div>
                <div className="as2">
                  {d.hubspot_stage} · {!d.owner_se ? "No SE" : !d.owner_cs ? "No CS" : "Incomplete"}
                </div>
              </div>
              <ChevronLeft size={16} color="var(--muted2)" style={{ marginLeft:"auto", transform:"rotate(180deg)" }} />
            </div>
          );
        }) : <div className="empty"><CheckCircle2 size={15} /> All active deals have SE and CS assigned.</div>}
        <StatSource>App · readiness checklist</StatSource>
      </Block>

      {eapDeals.length > 0 && (
        <Block icon={Star} title="Early Access Program customers">
          {eapDeals.map(d => (
            <div className="alert-row" key={d.id} onClick={() => onOpen(d.id)}>
              <Star size={20} color="#F0A429" fill="#F0A429" />
              <div>
                <div className="anm">{d.company}</div>
                <div className="as2">{d.hubspot_stage} · {d.pipeline}</div>
              </div>
              <ChevronLeft size={16} color="var(--muted2)" style={{ marginLeft:"auto", transform:"rotate(180deg)" }} />
            </div>
          ))}
          <StatSource>App · EAP flag</StatSource>
        </Block>
      )}
    </>
  );
}

/* ================================================================
   APP SHELL (Supabase-wired)
   ================================================================ */
export default function App() {
  // ── Auth state ───────────────────────────────────────────────
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  // currentUser: { email, name, role: 'se'|'cs'|'analytics'|'owner'|'viewer' }

  useEffect(() => {
    (async () => {
      const token = await getSession();
      if (token) {
        setAuthToken(token);
        const user = await getUserFromToken(token);
        if (user) {
          const email = user.email || "";
          const role = resolveRoleFromEmail(email);
          const name = resolveNameFromEmail(email) || user.user_metadata?.full_name || email;
          setCurrentUser({ email, name, role });
        } else {
          sessionStorage.removeItem("sb_access_token");
          sessionStorage.removeItem("sb_refresh_token");
          setAuthToken(null);
        }
      }
      setAuthLoading(false);
    })();
  }, []);

  if (authLoading) return <SignInScreen loading={true} />;
  if (!currentUser) return <SignInScreen loading={false} />;

  // Non-pixxel email — blocked entirely
  if (currentUser.role === "denied") {
    return (
      <div style={{ minHeight:"100vh", background:"var(--ink)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", fontFamily:"Inter,sans-serif", textAlign:"center", padding:"0 24px" }}>
        <div style={{ color:"var(--muted2)", marginBottom:16 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        </div>
        <h2 style={{ color:"white", fontFamily:"'Space Grotesk',sans-serif", marginBottom:8 }}>Access Denied</h2>
        <p style={{ color:"var(--muted2)", fontSize:14, marginBottom:24 }}>This tool is only accessible to the Pixxel team.<br/>You signed in as <code style={{ color:"var(--accent)" }}>{currentUser.email}</code></p>
        <button onClick={() => signOut()} style={{ padding:"10px 20px", borderRadius:8, border:"1px solid var(--line)", background:"transparent", color:"white", cursor:"pointer" }}>Sign out and try again</button>
      </div>
    );
  }

  // SE / CS / Analytics get full edit. Sales Directors (owner) are view-only,
  // except they may post to the Notes activity feed. Everyone else is read-only.
  const canEdit = ["se", "cs", "analytics"].includes(currentUser.role);
  const canPostNote = canEdit || currentUser.role === "owner";

  return <AppMain
    currentUser={currentUser}
    canEdit={canEdit}
    canPostNote={canPostNote}
    onSignOut={async () => { await signOut(); setCurrentUser(null); }}
  />;
}

function AppMain({ currentUser, canEdit, canPostNote, onSignOut }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [archivedView, setArchivedView] = useState("active"); // active | archived | all

  // ── Passport detail state ───────────────────────────────────
  const [openId, setOpenId] = useState(null);
  const [passportData, setPassportData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── UI state ────────────────────────────────────────────────
  const [view, setView] = useState("deals");
  const [toastMsg, setToastMsg] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [slackChannel, setSlackChannel] = useState(DEFAULT_CHANNEL);
  const [slackStatus, setSlackStatus] = useState(null);
  const [slackSending, setSlackSending] = useState(false);

  const toast = (m) => {
    setToastMsg(m);
    window.clearTimeout(window.__t);
    window.__t = window.setTimeout(() => setToastMsg(null), 3000);
  };
  const unread = notifs.filter(n => !n.read).length;

  // ── Load deal list ──────────────────────────────────────────
  const loadDeals = async () => {
    setLoading(true);
    try {
      const data = await fetchPassports({
        pipeline: pipelineFilter,
        stage: stageFilter,
        ownerFilter: ownerFilter || null,
        search: searchQ || null,
        archivedView,
      });
      setDeals(data);
    } catch (e) {
      toast("Failed to load deals: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Reload when filters change
  useEffect(() => { loadDeals(); }, [pipelineFilter, stageFilter, ownerFilter, archivedView]);

  // On first load, if the URL has ?deal=<id>, open that passport directly
  // (enables sharing a direct link to a specific deal).
  useEffect(() => {
    const dealParam = new URLSearchParams(window.location.search).get("deal");
    if (dealParam) openPassport(dealParam);
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(loadDeals, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  // ── Open passport detail ────────────────────────────────────
  const openPassport = async (id) => {
    setOpenId(id);
    setView("deals");
    setSlackStatus(null);
    setDetailLoading(true);
    window.scrollTo(0, 0);
    // Reflect the open deal in the URL so it can be shared/bookmarked
    const url = new URL(window.location.href);
    url.searchParams.set("deal", id);
    window.history.pushState({}, "", url);
    try {
      const data = await fetchPassportDetail(id);
      setPassportData(data);
    } catch (e) {
      toast("Failed to load passport: " + e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closePassport = () => {
    setOpenId(null);
    setPassportData(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("deal");
    window.history.pushState({}, "", url);
    loadDeals(); // refresh list in case something changed
  };

  // Refresh passport detail after mutations
  const refreshDetail = async () => {
    if (!openId) return;
    const data = await fetchPassportDetail(openId);
    setPassportData(data);
    // Also refresh the deal in the list
    loadDeals();
  };

  // ── HubSpot sync ────────────────────────────────────────────
  const syncHubspot = async () => {
    setSyncing(true);
    toast("Syncing with HubSpot…");
    try {
      const result = await triggerHubspotSync();
      if (result.ok) {
        setLastSynced(new Date());
        toast(`✓ HubSpot sync complete — ${result.synced} deals updated`);
        loadDeals();
      } else {
        toast("HubSpot sync failed: " + result.error);
      }
    } catch (e) {
      toast("Sync error: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Assignment ──────────────────────────────────────────────
  const handleAssign = async (passportId, r, name) => {
    const deal = deals.find(d => d.id === passportId) || passportData?.passport;
    try {
      await assignOwner(passportId, r, name);
      if (!name) {
        // Clearing an assignment — no Slack notification, just refresh
        toast(`${ROLE_LABEL[r]} assignment cleared`);
        refreshDetail();
        return;
      }
      // Push in-app notification
      setNotifs(ns => [{
        id: Math.random(), person: name, email: emailFor(name),
        role: r, company: deal?.company || "Deal",
        dealId: deal?.deal_id_display || "", time: "Just now", read: false
      }, ...ns]);
      toast(`${name} assigned as ${ROLE_LABEL[r]} — notifying via Slack…`);
      // Send Slack immediately
      const { score } = calcReadinessFromData(passportData);
      const result = await sendSlackNotification("assignment", {
        person: name, role: ROLE_LABEL[r],
        person_slack: slackFor(name), person_email: emailFor(name),
        company: deal?.company, dealId: deal?.deal_id_display,
        stage: deal?.hubspot_stage, amount: deal?.hubspot_amount,
        readiness: score, assignedBy: "Team",
      }, passportId, slackChannel.id);
      toast(result.ok
        ? `✓ ${name} notified in ${slackChannel.name}`
        : `Assignment saved · Slack: ${result.error}`);
      refreshDetail();
    } catch (e) {
      toast("Assignment failed: " + e.message);
    }
  };

  // ── Notify all owners ───────────────────────────────────────
  const handleNotifyAll = async () => {
    if (!passportData) return;
    const p = passportData.passport;
    const owners = [p.owner_director, p.owner_se, p.owner_cs, p.owner_analytics].filter(Boolean);
    owners.forEach(name => {
      setNotifs(ns => [{
        id: Math.random(), person: name, email: emailFor(name),
        role: "se", company: p.company, dealId: p.deal_id_display, time: "Just now", read: false
      }, ...ns]);
    });
    toast(`Notifying ${owners.length} owners in ${slackChannel.name}…`);
    const { score } = calcReadinessFromData(passportData);
    const result = await sendSlackNotification("notify_all", {
      company: p.company, dealId: p.deal_id_display,
      stage: p.hubspot_stage, amount: p.hubspot_amount,
      readiness: score, postedBy: "Team",
      owners: { owner: p.owner_director, se: p.owner_se, cs: p.owner_cs, analytics: p.owner_analytics },
    }, p.id, slackChannel.id);
    toast(result.ok
      ? `✓ ${owners.length} owners notified in ${slackChannel.name}`
      : `Sent in-app · Slack: ${result.error}`);
  };

  // ── Post to Slack ───────────────────────────────────────────
  const handlePostToSlack = async () => {
    if (!passportData) return;
    setSlackSending(true);
    setSlackStatus(null);
    const p = passportData.passport;
    const { score } = calcReadinessFromData(passportData);
    const result = await sendSlackNotification("deal_summary", {
      company: p.company, dealId: p.deal_id_display,
      stage: p.hubspot_stage, amount: p.hubspot_amount,
      readiness: score, postedBy: "Team",
      owners: { owner: p.owner_director, se: p.owner_se, cs: p.owner_cs, analytics: p.owner_analytics },
    }, p.id, slackChannel.id);
    setSlackSending(false);
    setSlackStatus(result.ok
      ? { ok: true, msg: `Posted to ${slackChannel.name}` }
      : { ok: false, msg: result.error });
  };

  // Helper: calc readiness from passportData object
  const calcReadinessFromData = (pd) => {
    if (!pd) return { score: 0, items: [] };
    return calcReadiness(pd.passport, pd.contacts);
  };

  // Format last synced time
  const syncLabel = lastSynced
    ? lastSynced.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : (deals[0]?.hubspot_synced_at
      ? "synced " + new Date(deals[0].hubspot_synced_at).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" })
      : "not yet synced");

  return (
    <div className="cp-root">
      <style>{CSS}</style>

      <div className="cp-top">
        <div className="cp-brand">
          {PIXXEL_LOGO_URL
            ? <span className="cp-logo-plate"><img className="cp-logo-img" src={PIXXEL_LOGO_URL} alt="Pixxel" onError={e => { e.currentTarget.style.display = "none"; }} /></span>
            : <span className="cp-wordmark">pi<span className="x">xx</span>el</span>}
          <span className="cp-brand-div" />
          <span>Customer Passport<small>SE → CS → Analytics</small></span>
        </div>
        <div className="cp-nav">
          <button className={view === "deals" && !openId ? "on" : ""} onClick={() => { setView("deals"); closePassport(); }}>
            <LayoutGrid size={15} /> Deals
          </button>
          <button className={view === "dashboard" ? "on" : ""} onClick={() => { setView("dashboard"); closePassport(); }}>
            <BarChart3 size={15} /> Leadership
          </button>
          <button className={view === "qc" ? "on" : ""} onClick={() => { setView("qc"); closePassport(); }}>
            <Camera size={15} /> Quality Checks
          </button>
          <button className={view === "mvp" ? "on" : ""} onClick={() => { setView("mvp"); closePassport(); }}>
            <Star size={15} /> MVP Images
          </button>
          <button className={view === "maps" ? "on" : ""} onClick={() => { setView("maps"); closePassport(); }}>
            <MapPin size={15} /> Maps
          </button>
          <button className={view === "prototypes" ? "on" : ""} onClick={() => { setView("prototypes"); closePassport(); }}>
            <Zap size={15} /> Prototypes
          </button>
        </div>
        <div className="cp-spacer" />

        {/* Slack channel picker */}
        <div className="slack-pill">
          <span className="slack-dot" /><b>Slack</b>
          <select style={{ border:"none", background:"transparent", fontSize:12, color:"var(--muted)", fontFamily:"inherit", cursor:"pointer", outline:"none" }}
            value={slackChannel.id}
            onChange={e => setSlackChannel(SLACK_CHANNELS.find(c => c.id === e.target.value))}>
            {SLACK_CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        {/* HubSpot sync */}
        <div className="hs-pill">
          <span className="hs-dot" /> <b>HubSpot</b> · {syncLabel}
          <button className="syncnow" onClick={syncHubspot} disabled={syncing}>
            <Satellite size={12} /> {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>

        {/* Bell */}
        <div className="bell">
          <button className="btn-bell" onClick={() => { setBellOpen(o => !o); setNotifs(ns => ns.map(n => ({ ...n, read: true }))); }}>
            <Bell size={17} />
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
          {bellOpen && (
            <div className="notif-panel">
              <div className="notif-head">
                <h4>Notifications</h4>
                {notifs.length > 0 && <button onClick={() => setNotifs([])}>Clear all</button>}
              </div>
              <div className="notif-list">
                {notifs.length === 0
                  ? <div className="notif-empty">No notifications yet.<br />Assign someone to a deal to send one.</div>
                  : notifs.map(n => (
                    <div className={"notif-item" + (n.read ? "" : " unread")} key={n.id}>
                      <div className={"av " + (ROLE_SHORT[n.role] || "se")}>{initials(n.person)}</div>
                      <div>
                        <div className="nt"><b>{n.person}</b> was assigned as <b>{ROLE_LABEL[n.role] || n.role}</b> on {n.company}</div>
                        <div className="nch"><MessageSquare size={11} /> Slack · <Mail size={11} /> email · {n.time}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="cp-viewtoggle" style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{
            display:"flex",alignItems:"center",gap:6,
            padding:"6px 12px",borderRadius:8,
            background: canEdit ? "rgba(14,165,183,0.1)" : "rgba(146,155,171,0.1)",
            border: canEdit ? "1px solid rgba(14,165,183,0.2)" : "1px solid rgba(146,155,171,0.2)",
            fontSize:12,fontWeight:500,
            color: canEdit ? "var(--accent)" : "var(--muted2)",
          }}>
            {canEdit ? <Pencil size={12}/> : <Eye size={12}/>}
            {currentUser.name} · {canEdit ? "Full access" : "View only"}
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            style={{
              padding:"6px 10px",borderRadius:8,border:"1px solid var(--line)",
              background:"transparent",color:"var(--muted2)",fontSize:12,cursor:"pointer",
            }}
          >Sign out</button>
        </div>
      </div>

      <div className="cp-page">
        {!canEdit && (
          <div className="cp-banner" style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <span><Lock size={15}/> Read-only view — you can browse all deal passports but editing is locked.</span>
            <button
              onClick={async () => {
                try {
                  await fetch(`${SUPABASE_URL}/functions/v1/slack-notify`, {
                    method:"POST",
                    headers:{
                      "Content-Type":"application/json",
                      "Authorization":`Bearer ${SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                      event:"mention",
                      mentionedPerson:"Rhodri Phillips",
                      mentioned_slack:"U092KJ4AKPC",
                      mentionedBy: currentUser.name || currentUser.email,
                      company:"Customer Passport",
                      dealId:"ACCESS REQUEST",
                      noteText:`${currentUser.name || currentUser.email} (${currentUser.email}) is requesting edit access to the Customer Passport.`,
                    }),
                  });
                  alert("Request sent! Rhodri will be notified in Slack.");
                } catch(e) {
                  alert("Couldn't send request — please message Rhodri directly.");
                }
              }}
              style={{
                padding:"6px 14px",borderRadius:6,border:"1px solid var(--accent)",
                background:"transparent",color:"var(--accent)",fontSize:12,
                fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",
              }}
            >Request edit access</button>
          </div>
        )}

        {openId
          ? detailLoading
            ? <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}>
                <Satellite size={28} color="var(--accent)" style={{ display:"block", margin:"0 auto 12px", opacity:.6 }} />
                Loading passport…
              </div>
            : passportData && (
                <PassportDetail
                  data={passportData}
                  onBack={closePassport}
                  canEdit={canEdit}
                  canPostNote={canPostNote}
                  onRefresh={refreshDetail}
                  onAssign={(r, name) => handleAssign(openId, r, name)}
                  onNotifyAll={handleNotifyAll}
                  onPostToSlack={handlePostToSlack}
                  slackChannel={slackChannel}
                  slackSending={slackSending}
                  slackStatus={slackStatus}
                  toast={toast}
                  currentUserName={currentUser.name}
                />
              )
          : view === "dashboard"
            ? <DashboardLive deals={deals} onOpen={openPassport} />
            : view === "qc"
              ? <QualityChecksGlobal deals={deals} canEdit={canEdit} onOpen={openPassport} toast={toast} />
              : view === "mvp"
                ? <MvpImagesGlobal deals={deals} canEdit={canEdit} onOpen={openPassport} toast={toast} />
                : view === "prototypes"
                  ? <PrototypesView />
                  : view === "maps"
                    ? <MapsGlobal />
                  : <DealListLive
                deals={deals}
                loading={loading}
                onOpen={openPassport}
                pipelineFilter={pipelineFilter}
                setPipelineFilter={setPipelineFilter}
                stageFilter={stageFilter}
                setStageFilter={setStageFilter}
                ownerFilter={ownerFilter}
                setOwnerFilter={setOwnerFilter}
                searchQ={searchQ}
                setSearchQ={setSearchQ}
                archivedView={archivedView}
                setArchivedView={setArchivedView}
              />
        }
      </div>

      {toastMsg && <div className="toast"><span className="spectral-dot" />{toastMsg}</div>}
    </div>
  );
}
