import { useState } from "react";
import { Avatar, Badge, StatusPill, FilterDropdown } from "./Primitives.jsx";
import { CollateralDetailModal } from "./Modals.jsx";
import { fmtDate, fmtDateYear, isOverdue, avatarBg, avatarTx, addDays } from "../utils.js";
import { DEFAULT_STATUS_COLORS } from "../constants.js";

const LIST_COLS       = "1fr 70px 70px 90px 1fr 80px 130px 110px";
const LIST_COLS_SEL   = "36px 1fr 70px 70px 90px 1fr 80px 130px 110px";
const LIST_HEADERS    = ["Task","Owner","Assist","Due date","Notes","Links","Dependencies","Status"];

// ── List Header ───────────────────────────────────────────────────────────────
export function ListHeader({selectable, selectedAll, someSelected, onSelectAll}) {
  const cols = selectable ? LIST_COLS_SEL : LIST_COLS;
  return (
    <div style={{display:"grid",gridTemplateColumns:cols,borderBottom:"1px solid var(--color-border-secondary)",background:"var(--color-background-secondary)"}}>
      {selectable && (
        <div style={{padding:"8px 10px",display:"flex",alignItems:"center",justifyContent:"center",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
          <input type="checkbox" checked={selectedAll} ref={el => { if (el) el.indeterminate = someSelected && !selectedAll; }} onChange={onSelectAll} style={{cursor:"pointer",margin:0}} />
        </div>
      )}
      {LIST_HEADERS.map((h,i) => (
        <div key={h} style={{padding:"8px 12px",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",borderRight:i<LIST_HEADERS.length-1?"0.5px solid var(--color-border-tertiary)":"none"}}>{h}</div>
      ))}
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
export function TaskCard({task,tasks,docs,readOnly,onEdit,onStatus,getBlockedStatus,showGroup,statusColors}) {
  const bs = getBlockedStatus(task);
  const overdue = task.status!=="Done"&&isOverdue(task.due);
  const collateralReady = (task.collateralDeps||[]).every(id=>docs.find(d=>d.id===id));
  return (
    <div onClick={onEdit} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",padding:"12px 14px",cursor:readOnly?"default":"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
      {task.type==="class"&&<div style={{fontSize:10,padding:"1px 7px",borderRadius:8,background:"#FAEEDA",color:"#854F0B",display:"inline-block",marginBottom:6}}>{task.sessionName||"Class task"}</div>}
      <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>{task.title}</div>
      {showGroup&&task.department&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:4}}>{task.department}</div>}
      {task.notes&&<div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:8,lineHeight:1.5}}>{task.notes}</div>}
      {(task.tags||[]).length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
          {task.tags.map(t => <span key={t} style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)"}}>{t}</span>)}
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:8}}>
        <Avatar name={task.assignee} size={22}/>
        {task.assist&&<Avatar name={task.assist} size={22}/>}
        {task.due&&<span style={{fontSize:11,color:overdue?"var(--color-text-danger)":"var(--color-text-secondary)"}}>{fmtDate(task.due)}</span>}
        {task.flagged&&<Badge label="review" color="#854F0B" bg="#FAEEDA"/>}
        {bs==="blocked"&&<Badge label="blocked" color="#A32D2D" bg="#FCEBEB"/>}
        {bs==="at-risk"&&<Badge label="at risk" color="#854F0B" bg="#FAEEDA"/>}
        {bs==="clear"&&<Badge label="unblocked" color="#0F6E56" bg="#E1F5EE"/>}
        {(task.collateralDeps||[]).length>0&&<Badge label={collateralReady?"docs ready":"docs pending"} color={collateralReady?"#0F6E56":"#854F0B"} bg={collateralReady?"#E1F5EE":"#FAEEDA"}/>}
      </div>
      <div onClick={e=>e.stopPropagation()}>
        <StatusPill status={task.status} onChange={s=>onStatus(task.id,s)} readOnly={readOnly} statusColors={statusColors}/>
      </div>
    </div>
  );
}

// ── List Row ──────────────────────────────────────────────────────────────────
export function ListRow({task,tasks,docs,last,readOnly,onEdit,onStatus,getBlockedStatus,statusColors,selectable,selected,onSelect}) {
  const bs = getBlockedStatus(task);
  const overdue = task.status!=="Done"&&isOverdue(task.due);
  const cols = selectable ? LIST_COLS_SEL : LIST_COLS;
  const isUrl = s => /^https?:\/\//i.test(s);
  const sep = {borderRight:"1px solid var(--color-border-tertiary)"};
  return (
    <div onClick={onEdit} style={{display:"grid",gridTemplateColumns:cols,alignItems:"center",borderBottom:last?"none":"1px solid var(--color-border-tertiary)",cursor:readOnly?"default":"pointer",background:selected?"var(--color-background-secondary)":"transparent"}}>
      {selectable && (
        <div style={{padding:"11px 10px",display:"flex",alignItems:"center",justifyContent:"center",...sep}}>
          <input type="checkbox" checked={!!selected} onChange={() => onSelect(task.id)} onClick={e=>e.stopPropagation()} style={{cursor:"pointer",margin:0}} />
        </div>
      )}
      {/* Task */}
      <div style={{padding:"11px 12px",minWidth:0,...sep}}>
        <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{task.title}</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {task.type==="class"&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:"#FAEEDA",color:"#854F0B"}}>{task.sessionName||"class"}</span>}
          {task.department&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"var(--color-background-secondary)",color:"var(--color-text-tertiary)"}}>{task.department}</span>}
          {(task.tags||[]).map(t => <span key={t} style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)"}}>{t}</span>)}
        </div>
      </div>
      {/* Owner */}
      <div style={{padding:"11px 10px",display:"flex",alignItems:"center",...sep}}>
        {task.assignee ? <Avatar name={task.assignee} size={22}/> : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      {/* Assist */}
      <div style={{padding:"11px 10px",display:"flex",alignItems:"center",...sep}}>
        {task.assist ? <Avatar name={task.assist} size={22}/> : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      {/* Due date */}
      <div style={{padding:"11px 12px",fontSize:12,color:overdue?"var(--color-text-danger)":"var(--color-text-secondary)",...sep}}>{fmtDate(task.due)||"—"}</div>
      {/* Notes */}
      <div style={{padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",...sep}} title={task.notes||""}>{task.notes||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
      {/* Links */}
      <div style={{padding:"11px 12px",...sep}} onClick={e=>e.stopPropagation()}>
        {task.links
          ? isUrl(task.links)
            ? <a href={task.links} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"var(--color-text-secondary)",textDecoration:"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block"}}>↗ Link</a>
            : <span style={{fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block"}} title={task.links}>{task.links}</span>
          : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      {/* Dependencies */}
      <div style={{padding:"11px 12px",display:"flex",gap:4,flexWrap:"wrap",alignItems:"center",...sep}}>
        {task.flagged&&<Badge label="review" color="#854F0B" bg="#FAEEDA"/>}
        {bs==="blocked"&&<Badge label="blocked" color="#A32D2D" bg="#FCEBEB"/>}
        {bs==="at-risk"&&<Badge label="at risk" color="#854F0B" bg="#FAEEDA"/>}
        {bs==="clear"&&<Badge label="unblocked" color="#0F6E56" bg="#E1F5EE"/>}
        {(task.collateralDeps||[]).length>0&&<Badge label="docs" color="#185FA5" bg="#E6F1FB"/>}
        {!task.flagged&&bs!=="blocked"&&bs!=="at-risk"&&bs!=="clear"&&!(task.collateralDeps||[]).length&&<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      {/* Status */}
      <div style={{padding:"11px 12px"}} onClick={e=>e.stopPropagation()}>
        <StatusPill status={task.status} onChange={s=>onStatus(task.id,s)} readOnly={readOnly} statusColors={statusColors}/>
      </div>
    </div>
  );
}

// ── Milestone Bar ─────────────────────────────────────────────────────────────
export function MilestoneBar({milestones}) {
  return (
    <div style={{marginBottom:16,display:"flex",gap:8,flexWrap:"wrap"}}>
      {milestones.map(m => (
        <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:"var(--border-radius-md)",border:"1px solid #B5D4F4",background:"#E6F1FB"}}>
          <span style={{color:"#185FA5",fontSize:12}}>◆</span>
          <span style={{fontSize:12,fontWeight:500,color:"#185FA5"}}>{m.title}</span>
          <span style={{fontSize:11,color:"#185FA5",opacity:0.7}}>{fmtDate(m.date)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Doc Card (used in search results) ────────────────────────────────────────
export function DocCard({doc,readOnly,onEdit,last}) {
  const typeIcon = t => ({"Google Drive":"G","PDF":"P","Web Link":"W"}[t]||"D");
  const typeColor = t => ({"Google Drive":"#185FA5","PDF":"#A32D2D","Web Link":"#0F6E56"}[t]||"#5F5E5A");
  const typeBg = t => ({"Google Drive":"#E6F1FB","PDF":"#FCEBEB","Web Link":"#EAF3DE"}[t]||"#F1EFE8");
  return (
    <div style={{background:"var(--color-background-primary)",border:"none",borderBottom:last?"none":"1px solid var(--color-border-tertiary)",padding:"14px 18px",display:"flex",alignItems:"flex-start",gap:16}}>
      <div style={{width:36,height:36,borderRadius:"var(--border-radius-md)",background:typeBg(doc.type),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:typeColor(doc.type),flexShrink:0}}>{typeIcon(doc.type)}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{doc.title}</span>
          <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:typeBg(doc.type),color:typeColor(doc.type)}}>{doc.type}</span>
        </div>
        <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{doc.description}</div>
        {(doc.tags||[]).length>0&&<div style={{display:"flex",gap:4,marginBottom:6}}>{doc.tags.map(t=><span key={t} style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)"}}>{t}</span>)}</div>}
        <div style={{display:"flex",gap:16,fontSize:11,color:"var(--color-text-tertiary)"}}>
          <span>Audience: <span style={{color:"var(--color-text-secondary)"}}>{doc.audience}</span></span>
          <span>Owner: <span style={{color:"var(--color-text-secondary)"}}>{doc.owner}</span></span>
          <span>Updated: <span style={{color:"var(--color-text-secondary)"}}>{doc.updated}</span></span>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <a href={doc.url} style={{fontSize:12,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",color:"var(--color-text-primary)",textDecoration:"none"}}>Open</a>
        {!readOnly&&<button onClick={onEdit} style={{fontSize:12,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Edit</button>}
      </div>
    </div>
  );
}

// ── Doc List (collateral tab) ─────────────────────────────────────────────────
const DOC_COLS     = "1.5fr 130px 130px 130px 110px 1.5fr 130px 130px 110px 115px 1fr";
const DOC_COLS_SEL = "36px 1.5fr 130px 130px 130px 110px 1.5fr 130px 130px 110px 115px 1fr";
const DOC_HEADERS  = ["Title","Owner","Content Owner","Assist","Audience","Description","Editable Link","Shareable Link","Next Update","Last Updated","Tags"];
const sep = {borderRight:"1px solid var(--color-border-tertiary)"};
const inp = {fontSize:12,width:"100%",boxSizing:"border-box",padding:"3px 6px",border:"1px solid var(--color-border-secondary)",borderRadius:4,background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontFamily:"inherit"};

const DOC_SORT_KEYS = [null,"owner","content_owner","assist","audience",null,null,null,"next_update","updated",null];

function DocListHeader({selectable,selectedAll,someSelected,onSelectAll,sort,onSort}) {
  const cols = selectable ? DOC_COLS_SEL : DOC_COLS;
  return (
    <div style={{display:"grid",gridTemplateColumns:cols,borderBottom:"1px solid var(--color-border-secondary)",background:"var(--color-background-secondary)"}}>
      {selectable && (
        <div style={{padding:"8px 10px",display:"flex",alignItems:"center",justifyContent:"center",...sep}}>
          <input type="checkbox" checked={selectedAll} ref={el=>{if(el)el.indeterminate=someSelected&&!selectedAll;}} onChange={onSelectAll} style={{cursor:"pointer",margin:0}}/>
        </div>
      )}
      {DOC_HEADERS.map((h,i) => {
        const key = DOC_SORT_KEYS[i];
        const active = sort.col === key;
        return (
          <div key={i} onClick={key ? ()=>onSort(key) : undefined}
            style={{padding:"8px 12px",fontSize:11,fontWeight:500,color:active?"var(--color-text-primary)":"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",cursor:key?"pointer":"default",userSelect:"none",display:"flex",alignItems:"center",gap:4,...(i<DOC_HEADERS.length-1?sep:{})}}>
            {h}
            {key && <span style={{fontSize:10,opacity:active?1:0.35}}>{active?(sort.dir==="asc"?"▲":"▼"):"▲"}</span>}
          </div>
        );
      })}
    </div>
  );
}

function DocListRow({doc,last,selectable,selected,onSelect,onOpen}) {
  const cols = selectable ? DOC_COLS_SEL : DOC_COLS;
  return (
    <div onClick={()=>onOpen(doc)} style={{display:"grid",gridTemplateColumns:cols,alignItems:"center",borderBottom:last?"none":"1px solid var(--color-border-tertiary)",background:selected?"var(--color-background-secondary)":"transparent",cursor:"pointer"}}>
      {selectable && (
        <div style={{padding:"11px 10px",display:"flex",alignItems:"center",justifyContent:"center",...sep}} onClick={e=>e.stopPropagation()}>
          <input type="checkbox" checked={!!selected} onChange={()=>onSelect(doc.id)} style={{cursor:"pointer",margin:0}}/>
        </div>
      )}
      <div style={{padding:"11px 12px",minWidth:0,...sep}}>
        <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{doc.title}</div>
      </div>
      <div style={{padding:"11px 10px",display:"flex",alignItems:"center",...sep}}>
        {doc.owner ? <span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:10,background:avatarBg(doc.owner),color:avatarTx(doc.owner),whiteSpace:"nowrap"}}>{doc.owner}</span> : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div style={{padding:"11px 10px",display:"flex",alignItems:"center",...sep}}>
        {doc.content_owner ? <span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:10,background:avatarBg(doc.content_owner),color:avatarTx(doc.content_owner),whiteSpace:"nowrap"}}>{doc.content_owner}</span> : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div style={{padding:"11px 10px",display:"flex",alignItems:"center",...sep}}>
        {doc.assist ? <span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:10,background:avatarBg(doc.assist),color:avatarTx(doc.assist),whiteSpace:"nowrap"}}>{doc.assist}</span> : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div style={{padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",...sep}} title={doc.audience||""}>{doc.audience||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
      <div style={{padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",...sep}} title={doc.description||""}>{doc.description||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
      <div style={{padding:"11px 12px",...sep}} onClick={e=>e.stopPropagation()}>
        {doc.url
          ? <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"var(--color-text-secondary)",textDecoration:"none"}}>↗ Open</a>
          : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div style={{padding:"11px 12px",...sep}} onClick={e=>e.stopPropagation()}>
        {doc.shareable_link
          ? <a href={doc.shareable_link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"var(--color-text-secondary)",textDecoration:"none"}}>↗ Open</a>
          : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div style={{padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",...sep}}>{fmtDate(doc.next_update)||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
      <div style={{padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",...sep}}>{fmtDateYear(doc.updated)||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
      <div style={{padding:"11px 12px",display:"flex",gap:4,flexWrap:"wrap",alignItems:"center",...sep}}>
        {(doc.tags||[]).length>0
          ? doc.tags.map(t=><span key={t} style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",whiteSpace:"nowrap"}}>{t}</span>)
          : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
    </div>
  );
}

const BLANK_FILTERS = { owner:"All", contentOwner:"All", assist:"All", audience:"All", nextUpdate:"All", lastUpdated:"All" };
const DATE_FILTER_OPTS      = ["All","Has date","No date","Overdue","Next 30 days"];
const LAST_UPDATED_OPTS     = ["All","Has date","No date","Past 30 days","Past 90 days"];

export function CollateralView({docs,isReadOnly,onSave,onDelete,onDeleteSelected,members,audiences,globalTags}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailDoc,   setDetailDoc]   = useState(null);
  const [filters,     setFilters]     = useState(BLANK_FILTERS);
  const [sort,        setSort]        = useState({col:null,dir:"asc"});
  const selectable = !isReadOnly;

  const today = new Date().toISOString().slice(0,10);

  const uniq = field => ["All",...Array.from(new Set(docs.map(d=>d[field]).filter(Boolean))).sort()];
  const ownerOpts        = uniq("owner");
  const contentOwnerOpts = uniq("content_owner");
  const assistOpts       = uniq("assist");
  const audienceOpts     = uniq("audience");

  const applyDateFilter = (val, dateStr, opts) => {
    if (val==="All")         return true;
    if (val==="Has date")    return !!dateStr;
    if (val==="No date")     return !dateStr;
    if (val==="Overdue")     return !!dateStr && dateStr < today;
    if (val==="Next 30 days") return !!dateStr && dateStr >= today && dateStr <= addDays(today,30);
    if (val==="Past 30 days") return !!dateStr && dateStr >= addDays(today,-30);
    if (val==="Past 90 days") return !!dateStr && dateStr >= addDays(today,-90);
    return true;
  };

  const filteredDocs = docs.filter(d => {
    if (filters.owner        !== "All" && d.owner         !== filters.owner)        return false;
    if (filters.contentOwner !== "All" && d.content_owner !== filters.contentOwner) return false;
    if (filters.assist       !== "All" && d.assist        !== filters.assist)       return false;
    if (filters.audience     !== "All" && d.audience      !== filters.audience)     return false;
    if (!applyDateFilter(filters.nextUpdate,  d.next_update)) return false;
    if (!applyDateFilter(filters.lastUpdated, d.updated))     return false;
    return true;
  });

  const displayDocs = sort.col ? [...filteredDocs].sort((a,b) => {
    const av = a[sort.col]||"", bv = b[sort.col]||"";
    const cmp = av<bv?-1:av>bv?1:0;
    return sort.dir==="asc"?cmp:-cmp;
  }) : filteredDocs;

  const toggleSort = col => setSort(s => s.col===col ? {col,dir:s.dir==="asc"?"desc":"asc"} : {col,dir:"asc"});
  const setFilter  = (key,val) => setFilters(f=>({...f,[key]:val}));
  const anyFilter  = Object.values(filters).some(v=>v!=="All");

  const toggleSelect  = id => setSelectedIds(prev => { const next=new Set(prev); next.has(id)?next.delete(id):next.add(id); return next; });
  const visibleIds    = displayDocs.map(d=>d.id);
  const visibleSelected = visibleIds.filter(id=>selectedIds.has(id));
  const selectedAll   = visibleIds.length>0 && visibleSelected.length===visibleIds.length;
  const someSelected  = visibleSelected.length>0 && !selectedAll;
  const handleSelectAll = () => setSelectedIds(selectedAll?new Set():new Set(visibleIds));
  const handleDelete  = async () => { if(!visibleSelected.length)return; await onDeleteSelected(visibleSelected); setSelectedIds(new Set()); };

  const handleDetailSave = async doc => { await onSave(doc); setDetailDoc(null); };

  return (
    <>
      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        <FilterDropdown label="Owner"         options={ownerOpts}         value={filters.owner}        onChange={v=>setFilter("owner",v)}/>
        <FilterDropdown label="Content Owner" options={contentOwnerOpts}  value={filters.contentOwner} onChange={v=>setFilter("contentOwner",v)}/>
        <FilterDropdown label="Assist"        options={assistOpts}        value={filters.assist}       onChange={v=>setFilter("assist",v)}/>
        <FilterDropdown label="Audience"      options={audienceOpts}      value={filters.audience}     onChange={v=>setFilter("audience",v)}/>
        <FilterDropdown label="Next Update"   options={DATE_FILTER_OPTS}  value={filters.nextUpdate}   onChange={v=>setFilter("nextUpdate",v)}/>
        <FilterDropdown label="Last Updated"  options={LAST_UPDATED_OPTS} value={filters.lastUpdated}  onChange={v=>setFilter("lastUpdated",v)}/>
        {anyFilter && <button onClick={()=>setFilters(BLANK_FILTERS)} style={{fontSize:12,padding:"5px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Clear</button>}
      </div>
      {visibleSelected.length>0 && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{visibleSelected.length} selected</span>
          <button onClick={handleDelete} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer"}}>
            Delete {visibleSelected.length===1?"item":`${visibleSelected.length} items`}
          </button>
          <button onClick={()=>setSelectedIds(new Set())} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Clear</button>
        </div>
      )}
      <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden"}}>
        {displayDocs.length===0
          ? <div style={{padding:"16px",fontSize:13,color:"var(--color-text-tertiary)"}}>{anyFilter?"No documents match the current filters.":"No documents."}</div>
          : <>
              <DocListHeader selectable={selectable} selectedAll={selectedAll} someSelected={someSelected} onSelectAll={handleSelectAll} sort={sort} onSort={toggleSort}/>
              {displayDocs.map((d,i,arr)=>(
                <DocListRow key={d.id} doc={d} last={i===arr.length-1}
                  selectable={selectable} selected={selectedIds.has(d.id)} onSelect={toggleSelect}
                  onOpen={setDetailDoc}/>
              ))}
            </>}
      </div>
      {detailDoc && (
        <CollateralDetailModal
          doc={detailDoc} members={members} audiences={audiences} globalTags={globalTags}
          onSave={handleDetailSave} onDelete={onDelete}
          onClose={()=>setDetailDoc(null)} isReadOnly={isReadOnly}/>
      )}
    </>
  );
}

// ── Run of Show View ──────────────────────────────────────────────────────────
export function RunOfShowView({sessions,runOfShow,setRunOfShow,onSaveRow,onDeleteRow,members,isReadOnly}) {
  const [selectedSession,setSelectedSession] = useState(sessions[0]?.id||"");
  const [editingRow,setEditingRow] = useState(null);
  const [editVal,setEditVal] = useState({});

  const rows = runOfShow[selectedSession]||[];

  const newRow = () => {
    const id = "ri"+Date.now();
    const row = {id,cohort:"",time:"",event:"",owner:"",assist:"",notes:""};
    setRunOfShow(prev => ({...prev,[selectedSession]:[...(prev[selectedSession]||[]),row]}));
    setEditingRow(id);
    setEditVal(row);
  };

  const startEdit = row => { setEditingRow(row.id); setEditVal({...row}); };

  const saveEdit = async () => {
    try {
      const saved = await onSaveRow(selectedSession, {...editVal});
      setRunOfShow(prev => ({...prev,[selectedSession]:(prev[selectedSession]||[]).map(r=>r.id===editingRow?saved:r)}));
      setEditingRow(null); setEditVal({});
    } catch(e) { console.error('Failed to save row', e); }
  };

  const deleteRow = async id => {
    setRunOfShow(prev => ({...prev,[selectedSession]:(prev[selectedSession]||[]).filter(r=>r.id!==id)}));
    try { await onDeleteRow(id); } catch(e) { console.error('Failed to delete row', e); }
  };

  const cols = ["cohort","time","event","owner","assist","notes"];
  const colLabels = ["Cohort","Time","Event","Owner","Assist","Notes"];
  const colWidths = ["110px","90px","1fr","130px","130px","1fr"];

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Session:</span>
        <div style={{display:"flex",gap:4}}>
          {sessions.map(s => (
            <button key={s.id} onClick={()=>setSelectedSession(s.id)} style={{fontSize:13,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:selectedSession===s.id?"0.5px solid var(--color-border-primary)":"0.5px solid var(--color-border-tertiary)",background:selectedSession===s.id?"var(--color-background-secondary)":"transparent",color:selectedSession===s.id?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer"}}>
              {s.name} <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{fmtDate(s.date)}</span>
            </button>
          ))}
        </div>
        {!isReadOnly&&<button onClick={newRow} style={{marginLeft:"auto",fontSize:13,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",cursor:"pointer"}}>+ Add row</button>}
      </div>

      <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:colWidths.join(" "),borderBottom:"1px solid var(--color-border-secondary)",background:"var(--color-background-secondary)"}}>
          {colLabels.map((l,i) => (
            <div key={l} style={{padding:"8px 12px",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",borderRight:i<colLabels.length-1?"1px solid var(--color-border-tertiary)":"none"}}>{l}</div>
          ))}
        </div>

        {rows.length===0&&<div style={{padding:"16px",fontSize:13,color:"var(--color-text-tertiary)"}}>No run of show entries for this session yet.</div>}

        {rows.map((row,ri) => (
          <div key={row.id} style={{borderBottom:ri===rows.length-1?"none":"1px solid var(--color-border-tertiary)"}}>
            {editingRow===row.id ? (
              <div style={{display:"grid",gridTemplateColumns:colWidths.join(" "),alignItems:"center"}}>
                {cols.map((col,ci) => (
                  <div key={col} style={{padding:"6px 8px",borderRight:ci<cols.length-1?"1px solid var(--color-border-tertiary)":"none"}}>
                    {col==="owner"||col==="assist" ? (
                      <select value={editVal[col]||""} onChange={e=>setEditVal(v=>({...v,[col]:e.target.value}))} style={{width:"100%",fontSize:12,border:"1px solid var(--color-border-secondary)",borderRadius:4,padding:"3px 6px",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}>
                        <option value="">—</option>
                        {members.map(m=><option key={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input value={editVal[col]||""} onChange={e=>setEditVal(v=>({...v,[col]:e.target.value}))} style={{width:"100%",fontSize:12,border:"1px solid var(--color-border-secondary)",borderRadius:4,padding:"3px 6px",boxSizing:"border-box"}}/>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:colWidths.join(" "),alignItems:"center"}} onDoubleClick={()=>!isReadOnly&&startEdit(row)}>
                {cols.map((col,ci) => (
                  <div key={col} style={{padding:"10px 12px",fontSize:13,color:"var(--color-text-primary)",borderRight:ci<cols.length-1?"1px solid var(--color-border-tertiary)":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {col==="owner"||col==="assist"
                      ? (row[col]?<div style={{display:"flex",alignItems:"center",gap:6}}><Avatar name={row[col]} size={20}/><span style={{fontSize:12}}>{row[col]}</span></div>:<span style={{color:"var(--color-text-tertiary)"}}>—</span>)
                      : (row[col]||<span style={{color:"var(--color-text-tertiary)"}}>—</span>)
                    }
                  </div>
                ))}
              </div>
            )}
            {editingRow===row.id&&!isReadOnly&&(
              <div style={{display:"flex",gap:8,padding:"6px 12px",borderTop:"1px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"}}>
                <button onClick={saveEdit} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"1px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer"}}>Save</button>
                <button onClick={()=>setEditingRow(null)} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
                <button onClick={()=>deleteRow(row.id)} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer",marginLeft:"auto"}}>Delete</button>
              </div>
            )}
            {editingRow!==row.id&&!isReadOnly&&(
              <div style={{display:"flex",gap:6,padding:"4px 12px",background:"var(--color-background-secondary)",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                <button onClick={()=>startEdit(row)} style={{fontSize:11,padding:"2px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Edit</button>
                <button onClick={()=>deleteRow(row.id)} style={{fontSize:11,padding:"2px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"transparent",color:"#A32D2D",cursor:"pointer"}}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
