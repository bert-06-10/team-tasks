import { useState } from "react";
import { DEFAULT_STATUS_COLORS, MONTHS, DAYS } from "../../constants.js";
import { useIsMobile } from "../../utils.js";

export function CalendarView({tasks,milestones,sessions=[],openTask,statusColors,myUser}) {
  const today = new Date();
  const isMobile = useIsMobile();
  const [month,setMonth] = useState(today.getMonth());
  const [year,setYear] = useState(today.getFullYear());
  const [selected,setSelected] = useState(null);
  const [search,setSearch] = useState("");
  const [myOnly,setMyOnly] = useState(false);
  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);
  const dateStr = d => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const sq = search.trim().toLowerCase();
  const matchT = t => {
    if (myOnly && myUser && t.assignee!==myUser && t.assist!==myUser) return false;
    return !sq||(t.title||"").toLowerCase().includes(sq)||(t.assignee||"").toLowerCase().includes(sq)||(t.tags||[]).some(g=>g.toLowerCase().includes(sq));
  };
  const matchM = m => !sq||(m.title||"").toLowerCase().includes(sq);
  const sessionLabel = s => `${s.professor||s.name||"Session"}${s.cohort?` — ${s.cohort}`:""}`;
  const matchS = s => !sq||sessionLabel(s).toLowerCase().includes(sq);
  const tasksOnDay = d => tasks.filter(t=>t.due===dateStr(d)).filter(matchT);
  const msOnDay = d => milestones.filter(m=>m.date===dateStr(d)).filter(matchM);
  const sessionsOnDay = d => sessions.filter(s=>s.date===dateStr(d)).filter(matchS);
  const typeChip = t => t.type==="class"
    ? {bg:"var(--color-background-warning)",color:"var(--color-text-warning)"}
    : {bg:"var(--color-background-info)",color:"var(--color-text-info)"};
  const selectedTasks = selected ? tasksOnDay(selected) : [];
  const selectedMs = selected ? msOnDay(selected) : [];
  const selectedSessions = selected ? sessionsOnDay(selected) : [];
  const cellH = isMobile ? 56 : 96;
  const maxChips = isMobile ? 1 : 3;
  return (
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:16}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:isMobile?8:16,marginBottom:16,flexWrap:"wrap"}}>
          <button onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}} aria-label="Previous month" style={{fontSize:16,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-primary)",padding:"4px 8px"}}>‹</button>
          <span style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)",minWidth:isMobile?"auto":160,textAlign:"center"}}>{isMobile?MONTHS[month].slice(0,3):MONTHS[month]} {year}</span>
          <button onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}} aria-label="Next month" style={{fontSize:16,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-primary)",padding:"4px 8px"}}>›</button>
          <button onClick={()=>{setMonth(today.getMonth());setYear(today.getFullYear());}} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",cursor:"pointer",marginLeft:4,whiteSpace:"nowrap"}}>Today</button>
          {myUser && <button onClick={()=>setMyOnly(v=>!v)} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:myOnly?"1px solid var(--color-text-success)":"0.5px solid var(--color-border-secondary)",background:myOnly?"var(--color-text-success)":"var(--color-background-primary)",color:myOnly?"#fff":"var(--color-text-secondary)",cursor:"pointer",fontWeight:500,transition:"background 0.15s,color 0.15s,border 0.15s",whiteSpace:"nowrap"}}>My tasks</button>}
          <div style={{position:"relative",marginLeft:isMobile?0:8}}>
            <span aria-hidden="true" style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--color-text-tertiary)",pointerEvents:"none"}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{fontSize:12,padding:"4px 10px 4px 26px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",width:isMobile?130:160}}/>
            {search&&<button onClick={()=>setSearch("")} aria-label="Clear search" style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:14,color:"var(--color-text-tertiary)",cursor:"pointer",padding:0,lineHeight:1}}>×</button>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:isMobile?0:"auto",flexWrap:"wrap"}}>
            <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--color-text-info)"}}><span style={{width:10,height:10,borderRadius:2,background:"var(--color-background-info)",border:"1px solid var(--color-border-info)",display:"inline-block"}}/>Program</span>
            <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--color-text-warning)"}}><span style={{width:10,height:10,borderRadius:2,background:"var(--color-background-warning)",border:"1px solid var(--color-border-warning)",display:"inline-block"}}/>Class</span>
          </div>
        </div>
        <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid var(--color-border-secondary)"}}>
            {DAYS.map(d => <div key={d} style={{padding:isMobile?"6px 2px":"8px 4px",textAlign:"center",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",letterSpacing:"0.04em",borderRight:"0.5px solid var(--color-border-tertiary)"}}>{isMobile?d.slice(0,1):d}</div>)}
          </div>
          {Array.from({length:cells.length/7}).map((_,wi) => (
            <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:wi===cells.length/7-1?"none":"0.5px solid var(--color-border-tertiary)"}}>
              {cells.slice(wi*7,wi*7+7).map((d,di) => {
                const isToday = d&&d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
                const dayTasks = d ? tasksOnDay(d) : [];
                const dayMs = d ? msOnDay(d) : [];
                const daySessions = d ? sessionsOnDay(d) : [];
                const isSelected = selected===d;
                const totalItems = dayMs.length + daySessions.length + dayTasks.length;
                return (
                  <div key={di} onClick={()=>d&&setSelected(isSelected?null:d)} style={{height:cellH,overflow:"hidden",padding:isMobile?"3px 2px":"6px 6px 4px",borderRight:di===6?"none":"0.5px solid var(--color-border-tertiary)",background:isSelected?"var(--color-background-secondary)":d?"var(--color-background-primary)":"var(--color-background-tertiary)",cursor:d?"pointer":"default"}}>
                    {d&&(
                      <div style={{width:isMobile?18:22,height:isMobile?18:22,borderRadius:"50%",background:isToday?"var(--color-text-info)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:isMobile?1:4,marginInline:isMobile?"auto":0}}>
                        <span style={{fontSize:isMobile?11:12,fontWeight:isToday?500:400,color:isToday?"#fff":"var(--color-text-primary)"}}>{d}</span>
                      </div>
                    )}
                    {isMobile ? (
                      totalItems>0 && <div style={{width:5,height:5,borderRadius:"50%",background:"var(--color-text-secondary)",margin:"0 auto"}}/>
                    ) : (
                      <>
                        {dayMs.map(m => <div key={m.id} style={{fontSize:10,padding:"1px 5px",borderRadius:3,background:"var(--color-background-info)",color:"var(--color-text-info)",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>◆ {m.title}</div>)}
                        {daySessions.map(s => <div key={s.id} style={{fontSize:10,padding:"1px 5px",borderRadius:3,background:"var(--color-background-warning)",color:"var(--color-text-warning)",fontWeight:500,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>▣ {sessionLabel(s)}</div>)}
                        {dayTasks.slice(0,maxChips).map(t => {
                          const tc = typeChip(t);
                          return <div key={t.id} style={{fontSize:10,padding:"1px 5px",borderRadius:3,background:tc.bg,color:tc.color,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>;
                        })}
                        {dayTasks.length>maxChips&&<div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>+{dayTasks.length-maxChips} more</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {selected&&(
        <div style={{width:isMobile?"100%":240,flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:12}}>{MONTHS[month]} {selected}</div>
          {selectedMs.map(m => (
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:"1px solid var(--color-border-info)",background:"var(--color-background-info)",marginBottom:8}}>
              <span aria-hidden="true" style={{color:"var(--color-text-info)"}}>◆</span>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-info)"}}>{m.title}</span>
            </div>
          ))}
          {selectedSessions.map(s => (
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:"1px solid var(--color-border-warning)",background:"var(--color-background-warning)",marginBottom:8}}>
              <span aria-hidden="true" style={{color:"var(--color-text-warning)"}}>▣</span>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-warning)"}}>{sessionLabel(s)}</span>
            </div>
          ))}
          {selectedTasks.length===0&&selectedMs.length===0&&selectedSessions.length===0&&<div style={{fontSize:13,color:"var(--color-text-tertiary)"}}>No items this day.</div>}
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
const DEFAULT_TEMPLATE = [
  { title: "Prepare session materials", offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Send participant reminder", offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Set up room/platform",      offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Facilitate session",        offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Post recording & notes",    offset: 0, assignee: "", assist: "", notes: "" },
  { title: "Follow-up survey",          offset: 0, assignee: "", assist: "", notes: "" },
];
