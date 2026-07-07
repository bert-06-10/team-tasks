import { useState } from "react";
import { TaskCard, ListRow, ListHeader } from "../TaskViews.jsx";
import { fmtDate } from "../../utils.js";
import { STATUSES, DEFAULT_STATUS_COLORS } from "../../constants.js";

export function ListView({filteredTasks,displayTasks,displayDocs,milestones,isReadOnly,listGroup,setListGroup,openTask,onAddTask,onAddMilestone,onEditMilestone,updateStatus,getBlockedStatus,statusColors,onDeleteSelected,sessions,onNavigateToClasses,isMobile}) {
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

  const bulkSetStatus = status => {
    visibleSelected.forEach(id => updateStatus(id, status));
    setSelectedIds(new Set());
  };

  const groupBy = (ts,key) => { const g={}; ts.forEach(t=>{const k=t[key]||"Unassigned";if(!g[k])g[k]=[];g[k].push(t);}); return g; };

  const renderList = ts => isMobile ? (
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
      {ts.length===0&&<div style={{padding:"12px 4px",fontSize:13,color:"var(--color-text-tertiary)"}}>No tasks.</div>}
      {ts.map(t => (
        <TaskCard key={t.id} task={t} tasks={displayTasks} docs={displayDocs} readOnly={isReadOnly} onEdit={()=>openTask(t)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} showGroup statusColors={statusColors}/>
      ))}
    </div>
  ) : (
    <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"clip",marginBottom:16}}>
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
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
      {visibleSelected.length > 0 && !isMobile ? (
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{visibleSelected.length} of {visibleIds.length} selected</span>
          {!selectedAll && <button onClick={handleSelectAll} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Select all {visibleIds.length}</button>}
          <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>Set status:</span>
          {STATUSES.map(s => {
            const sc = statusColors[s] || DEFAULT_STATUS_COLORS[s];
            return (
              <button key={s} onClick={() => bulkSetStatus(s)} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>{s}</button>
            );
          })}
          <button onClick={handleDeleteSelected} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer"}}>
            Delete {visibleSelected.length === 1 ? "task" : `${visibleSelected.length} tasks`}
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Clear</button>
        </div>
      ) : (
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {!isMobile && !isReadOnly && visibleIds.length > 0 && <button onClick={handleSelectAll} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer",whiteSpace:"nowrap"}}>Select all</button>}
          {!isReadOnly && onAddTask && <button onClick={onAddTask} style={{fontSize:13,padding:"5px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>+ Add task</button>}
        </div>
      )}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"var(--color-text-tertiary)",whiteSpace:"nowrap"}}>Group by:</span>
        {groupOptions.map(([g,l]) => (
          <button key={g} onClick={()=>setListGroup(g)} style={{fontSize:12,padding:"4px 10px",borderRadius:20,border:listGroup===g?"0.5px solid var(--color-border-primary)":"0.5px solid var(--color-border-tertiary)",background:listGroup===g?"var(--color-background-secondary)":"transparent",color:listGroup===g?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
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
    // Class tasks: group by session sorted by date, no milestones
    if (hasSessionGrouping) {
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
    // Program tasks: group by date with date headers
    const taskItems = visibleTasks.map(t => ({ type:'task', date:t.due||'', item:t }));
    const sorted    = [...taskItems].sort((a,b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    // Group by work week (Mon–Fri) and insert week header rows
    const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const getMondayOfWeek = dateStr => {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T12:00:00Z');
      const day = d.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(d);
      mon.setUTCDate(d.getUTCDate() + diff);
      return mon.toISOString().slice(0, 10);
    };
    const fmtWeekHeader = mondayStr => {
      if (!mondayStr) return "No date";
      const mon = new Date(mondayStr + 'T12:00:00Z');
      const fri = new Date(mon);
      fri.setUTCDate(mon.getUTCDate() + 4);
      const fmt = d => `${SHORT_MONTHS[d.getUTCMonth()].toUpperCase()} ${d.getUTCDate()}`;
      return `${fmt(mon)} – ${fmt(fri)}`;
    };
    const groupMap = new Map();
    sorted.forEach(entry => {
      const weekKey = getMondayOfWeek(entry.date);
      if (!groupMap.has(weekKey)) groupMap.set(weekKey, []);
      groupMap.get(weekKey).push(entry);
    });
    const displayList = [];
    groupMap.forEach((entries, weekKey) => {
      displayList.push({ type:'date-header', date: weekKey, count: entries.length });
      entries.forEach(e => displayList.push(e));
    });
    return (
      <div>
        <Toolbar/>
        {isMobile ? (
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {displayList.length===0&&<div style={{padding:"12px 4px",fontSize:13,color:"var(--color-text-tertiary)"}}>No tasks.</div>}
            {displayList.map((entry,i) => entry.type==='date-header' ? (
              <div key={`dh-${entry.date}-${i}`} style={{padding:"4px 2px",display:"flex",alignItems:"center",gap:8,marginTop:i===0?0:4}}>
                <span style={{fontSize:11,fontWeight:600,color:"var(--color-text-secondary)",letterSpacing:"0.05em"}}>{fmtWeekHeader(entry.date)}</span>
                <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{entry.count} {entry.count===1?"item":"items"}</span>
              </div>
            ) : (
              <TaskCard key={entry.item.id} task={entry.item} tasks={displayTasks} docs={displayDocs} readOnly={isReadOnly} onEdit={()=>openTask(entry.item)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} showGroup statusColors={statusColors}/>
            ))}
          </div>
        ) : (
          <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"clip",marginBottom:16}}>
            <ListHeader selectable={selectable} selectedAll={selectedAll} someSelected={someSelected} onSelectAll={handleSelectAll}/>
            {displayList.length===0&&<div style={{padding:"12px 16px",fontSize:13,color:"var(--color-text-tertiary)"}}>No tasks.</div>}
            {displayList.map((entry,i,arr) => {
              if (entry.type==='date-header') {
                return (
                  <div key={`dh-${entry.date}-${i}`} style={{padding:"5px 14px",background:"var(--color-background-secondary)",borderBottom:"1px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,fontWeight:600,color:"var(--color-text-secondary)",letterSpacing:"0.05em"}}>{fmtWeekHeader(entry.date)}</span>
                    <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{entry.count} {entry.count===1?"item":"items"}</span>
                  </div>
                );
              }
              const last = i===arr.length-1 || arr[i+1]?.type==='date-header';
              return <ListRow key={entry.item.id} task={entry.item} tasks={displayTasks} docs={displayDocs} last={last} readOnly={isReadOnly} onEdit={()=>openTask(entry.item)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} selectable={selectable} selected={selectedIds.has(entry.item.id)} onSelect={toggleSelect}/>;
            })}
          </div>
        )}
      </div>
    );
  }
  const listGroups = groupBy(visibleTasks,listGroup==="assignee"?"assignee":listGroup==="status"?"status":"department");
  return (
    <div>
      <Toolbar/>
      {Object.keys(listGroups).sort().map(k => (
        <div key={k}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",letterSpacing:"0.04em",marginBottom:8}}>{k.toUpperCase()} · {listGroups[k].length}</div>
          {renderList(listGroups[k])}
        </div>
      ))}
    </div>
  );
}
