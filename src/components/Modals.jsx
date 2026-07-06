import { useState, useRef, useEffect, useId } from "react";
import { Modal, Field, TagInput } from "./Primitives.jsx";
import { STATUSES, DOC_TYPES, DEFAULT_CLASS_TASKS } from "../constants.js";
import { fmtDate, fmtDateYear, addDays, isFlagged, nextBusinessDay, isWeekend, closestBusinessDay, parseCSV, parseClassTasksCSV, parseProgramTasksCSV, parseRunOfShowCSV, parseCollateralCSV, avatarBg, avatarTx, typeIcon, typeColor, typeBg, useIsMobile } from "../utils.js";

function SearchablePicker({options, onSelect, placeholder="Search…"}) {
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

// ── Milestone helpers ─────────────────────────────────────────────────────────
function suggestDeps(title, tasks, existingDeps) {
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

function DepChip({t, onRemove}) {
  const done = t.status === "Done";
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
      <span style={{color:done?"#0F6E56":"var(--color-text-tertiary)",fontSize:12,flexShrink:0}}>{done?"✓":"○"}</span>
      <span style={{flex:1,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</span>
      <span style={{fontSize:11,color:"var(--color-text-tertiary)",flexShrink:0}}>{t.status}</span>
      {onRemove && <button aria-label="Remove" onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--color-text-tertiary)",padding:"0 0 0 4px",lineHeight:1,flexShrink:0}}>×</button>}
    </div>
  );
}

// ── Milestone Detail Modal ────────────────────────────────────────────────────
export function MilestoneDetailModal({milestone, tasks=[], docs=[], onEdit, onClose}) {
  const deps          = (milestone.deps||[]).map(id => tasks.find(t => t.id === id)).filter(Boolean);
  const collateralDeps = (milestone.collateralDeps||[]).map(id => docs.find(d => d.id === id)).filter(Boolean);
  const doneCount     = deps.filter(t => t.status === "Done").length;
  const allDone       = deps.length > 0 && doneCount === deps.length && collateralDeps.length === 0;
  const gcal          = gcalUrl(milestone.title, milestone.date);
  const sectionLabel  = s => <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{s}</div>;
  return (
    <Modal onClose={onClose} title="Milestone">
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",borderRadius:"var(--border-radius-lg)",background:allDone?"#E1F5EE":"#E6F1FB",border:`1px solid ${allDone?"#9FE1CB":"#B5D4F4"}`,marginBottom:16}}>
        <span aria-hidden="true" style={{fontSize:20,color:allDone?"#0F6E56":"#185FA5",marginTop:2}}>◆</span>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600,color:allDone?"#0F6E56":"#185FA5",marginBottom:2}}>{milestone.title}</div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:allDone?"#0F6E56":"#185FA5",opacity:0.75}}>{fmtDateYear(milestone.date)}</span>
            {gcal && <a href={gcal} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:allDone?"#0F6E56":"#185FA5",opacity:0.7,textDecoration:"none"}}>+ Google Calendar</a>}
          </div>
        </div>
        {deps.length > 0 && (
          <span style={{fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:10,background:allDone?"#C6F0E0":"#D0E8FC",color:allDone?"#0F6E56":"#185FA5",flexShrink:0}}>
            {doneCount}/{deps.length} done
          </span>
        )}
      </div>
      {/* Required tasks */}
      <div style={{marginBottom:14}}>
        {sectionLabel("Required tasks")}
        {deps.length > 0
          ? <div style={{display:"flex",flexDirection:"column",gap:4}}>{deps.map(t => <DepChip key={t.id} t={t}/>)}</div>
          : <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>None set.</span>
        }
      </div>
      {/* Required collateral */}
      <div style={{marginBottom:16}}>
        {sectionLabel("Required collateral")}
        {collateralDeps.length > 0
          ? <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {collateralDeps.map(d => (
                <div key={d.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
                  <span style={{fontSize:11,fontWeight:600,color:typeColor(d.type),background:typeBg(d.type),padding:"1px 5px",borderRadius:3,flexShrink:0}}>{typeIcon(d.type)}</span>
                  <span style={{flex:1,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</span>
                  {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"var(--color-text-tertiary)",textDecoration:"none",flexShrink:0}}>Open ↗</a>}
                </div>
              ))}
            </div>
          : <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>None set.</span>
        }
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Close</button>
        <button onClick={()=>onEdit(milestone)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>Edit</button>
      </div>
    </Modal>
  );
}

// ── Milestone Modal ───────────────────────────────────────────────────────────
export function MilestoneModal({milestone,onChange,onSave,onDelete,onClose,tasks=[],docs=[]}) {
  const isNew          = !milestone.id;
  const deps           = milestone.deps || [];
  const collateralDeps = milestone.collateralDeps || [];
  const addDep         = id => { if (id && !deps.includes(id)) onChange({...milestone, deps: [...deps, id]}); };
  const removeDep      = id => onChange({...milestone, deps: deps.filter(d => d !== id)});
  const addCollateral  = id => { if (id && !collateralDeps.includes(id)) onChange({...milestone, collateralDeps: [...collateralDeps, id]}); };
  const removeCollateral = id => onChange({...milestone, collateralDeps: collateralDeps.filter(d => d !== id)});
  const eligible       = tasks.filter(t => !deps.includes(t.id));
  const eligibleDocs   = docs.filter(d => !collateralDeps.includes(d.id));
  const suggestions    = suggestDeps(milestone.title, eligible, deps);
  return (
    <Modal onClose={onClose} title={isNew?"New milestone":"Edit milestone"} minHeight="520px">
      <Field label="Milestone name"><input value={milestone.title} onChange={e=>onChange({...milestone,title:e.target.value})} placeholder="e.g. Mid-cycle review"/></Field>
      <Field label="Date"><input type="date" value={milestone.date} onChange={e=>onChange({...milestone,date:e.target.value})}/></Field>
      {milestone.date && milestone.title && (
        <div style={{textAlign:"right",marginTop:-4}}>
          <AddToCalendarLink title={milestone.title} date={milestone.date} />
        </div>
      )}
      <Field label="Required tasks">
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {deps.length > 0 && (
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {deps.map(depId => {
                const t = tasks.find(x => x.id === depId);
                if (!t) return null;
                return <DepChip key={depId} t={t} onRemove={()=>removeDep(depId)}/>;
              })}
            </div>
          )}
          <SearchablePicker
            placeholder="Search tasks to add…"
            options={eligible.map(t => ({value: t.id, label: `${t.title} (${t.status})`}))}
            onSelect={id => addDep(id)}
          />
          {suggestions.length > 0 && (
            <div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:4}}>Suggested</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {suggestions.map(t => (
                  <button key={t.id} onClick={()=>addDep(t.id)} style={{fontSize:12,padding:"3px 10px",borderRadius:20,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>
                    + {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Field>
      <Field label="Required collateral">
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {collateralDeps.length > 0 && (
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {collateralDeps.map(docId => {
                const d = docs.find(x => x.id === docId);
                if (!d) return null;
                return (
                  <div key={docId} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
                    <span style={{fontSize:11,fontWeight:600,color:typeColor(d.type),background:typeBg(d.type),padding:"1px 5px",borderRadius:3,flexShrink:0}}>{typeIcon(d.type)}</span>
                    <span style={{flex:1,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</span>
                    <button aria-label="Remove collateral" onClick={()=>removeCollateral(docId)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--color-text-tertiary)",padding:"0 0 0 4px",lineHeight:1,flexShrink:0}}>×</button>
                  </div>
                );
              })}
            </div>
          )}
          <SearchablePicker
            placeholder="Search collateral to add…"
            options={eligibleDocs.map(d => ({value: d.id, label: `${d.title} (${d.type})`}))}
            onSelect={id => addCollateral(id)}
          />
        </div>
      </Field>
      <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
        {!isNew&&<button onClick={()=>onDelete(milestone.id)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-danger)",cursor:"pointer",marginRight:"auto"}}>Delete</button>}
        <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(milestone)} disabled={!milestone.title||!milestone.date} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>Save</button>
      </div>
    </Modal>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────────────
export function TaskModal({task,tasks,docs,milestones=[],members,departments,globalTags,prefs,sessions,profileIdByName={},onChange,onSave,onDelete,onClose}) {
  const isNew = !task.id;
  const isMobile = useIsMobile();
  const twoCol = {display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12};
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
      <div style={twoCol}>
        <Field label="Assignee">
          <select value={task.assignee} onChange={e=>{const name=e.target.value;onChange({...task,assignee:name,assignee_id:profileIdByName[name.trim().toLowerCase()]||null});}}>
            {members.map(m=><option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Assist">
          <select value={task.assist||""} onChange={e=>{const name=e.target.value;onChange({...task,assist:name,assist_id:name?(profileIdByName[name.trim().toLowerCase()]||null):null});}}>
            <option value="">None</option>
            {members.map(m=><option key={m}>{m}</option>)}
          </select>
        </Field>
      </div>
      {task.type==="program"&&(
        <div style={twoCol}>
          <Field label="Department">
            <select value={task.department||""} onChange={e=>onChange({...task,department:e.target.value})}>
              <option value="">None</option>
              {departments.map(d=><option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" value={task.due} onChange={e=>{const d=closestBusinessDay(e.target.value);onChange({...task,due:d});}}/>
            {task.due&&isWeekend(task.due)===false&&closestBusinessDay(task.due)!==task.due&&<span style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2,display:"block"}}>Adjusted to nearest weekday</span>}
          </Field>
        </div>
      )}
      {task.type==="program"&&task.due&&task.title&&(
        <div style={{textAlign:"right",marginTop:-8}}>
          <AddToCalendarLink title={task.title} date={task.due} details={task.notes} />
        </div>
      )}
      {task.type==="program"&&(
        <div style={twoCol}>
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
      {task.type==="program"&&(()=>{
        const dependentTasks = tasks.filter(t => t.id !== task.id && (t.deps||[]).includes(task.id));
        const dependentMilestones = milestones.filter(m => (m.deps||[]).includes(task.id));
        const depChip = (label, status, done, onRemove) => (
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
            <span style={{color:done?"#0F6E56":"var(--color-text-tertiary)",fontSize:11,flexShrink:0}}>{done?"✓":"○"}</span>
            <span style={{flex:1,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span>
            <span style={{fontSize:11,color:"var(--color-text-tertiary)",flexShrink:0}}>{status}</span>
            {onRemove&&<button onClick={onRemove} aria-label="Remove" style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--color-text-tertiary)",padding:"0 0 0 4px",lineHeight:1,flexShrink:0}}>×</button>}
          </div>
        );
        return (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {/* Blocked by — tasks this task depends on */}
            <Field label="Blocked by">
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {(task.deps||[]).length>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {(task.deps||[]).map(depId=>{
                      const dep=tasks.find(t=>t.id===depId);
                      if(!dep) return null;
                      return <div key={depId}>{depChip(dep.title, dep.status, dep.status==="Done", ()=>onChange({...task,deps:(task.deps||[]).filter(d=>d!==depId)}))}</div>;
                    })}
                  </div>
                )}
                <SearchablePicker
                  placeholder="Search tasks to add…"
                  options={tasks.filter(t=>t.id!==task.id&&t.type==="program"&&!(task.deps||[]).includes(t.id)).map(t=>({value:t.id,label:`${t.title} (${t.status})`}))}
                  onSelect={id=>{if(id&&!(task.deps||[]).includes(id))onChange({...task,deps:[...(task.deps||[]),id]});}}
                />
              </div>
            </Field>
            {/* Task dependencies — tasks that depend on this task */}
            <Field label="Task dependencies">
              {dependentTasks.length === 0
                ? <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>No tasks depend on this task.</span>
                : <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {dependentTasks.map(t => <div key={t.id}>{depChip(t.title, t.status, t.status==="Done", null)}</div>)}
                  </div>
              }
            </Field>
            {/* Milestone dependencies — milestones that depend on this task */}
            <Field label="Milestone dependencies">
              {dependentMilestones.length === 0
                ? <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>No milestones depend on this task.</span>
                : <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {dependentMilestones.map(m => (
                      <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:"var(--border-radius-md)",background:"#E6F1FB",border:"0.5px solid #B5D4F4",fontSize:13}}>
                        <span aria-hidden="true" style={{color:"#185FA5",fontSize:11,flexShrink:0}}>◆</span>
                        <span style={{flex:1,color:"#185FA5",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title}</span>
                        <span style={{fontSize:11,color:"#185FA5",opacity:0.7,flexShrink:0}}>{fmtDate(m.date)}</span>
                      </div>
                    ))}
                  </div>
              }
            </Field>
          </div>
        );
      })()}
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
export function DocModal({doc,members,audiences,globalTags,prefs,profileIdByName={},onChange,onSave,onDelete,onClose}) {
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
      <Field label="Content owner">
        <select value={doc.content_owner||""} onChange={e=>{const name=e.target.value;onChange({...doc,content_owner:name,content_owner_id:name?(profileIdByName[name.trim().toLowerCase()]||null):null});}}>
          <option value="">—</option>
          {members.map(m=><option key={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Assist">
        <select value={doc.assist||""} onChange={e=>{const name=e.target.value;onChange({...doc,assist:name,assist_id:name?(profileIdByName[name.trim().toLowerCase()]||null):null});}}>
          <option value="">—</option>
          {members.map(m=><option key={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Shareable link"><input type="url" value={doc.shareable_link||""} onChange={e=>onChange({...doc,shareable_link:e.target.value})} placeholder="https://..."/></Field>
      <Field label="Last updated"><input type="date" value={doc.updated} onChange={e=>onChange({...doc,updated:e.target.value})}/></Field>
      <Field label="Next scheduled update"><input type="date" value={doc.next_update||""} onChange={e=>onChange({...doc,next_update:e.target.value})}/></Field>
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
                  {h}<button aria-label={`Remove holiday ${h}`} onClick={()=>setHolidays(hh=>hh.filter(x=>x!==h))} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#A32D2D",padding:0}}>×</button>
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

// ── Import Collateral Modal ───────────────────────────────────────────────────
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

// ── Collateral Detail Card ─────────────────────────────────────────────────────
export function CollateralDetailModal({doc, members, audiences, globalTags, onSave, onDelete, onClose, isReadOnly}) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState({...doc});
  const titleId = useId();
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave   = () => { onSave(val); };
  const handleCancel = () => { setVal({...doc}); setEditing(false); };

  const inp = {fontSize:13,width:"100%",boxSizing:"border-box",padding:"6px 10px",border:"1px solid var(--color-border-secondary)",borderRadius:6,background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontFamily:"inherit"};
  const sel = {...inp,padding:"5px 8px"};

  const LabeledField = ({label, children}) => (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:5}}>{label}</div>
      {children}
    </div>
  );
  const PersonPill = ({name}) => name
    ? <span style={{fontSize:12,fontWeight:500,padding:"3px 10px",borderRadius:10,background:avatarBg(name),color:avatarTx(name)}}>{name}</span>
    : <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>—</span>;
  const LinkVal = ({url}) => url
    ? <a href={url} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"var(--color-text-secondary)",textDecoration:"none"}}>↗ Open</a>
    : <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>—</span>;
  const TextVal = ({v}) => <span style={{fontSize:13,color:v?"var(--color-text-primary)":"var(--color-text-tertiary)"}}>{v||"—"}</span>;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={{background:"var(--color-background-primary)",borderRadius:12,border:"1px solid var(--color-border-secondary)",width:"100%",maxWidth:680,maxHeight:"88vh",overflowY:"auto",boxSizing:"border-box"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"18px 24px 16px",borderBottom:"1px solid var(--color-border-tertiary)"}}>
          <span id={titleId} style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{editing ? val.title : doc.title}</span>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            {!isReadOnly && !editing && <button onClick={()=>setEditing(true)} style={{fontSize:13,padding:"5px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>Edit</button>}
            <button ref={closeRef} aria-label="Close dialog" onClick={onClose} style={{background:"var(--color-background-secondary)",border:"none",borderRadius:6,width:28,height:28,fontSize:16,color:"var(--color-text-secondary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{padding:"20px 24px 24px"}}>
          {editing ? (
            <>
              <LabeledField label="Title"><input value={val.title||""} onChange={e=>setVal(v=>({...v,title:e.target.value}))} style={inp} autoFocus/></LabeledField>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
                <LabeledField label="Owner">
                  <select value={val.owner||""} onChange={e=>setVal(v=>({...v,owner:e.target.value}))} style={sel}>
                    <option value="">—</option>{members.map(m=><option key={m}>{m}</option>)}
                  </select>
                </LabeledField>
                <LabeledField label="Audience">
                  <select value={val.audience||""} onChange={e=>setVal(v=>({...v,audience:e.target.value}))} style={sel}>
                    <option value="">—</option>{audiences.map(a=><option key={a}>{a}</option>)}
                  </select>
                </LabeledField>
                <LabeledField label="Content Owner">
                  <select value={val.content_owner||""} onChange={e=>setVal(v=>({...v,content_owner:e.target.value}))} style={sel}>
                    <option value="">—</option>{members.map(m=><option key={m}>{m}</option>)}
                  </select>
                </LabeledField>
                <LabeledField label="Assist">
                  <select value={val.assist||""} onChange={e=>setVal(v=>({...v,assist:e.target.value}))} style={sel}>
                    <option value="">—</option>{members.map(m=><option key={m}>{m}</option>)}
                  </select>
                </LabeledField>
                <LabeledField label="Editable Link"><input type="url" value={val.url||""} onChange={e=>setVal(v=>({...v,url:e.target.value}))} placeholder="https://..." style={inp}/></LabeledField>
                <LabeledField label="Shareable Link"><input type="url" value={val.shareable_link||""} onChange={e=>setVal(v=>({...v,shareable_link:e.target.value}))} placeholder="https://..." style={inp}/></LabeledField>
                <LabeledField label="Next Update"><input type="date" value={val.next_update||""} onChange={e=>setVal(v=>({...v,next_update:e.target.value}))} style={inp}/></LabeledField>
                <LabeledField label="Last Updated"><input type="date" value={val.updated||""} onChange={e=>setVal(v=>({...v,updated:e.target.value}))} style={inp}/></LabeledField>
              </div>
              <LabeledField label="Description"><textarea value={val.description||""} onChange={e=>setVal(v=>({...v,description:e.target.value}))} rows={3} style={{...inp,resize:"vertical"}}/></LabeledField>
              <LabeledField label="Tags"><TagInput tags={val.tags||[]} suggestions={globalTags||[]} onChange={tags=>setVal(v=>({...v,tags}))}/></LabeledField>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:16,borderTop:"1px solid var(--color-border-tertiary)"}}>
                <div>
                  {!isReadOnly && onDelete && <button onClick={()=>{onDelete(doc.id);onClose();}} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-danger)",cursor:"pointer"}}>Delete</button>}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={handleCancel} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
                  <button onClick={handleSave} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"1px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer",fontWeight:500}}>Save</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 32px"}}>
                <LabeledField label="Department"><PersonPill name={doc.owner}/></LabeledField>
                <LabeledField label="Audience"><TextVal v={doc.audience}/></LabeledField>
                <LabeledField label="Content Owner"><PersonPill name={doc.content_owner}/></LabeledField>
                <LabeledField label="Assist"><PersonPill name={doc.assist}/></LabeledField>
                <LabeledField label="Editable Link"><LinkVal url={doc.url}/></LabeledField>
                <LabeledField label="Shareable Link"><LinkVal url={doc.shareable_link}/></LabeledField>
                <LabeledField label="Next Update"><TextVal v={fmtDateYear(doc.next_update)}/></LabeledField>
                <LabeledField label="Last Updated"><TextVal v={fmtDateYear(doc.updated)}/></LabeledField>
              </div>
              {doc.description && (
                <LabeledField label="Description">
                  <span style={{fontSize:13,color:"var(--color-text-primary)",whiteSpace:"pre-wrap",lineHeight:1.6}}>{doc.description}</span>
                </LabeledField>
              )}
              {(doc.tags||[]).length>0 && (
                <LabeledField label="Tags">
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {doc.tags.map(t=><span key={t} style={{fontSize:12,padding:"3px 10px",borderRadius:10,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)"}}>{t}</span>)}
                  </div>
                </LabeledField>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AddSessionModal ────────────────────────────────────────────────────────────
const COHORT_OPTIONS = ["Cohort 1", "Cohort 2"];

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
            <button aria-label="Remove item" onClick={() => removeItem(i)} style={{ fontSize: 15, lineHeight: 1, border: "none", background: "none", color: "var(--color-text-tertiary)", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>×</button>
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
