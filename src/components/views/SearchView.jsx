import { useState } from "react";
import { ListRow, ListHeader, DocCard } from "../TaskViews.jsx";

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
        <span aria-hidden="true" style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"var(--color-text-tertiary)",pointerEvents:"none"}}>⌕</span>
        <input autoFocus value={q} onChange={e=>handleChange(e.target.value)} placeholder="Search tasks, collateral, owners, tags..." style={{width:"100%",boxSizing:"border-box",fontSize:14,padding:"11px 16px 11px 40px",borderRadius:"var(--border-radius-lg)",border:"1px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
        {q&&<button onClick={()=>{setQ("");setCommittedQ("");}} aria-label="Clear search" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:16,color:"var(--color-text-tertiary)",cursor:"pointer"}}>×</button>}
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
          <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"clip"}}>
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
