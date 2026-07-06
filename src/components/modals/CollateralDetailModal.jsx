import { useState, useRef, useEffect, useId } from "react";
import { TagInput } from "../Primitives.jsx";
import { avatarBg, avatarTx, fmtDateYear } from "../../utils.js";

export function CollateralDetailModal({doc, members, audiences, globalTags, businessLines=[], onSave, onDelete, onClose, isReadOnly}) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState({...doc});
  const titleId = useId();
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = e => { if (e.key === "Escape") onCloseRef.current(); };
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
            <button ref={closeRef} onClick={onClose} aria-label="Close dialog" style={{background:"var(--color-background-secondary)",border:"none",borderRadius:6,width:28,height:28,fontSize:16,color:"var(--color-text-secondary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{padding:"20px 24px 24px"}}>
          {editing ? (
            <>
              <LabeledField label="Title"><input value={val.title||""} onChange={e=>setVal(v=>({...v,title:e.target.value}))} style={inp} autoFocus/></LabeledField>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
                <LabeledField label="Business Line">
                  <select value={val.owner||""} onChange={e=>setVal(v=>({...v,owner:e.target.value}))} style={sel}>
                    <option value="">—</option>
                    {val.owner && !businessLines.includes(val.owner) && <option value={val.owner}>{val.owner} (legacy)</option>}
                    {businessLines.map(b=><option key={b}>{b}</option>)}
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
                <LabeledField label="Business Line"><PersonPill name={doc.owner}/></LabeledField>
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
