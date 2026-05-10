import { useState } from "react";
import { Toggle } from "./Primitives.jsx";
import { STATUSES, DEFAULT_STATUS_COLORS, VIEWS, VIEW_LABELS, DEFAULT_PREFS } from "../constants.js";
import { avatarBg, avatarTx, initials } from "../utils.js";

// ── Section Head ──────────────────────────────────────────────────────────────
export function SectionHead({children}) {
  return <div style={{fontSize:12,fontWeight:500,color:"#888780",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10,marginTop:8}}>{children}</div>;
}

// ── Pref Row ──────────────────────────────────────────────────────────────────
export function PrefRow({label,children}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:8,border:"0.5px solid #e8e5de",background:"#fafaf8",marginBottom:8}}>
      <span style={{fontSize:13,color:"#1a1a18"}}>{label}</span>
      {children}
    </div>
  );
}

// ── Integration Row ───────────────────────────────────────────────────────────
export function IntegrationRow({icon,name,description,connected,onToggle}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,border:"0.5px solid #e8e5de",background:"#fafaf8",marginBottom:8}}>
      <span style={{fontSize:20}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:500,color:"#1a1a18"}}>{name}</div>
        <div style={{fontSize:11,color:"#888780"}}>{description}</div>
      </div>
      {connected
        ? <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#E1F5EE",color:"#0F6E56"}}>Connected</span>
            <button onClick={()=>onToggle(false)} style={{fontSize:12,padding:"4px 10px",borderRadius:6,border:"0.5px solid #d3d1c7",background:"transparent",color:"#888780",cursor:"pointer"}}>Disconnect</button>
          </div>
        : <button onClick={()=>onToggle(true)} style={{fontSize:12,padding:"5px 12px",borderRadius:6,border:"0.5px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer",fontWeight:500}}>Connect</button>
      }
    </div>
  );
}

// ── User Preferences ──────────────────────────────────────────────────────────
export function UserPreferences({myUser,prefs,updatePrefs}) {
  const [desktopStatus,setDesktopStatus] = useState(Notification.permission);
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
        <select value={prefs.defaultView} onChange={e=>updatePrefs("defaultView",e.target.value)} style={{fontSize:13,border:"1px solid #d3d1c7",borderRadius:6,padding:"4px 8px",color:"#1a1a18",background:"#fff",width:"auto"}}>
          {VIEWS.map(v => <option key={v} value={v}>{VIEW_LABELS[v]}</option>)}
        </select>
      </PrefRow>
      <SectionHead>Status colors</SectionHead>
      {STATUSES.map(s => {
        const sc = prefs.statusColors[s]||DEFAULT_STATUS_COLORS[s];
        return (
          <div key={s} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,border:"0.5px solid #e8e5de",background:"#fafaf8",marginBottom:8}}>
            <span style={{flex:1,fontSize:13,color:"#1a1a18"}}>{s}</span>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`,fontWeight:500}}>{s}</span>
            {[["bg","Fill"],["color","Text"],["border","Border"]].map(([f,l]) => (
              <div key={f} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <span style={{fontSize:10,color:"#888780"}}>{l}</span>
                <input type="color" value={sc[f]} onChange={e=>updateStatusColor(s,f,e.target.value)} style={{width:28,height:28,border:"0.5px solid #d3d1c7",borderRadius:4,cursor:"pointer",padding:2,background:"none"}}/>
              </div>
            ))}
            <button onClick={()=>updatePrefs("statusColors",{...prefs.statusColors,[s]:{...DEFAULT_STATUS_COLORS[s]}})} style={{fontSize:11,padding:"2px 8px",borderRadius:6,border:"0.5px solid #d3d1c7",background:"transparent",color:"#888780",cursor:"pointer"}}>Reset</button>
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
        <div key={key} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px",gap:8,alignItems:"center",padding:"8px 14px",borderRadius:8,border:"0.5px solid #e8e5de",background:"#fafaf8",marginBottom:6}}>
          <span style={{fontSize:13,color:"#1a1a18"}}>{label}</span>
          <div style={{display:"flex",justifyContent:"center"}}><Toggle value={prefs.notifications[key]?.inApp||false} onChange={v=>updateNotif(key,"inApp",v)}/></div>
          <div style={{display:"flex",justifyContent:"center"}}><Toggle value={prefs.notifications[key]?.email||false} onChange={v=>updateNotif(key,"email",v)}/></div>
        </div>
      ))}
      <PrefRow label="Desktop notifications">
        {desktopStatus==="granted"
          ? <Toggle value={prefs.desktopNotifications} onChange={v=>updatePrefs("desktopNotifications",v)}/>
          : <button onClick={requestDesktop} style={{fontSize:12,padding:"5px 12px",borderRadius:6,border:"0.5px solid #d3d1c7",background:"#f1efe8",color:"#5f5e5a",cursor:"pointer"}}>Enable</button>
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
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder={`Add new ${label.toLowerCase()}...`} style={{flex:1,fontSize:13,padding:"7px 12px",borderRadius:6,border:"1px solid #d3d1c7",color:"#1a1a18",background:"#fff"}}/>
        <button onClick={add} disabled={!input.trim()} style={{fontSize:13,padding:"7px 16px",borderRadius:6,border:"1px solid #b4b2a9",background:input.trim()?"#f1efe8":"#f5f3ee",color:input.trim()?"#2c2c2a":"#b4b2a9",cursor:input.trim()?"pointer":"default"}}>Add</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {items.map(item => (
          <div key={item} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:6,border:"0.5px solid #e8e5de",background:"#fafaf8"}}>
            {editing===item
              ? <>
                  <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setEditing(null);}} style={{flex:1,fontSize:13,padding:"4px 8px",borderRadius:4,border:"1px solid #b4b2a9",color:"#1a1a18",background:"#fff"}}/>
                  <button onClick={saveEdit} style={{fontSize:12,padding:"3px 10px",borderRadius:4,border:"1px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer"}}>Save</button>
                  <button onClick={()=>setEditing(null)} style={{fontSize:12,padding:"3px 10px",borderRadius:4,border:"0.5px solid #d3d1c7",background:"transparent",color:"#888780",cursor:"pointer"}}>Cancel</button>
                </>
              : <>
                  <span style={{flex:1,fontSize:13,color:"#1a1a18"}}>{item}</span>
                  <button onClick={()=>startEdit(item)} style={{fontSize:12,padding:"3px 10px",borderRadius:4,border:"0.5px solid #d3d1c7",background:"transparent",color:"#5f5e5a",cursor:"pointer"}}>Edit</button>
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
export function SettingsModal({initialTab,members,setMembers,departments,setDepartments,audiences,setAudiences,globalTags,setGlobalTags,myUser,prefs,updatePrefs,onClose}) {
  const [tab,setTab] = useState(initialTab||"owners");
  const tabs = [["preferences","My Preferences"],["owners","Owners"],["departments","Departments"],["audiences","Audiences"],["tags","Tags"]];
  const lc = {
    owners:      {label:"Owner",      items:members,     setItems:setMembers},
    departments: {label:"Department", items:departments, setItems:setDepartments},
    audiences:   {label:"Audience",   items:audiences,   setItems:setAudiences},
    tags:        {label:"Tag",        items:globalTags,  setItems:setGlobalTags},
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}}>
      <div style={{background:"#ffffff",borderRadius:12,border:"1px solid #e0ddd6",width:"100%",maxWidth:580,maxHeight:"90vh",display:"flex",flexDirection:"column",boxSizing:"border-box",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px 16px",borderBottom:"1px solid #eeebe4",flexShrink:0}}>
          <span style={{fontSize:16,fontWeight:500,color:"#1a1a18"}}>Settings</span>
          <button onClick={onClose} style={{background:"#f5f3ee",border:"none",borderRadius:6,width:28,height:28,fontSize:16,color:"#888780",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid #eeebe4",flexShrink:0,overflowX:"auto"}}>
          {tabs.map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{fontSize:13,padding:"10px 16px",border:"none",borderBottom:tab===k?"2px solid #1a1a18":"2px solid transparent",background:"transparent",color:tab===k?"#1a1a18":"#888780",cursor:"pointer",fontWeight:tab===k?500:400,whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px 24px",background:"#ffffff",color:"#1a1a18"}}>
          {tab==="preferences"
            ? <UserPreferences myUser={myUser} prefs={prefs} updatePrefs={updatePrefs}/>
            : <ListEditor label={lc[tab].label} items={lc[tab].items} setItems={lc[tab].setItems}/>
          }
        </div>
      </div>
    </div>
  );
}
