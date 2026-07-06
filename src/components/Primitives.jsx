import { useState, useRef, useEffect, useId, cloneElement, isValidElement } from "react";
import { avatarBg, avatarTx, initials, useIsMobile } from "../utils.js";
import { STATUSES, DEFAULT_STATUS_COLORS } from "../constants.js";

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({name,size=28}) {
  return (
    <div title={name} style={{width:size,height:size,borderRadius:"50%",background:avatarBg(name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:500,color:avatarTx(name),flexShrink:0}}>
      {initials(name||"?")}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({label,color,bg}) {
  return <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:bg,color,whiteSpace:"nowrap"}}>{label}</span>;
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({value,onChange}) {
  return (
    <div onClick={()=>onChange(!value)} style={{width:36,height:20,borderRadius:10,background:value?"#0F6E56":"#D3D1C7",cursor:"pointer",position:"relative",flexShrink:0}}>
      <div style={{position:"absolute",top:2,left:value?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}></div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({children,title,onClose,minHeight}) {
  const isMobile = useIsMobile();
  const titleId = useId();
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{position:"fixed",inset:0,background:isMobile?"var(--color-background-primary)":"rgba(0,0,0,0.45)",display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",zIndex:500}}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={{background:"var(--color-background-primary)",borderRadius:isMobile?0:12,border:isMobile?"none":"1px solid var(--color-border-secondary)",width:"100%",maxWidth:isMobile?"none":520,height:isMobile?"100%":undefined,maxHeight:isMobile?"100%":"88vh",overflowY:"auto",boxSizing:"border-box",...(minHeight&&!isMobile?{minHeight}:{})}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:isMobile?"14px 16px":"18px 24px 16px",borderBottom:"1px solid var(--color-border-tertiary)",position:isMobile?"sticky":"static",top:0,background:"var(--color-background-primary)",zIndex:1}}>
          <span id={titleId} style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)"}}>{title}</span>
          <button ref={closeRef} onClick={onClose} aria-label="Close dialog" style={{background:"var(--color-background-secondary)",border:"none",borderRadius:8,width:isMobile?36:28,height:isMobile?36:28,fontSize:isMobile?20:16,color:"var(--color-text-secondary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
        </div>
        <div style={{padding:isMobile?"16px 16px 24px":"20px 24px 24px"}}>{children}</div>
      </div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
// Wires the visible label to its control via htmlFor/id automatically, so
// existing call sites (<Field label="X"><input/></Field>) get a real
// programmatic label-input association for free, without every one of the
// hundreds of usages across the app needing to pass an id manually.
export function Field({label,children}) {
  const autoId = useId();
  const isSingleControl = isValidElement(children) && typeof children.type === "string" && ["input","select","textarea"].includes(children.type);
  const fieldId = isSingleControl ? (children.props.id || autoId) : undefined;
  const content = isSingleControl ? cloneElement(children, { id: fieldId }) : children;
  return (
    <div style={{marginBottom:16}}>
      <label htmlFor={fieldId} style={{display:"block",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</label>
      {content}
    </div>
  );
}

// ── TagInput ──────────────────────────────────────────────────────────────────
export function TagInput({tags,suggestions,onChange}) {
  const [input,setInput] = useState("");
  const [showSugg,setShowSugg] = useState(false);
  const filtered = (suggestions||[]).filter(s=>s.toLowerCase().includes(input.toLowerCase())&&!tags.includes(s));
  const add = val => { const t=(val||input).trim(); if(t&&!tags.includes(t))onChange([...tags,t]); setInput(""); setShowSugg(false); };
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
        {tags.map(t => (
          <span key={t} style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:5}}>
            {t}<button onClick={()=>onChange(tags.filter(x=>x!==t))} aria-label={`Remove tag ${t}`} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--color-text-tertiary)",lineHeight:1,padding:0}}>×</button>
          </span>
        ))}
      </div>
      <div style={{position:"relative"}}>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>{setInput(e.target.value);setShowSugg(true);}} onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape")setShowSugg(false);}} onFocus={()=>setShowSugg(true)} placeholder="Add a tag..."/>
          <button onClick={()=>add()} style={{fontSize:13,padding:"0 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",cursor:"pointer"}}>Add</button>
        </div>
        {showSugg&&filtered.length>0&&(
          <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--color-background-primary)",border:"1px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",zIndex:400,maxHeight:140,overflowY:"auto",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
            {filtered.map(s => <div key={s} onClick={()=>add(s)} style={{padding:"7px 12px",fontSize:13,cursor:"pointer",color:"var(--color-text-primary)"}}>{s}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── StatusPill ────────────────────────────────────────────────────────────────
export function StatusPill({status,onChange,readOnly,statusColors}) {
  const [open,setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target))setOpen(false); };
    document.addEventListener("mousedown",h);
    return () => document.removeEventListener("mousedown",h);
  },[]);
  const colors = { ...DEFAULT_STATUS_COLORS, ...(statusColors || {}) };
  const s = colors[status] || DEFAULT_STATUS_COLORS["To Do"];
  if(readOnly) {
    return <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:s.bg,color:s.color,border:`1px solid ${s.border}`,whiteSpace:"nowrap",fontWeight:500}}>{status}</span>;
  }
  return (
    <div ref={ref} style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:s.bg,color:s.color,border:`1px solid ${s.border}`,cursor:"pointer",fontWeight:500,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
        {status}<span style={{fontSize:9,opacity:0.7}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,background:"var(--color-background-primary)",border:"1px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",zIndex:300,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.1)",minWidth:130}}>
          {STATUSES.map(opt => {
            const os = colors[opt]||DEFAULT_STATUS_COLORS[opt];
            return (
              <div key={opt} onClick={()=>{onChange(opt);setOpen(false);}} style={{padding:"8px 12px",paddingLeft:opt===status?"9px":"12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:opt===status?os.bg:"transparent",borderLeft:opt===status?`3px solid ${os.color}`:"3px solid transparent"}}>
                <span style={{fontSize:11,padding:"2px 10px",borderRadius:20,background:os.bg,color:os.color,border:`1px solid ${os.border}`,fontWeight:500,whiteSpace:"nowrap"}}>{opt}</span>
                {opt===status&&<span style={{fontSize:11,color:os.color}}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── FilterDropdown ────────────────────────────────────────────────────────────
export function FilterDropdown({label,options,value,onChange,align="left"}) {
  const [open,setOpen] = useState(false);
  const ref = useRef();
  const btnRef = useRef();
  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target))setOpen(false); };
    document.addEventListener("mousedown",h);
    return () => document.removeEventListener("mousedown",h);
  },[]);
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const active = value!=="All"&&value!==options[0];
  return (
    <div ref={ref} style={{position:"relative",display:"inline-block"}}>
      <button ref={btnRef} onClick={()=>setOpen(o=>!o)} aria-haspopup="true" aria-expanded={open} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,padding:"6px 12px",borderRadius:"var(--border-radius-md)",border:active?"1px solid var(--color-border-primary)":"0.5px solid var(--color-border-secondary)",background:active?"var(--color-background-secondary)":"var(--color-background-primary)",color:"var(--color-text-primary)",cursor:"pointer",whiteSpace:"nowrap"}}>
        <span style={{fontWeight:500,color:"var(--color-text-tertiary)",fontSize:12}}>{label}:</span>
        <span>{value}</span>
        <span aria-hidden="true" style={{fontSize:10,color:"var(--color-text-tertiary)",marginLeft:2}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div aria-label={label} style={{position:"absolute",top:"calc(100% + 4px)",[align==="right"?"right":"left"]:0,minWidth:160,background:"var(--color-background-primary)",border:"1px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",zIndex:400,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.12)"}}>
          {options.map(o => (
            <button key={o} type="button" aria-pressed={value===o} onClick={()=>{onChange(o);setOpen(false);btnRef.current?.focus();}} style={{width:"100%",textAlign:"left",border:"none",padding:"8px 14px",fontSize:13,cursor:"pointer",background:value===o?"var(--color-background-secondary)":"var(--color-background-primary)",color:"var(--color-text-primary)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
              {o}{value===o&&<span aria-hidden="true" style={{fontSize:11,color:"var(--color-text-tertiary)"}}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
