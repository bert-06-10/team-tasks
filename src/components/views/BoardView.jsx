import { useState } from "react";
import { TaskCard } from "../TaskViews.jsx";
import { STATUSES } from "../../constants.js";
import { isOverdue, useIsMobile } from "../../utils.js";

export function BoardView({filteredTasks,displayTasks,displayDocs,milestones,isReadOnly,boardGroup,setBoardGroup,openTask,onViewMilestone,updateStatus,getBlockedStatus,statusColors}) {
  const [dragId,setDragId] = useState(null);
  const isMobile = useIsMobile();
  const groupBy = (ts,key) => { const g={}; ts.forEach(t=>{const k=t[key]||"Unassigned";if(!g[k])g[k]=[];g[k].push(t);}); return g; };
  const overdueIds = boardGroup==="status" ? new Set(filteredTasks.filter(t=>t.status!=="Done"&&isOverdue(t.due)).map(t=>t.id)) : new Set();
  const boardGroups = boardGroup==="status"
    ? {"Overdue":filteredTasks.filter(t=>overdueIds.has(t.id)),...Object.fromEntries(STATUSES.map(s=>[s,filteredTasks.filter(t=>t.status===s&&!overdueIds.has(t.id))]))}
    : groupBy(filteredTasks,boardGroup==="assignee"?"assignee":"department");
  const keys = boardGroup==="status" ? ["Overdue",...STATUSES] : Object.keys(boardGroups).sort();
  const onDragStart = (e,id) => { setDragId(id); e.dataTransfer.effectAllowed="move"; };
  const onDrop = (e,col) => { e.preventDefault(); if(dragId&&boardGroup==="status")updateStatus(dragId,col); setDragId(null); };
  const onDragOver = e => { e.preventDefault(); e.dataTransfer.dropEffect="move"; };
  return (
    <div>
      <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:12,justifyContent:isMobile?"flex-start":"flex-end",flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"var(--color-text-tertiary)",whiteSpace:"nowrap"}}>Group by:</span>
        {["status","assignee","department"].map(g => (
          <button key={g} onClick={()=>setBoardGroup(g)} style={{fontSize:12,padding:"4px 10px",borderRadius:20,border:boardGroup===g?"0.5px solid var(--color-border-primary)":"0.5px solid var(--color-border-tertiary)",background:boardGroup===g?"var(--color-background-secondary)":"transparent",color:boardGroup===g?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer",textTransform:"capitalize",whiteSpace:"nowrap"}}>{g}</button>
        ))}
      </div>
      {isMobile && <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8}}>Swipe to see more columns · tap a card to edit</div>}
      <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:8,borderLeft:"0.5px solid var(--color-border-tertiary)",scrollSnapType:isMobile?"x mandatory":undefined,WebkitOverflowScrolling:"touch"}}>
        {keys.map(k => {
          const isOverdueCol = k==="Overdue";
          return (
            <div key={k} onDrop={e=>!isOverdueCol&&onDrop(e,k)} onDragOver={!isOverdueCol?onDragOver:undefined} style={{minWidth:isMobile?"calc(100vw - 56px)":260,flex:isMobile?"0 0 calc(100vw - 56px)":"0 0 260px",borderRight:"0.5px solid var(--color-border-tertiary)",padding:"0 16px 16px",transition:"background 0.15s",scrollSnapAlign:isMobile?"start":undefined}}>
              <div style={{fontSize:12,fontWeight:500,color:isOverdueCol?"#A32D2D":"var(--color-text-secondary)",margin:"0 0 12px",letterSpacing:"0.04em",paddingTop:4}}>
                {k.toUpperCase()} · {(boardGroups[k]||[]).length}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(boardGroups[k]||[]).map(t => (
                  <div key={t.id} draggable={!isReadOnly&&boardGroup==="status"&&!isOverdueCol&&!isMobile} onDragStart={e=>!isOverdueCol&&onDragStart(e,t.id)} onDragEnd={()=>setDragId(null)} style={{opacity:dragId===t.id?0.4:1,cursor:isOverdueCol?"default":"grab"}}>
                    <TaskCard task={t} tasks={displayTasks} docs={displayDocs} readOnly={isReadOnly} onEdit={()=>openTask(t)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} showGroup={boardGroup!=="status"} statusColors={statusColors}/>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
