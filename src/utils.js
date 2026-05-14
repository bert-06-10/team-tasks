import { INIT_MEMBERS, AVATAR_BG, AVATAR_TX, DEFAULT_CLASS_TASKS, STATUSES } from "./constants.js";

export const initials = n => (n||"?").split(" ").map(w=>w[0]).join("");
export const memberIdx = n => { const i=INIT_MEMBERS.indexOf(n); return i>=0?i:(n?n.charCodeAt(0)%7:6); };
export const avatarBg = n => AVATAR_BG[memberIdx(n)%7];
export const avatarTx = n => AVATAR_TX[memberIdx(n)%7];
export const typeIcon = t => ({"Google Drive":"G","PDF":"P","Web Link":"W"}[t]||"D");
export const typeColor = t => ({"Google Drive":"#185FA5","PDF":"#A32D2D","Web Link":"#0F6E56"}[t]||"#5F5E5A");
export const typeBg = t => ({"Google Drive":"#E6F1FB","PDF":"#FCEBEB","Web Link":"#EAF3DE"}[t]||"#F1EFE8");
// Represent a date-only string as noon UTC so Eastern day is always stable (ET is UTC-4/5, never crosses midnight at noon UTC)
const etNoon = s => new Date(s + "T12:00:00Z");
const todayET = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // en-CA → YYYY-MM-DD

export const isOverdue = d => !!d && d < todayET();
export const addDays = (s,n) => { const [y,m,d]=s.split("-").map(Number); return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10); };
export const isWeekend = s => { const wd=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short"}).format(etNoon(s)); return wd==="Sun"||wd==="Sat"; };
export const isFlagged = (s,hols) => isWeekend(s)||(hols||[]).includes(s);
export const nextBusinessDay = (s,hols) => { let d=s; while(isFlagged(d,hols)) d=addDays(d,1); return d; };
export const fmtDate = s => { if(!s)return""; return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric"}).format(etNoon(s)); };
export const fmtDateYear = s => { if(!s)return""; return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",year:"numeric"}).format(etNoon(s)); };

export const genClassTasks = sessions => {
  let id = 1000;
  const tasks = [];
  sessions.forEach(s => {
    DEFAULT_CLASS_TASKS.forEach(title => {
      tasks.push({id:id++,title,assignee:INIT_MEMBERS[0],assist:"",due:s.date,status:"To Do",notes:"",deps:[],collateralDeps:[],attachedDocs:[],tags:["class"],offset:0,department:"",type:"class",sessionId:s.id,sessionName:s.name});
    });
  });
  return tasks;
};

// Normalise dates to YYYY-MM-DD; returns "" for unrecognised values.
function normalizeDate(s) {
  if (!s) return "";
  s = s.trim();
  // YYYY-MM-DD (strict ISO, already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY-M-D (ISO without zero-padding)
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}`;
  // M/D/YYYY or MM/DD/YYYY
  const us4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us4) return `${us4[3]}-${us4[1].padStart(2,"0")}-${us4[2].padStart(2,"0")}`;
  // M/D/YY or MM/DD/YY (2-digit year — common in spreadsheet exports)
  const us2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (us2) {
    const yr = parseInt(us2[3], 10);
    const full = yr >= 50 ? 1900 + yr : 2000 + yr;
    return `${full}-${us2[1].padStart(2,"0")}-${us2[2].padStart(2,"0")}`;
  }
  return "";
}

// Stream-based CSV parser: handles quoted fields that contain commas AND newlines.
export function parseCSV(text) {
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];

  const records = [];
  let record = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] === '"') {
      // Quoted field — newlines and commas inside are part of the value
      let field = "";
      i++;
      while (i < text.length) {
        if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
        else if (text[i] === '"') { i++; break; }
        else field += text[i++];
      }
      record.push(field);
      if (text[i] === ',') i++;
      else if (text[i] === '\n') { records.push(record); record = []; i++; }
    } else if (text[i] === '\n') {
      records.push(record); record = []; i++;
    } else if (text[i] === ',') {
      record.push(""); i++;             // empty field before a comma
    } else {
      let field = "";
      while (i < text.length && text[i] !== ',' && text[i] !== '\n') field += text[i++];
      record.push(field.trim());
      if (text[i] === ',') i++;
      else if (text[i] === '\n') { records.push(record); record = []; i++; }
    }
  }
  if (record.length > 0) records.push(record);

  const rows = records.filter(r => r.some(v => v.trim() !== ''));
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, ""));
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, j) => { obj[h] = row[j] !== undefined ? row[j] : ""; });
    return obj;
  });
}

export function parseClassTasksCSV(rows) {
  return rows.map((row,i) => ({
    id: Date.now()+i,
    title: row.task||row.title||"(untitled)",
    assignee: row.owner||row.assignee||"",
    assist: row.alternate_owner||row.assist||"",
    due: normalizeDate(row.due_date||row.due),
    notes: row.notes||row.description||"",
    status: STATUSES.includes(row.status) ? row.status : "To Do",
    links: row.links||row.link||"",
    tags: ["class"],
    deps: [], collateralDeps: [], attachedDocs: [],
    offset: parseInt(row.days_from_cycle_start||"0")||0,
    department: "", type: "class", sessionId: "", sessionName: "", flagged: false,
  }));
}

export function parseProgramTasksCSV(rows) {
  return rows.map((row,i) => ({
    id: Date.now()+i,
    title: row.task||row.title||"(untitled)",
    assignee: row.owner||row.assignee||"",
    assist: row.alternate_owner||row.assist||"",
    due: normalizeDate(row.due_date||row.due),
    notes: row.notes||row.description||"",
    status: STATUSES.includes(row.status) ? row.status : "To Do",
    links: row.links||row.link||"",
    tags: [],
    deps: [], collateralDeps: [], attachedDocs: [],
    offset: parseInt(row.days_from_cycle_start||"0")||0,
    department: "", type: "program", flagged: false,
  }));
}

export function exportTasksToCSV(programTasks, classTasks, cycleName) {
  const escape = v => {
    const s = (v == null ? "" : String(v)).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const row = cols => cols.map(escape).join(",");

  const header = row(["type","task","owner","alternate_owner","due_date","days_from_cycle_start","fall_days_from_cycle_start","status","notes","links","department","tags","flagged"]);

  const taskRow = t => row([
    t.type,
    t.title,
    t.assignee,
    t.assist,
    t.due,
    t.offset ?? 0,
    t.fallOffset ?? 0,
    t.status,
    t.notes,
    t.links,
    t.department,
    (t.tags || []).join(";"),
    t.flagged ? "true" : "",
  ]);

  const lines = [header, ...[...programTasks, ...classTasks].map(taskRow)];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(cycleName || "tasks").replace(/\s+/g, "_")}_export.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseRunOfShowCSV(rows) {
  return rows.map((row,i) => ({
    id: "ri"+Date.now()+i,
    cohort: row.cohort||"",
    time: row.time||"",
    event: row.event||row.title||"",
    owner: row.owner||"",
    assist: row.assist||row.alternate_owner||"",
    notes: row.notes||row.description||"",
  }));
}

export function parseCollateralCSV(rows) {
  const truthy = v => v && /^(yes|true|x|1|✓|check)$/i.test(v.trim());
  return rows.map(row => {
    const tags = [];
    if (truthy(row.logo_wall)) tags.push("Logo Wall");
    if (truthy(row.impact_stats)) tags.push("Impact Stats");
    if (truthy(row.video_testimonial)) tags.push("Video Testimonial");

    const extras = [
      row.notes?.trim() && `Notes: ${row.notes.trim()}`,
    ].filter(Boolean);

    const base = row.description?.trim() || "";
    const description = extras.length
      ? (base ? `${base}\n\n${extras.join("\n")}` : extras.join("\n"))
      : base;

    return {
      title: row.title?.trim() || "(untitled)",
      owner: row.owner?.trim() || "",
      content_owner: row.content_owner?.trim() || "",
      assist: row.assist?.trim() || "",
      audience: row.audience?.trim() || "",
      description,
      url: row.editable_link?.trim() || "",
      shareable_link: row.shareable_link?.trim() || "",
      updated: normalizeDate(row.last_updated?.trim() || ""),
      next_update: normalizeDate(row.next_scheduled_update?.trim() || ""),
      type: "Google Drive",
      tags,
    };
  });
}
