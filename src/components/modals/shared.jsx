import { useState } from "react";

// ── Shared helpers used by multiple modals ─────────────────────────────────────

export function SearchablePicker({options, onSelect, placeholder="Search…"}) {
  const [query, setQuery]   = useState("");
  const [open,  setOpen]    = useState(false);
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{position:"relative"}}>
      <input
        value={query}
        onChange={e=>{setQuery(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)}
        onBlur={()=>setTimeout(()=>setOpen(false),150)}
        placeholder={placeholder}
        style={{width:"100%",fontSize:13,padding:"5px 8px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"}}
      />
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",top:"calc(100% + 2px)",left:0,right:0,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:300,maxHeight:200,overflowY:"auto"}}>
          {filtered.map(o => (
            <div key={o.value} onMouseDown={()=>{onSelect(o.value);setQuery("");setOpen(false);}} style={{padding:"7px 10px",fontSize:13,cursor:"pointer",color:"var(--color-text-primary)"}} onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              {o.label}
            </div>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div style={{position:"absolute",top:"calc(100% + 2px)",left:0,right:0,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"8px 10px",fontSize:13,color:"var(--color-text-tertiary)",zIndex:300}}>No matches</div>
      )}
    </div>
  );
}

// ── Google Calendar link helper ─────────────────────────────────────────────────

export function gcalUrl(title, date, details = "") {
  if (!date || !title) return null;
  const start = date.replace(/-/g, "");
  const next = new Date(date + "T00:00:00");
  next.setDate(next.getDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${start}/${end}` });
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function AddToCalendarLink({ title, date, details }) {
  const url = gcalUrl(title, date, details);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--color-text-secondary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Add to Google Calendar
    </a>
  );
}

// ── Dependency suggestion + chip (used by Milestone modals) ─────────────────────

export function suggestDeps(title, tasks, existingDeps) {
  if (!title || title.trim().length < 3) return [];
  const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return [];
  return tasks
    .filter(t => !existingDeps.includes(t.id))
    .map(t => ({ task: t, score: words.reduce((n, w) => n + (t.title.toLowerCase().includes(w) ? 1 : 0), 0) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(x => x.task);
}

export function DepChip({t, onRemove}) {
  const done = t.status === "Done";
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
      <span style={{color:done?"#0F6E56":"var(--color-text-tertiary)",fontSize:12,flexShrink:0}}>{done?"✓":"○"}</span>
      <span style={{flex:1,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</span>
      <span style={{fontSize:11,color:"var(--color-text-tertiary)",flexShrink:0}}>{t.status}</span>
      {onRemove && <button onClick={onRemove} aria-label="Remove" style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--color-text-tertiary)",padding:"0 0 0 4px",lineHeight:1,flexShrink:0}}>×</button>}
    </div>
  );
}
