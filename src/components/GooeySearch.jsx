import { useId, useRef, useState, useEffect } from "react";
import { Search } from "lucide-react";
import "./GooeySearch.css";

/**
 * Gooey expandable search.
 * Collapsed it's a pill; on focus it stretches out with an SVG "goo" pinch.
 * Chrome (pill + bubble) is locked to a dark surface with an electric-blue
 * icon and white text via CSS vars, so the bubble can never match the text —
 * independent of the app theme.
 */
export default function GooeySearch({
  value,
  onChange,
  placeholder = "Search…",
  expandedWidth = 330,
  collapsedWidth = 150,
  className = "",
}) {
  const rawId = useId();
  const filterId = `goo-${rawId.replace(/:/g, "")}`;
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const expand = () => setOpen(true);
  const handleBlur = () => { if (!value) setOpen(false); };

  return (
    <div className={`goo-wrap ${open ? "open" : ""} ${className}`} style={{ filter: `url(#${filterId})` }}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <button
        type="button"
        className="goo-btn"
        onClick={expand}
        style={{ width: open ? expandedWidth : collapsedWidth }}
      >
        <Search size={16} className="goo-icon" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </button>

      <button type="button" className="goo-bubble" onClick={expand} tabIndex={-1} aria-hidden="true">
        <Search size={16} />
      </button>
    </div>
  );
}
