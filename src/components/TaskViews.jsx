import { useState, useMemo, useRef, useEffect } from "react";
import { Avatar, Badge, StatusPill, FilterDropdown } from "./Primitives.jsx";
import { CollateralDetailModal } from "./Modals.jsx";
import { fmtDate, fmtDateYear, isOverdue, avatarBg, avatarTx, addDays } from "../utils.js";
import { DEFAULT_STATUS_COLORS } from "../constants.js";

const LIST_COLS       = "1fr 70px 70px 90px 110px 130px 80px 1fr";
const LIST_COLS_SEL   = "36px 1fr 70px 70px 90px 110px 130px 80px 1fr";
const LIST_HEADERS    = ["Task","Owner","Assist","Due date","Status","Dependencies","Links","Notes"];

// ── List Header ───────────────────────────────────────────────────────────────
export function ListHeader({selectable, selectedAll, someSelected, onSelectAll}) {
  const cols = selectable ? LIST_COLS_SEL : LIST_COLS;
  return (
    <div style={{display:"grid",gridTemplateColumns:cols,borderBottom:"1px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",position:"sticky",top:0,zIndex:2}}>
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
      <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4,textDecoration:task.status==="Done"?"line-through":"none",opacity:task.status==="Done"?0.5:1}}>{task.title}</div>
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
export function ListRow({task,tasks,docs,last,readOnly,onEdit,onStatus,getBlockedStatus,statusColors,selectable,selected,onSelect,rowBg}) {
  const bs = getBlockedStatus(task);
  const overdue = task.status!=="Done"&&isOverdue(task.due);
  const cols = selectable ? LIST_COLS_SEL : LIST_COLS;
  const isUrl = s => /^https?:\/\//i.test(s);
  const sep = {borderRight:"1px solid var(--color-border-tertiary)"};
  return (
    <div onClick={onEdit} style={{display:"grid",gridTemplateColumns:cols,alignItems:"center",borderBottom:last?"none":"1px solid var(--color-border-tertiary)",cursor:readOnly?"default":"pointer",background:selected?"var(--color-background-secondary)":rowBg||"transparent"}}>
      {selectable && (
        <div style={{padding:"11px 10px",display:"flex",alignItems:"center",justifyContent:"center",...sep}}>
          <input type="checkbox" checked={!!selected} onChange={() => onSelect(task.id)} onClick={e=>e.stopPropagation()} style={{cursor:"pointer",margin:0}} />
        </div>
      )}
      {/* Task */}
      <div style={{padding:"11px 12px",minWidth:0,...sep}}>
        <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textDecoration:task.status==="Done"?"line-through":"none",opacity:task.status==="Done"?0.5:1}}>{task.title}</div>
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
      {/* Status */}
      <div style={{padding:"11px 12px",...sep}} onClick={e=>e.stopPropagation()}>
        <StatusPill status={task.status} onChange={s=>onStatus(task.id,s)} readOnly={readOnly} statusColors={statusColors}/>
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
      {/* Links */}
      <div style={{padding:"11px 12px",...sep}} onClick={e=>e.stopPropagation()}>
        {task.links
          ? isUrl(task.links)
            ? <a href={task.links} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"var(--color-text-secondary)",textDecoration:"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block"}}>↗ Link</a>
            : <span style={{fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block"}} title={task.links}>{task.links}</span>
          : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      {/* Notes */}
      <div style={{padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={task.notes||""}>{task.notes||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
    </div>
  );
}

// ── Milestone Bar ─────────────────────────────────────────────────────────────
export function MilestoneBar({milestones, tasks=[], onEdit}) {
  return (
    <div style={{marginBottom:16,display:"flex",gap:8,flexWrap:"wrap"}}>
      {[...milestones].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0).map(m => {
        const deps = (m.deps||[]).map(id => tasks.find(t=>t.id===id)).filter(Boolean);
        const doneCount = deps.filter(t=>t.status==="Done").length;
        const allDone = deps.length > 0 && doneCount === deps.length;
        return (
          <div key={m.id} onClick={onEdit?()=>onEdit(m):undefined} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:"var(--border-radius-md)",border:`1px solid ${allDone?"#9FE1CB":"#B5D4F4"}`,background:allDone?"#E1F5EE":"#E6F1FB",cursor:onEdit?"pointer":"default"}}>
            <span style={{color:allDone?"#0F6E56":"#185FA5",fontSize:12}}>◆</span>
            <span style={{fontSize:12,fontWeight:500,color:allDone?"#0F6E56":"#185FA5"}}>{m.title}</span>
            <span style={{fontSize:11,color:allDone?"#0F6E56":"#185FA5",opacity:0.7}}>{fmtDate(m.date)}</span>
            {deps.length > 0 && (
              <span style={{fontSize:11,padding:"1px 6px",borderRadius:10,background:allDone?"#C6F0E0":"#D0E8FC",color:allDone?"#0F6E56":"#185FA5",fontWeight:500}}>
                {doneCount}/{deps.length}
              </span>
            )}
          </div>
        );
      })}
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
const DOC_COLS     = "3fr 130px 130px 130px 110px 130px 130px 110px 115px 1fr";
const DOC_COLS_SEL = "36px 3fr 130px 130px 130px 110px 130px 130px 110px 115px 1fr";
const DOC_HEADERS  = ["Title","Owner","Content Owner","Assist","Audience","Editable Link","Shareable Link","Next Update","Last Updated","Tags"];
const sep = {borderRight:"1px solid var(--color-border-secondary)"};
const inp ={fontSize:12,width:"100%",boxSizing:"border-box",padding:"3px 6px",border:"1px solid var(--color-border-secondary)",borderRadius:4,background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontFamily:"inherit"};

const DOC_SORT_KEYS = [null,"owner","content_owner","assist","audience",null,null,"next_update","updated",null];

function DocListHeader({selectable,selectedAll,someSelected,onSelectAll,sort,onSort}) {
  const hCell = {background:"var(--color-background-secondary)",borderBottom:"1px solid var(--color-border-secondary)",position:"sticky",top:0,zIndex:2,display:"flex",alignItems:"center"};
  return (
    <div style={{display:"contents"}}>
      {selectable && (
        <div style={{...hCell,padding:"8px 10px",justifyContent:"center",...sep}}>
          <input type="checkbox" checked={selectedAll} ref={el=>{if(el)el.indeterminate=someSelected&&!selectedAll;}} onChange={onSelectAll} style={{cursor:"pointer",margin:0}}/>
        </div>
      )}
      {DOC_HEADERS.map((h,i) => {
        const key = DOC_SORT_KEYS[i];
        const active = sort.col === key;
        return (
          <div key={i} onClick={key?()=>onSort(key):undefined}
            style={{...hCell,padding:"8px 12px",fontSize:11,fontWeight:500,color:active?"var(--color-text-primary)":"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",cursor:key?"pointer":"default",userSelect:"none",gap:4,...(i<DOC_HEADERS.length-1?sep:{})}}>
            {h}
            {key&&<span style={{fontSize:10,opacity:active?1:0.35}}>{active?(sort.dir==="asc"?"▲":"▼"):"▲"}</span>}
          </div>
        );
      })}
    </div>
  );
}

function CopyLink({url}) {
  const [copied,setCopied] = useState(false);
  const copy = e => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500); });
  };
  return (
    <div onClick={copy} title={`Click to copy: ${url}`} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",minWidth:0,width:"100%"}}>
      <span style={{fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{url}</span>
      <span style={{fontSize:15,flexShrink:0,color:copied?"#0F6E56":"var(--color-text-tertiary)"}}>{copied?"✓":"⎘"}</span>
    </div>
  );
}

function DocListRow({doc,last,selectable,selected,onSelect,onOpen}) {
  const bb = last?"none":"1px solid var(--color-border-secondary)";
  const bg = selected?"var(--color-background-secondary)":"transparent";
  const c  = (extra={}) => ({background:bg,borderBottom:bb,display:"flex",alignItems:"center",cursor:"pointer",...extra});
  const open = () => onOpen(doc);
  return (
    <div style={{display:"contents"}}>
      {selectable && (
        <div style={{...c({cursor:"default"}),padding:"11px 10px",justifyContent:"center",...sep}} onClick={e=>{e.stopPropagation();onSelect(doc.id);}}>
          <input type="checkbox" checked={!!selected} onChange={()=>onSelect(doc.id)} style={{cursor:"pointer",margin:0}}/>
        </div>
      )}
      <div onClick={open} style={{...c(),padding:"11px 12px",minWidth:0,...sep}}>
        <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",wordBreak:"break-word",lineHeight:1.4}}>{doc.title}</div>
      </div>
      <div onClick={open} style={{...c(),padding:"11px 10px",...sep}}>
        {doc.owner?<span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:10,background:avatarBg(doc.owner),color:avatarTx(doc.owner),whiteSpace:"nowrap"}}>{doc.owner}</span>:<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div onClick={open} style={{...c(),padding:"11px 10px",...sep}}>
        {doc.content_owner?<Avatar name={doc.content_owner} size={26}/>:<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div onClick={open} style={{...c(),padding:"11px 10px",...sep}}>
        {doc.assist?<Avatar name={doc.assist} size={26}/>:<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div onClick={open} style={{...c(),padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0,...sep}} title={doc.audience||""}>{doc.audience||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
      <div style={{...c({cursor:"default"}),padding:"11px 12px",...sep}}>
        {doc.url?<a href={doc.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"var(--color-text-secondary)",textDecoration:"none"}} onClick={e=>e.stopPropagation()}>↗ Open</a>:<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div style={{...c({cursor:"default"}),padding:"11px 12px",minWidth:0,...sep}}>
        {doc.shareable_link?<CopyLink url={doc.shareable_link}/>:<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
      <div onClick={open} style={{...c(),padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",...sep}}>{fmtDate(doc.next_update)||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
      <div onClick={open} style={{...c(),padding:"11px 12px",fontSize:12,color:"var(--color-text-secondary)",...sep}}>{fmtDateYear(doc.updated)||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
      <div onClick={open} style={{...c(),padding:"11px 12px",flexWrap:"wrap",gap:4,...sep}}>
        {(doc.tags||[]).length>0?doc.tags.map(t=><span key={t} style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",whiteSpace:"nowrap"}}>{t}</span>):<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>}
      </div>
    </div>
  );
}

const BLANK_FILTERS = { owner:"All", contentOwner:"All", assist:"All", audience:"All", nextUpdate:"All", lastUpdated:"All", tag:"All" };
const DATE_FILTER_OPTS      = ["All","Has date","No date","Overdue","Next 30 days"];
const LAST_UPDATED_OPTS     = ["All","Has date","No date","Past 30 days","Past 90 days"];

export function CollateralView({docs,isReadOnly,onSave,onDelete,onDeleteSelected,onAddDoc,members,audiences,globalTags}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailDoc,   setDetailDoc]   = useState(null);
  const [filters,     setFilters]     = useState(BLANK_FILTERS);
  const [sort,        setSort]        = useState({col:"owner",dir:"asc"});
  const [search,      setSearch]      = useState("");
  const selectable = !isReadOnly;

  const today = new Date().toISOString().slice(0,10);

  const uniq = field => ["All",...Array.from(new Set(docs.map(d=>d[field]).filter(Boolean))).sort()];
  const ownerOpts        = uniq("owner");
  const contentOwnerOpts = uniq("content_owner");
  const assistOpts       = uniq("assist");
  const audienceOpts     = uniq("audience");
  const tagOpts          = ["All", ...Array.from(new Set(docs.flatMap(d => d.tags||[]))).sort()];

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

  const sq = search.trim().toLowerCase();
  const filteredDocs = docs.filter(d => {
    if (filters.owner        !== "All" && d.owner         !== filters.owner)        return false;
    if (filters.contentOwner !== "All" && d.content_owner !== filters.contentOwner) return false;
    if (filters.assist       !== "All" && d.assist        !== filters.assist)       return false;
    if (filters.audience     !== "All" && d.audience      !== filters.audience)     return false;
    if (!applyDateFilter(filters.nextUpdate,  d.next_update)) return false;
    if (!applyDateFilter(filters.lastUpdated, d.updated))     return false;
    if (filters.tag !== "All" && !(d.tags||[]).includes(filters.tag)) return false;
    if (sq && ![d.title,d.description,d.owner,d.content_owner,d.assist,d.audience,...(d.tags||[])].some(v=>v&&v.toLowerCase().includes(sq))) return false;
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
      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
        {!isReadOnly && onAddDoc && <button onClick={onAddDoc} style={{fontSize:13,padding:"5px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",cursor:"pointer",fontWeight:500,flexShrink:0}}>+ Add collateral</button>}
        <div style={{position:"relative",flexShrink:0}}>
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--color-text-tertiary)",pointerEvents:"none"}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search collateral…" style={{fontSize:13,padding:"5px 10px 5px 28px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",width:200}}/>
          {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:14,color:"var(--color-text-tertiary)",cursor:"pointer",lineHeight:1,padding:0}}>×</button>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginLeft:"auto"}}>
          <FilterDropdown label="Owner"         options={ownerOpts}         value={filters.owner}        onChange={v=>setFilter("owner",v)}/>
          <FilterDropdown label="Content Owner" options={contentOwnerOpts}  value={filters.contentOwner} onChange={v=>setFilter("contentOwner",v)}/>
          <FilterDropdown label="Assist"        options={assistOpts}        value={filters.assist}       onChange={v=>setFilter("assist",v)}/>
          <FilterDropdown label="Audience"      options={audienceOpts}      value={filters.audience}     onChange={v=>setFilter("audience",v)}/>
          <FilterDropdown label="Next Update"   options={DATE_FILTER_OPTS}  value={filters.nextUpdate}   onChange={v=>setFilter("nextUpdate",v)}/>
          <FilterDropdown label="Last Updated"  options={LAST_UPDATED_OPTS} value={filters.lastUpdated}  onChange={v=>setFilter("lastUpdated",v)}/>
          {tagOpts.length > 1 && <FilterDropdown label="Tag" options={tagOpts} value={filters.tag} onChange={v=>setFilter("tag",v)} align="right"/>}
          {anyFilter && <button onClick={()=>setFilters(BLANK_FILTERS)} style={{fontSize:12,padding:"5px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Clear</button>}
        </div>
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
      <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"clip",display:"grid",gridTemplateColumns:selectable?DOC_COLS_SEL:DOC_COLS}}>
        {displayDocs.length===0
          ? <div style={{padding:"16px",fontSize:13,color:"var(--color-text-tertiary)",gridColumn:"1/-1"}}>{anyFilter||sq?"No documents match the current filters.":"No documents."}</div>
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
// Avatar-based dropdown for Owner/Assist — matches how people are shown
// everywhere else in the app (initials avatar + name), which a native
// <select> can't render inside its options.
function PersonPicker({value, members, onChange}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);
  // Keep the current value selectable even if it's not in the members list
  // (e.g. legacy first-name-only entries like "Ali" vs. "Ali Schipani").
  const options = value && !members.includes(value) ? [value, ...members] : members;
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:6,fontSize:12,border:"1px solid var(--color-border-secondary)",borderRadius:4,padding:"3px 6px",background:"var(--color-background-primary)",color:"var(--color-text-primary)",cursor:"pointer",boxSizing:"border-box"}}>
        {value ? <><Avatar name={value} size={18}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</span></> : <span style={{color:"var(--color-text-tertiary)"}}>—</span>}
      </button>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 2px)",left:0,minWidth:180,maxHeight:220,overflowY:"auto",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,boxShadow:"0 4px 12px rgba(0,0,0,0.12)",zIndex:300}}>
          <div onClick={()=>{onChange("");setOpen(false);}} style={{padding:"6px 10px",fontSize:12,color:"var(--color-text-tertiary)",cursor:"pointer"}}>—</div>
          {options.map(m => (
            <div key={m} onClick={()=>{onChange(m);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",fontSize:12,cursor:"pointer",color:"var(--color-text-primary)"}}>
              <Avatar name={m} size={18}/><span>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RunOfShowView({sessions,runOfShow,setRunOfShow,onSaveRow,onDeleteRow,onToggleDone,members,profileIdByName={},isReadOnly}) {
  const professors = useMemo(() => [...new Set(sessions.map(s=>s.professor||s.name||"").filter(Boolean))].sort(), [sessions]);
  const [selProf,  setSelProf]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("ros_sel")||"{}").prof || professors[0] || ""; } catch {}
    return professors[0]||"";
  });
  const profSessions = useMemo(() => sessions.filter(s=>(s.professor||s.name||"")===(selProf||professors[0]||"")), [sessions,selProf,professors]);
  const [selDate,  setSelDate]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("ros_sel")||"{}").date || profSessions[0]?.id || ""; } catch {}
    return profSessions[0]?.id||"";
  });
  const selectedSession = selDate || profSessions[0]?.id || "";

  // Restore saved selection once sessions load from Supabase (handles reload before data arrives)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || professors.length === 0) return;
    restoredRef.current = true;
    try {
      const {prof, date} = JSON.parse(localStorage.getItem("ros_sel")||"{}");
      if (prof && professors.includes(prof)) {
        setSelProf(prof);
        const ps = sessions.filter(s=>(s.professor||s.name||"")===prof);
        setSelDate(date && ps.some(s=>s.id===date) ? date : ps[0]?.id||"");
      }
    } catch {}
  }, [professors]);

  // Persist current selection whenever it changes (covers default auto-selection too)
  useEffect(() => {
    if (!selProf && !selectedSession) return;
    try { localStorage.setItem("ros_sel", JSON.stringify({prof: selProf, date: selectedSession})); } catch {}
  }, [selProf, selectedSession]);

  const switchProf = prof => {
    setSelProf(prof);
    const first = sessions.filter(s=>(s.professor||s.name||"")===prof)[0];
    setSelDate(first?.id||"");
    setEditingRow(null); setEditVal({}); setExpandedRow(null); setSelectedIds(new Set());
  };
  const switchDate = id => {
    setSelDate(id);
    setEditingRow(null); setEditVal({}); setExpandedRow(null); setSelectedIds(new Set());
  };

  const [editingRow,  setEditingRow]  = useState(null);
  const [editVal,     setEditVal]     = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedRow, setExpandedRow] = useState(null);
  const [search,      setSearch]      = useState("");

  const rows = runOfShow[selectedSession]||[];
  const rsq  = search.trim().toLowerCase();
  const visibleRows = rsq ? rows.filter(r =>
    (r.event||"").toLowerCase().includes(rsq) ||
    (r.owner||"").toLowerCase().includes(rsq) ||
    (r.assist||"").toLowerCase().includes(rsq) ||
    (r.time||"").toLowerCase().includes(rsq) ||
    (r.notes||"").toLowerCase().includes(rsq)
  ) : rows;

  const newRow = () => {
    const id = "ri"+Date.now();
    const row = {id,time:"",event:"",owner:"",assist:"",notes:""};
    setRunOfShow(prev => ({...prev,[selectedSession]:[...(prev[selectedSession]||[]),row]}));
    setEditingRow(id);
    setEditVal(row);
    setExpandedRow(id);
  };

  const startEdit = (row, e) => {
    e?.stopPropagation();
    setEditingRow(row.id);
    setEditVal({...row});
    setExpandedRow(row.id);
  };

  const saveEdit = async () => {
    try {
      const saved = await onSaveRow(selectedSession, {...editVal});
      setRunOfShow(prev => ({...prev,[selectedSession]:(prev[selectedSession]||[]).map(r=>r.id===editingRow?saved:r)}));
      setEditingRow(null);
      setEditVal({});
    } catch(e) { console.error('Failed to save row', e); }
  };

  const deleteRow = async (id, e) => {
    e?.stopPropagation();
    setRunOfShow(prev => ({...prev,[selectedSession]:(prev[selectedSession]||[]).filter(r=>r.id!==id)}));
    if (expandedRow===id) setExpandedRow(null);
    try { await onDeleteRow(id); } catch(e) { console.error('Failed to delete row', e); }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => { const next=new Set(prev); next.has(id)?next.delete(id):next.add(id); return next; });
  };

  const toggleDone = (id, e) => {
    e.stopPropagation();
    const row = (runOfShow[selectedSession] || []).find(r => r.id === id);
    if (!row) return;
    const newDone = !row.done;
    setRunOfShow(prev => ({
      ...prev,
      [selectedSession]: (prev[selectedSession] || []).map(r => r.id === id ? { ...r, done: newDone } : r),
    }));
    if (onToggleDone && !String(id).startsWith('ri')) onToggleDone(id, newDone);
  };

  const allSelected  = rows.length > 0 && rows.every(r => selectedIds.has(r.id));
  const someSelected = rows.some(r => selectedIds.has(r.id));
  const selCount     = rows.filter(r => selectedIds.has(r.id)).length;

  const handleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map(r => r.id)));
  };

  const deleteSelected = async () => {
    const ids = rows.filter(r => selectedIds.has(r.id)).map(r => r.id);
    setRunOfShow(prev => ({...prev, [selectedSession]: (prev[selectedSession]||[]).filter(r => !ids.includes(r.id))}));
    setSelectedIds(new Set());
    if (expandedRow && ids.includes(expandedRow)) setExpandedRow(null);
    try { await Promise.all(ids.map(id => onDeleteRow(id))); } catch(e) { console.error('Failed to delete rows', e); }
  };

  const colLabels = ["Time","Task","Owner","Assist"];
  const taskColPx = useMemo(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return 200;
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const widths = [
      ctx.measureText('Task').width,
      ...rows.map(r => ctx.measureText(r.event || '').width),
    ];
    return Math.ceil(Math.max(80, ...widths)) + 24; // 24px for cell padding
  }, [rows]);
  const gridCols  = `36px 90px ${taskColPx}px 130px 130px 36px`;
  const sep = {borderRight:"1px solid var(--color-border-tertiary)"};

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        {sessions.length === 0
          ? <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>No sessions yet.</span>
          : <>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,color:"var(--color-text-secondary)",flexShrink:0}}>Professor:</span>
                <select value={selProf} onChange={e=>switchProf(e.target.value)} style={{fontSize:13,padding:"6px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}>
                  {professors.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,color:"var(--color-text-secondary)",flexShrink:0}}>Date:</span>
                <select value={selectedSession} onChange={e=>switchDate(e.target.value)} style={{fontSize:13,padding:"6px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}>
                  {profSessions.map(s=><option key={s.id} value={s.id}>{s.date?fmtDate(s.date):s.cohort||"(no date)"}</option>)}
                </select>
              </div>
            </>
        }
        <div style={{position:"relative",marginLeft:"auto"}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--color-text-tertiary)",pointerEvents:"none"}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{fontSize:13,padding:"5px 10px 5px 26px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",width:160}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:14,color:"var(--color-text-tertiary)",cursor:"pointer",padding:0,lineHeight:1}}>×</button>}
        </div>
        {!isReadOnly && selectedSession && <button onClick={newRow} style={{fontSize:13,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",cursor:"pointer"}}>+ Add row</button>}
      </div>

      {!isReadOnly && rows.length > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          {someSelected ? (
            <>
              <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{selCount} of {rows.length} selected</span>
              {!allSelected && <button onClick={handleSelectAll} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Select all {rows.length}</button>}
              <button onClick={deleteSelected} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer"}}>Delete {selCount === 1 ? "row" : `${selCount} rows`}</button>
              <button onClick={()=>setSelectedIds(new Set())} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Clear</button>
            </>
          ) : (
            <button onClick={handleSelectAll} style={{fontSize:12,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Select all</button>
          )}
        </div>
      )}

      <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"clip",width:"fit-content"}}>
        {/* Header */}
        <div style={{display:"grid",gridTemplateColumns:gridCols,borderBottom:"1px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",position:"sticky",top:0,zIndex:2}}>
          <div style={{padding:"8px 10px",display:"flex",alignItems:"center",justifyContent:"center",...sep}}>
            {!isReadOnly && rows.length > 0 && <input type="checkbox" checked={allSelected} ref={el=>{if(el)el.indeterminate=someSelected&&!allSelected;}} onChange={handleSelectAll} style={{cursor:"pointer",margin:0}}/>}
          </div>
          {colLabels.map((l,i) => (
            <div key={l} style={{padding:"8px 12px",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",...sep}}>{l}</div>
          ))}
          <div/>
        </div>

        {rows.length===0 && <div style={{padding:"16px",fontSize:13,color:"var(--color-text-tertiary)"}}>No run of show entries for this session yet.</div>}
        {rows.length>0 && visibleRows.length===0 && <div style={{padding:"16px",fontSize:13,color:"var(--color-text-tertiary)"}}>No entries match the search.</div>}

        {visibleRows.map((row, ri) => {
          const selected = selectedIds.has(row.id);
          const done     = !!row.done;
          const editing  = editingRow === row.id;
          const expanded = expandedRow === row.id;
          const isLast   = ri === visibleRows.length - 1;
          const doneStyle = done ? {textDecoration:"line-through", opacity:0.45} : {};

          return (
            <div key={row.id} style={{borderBottom:isLast?"none":"1px solid var(--color-border-tertiary)",background:selected?"#F5F3FF":"transparent"}}>
              {/* Main row */}
              {editing ? (
                <div style={{display:"grid",gridTemplateColumns:gridCols,alignItems:"center"}}>
                  <div style={{padding:"6px 10px",display:"flex",alignItems:"center",justifyContent:"center",...sep}}>
                    <input type="checkbox" checked={selected} onChange={e=>toggleSelect(row.id,e)} style={{cursor:"pointer",margin:0}}/>
                  </div>
                  <div style={{padding:"6px 8px",...sep}}>
                    <input value={editVal.time||""} onChange={e=>setEditVal(v=>({...v,time:e.target.value}))} placeholder="Time" style={{width:"100%",fontSize:12,border:"1px solid var(--color-border-secondary)",borderRadius:4,padding:"3px 6px",boxSizing:"border-box",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
                  </div>
                  <div style={{padding:"6px 8px",...sep}}>
                    <input value={editVal.event||""} onChange={e=>setEditVal(v=>({...v,event:e.target.value}))} placeholder="Event" style={{width:"100%",fontSize:12,border:"1px solid var(--color-border-secondary)",borderRadius:4,padding:"3px 6px",boxSizing:"border-box",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
                  </div>
                  <div style={{padding:"6px 8px",...sep}}>
                    <PersonPicker value={editVal.owner||""} members={members} onChange={name=>setEditVal(v=>({...v,owner:name,owner_id:name?(profileIdByName[name.trim().toLowerCase()]||null):null}))}/>
                  </div>
                  <div style={{padding:"6px 8px",...sep}}>
                    <PersonPicker value={editVal.assist||""} members={members} onChange={name=>setEditVal(v=>({...v,assist:name,assist_id:name?(profileIdByName[name.trim().toLowerCase()]||null):null}))}/>
                  </div>
                  <div/>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:gridCols,alignItems:"center",cursor:"pointer",background:expanded?"var(--color-background-secondary)":"transparent"}} onClick={()=>setExpandedRow(expanded?null:row.id)}>
                  <div style={{padding:"10px",display:"flex",alignItems:"center",justifyContent:"center",...sep}} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected} onChange={e=>toggleSelect(row.id,e)} style={{cursor:"pointer",margin:0}}/>
                  </div>
                  <div style={{padding:"10px 12px",fontSize:13,color:"var(--color-text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",...sep,...doneStyle}}>{row.time||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
                  <div style={{padding:"10px 12px",fontSize:13,color:"var(--color-text-primary)",whiteSpace:"nowrap",...sep,...doneStyle}}>{row.event||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</div>
                  <div style={{padding:"10px 12px",...sep}}>
                    {row.owner ? <div style={{display:"flex",alignItems:"center",gap:6,...doneStyle}}><Avatar name={row.owner} size={20}/><span style={{fontSize:12}}>{row.owner}</span></div> : <span style={{color:"var(--color-text-tertiary)"}}>—</span>}
                  </div>
                  <div style={{padding:"10px 12px",...sep}}>
                    {row.assist ? <div style={{display:"flex",alignItems:"center",gap:6,...doneStyle}}><Avatar name={row.assist} size={20}/><span style={{fontSize:12}}>{row.assist}</span></div> : <span style={{color:"var(--color-text-tertiary)"}}>—</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>toggleDone(row.id,e)}>
                    <span title={done?"Mark incomplete":"Mark complete"} style={{fontSize:16,lineHeight:1,cursor:"pointer",color:done?"#0F6E56":"var(--color-border-secondary)",userSelect:"none"}}>✓</span>
                  </div>
                </div>
              )}

              {/* Expanded / edit panel */}
              {(editing || expanded) && (
                <div style={{padding:"10px 14px 12px 48px",background:"var(--color-background-secondary)",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                  {editing ? (
                    <>
                      <textarea
                        value={editVal.notes||""}
                        onChange={e=>setEditVal(v=>({...v,notes:e.target.value}))}
                        placeholder="Notes…"
                        rows={2}
                        style={{width:"100%",fontSize:12,border:"1px solid var(--color-border-secondary)",borderRadius:4,padding:"6px 8px",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",background:"var(--color-background-primary)",color:"var(--color-text-primary)",marginBottom:8}}
                      />
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={saveEdit} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"1px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer"}}>Save</button>
                        <button onClick={()=>{setEditingRow(null);setEditVal({});}} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
                        <button onClick={e=>deleteRow(row.id,e)} style={{fontSize:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer",marginLeft:"auto"}}>Delete</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:13,color:row.notes?"var(--color-text-secondary)":"var(--color-text-tertiary)",fontStyle:row.notes?"normal":"italic",lineHeight:1.5,marginBottom:!isReadOnly?8:0}}>
                        {row.notes||"No notes."}
                      </div>
                      {!isReadOnly && (
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={e=>startEdit(row,e)} style={{fontSize:11,padding:"2px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Edit</button>
                          <button onClick={e=>deleteRow(row.id,e)} style={{fontSize:11,padding:"2px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid #F7C1C1",background:"transparent",color:"#A32D2D",cursor:"pointer"}}>Delete</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
