import { useState } from "react";
import { Modal, Field } from "../Primitives.jsx";
import { addDays, isFlagged } from "../../utils.js";

export function CycleModal({tasks,activeCycle,initialDraft,sessions,onSaveDraft,onLaunch,onClose,cycleType:propCycleType="spring"}) {
  const cycleType = initialDraft?.cycleType || propCycleType;
  const typeLabel = cycleType === "fall" ? "Fall" : "Spring";

  const [name,setName] = useState(initialDraft?.cycle.name||"");
  const [start,setStart] = useState(initialDraft?.cycle.start||"");
  const [end,setEnd] = useState(initialDraft?.cycle.end||"");
  const [holidays,setHolidays] = useState(initialDraft?.cycle.holidays||[]);
  const [holidayInput,setHolidayInput] = useState("");
  const [overrides,setOverrides] = useState(initialDraft?.overrides||{});
  const [step,setStep] = useState(1);
  const [numSessions,setNumSessions] = useState(sessions.length||18);
  const [sessionDates,setSessionDates] = useState(() => sessions.map(s=>({...s})));

  const preview = start ? tasks.map(t => {
    const off = cycleType === "fall" ? (t.fallOffset ?? t.offset ?? 0) : (t.offset || 0);
    const raw = addDays(start,off);
    const due = overrides[t.id]!==undefined ? overrides[t.id] : raw;
    return {...t,due,flagged:isFlagged(due,holidays),effectiveOffset:off};
  }) : [];
  const flaggedCount = preview.filter(t=>t.flagged).length;

  const addHoliday = () => {
    const d=holidayInput.trim();
    if(d&&!holidays.includes(d)) setHolidays(h=>[...h,d]);
    setHolidayInput("");
  };

  const currentOverrides = () => {
    const o={...overrides};
    preview.forEach(t=>{if(o[t.id]===undefined)o[t.id]=t.due;});
    return o;
  };

  const handleNumSessions = n => {
    setNumSessions(n);
    const arr=[];
    for(let i=1;i<=n;i++){const existing=sessionDates.find(s=>s.number===i);arr.push(existing||{id:`s${i}`,name:`Session ${i}`,date:"",number:i});}
    setSessionDates(arr);
  };

  const updateSessionDate = (idx,date) => setSessionDates(p=>p.map((s,i)=>i===idx?{...s,date}:s));

  return (
    <Modal onClose={onClose} title={initialDraft?`Edit draft — ${initialDraft.cycle.name}`:`New ${typeLabel} cycle`}>
      {step===1&&(
        <>
          <Field label="Cycle name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Fall 2026"/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Program start"><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></Field>
            <Field label="Program end"><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></Field>
          </div>
          <Field label="Holidays to exclude">
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {holidays.map(h => (
                <span key={h} style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:"#FCEBEB",color:"#A32D2D",display:"flex",alignItems:"center",gap:5}}>
                  {h}<button onClick={()=>setHolidays(hh=>hh.filter(x=>x!==h))} aria-label={`Remove holiday ${h}`} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#A32D2D",padding:0}}>×</button>
                </span>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input type="date" value={holidayInput} onChange={e=>setHolidayInput(e.target.value)}/>
              <button onClick={addHoliday} style={{fontSize:13,padding:"0 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",cursor:"pointer"}}>Add</button>
            </div>
          </Field>
          <Field label="Number of class sessions">
            <input type="number" min="1" max="30" value={numSessions} onChange={e=>handleNumSessions(parseInt(e.target.value)||1)}/>
          </Field>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:8}}>
            <button onClick={onClose} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Cancel</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onSaveDraft({name,start,end,holidays},overrides,cycleType)} disabled={!name||!start} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:(!name||!start)?"var(--color-text-tertiary)":"var(--color-text-secondary)",cursor:(!name||!start)?"default":"pointer"}}>Save draft</button>
              <button onClick={()=>setStep(2)} disabled={!name||!start} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:(!name||!start)?"var(--color-background-tertiary)":"var(--color-background-secondary)",color:(!name||!start)?"var(--color-text-tertiary)":"var(--color-text-primary)",cursor:(!name||!start)?"default":"pointer"}}>Set session dates →</button>
            </div>
          </div>
        </>
      )}
      {step===2&&(
        <>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:8}}>Class session dates</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflowY:"auto"}}>
              {sessionDates.map((s,i) => (
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"}}>
                  <span style={{fontSize:13,color:"var(--color-text-primary)",minWidth:80}}>{s.name}</span>
                  <input type="date" value={s.date} onChange={e=>updateSessionDate(i,e.target.value)}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:8}}>
            <button onClick={()=>setStep(1)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>← Back</button>
            <button onClick={()=>setStep(3)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>Preview program due dates →</button>
          </div>
        </>
      )}
      {step===3&&(
        <>
          <div style={{marginBottom:12}}>
            <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 4px"}}>Program task due dates from <strong style={{color:"var(--color-text-primary)"}}>{start}</strong>.</p>
            {flaggedCount>0&&<div style={{fontSize:13,padding:"8px 12px",borderRadius:"var(--border-radius-md)",background:"#FAEEDA",color:"#854F0B",marginTop:8}}>{flaggedCount} task{flaggedCount>1?"s":""} flagged.</div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:260,overflowY:"auto"}}>
            {preview.map(t => (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:t.flagged?"1px solid #FAC775":"0.5px solid var(--color-border-tertiary)",background:t.flagged?"#FFFBF2":"var(--color-background-secondary)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:1}}>{t.title}</div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>+{t.effectiveOffset} days · {t.assignee}</div>
                </div>
                {t.flagged&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#FAEEDA",color:"#854F0B",flexShrink:0}}>review</span>}
                <input type="date" value={overrides[t.id]!==undefined?overrides[t.id]:t.due} onChange={e=>setOverrides(o=>({...o,[t.id]:e.target.value}))} style={{fontSize:12,border:t.flagged?"1px solid #FAC775":"0.5px solid var(--color-border-secondary)",borderRadius:6,padding:"4px 8px",background:"var(--color-background-primary)",color:"var(--color-text-primary)",width:130}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:16}}>
            <button onClick={()=>setStep(2)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>← Back</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onSaveDraft({name,start,end,holidays},currentOverrides(),cycleType)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>Save draft</button>
              <button onClick={()=>onLaunch({name,start,end,holidays},currentOverrides(),sessionDates,cycleType)} style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",border:"1px solid #9FE1CB",background:"#E1F5EE",color:"#0F6E56",cursor:"pointer",fontWeight:500}}>Launch "{name}"</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
