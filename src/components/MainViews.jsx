import { useState } from "react";
import { TaskCard, ListRow, ListHeader, MilestoneBar, DocCard } from "./TaskViews.jsx";
import { DEFAULT_STATUS_COLORS, STATUSES, MONTHS, DAYS } from "../constants.js";
import { fmtDate } from "../utils.js";

// ── Board View ────────────────────────────────────────────────────────────────
export function BoardView({filteredTasks,displayTasks,displayDocs,milestones,isReadOnly,boardGroup,setBoardGroup,openTask,updateStatus,getBlockedStatus,statusColors}) {
  const [dragId,setDragId] = useState(null);
  const groupBy = (ts,key) => { const g={}; ts.forEach(t=>{const k=t[key]||"Unassigned";if(!g[k])g[k]=[];g[k].push(t);}); return g; };
  const boardGroups = boardGroup==="status"
    ? Object.fromEntries(STATUSES.map(s=>[s,filteredTasks.filter(t=>t.status===s)]))
    : groupBy(filteredTasks,boardGroup==="assignee"?"assignee":"department");
  const keys = boardGroup==="status" ? STATUSES : Object.keys(boardGroups).sort();
  const onDragStart = (e,id) => { setDragId(id); e.dataTransfer.effectAllowed="move"; };
  const onDrop = (e,col) => { e.preventDefault(); if(dragId&&boardGroup==="status")updateStatus(dragId,col); setDragId(null); };
  const onDragOver = e => { e.preventDefault(); e.dataTransfer.dropEffect="move"; };
  return (
    <div>
      <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:12,justifyContent:"flex-end"}}>
        <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>Group by:</span>
        {["status","assignee","department"].map(g => (
          <button key={g} onClick={()=>setBoardGroup(g)} style={{fontSize:12,padding:"4px 10px",borderRadius:20,border:boardGroup===g?"0.5px solid var(--color-border-primary)":"0.5px solid var(--color-border-tertiary)",background:boardGroup===g?"var(--color-background-secondary)":"transparent",color:boardGroup===g?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer",textTransform:"capitalize"}}>{g}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:8,borderLeft:"0.5px solid var(--color-border-tertiary)"}}>
        {keys.map(k => (
          <div key={k} onDrop={e=>onDrop(e,k)} onDragOver={onDragOver} style={{minWidth:260,flex:"0 0 260px",borderRight:"0.5px solid var(--color-border-tertiary)",padding:"0 16px 16px",transition:"background 0.15s"}}>
            <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:"0 0 12px",letterSpacing:"0.04em",paddingTop:4}}>
              {k.toUpperCase()} · {(boardGroups[k]||[]).length}
            </div>
            {boardGroup==="status"&&k==="To Do"&&milestones.map(m => (
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:"var(--border-radius-md)",border:"1px solid #B5D4F4",background:"#E6F1FB",marginBottom:8}}>
                <span style={{fontSize:13,color:"#185FA5"}}>◆</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:"#185FA5"}}>{m.title}</div>
                  <div style={{fontSize:11,color:"#185FA5",opacity:0.7}}>{fmtDate(m.date)}</div>
                </div>
              </div>
            ))}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {(boardGroups[k]||[]).map(t => (
                <div key={t.id} draggable={!isReadOnly&&boardGroup==="status"} onDragStart={e=>onDragStart(e,t.id)} onDragEnd={()=>setDragId(null)} style={{opacity:dragId===t.id?0.4:1,cursor:"grab"}}>
                  <TaskCard task={t} tasks={displayTasks} docs={displayDocs} readOnly={isReadOnly} onEdit={()=>openTask(t)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} showGroup={boardGroup!=="status"} statusColors={statusColors}/>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
export function ListView({filteredTasks,displayTasks,displayDocs,milestones,isReadOnly,listGroup,setListGroup,openTask,updateStatus,getBlockedStatus,statusColors,onDeleteSelected}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectable = !isReadOnly;

  const toggleSelect = id => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const visibleIds = filteredTasks.map(t => t.id);
  const visibleSelected = visibleIds.filter(id => selectedIds.has(id));
  const selectedAll = visibleIds.length > 0 && visibleSelected.length === visibleIds.length;
  const someSelected = visibleSelected.length > 0 && !selectedAll;

  const handleSelectAll = () => {
    if (selectedAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const handleDeleteSelected = async () => {
    if (!visibleSelected.length) return;
    await onDeleteSelected(visibleSelected);
    setSelectedIds(new Set());
  };

  const groupBy = (ts,key) => { const g={}; ts.forEach(t=>{const k=t[key]||"Unassigned";if(!g[k])g[k]=[];g[k].push(t);}); return g; };

  const renderList = ts => (
    <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden",marginBottom:16}}>
      <ListHeader selectable={selectable} selectedAll={selectedAll} someSelected={someSelected} onSelectAll={handleSelectAll}/>
      {ts.length===0&&<div style={{padding:"12px 16px",fontSize:13,color:"var(--color-text-tertiary)"}}>No tasks.</div>}
      {ts.map((t,i,arr) => (
        <ListRow key={t.id} task={t} tasks={displayTasks} docs={displayDocs} last={i===arr.length-1} readOnly={isReadOnly} onEdit={()=>openTask(t)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} selectable={selectable} selected={selectedIds.has(t.id)} onSelect={toggleSelect}/>
      ))}
    </div>
  );

  const Toolbar = () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      {visibleSelected.length > 0 ? (
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{visibleSelected.length} selected</span>
          <button onClick={handleDeleteSelected} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer"}}>
            Delete {visibleSelected.length === 1 ? "task" : `${visibleSelected.length} tasks`}
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Clear</button>
        </div>
      ) : <div/>}
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>Group by:</span>
        {[["none","None"],["assignee","Owner"],["department","Dept"],["status","Status"]].map(([g,l]) => (
          <button key={g} onClick={()=>setListGroup(g)} style={{fontSize:12,padding:"4px 10px",borderRadius:20,border:listGroup===g?"0.5px solid var(--color-border-primary)":"0.5px solid var(--color-border-tertiary)",background:listGroup===g?"var(--color-background-secondary)":"transparent",color:listGroup===g?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
    </div>
  );

  if(listGroup==="none") {
    return (
      <div>
        <Toolbar/>
        {milestones.length>0&&<MilestoneBar milestones={milestones}/>}
        {renderList(filteredTasks)}
      </div>
    );
  }
  const listGroups = groupBy(filteredTasks,listGroup==="assignee"?"assignee":listGroup==="status"?"status":"department");
  return (
    <div>
      <Toolbar/>
      {milestones.length>0&&<MilestoneBar milestones={milestones}/>}
      {Object.keys(listGroups).sort().map(k => (
        <div key={k}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",letterSpacing:"0.04em",marginBottom:8}}>{k.toUpperCase()} · {listGroups[k].length}</div>
          {renderList(listGroups[k])}
        </div>
      ))}
    </div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────
export function CalendarView({tasks,milestones,openTask,statusColors}) {
  const today = new Date();
  const [month,setMonth] = useState(today.getMonth());
  const [year,setYear] = useState(today.getFullYear());
  const [selected,setSelected] = useState(null);
  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);
  const dateStr = d => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const tasksOnDay = d => tasks.filter(t=>t.due===dateStr(d));
  const msOnDay = d => milestones.filter(m=>m.date===dateStr(d));
  const selectedTasks = selected ? tasksOnDay(selected) : [];
  const selectedMs = selected ? msOnDay(selected) : [];
  return (
    <div style={{display:"flex",gap:16}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
          <button onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}} style={{fontSize:16,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-primary)",padding:"4px 8px"}}>‹</button>
          <span style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)",minWidth:160,textAlign:"center"}}>{MONTHS[month]} {year}</span>
          <button onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}} style={{fontSize:16,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-primary)",padding:"4px 8px"}}>›</button>
          <button onClick={()=>{setMonth(today.getMonth());setYear(today.getFullYear());}} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",cursor:"pointer",marginLeft:4}}>Today</button>
        </div>
        <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid var(--color-border-secondary)"}}>
            {DAYS.map(d => <div key={d} style={{padding:"8px 4px",textAlign:"center",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",letterSpacing:"0.04em",borderRight:"0.5px solid var(--color-border-tertiary)"}}>{d}</div>)}
          </div>
          {Array.from({length:cells.length/7}).map((_,wi) => (
            <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:wi===cells.length/7-1?"none":"0.5px solid var(--color-border-tertiary)"}}>
              {cells.slice(wi*7,wi*7+7).map((d,di) => {
                const isToday = d&&d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
                const dayTasks = d ? tasksOnDay(d) : [];
                const dayMs = d ? msOnDay(d) : [];
                const isSelected = selected===d;
                return (
                  <div key={di} onClick={()=>d&&setSelected(isSelected?null:d)} style={{height:96,overflow:"hidden",padding:"6px 6px 4px",borderRight:di===6?"none":"0.5px solid var(--color-border-tertiary)",background:isSelected?"var(--color-background-secondary)":d?"var(--color-background-primary)":"var(--color-background-tertiary)",cursor:d?"pointer":"default"}}>
                    {d&&(
                      <div style={{width:22,height:22,borderRadius:"50%",background:isToday?"#185FA5":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:isToday?500:400,color:isToday?"#fff":"var(--color-text-primary)"}}>{d}</span>
                      </div>
                    )}
                    {dayMs.map(m => <div key={m.id} style={{fontSize:10,padding:"1px 5px",borderRadius:3,background:"#E6F1FB",color:"#185FA5",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>◆ {m.title}</div>)}
                    {dayTasks.slice(0,3).map(t => {
                      const sc = statusColors[t.status]||DEFAULT_STATUS_COLORS[t.status];
                      return <div key={t.id} style={{fontSize:10,padding:"1px 5px",borderRadius:3,background:sc.bg,color:sc.color,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>;
                    })}
                    {dayTasks.length>3&&<div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>+{dayTasks.length-3} more</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {selected&&(
        <div style={{width:240,flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>{MONTHS[month]} {selected}</div>
          {selectedMs.map(m => (
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:"1px solid #B5D4F4",background:"#E6F1FB",marginBottom:8}}>
              <span style={{color:"#185FA5"}}>◆</span>
              <span style={{fontSize:13,fontWeight:500,color:"#185FA5"}}>{m.title}</span>
            </div>
          ))}
          {selectedTasks.length===0&&selectedMs.length===0&&<div style={{fontSize:13,color:"var(--color-text-tertiary)"}}>No items this day.</div>}
          {selectedTasks.map(t => {
            const sc = statusColors[t.status]||DEFAULT_STATUS_COLORS[t.status];
            return (
              <div key={t.id} onClick={()=>openTask(t)} style={{padding:"10px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",marginBottom:8,cursor:"pointer"}}>
                <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>{t.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>{t.status}</span>
                  {t.type==="class"&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:"#FAEEDA",color:"#854F0B"}}>class</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Search View ───────────────────────────────────────────────────────────────
export function SearchView({displayTasks,displayDocs,isReadOnly,openTask,openDoc,updateStatus,getBlockedStatus,statusColors}) {
  const [q,setQ] = useState("");
  const sq = q.trim().toLowerCase();
  const mt = t => !sq?false:(t.title.toLowerCase().includes(sq)||t.assignee.toLowerCase().includes(sq)||(t.notes||"").toLowerCase().includes(sq)||(t.tags||[]).some(g=>g.toLowerCase().includes(sq))||t.status.toLowerCase().includes(sq)||(t.department||"").toLowerCase().includes(sq));
  const md = d => !sq?false:(d.title.toLowerCase().includes(sq)||d.owner.toLowerCase().includes(sq)||d.audience.toLowerCase().includes(sq)||d.description.toLowerCase().includes(sq)||(d.tags||[]).some(g=>g.toLowerCase().includes(sq)));
  const tr = displayTasks.filter(mt);
  const dr = displayDocs.filter(md);
  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{position:"relative",marginBottom:24}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"var(--color-text-tertiary)",pointerEvents:"none"}}>⌕</span>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tasks, collateral, owners, tags..." style={{width:"100%",boxSizing:"border-box",fontSize:14,padding:"11px 16px 11px 40px",borderRadius:"var(--border-radius-lg)",border:"1px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
        {q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:16,color:"var(--color-text-tertiary)",cursor:"pointer"}}>×</button>}
      </div>
      {!q&&(
        <div>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>Try searching by:</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {["Engineering","design","In Progress","brand","Research","class"].map(t => (
              <button key={t} onClick={()=>setQ(t)} style={{fontSize:12,padding:"5px 12px",borderRadius:20,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",cursor:"pointer"}}>{t}</button>
            ))}
          </div>
        </div>
      )}
      {q&&!tr.length&&!dr.length&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>No results for "{q}".</p>}
      {q&&tr.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",letterSpacing:"0.04em",marginBottom:10}}>TASKS · {tr.length}</div>
          <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden"}}>
            <ListHeader/>
            {tr.map((t,i,arr) => <ListRow key={t.id} task={t} tasks={displayTasks} docs={displayDocs} last={i===arr.length-1} readOnly={isReadOnly} onEdit={()=>openTask(t)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors}/>)}
          </div>
        </div>
      )}
      {q&&dr.length>0&&(
        <div>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",letterSpacing:"0.04em",marginBottom:10}}>COLLATERAL · {dr.length}</div>
          <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden"}}>
            {dr.map((d,i,arr) => <DocCard key={d.id} doc={d} readOnly={isReadOnly} onEdit={()=>openDoc(d)} last={i===arr.length-1}/>)}
          </div>
        </div>
      )}
    </div>
  );
}
