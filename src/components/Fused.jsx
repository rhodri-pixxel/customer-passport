import React, { useState, useEffect, useRef, useMemo } from "react";
import "./Fused.css";

/* ══════════════════════════════════════════════════════════════
   Fused-system primitives — ported from the design handoff
   prototype (prototype/*.jsx), made data-driven for the real app.
   ══════════════════════════════════════════════════════════════ */

/* Stable per-person gradient. The prototype hardcodes initials →
   gradient; we hash the name so any of the ~40 real people get a
   consistent one from the brand ramp. */
const RAMPS = [
  "linear-gradient(135deg,#06bdff,#00ffbb)",
  "linear-gradient(135deg,#ff8a3d,#f76e2f)",
  "linear-gradient(135deg,#7c5cff,#03d4ff)",
  "linear-gradient(135deg,#ecb423,#ff8a3d)",
  "linear-gradient(135deg,#98eb00,#00c030)",
  "linear-gradient(135deg,#03d4ff,#06bdff)",
];
export function gradientFor(name) {
  if (!name) return "#26303F";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return RAMPS[h % RAMPS.length];
}
export const initialsOf = (n) =>
  n ? n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";

/* Industry data-state hues (never decoration) */
export const SECTOR_HUE = {
  agri: "#98eb00", agriculture: "#98eb00",
  energy: "#ecb423",
  mining: "#f76e2f",
  gov: "#06bdff", government: "#06bdff",
  env: "#00ffbb", environment: "#00ffbb",
  forest: "#00c030", forestry: "#00c030",
};
export const hueForSector = (s) => {
  if (!s) return "#7E8B99";
  const k = String(s).toLowerCase();
  const hit = Object.keys(SECTOR_HUE).find((x) => k.includes(x));
  return hit ? SECTOR_HUE[hit] : "#7E8B99";
};

export function Avatar({ name, size = 26, title }) {
  return (
    <span
      className="fx-av"
      title={title || name || ""}
      style={{ width: size, height: size, background: gradientFor(name), fontSize: size * 0.36 }}
    >
      {initialsOf(name)}
    </span>
  );
}

export const Dot = ({ c, s = 7 }) => (
  <i style={{ width: s, height: s, borderRadius: "50%", background: c, display: "inline-block", flex: "none" }} />
);

/* ── Readiness ring with animated count-up ───────────────────── */
export function ReadinessRing({ value = 0, size = 76, stroke = 6 }) {
  const [disp, setDisp] = useState(0);
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const R = size / 2 - stroke / 2 - 2;
  const C = 2 * Math.PI * R;

  useEffect(() => {
    const to = Math.round(pct * 100);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisp(to);
      return;
    }
    let raf;
    const DUR = 650;
    const t0 = performance.now();
    const step = (n) => {
      const k = Math.min(1, (n - t0) / DUR);
      setDisp(Math.round(to * k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // rAF is throttled to zero in background tabs (and in headless panes), which
    // would leave the number frozen at 0 while the arc shows the real value.
    // Snap to the target once the animation window has elapsed regardless.
    const settle = setTimeout(() => setDisp(to), DUR + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [pct]);

  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={R} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={R} stroke="#03d4ff" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          style={{ transition: "stroke-dashoffset .65s ease", filter: "drop-shadow(0 0 5px rgba(3,212,255,.5))" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <span className="mono" style={{ fontSize: size * 0.26, fontWeight: 500 }}>{disp}</span>
      </div>
    </div>
  );
}

/* ── Handover route ──────────────────────────────────────────
   Variable per the locked decision: usually Sales → SE → Analytics;
   a CS node is inserted ONLY when the deal actually has a CS owner. */
export function routeFor(deal) {
  const o = (deal && deal.owners) || {};
  const h = (deal && deal.handover) || {};
  const d = (v) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "pending");
  const nodes = [{ w: "Sales → SE", d: o.se ? "assigned" : "pending", done: !!o.se }];
  if (o.cs) nodes.push({ w: "SE → CS", d: h.cs ? d(h.csAt) : "pending", done: !!h.cs });
  nodes.push({
    w: o.cs ? "CS → Analytics" : "SE → Analytics",
    d: h.analytics ? d(h.analyticsAt) : "pending",
    done: !!h.analytics,
  });
  return nodes;
}

export function RoutedTimeline({ nodes = [], compact = false }) {
  const [hov, setHov] = useState(null);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {nodes.map((nd, i) => (
        <React.Fragment key={nd.w + i}>
          <div
            style={{ textAlign: "center", position: "relative", width: compact ? "auto" : 130, flex: compact ? 1 : "none" }}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            <div
              className="mono"
              style={{
                width: compact ? 26 : 28, height: compact ? 26 : 28, borderRadius: "50%", margin: "0 auto",
                display: "grid", placeItems: "center", fontSize: compact ? 11 : 12, cursor: "default",
                background: nd.done ? "var(--accent)" : "var(--card)",
                color: nd.done ? "#001018" : "var(--accent)",
                border: nd.done ? "none" : "2px solid var(--accent)",
                boxShadow: !nd.done ? "0 0 14px rgba(3,212,255,.5)" : "none",
              }}
            >
              {nd.done ? "✓" : "○"}
            </div>
            {!compact && <div style={{ fontSize: 11.5, marginTop: 8 }}>{nd.w}</div>}
            {!compact && <div className="mono" style={{ fontSize: 9.5, color: "var(--muted)" }}>{nd.d}</div>}
            {hov === i && (
              <div className="fx-pop" style={{
                position: "absolute", bottom: "118%", left: "50%", transform: "translateX(-50%)",
                whiteSpace: "nowrap", border: "1px solid var(--hair2)", borderRadius: 8,
                background: "var(--raised)", padding: "6px 9px", fontSize: 11,
                boxShadow: "0 14px 30px rgba(0,0,0,.5)", zIndex: 5,
              }}>
                {nd.w} · {nd.d}
              </div>
            )}
          </div>
          {i < nodes.length - 1 && (
            <div style={{
              flex: 1, height: 2, position: "relative", margin: "0 2px",
              background: nodes[i + 1].done ? "var(--accent)" : "linear-gradient(90deg,var(--accent),var(--line))",
            }}>
              <span className="fx-travel" style={{ animationDelay: `${i * 0.6}s` }} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Live presence + activity feed ───────────────────────────── */
export function PresenceBar({ people = [], feed = [] }) {
  const items = feed.length ? feed : ["No recent activity"];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const iv = setInterval(() => setI((n) => (n + 1) % items.length), 2600);
    return () => clearInterval(iv);
  }, [items.length]);
  return (
    <div className="fx-presence">
      <div className="fx-stack">
        {people.slice(0, 4).map((p, n) => (
          <span key={p + n} style={{ marginLeft: n ? -8 : 0, border: "2px solid var(--card)", borderRadius: "50%" }}>
            <Avatar name={p} size={24} />
          </span>
        ))}
      </div>
      {people.length > 0 && (
        <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>
          <span style={{ color: "var(--turq)" }}>●</span> {people.length} viewing now
        </span>
      )}
      <span className="fx-feed">
        <Dot c="var(--accent)" s={6} />
        <span key={i} className="fx-slidein">{items[i]}</span>
      </span>
    </div>
  );
}

/* ── Sparkline ───────────────────────────────────────────────── */
export function Spark({ data = [], c = "#03d4ff", w = 90, h = 28 }) {
  if (!data.length) return <svg width={w} height={h} />;
  const mx = Math.max(...data), mn = Math.min(...data);
  const pts = data
    .map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - ((v - mn) / (mx - mn || 1)) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── ⌘K command palette ──────────────────────────────────────── */
export function CommandPalette({ deals = [], people = [], actions = [], onOpenDeal, onAction, trigger = true }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => [
    ...deals.map((d) => ({ k: "◆", t: d.company, s: d.id, run: () => onOpenDeal && onOpenDeal(d) })),
    ...people.map((p) => ({ k: "＠", t: p.name, s: p.role || "Person", run: null })),
    ...actions.map((a) => ({ k: "⚡", t: a.label, s: "Action", run: a.run })),
  ], [deals, people, actions, onOpenDeal]);

  const f = q
    ? items.filter((o) => (o.t || "").toLowerCase().includes(q.toLowerCase()) || (o.s || "").toLowerCase().includes(q.toLowerCase()))
    : items.slice(0, 8);

  return (
    <>
      {trigger && (
        <button className="fx-pill fx-palette-trigger" onClick={() => { setOpen(true); setQ(""); }}>
          ⌕ Search or run…<span className="mono" style={{ marginLeft: "auto", opacity: .75 }}>⌘K</span>
        </button>
      )}
      {open && (
        <div className="fx-overlay" onClick={() => setOpen(false)}>
          <div className="fx-palette fx-pop" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Type a deal, person or action…"
            />
            <div className="fx-palette-list">
              {f.length === 0 && <div className="fx-palette-empty">No matches</div>}
              {f.map((o, i) => (
                <div
                  key={o.t + i} className="fx-palette-row"
                  onClick={() => { if (o.run) { o.run(); setOpen(false); } }}
                  style={{ cursor: o.run ? "pointer" : "default" }}
                >
                  <span className="mono" style={{ color: "var(--accent)", width: 14 }}>{o.k}</span>
                  <span style={{ fontSize: 13.5 }}>{o.t}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>{o.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Searchable people/owner filter ──────────────────────────── */
export function PeopleFilter({ value = "all", names = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const list = names.filter((n) => n.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ position: "relative", marginBottom: 10 }} ref={ref}>
      <button
        className="fx-pill"
        style={{
          width: "100%", justifyContent: "space-between", height: 34,
          borderColor: value === "all" ? "var(--hair2)" : "rgba(3,212,255,.5)",
          color: value === "all" ? "var(--ink2)" : "var(--accent)",
        }}
        onClick={() => { setOpen((o) => !o); setQ(""); }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          {value === "all" ? "⌕ Owner: All people" : <><Avatar name={value} size={22} />{value}</>}
        </span>
        <span style={{ color: "var(--muted)" }}>▾</span>
      </button>
      {open && (
        <div className="fx-menu fx-pop">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" />
          <div style={{ maxHeight: 200, overflow: "auto" }}>
            <div
              className="fx-menu-row"
              style={{ color: value === "all" ? "var(--accent)" : "var(--ink2)" }}
              onClick={() => { onChange("all"); setOpen(false); }}
            >All people</div>
            {list.map((n) => (
              <div key={n} className="fx-menu-row" onClick={() => { onChange(n); setOpen(false); }}>
                <Avatar name={n} size={24} />
                <span style={{ fontSize: 13, flex: 1 }}>{n}</span>
                {value === n && <span style={{ color: "var(--accent)" }}>✓</span>}
              </div>
            ))}
            {list.length === 0 && <div className="fx-palette-empty">No people match</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Readiness distribution bar ──────────────────────────────── */
export function DistributionBar({ segments = [] }) {
  const tot = segments.reduce((a, s) => a + s.n, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: 14, borderRadius: 9999, overflow: "hidden", background: "var(--line)" }}>
        {segments.map((s) => (
          <div key={s.label} title={`${s.label}: ${s.n}`} style={{ width: `${(s.n / tot) * 100}%`, background: s.c }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
        {segments.map((s) => (
          <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink2)" }}>
            <Dot c={s.c} />{s.label} <span className="mono" style={{ color: "var(--muted)" }}>{s.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── KPI tile with sparkline ─────────────────────────────────── */
export function KpiTile({ label, value, data = [], c = "#03d4ff" }) {
  return (
    <div className="fx-tile">
      <div className="klabel">{label}</div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 500, margin: "8px 0 10px" }}>{value}</div>
      <Spark data={data} c={c} w={140} h={30} />
    </div>
  );
}

/* ── Sector health bars ──────────────────────────────────────── */
export function SectorHealth({ sectors = [] }) {
  return (
    <div className="fx-tile">
      <div className="klabel" style={{ marginBottom: 14 }}>Health by sector</div>
      {sectors.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No sector data yet.</div>}
      {sectors.map((s) => (
        <div key={s.name} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <Dot c={hueForSector(s.name)} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            </span>
            <span className="mono" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{s.count} deals · {s.ready}% ready</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ width: `${s.ready}%`, height: "100%", background: hueForSector(s.name), borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── At-risk feed ────────────────────────────────────────────── */
export function AtRiskFeed({ items = [], csat = null, csatPct = 0, onOpen }) {
  return (
    <div className="fx-tile" style={{ borderColor: "rgba(247,110,47,.35)" }}>
      <div className="klabel" style={{ color: "var(--mining)", marginBottom: 12 }}>▲ At-risk feed</div>
      {items.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Nothing at risk — portfolio is clean.</div>}
      {items.map((r, i) => (
        <div
          key={r.id || i}
          onClick={() => onOpen && r.id && onOpen(r.id)}
          style={{
            display: "flex", gap: 9, padding: "9px 0", alignItems: "flex-start",
            borderTop: i ? "1px solid var(--line)" : "none", fontSize: 12.5, color: "var(--ink2)",
            cursor: onOpen && r.id ? "pointer" : "default",
          }}
        >
          <span style={{ marginTop: 5 }}><Dot c="var(--mining)" s={8} /></span>
          <span>{r.text}</span>
        </div>
      ))}
      {csat != null && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div className="klabel">Portfolio CSAT</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 500 }}>
              {csat}<span style={{ fontSize: 11, color: "var(--muted)" }}>/5</span>
            </div>
          </div>
          <ReadinessRing value={csatPct} size={56} stroke={5} />
        </div>
      )}
    </div>
  );
}

/* ── Editorial exec brief ────────────────────────────────────── */
export function ExecBrief({ eyebrow, headline, body, stats = [], action }) {
  return (
    <div className="fx-tile" style={{ padding: "30px 34px" }}>
      <div className="klabel">{eyebrow}</div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 30,
        letterSpacing: "-.03em", lineHeight: 1.2, margin: "14px 0", maxWidth: "24ch",
      }}>{headline}</div>
      {body && <p style={{ fontSize: 15, color: "var(--ink2)", lineHeight: 1.7, maxWidth: "60ch", margin: 0 }}>{body}</p>}
      <div style={{ display: "flex", gap: 34, margin: "26px 0", flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div className="mono" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em" }}>{s.value}</div>
            <div className="klabel" style={{ marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {action && (
        <div className="fx-tile" style={{ borderLeft: "3px solid var(--accent)" }}>
          <div className="klabel" style={{ color: "var(--accent)" }}>Recommended action</div>
          <p style={{ fontSize: 13.5, color: "var(--ink2)", margin: "8px 0 0", lineHeight: 1.6 }}>{action}</p>
        </div>
      )}
    </div>
  );
}

/* ── Forms kit ───────────────────────────────────────────────── */
export function AutoTextarea({ value, onChange, max, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }, [value]);
  return (
    <>
      <textarea ref={ref} className="fx-input" value={value} rows={2}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{ resize: "none", lineHeight: 1.55, overflow: "hidden" }} {...rest} />
      {max && (
        <div className="mono" style={{ fontSize: 10, color: (value || "").length > max ? "var(--mining)" : "var(--muted)", marginTop: 6, textAlign: "right" }}>
          {(value || "").length}/{max}
        </div>
      )}
    </>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
      {label && <span style={{ fontSize: 13, color: "var(--ink2)" }}>{label}</span>}
      <button
        role="switch" aria-checked={!!on} aria-label={label || "Toggle"}
        onClick={() => onChange && onChange(!on)}
        style={{
          width: 44, height: 24, borderRadius: 9999, border: "none", cursor: "pointer",
          background: on ? "var(--accent)" : "var(--hair2)", position: "relative", transition: "background .2s", flex: "none",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20,
          borderRadius: "50%", background: "#fff", transition: "left .2s",
        }} />
      </button>
    </div>
  );
}

export function SegmentedControl({ options = [], value = 0, onChange }) {
  const n = Math.max(1, options.length);
  return (
    <div style={{
      position: "relative", display: "inline-flex", border: "1px solid var(--line)",
      borderRadius: 9999, padding: 3, background: "var(--card)",
    }}>
      <span style={{
        position: "absolute", top: 3, bottom: 3, width: `calc((100% - 6px)/${n})`,
        left: `calc(3px + ${value} * (100% - 6px)/${n})`, background: "var(--ink)",
        borderRadius: 9999, transition: "left .26s cubic-bezier(.4,0,.2,1)",
      }} />
      {options.map((l, i) => (
        <button key={l} onClick={() => onChange && onChange(i)}
          style={{
            position: "relative", zIndex: 1, border: "none", background: "transparent",
            padding: "5px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            color: value === i ? "var(--surface)" : "var(--muted)",
          }}>{l}</button>
      ))}
    </div>
  );
}

/* ── Sortable deals table ────────────────────────────────────── */
export function DealsTable({ rows = [], dense = false, onOpen }) {
  const [sort, setSort] = useState({ k: "acv", dir: -1 });
  const sorted = useMemo(() => {
    const c = [...rows];
    c.sort((a, b) => {
      const av = a[sort.k], bv = b[sort.k];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
    });
    return c;
  }, [rows, sort]);

  const th = (k, l, right) => (
    <th
      onClick={() => setSort((s) => ({ k, dir: s.k === k ? -s.dir : -1 }))}
      style={{
        textAlign: right ? "right" : "left", padding: "0 10px 9px", cursor: "pointer",
        color: sort.k === k ? "var(--accent)" : "var(--muted)",
        fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".1em",
        textTransform: "uppercase", fontWeight: 400,
      }}
    >
      {l}{sort.k === k ? (sort.dir < 0 ? " ↓" : " ↑") : ""}
    </th>
  );
  const pad = dense ? "7px 10px" : "12px 10px";

  return (
    <table className="fx-table">
      <thead>
        <tr>{th("company", "Company")}{th("acv", "ACV", 1)}{th("readiness", "Readiness", 1)}{th("stage", "Stage")}<th style={{ padding: "0 10px 9px" }} /></tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.id} className="fx-row" onClick={() => onOpen && onOpen(r)} style={{ cursor: onOpen ? "pointer" : "default" }}>
            <td style={{ padding: pad }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Dot c={hueForSector(r.sector)} />
                <span style={{ fontSize: 13 }}>{r.company}</span>
                {!dense && <span className="mono" style={{ fontSize: 9.5, color: "var(--muted2)" }}>{r.id}</span>}
              </div>
            </td>
            <td className="mono" style={{ textAlign: "right", fontSize: 13, padding: pad }}>
              {r.acv != null ? `$${Math.round(r.acv / 1000)}k` : "—"}
            </td>
            <td style={{ textAlign: "right", padding: pad }}>
              <span className="mono" style={{
                fontSize: 12,
                color: r.readiness > 60 ? "var(--turq)" : r.readiness > 30 ? "var(--ink2)" : "var(--energy)",
              }}>{r.readiness}%</span>
            </td>
            <td style={{ fontSize: 12, color: "var(--ink2)", padding: pad }}>{r.stage}</td>
            <td style={{ padding: pad, textAlign: "right" }}>{r.owner ? <Avatar name={r.owner} size={24} /> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
