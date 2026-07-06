import { Modal, Field, TagInput } from "../Primitives.jsx";
import { DOC_TYPES } from "../../constants.js";

export function DocModal({doc,members,audiences,globalTags,prefs,businessLines=[],profileIdByName={},onChange,onSave,onDelete,onClose}) {
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
      <Field label="Owner (business line)">
        <select value={doc.owner||""} onChange={e=>onChange({...doc,owner:e.target.value})}>
          <option value="">Select business line...</option>
          {doc.owner && !businessLines.includes(doc.owner) && <option value={doc.owner}>{doc.owner} (legacy)</option>}
          {businessLines.map(b=><option key={b}>{b}</option>)}
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
