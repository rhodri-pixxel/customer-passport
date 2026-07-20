import { useRef, useState, useCallback } from "react";
import { Upload } from "lucide-react";
import "./FileDropzone.css";

/**
 * Drag-and-drop file upload with a neon-lift plate and a tidy file card
 * after selection. Native HTML5 drag/drop — no react-dropzone dependency.
 *
 * onFiles(File[]) fires with the newly added files (matching the app's
 * existing single-file AOI / QC upload flow by default).
 */
export default function FileDropzone({
  onFiles,
  accept = ".geojson,.json,.kml,.zip",
  multiple = false,
  title = "Upload AOI file",
  hint = "Drag & drop, or click to browse",
  showList = true,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [files, setFiles] = useState([]);

  const add = useCallback((list) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setFiles((prev) => (multiple ? [...prev, ...arr] : arr));
    onFiles?.(arr);
  }, [multiple, onFiles]);

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) add(e.dataTransfer.files);
  };
  const stop = (e) => { e.preventDefault(); };
  const human = (b) => (b > 1048576 ? (b / 1048576).toFixed(2) + " MB" : (b / 1024).toFixed(1) + " KB");

  return (
    <div
      className={`fdz ${compact ? "compact" : ""} ${drag ? "drag" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { stop(e); setDrag(true); }}
      onDragEnter={(e) => { stop(e); setDrag(true); }}
      onDragLeave={(e) => { stop(e); setDrag(false); }}
      onDrop={onDrop}
    >
      <div className="fdz-grid" />
      <div className="fdz-title">{title}</div>
      <div className="fdz-sub">{hint} · <span className="mono">{accept.replace(/,/g, " ")}</span></div>

      <div className="fdz-stage">
        <div className="fdz-plate"><Upload size={20} /></div>
        <div className="fdz-plate dashed" />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => add(e.target.files)}
      />

      {showList && files.length > 0 && (
        <div className="fdz-files" onClick={(e) => e.stopPropagation()}>
          {files.map((f, i) => (
            <div className="fdz-file" key={f.name + i}>
              <div className="r1">
                <span className="fn">{f.name}</span>
                <span className="sz">{human(f.size)}</span>
              </div>
              <div className="r2">
                <span className="ty">{f.type || "file"}</span>
                <span>modified {new Date(f.lastModified).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
