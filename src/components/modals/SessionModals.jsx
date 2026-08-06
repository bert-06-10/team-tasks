import { useState, useRef } from "react";
import { Modal } from "../Primitives.jsx";
import { offsetLabel, fmtDate, parseCSV, parseStandardTasksCSV } from "../../utils.js";
import { COHORT_OPTIONS } from "../../constants.js";

// ── Add/Duplicate/Edit Session Modal ──────────────────────────────────────────────

export function AddSessionModal({ isDuplicate, isEdit, initialData, template, onSave, onClose }) {
  const [sess, setSess] = useState(initialData || { professor: "", cohort: "Cohort 1", date: "", addTasks: false });
  const [saving, setSaving] = useState(false);
  const labelStyle = { fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", letterSpacing: "0.06em", marginBottom: 6 };
  const inputStyle = { fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };

  const handleSave = async () => {
    if (!sess.professor.trim() || !sess.date) return;
    setSaving(true);
    try { await onSave(sess); onClose(); }
    catch { /* already toasted */ }
    finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Edit session" : isDuplicate ? "Duplicate session" : "Add class session"} onClose={onClose}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: "1 1 180px" }}>
          <div style={labelStyle}>PROFESSOR</div>
          <input autoFocus placeholder="Professor name" value={sess.professor} onChange={e => setSess(p => ({ ...p, professor: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSave()} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <div style={labelStyle}>COHORT</div>
          <select value={sess.cohort} onChange={e => setSess(p => ({ ...p, cohort: e.target.value }))} style={{ ...inputStyle, width: "auto", minWidth: "100%" }}>
            {COHORT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <div style={labelStyle}>CLASS DATE</div>
          <input type="date" value={sess.date} onChange={e => setSess(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
        </div>
      </div>
      {isEdit ? null : isDuplicate ? (
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>Tasks from the original session will be copied and shifted to the new date.</p>
      ) : (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={sess.addTasks} onChange={e => setSess(p => ({ ...p, addTasks: e.target.checked }))} style={{ cursor: "pointer" }} />
          Add {(template || []).length} standard task{(template || []).length !== 1 ? "s" : ""} to this session
        </label>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving || !sess.professor.trim() || !sess.date} style={{ fontSize: 13, padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-success)", background: "var(--color-background-success)", color: "var(--color-text-success)", cursor: (saving || !sess.professor.trim() || !sess.date) ? "default" : "pointer", opacity: (!sess.professor.trim() || !sess.date) ? 0.5 : 1 }}>
          {saving ? "Saving…" : isEdit ? "Save changes" : isDuplicate ? "Duplicate" : "Add session"}
        </button>
        <button onClick={onClose} style={{ fontSize: 13, padding: "6px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancel</button>
      </div>
    </Modal>
  );
}

// ── Sessions List Modal (view, edit, duplicate, delete) ────────────────────────

export function SessionsListModal({ sessions, classTasks, onEdit, onDuplicate, onDelete, onClose }) {
  const sorted = [...(sessions || [])].sort((a, b) => (a.date || '') < (b.date || '') ? -1 : (a.date || '') > (b.date || '') ? 1 : 0);
  const actionBtn = { fontSize: 12, padding: "4px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" };
  return (
    <Modal title="Class sessions" onClose={onClose}>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", padding: "32px 0", textAlign: "center" }}>No sessions yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
          {sorted.map(s => {
            const taskCount = (classTasks || []).filter(t => t.sessionId === s.id).length;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.professor || s.name || "Untitled session"}{s.cohort ? ` — ${s.cohort}` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{s.date ? fmtDate(s.date) : "No date"} · {taskCount} task{taskCount !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => onEdit(s)} style={actionBtn}>Edit</button>
                  <button onClick={() => onDuplicate(s)} style={actionBtn}>Duplicate</button>
                  <button onClick={() => onDelete(s.id)} style={{ ...actionBtn, border: "0.5px solid var(--color-border-danger)", background: "var(--color-background-danger)", color: "var(--color-text-danger)" }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={{ fontSize: 13, padding: "6px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Close</button>
      </div>
    </Modal>
  );
}

// ── StandardTasksModal ─────────────────────────────────────────────────────────
const DEFAULT_STANDARD_TEMPLATE = [
  { title: "Prepare session materials", offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Send participant reminder",  offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Set up room/platform",       offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Facilitate session",         offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Post recording & notes",     offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Follow-up survey",           offset: 0, assignee: "", assist: "", notes: "" },
];

// ── Standard Tasks Modal ─────────────────────────────────────────────────────────

function stdOffsetLabel(n) {
  if (n === 0) return "Day of class";
  return offsetLabel(n);
}

export function StandardTasksModal({ template: templateProp, members, sessions, onSaveTemplate, onApplyTemplate, onClose }) {
  const template = (templateProp && templateProp.length > 0) ? templateProp : DEFAULT_STANDARD_TEMPLATE;
  const [applying, setApplying] = useState(false);
  const [applySessionId, setApplySessionId] = useState("");
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvError, setCsvError] = useState("");
  const fileRef = useRef();
  const inputStyle = { fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };

  const updateItem = (i, field, val) => onSaveTemplate(template.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const removeItem = (i) => onSaveTemplate(template.filter((_, idx) => idx !== i));
  const addItem    = ()  => onSaveTemplate([...template, { title: "", offset: 0, assignee: "", assist: "", notes: "" }]);

  const handleApply = async () => {
    if (!applySessionId) return;
    setApplying(true);
    try { await onApplyTemplate(applySessionId); }
    finally { setApplying(false); }
  };

  const runCsvPreview = text => {
    try {
      const rows = parseCSV(text);
      if (!rows.length) { setCsvError("No rows found."); setCsvPreview(null); return; }
      const parsed = parseStandardTasksCSV(rows);
      if (!parsed.length) { setCsvError("No valid task rows found."); setCsvPreview(null); return; }
      setCsvPreview(parsed);
      setCsvError("");
    } catch (e) { setCsvError("Could not parse CSV: " + (e.message || e)); setCsvPreview(null); }
  };
  const handleCsvFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => { const text = ev.target.result; setCsvText(text); setCsvError(""); runCsvPreview(text); };
    r.readAsText(f);
  };
  const resetCsvImport = () => { setCsvText(""); setCsvPreview(null); setCsvError(""); if (fileRef.current) fileRef.current.value = ""; };
  const applyCsvImport = replace => {
    onSaveTemplate(replace ? csvPreview : [...template, ...csvPreview]);
    resetCsvImport();
    setShowCsvImport(false);
  };

  return (
    <Modal title="Standard tasks" onClose={onClose} minHeight={400}>
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 0, marginBottom: 16 }}>Applied when adding a new session. Use negative offsets for tasks due before the class date.</p>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowCsvImport(v => !v)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: showCsvImport ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>
          {showCsvImport ? "Hide CSV import ▾" : "Import from CSV ▸"}
        </button>
        {showCsvImport && (
          <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              Expected columns: <code style={{ fontSize: 11, background: "var(--color-background-tertiary)", padding: "1px 5px", borderRadius: 4 }}>task, days_from_class_date, owner, assist, notes</code>. Negative values are days before the class date, positive are after.
            </div>
            <div style={{ marginBottom: 8 }}>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvFile} style={{ fontSize: 12 }} />
            </div>
            <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setCsvPreview(null); }} rows={3} placeholder="task,days_from_class_date,owner,assist,notes" style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12, marginBottom: 8 }} />
            {csvError && <div style={{ fontSize: 12, color: "var(--color-text-danger)", marginBottom: 8 }}>{csvError}</div>}
            {csvPreview && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>{csvPreview.length} task{csvPreview.length !== 1 ? "s" : ""} parsed:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflowY: "auto" }}>
                  {csvPreview.map((t, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--color-text-primary)", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>{stdOffsetLabel(t.offset)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {!csvPreview && <button onClick={() => runCsvPreview(csvText)} disabled={!csvText.trim()} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: csvText.trim() ? "var(--color-background-primary)" : "transparent", color: csvText.trim() ? "var(--color-text-primary)" : "var(--color-text-tertiary)", cursor: csvText.trim() ? "pointer" : "default" }}>Preview</button>}
              {csvPreview && (<>
                <button onClick={() => applyCsvImport(false)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" }}>Append to template</button>
                <button onClick={() => applyCsvImport(true)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "1px solid var(--color-border-success)", background: "var(--color-background-success)", color: "var(--color-text-success)", cursor: "pointer", fontWeight: 500 }}>Replace template</button>
                <button onClick={resetCsvImport} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancel</button>
              </>)}
            </div>
          </div>
        )}
      </div>
      {template.map((item, i) => (
        <div key={i} style={{ marginBottom: 8, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "center" }}>
            <input value={item.title} onChange={e => updateItem(i, "title", e.target.value)} placeholder="Task name" style={{ ...inputStyle, padding: "5px 8px", flex: 1 }} />
            <input type="number" value={item.offset} onChange={e => updateItem(i, "offset", parseInt(e.target.value) || 0)} style={{ ...inputStyle, padding: "5px 8px", width: 56, flexShrink: 0, textAlign: "right" }} />
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", minWidth: 90 }}>{stdOffsetLabel(item.offset)}</span>
            <button onClick={() => removeItem(i)} aria-label="Remove item" style={{ fontSize: 15, lineHeight: 1, border: "none", background: "none", color: "var(--color-text-tertiary)", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={item.assignee || ""} onChange={e => updateItem(i, "assignee", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", flex: "0 0 150px" }}>
              <option value="">Owner…</option>
              {(members || []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={item.assist || ""} onChange={e => updateItem(i, "assist", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", flex: "0 0 150px" }}>
              <option value="">Assist…</option>
              {(members || []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input value={item.notes || ""} onChange={e => updateItem(i, "notes", e.target.value)} placeholder="Notes" style={{ ...inputStyle, padding: "4px 8px", flex: 1 }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={addItem} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>+ Add task</button>
        {(sessions||[]).length > 0 && (
          <>
            <select value={applySessionId} onChange={e => setApplySessionId(e.target.value)} style={{ fontSize: 12, padding: "5px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
              <option value="">Apply to session…</option>
              {(sessions||[]).map(s => { const label = [s.professor||s.name, s.cohort?`— ${s.cohort}`:"", s.date?`· ${s.date}`:""].filter(Boolean).join(" "); return <option key={s.id} value={s.id}>{label}</option>; })}
            </select>
            <button onClick={handleApply} disabled={applying || !applySessionId} style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-success)", background: "var(--color-background-success)", color: "var(--color-text-success)", cursor: (applying || !applySessionId) ? "default" : "pointer", opacity: !applySessionId ? 0.5 : 1 }}>
              {applying ? "Applying…" : "Apply"}
            </button>
          </>
        )}
        <button onClick={onClose} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", marginLeft: "auto" }}>Done</button>
      </div>
    </Modal>
  );
}
