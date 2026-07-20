import { useState } from "react";
import LiquidEther from "./LiquidEther.jsx";
import MagicBento from "./MagicBento.jsx";
import GooeySearch from "./GooeySearch.jsx";
import FileDropzone from "./FileDropzone.jsx";
import "./PrototypesView.css";

const SECTOR_COLORS = {
  Agriculture: "var(--agri)", Energy: "var(--energy)", Mining: "var(--mining)",
  Environment: "var(--env)", Government: "var(--gov)", Forestry: "var(--forest)",
};

const DEMO_DEALS = [
  { company: "Terravest Group", sector: "Agriculture", id: "DEAL-4192", stage: "New Business", live: true, who: "RH" },
  { company: "Aurora Minerals", sector: "Mining", id: "DEAL-3771", stage: "Expansion", live: true, who: "JM" },
  { company: "Northwind Systems", sector: "Government", id: "DEAL-4210", stage: "New Business", live: false, who: "KP" },
  { company: "Solaris Grid Co.", sector: "Energy", id: "DEAL-4055", stage: "Renewal", live: true, who: "TL" },
];

function Block({ n, title, tag, fits, children, note }) {
  return (
    <section className="pv-block">
      <div className="pv-bhead">
        <span className="pv-bnum">{n}</span>
        <h2>{title}</h2>
        {tag && <span className="pv-btag">{tag}</span>}
      </div>
      {fits && <p className="pv-fits">{fits}</p>}
      <div className="pv-demo">{children}</div>
      {note && <div className="pv-build"><span className="pv-tag">Build</span><span>{note}</span></div>}
    </section>
  );
}

export default function PrototypesView() {
  const [q, setQ] = useState("");
  const [hover, setHover] = useState(null);
  const [bgOn, setBgOn] = useState(false);

  return (
    <div className="space-canvas pv-root">
      {bgOn && (
        <div className="pv-bg">
          <LiquidEther
            colors={["#03d4ff", "#06bdff", "#00ffbb"]}
            mouseForce={22} cursorSize={110} autoDemo autoSpeed={0.6}
            autoIntensity={2.4} resolution={0.5} isBounce={false} isViscous={false}
          />
        </div>
      )}

      <header className="pv-hero">
        <img className="pv-wordmark" src="/pixxel-logo-white.svg" alt="Pixxel" />
        <div className="pv-eyebrow">Aesthetic prototypes · aligned to Pixxel brand</div>
        <h1>Five effects, redrawn in <span className="pv-neon">Pixxel</span>'s own hand</h1>
        <p className="pv-lede">
          Live inside the real app on a hidden route. Electric-blue neon on a dark space canvas,
          Barlow / Inter type, industry sector colours. The dark theme here is scoped to this page —
          approve it and it becomes the global default.
        </p>
      </header>

      <Block
        n="01" title="Gooey search" tag="Zero deps"
        fits="Fits your two search fields (deals search + deal-picker). The pill uses locked dark chrome with an electric-blue icon and white text, so the bubble can never match the text — in any theme."
        note="CSS transition + SVG goo filter. Drops into .cp-search. No Framer Motion."
      >
        <GooeySearch value={q} onChange={setQ} placeholder="Search company, sector or deal ID…" />
        <span className="pv-hint">{q ? `“${q}”` : "click to expand →"}</span>
      </Block>

      <Block
        n="02" title="File upload dropzone" tag="Zero deps"
        fits="Fits the AOI uploader (GeoJSON / KML / zipped Shapefile) and the QC “attach a file” control. Real drag-and-drop, a neon-lift plate, and a tidy file card after drop."
        note="Native HTML5 drag/drop + <input type=file>. Replaces react-dropzone + @tabler/icons; uses your existing Lucide icons."
      >
        <FileDropzone onFiles={() => {}} />
      </Block>

      <Block
        n="03" title="Card hover glow" tag="Zero deps"
        fits="Fits your deal cards grid. A neon panel slides in behind the hovered card and the border warms to electric blue. Sector dots use the six brand industry colours."
        note="Pure CSS/state hover. Replaces a Framer Motion layoutId animation."
      >
        <div className="pv-cards">
          {DEMO_DEALS.map((d, i) => (
            <a
              key={d.id}
              className={`pv-card-link ${hover === i ? "on" : ""}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="pv-card-glow" />
              <div className="pv-deal">
                <span className="pv-sector">
                  <span className="pv-dot" style={{ background: SECTOR_COLORS[d.sector], color: SECTOR_COLORS[d.sector] }} />
                  {d.sector}
                </span>
                <h3>{d.company}</h3>
                <div className="pv-id">{d.id} · {d.stage}</div>
                <div className="pv-foot">
                  <span className={`pv-chip ${d.live ? "live" : "early"}`}>{d.live ? "Live passport" : "Early stage"}</span>
                  <span className="pv-av" style={{ background: SECTOR_COLORS[d.sector] }}>{d.who}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </Block>

      <Block
        n="04" title="MagicBento dashboard" tag="gsap"
        fits="Fits a landing / overview dashboard. Cursor spotlight sweeps the grid, borders glow, particles spark on hover, cards drift, clicks ripple — all in brand electric blue."
        note="Real React Bits component (gsap). glowColor set to brand 3, 212, 255 instead of the demo's purple."
      >
        <div className="magic-bento-scope" style={{ width: "100%" }}>
          <MagicBento
            glowColor="3, 212, 255"
            enableStars enableSpotlight enableBorderGlow enableTilt clickEffect enableMagnetism
            spotlightRadius={300} particleCount={12}
          />
        </div>
      </Block>

      <Block
        n="05" title="Aurora / Liquid Ether theme" tag="WebGL · three"
        fits="Candidate background for the sign-in screen or ambient app backdrop — the real WebGL fluid sim, coloured in brand cyans (electric #03d4ff / sky #06bdff / turquoise #00ffbb)."
        note="Real React Bits LiquidEther (three.js Navier–Stokes sim). Toggle it as a full-page backdrop below."
      >
        <div className="pv-aur-frame">
          <LiquidEther
            colors={["#03d4ff", "#06bdff", "#00ffbb"]}
            mouseForce={22} cursorSize={110} autoDemo autoSpeed={0.6}
            autoIntensity={2.4} resolution={0.5} isBounce={false} isViscous={false}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <button className="pv-aur-cta" onClick={() => setBgOn((v) => !v)}>
          {bgOn ? "◑ Remove page background" : "◐ Apply as page background"}
        </button>
      </Block>

      <div className="pv-foot">Prototype · aligned to Pixxel Brand Guidelines · Aceternity UI &amp; React Bits</div>
    </div>
  );
}
