import { useState, useRef } from "react";
import { Modal, Field } from "../Primitives.jsx";
import { addDays, nextBusinessDay, fmtDate, parseCSV, parseClassTasksCSV, parseProgramTasksCSV, parseRunOfShowCSV, parseCollateralCSV } from "../../utils.js";

// ── Import/Export Modal (tasks, run of show) ─────────────────────────────────────

export function ImportModal({onImportProgram,onImportClass,onImportRunOfShow,sessions,cycle,importHistory,onReverseImport,onClose,initialTab="program"}) {
  const [importType,setImportType] = useState(initialTab);
  const [csvText,setCsvText] = useState("");
  const [preview,setPreview] = useState(null);
  const [error,setError] = useState("");
  const [targetSession,setTargetSession] = useState(sessions[0]?.id||"");
  const [manualCycleStart,setManualCycleStart] = useState(cycle?.start||"");
  const [newCycleType,setNewCycleType] = useState("spring");
  const [newCycleName,setNewCycleName] = useState("");
  const [reversing,setReversing] = useState(null);
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
    runofshow: "time, event, owner, assist, notes",
  };
  const typeLabels = [["program","Program tasks"],["class","Class tasks"],["runofshow","Run of show"],["history","History"]];

  const typeDisplayLabels = { program: "Program tasks", class: "Class tasks", runofshow: "Run of show" };

  return (
    <Modal onClose={onClose} title="Import from CSV">
      <div style={{display:"flex",gap:4,marginBottom:16,padding:"4px",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",width:"fit-content"}}>
        {typeLabels.map(([t,l]) => (
          <button key={t} onClick={()=>{setImportType(t);setPreview(null);setError("");}} style={{fontSize:13,padding:"5px 14px",borderRadius:"var(--border-radius-md)",border:"none",background:importType===t?"var(--color-background-primary)":"transparent",color:importType===t?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer",fontWeight:importType===t?500:400,boxShadow:importType===t?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{l}</button>
        ))}
      </div>

      {importType === "history" ? (
        <div>
          {(!importHistory || importHistory.length === 0) ? (
            <div style={{fontSize:13,color:"var(--color-text-tertiary)",padding:"32px 0",textAlign:"center"}}>No import history yet.</div>
          ) : (
            importHistory.map(entry => (
              <div key={entry.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",marginBottom:8,background:"var(--color-background-secondary)"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:2}}>{entry.label}</div>
                  <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>
                    {new Date(entry.timestamp).toLocaleString()} · {typeDisplayLabels[entry.type] || entry.type}{entry.sessionLabel ? ` — ${entry.sessionLabel}` : ""}
                  </div>
                </div>
                <button
                  onClick={async () => { setReversing(entry.id); await onReverseImport(entry); setReversing(null); }}
                  disabled={reversing === entry.id}
                  style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"#FEF2F2",color:"#A32D2D",cursor:reversing===entry.id?"default":"pointer",opacity:reversing===entry.id?0.6:1,whiteSpace:"nowrap",flexShrink:0,marginLeft:16}}
                >
                  {reversing === entry.id ? "Reversing…" : "Reverse"}
                </button>
              </div>
            ))
          )}
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
            <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Close</button>
          </div>
        </div>
      ) : (<>

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
                    {["Time","Event","Owner","Assist","Notes"].map((h,i,arr) => (
                      <th key={h} style={{padding:"6px 10px",textAlign:"left",fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border-secondary)",borderRight:i<arr.length-1?"0.5px solid var(--color-border-tertiary)":"none",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row,i) => (
                    <tr key={i} style={{borderBottom:i===preview.length-1?"none":"0.5px solid var(--color-border-tertiary)"}}>
                      {[row.time,row.event,row.owner,row.assist,row.notes].map((v,j,arr) => (
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
      </>)}
    </Modal>
  );
}

// ── Import Collateral Modal ──────────────────────────────────────────────────────

export function ImportCollateralModal({ onImport, onClose }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const runPreview = text => {
    try {
      const rows = parseCSV(text);
      if (!rows.length) { setError("No rows found."); setPreview(null); return; }
      setPreview(parseCollateralCSV(rows));
      setError("");
    } catch (e) {
      setError("Could not parse CSV: " + (e.message || e));
      setPreview(null);
    }
  };

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => { const text = ev.target.result; setCsvText(text); setError(""); runPreview(text); };
    r.readAsText(f);
  };

  const previewCols = [
    ["Title", r => r.title],
    ["Owner", r => r.owner],
    ["Content Owner", r => r.content_owner],
    ["Assist", r => r.assist],
    ["Audience", r => r.audience],
    ["Editable Link", r => r.url],
    ["Shareable Link", r => r.shareable_link],
    ["Last Updated", r => r.updated],
    ["Tags", r => r.tags.join(", ") || "—"],
  ];

  return (
    <Modal onClose={onClose} title="Import collateral from CSV">
      <div style={{marginBottom:16,padding:"10px 14px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.7}}>
        Expected columns: <code style={{fontSize:11,background:"var(--color-background-tertiary)",padding:"1px 5px",borderRadius:4}}>Title, Owner, Audience, Description, Editable Link, Shareable Link, Next Scheduled Update, Last Updated, Content Owner, Assist, Logo Wall, Impact Stats, Video Testimonial, Notes</code>
        <div style={{marginTop:6,fontSize:11,color:"var(--color-text-tertiary)"}}>Logo Wall, Impact Stats, and Video Testimonial are stored as tags when set to "yes", "true", or "x". Other extra fields are appended to the description.</div>
      </div>
      <Field label="Upload CSV file"><input ref={fileRef} type="file" accept=".csv" onChange={handleFile}/></Field>
      <Field label="Or paste CSV text">
        <textarea value={csvText} onChange={e=>{setCsvText(e.target.value);setPreview(null);}} rows={4} placeholder="Title,Owner,Audience,..." style={{resize:"vertical",fontFamily:"monospace",fontSize:12}}/>
      </Field>
      {error && <div style={{fontSize:12,color:"var(--color-text-danger)",marginBottom:12}}>{error}</div>}
      {preview && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>{preview.length} items — verify before importing:</div>
          <div style={{overflowX:"auto",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"var(--color-background-secondary)"}}>
                  {previewCols.map(([h],i,arr) => (
                    <th key={h} style={{padding:"6px 10px",textAlign:"left",fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"1px solid var(--color-border-secondary)",borderRight:i<arr.length-1?"0.5px solid var(--color-border-tertiary)":"none",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row,i) => (
                  <tr key={i} style={{borderBottom:i===preview.length-1?"none":"0.5px solid var(--color-border-tertiary)"}}>
                    {previewCols.map(([h,fn],j,arr) => {
                      const v = fn(row);
                      return <td key={h} style={{padding:"6px 10px",color:v&&v!=="—"?"var(--color-text-primary)":"var(--color-text-tertiary)",borderRight:j<arr.length-1?"0.5px solid var(--color-border-tertiary)":"none",maxWidth:j===0?200:150,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={v||""}>{v||"—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}>
        <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
        {!preview && <button onClick={()=>runPreview(csvText)} disabled={!csvText.trim()} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:csvText.trim()?"var(--color-background-secondary)":"transparent",color:csvText.trim()?"var(--color-text-primary)":"var(--color-text-tertiary)",cursor:csvText.trim()?"pointer":"default"}}>Preview</button>}
        {preview && <button onClick={()=>onImport(preview)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"1px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer",fontWeight:500}}>Import {preview.length} items</button>}
      </div>
    </Modal>
  );
}
