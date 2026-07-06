import { Modal, Field } from "../Primitives.jsx";
import { typeIcon, typeColor, typeBg, fmtDateYear } from "../../utils.js";
import { gcalUrl, AddToCalendarLink, suggestDeps, DepChip, SearchablePicker } from "./shared.jsx";

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

// ── Milestone Modal (create/edit) ────────────────────────────────────────────────

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
                    <button onClick={()=>removeCollateral(docId)} aria-label="Remove collateral" style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--color-text-tertiary)",padding:"0 0 0 4px",lineHeight:1,flexShrink:0}}>×</button>
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
