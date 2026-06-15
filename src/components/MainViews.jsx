import { useState, useEffect } from "react";
import { TaskCard, ListRow, ListHeader, MilestoneBar, DocCard } from "./TaskViews.jsx";
import { DEFAULT_STATUS_COLORS, STATUSES, MONTHS, DAYS } from "../constants.js";
import { fmtDate, fmtDateYear } from "../utils.js";

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
            {boardGroup==="status"&&k==="To Do"&&[...milestones].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0).map(m => (
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
export function ListView({filteredTasks,displayTasks,displayDocs,milestones,isReadOnly,listGroup,setListGroup,openTask,onAddTask,onAddMilestone,onEditMilestone,updateStatus,getBlockedStatus,statusColors,onDeleteSelected,sessions,onNavigateToClasses}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectable = !isReadOnly;

  const hasSessionGrouping = !!sessions?.length;
  const visibleTasks = filteredTasks;

  const toggleSelect = id => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const visibleIds = visibleTasks.map(t => t.id);
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

  const groupOptions = [
    ["none","None"],["assignee","Owner"],["department","Dept"],["status","Status"],
    ...(hasSessionGrouping ? [["session","Session"]] : []),
  ];

  const Toolbar = () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      {visibleSelected.length > 0 ? (
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{visibleSelected.length} of {visibleIds.length} selected</span>
          {!selectedAll && <button onClick={handleSelectAll} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Select all {visibleIds.length}</button>}
          <button onClick={handleDeleteSelected} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer"}}>
            Delete {visibleSelected.length === 1 ? "task" : `${visibleSelected.length} tasks`}
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Clear</button>
        </div>
      ) : (
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {!isReadOnly && visibleIds.length > 0 && <button onClick={handleSelectAll} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Select all</button>}
          {!isReadOnly && onAddTask && <button onClick={onAddTask} style={{fontSize:13,padding:"5px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",cursor:"pointer",fontWeight:500}}>+ Add task</button>}
          {!isReadOnly && onAddMilestone && <button onClick={onAddMilestone} style={{fontSize:13,padding:"5px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",cursor:"pointer",fontWeight:500}}>+ Add milestone</button>}
        </div>
      )}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>Group by:</span>
        {groupOptions.map(([g,l]) => (
          <button key={g} onClick={()=>setListGroup(g)} style={{fontSize:12,padding:"4px 10px",borderRadius:20,border:listGroup===g?"0.5px solid var(--color-border-primary)":"0.5px solid var(--color-border-tertiary)",background:listGroup===g?"var(--color-background-secondary)":"transparent",color:listGroup===g?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
    </div>
  );

  if (listGroup === "session" && hasSessionGrouping) {
    const sessionGroups = {};
    visibleTasks.forEach(t => {
      const key = t.sessionId || "__none__";
      if (!sessionGroups[key]) sessionGroups[key] = [];
      sessionGroups[key].push(t);
    });
    const sortedKeys = Object.keys(sessionGroups).sort((a, b) => {
      const sa = sessions.find(s => s.id === a);
      const sb = sessions.find(s => s.id === b);
      if (!sa && !sb) return 0;
      if (!sa) return 1;
      if (!sb) return -1;
      return sa.date < sb.date ? -1 : sa.date > sb.date ? 1 : 0;
    });
    return (
      <div>
        <Toolbar/>
        {milestones.length>0&&<MilestoneBar milestones={milestones} tasks={displayTasks} onEdit={onEditMilestone}/>}
        {sortedKeys.map(key => {
          const sess = sessions.find(s => s.id === key);
          const prof = sess?.professor || sess?.name || "No session";
          const cohortPart = sess?.cohort ? ` — ${sess.cohort}` : "";
          const datePart   = sess?.date   ? ` · ${fmtDate(sess.date)}` : "";
          const label      = `${prof}${cohortPart}${datePart}`;
          return (
            <div key={key}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",letterSpacing:"0.04em"}}>
                  {label.toUpperCase()} · {sessionGroups[key].length}
                </div>
                {sess && onNavigateToClasses && (
                  <button onClick={() => onNavigateToClasses(sess.id)} style={{fontSize:12,padding:"3px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    View in Classes <span style={{fontSize:11}}>→</span>
                  </button>
                )}
              </div>
              {renderList(sessionGroups[key])}
            </div>
          );
        })}
      </div>
    );
  }

  if(listGroup==="none") {
    return (
      <div>
        <Toolbar/>
        {milestones.length>0&&<MilestoneBar milestones={milestones} tasks={displayTasks} onEdit={onEditMilestone}/>}
        {renderList(visibleTasks)}
      </div>
    );
  }
  const listGroups = groupBy(visibleTasks,listGroup==="assignee"?"assignee":listGroup==="status"?"status":"department");
  return (
    <div>
      <Toolbar/>
      {milestones.length>0&&<MilestoneBar milestones={milestones} tasks={displayTasks} onEdit={onEditMilestone}/>}
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
  const typeChip = t => t.type==="class"
    ? {bg:"#FAEEDA",color:"#854F0B"}
    : {bg:"#E6F1FB",color:"#185FA5"};
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
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:"auto"}}>
            <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#185FA5"}}><span style={{width:10,height:10,borderRadius:2,background:"#E6F1FB",border:"1px solid #B5D4F4",display:"inline-block"}}/>Program</span>
            <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#854F0B"}}><span style={{width:10,height:10,borderRadius:2,background:"#FAEEDA",border:"1px solid #F0C97A",display:"inline-block"}}/>Class</span>
          </div>
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
                      const tc = typeChip(t);
                      return <div key={t.id} style={{fontSize:10,padding:"1px 5px",borderRadius:3,background:tc.bg,color:tc.color,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>;
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
            const tc = typeChip(t);
            return (
              <div key={t.id} onClick={()=>openTask(t)} style={{padding:"10px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",borderLeft:`3px solid ${tc.color}`,background:"var(--color-background-primary)",marginBottom:8,cursor:"pointer"}}>
                <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>{t.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>{t.status}</span>
                  <span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:tc.bg,color:tc.color}}>{t.type==="class"?"Class":"Program"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Classes View ──────────────────────────────────────────────────────────────
const COHORT_OPTIONS = ["Cohort 1", "Cohort 2"];
const DEFAULT_TEMPLATE = [
  { title: "Prepare session materials", offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Send participant reminder", offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Set up room/platform",      offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Facilitate session",        offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Post recording & notes",    offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Follow-up survey",          offset: 0, assignee: "", assist: "", notes: "" },
];

function offsetLabel(n) {
  if (n === 0)  return "Day of class";
  if (n < 0)    return `${Math.abs(n)} day${Math.abs(n) !== 1 ? "s" : ""} before`;
  return `${n} day${n !== 1 ? "s" : ""} after`;
}

export function ClassesView({ displayClassTasks, sessions, members, isReadOnly, openTask, updateStatus, getBlockedStatus, statusColors, initialSessionId, onSessionIdConsumed, onNavigateToList, onSaveSession, onUpdateSession, onDeleteSession, classTaskTemplate, onSaveTemplate, onApplyTemplate, onAddSelectedTasks, myUser, selectedProfessor, onProfessorChange, selectedSessionId, onSessionIdChange }) {
  const setSelectedProfessor = onProfessorChange;
  const setSelectedSessionId = onSessionIdChange;
  const [showAddForm,       setShowAddForm]       = useState(false);
  const [isDuplicate,       setIsDuplicate]       = useState(false);
  const [newSess,           setNewSess]           = useState({ professor: "", cohort: "Cohort 1", date: "", addTasks: false });
  const [saving,            setSaving]            = useState(false);
  const [showTemplate,      setShowTemplate]      = useState(false);
  const [applying,          setApplying]          = useState(false);
  const [editingSession,    setEditingSession]    = useState(false);
  const [editSess,          setEditSess]          = useState(null);
  const [savingEdit,        setSavingEdit]        = useState(false);
  const [showTaskPicker,    setShowTaskPicker]    = useState(false);
  const [pickerSelected,    setPickerSelected]    = useState(new Set());
  const [addingTasks,       setAddingTasks]       = useState(false);

  // Consume an inbound sessionId from List → Classes navigation
  useEffect(() => {
    if (!initialSessionId) return;
    const sess = sessions.find(s => s.id === initialSessionId);
    if (sess) {
      setSelectedProfessor(sess.professor || sess.name);
      setSelectedSessionId(initialSessionId);
    }
    onSessionIdConsumed?.();
  }, [initialSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const professors = [...new Set(sessions.map(s => s.professor || s.name))].filter(Boolean).sort();

  const professorSessions = sessions
    .filter(s => (s.professor || s.name) === selectedProfessor)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const classDate = selectedSession?.date;

  const handleProfessorChange = (prof) => {
    setSelectedProfessor(prof);
    setSelectedSessionId("");
  };

  const sessionTasks = selectedSessionId
    ? [...displayClassTasks.filter(t => t.sessionId === selectedSessionId)]
        .sort((a, b) => {
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
        })
    : [];

  const beforeClass = sessionTasks.filter(t => !t.due || !classDate || t.due <= classDate);
  const afterClass  = sessionTasks.filter(t => t.due && classDate && t.due > classDate);
  const doneCount   = sessionTasks.filter(t => t.status === "Done").length;
  const pct         = sessionTasks.length ? Math.round((doneCount / sessionTasks.length) * 100) : 0;

  // Template — fall back to built-in default if not yet customised
  const template = (classTaskTemplate && classTaskTemplate.length > 0) ? classTaskTemplate : DEFAULT_TEMPLATE;

  const updateTemplateItem = (i, field, val) => {
    const next = template.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
    onSaveTemplate(next);
  };
  const removeTemplateItem = (i) => onSaveTemplate(template.filter((_, idx) => idx !== i));
  const addTemplateItem    = ()  => onSaveTemplate([...template, { title: "", offset: 0 }]);

  const handleAddSession = async () => {
    if (!newSess.professor.trim() || !newSess.date) return;
    setSaving(true);
    try {
      const saved = await onSaveSession({
        ...newSess,
        ...(isDuplicate && { duplicateFromId: selectedSessionId }),
      });
      setShowAddForm(false);
      setNewSess({ professor: "", cohort: "Cohort 1", date: "", addTasks: false });
      if (saved) {
        setSelectedProfessor(saved.professor || saved.name || newSess.professor);
        setSelectedSessionId(saved.id);
      }
      setIsDuplicate(false);
    } catch {
      // Error already toasted by App.jsx; keep form open
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedSessionId) return;
    setApplying(true);
    try { await onApplyTemplate(selectedSessionId); }
    finally { setApplying(false); }
  };

  const handleAddSelected = async () => {
    if (!pickerSelected.size || !selectedSessionId) return;
    setAddingTasks(true);
    try {
      const items = template.filter((_, i) => pickerSelected.has(i));
      await onAddSelectedTasks(selectedSessionId, items);
      setShowTaskPicker(false);
      setPickerSelected(new Set());
    } catch {
      // error already toasted
    } finally {
      setAddingTasks(false);
    }
  };

  const openBlankTask = () => openTask({
    title: "", assignee: myUser || "", assist: "", due: classDate || "", status: "To Do",
    notes: "", deps: [], collateralDeps: [], attachedDocs: [], tags: ["class"],
    offset: 0, fallOffset: 0, department: "", type: "class",
    sessionId: selectedSessionId, sessionName: selectedSession?.professor || selectedSession?.name || "",
  });

  const startEditSession = () => {
    if (!selectedSession) return;
    setEditSess({ professor: selectedSession.professor || selectedSession.name, cohort: selectedSession.cohort || "Cohort 1", date: selectedSession.date });
    setEditingSession(true);
  };

  const handleSaveSessionEdit = async () => {
    if (!editSess?.professor?.trim() || !editSess?.date) return;
    setSavingEdit(true);
    try {
      await onUpdateSession({ ...selectedSession, ...editSess, name: editSess.professor });
      if (editSess.professor !== selectedProfessor) setSelectedProfessor(editSess.professor);
      setEditingSession(false);
      setEditSess(null);
    } catch {
      // Error already toasted by App.jsx
    } finally {
      setSavingEdit(false);
    }
  };

  const renderSection = (title, tasks) => {
    if (!tasks.length) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", letterSpacing: "0.04em", marginBottom: 8 }}>
          {title.toUpperCase()} · {tasks.length}
        </div>
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
          <ListHeader />
          {tasks.map((t, i, arr) => (
            <ListRow key={t.id} task={t} tasks={displayClassTasks} docs={[]} last={i === arr.length - 1} readOnly={isReadOnly} onEdit={() => openTask(t)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} />
          ))}
        </div>
      </div>
    );
  };

  const selectStyle = { fontSize: 13, padding: "7px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", minWidth: 200 };
  const labelStyle  = { fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", letterSpacing: "0.06em", marginBottom: 6 };
  const inputStyle  = { fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
  const btnSecondary = { fontSize: 13, padding: "6px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" };

  return (
    <div>
      {/* Toolbar row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div style={labelStyle}>PROFESSOR</div>
          <select value={selectedProfessor} onChange={e => handleProfessorChange(e.target.value)} style={selectStyle}>
            <option value="">Select professor…</option>
            {professors.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <div style={labelStyle}>CLASS DATE</div>
          <select
            value={selectedSessionId}
            onChange={e => setSelectedSessionId(e.target.value)}
            disabled={!selectedProfessor}
            style={{ ...selectStyle, minWidth: 220, opacity: selectedProfessor ? 1 : 0.4, cursor: selectedProfessor ? "pointer" : "not-allowed" }}
          >
            <option value="">{selectedProfessor ? "Select date…" : "Select professor first…"}</option>
            {professorSessions.map(s => (
              <option key={s.id} value={s.id}>
                {fmtDateYear(s.date)}{s.cohort ? ` — ${s.cohort}` : ""}
              </option>
            ))}
          </select>
        </div>
        {!isReadOnly && (
          <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
            {!showAddForm && (
              <button onClick={() => { setIsDuplicate(false); setNewSess({ professor: "", cohort: "Cohort 1", date: "", addTasks: false }); setShowAddForm(true); setShowTemplate(false); }} style={btnSecondary}>
                + Add session
              </button>
            )}
            <button onClick={() => { setShowTemplate(t => !t); setShowAddForm(false); }} style={{ ...btnSecondary, background: showTemplate ? "var(--color-background-secondary)" : "transparent", fontWeight: showTemplate ? 500 : 400 }}>
              Standard tasks {showTemplate ? "▴" : "▾"}
            </button>
          </div>
        )}
      </div>

      {/* Add session inline form */}
      {showAddForm && !isReadOnly && (
        <div style={{ marginBottom: 20, padding: "16px 20px", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 14 }}>{isDuplicate ? "Duplicate session" : "New class session"}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ flex: "1 1 180px" }}>
              <div style={labelStyle}>PROFESSOR</div>
              <input placeholder="Professor name" value={newSess.professor} onChange={e => setNewSess(p => ({ ...p, professor: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <div style={labelStyle}>COHORT</div>
              <select value={newSess.cohort} onChange={e => setNewSess(p => ({ ...p, cohort: e.target.value }))} style={{ ...inputStyle, width: "auto", minWidth: "100%" }}>
                {COHORT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <div style={labelStyle}>CLASS DATE</div>
              <input type="date" value={newSess.date} onChange={e => setNewSess(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          {isDuplicate ? (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
              Tasks from the original session will be copied and shifted to the new date.
            </div>
          ) : (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={newSess.addTasks} onChange={e => setNewSess(p => ({ ...p, addTasks: e.target.checked }))} style={{ cursor: "pointer" }} />
              Add {template.length} standard task{template.length !== 1 ? "s" : ""} to this session
            </label>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddSession} disabled={saving || !newSess.professor.trim() || !newSess.date} style={{ fontSize: 13, padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: (saving || !newSess.professor.trim() || !newSess.date) ? "default" : "pointer", opacity: (!newSess.professor.trim() || !newSess.date) ? 0.5 : 1 }}>
              {saving ? "Saving…" : "Add session"}
            </button>
            <button onClick={() => { setShowAddForm(false); setIsDuplicate(false); setNewSess({ professor: "", cohort: "Cohort 1", date: "", addTasks: false }); }} style={btnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Standard tasks template panel */}
      {showTemplate && !isReadOnly && (
        <div style={{ marginBottom: 20, padding: "16px 20px", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>Standard tasks</div>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Optionally applied when adding a new session. Use negative offsets for tasks due before the class date.</div>
          </div>

          {template.map((item, i) => (
            <div key={i} style={{ marginBottom: 8, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
              {/* Row 1: task name, offset, delete */}
              <div style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "center" }}>
                <input
                  value={item.title}
                  onChange={e => updateTemplateItem(i, "title", e.target.value)}
                  placeholder="Task name"
                  style={{ ...inputStyle, padding: "5px 8px", flex: 1 }}
                />
                <input
                  type="number"
                  value={item.offset}
                  onChange={e => updateTemplateItem(i, "offset", parseInt(e.target.value) || 0)}
                  style={{ ...inputStyle, padding: "5px 8px", width: 56, flexShrink: 0, textAlign: "right" }}
                />
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", minWidth: 90 }}>{offsetLabel(item.offset)}</span>
                <button onClick={() => removeTemplateItem(i)} title="Remove" style={{ fontSize: 15, lineHeight: 1, border: "none", background: "none", color: "var(--color-text-tertiary)", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>×</button>
              </div>
              {/* Row 2: owner, assist, notes */}
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={item.assignee || ""}
                  onChange={e => updateTemplateItem(i, "assignee", e.target.value)}
                  style={{ ...inputStyle, padding: "4px 8px", flex: "0 0 160px" }}
                >
                  <option value="">Owner…</option>
                  {(members || []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={item.assist || ""}
                  onChange={e => updateTemplateItem(i, "assist", e.target.value)}
                  style={{ ...inputStyle, padding: "4px 8px", flex: "0 0 160px" }}
                >
                  <option value="">Assist…</option>
                  {(members || []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  value={item.notes || ""}
                  onChange={e => updateTemplateItem(i, "notes", e.target.value)}
                  placeholder="Notes"
                  style={{ ...inputStyle, padding: "4px 8px", flex: 1 }}
                />
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={addTemplateItem} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>
              + Add task
            </button>
            {selectedSession && (
              <button onClick={handleApplyTemplate} disabled={applying} style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: applying ? "default" : "pointer" }}>
                {applying ? "Applying…" : `Apply to ${selectedSession.professor || selectedSession.name}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Session summary card */}
      {selectedSession && (
        <div style={{ marginBottom: 20, padding: "16px 20px", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
          {editingSession && editSess ? (
            /* ── Edit mode ── */
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 14 }}>Edit session</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div style={{ flex: "1 1 180px" }}>
                  <div style={labelStyle}>PROFESSOR</div>
                  <input placeholder="Professor name" value={editSess.professor} onChange={e => setEditSess(p => ({ ...p, professor: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <div style={labelStyle}>COHORT</div>
                  <select value={editSess.cohort} onChange={e => setEditSess(p => ({ ...p, cohort: e.target.value }))} style={{ ...inputStyle, width: "auto", minWidth: "100%" }}>
                    {COHORT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 160px" }}>
                  <div style={labelStyle}>CLASS DATE</div>
                  <input type="date" value={editSess.date} onChange={e => setEditSess(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSaveSessionEdit} disabled={savingEdit || !editSess.professor.trim() || !editSess.date} style={{ fontSize: 13, padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: (savingEdit || !editSess.professor.trim() || !editSess.date) ? "default" : "pointer", opacity: (!editSess.professor.trim() || !editSess.date) ? 0.5 : 1 }}>
                  {savingEdit ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setEditingSession(false); setEditSess(null); }} style={btnSecondary}>Cancel</button>
              </div>
            </>
          ) : (
            /* ── View mode ── */
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {selectedSession.professor || selectedSession.name}
                    </span>
                    {!isReadOnly && (
                      <>
                        <button onClick={startEditSession} style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer" }}>
                          Edit
                        </button>
                        <button onClick={() => { setIsDuplicate(true); setNewSess({ professor: selectedSession.professor || selectedSession.name || "", cohort: selectedSession.cohort || "Cohort 1", date: "", addTasks: false }); setShowAddForm(true); setShowTemplate(false); setEditingSession(false); }} style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer" }}>
                          Duplicate
                        </button>
                        <button onClick={() => onDeleteSession(selectedSession.id)} style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #F7C1C1", background: "transparent", color: "#A32D2D", cursor: "pointer" }}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {selectedSession.cohort && (
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        <span style={{ color: "var(--color-text-tertiary)" }}>Cohort </span>{selectedSession.cohort}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Class date </span>{fmtDateYear(classDate)}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  {onNavigateToList && (
                    <button onClick={onNavigateToList} style={{ fontSize: 12, padding: "4px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" }}>
                      ← All class tasks
                    </button>
                  )}
                  {sessionTasks.length > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1 }}>
                        {doneCount}<span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>/{sessionTasks.length}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>tasks complete</div>
                    </div>
                  )}
                </div>
              </div>
              {sessionTasks.length > 0 && (
                <div style={{ marginTop: 12, height: 5, borderRadius: 3, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "#0F6E56", width: `${pct}%`, transition: "width 0.3s" }} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Empty states */}
      {!selectedSession && !showAddForm && !showTemplate && (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--color-text-tertiary)", fontSize: 13 }}>
          {sessions.length === 0 ? "No sessions yet — add one above to get started." : "Select a professor and class date to view tasks."}
        </div>
      )}

      {/* Action row + task picker */}
      {selectedSession && !isReadOnly && !editingSession && (
        <div style={{ marginBottom: 16 }}>
          {!showTaskPicker && (
            <div style={{ display: "flex", gap: 8, marginBottom: sessionTasks.length > 0 ? 16 : 0 }}>
              <button onClick={() => { setShowTaskPicker(true); setPickerSelected(new Set(template.map((_, i) => i))); }} style={{ fontSize: 13, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                + Add from standard tasks
              </button>
              <button onClick={openBlankTask} style={{ fontSize: 13, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                + Add task
              </button>
            </div>
          )}

          {showTaskPicker && (
            <div style={{ marginBottom: 16, padding: "16px 20px", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Select standard tasks to add</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPickerSelected(pickerSelected.size === template.length ? new Set() : new Set(template.map((_, i) => i)))} style={{ fontSize: 12, padding: "3px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                    {pickerSelected.size === template.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {template.map((item, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", padding: "6px 10px", borderRadius: "var(--border-radius-md)", background: pickerSelected.has(i) ? "var(--color-background-secondary)" : "transparent" }}>
                    <input type="checkbox" checked={pickerSelected.has(i)} onChange={e => { const next = new Set(pickerSelected); e.target.checked ? next.add(i) : next.delete(i); setPickerSelected(next); }} style={{ cursor: "pointer", flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.title || <em style={{ color: "var(--color-text-tertiary)" }}>Untitled task</em>}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>{offsetLabel(item.offset)}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAddSelected} disabled={addingTasks || !pickerSelected.size} style={{ fontSize: 13, padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: (addingTasks || !pickerSelected.size) ? "default" : "pointer", opacity: !pickerSelected.size ? 0.5 : 1 }}>
                  {addingTasks ? "Adding…" : `Add selected (${pickerSelected.size})`}
                </button>
                <button onClick={() => { setShowTaskPicker(false); setPickerSelected(new Set()); }} style={{ fontSize: 13, padding: "6px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedSession && sessionTasks.length === 0 && !showTaskPicker && (
        <div style={{ textAlign: "center", padding: "32px 24px", color: "var(--color-text-tertiary)", fontSize: 13 }}>
          No tasks for this session yet.
        </div>
      )}

      {/* Task sections */}
      {selectedSession && sessionTasks.length > 0 && (
        <>
          {renderSection("Before Class", beforeClass)}
          {renderSection("After Class", afterClass)}
        </>
      )}
    </div>
  );
}

// ── Search View ───────────────────────────────────────────────────────────────
export function SearchView({displayTasks,displayDocs,isReadOnly,openTask,openDoc,updateStatus,getBlockedStatus,statusColors}) {
  const [q,setQ] = useState("");
  const [committedQ,setCommittedQ] = useState("");
  const handleChange = val => { setQ(val); if (val.trim()) setCommittedQ(val); };
  const sq = committedQ.trim().toLowerCase();
  const mt = t => !sq?false:(t.title.toLowerCase().includes(sq)||t.assignee.toLowerCase().includes(sq)||(t.notes||"").toLowerCase().includes(sq)||(t.tags||[]).some(g=>g.toLowerCase().includes(sq))||t.status.toLowerCase().includes(sq)||(t.department||"").toLowerCase().includes(sq));
  const md = d => !sq?false:(d.title.toLowerCase().includes(sq)||d.owner.toLowerCase().includes(sq)||d.audience.toLowerCase().includes(sq)||d.description.toLowerCase().includes(sq)||(d.tags||[]).some(g=>g.toLowerCase().includes(sq)));
  const tr = displayTasks.filter(mt);
  const dr = displayDocs.filter(md);
  return (
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <div style={{position:"relative",marginBottom:24}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"var(--color-text-tertiary)",pointerEvents:"none"}}>⌕</span>
        <input autoFocus value={q} onChange={e=>handleChange(e.target.value)} placeholder="Search tasks, collateral, owners, tags..." style={{width:"100%",boxSizing:"border-box",fontSize:14,padding:"11px 16px 11px 40px",borderRadius:"var(--border-radius-lg)",border:"1px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
        {q&&<button onClick={()=>{setQ("");setCommittedQ("");}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:16,color:"var(--color-text-tertiary)",cursor:"pointer"}}>×</button>}
      </div>
      {!committedQ&&(
        <div>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>Try searching by:</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {["Engineering","design","In Progress","brand","Research","class"].map(t => (
              <button key={t} onClick={()=>{setQ(t);setCommittedQ(t);}} style={{fontSize:12,padding:"5px 12px",borderRadius:20,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",cursor:"pointer"}}>{t}</button>
            ))}
          </div>
        </div>
      )}
      {committedQ&&!tr.length&&!dr.length&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>No results for "{committedQ}".</p>}
      {committedQ&&tr.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",letterSpacing:"0.04em",marginBottom:10}}>TASKS · {tr.length}</div>
          <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden"}}>
            <ListHeader/>
            {tr.map((t,i,arr) => <ListRow key={t.id} task={t} tasks={displayTasks} docs={displayDocs} last={i===arr.length-1} readOnly={isReadOnly} onEdit={()=>openTask(t)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors}/>)}
          </div>
        </div>
      )}
      {committedQ&&dr.length>0&&(
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
