export const INIT_MEMBERS = ["Alex Chen","Jordan Lee","Sam Patel","Riley Kim","Morgan Davis"];
export const STATUSES = ["To Do","In Progress","Done"];
export const DOC_TYPES = ["Google Drive","PDF","Web Link"];
export const INIT_DEPARTMENTS = ["Engineering","Design","Marketing","Research","Operations"];
export const INIT_AUDIENCES = ["All Team","Engineering","Design","Marketing","Research"];
export const INIT_TAGS = ["design","onboarding","docs","engineering","research","brand","roadmap"];
export const VIEWS = ["board","list","mytasks","runofshow","calendar","collateral","search"];
export const VIEW_LABELS = {board:"Board",list:"All tasks",mytasks:"My tasks",calendar:"Calendar",collateral:"Collateral",runofshow:"Run of Show",search:"Search"};
export const DEFAULT_CLASS_TASKS = ["Prepare session materials","Send participant reminder","Set up room/platform","Facilitate session","Post recording & notes","Follow-up survey"];
export const DEFAULT_STATUS_COLORS = {
  "To Do":      {bg:"#F1EFE8",color:"#5F5E5A",border:"#D3D1C7"},
  "In Progress":{bg:"#E1F5EE",color:"#0F6E56",border:"#9FE1CB"},
  "Done":       {bg:"#E6F1FB",color:"#185FA5",border:"#B5D4F4"},
};
export const DEFAULT_PREFS = {
  darkMode:false,
  defaultView:"board",
  timezone:"America/New_York",
  statusColors:DEFAULT_STATUS_COLORS,
  notifications:{
    dependencyResolved:{inApp:true,email:false},
    taskAssigned:{inApp:true,email:true},
    atRisk:{inApp:true,email:false},
    dueSoon:{inApp:true,email:false,daysBefore:2}
  },
  desktopNotifications:false,
  googleCalendar:false,
  googleDrive:false
};
export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const AVATAR_BG = ["#B5D4F4","#9FE1CB","#F5C4B3","#F4C0D1","#C0DD97","#D3D1C7","#FAC775"];
export const AVATAR_TX = ["#17599b","#0e654f","#963b1c","#963454","#366510","#595855","#804c0b"];
