import { Modal, Field, TagInput } from "../Primitives.jsx";
import { STATUSES } from "../../constants.js";
import { fmtDate, isWeekend, closestBusinessDay, useIsMobile } from "../../utils.js";
import { SearchablePicker, AddToCalendarLink } from "./shared.jsx";

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
      {task.due&&task.title&&(
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
