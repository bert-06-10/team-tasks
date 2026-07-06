import { useState } from "react";
import { Modal } from "../Primitives.jsx";

// ── Add/Duplicate Session Modal ──────────────────────────────────────────────────

export function AddSessionModal({ isDuplicate, initialData, template, onSave, onClose }) {
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
    <Modal title={isDuplicate ? "Duplicate session" : "Add class session"} onClose={onClose}>
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
      {isDuplicate ? (
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>Tasks from the original session will be copied and shifted to the new date.</p>
      ) : (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={sess.addTasks} onChange={e => setSess(p => ({ ...p, addTasks: e.target.checked }))} style={{ cursor: "pointer" }} />
          Add {(template || []).length} standard task{(template || []).length !== 1 ? "s" : ""} to this session
        </label>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving || !sess.professor.trim() || !sess.date} style={{ fontSize: 13, padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: (saving || !sess.professor.trim() || !sess.date) ? "default" : "pointer", opacity: (!sess.professor.trim() || !sess.date) ? 0.5 : 1 }}>
          {saving ? "Saving…" : isDuplicate ? "Duplicate" : "Add session"}
        </button>
        <button onClick={onClose} style={{ fontSize: 13, padding: "6px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancel</button>
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
  if (n < 0)   return `${Math.abs(n)} day${Math.abs(n) !== 1 ? "s" : ""} before`;
  return `${n} day${n !== 1 ? "s" : ""} after`;
}

export function StandardTasksModal({ template: templateProp, members, sessions, onSaveTemplate, onApplyTemplate, onClose }) {
  const template = (templateProp && templateProp.length > 0) ? templateProp : DEFAULT_STANDARD_TEMPLATE;
  const [applying, setApplying] = useState(false);
  const [applySessionId, setApplySessionId] = useState("");
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

  return (
    <Modal title="Standard tasks" onClose={onClose} minHeight={400}>
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 0, marginBottom: 16 }}>Applied when adding a new session. Use negative offsets for tasks due before the class date.</p>
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
            <button onClick={handleApply} disabled={applying || !applySessionId} style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: (applying || !applySessionId) ? "default" : "pointer", opacity: !applySessionId ? 0.5 : 1 }}>
              {applying ? "Applying…" : "Apply"}
            </button>
          </>
        )}
        <button onClick={onClose} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", marginLeft: "auto" }}>Done</button>
      </div>
    </Modal>
  );
}
