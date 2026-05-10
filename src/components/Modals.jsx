import { useState, useRef } from "react";
import { Modal, Field, TagInput } from "./Primitives.jsx";
import { STATUSES, DOC_TYPES, DEFAULT_CLASS_TASKS } from "../constants.js";
import { fmtDate, addDays, isFlagged, nextBusinessDay, parseCSV, parseClassTasksCSV, parseProgramTasksCSV, parseRunOfShowCSV } from "../utils.js";

function gcalUrl(title, date, details = "") {
  if (!date || !title) return null;
  const start = date.replace(/-/g, "");
  const next = new Date(date + "T00:00:00");
  next.setDate(next.getDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${start}/${end}` });
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params}`;
}

function AddToCalendarLink({ title, date, details }) {
  const url = gcalUrl(title, date, details);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--color-text-secondary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Add to Google Calendar
    </a>
  );
}

// ── Milestone Modal ───────────────────────────────────────────────────────────
export function MilestoneModal({milestone,onChange,onSave,onDelete,onClose}) {
  const isNew = !milestone.id;
  return (
    <Modal onClose={onClose} title={isNew?"New milestone":"Edit milestone"}>
      <Field label="Milestone name"><input value={milestone.title} onChange={e=>onChange({...milestone,title:e.target.value})} placeholder="e.g. Mid-cycle review"/></Field>
      <Field label="Date"><input type="date" value={milestone.date} onChange={e=>onChange({...milestone,date:e.target.value})}/></Field>
      {milestone.date && milestone.title && (
        <div style={{textAlign:"right",marginTop:-4}}>
          <AddToCalendarLink title={milestone.title} date={milestone.date} />
        </div>
      )}
      <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
        {!isNew&&<button onClick={()=>onDelete(milestone.id)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-danger)",cursor:"pointer",marginRight:"auto"}}>Delete</button>}
        <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(milestone)} disabled={!milestone.title||!milestone.date} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>Save</button>
      </div>
    </Modal>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────────────
export function TaskModal({task,tasks,docs,members,departments,globalTags,prefs,sessions,onChange,onSave,onDelete,onClose}) {
  const isNew = !task.id;
  return (
    <Modal onClose={onClose} title={isNew?(task.type==="class"?"New class task":"New program task"):(task.type==="class"?"Edit class task":"Edit program task")}>
      {task.type==="class"&&(
        <Field label="Session">
          <select value={task.sessionId||""} onChange={e=>{const s=sessions.find(x=>x.id===e.target.value);onChange({...task,sessionId:e.target.value,sessionName:s?.name||"",due:s?.date||task.due});}}>
            <option value="">Select session...</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name} — {fmtDate(s.date)}</option>)}
          </select>
        </Field>
      )}
      <Field label="Title"><input value={task.title} onChange={e=>onChange({...task,title:e.target.value})} placeholder="Task title"/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Assignee">
          <select value={task.assignee} onChange={e=>onChange({...task,assignee:e.target.value})}>
            {members.map(m=><option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Assist">
          <select value={task.assist||""} onChange={e=>onChange({...task,assist:e.target.value})}>
            <option value="">None</option>
            {members.map(m=><option key={m}>{m}</option>)}
          </select>
        </Field>
      </div>
      {task.type==="program"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Department">
            <select value={task.department||""} onChange={e=>onChange({...task,department:e.target.value})}>
              <option value="">None</option>
              {departments.map(d=><option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input type="date" value={task.due} onChange={e=>onChange({...task,due:e.target.value})}/></Field>
        </div>
      )}
      {task.type==="program"&&task.due&&task.title&&(
        <div style={{textAlign:"right",marginTop:-8}}>
          <AddToCalendarLink title={task.title} date={task.due} details={task.notes} />
        </div>
      )}
      {task.type==="program"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Spring: days from start">
            <input type="number" min="0" value={task.offset||0} onChange={e=>onChange({...task,offset:parseInt(e.target.value)||0})}/>
          </Field>
          <Field label="Fall: days from start">
            <input type="number" min="0" value={task.fallOffset??task.offset??0} onChange={e=>onChange({...task,fallOffset:parseInt(e.target.value)||0})}/>
          </Field>
        </div>
      )}
      <Field label="Status">
        <select value={task.status} onChange={e=>onChange({...task,status:e.target.value})}>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea value={task.notes} onChange={e=>onChange({...task,notes:e.target.value})} rows={3} style={{resize:"vertical"}}/></Field>
      <Field label="Tags"><TagInput tags={task.tags||[]} suggestions={globalTags} onChange={tags=>onChange({...task,tags})}/></Field>
      {task.type==="program"&&(
        <Field label="Task dependencies">
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {(task.deps||[]).length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {(task.deps||[]).map(depId=>{
                  const dep=tasks.find(t=>t.id===depId);
                  if(!dep) return null;
                  return (
                    <div key={depId} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
                      <span style={{color:"var(--color-text-primary)"}}>{dep.title}</span>
                      <span style={{fontSize:11,color:"var(--color-text-secondary)",marginLeft:8}}>({dep.status})</span>
                      <button onClick={()=>onChange({...task,deps:(task.deps||[]).filter(d=>d!==depId)})} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--color-text-tertiary)",padding:"0 0 0 8px",lineHeight:1}}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
            <select value="" onChange={e=>{const id=parseInt(e.target.value);if(id&&!(task.deps||[]).includes(id))onChange({...task,deps:[...(task.deps||[]),id]});}} style={{fontSize:13}}>
              <option value="">Add dependency…</option>
              {tasks.filter(t=>t.id!==task.id&&t.type==="program"&&!(task.deps||[]).includes(t.id)).map(t=>(
                <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
              ))}
            </select>
          </div>
        </Field>
      )}
      <Field label="Required collateral">
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:100,overflowY:"auto"}}>
          {docs.map(d => (
            <label key={d.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
              <input type="checkbox" checked={(task.collateralDeps||[]).includes(d.id)} onChange={e=>onChange({...task,collateralDeps:e.target.checked?[...(task.collateralDeps||[]),d.id]:(task.collateralDeps||[]).filter(x=>x!==d.id)})}/>
              <span style={{color:"var(--color-text-primary)"}}>{d.title}</span>
            </label>
          ))}
        </div>
      </Field>
      <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
        {!isNew&&<button onClick={()=>onDelete(task.id)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-danger)",cursor:"pointer",marginRight:"auto"}}>Delete</button>}
        <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(task)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>Save</button>
      </div>
    </Modal>
  );
}

// ── Doc Modal ─────────────────────────────────────────────────────────────────
export function DocModal({doc,members,audiences,globalTags,prefs,onChange,onSave,onDelete,onClose}) {
  const isNew = !doc.id;
  return (
    <Modal onClose={onClose} title={isNew?"Add document":"Edit document"}>
      <Field label="Title"><input value={doc.title} onChange={e=>onChange({...doc,title:e.target.value})} placeholder="Document title"/></Field>
      <Field label="Type">
        <select value={doc.type} onChange={e=>onChange({...doc,type:e.target.value})}>
          {DOC_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="URL / link"><input value={doc.url} onChange={e=>onChange({...doc,url:e.target.value})} placeholder="https://..."/></Field>
      <Field label="Audience">
        <select value={doc.audience} onChange={e=>onChange({...doc,audience:e.target.value})}>
          <option value="">Select audience...</option>
          {audiences.map(a=><option key={a}>{a}</option>)}
        </select>
      </Field>
      <Field label="Description"><textarea value={doc.description} onChange={e=>onChange({...doc,description:e.target.value})} rows={2} style={{resize:"vertical"}}/></Field>
      <Field label="Owner">
        <select value={doc.owner} onChange={e=>onChange({...doc,owner:e.target.value})}>
          {members.map(m=><option key={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Last updated"><input type="date" value={doc.updated} onChange={e=>onChange({...doc,updated:e.target.value})}/></Field>
      <Field label="Tags"><TagInput tags={doc.tags||[]} suggestions={globalTags} onChange={tags=>onChange({...doc,tags})}/></Field>
      <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
        {!isNew&&<button onClick={()=>onDelete(doc.id)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-danger)",cursor:"pointer",marginRight:"auto"}}>Delete</button>}
        <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(doc)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>Save</button>
      </div>
    </Modal>
  );
}

// ── Import Modal ──────────────────────────────────────────────────────────────
export function ImportModal({onImportProgram,onImportClass,onImportRunOfShow,sessions,cycle,onClose}) {
  const [importType,setImportType] = useState("program");
  const [csvText,setCsvText] = useState("");
  const [preview,setPreview] = useState(null);
  const [error,setError] = useState("");
  const [targetSession,setTargetSession] = useState(sessions[0]?.id||"");
  const [manualCycleStart,setManualCycleStart] = useState(cycle?.start||"");
  const [newCycleType,setNewCycleType] = useState("spring");
  const [newCycleName,setNewCycleName] = useState("");
  const fileRef = useRef();

  const effectiveCycleStart = cycle?.start || manualCycleStart;
  const needsCycle = !cycle && (importType === "program" || importType === "class");

  const runPreview = text => {
    try {
      const rows = parseCSV(text);
      if(!rows.length){setError("No rows found.");setPreview(null);return;}
      if(importType==="program"||importType==="class") {
        const parsed = importType==="program" ? parseProgramTasksCSV(rows) : parseClassTasksCSV(rows);
        const holidays = cycle?.holidays || [];
        const withDue = !effectiveCycleStart ? parsed : parsed.map(t =>
          t.due ? t : { ...t, due: nextBusinessDay(addDays(effectiveCycleStart, t.offset), holidays) }
        );
        setPreview(withDue);
      } else {
        setPreview(parseRunOfShowCSV(rows));
      }
      setError("");
    } catch(e) { console.error("CSV preview error:", e); setError("Could not parse CSV: " + (e.message || e)); setPreview(null); }
  };

  const handleFile = e => {
    const f=e.target.files[0];
    if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      const text = ev.target.result;
      setCsvText(text);
      setError("");
      runPreview(text);
    };
    r.readAsText(f);
  };

  const handlePreview = () => runPreview(csvText);

  const handleImport = () => {
    const cycleInfo = needsCycle && newCycleName.trim() && manualCycleStart
      ? { type: newCycleType, name: newCycleName.trim(), start: manualCycleStart }
      : null;
    if(importType==="program") onImportProgram(preview, cycleInfo);
    else if(importType==="class") {
      const session = sessions.find(s=>s.id===targetSession);
      onImportClass(preview.map(t=>({...t,sessionId:targetSession,sessionName:session?.name||"",due:t.due||session?.date||""})), cycleInfo);
    } else {
      onImportRunOfShow(targetSession,preview);
    }
  };

  const schemaHint = {
    program:   "task, owner, alternate_owner, due_date, days_from_cycle_start, status, notes, links",
    class:     "task, owner, alternate_owner, due_date, days_from_cycle_start, status, notes, links",
    runofshow: "cohort, time, event, owner, assist, notes",
  };
  const typeLabels = [["program","Program tasks"],["class","Class tasks"],["runofshow","Run of show"]];

  return (
    <Modal onClose={onClose} title="Import from CSV">
      <div style={{display:"flex",gap:4,marginBottom:16,padding:"4px",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",width:"fit-content"}}>
        {typeLabels.map(([t,l]) => (
          <button key={t} onClick={()=>{setImportType(t);setPreview(null);setError("");}} style={{fontSize:13,padding:"5px 14px",borderRadius:"var(--border-radius-md)",border:"none",background:importType===t?"var(--color-background-primary)":"transparent",color:importType===t?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer",fontWeight:importType===t?500:400,boxShadow:importType===t?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{l}</button>
        ))}
      </div>
      <div style={{marginBottom:16,padding:"10px 14px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.7}}>
        Expected columns: <code style={{fontSize:11,background:"var(--color-background-tertiary)",padding:"1px 5px",borderRadius:4}}>{schemaHint[importType]}</code>
        {(importType==="program"||importType==="class")&&(
          <div style={{marginTop:6}}>
            {cycle?.start
              ? <>Due dates computed from cycle start: <strong>{fmtDate(cycle.start)}</strong></>
              : <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4,padding:"10px 12px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-tertiary)",border:"0.5px solid var(--color-border-secondary)"}}>
                  <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>No active cycle — create one for this import:</div>
                  <div style={{display:"flex",gap:4}}>
                    {["spring","fall"].map(t=>(
                      <button key={t} onClick={()=>setNewCycleType(t)} style={{fontSize:12,padding:"3px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:newCycleType===t?"#E1F5EE":"transparent",color:newCycleType===t?"#0F6E56":"var(--color-text-secondary)",cursor:"pointer",fontWeight:newCycleType===t?500:400}}>
                        {t==="spring"?"Spring":"Fall"}
                      </button>
                    ))}
                  </div>
                  <input
                    value={newCycleName}
                    onChange={e=>setNewCycleName(e.target.value)}
                    placeholder={`Cycle name (e.g. ${newCycleType==="spring"?"Spring":"Fall"} 2026)`}
                    style={{fontSize:12,padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}
                  />
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--color-text-secondary)"}}>
                    Start date:
                    <input type="date" value={manualCycleStart} onChange={e=>{setManualCycleStart(e.target.value);setPreview(null);}} style={{fontSize:12,padding:"3px 6px",borderRadius:4,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)"}}/>
                  </label>
                </div>
            }
          </div>
        )}
      </div>
      {(importType==="class"||importType==="runofshow")&&(
        <Field label="Target session">
          <select value={targetSession} onChange={e=>setTargetSession(e.target.value)}>
            {sessions.map(s=><option key={s.id} value={s.id}>{s.name} — {fmtDate(s.date)}</option>)}
          </select>
        </Field>
      )}
      <Field label="Upload CSV file"><input ref={fileRef} type="file" accept=".csv" onChange={handleFile}/></Field>
      <Field label="Or paste CSV text">
        <textarea value={csvText} onChange={e=>{setCsvText(e.target.value);setPreview(null);}} rows={4} placeholder="cohort,owner,..." style={{resize:"vertical",fontFamily:"monospace",fontSize:12}}/>
      </Field>
      {error&&<div style={{fontSize:12,color:"var(--color-text-danger)",marginBottom:12}}>{error}</div>}
      {preview&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>{preview.length} rows — verify fields before importing:</div>
          <div style={{overflowX:"auto",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
            {importType==="runofshow" ? (
              // Run of show preview
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"var(--color-background-secondary)"}}>
                    {["Cohort","Time","Event","Owner","Assist","Notes"].map((h,i,arr) => (
                      <th key={h} style={{padding:"6px 10px",textAlign:"left",fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border-secondary)",borderRight:i<arr.length-1?"0.5px solid var(--color-border-tertiary)":"none",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row,i) => (
                    <tr key={i} style={{borderBottom:i===preview.length-1?"none":"0.5px solid var(--color-border-tertiary)"}}>
                      {[row.cohort,row.time,row.event,row.owner,row.assist,row.notes].map((v,j,arr) => (
                        <td key={j} style={{padding:"6px 10px",color:v?"var(--color-text-primary)":"var(--color-text-tertiary)",borderRight:j<arr.length-1?"0.5px solid var(--color-border-tertiary)":"none",maxWidth:180,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v||"—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // Task preview (program or class)
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"var(--color-background-secondary)"}}>
                    {["Task","Owner","Assist","Due","Status","Notes","Links"].map((h,i,arr) => (
                      <th key={h} style={{padding:"6px 10px",textAlign:"left",fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border-secondary)",borderRight:i<arr.length-1?"0.5px solid var(--color-border-tertiary)":"none",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row,i) => (
                    <tr key={i} style={{borderBottom:i===preview.length-1?"none":"0.5px solid var(--color-border-tertiary)"}}>
                      {[row.title,row.assignee,row.assist,row.due,row.status,row.notes,row.links].map((v,j,arr) => (
                        <td key={j} style={{padding:"6px 10px",color:v?"var(--color-text-primary)":"var(--color-text-tertiary)",borderRight:j<arr.length-1?"0.5px solid var(--color-border-tertiary)":"none",maxWidth:j===0?220:160,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={v||""}>{v||"—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
        {!preview&&<button onClick={handlePreview} disabled={!csvText.trim()} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:csvText.trim()?"var(--color-background-secondary)":"transparent",color:csvText.trim()?"var(--color-text-primary)":"var(--color-text-tertiary)",cursor:csvText.trim()?"pointer":"default"}}>Preview</button>}
        {preview&&<button onClick={handleImport} disabled={needsCycle&&(!newCycleName.trim()||!manualCycleStart)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"1px solid #9FE1CB",background:(needsCycle&&(!newCycleName.trim()||!manualCycleStart))?"transparent":"#E1F5EE",color:(needsCycle&&(!newCycleName.trim()||!manualCycleStart))?"var(--color-text-tertiary)":"#0F6E56",cursor:(needsCycle&&(!newCycleName.trim()||!manualCycleStart))?"default":"pointer",fontWeight:500}}>{needsCycle?`Create cycle & import ${preview.length} rows`:`Import ${preview.length} rows`}</button>}
      </div>
    </Modal>
  );
}

// ── Cycle Modal ───────────────────────────────────────────────────────────────
export function CycleModal({tasks,activeCycle,initialDraft,sessions,onSaveDraft,onLaunch,onClose,cycleType:propCycleType="spring"}) {
  const cycleType = initialDraft?.cycleType || propCycleType;
  const typeLabel = cycleType === "fall" ? "Fall" : "Spring";

  const [name,setName] = useState(initialDraft?.cycle.name||"");
  const [start,setStart] = useState(initialDraft?.cycle.start||"");
  const [end,setEnd] = useState(initialDraft?.cycle.end||"");
  const [holidays,setHolidays] = useState(initialDraft?.cycle.holidays||[]);
  const [holidayInput,setHolidayInput] = useState("");
  const [overrides,setOverrides] = useState(initialDraft?.overrides||{});
  const [step,setStep] = useState(1);
  const [numSessions,setNumSessions] = useState(sessions.length||18);
  const [sessionDates,setSessionDates] = useState(() => sessions.map(s=>({...s})));

  const preview = start ? tasks.map(t => {
    const off = cycleType === "fall" ? (t.fallOffset ?? t.offset ?? 0) : (t.offset || 0);
    const raw = addDays(start,off);
    const due = overrides[t.id]!==undefined ? overrides[t.id] : raw;
    return {...t,due,flagged:isFlagged(due,holidays),effectiveOffset:off};
  }) : [];
  const flaggedCount = preview.filter(t=>t.flagged).length;

  const addHoliday = () => {
    const d=holidayInput.trim();
    if(d&&!holidays.includes(d)) setHolidays(h=>[...h,d]);
    setHolidayInput("");
  };

  const currentOverrides = () => {
    const o={...overrides};
    preview.forEach(t=>{if(o[t.id]===undefined)o[t.id]=t.due;});
    return o;
  };

  const handleNumSessions = n => {
    setNumSessions(n);
    const arr=[];
    for(let i=1;i<=n;i++){const existing=sessionDates.find(s=>s.number===i);arr.push(existing||{id:`s${i}`,name:`Session ${i}`,date:"",number:i});}
    setSessionDates(arr);
  };

  const updateSessionDate = (idx,date) => setSessionDates(p=>p.map((s,i)=>i===idx?{...s,date}:s));

  return (
    <Modal onClose={onClose} title={initialDraft?`Edit draft — ${initialDraft.cycle.name}`:`New ${typeLabel} cycle`}>
      {step===1&&(
        <>
          <Field label="Cycle name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Fall 2026"/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Program start"><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></Field>
            <Field label="Program end"><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></Field>
          </div>
          <Field label="Holidays to exclude">
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {holidays.map(h => (
                <span key={h} style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:"#FCEBEB",color:"#A32D2D",display:"flex",alignItems:"center",gap:5}}>
                  {h}<button onClick={()=>setHolidays(hh=>hh.filter(x=>x!==h))} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#A32D2D",padding:0}}>×</button>
                </span>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input type="date" value={holidayInput} onChange={e=>setHolidayInput(e.target.value)}/>
              <button onClick={addHoliday} style={{fontSize:13,padding:"0 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",cursor:"pointer"}}>Add</button>
            </div>
          </Field>
          <Field label="Number of class sessions">
            <input type="number" min="1" max="30" value={numSessions} onChange={e=>handleNumSessions(parseInt(e.target.value)||1)}/>
          </Field>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:8}}>
            <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onSaveDraft({name,start,end,holidays},overrides,cycleType)} disabled={!name||!start} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:(!name||!start)?"var(--color-text-tertiary)":"var(--color-text-secondary)",cursor:(!name||!start)?"default":"pointer"}}>Save draft</button>
              <button onClick={()=>setStep(2)} disabled={!name||!start} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:(!name||!start)?"var(--color-background-tertiary)":"var(--color-background-secondary)",color:(!name||!start)?"var(--color-text-tertiary)":"var(--color-text-primary)",cursor:(!name||!start)?"default":"pointer"}}>Set session dates →</button>
            </div>
          </div>
        </>
      )}
      {step===2&&(
        <>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>Class session dates</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflowY:"auto"}}>
              {sessionDates.map((s,i) => (
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"}}>
                  <span style={{fontSize:13,color:"var(--color-text-primary)",minWidth:80}}>{s.name}</span>
                  <input type="date" value={s.date} onChange={e=>updateSessionDate(i,e.target.value)}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:8}}>
            <button onClick={()=>setStep(1)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>← Back</button>
            <button onClick={()=>setStep(3)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>Preview program due dates →</button>
          </div>
        </>
      )}
      {step===3&&(
        <>
          <div style={{marginBottom:12}}>
            <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 4px"}}>Program task due dates from <strong style={{color:"var(--color-text-primary)"}}>{start}</strong>.</p>
            {flaggedCount>0&&<div style={{fontSize:13,padding:"8px 12px",borderRadius:"var(--border-radius-md)",background:"#FAEEDA",color:"#854F0B",marginTop:8}}>{flaggedCount} task{flaggedCount>1?"s":""} flagged.</div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:260,overflowY:"auto"}}>
            {preview.map(t => (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:t.flagged?"1px solid #FAC775":"0.5px solid var(--color-border-tertiary)",background:t.flagged?"#FFFBF2":"var(--color-background-secondary)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:1}}>{t.title}</div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>+{t.effectiveOffset} days · {t.assignee}</div>
                </div>
                {t.flagged&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#FAEEDA",color:"#854F0B",flexShrink:0}}>review</span>}
                <input type="date" value={overrides[t.id]!==undefined?overrides[t.id]:t.due} onChange={e=>setOverrides(o=>({...o,[t.id]:e.target.value}))} style={{fontSize:12,border:t.flagged?"1px solid #FAC775":"0.5px solid var(--color-border-secondary)",borderRadius:6,padding:"4px 8px",background:"var(--color-background-primary)",color:"var(--color-text-primary)",width:130}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:16}}>
            <button onClick={()=>setStep(2)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>← Back</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onSaveDraft({name,start,end,holidays},currentOverrides(),cycleType)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Save draft</button>
              <button onClick={()=>onLaunch({name,start,end,holidays},currentOverrides(),sessionDates,cycleType)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"1px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer",fontWeight:500}}>Launch "{name}"</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
