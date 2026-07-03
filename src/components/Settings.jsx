import { useState, useEffect } from "react";
import { Toggle } from "./Primitives.jsx";
import * as db from "../lib/db.js";
import { useIsMobile } from "../utils.js";
import { STATUSES, DEFAULT_STATUS_COLORS, VIEWS, VIEW_LABELS, DEFAULT_PREFS } from "../constants.js";

const TIMEZONES = [
  { value: "America/New_York",       label: "Eastern Time (ET) — New York" },
  { value: "America/Chicago",        label: "Central Time (CT) — Chicago" },
  { value: "America/Denver",         label: "Mountain Time (MT) — Denver" },
  { value: "America/Los_Angeles",    label: "Pacific Time (PT) — Los Angeles" },
  { value: "America/Anchorage",      label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu",       label: "Hawaii Time (HST)" },
  { value: "America/Puerto_Rico",    label: "Atlantic Time (AST) — Puerto Rico" },
  { value: "America/Toronto",        label: "Eastern Time (ET) — Toronto" },
  { value: "America/Vancouver",      label: "Pacific Time (PT) — Vancouver" },
  { value: "America/Sao_Paulo",      label: "Brasília Time (BRT)" },
  { value: "Europe/London",          label: "London (GMT/BST)" },
  { value: "Europe/Paris",           label: "Central European (CET) — Paris" },
  { value: "Europe/Berlin",          label: "Central European (CET) — Berlin" },
  { value: "Europe/Moscow",          label: "Moscow Time (MSK)" },
  { value: "Africa/Johannesburg",    label: "South Africa (SAST)" },
  { value: "Asia/Dubai",             label: "Gulf Time (GST) — Dubai" },
  { value: "Asia/Kolkata",           label: "India (IST)" },
  { value: "Asia/Bangkok",           label: "Indochina Time (ICT)" },
  { value: "Asia/Singapore",         label: "Singapore (SGT)" },
  { value: "Asia/Shanghai",          label: "China (CST)" },
  { value: "Asia/Tokyo",             label: "Japan (JST)" },
  { value: "Asia/Seoul",             label: "Korea (KST)" },
  { value: "Australia/Sydney",       label: "Sydney (AEST)" },
  { value: "Pacific/Auckland",       label: "New Zealand (NZST)" },
  { value: "UTC",                    label: "UTC" },
];
import { avatarBg, avatarTx, initials } from "../utils.js";

// ── Section Head ──────────────────────────────────────────────────────────────
export function SectionHead({children}) {
  return <div style={{fontSize:12,fontWeight:500,color:"#888780",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10,marginTop:8}}>{children}</div>;
}

// ── Pref Row ──────────────────────────────────────────────────────────────────
export function PrefRow({label,children}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:8,border:"0.5px solid #e0e3e6",background:"#f8f9fa",marginBottom:8}}>
      <span style={{fontSize:13,color:"#1a1a18"}}>{label}</span>
      {children}
    </div>
  );
}

// ── Integration Row ───────────────────────────────────────────────────────────
export function IntegrationRow({icon,name,description,connected,onToggle}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,border:"0.5px solid #e0e3e6",background:"#f8f9fa",marginBottom:8}}>
      <span style={{fontSize:20}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:500,color:"#1a1a18"}}>{name}</div>
        <div style={{fontSize:11,color:"#888780"}}>{description}</div>
      </div>
      {connected
        ? <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#E1F5EE",color:"#0F6E56"}}>Connected</span>
            <button onClick={()=>onToggle(false)} style={{fontSize:12,padding:"4px 10px",borderRadius:6,border:"0.5px solid #787878",background:"transparent",color:"#888780",cursor:"pointer"}}>Disconnect</button>
          </div>
        : <button onClick={()=>onToggle(true)} style={{fontSize:12,padding:"5px 12px",borderRadius:6,border:"0.5px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer",fontWeight:500}}>Connect</button>
      }
    </div>
  );
}

// ── User Preferences ──────────────────────────────────────────────────────────
export function UserPreferences({myUser,prefs,updatePrefs}) {
  const [desktopStatus,setDesktopStatus] = useState(Notification.permission);
  const isMobile = useIsMobile();
  const requestDesktop = async () => {
    const p = await Notification.requestPermission();
    setDesktopStatus(p);
    updatePrefs("desktopNotifications", p==="granted");
  };
  const updateNotif = (key,channel,val) => updatePrefs("notifications",{...prefs.notifications,[key]:{...prefs.notifications[key],[channel]:val}});
  const updateStatusColor = (status,field,val) => updatePrefs("statusColors",{...prefs.statusColors,[status]:{...prefs.statusColors[status],[field]:val}});
  const notifRows = [
    ["dependencyResolved","Dependency resolved"],
    ["taskAssigned","Task assigned to me"],
    ["atRisk","Dependent task at risk"],
    ["dueSoon","Due date approaching"]
  ];
  return (
    <div>
      <div style={{fontSize:13,fontWeight:500,color:"#5f5e5a",marginBottom:12}}>Viewing as: {myUser}</div>
      <SectionHead>Appearance</SectionHead>
      <PrefRow label="Dark mode"><Toggle value={prefs.darkMode} onChange={v=>updatePrefs("darkMode",v)}/></PrefRow>
      <PrefRow label="Default view">
        <select value={prefs.defaultView} onChange={e=>updatePrefs("defaultView",e.target.value)} style={{fontSize:13,border:"1px solid #787878",borderRadius:6,padding:"4px 8px",color:"#1a1a18",background:"#fff",width:"auto"}}>
          {VIEWS.map(v => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}
        </select>
      </PrefRow>
      <PrefRow label="Time zone">
        <select value={prefs.timezone || "America/New_York"} onChange={e=>updatePrefs("timezone",e.target.value)} style={{fontSize:13,border:"1px solid #787878",borderRadius:6,padding:"4px 8px",color:"#1a1a18",background:"#fff",width:"auto",maxWidth:260}}>
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </PrefRow>
      <SectionHead>Status colors</SectionHead>
      {STATUSES.map(s => {
        const sc = prefs.statusColors[s]||DEFAULT_STATUS_COLORS[s];
        return (
          <div key={s} style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?8:12,padding:"10px 14px",borderRadius:8,border:"0.5px solid #e0e3e6",background:"#f8f9fa",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{flex:1,fontSize:13,color:"#1a1a18"}}>{s}</span>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`,fontWeight:500,flexShrink:0}}>{s}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:isMobile?"flex-start":undefined}}>
              {[["bg","Fill"],["color","Text"],["border","Border"]].map(([f,l]) => (
                <div key={f} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:10,color:"#888780"}}>{l}</span>
                  <input type="color" value={sc[f]} onChange={e=>updateStatusColor(s,f,e.target.value)} style={{width:28,height:28,border:"0.5px solid #787878",borderRadius:4,cursor:"pointer",padding:2,background:"none"}}/>
                </div>
              ))}
              <button onClick={()=>updatePrefs("statusColors",{...prefs.statusColors,[s]:{...DEFAULT_STATUS_COLORS[s]}})} style={{fontSize:11,padding:"2px 8px",borderRadius:6,border:"0.5px solid #787878",background:"transparent",color:"#888780",cursor:"pointer",marginLeft:isMobile?"auto":0}}>Reset</button>
            </div>
          </div>
        );
      })}
      <SectionHead>Notifications</SectionHead>
      <div style={{display:"grid",gridTemplateColumns:"1fr 60px 60px",gap:8,padding:"6px 14px",marginBottom:4}}>
        <span style={{fontSize:11,color:"#888780",textTransform:"uppercase",letterSpacing:"0.04em"}}>Event</span>
        <span style={{fontSize:11,color:"#888780",textTransform:"uppercase",letterSpacing:"0.04em",textAlign:"center"}}>In-app</span>
        <span style={{fontSize:11,color:"#888780",textTransform:"uppercase",letterSpacing:"0.04em",textAlign:"center"}}>Email</span>
      </div>
      {notifRows.map(([key,label]) => (
        <div key={key} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px",gap:8,alignItems:"center",padding:"8px 14px",borderRadius:8,border:"0.5px solid #e0e3e6",background:"#f8f9fa",marginBottom:6}}>
          <span style={{fontSize:13,color:"#1a1a18"}}>{label}</span>
          <div style={{display:"flex",justifyContent:"center"}}><Toggle value={prefs.notifications[key]?.inApp||false} onChange={v=>updateNotif(key,"inApp",v)}/></div>
          <div style={{display:"flex",justifyContent:"center"}}><Toggle value={prefs.notifications[key]?.email||false} onChange={v=>updateNotif(key,"email",v)}/></div>
        </div>
      ))}
      <PrefRow label="Desktop notifications">
        {desktopStatus==="granted"
          ? <Toggle value={prefs.desktopNotifications} onChange={v=>updatePrefs("desktopNotifications",v)}/>
          : <button onClick={requestDesktop} style={{fontSize:12,padding:"5px 12px",borderRadius:6,border:"0.5px solid #787878",background:"#eaecef",color:"#5f5e5a",cursor:"pointer"}}>Enable</button>
        }
      </PrefRow>
      <SectionHead>Integrations</SectionHead>
      <IntegrationRow icon="📅" name="Google Calendar" description="Sync task due dates" connected={prefs.googleCalendar} onToggle={v=>updatePrefs("googleCalendar",v)}/>
      <IntegrationRow icon="📁" name="Google Drive" description="Browse and attach files" connected={prefs.googleDrive} onToggle={v=>updatePrefs("googleDrive",v)}/>
    </div>
  );
}

// ── List Editor ───────────────────────────────────────────────────────────────
export function ListEditor({label,items,setItems}) {
  const [input,setInput] = useState("");
  const [editing,setEditing] = useState(null);
  const [editVal,setEditVal] = useState("");
  const add = () => { const v=input.trim(); if(v&&!items.includes(v)){setItems([...items,v]);setInput("");} };
  const remove = item => setItems(items.filter(i=>i!==item));
  const startEdit = item => { setEditing(item); setEditVal(item); };
  const saveEdit = () => { const v=editVal.trim(); if(v&&v!==editing&&!items.includes(v))setItems(items.map(i=>i===editing?v:i)); setEditing(null); setEditVal(""); };
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder={`Add new ${label.toLowerCase()}...`} style={{flex:1,fontSize:13,padding:"7px 12px",borderRadius:6,border:"1px solid #787878",color:"#1a1a18",background:"#fff"}}/>
        <button onClick={add} disabled={!input.trim()} style={{fontSize:13,padding:"7px 16px",borderRadius:6,border:"1px solid #595959",background:input.trim()?"#eaecef":"#eaecef",color:input.trim()?"#2c2c2a":"#595959",cursor:input.trim()?"pointer":"default"}}>Add</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {items.map(item => (
          <div key={item} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:6,border:"0.5px solid #e0e3e6",background:"#f8f9fa"}}>
            {editing===item
              ? <>
                  <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setEditing(null);}} style={{flex:1,fontSize:13,padding:"4px 8px",borderRadius:4,border:"1px solid #595959",color:"#1a1a18",background:"#fff"}}/>
                  <button onClick={saveEdit} style={{fontSize:12,padding:"3px 10px",borderRadius:4,border:"1px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer"}}>Save</button>
                  <button onClick={()=>setEditing(null)} style={{fontSize:12,padding:"3px 10px",borderRadius:4,border:"0.5px solid #787878",background:"transparent",color:"#888780",cursor:"pointer"}}>Cancel</button>
                </>
              : <>
                  <span style={{flex:1,fontSize:13,color:"#1a1a18"}}>{item}</span>
                  <button onClick={()=>startEdit(item)} style={{fontSize:12,padding:"3px 10px",borderRadius:4,border:"0.5px solid #787878",background:"transparent",color:"#5f5e5a",cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>remove(item)} style={{fontSize:12,padding:"3px 10px",borderRadius:4,border:"0.5px solid #F7C1C1",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer"}}>Delete</button>
                </>
            }
          </div>
        ))}
        {items.length===0&&<div style={{fontSize:13,color:"#888780",padding:"8px 0"}}>No {label.toLowerCase()}s yet.</div>}
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
// ── Team & Roles (admin only) ─────────────────────────────────────────────────
const ROLE_OPTIONS = [
  ["admin",  "Admin — full control, incl. cycles & config"],
  ["staff",  "Staff — day-to-day tasks, docs, sessions"],
  ["viewer", "Viewer — read-only, no editing"],
];

export function TeamRoles({ myUserId }) {
  const [profiles, setProfiles] = useState(null); // null = loading
  const [error, setError]       = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    db.fetchAllProfiles().then(setProfiles).catch(e => setError(e.message));
  }, []);

  const changeRole = async (userId, role, currentRole) => {
    if (userId === myUserId && role !== "admin") {
      const ok = window.confirm("You're about to remove your own admin access. You won't be able to undo this yourself. Continue?");
      if (!ok) return;
    }
    setSavingId(userId);
    setError("");
    // Optimistic update
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role } : p));
    try {
      await db.updateProfileRole(userId, role);
    } catch (e) {
      setError(e.message);
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: currentRole } : p));
    } finally {
      setSavingId(null);
    }
  };

  if (profiles === null) {
    return <div style={{ fontSize: 13, color: "#888780" }}>Loading team…</div>;
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: "#888780", marginBottom: 12 }}>
        Controls who can view vs. edit vs. manage cycles. Changes take effect immediately for that person.
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "#A32D2D", padding: "8px 12px", background: "#FCEBEB", borderRadius: 8, border: "0.5px solid #F7C1C1", marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {profiles.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, border: "0.5px solid #e0e3e6", background: "#f8f9fa", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#1a1a18", fontWeight: 500 }}>{p.name}{p.id === myUserId ? " (you)" : ""}</div>
              <div style={{ fontSize: 12, color: "#888780", overflow: "hidden", textOverflow: "ellipsis" }}>{p.email}</div>
            </div>
            <select
              value={p.role || "staff"}
              disabled={savingId === p.id}
              onChange={e => changeRole(p.id, e.target.value, p.role)}
              style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "0.5px solid #d3d1c7", background: "#fff", color: "#1a1a18", flexShrink: 0 }}
            >
              {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}


export function SettingsModal({initialTab,members,setMembers,departments,setDepartments,audiences,setAudiences,globalTags,setGlobalTags,myUser,myUserId,isAdmin,prefs,updatePrefs,onClose}) {
  const [tab,setTab] = useState((initialTab && (isAdmin || initialTab === "preferences")) ? initialTab : "preferences");
  const isMobile = useIsMobile();
  const tabs = isAdmin
    ? [["preferences","My Preferences"],["team","Team & Roles"],["owners","Owners"],["departments","Departments"],["audiences","Audiences"],["tags","Tags"]]
    : [["preferences","My Preferences"]];
  const lc = {
    owners:      {label:"Owner",      items:members,     setItems:setMembers},
    departments: {label:"Department", items:departments, setItems:setDepartments},
    audiences:   {label:"Audience",   items:audiences,   setItems:setAudiences},
    tags:        {label:"Tag",        items:globalTags,  setItems:setGlobalTags},
  };
  return (
    <div style={{position:"fixed",inset:0,background:isMobile?"#ffffff":"rgba(0,0,0,0.45)",display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",zIndex:500}}>
      <div style={{background:"#ffffff",borderRadius:isMobile?0:12,border:isMobile?"none":"1px solid #e0e3e6",width:"100%",maxWidth:isMobile?"none":580,height:isMobile?"100%":undefined,maxHeight:isMobile?"100%":"90vh",display:"flex",flexDirection:"column",boxSizing:"border-box",boxShadow:isMobile?"none":"0 8px 32px rgba(0,0,0,0.18)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:isMobile?"14px 16px":"18px 24px 16px",borderBottom:"1px solid #e0e3e6",flexShrink:0}}>
          <span style={{fontSize:16,fontWeight:500,color:"#1a1a18"}}>Settings</span>
          <button onClick={onClose} style={{background:"#eaecef",border:"none",borderRadius:8,width:isMobile?36:28,height:isMobile?36:28,fontSize:isMobile?20:16,color:"#888780",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid #e0e3e6",flexShrink:0,overflowX:"auto"}}>
          {tabs.map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{fontSize:13,padding:"10px 16px",border:"none",borderBottom:tab===k?"2px solid #1a1a18":"2px solid transparent",background:"transparent",color:tab===k?"#1a1a18":"#888780",cursor:"pointer",fontWeight:tab===k?500:400,whiteSpace:"nowrap",flexShrink:0}}>{l}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:isMobile?"16px":"20px 24px 24px",background:"#ffffff",color:"#1a1a18"}}>
          {tab==="preferences"
            ? <UserPreferences myUser={myUser} prefs={prefs} updatePrefs={updatePrefs}/>
            : tab==="team"
            ? <TeamRoles myUserId={myUserId}/>
            : <ListEditor label={lc[tab].label} items={lc[tab].items} setItems={lc[tab].setItems}/>
          }
        </div>
      </div>
    </div>
  );
}
