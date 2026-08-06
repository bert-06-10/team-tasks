import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BoardView } from "./components/views/BoardView.jsx";
import { ListView } from "./components/views/ListView.jsx";
import { CalendarView } from "./components/views/CalendarView.jsx";
import { SearchView } from "./components/views/SearchView.jsx";
import { RunOfShowView, ListHeader, ListRow, DocCard, CollateralView } from "./components/TaskViews.jsx";
import { FilterDropdown } from "./components/Primitives.jsx";
import { SettingsModal } from "./components/Settings.jsx";
import { MilestoneModal, MilestoneDetailModal } from "./components/modals/MilestoneModal.jsx";
import { TaskModal } from "./components/modals/TaskModal.jsx";
import { DocModal } from "./components/modals/DocModal.jsx";
import { ImportModal, ImportCollateralModal } from "./components/modals/ImportModal.jsx";
import { CycleModal } from "./components/modals/CycleModal.jsx";
import { AddSessionModal, StandardTasksModal, SessionsListModal } from "./components/modals/SessionModals.jsx";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { VIEWS, VIEW_LABELS, DEFAULT_STATUS_COLORS, DEFAULT_PREFS } from "./constants.js";
import { avatarBg, avatarTx, initials, isOverdue, isWeekend, addDays, isFlagged, closestBusinessDay, genClassTasks, exportTasksToCSV, fmtDate, setDefaultTimezone, useIsMobile } from "./utils.js";
import { supabase } from "./supabaseClient.js";
import * as db from "./lib/db.js";

const DEFAULT_USER_PREFS = {
  ...DEFAULT_PREFS,
  statusColors:  { ...DEFAULT_STATUS_COLORS },
  notifications: { ...DEFAULT_PREFS.notifications },
};

// Sidebar (Cycle/Program/Classes/Import menus) collapses to icons or expands to
// roughly the width of the board view's Overdue column (260px, see BoardView.jsx).
const SIDEBAR_WIDTH_EXPANDED  = 260;
const SIDEBAR_WIDTH_COLLAPSED = 56;

// Appends newly-saved tasks, skipping any already added by the realtime
// 'tasks' subscription's own broadcast of this same insert (a race that
// widens with multi-row inserts, since each row's INSERT event can arrive
// before the whole batch's local save promise resolves).
const appendNewTasks = (prev, saved) => [...prev, ...saved.filter(t => !prev.some(p => p.id === t.id))];

const SIDEBAR_ICON_PATHS = {
  cycle:   <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
  program: <><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>,
  classes: <><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/></>,
  import:  <><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
};

function SidebarIcon({ name }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {SIDEBAR_ICON_PATHS[name]}
    </svg>
  );
}

// Sidebar submenu items render inline, indented under the parent, pushing
// later parent rows down — styled like the parent row rather than a popover card.
function SidebarInlineItems({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "2px 0 6px" }}>
      {items.map((it, i) => it.divider
        ? <div key={i} style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "4px 12px 4px 34px" }} />
        : <button key={i} type="button" onClick={it.onClick} style={{ display: "flex", alignItems: "center", fontSize: 13, padding: "10px 12px 10px 34px", cursor: "pointer", color: it.danger ? "#A32D2D" : "var(--color-text-primary)", border: "none", borderRadius: "var(--border-radius-md)", background: "transparent", width: "100%", textAlign: "left", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{it.label}</button>
      )}
    </div>
  );
}


// Apply saved timezone immediately so dates render correctly before prefs finish loading
const _cachedTz = localStorage.getItem('teamtasks_timezone');
if (_cachedTz) setDefaultTimezone(_cachedTz);

export default function App() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [session,  setSession]  = useState(undefined); // undefined = not yet checked
  const [userId,   setUserId]   = useState(null);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [programTasks, setProgramTasks] = useState([]);
  const [sessions,     setSessions]     = useState([]);
  const [classTasks,   setClassTasks]   = useState([]);
  const [runOfShow,    setRunOfShow]    = useState({});
  const [docs,         setDocs]         = useState([]);
  const [milestones,   setMilestones]   = useState([]);
  const [members,      setMembers]      = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [businessLines, setBusinessLines] = useState([]);
  const [audiences,    setAudiences]    = useState([]);
  const [globalTags,   setGlobalTags]   = useState([]);
  const [activeCycle,  setActiveCycle]  = useState(null);
  const [archivedCycles, setArchivedCycles] = useState([]);
  const [loading,      setLoading]      = useState(true);

  // ── User / prefs state ──────────────────────────────────────────────────────
  const [myUser,    setMyUser]    = useState("");
  const [myRole,    setMyRole]    = useState("staff"); // 'admin' | 'staff' | 'viewer' — mirrors profiles.role
  const [profiles,  setProfiles]  = useState([]); // every {id,name,email,role} — used to link assignees to real accounts
  const [notifications, setNotifications] = useState([]);
  const [userPrefs, setUserPrefs] = useState(DEFAULT_USER_PREFS);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [toasts,                    setToasts]                    = useState([]);
  const [view, setViewRaw] = useState(() => { const s = sessionStorage.getItem('teamtasks_view'); return (s && s !== 'classes') ? s : 'board'; });
  const setView = useCallback((v) => {
    setViewRaw(v);
    sessionStorage.setItem('teamtasks_view', v);
    if (v === 'board') { setTaskTypeFilterRaw('program'); sessionStorage.setItem('teamtasks_type', 'program'); }
  }, []);
  const [taskTypeFilter, setTaskTypeFilterRaw] = useState(() => { const t = sessionStorage.getItem('teamtasks_type'); return (t && t !== 'runofshow') ? t : 'program'; });
  const setTaskTypeFilter = useCallback((v) => { setTaskTypeFilterRaw(v); sessionStorage.setItem('teamtasks_type', v); }, []);
  const [taskSearch,                setTaskSearch]                = useState("");
  const [boardGroup,                setBoardGroup]                = useState("status");
  const [listGroup,                 setListGroup]                 = useState("none");
  const [deptFilter,                setDeptFilter]                = useState("All");
  const [ownerFilter,               setOwnerFilter]               = useState("All");
  const [sessionFilter,             setSessionFilter]             = useState("all");
  const [dateFilter,                setDateFilter]                = useState("All");
  const [viewingArchive,            setViewingArchive]            = useState(null);
  const [draftCycle,                setDraftCycle]                = useState(() => { try { return JSON.parse(localStorage.getItem('teamtasks_draft_cycle')); } catch { return null; } });
  const [classTaskTemplate,         setClassTaskTemplate]         = useState(() => { try { const s = localStorage.getItem('teamtasks_class_task_template'); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [importHistory,             setImportHistory]             = useState(() => { try { return JSON.parse(localStorage.getItem('teamtasks_import_history')) || []; } catch { return []; } });
  const [rosProf, setRosProf] = useState(() => { try { return JSON.parse(localStorage.getItem("ros_sel")||"{}").prof||""; } catch { return ""; } });
  const [rosDate, setRosDate] = useState(() => { try { return JSON.parse(localStorage.getItem("ros_sel")||"{}").date||""; } catch { return ""; } });
  const handleRosSel = (prof, date) => { setRosProf(prof); setRosDate(date); };

  const [showAddSessionModal,        setShowAddSessionModal]        = useState(false);
  const [addSessionDuplicateFrom,   setAddSessionDuplicateFrom]   = useState(null);
  const [editingSession,            setEditingSession]            = useState(null);
  const [showSessionsListModal,     setShowSessionsListModal]     = useState(false);
  const [showStandardTasksModal,    setShowStandardTasksModal]    = useState(false);
  const [showTaskModal,             setShowTaskModal]             = useState(false);
  const [showDocModal,              setShowDocModal]              = useState(false);
  const [showCycleModal,            setShowCycleModal]            = useState(false);
  const [newCycleType,              setNewCycleType]              = useState("spring");
  const [showImportModal,           setShowImportModal]           = useState(false);
  const [importModalTab,            setImportModalTab]            = useState("program");
  const [showImportCollateralModal, setShowImportCollateralModal] = useState(false);
  const [showSettings,              setShowSettings]              = useState(false);
  const [showMilestoneModal,        setShowMilestoneModal]        = useState(false);
  const [showMilestoneDetail,       setShowMilestoneDetail]       = useState(false);
  const [viewMilestone,             setViewMilestone]             = useState(null);
  const [renamingCycle,             setRenamingCycle]             = useState(false);
  const [renameValue,               setRenameValue]               = useState('');
  const [openDropdown,              setOpenDropdown]              = useState(null);
  const [sidebarCollapsed, setSidebarCollapsedRaw] = useState(() => { try { return JSON.parse(localStorage.getItem('teamtasks_sidebar_collapsed')) ?? false; } catch { return false; } });
  const setSidebarCollapsed = useCallback(v => { setSidebarCollapsedRaw(v); localStorage.setItem('teamtasks_sidebar_collapsed', JSON.stringify(v)); }, []);
  // Each sidebar section (Cycle/Program/Classes/Import) toggles independently so several
  // can be open — pushing later rows down — at once. Clicking a section while the sidebar
  // is collapsed expands the sidebar first, then reveals that section's items inline,
  // rather than popping out a flyout.
  const [expandedSidebar, setExpandedSidebar] = useState({});
  const toggleSidebarSection = key => setExpandedSidebar(prev => ({ ...prev, [key]: !prev[key] }));
  const openSidebarSectionExpanding = key => { setSidebarCollapsed(false); setExpandedSidebar(prev => ({ ...prev, [key]: true })); };
  const [settingsTab,               setSettingsTab]               = useState("owners");
  const [editTask,      setEditTask]      = useState(null);
  const [editDoc,       setEditDoc]       = useState(null);
  const [editMilestone, setEditMilestone] = useState(null);

  // Keep a ref so realtime handlers always see current sessions without stale closure
  const sessionsRef = useRef([]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  // ── Dropdown click-outside handler ──────────────────────────────────────────
  const dropdownsRef = useRef(null);
  const notifRef = useRef(null);
  useEffect(() => {
    if (!openDropdown || openDropdown === 'notifications') return;
    const handler = (e) => {
      if (dropdownsRef.current && !dropdownsRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  // Full keyboard navigation for the Cycle/Program/Classes/Import/+Add menus,
  // following the ARIA menu pattern: arrow keys move between items, Home/End
  // jump to the ends, Escape closes and returns focus to the trigger, and Tab
  // closes the menu and lets focus continue naturally to the next thing on
  // the page (per spec, Tab does NOT cycle within a real menu the way it
  // would in a plain list of buttons — that's what tripped this up last time).
  const ACTION_MENU_KEYS = ['mobileMenu'];
  useEffect(() => {
    if (!ACTION_MENU_KEYS.includes(openDropdown)) return;
    const panel = document.querySelector('[role="menu"]');
    const items = () => Array.from(panel?.querySelectorAll('[role="menuitem"]') || []);
    // Move focus into the menu as soon as it opens, onto the first item
    const first = items()[0];
    first?.focus();

    const onKey = e => {
      const list = items();
      if (list.length === 0) return;
      const idx = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[idx < 0 ? 0 : (idx + 1) % list.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[idx < 0 ? list.length - 1 : (idx - 1 + list.length) % list.length].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1].focus();
      } else if (e.key === 'Escape') {
        setOpenDropdown(null);
      } else if (e.key === 'Tab') {
        // Let Tab proceed naturally to the next focusable element; just close the menu state
        setOpenDropdown(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openDropdown]);

  // Escape closes the notification panel and the mobile-only filter dropdowns too
  useEffect(() => {
    if (!openDropdown || ACTION_MENU_KEYS.includes(openDropdown)) return;
    const onKey = e => { if (e.key === 'Escape') setOpenDropdown(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openDropdown]);

  // The notification bell lives outside dropdownsRef's wrapper, so it needs its own outside-click check
  useEffect(() => {
    if (openDropdown !== 'notifications') return;
    const handler = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setOpenDropdown(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  // ── Refs for config-list diffing ────────────────────────────────────────────
  const membersRef     = useRef([]);
  const departmentsRef = useRef([]);
  const businessLinesRef = useRef([]);
  const audiencesRef   = useRef([]);
  const globalTagsRef  = useRef([]);
  useEffect(() => { membersRef.current     = members;     }, [members]);
  useEffect(() => { departmentsRef.current = departments; }, [departments]);
  useEffect(() => { businessLinesRef.current = businessLines; }, [businessLines]);
  useEffect(() => { audiencesRef.current   = audiences;   }, [audiences]);
  useEffect(() => { globalTagsRef.current  = globalTags;  }, [globalTags]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const prefs        = userPrefs || DEFAULT_USER_PREFS;
  const statusColors = { ...DEFAULT_STATUS_COLORS, ...(prefs.statusColors || {}) };

  useEffect(() => {
    document.documentElement.style.colorScheme = prefs.darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", prefs.darkMode ? "dark" : "light");
  }, [prefs.darkMode]);

  // ── Toast ───────────────────────────────────────────────────────────────────
  const toast = useCallback((msg, opts = {}) => {
    const id = Date.now();
    setToasts(n => [...n, { id, msg, action: opts.action }]);
    setTimeout(() => setToasts(n => n.filter(x => x.id !== id)), opts.action ? 8000 : 4000);
    if (prefs.desktopNotifications && Notification.permission === "granted")
      new Notification("Team Tasks", { body: msg });
  }, [prefs.desktopNotifications]);

  // ── Load all app data for a signed-in session ───────────────────────────────
  const handleAuthSuccess = async (newSession) => {
    setSession(newSession);
    setLoading(true);
    try {
      const uid = newSession.user.id;
      setUserId(uid);

      // Fetch or create profile
      let profile = await db.fetchProfile(uid);
      if (!profile) {
        const name = newSession.user.user_metadata?.name
          || newSession.user.email.split("@")[0];
        profile = await db.createProfile(uid, name, newSession.user.email);
      }
      setMyUser(profile.name);
      setMyRole(profile.role || "staff");

      // Fetch user prefs (fall back to defaults if empty)
      const savedPrefs = await db.fetchUserPrefs(uid);
      const resolvedPrefs = savedPrefs
        ? { ...DEFAULT_USER_PREFS, ...savedPrefs, statusColors: savedPrefs.statusColors || DEFAULT_STATUS_COLORS, notifications: savedPrefs.notifications || DEFAULT_PREFS.notifications }
        : DEFAULT_USER_PREFS;
      setUserPrefs(resolvedPrefs);
      if (resolvedPrefs.defaultView && !sessionStorage.getItem('teamtasks_view')) setView(resolvedPrefs.defaultView);
      const tz = resolvedPrefs.timezone || DEFAULT_USER_PREFS.timezone;
      setDefaultTimezone(tz);
      localStorage.setItem('teamtasks_timezone', tz);

      // Fetch config lists + sessions + cycle + all profiles (for linking assignees to real accounts)
      const [membersList, deptList, audList, tagList, bizLineList, sessionsData, cycle, archived, allProfiles, notifs] =
        await Promise.all([
          db.fetchMembers(), db.fetchDepartments(), db.fetchAudiences(),
          db.fetchGlobalTags(), db.fetchBusinessLines(), db.fetchSessions(), db.fetchActiveCycle(),
          db.fetchArchivedCycles(), db.fetchAllProfiles(), db.fetchNotifications(),
        ]);
      setProfiles(allProfiles);
      setNotifications(notifs);

      // Ensure the signed-in user appears in the members list.
      // Note: adding to `members` now requires admin under RLS, so a non-admin's
      // first login shouldn't throw — an admin can add them from Settings > Owners,
      // or this silently succeeds if the signed-in user already happens to be admin.
      if (!membersList.includes(profile.name)) {
        try {
          await db.addMember(profile.name);
          membersList.push(profile.name);
        } catch (e) {
          console.warn("Could not auto-add to members list (likely non-admin):", e.message);
        }
      }

      setMembers(membersList);
      setDepartments(deptList);
      setAudiences(audList);
      setGlobalTags(tagList);
      setBusinessLines(bizLineList);
      setSessions(sessionsData);
      setActiveCycle(cycle);
      setArchivedCycles(archived);

      // Fetch tasks, run of show, milestones, docs
      const [taskData, rosData, milestonesData, docsData] = await Promise.all([
        db.fetchTasks(sessionsData), db.fetchRunOfShow(),
        db.fetchMilestones(), db.fetchDocs(),
      ]);

      // Migrate any existing weekend due dates to nearest business day
      const fixDue = t => t.due && isWeekend(t.due) ? { ...t, due: closestBusinessDay(t.due) } : t;
      const fixedProgram = taskData.programTasks.map(fixDue);
      const fixedClass   = taskData.classTasks.map(fixDue);
      const weekendFixed = [
        ...fixedProgram.filter((t, i) => t.due !== taskData.programTasks[i].due),
        ...fixedClass.filter((t, i)   => t.due !== taskData.classTasks[i].due),
      ];
      if (weekendFixed.length) {
        Promise.all(weekendFixed.map(t => db.updateTaskDue(t.id, t.due)))
          .catch(e => console.error("Weekend date migration error:", e));
      }

      setProgramTasks(fixedProgram);
      setClassTasks(fixedClass);
      setRunOfShow(rosData);
      setMilestones(milestonesData);
      setDocs(docsData);

      // Merge all tags in use across tasks and docs into globalTags so the
      // Settings > Tags tab reflects what's actually in the system.
      const usedTags = [
        ...fixedProgram.flatMap(t => t.tags || []),
        ...fixedClass.flatMap(t => t.tags || []),
        ...docsData.flatMap(d => d.tags || []),
      ];
      if (usedTags.length) {
        setGlobalTags(prev => [...new Set([...prev, ...usedTags])].sort());
      }
    } catch (e) {
      console.error("Failed to load data:", e);
      toast("Failed to load data. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset all state on sign-out ─────────────────────────────────────────────
  const resetState = () => {
    setSession(null);
    setUserId(null);
    setMyUser("");
    setMyRole("staff");
    setProfiles([]);
    setNotifications([]);
    setUserPrefs(DEFAULT_USER_PREFS);
    setProgramTasks([]);
    setClassTasks([]);
    setSessions([]);
    setRunOfShow({});
    setDocs([]);
    setMilestones([]);
    setActiveCycle(null);
    setArchivedCycles([]);
    setMembers([]);
    setDepartments([]);
    setBusinessLines([]);
    setAudiences([]);
    setGlobalTags([]);
    setLoading(false);
  };

  // ── Auth state listener ─────────────────────────────────────────────────────
  useEffect(() => {
    let handled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && s) {
        handled = true;
        handleAuthSuccess(s);
      } else if (event === "SIGNED_OUT") {
        resetState();
      } else if (event === "INITIAL_SESSION" && !s) {
        if (!handled) { setSession(null); setLoading(false); }
      }
    });

    // Fallback: if the hash-based OAuth token isn't picked up by onAuthStateChange
    // (a known issue with Supabase JS v2 PKCE mode receiving implicit-flow tokens),
    // explicitly exchange it here.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s && !handled) {
        handled = true;
        handleAuthSuccess(s);
      } else if (!s && !handled) {
        setSession(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = () => supabase.auth.signOut();

  // ── Realtime sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('db-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, ({ eventType, new: r, old }) => {
        if (eventType === 'DELETE') {
          setProgramTasks(p => p.filter(t => t.id !== old.id));
          setClassTasks(p => p.filter(t => t.id !== old.id));
          return;
        }
        const patch = {
          title: r.title, type: r.type,
          assignee: r.assignee || '', assist: r.assist || '',
          due: r.due_date || '', status: r.status,
          notes: r.notes || '', links: r.links || '',
          tags: r.tags || [], offset: r.offset_days || 0,
          fallOffset: r.fall_offset_days ?? r.offset_days ?? 0,
          department: r.department || '', flagged: r.flagged || false,
          sessionId: r.session_id || '',
        };
        if (eventType === 'UPDATE') {
          // Preserve deps/collateralDeps — they live in join tables not returned by realtime
          const apply = prev => prev.map(t => t.id === r.id ? { ...t, ...patch } : t);
          setProgramTasks(apply);
          setClassTasks(apply);
        } else { // INSERT from another user
          const setter = r.type === 'program' ? setProgramTasks : setClassTasks;
          setter(prev => {
            if (prev.some(t => t.id === r.id)) return prev; // already added by local save
            const sess = sessionsRef.current.find(s => s.id === r.session_id);
            return [...prev, {
              ...patch, id: r.id,
              sessionName: sess?.name || '',
              professor: sess?.professor || '',
              cohort: sess?.cohort || '',
              deps: [], collateralDeps: [], attachedDocs: [],
            }];
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, ({ eventType, new: r, old }) => {
        if (eventType === 'DELETE') {
          setMilestones(p => p.filter(m => m.id !== old.id));
        } else {
          const m = { id: r.id, title: r.title, date: r.date, deps: r.deps || [], collateralDeps: r.collateral_deps || [] };
          if (eventType === 'UPDATE') setMilestones(p => p.map(x => x.id === m.id ? m : x));
          else setMilestones(p => p.some(x => x.id === m.id) ? p : [...p, m]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, ({ eventType, new: r, old }) => {
        if (eventType === 'DELETE') {
          setDocs(p => p.filter(d => d.id !== old.id));
        } else {
          const d = {
            id: r.id, title: r.title, type: r.type, url: r.url || '',
            audience: r.audience || '', description: r.description || '',
            owner: r.owner || '', content_owner: r.content_owner || '',
            assist: r.assist || '', shareable_link: r.shareable_link || '',
            updated: r.updated_date || '', tags: r.tags || [],
            next_update: r.next_update || '', archived: r.archived || false,
          };
          if (eventType === 'UPDATE') setDocs(p => p.map(x => x.id === d.id ? d : x));
          else setDocs(p => p.some(x => x.id === d.id) ? p : [...p, d]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        db.fetchSessions().then(setSessions).catch(console.error);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'run_of_show' }, ({ new: r }) => {
        setRunOfShow(prev => {
          const sid = r.session_id;
          if (!prev[sid]) return prev;
          return { ...prev, [sid]: prev[sid].map(row => row.id === r.id ? { ...row, done: r.done || false } : row) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, ({ eventType, new: r, old }) => {
        // RLS already scopes this to the signed-in user's own notifications
        if (eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== old.id));
        } else if (eventType === 'INSERT') {
          setNotifications(prev => prev.some(n => n.id === r.id) ? prev : [r, ...prev]);
        } else if (eventType === 'UPDATE') {
          setNotifications(prev => prev.map(n => n.id === r.id ? r : n));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Config list sync helper ─────────────────────────────────────────────────
  const syncList = useCallback(async (setter, ref, newItems, addFn, removeFn, updateFn) => {
    const prev = ref.current;
    setter(newItems);
    const added   = newItems.filter(n => !prev.includes(n));
    const removed = prev.filter(n => !newItems.includes(n));
    try {
      if (added.length === 1 && removed.length === 1) {
        await updateFn(removed[0], added[0]);
      } else {
        for (const n of removed) await removeFn(n);
        for (const n of added)   await addFn(n);
      }
    } catch {
      setter(prev);
      toast("Failed to save changes");
    }
  }, [toast]);

  const setMembersSync     = useCallback(n => syncList(setMembers,     membersRef,     n, db.addMember,     db.removeMember,     db.updateMember),     [syncList]);
  const setDepartmentsSync = useCallback(n => syncList(setDepartments, departmentsRef, n, db.addDepartment, db.removeDepartment, db.updateDepartment), [syncList]);
  const setBusinessLinesSync = useCallback(n => syncList(setBusinessLines, businessLinesRef, n, db.addBusinessLine, db.removeBusinessLine, db.updateBusinessLine), [syncList]);
  const setAudiencesSync   = useCallback(n => syncList(setAudiences,   audiencesRef,   n, db.addAudience,   db.removeAudience,   db.updateAudience),   [syncList]);
  // Renaming/removing a tag here only touches the global_tags suggestion
  // list — any task/doc still carrying the old tag string would resurrect
  // it right back into globalTags via the tags-in-use merge on next load.
  // Cascade the same change across every task/doc that has it so a deleted
  // tag actually stays deleted (and a renamed one shows the new name).
  const setGlobalTagsSync = async newItems => {
    const prevTags = globalTagsRef.current;
    const added   = newItems.filter(t => !prevTags.includes(t));
    const removed = prevTags.filter(t => !newItems.includes(t));
    await syncList(setGlobalTags, globalTagsRef, newItems, db.addGlobalTag, db.removeGlobalTag, db.updateGlobalTag);
    if (removed.length !== 1) return;
    const [oldTag] = removed;
    const newTag = added.length === 1 ? added[0] : null;
    const applyTags = tags => !tags?.includes(oldTag) ? tags : (newTag ? tags.map(t => t === oldTag ? newTag : t) : tags.filter(t => t !== oldTag));

    const affectedProgram = programTasks.filter(t => t.tags?.includes(oldTag));
    const affectedClass   = classTasks.filter(t => t.tags?.includes(oldTag));
    const affectedDocs    = docs.filter(d => d.tags?.includes(oldTag));
    if (!affectedProgram.length && !affectedClass.length && !affectedDocs.length) return;

    setProgramTasks(prev => prev.map(t => t.tags?.includes(oldTag) ? { ...t, tags: applyTags(t.tags) } : t));
    setClassTasks(prev => prev.map(t => t.tags?.includes(oldTag) ? { ...t, tags: applyTags(t.tags) } : t));
    setDocs(prev => prev.map(d => d.tags?.includes(oldTag) ? { ...d, tags: applyTags(d.tags) } : d));
    try {
      await Promise.all([
        ...affectedProgram.map(t => db.setTaskTags(t.id, applyTags(t.tags))),
        ...affectedClass.map(t => db.setTaskTags(t.id, applyTags(t.tags))),
        ...affectedDocs.map(d => db.setDocTags(d.id, applyTags(d.tags))),
      ]);
    } catch (e) {
      console.error('cascade tag update error:', e);
      toast(`Tag ${newTag ? "renamed" : "removed"} from the tag list, but failed to update some items — refresh to check.`);
    }
  };

  // ── Prefs ───────────────────────────────────────────────────────────────────
  const updatePrefs = (key, val) => {
    if (key === 'timezone') {
      setDefaultTimezone(val);
      localStorage.setItem('teamtasks_timezone', val);
    }
    setUserPrefs(p => {
      const next = { ...p, [key]: val };
      if (userId) db.saveUserPrefs(userId, next).catch(e => console.error("Failed to save prefs:", e));
      return next;
    });
  };

  // ── Task handlers ───────────────────────────────────────────────────────────
  const allTasks = [...programTasks, ...classTasks];

  const updateStatus = (id, status) => {
    setProgramTasks(prev => {
      const u = prev.map(t => t.id === id ? { ...t, status } : t);
      if (status === "Done") u.filter(t => t.deps.includes(id)).forEach(t => {
        if (prefs.notifications.dependencyResolved.inApp) toast(`"${t.title}" unblocked!`);
      });
      return u;
    });
    setClassTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    db.updateTaskStatus(id, status).catch(() => toast("Failed to update status"));
  };

  const saveTask = async task => {
    try {
      const saved = await db.saveTask(task, sessions);
      if (task.id) {
        if (saved.type === "program") setProgramTasks(p => p.map(t => t.id === saved.id ? saved : t));
        else setClassTasks(p => p.map(t => t.id === saved.id ? saved : t));
      } else {
        if (saved.type === "program") setProgramTasks(p => appendNewTasks(p, [saved]));
        else setClassTasks(p => appendNewTasks(p, [saved]));
      }
      setShowTaskModal(false);
      setEditTask(null);
    } catch {
      toast("Failed to save task");
    }
  };

  const deleteTask = id => {
    setProgramTasks(p => p.filter(t => t.id !== id));
    setClassTasks(p => p.filter(t => t.id !== id));
    setShowTaskModal(false);
    setEditTask(null);
    db.deleteTask(id).catch(() => toast("Failed to delete task"));
  };

  const deleteSelectedTasks = async ids => {
    setProgramTasks(p => p.filter(t => !ids.includes(t.id)));
    setClassTasks(p => p.filter(t => !ids.includes(t.id)));
    try {
      await Promise.all(ids.map(id => db.deleteTask(id)));
      toast(`${ids.length} task${ids.length !== 1 ? "s" : ""} deleted.`);
    } catch (e) {
      console.error("deleteSelectedTasks error:", e);
      toast("Failed to delete some tasks");
    }
  };

  // ── Doc handlers ────────────────────────────────────────────────────────────
  const saveDoc = async doc => {
    try {
      const saved = await db.saveDoc(doc);
      if (doc.id) setDocs(p => p.map(d => d.id === saved.id ? saved : d));
      else setDocs(p => [...p, saved]);
      if (saved.tags?.length) setGlobalTags(prev => [...new Set([...prev, ...saved.tags])].sort());
      setShowDocModal(false);
      setEditDoc(null);
    } catch {
      toast("Failed to save document");
    }
  };

  const deleteDoc = id => {
    setDocs(p => p.filter(d => d.id !== id));
    setShowDocModal(false);
    setEditDoc(null);
    db.deleteDoc(id).catch(() => toast("Failed to delete document"));
  };

  const deleteSelectedDocs = async ids => {
    setDocs(p => p.filter(d => !ids.includes(d.id)));
    try {
      await Promise.all(ids.map(id => db.deleteDoc(id)));
      toast(`${ids.length} item${ids.length !== 1 ? "s" : ""} deleted.`);
    } catch (e) {
      console.error("deleteSelectedDocs error:", e);
      toast("Failed to delete some items");
    }
  };

  const archiveSelectedDocs = async ids => {
    setDocs(p => p.map(d => ids.includes(d.id) ? { ...d, archived: true } : d));
    try {
      await Promise.all(ids.map(id => db.setDocArchived(id, true)));
      toast(`${ids.length} item${ids.length !== 1 ? "s" : ""} archived.`);
    } catch (e) {
      console.error("archiveSelectedDocs error:", e);
      toast("Failed to archive some items");
    }
  };

  const unarchiveDoc = async id => {
    setDocs(p => p.map(d => d.id === id ? { ...d, archived: false } : d));
    try {
      await db.setDocArchived(id, false);
    } catch (e) {
      console.error("unarchiveDoc error:", e);
      toast("Failed to unarchive item");
    }
  };

  // ── Milestone handlers ──────────────────────────────────────────────────────
  const saveMilestone = async m => {
    try {
      const saved = await db.saveMilestone(m);
      if (m.id) setMilestones(p => p.map(x => x.id === saved.id ? saved : x));
      else setMilestones(p => [...p, saved]);
      setShowMilestoneModal(false);
      setEditMilestone(null);
      setViewMilestone(saved);
      setShowMilestoneDetail(true);
    } catch {
      toast("Failed to save milestone");
    }
  };

  const deleteMilestone = id => {
    setMilestones(p => p.filter(m => m.id !== id));
    setShowMilestoneModal(false);
    setEditMilestone(null);
    db.deleteMilestone(id).catch(() => toast("Failed to delete milestone"));
  };

  // ── Cycle handlers ──────────────────────────────────────────────────────────
  const saveDraft = (cycle, overrides, cycleType) => {
    const draft = { cycle, overrides, cycleType };
    setDraftCycle(draft);
    localStorage.setItem('teamtasks_draft_cycle', JSON.stringify(draft));
    setShowCycleModal(false);
    toast(`Draft "${cycle.name}" saved.`);
  };

  const launchCycle = async (cycle, overrides, newSessions, cycleType) => {
    const updatedProgramTasks = programTasks.map(t => {
      const off = cycleType === "fall" ? (t.fallOffset ?? t.offset ?? 0) : (t.offset || 0);
      const due = overrides[t.id] !== undefined ? overrides[t.id] : addDays(cycle.start, off);
      return { ...t, status: "To Do", due, flagged: isFlagged(due, cycle.holidays) };
    });
    setArchivedCycles(p => [...p, { cycle: activeCycle, programTasks, classTasks, docs }]);
    setProgramTasks(updatedProgramTasks);
    if (newSessions?.length) { setSessions(newSessions); setClassTasks(genClassTasks(newSessions)); }
    setActiveCycle(cycle);
    setDraftCycle(null);
    localStorage.removeItem('teamtasks_draft_cycle');
    setShowCycleModal(false);
    toast(`Cycle "${cycle.name}" launched!`);
    try {
      const { savedCycle, savedSessions } = await db.launchNewCycle(
        activeCycle, { programTasks, classTasks, docs }, cycle, newSessions, updatedProgramTasks
      );
      setActiveCycle(savedCycle);
      if (savedSessions) {
        setSessions(savedSessions);
        const newClassTasks = await db.bulkInsertTasks(genClassTasks(savedSessions), savedSessions);
        setClassTasks(newClassTasks);
      }
    } catch {
      toast("Error syncing cycle to database. Local changes preserved.");
    }
  };

  const startRenameCycle = () => {
    const current = viewingArchive ? viewingArchive.cycle : activeCycle;
    if (!current) { toast('No active cycle. Use Cycle → New Spring/Fall cycle to create one first.'); return; }
    setRenameValue(current.name);
    setRenamingCycle(true);
  };

  const commitRenameCycle = async () => {
    const trimmed = renameValue.trim();
    const current = viewingArchive ? viewingArchive.cycle : activeCycle;
    if (!trimmed || trimmed === current.name) { setRenamingCycle(false); return; }
    const updated = { ...current, name: trimmed };
    if (viewingArchive) {
      setArchivedCycles(prev => prev.map(a => a.cycle.id === updated.id ? { ...a, cycle: updated } : a));
      setViewingArchive(prev => ({ ...prev, cycle: updated }));
    } else {
      setActiveCycle(updated);
    }
    setRenamingCycle(false);
    try {
      await db.upsertActiveCycle(updated);
    } catch {
      toast("Failed to rename cycle in database.");
    }
  };

  const deleteDraft = () => {
    if (!window.confirm(`Delete draft "${draftCycle.cycle.name}"?`)) return;
    setDraftCycle(null);
    localStorage.removeItem('teamtasks_draft_cycle');
    toast("Draft deleted.");
  };

  const reactivateCycle = async (archiveEntry) => {
    if (!window.confirm(`Reactivate "${archiveEntry.cycle.name}"? The current active cycle will be archived.`)) return;
    const snapshot = { programTasks, classTasks, docs };
    setArchivedCycles(prev => {
      const filtered = prev.filter(a => a.cycle.id !== archiveEntry.cycle.id);
      if (activeCycle) filtered.push({ cycle: activeCycle, programTasks, classTasks, docs });
      return filtered;
    });
    setProgramTasks(archiveEntry.programTasks || []);
    setClassTasks(archiveEntry.classTasks || []);
    setActiveCycle(archiveEntry.cycle);
    setViewingArchive(null);
    toast(`"${archiveEntry.cycle.name}" is now the active cycle.`);
    try {
      await db.reactivateCycle(archiveEntry.cycle, activeCycle, snapshot, archiveEntry);
    } catch {
      toast("Database sync failed. Local changes preserved.");
    }
  };

  const deleteArchivedCycle = async (archiveEntry) => {
    if (!window.confirm(`Permanently delete the archive for "${archiveEntry.cycle.name}"? This cannot be undone.`)) return;
    setArchivedCycles(prev => prev.filter(a => a.cycle.id !== archiveEntry.cycle.id));
    setViewingArchive(null);
    toast(`Archive "${archiveEntry.cycle.name}" deleted.`);
    try {
      await db.deleteArchivedCycle(archiveEntry.cycle.id);
    } catch {
      toast("Failed to delete archive from database.");
    }
  };

  const deleteActiveCycle = async () => {
    if (!activeCycle) { toast('No active cycle to delete.'); return; }
    if (!window.confirm(`Delete "${activeCycle.name}"? All tasks and sessions will be cleared.`)) return;
    const prev = activeCycle;
    setActiveCycle(null);
    setProgramTasks([]);
    setClassTasks([]);
    setSessions([]);
    toast(`Cycle "${prev.name}" deleted.`);
    try {
      await db.deleteActiveCycle(prev.id);
    } catch {
      toast("Failed to delete cycle from database.");
    }
  };

  // ── Import handlers ─────────────────────────────────────────────────────────
  const addToImportHistory = (type, savedRecords, label, meta = {}) => {
    const entry = { id: `import_${Date.now()}`, type, label, count: savedRecords.length, ids: savedRecords.map(r => r.id), timestamp: new Date().toISOString(), ...meta };
    setImportHistory(prev => {
      const next = [entry, ...prev].slice(0, 30);
      localStorage.setItem('teamtasks_import_history', JSON.stringify(next));
      return next;
    });
    return entry;
  };

  // Sync entries mix adds, in-place updates, and archives — unlike a plain
  // import's flat id list, reversing one needs the pre-sync value of every
  // updated doc plus which ids were newly added vs. only archived.
  const addSyncHistoryEntry = ({ added, updatedBefore, archived, label }) => {
    const entry = {
      id: `import_${Date.now()}`, type: 'collateral_sync', label,
      count: added.length + updatedBefore.length + archived.length,
      addedIds: added.map(d => d.id), updatedBefore, archivedIds: archived.map(d => d.id),
      timestamp: new Date().toISOString(),
    };
    setImportHistory(prev => {
      const next = [entry, ...prev].slice(0, 30);
      localStorage.setItem('teamtasks_import_history', JSON.stringify(next));
      return next;
    });
    return entry;
  };

  const importProgram = async (rows, cycleInfo) => {
    try {
      if (cycleInfo) {
        const newCycle = await db.upsertActiveCycle({ name: cycleInfo.name, start: cycleInfo.start, end: cycleInfo.end, holidays: [] });
        setActiveCycle(newCycle);
      }
      const saved = await db.bulkInsertTasks(rows, sessions);
      setProgramTasks(p => appendNewTasks(p, saved));
      const entry = addToImportHistory('program', saved, `${saved.length} program task${saved.length !== 1 ? 's' : ''}`);
      setShowImportModal(false);
      toast(cycleInfo ? `Cycle "${cycleInfo.name}" created and ${saved.length} tasks imported.` : `${saved.length} program tasks imported.`, { action: { label: "Undo", onClick: () => reverseImport(entry, { skipConfirm: true }) } });
    } catch (e) { console.error("importProgram error:", e); toast("Failed to import: " + (e?.message || JSON.stringify(e))); }
  };

  const importClass = async (rows, cycleInfo) => {
    try {
      if (cycleInfo) {
        const newCycle = await db.upsertActiveCycle({ name: cycleInfo.name, start: cycleInfo.start, end: cycleInfo.end, holidays: [] });
        setActiveCycle(newCycle);
      }
      const saved = await db.bulkInsertTasks(rows, sessions);
      setClassTasks(p => appendNewTasks(p, saved));
      const entry = addToImportHistory('class', saved, `${saved.length} class task${saved.length !== 1 ? 's' : ''}`);
      setShowImportModal(false);
      toast(cycleInfo ? `Cycle "${cycleInfo.name}" created and ${saved.length} tasks imported.` : `${saved.length} class tasks imported.`, { action: { label: "Undo", onClick: () => reverseImport(entry, { skipConfirm: true }) } });
    } catch (e) { console.error("importClass error:", e); toast("Failed to import class tasks"); }
  };

  const importROS = async (sessionId, rows) => {
    try {
      const saved = await db.bulkInsertRunOfShow(sessionId, rows);
      setRunOfShow(prev => ({ ...prev, [sessionId]: [...(prev[sessionId] || []), ...saved] }));
      const sess = sessions.find(s => s.id === sessionId);
      const entry = addToImportHistory('runofshow', saved, `${saved.length} run of show row${saved.length !== 1 ? 's' : ''}`, { sessionId, sessionLabel: sess ? (sess.professor || sess.name) : '' });
      setShowImportModal(false);
      toast(`${saved.length} run of show rows imported.`, { action: { label: "Undo", onClick: () => reverseImport(entry, { skipConfirm: true }) } });
    } catch (e) { console.error("importROS error:", e); toast("Failed to import run of show rows"); }
  };

  const importCollateral = async (items) => {
    try {
      const saved = await Promise.all(items.map(item => db.saveDoc(item)));
      setDocs(p => [...p, ...saved.filter(d => !p.some(x => x.id === d.id))]);
      const newTags = saved.flatMap(d => d.tags || []);
      if (newTags.length) setGlobalTags(prev => [...new Set([...prev, ...newTags])].sort());
      const entry = addToImportHistory('collateral', saved, `${saved.length} collateral item${saved.length !== 1 ? 's' : ''}`);
      setShowImportCollateralModal(false);
      toast(`${saved.length} collateral items imported.`, { action: { label: "Undo", onClick: () => reverseImport(entry, { skipConfirm: true }) } });
    } catch (e) { console.error("importCollateral error:", e); toast("Failed to import collateral: " + (e?.message || JSON.stringify(e))); }
  };

  const syncCollateral = async ({ toAdd, toUpdate, toArchive }) => {
    try {
      const updateBefore = toUpdate.map(({ _before, ...item }) => ({ id: item.id, before: _before, item }));
      const [added, updated] = await Promise.all([
        Promise.all(toAdd.map(item => db.saveDoc(item))),
        Promise.all(updateBefore.map(({ item }) => db.saveDoc(item))),
      ]);
      await Promise.all(toArchive.map(d => db.setDocArchived(d.id, true)));
      const updatedById = new Map(updated.map(d => [d.id, d]));
      const archivedIds = new Set(toArchive.map(d => d.id));
      setDocs(p => {
        const merged = p.map(d => updatedById.has(d.id) ? updatedById.get(d.id) : archivedIds.has(d.id) ? { ...d, archived: true } : d);
        return [...merged, ...added.filter(d => !merged.some(x => x.id === d.id))];
      });
      const newTags = [...added, ...updated].flatMap(d => d.tags || []);
      if (newTags.length) setGlobalTags(prev => [...new Set([...prev, ...newTags])].sort());
      const entry = addSyncHistoryEntry({
        added, archived: toArchive,
        updatedBefore: updateBefore.map(({ id, before }) => ({ id, before })),
        label: `${added.length} added, ${updated.length} updated, ${toArchive.length} archived`,
      });
      setShowImportCollateralModal(false);
      toast(`Synced: ${added.length} added, ${updated.length} updated, ${toArchive.length} archived.`, { action: { label: "Undo", onClick: () => reverseImport(entry, { skipConfirm: true }) } });
    } catch (e) { console.error("syncCollateral error:", e); toast("Failed to sync collateral: " + (e?.message || JSON.stringify(e))); }
  };

  const reverseImport = async (entry, { skipConfirm = false } = {}) => {
    if (!skipConfirm) {
      const confirmMsg = entry.type === 'collateral_sync'
        ? `Reverse this sync? ${entry.addedIds.length} added item${entry.addedIds.length !== 1 ? 's' : ''} will be deleted, ${entry.updatedBefore.length} updated item${entry.updatedBefore.length !== 1 ? 's' : ''} will be restored to their prior values, and ${entry.archivedIds.length} archived item${entry.archivedIds.length !== 1 ? 's' : ''} will be unarchived.`
        : `Remove ${entry.count} imported ${entry.type === 'runofshow' ? 'run of show rows' : entry.type === 'collateral' ? 'collateral items' : 'tasks'} from "${entry.label}"?`;
      if (!window.confirm(confirmMsg)) return;
    }
    try {
      if (entry.type === 'program') {
        await Promise.all(entry.ids.map(id => db.deleteTask(id)));
        setProgramTasks(prev => prev.filter(t => !entry.ids.includes(t.id)));
      } else if (entry.type === 'class') {
        await Promise.all(entry.ids.map(id => db.deleteTask(id)));
        setClassTasks(prev => prev.filter(t => !entry.ids.includes(t.id)));
      } else if (entry.type === 'runofshow') {
        await Promise.all(entry.ids.map(id => db.deleteRunOfShowRow(id)));
        setRunOfShow(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(sid => { next[sid] = (next[sid] || []).filter(r => !entry.ids.includes(r.id)); });
          return next;
        });
      } else if (entry.type === 'collateral') {
        await Promise.all(entry.ids.map(id => db.deleteDoc(id)));
        setDocs(prev => prev.filter(d => !entry.ids.includes(d.id)));
      } else if (entry.type === 'collateral_sync') {
        await Promise.all([
          ...entry.addedIds.map(id => db.deleteDoc(id)),
          ...entry.updatedBefore.map(({ id, before }) => db.saveDoc({ ...before, id })),
          ...entry.archivedIds.map(id => db.setDocArchived(id, false)),
        ]);
        const beforeById = new Map(entry.updatedBefore.map(u => [u.id, u.before]));
        setDocs(prev => prev
          .filter(d => !entry.addedIds.includes(d.id))
          .map(d => beforeById.has(d.id) ? beforeById.get(d.id) : entry.archivedIds.includes(d.id) ? { ...d, archived: false } : d));
      }
      setImportHistory(prev => {
        const next = prev.filter(e => e.id !== entry.id);
        localStorage.setItem('teamtasks_import_history', JSON.stringify(next));
        return next;
      });
      toast(entry.type === 'collateral_sync' ? 'Sync reversed.' : `Import reversed — ${entry.count} record${entry.count !== 1 ? 's' : ''} removed.`);
    } catch (e) {
      console.error('reverseImport error:', e);
      toast('Failed to reverse import.');
    }
  };

  // ── Run of show handlers ────────────────────────────────────────────────────
  const handleSaveRunOfShowRow   = async (sessionId, row) => db.saveRunOfShowRow(sessionId, row);
  const handleDeleteRunOfShowRow = async id => db.deleteRunOfShowRow(id);
  const handleToggleRunOfShowDone = (id, done) => {
    db.updateRunOfShowDone(id, done).catch(() => toast("Failed to save completion state"));
  };

  // ── Session handlers ────────────────────────────────────────────────────────
  const handleAddSessionFromModal = async (sessData) => {
    if (editingSession) {
      await updateSession({ ...sessData, id: editingSession.id, number: editingSession.number });
    } else {
      await saveSession({
        ...sessData,
        ...(addSessionDuplicateFrom && { duplicateFromId: addSessionDuplicateFrom.id }),
      });
    }
  };

  const openAddSession = () => { setAddSessionDuplicateFrom(null); setEditingSession(null); setShowAddSessionModal(true); };
  const openDuplicateSession = (sess) => { setAddSessionDuplicateFrom(sess); setEditingSession(null); setShowAddSessionModal(true); };
  const openEditSession = (sess) => { setEditingSession(sess); setAddSessionDuplicateFrom(null); setShowAddSessionModal(true); };

  const updateSession = async (sessionData) => {
    try {
      const saved = await db.saveSession(sessionData);
      setSessions(prev => prev.map(s => s.id === saved.id ? { ...s, ...saved } : s));
      toast("Session updated.");
    } catch (e) {
      console.error("updateSession error:", e);
      toast("Failed to update session: " + (e?.message || "unknown error"));
      throw e;
    }
  };

  const saveClassTaskTemplate = (template) => {
    setClassTaskTemplate(template);
    localStorage.setItem('teamtasks_class_task_template', JSON.stringify(template));
  };

  const saveSession = async (sessionData) => {
    try {
      const nextNumber = sessions.length > 0 ? Math.max(...sessions.map(s => s.number || 0)) + 1 : 1;
      const toSave = { ...sessionData, number: nextNumber };
      const saved = await db.saveSession(toSave);
      const updatedSessions = [...sessions, saved].sort((a, b) => a.date < b.date ? -1 : 1);
      setSessions(updatedSessions);
      if (sessionData.duplicateFromId) {
        const originalSession = sessions.find(s => s.id === sessionData.duplicateFromId);
        const sourceTasks = classTasks.filter(t => t.sessionId === sessionData.duplicateFromId);
        if (sourceTasks.length && originalSession?.date && saved.date) {
          const clonedTasks = sourceTasks.map(t => {
            let newDue = t.due;
            if (t.due && originalSession.date) {
              const offsetDays = Math.round(
                (new Date(t.due + "T12:00:00Z") - new Date(originalSession.date + "T12:00:00Z")) / 86400000
              );
              newDue = addDays(saved.date, offsetDays);
            }
            return { ...t, id: undefined, sessionId: saved.id, sessionName: saved.professor || saved.name || "", due: newDue, status: "To Do", deps: [], collateralDeps: [] };
          });
          const newTasks = await db.bulkInsertTasks(clonedTasks, updatedSessions);
          setClassTasks(prev => appendNewTasks(prev, newTasks));
        }
      } else if (sessionData.addTasks) {
        const newTasks = await db.bulkInsertTasks(genClassTasks([saved], classTaskTemplate), updatedSessions);
        setClassTasks(prev => appendNewTasks(prev, newTasks));
      }
      toast(`Session added for ${saved.professor || saved.name}.`);
      return saved;
    } catch (e) {
      console.error("saveSession error:", e);
      toast("Failed to save session: " + (e?.message || "unknown error"));
      throw e;
    }
  };

  const deleteSession = async (sessionId) => {
    const sess = sessions.find(s => s.id === sessionId);
    if (!sess) return;
    const taskCount = classTasks.filter(t => t.sessionId === sessionId).length;
    const label = sess.professor || sess.name;
    const msg = taskCount > 0
      ? `Delete session "${label}"? This will also delete ${taskCount} associated task${taskCount !== 1 ? "s" : ""}.`
      : `Delete session "${label}"?`;
    if (!window.confirm(msg)) return;
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setClassTasks(prev => prev.filter(t => t.sessionId !== sessionId));
    try {
      await db.deleteSession(sessionId);
      toast(`Session "${label}" deleted.`);
    } catch {
      toast("Failed to delete session.");
    }
  };

  const addSelectedTasksToSession = async (sessionId, items) => {
    const sess = sessions.find(s => s.id === sessionId);
    if (!sess) return;
    try {
      const newTasks = await db.bulkInsertTasks(genClassTasks([sess], items), sessions);
      setClassTasks(prev => appendNewTasks(prev, newTasks));
      toast(`${newTasks.length} task${newTasks.length !== 1 ? "s" : ""} added.`);
    } catch (e) {
      toast("Failed to add tasks.");
      throw e;
    }
  };

  const applyTemplateToSession = async (sessionId) => {
    const sess = sessions.find(s => s.id === sessionId);
    if (!sess) return;
    try {
      const newTasks = await db.bulkInsertTasks(genClassTasks([sess], classTaskTemplate), sessions);
      setClassTasks(prev => appendNewTasks(prev, newTasks));
      toast(`${newTasks.length} tasks added to ${sess.professor || sess.name}.`);
    } catch (e) {
      console.error("applyTemplateToSession error:", e);
      toast("Failed to apply template: " + (e?.message || "unknown error"));
    }
  };

  // ── Misc ────────────────────────────────────────────────────────────────────
  const getBlockedStatus = task => {
    if (!task.deps?.length) return null;
    const bl = task.deps.map(id => allTasks.find(t => t.id === id)).filter(Boolean);
    if (bl.every(t => t.status === "Done"))                       return "clear";
    if (bl.some(t => t.status !== "Done" && isOverdue(t.due)))   return "at-risk";
    return "blocked";
  };

  const displayProgramTasks = viewingArchive ? viewingArchive.programTasks : programTasks;
  const displayClassTasks   = viewingArchive ? viewingArchive.classTasks   : classTasks;
  const displayTasks        = taskTypeFilter === "program" ? displayProgramTasks : taskTypeFilter === "class" ? displayClassTasks : [];
  const displayAllTasks     = [...displayProgramTasks, ...displayClassTasks];
  const displayDocs         = viewingArchive ? viewingArchive.docs : docs;
  const isAdmin             = myRole === "admin";
  const isViewer            = myRole === "viewer";
  const isReadOnly          = !!viewingArchive || isViewer;
  const isMobile            = useIsMobile();
  // Case/whitespace-insensitive name -> profile id, so picking a name in the
  // Assignee dropdown that matches a real account auto-links it (see TaskModal).
  const profileIdByName = useMemo(() => {
    const map = {};
    profiles.forEach(p => { if (p.name) map[p.name.trim().toLowerCase()] = p.id; });
    return map;
  }, [profiles]);
  const sortByDue = ts => [...ts].sort((a, b) => { if (!a.due && !b.due) return 0; if (!a.due) return 1; if (!b.due) return -1; return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
  const _today = new Date().toISOString().slice(0, 10);
  const applyDateFilter = t => {
    if (dateFilter === "All")          return true;
    if (dateFilter === "Overdue")      return !!t.due && t.due < _today && t.status !== "Done";
    if (dateFilter === "Due today")    return t.due === _today;
    if (dateFilter === "Next 7 days")  return !!t.due && t.due >= _today && t.due <= addDays(_today, 7);
    if (dateFilter === "Next 30 days") return !!t.due && t.due >= _today && t.due <= addDays(_today, 30);
    if (dateFilter === "No due date")  return !t.due;
    return true;
  };
  const _tsq = taskSearch.trim().toLowerCase();
  const matchesTaskSearch = t => !_tsq || (t.title||"").toLowerCase().includes(_tsq) || (t.assignee||"").toLowerCase().includes(_tsq) || (t.notes||"").toLowerCase().includes(_tsq) || (t.tags||[]).some(g => g.toLowerCase().includes(_tsq));
  const filteredTasks       = sortByDue(displayTasks.filter(t => deptFilter === "All" || t.department === deptFilter).filter(t => ownerFilter === "All" || t.assignee === ownerFilter || t.assist === ownerFilter).filter(t => sessionFilter === "all" || t.sessionId === sessionFilter).filter(applyDateFilter).filter(matchesTaskSearch));
  const myFilteredTasks     = sortByDue(displayTasks.filter(t => t.assignee === myUser || t.assist === myUser).filter(t => deptFilter === "All" || t.department === deptFilter).filter(t => ownerFilter === "All" || t.assignee === ownerFilter || t.assist === ownerFilter).filter(t => sessionFilter === "all" || t.sessionId === sessionFilter).filter(applyDateFilter).filter(matchesTaskSearch));

  const openTask     = t => { if (!isReadOnly) { setEditTask(t); setShowTaskModal(true); } };

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const markNotifRead = async id => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await db.markNotificationRead(id); } catch (e) { console.error(e); }
  };
  const markAllNotifsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await db.markAllNotificationsRead(); } catch (e) { console.error(e); }
  };
  const openNotification = n => {
    if (!n.read) markNotifRead(n.id);
    if (n.task_id) {
      const t = allTasks.find(x => x.id === n.task_id);
      if (t) openTask(t);
    }
  };

  const openDoc      = d => { if (!isReadOnly) { setEditDoc(d); setShowDocModal(true); } };
  const openSettings = (tab = "owners") => { setSettingsTab(tab); setShowSettings(true); };

  const newTaskBase     = { title: "", assignee: myUser, assignee_id: userId || null, assist: "", due: "", status: "To Do", notes: "", deps: [], collateralDeps: [], attachedDocs: [], tags: [], offset: 0, fallOffset: 0, department: "", type: taskTypeFilter };
  const taskTypeOptions = [["program", "Program tasks"], ["class", "Class tasks"]];
  const showTaskList    = taskTypeFilter === "program" || taskTypeFilter === "class";

  // ── Screens ─────────────────────────────────────────────────────────────────
  const loadingScreen = (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Loading…</div>
    </div>
  );

  if (session === undefined) return loadingScreen;
  if (!session) return <AuthScreen />;
  if (loading)  return loadingScreen;

  // ── Main app ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", flexDirection: "column" }}>
      {/* Toasts */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(n => (
          <div key={n.id} style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "var(--color-text-primary)", maxWidth: 320, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between" }}>
            <span>{n.msg}</span>
            {n.action && <button onClick={() => { n.action.onClick(); setToasts(ts => ts.filter(x => x.id !== n.id)); }} style={{ fontSize: 13, fontWeight: 600, color: "#185FA5", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, whiteSpace: "nowrap" }}>{n.action.label}</button>}
          </div>
        ))}
      </div>

      {/* Top nav */}
      <div style={{ position: "relative", zIndex: 10, background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ padding: isMobile ? "0 12px" : "0 24px", display: "flex", alignItems: "center", gap: 12, height: 52, overflowX: isMobile ? "auto" : "visible" }}>
          <span onClick={() => setView(prefs.defaultView || "board")} style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)", flexShrink: 0, cursor: "pointer" }}>{isMobile ? "TT" : "Team Tasks"}</span>

          {/* Cycle selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, borderLeft: "0.5px solid var(--color-border-tertiary)", paddingLeft: 12, flexShrink: 0 }}>
            {!isMobile && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Cycle:</span>}
            {renamingCycle ? (
              <>
                <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitRenameCycle(); if (e.key === 'Escape') setRenamingCycle(false); }} style={{ fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "3px 8px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", width: 180 }} />
                <button onClick={commitRenameCycle} style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: "pointer" }}>Save</button>
                <button onClick={() => setRenamingCycle(false)} style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancel</button>
              </>
            ) : (
              <select value={viewingArchive ? String(viewingArchive.cycle.id) : "__active__"} onChange={e => { if (e.target.value === "__active__") setViewingArchive(null); else { const a = archivedCycles.find(x => String(x.cycle.id) === e.target.value); setViewingArchive(a || null); } }} style={{ fontSize: 13, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "3px 8px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", maxWidth: isMobile ? 130 : undefined }}>
                <option value="__active__">{activeCycle?.name || "No active cycle"} (active)</option>
                {archivedCycles.map(a => <option key={a.cycle.id} value={String(a.cycle.id)}>{a.cycle.name} (archived)</option>)}
              </select>
            )}
            {isReadOnly && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#FAEEDA", color: "#854F0B" }}>read-only</span>}
          </div>

          {/* Mobile consolidated "+ Add" menu — merges Program/Classes/Import into one button (desktop equivalents now live in the left sidebar) */}
          {isMobile && !isReadOnly && (
            <div style={{ position: "relative", zIndex: 100 }}>
              <button onClick={() => setOpenDropdown(openDropdown === 'mobileMenu' ? null : 'mobileMenu')} aria-haspopup="menu" aria-expanded={openDropdown === 'mobileMenu'} style={{ fontSize: 13, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: openDropdown === 'mobileMenu' ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>+ Add ▾</button>
              {openDropdown === 'mobileMenu' && (
                <div role="menu" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 200, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 200, maxHeight: "70vh", overflowY: "auto" }}>
                  <button type="button" role="menuitem" onClick={() => { setOpenDropdown(null); setEditTask({ ...newTaskBase }); setShowTaskModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)", border: "none", background: "transparent", width: "100%", textAlign: "left", display: "block", font: "inherit" }}>Add new task</button>
                  <button type="button" role="menuitem" onClick={() => { setOpenDropdown(null); setEditMilestone({ title: "", date: "", deps: [], collateralDeps: [] }); setShowMilestoneModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)", border: "none", background: "transparent", width: "100%", textAlign: "left", display: "block", font: "inherit" }}>Add milestone</button>
                  <button type="button" role="menuitem" onClick={() => { setOpenDropdown(null); setEditDoc({ title: "", type: "Google Drive", audience: "", description: "", updated: new Date().toISOString().slice(0, 10), next_update: "", owner: "", content_owner: "", assist: "", url: "", shareable_link: "", tags: [] }); setShowDocModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)", border: "none", background: "transparent", width: "100%", textAlign: "left", display: "block", font: "inherit" }}>Add collateral</button>
                  <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                  <button type="button" role="menuitem" onClick={() => { setOpenDropdown(null); openAddSession(); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)", border: "none", background: "transparent", width: "100%", textAlign: "left", display: "block", font: "inherit" }}>Add session</button>
                  <button type="button" role="menuitem" onClick={() => { setOpenDropdown(null); setShowSessionsListModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)", border: "none", background: "transparent", width: "100%", textAlign: "left", display: "block", font: "inherit" }}>Manage sessions</button>
                  <button type="button" role="menuitem" onClick={() => { setOpenDropdown(null); setShowStandardTasksModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)", border: "none", background: "transparent", width: "100%", textAlign: "left", display: "block", font: "inherit" }}>Standard tasks</button>
                  <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                  <button type="button" role="menuitem" onClick={() => { setOpenDropdown(null); exportTasksToCSV(displayProgramTasks, displayClassTasks, (viewingArchive ? viewingArchive.cycle : activeCycle)?.name); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)", border: "none", background: "transparent", width: "100%", textAlign: "left", display: "block", font: "inherit" }}>Export tasks to CSV</button>
                </div>
              )}
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {draftCycle && !isMobile && (
              <div style={{ display: "flex", alignItems: "center", borderRadius: 20, border: "1px solid #9FE1CB", background: "#E1F5EE", overflow: "hidden" }}>
                <button onClick={() => setShowCycleModal(true)} style={{ fontSize: 12, padding: "4px 6px 4px 12px", border: "none", background: "transparent", color: "#0F6E56", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0F6E56", display: "inline-block" }}></span>{draftCycle.cycle.name}</button>
                <button onClick={deleteDraft} title="Delete draft" aria-label="Delete draft" style={{ fontSize: 14, padding: "4px 10px 4px 4px", border: "none", background: "transparent", color: "#0F6E56", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            )}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button onClick={() => setOpenDropdown(openDropdown === 'notifications' ? null : 'notifications')} aria-haspopup="true" aria-expanded={openDropdown === 'notifications'} aria-label={unreadNotifCount > 0 ? `Notifications, ${unreadNotifCount} unread` : "Notifications"} style={{ position: "relative", width: 28, height: 28, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: openDropdown === 'notifications' ? "var(--color-background-secondary)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-secondary)" }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadNotifCount > 0 && (
                  <span aria-hidden="true" style={{ position: "absolute", top: 1, right: 1, minWidth: 14, height: 14, borderRadius: 8, background: "#A32D2D", color: "#fff", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", boxSizing: "border-box" }}>{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</span>
                )}
              </button>
              {openDropdown === 'notifications' && (
                <div role="menu" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: isMobile ? "calc(100vw - 24px)" : 340, maxHeight: 420, overflowY: "auto", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 400 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", position: "sticky", top: 0, background: "var(--color-background-primary)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Notifications</span>
                    {unreadNotifCount > 0 && <button onClick={markAllNotifsRead} style={{ fontSize: 12, border: "none", background: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>Mark all read</button>}
                  </div>
                  {notifications.length === 0 && (
                    <div style={{ padding: "24px 14px", fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center" }}>No notifications yet.</div>
                  )}
                  {notifications.map(n => (
                    <button key={n.id} type="button" onClick={() => { openNotification(n); setOpenDropdown(null); }} style={{ width: "100%", textAlign: "left", display: "block", border: "none", borderBottom: "0.5px solid var(--color-border-tertiary)", background: n.read ? "transparent" : "var(--color-background-secondary)", padding: "10px 14px", cursor: "pointer", font: "inherit" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        {!n.read && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#185FA5", flexShrink: 0, marginTop: 5 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "var(--color-text-primary)", marginBottom: 2 }}>{n.message}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => openSettings("preferences")} title="My preferences" style={{ width: 28, height: 28, borderRadius: "50%", background: avatarBg(myUser), border: "none", fontSize: 11, fontWeight: 500, color: avatarTx(myUser), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(myUser)}</button>
              {!isMobile && <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{myUser}</span>}
              <button onClick={signOut} title="Sign out" style={{ fontSize: 12, padding: isMobile ? "4px 8px" : "4px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", flexShrink: 0 }}>{isMobile ? "⏻" : "Sign out"}</button>
            </div>
          </div>
        </div>
        <div style={{ padding: isMobile ? "0 12px" : "0 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 0, alignItems: "center", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {VIEWS.map(v => <button key={v} onClick={() => setView(v)} style={{ fontSize: 13, padding: "10px 16px", border: "none", borderBottom: view === v ? "2px solid var(--color-text-primary)" : "2px solid transparent", background: "transparent", color: view === v ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: view === v ? 500 : 400 }}>{VIEW_LABELS[v]}</button>)}
        </div>
      </div>

      {/* Body: collapsible action sidebar (desktop) + main content */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {!isMobile && (
          <div style={{ width: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED, flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", transition: "width 0.15s ease" }}>
            <div style={{ display: "flex", justifyContent: sidebarCollapsed ? "center" : "flex-end", padding: 8 }}>
              <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"} title={sidebarCollapsed ? "Expand menu" : "Collapse menu"} style={{ width: 28, height: 28, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-secondary)", transform: sidebarCollapsed ? "rotate(180deg)" : "none" }}>
                  <path d="M11 17 6 12l5-5"/>
                  <path d="M18 17l-5-5 5-5"/>
                </svg>
              </button>
            </div>

            <div ref={dropdownsRef} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px 8px", overflowY: "auto" }}>

              {/* Cycle — cycle lifecycle is admin-only */}
              {isAdmin && (() => {
                const cycleItems = viewingArchive ? [
                  { label: "Rename cycle",     onClick: () => { startRenameCycle(); } },
                  { label: "Reactivate cycle", onClick: () => { reactivateCycle(viewingArchive); } },
                  { divider: true },
                  { label: "Delete cycle", danger: true, onClick: () => { deleteArchivedCycle(viewingArchive); } },
                ] : [
                  { label: "Rename cycle", onClick: () => { startRenameCycle(); } },
                  { divider: true },
                  { label: "Delete cycle", danger: true, onClick: () => { deleteActiveCycle(); } },
                  { divider: true },
                  ...(draftCycle
                    ? [{ label: "Edit draft", onClick: () => { setShowCycleModal(true); } }]
                    : [
                        { label: "+ New Spring cycle", onClick: () => { setNewCycleType("spring"); setShowCycleModal(true); } },
                        { label: "+ New Fall cycle",   onClick: () => { setNewCycleType("fall"); setShowCycleModal(true); } },
                      ]),
                ];
                const isOpen = !!expandedSidebar.cycle;
                return (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => sidebarCollapsed ? openSidebarSectionExpanding('cycle') : toggleSidebarSection('cycle')} aria-expanded={isOpen} title={sidebarCollapsed ? "Cycle" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", fontSize: 13, padding: sidebarCollapsed ? "10px 0" : "10px 12px", justifyContent: sidebarCollapsed ? "center" : "flex-start", borderRadius: "var(--border-radius-md)", border: "none", background: isOpen ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>
                      <SidebarIcon name="cycle" />
                      {!sidebarCollapsed && <span style={{ flex: 1, textAlign: "left" }}>Cycle</span>}
                      {!sidebarCollapsed && <span aria-hidden="true" style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "inline-block", transition: "transform 0.15s ease", transform: isOpen ? "rotate(90deg)" : "none" }}>▸</span>}
                    </button>
                    {!sidebarCollapsed && isOpen && <SidebarInlineItems items={cycleItems} />}
                  </div>
                );
              })()}

              {/* Program */}
              {!isReadOnly && (() => {
                const programItems = [
                  { label: "Add new task",   onClick: () => { setEditTask({ ...newTaskBase }); setShowTaskModal(true); } },
                  { label: "Add milestone",  onClick: () => { setEditMilestone({ title: "", date: "", deps: [], collateralDeps: [] }); setShowMilestoneModal(true); } },
                  { label: "Add collateral", onClick: () => { setEditDoc({ title: "", type: "Google Drive", audience: "", description: "", updated: new Date().toISOString().slice(0, 10), next_update: "", owner: "", content_owner: "", assist: "", url: "", shareable_link: "", tags: [] }); setShowDocModal(true); } },
                ];
                const isOpen = !!expandedSidebar.program;
                return (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => sidebarCollapsed ? openSidebarSectionExpanding('program') : toggleSidebarSection('program')} aria-expanded={isOpen} title={sidebarCollapsed ? "Program" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", fontSize: 13, padding: sidebarCollapsed ? "10px 0" : "10px 12px", justifyContent: sidebarCollapsed ? "center" : "flex-start", borderRadius: "var(--border-radius-md)", border: "none", background: isOpen ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>
                      <SidebarIcon name="program" />
                      {!sidebarCollapsed && <span style={{ flex: 1, textAlign: "left" }}>Program</span>}
                      {!sidebarCollapsed && <span aria-hidden="true" style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "inline-block", transition: "transform 0.15s ease", transform: isOpen ? "rotate(90deg)" : "none" }}>▸</span>}
                    </button>
                    {!sidebarCollapsed && isOpen && <SidebarInlineItems items={programItems} />}
                  </div>
                );
              })()}

              {/* Classes */}
              {!isReadOnly && (() => {
                const classesItems = [
                  { label: "Add session",      onClick: () => { openAddSession(); } },
                  { label: "Manage sessions",  onClick: () => { setShowSessionsListModal(true); } },
                  { label: "Standard tasks",   onClick: () => { setShowStandardTasksModal(true); } },
                ];
                const isOpen = !!expandedSidebar.classes;
                return (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => sidebarCollapsed ? openSidebarSectionExpanding('classes') : toggleSidebarSection('classes')} aria-expanded={isOpen} title={sidebarCollapsed ? "Classes" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", fontSize: 13, padding: sidebarCollapsed ? "10px 0" : "10px 12px", justifyContent: sidebarCollapsed ? "center" : "flex-start", borderRadius: "var(--border-radius-md)", border: "none", background: isOpen ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>
                      <SidebarIcon name="classes" />
                      {!sidebarCollapsed && <span style={{ flex: 1, textAlign: "left" }}>Classes</span>}
                      {!sidebarCollapsed && <span aria-hidden="true" style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "inline-block", transition: "transform 0.15s ease", transform: isOpen ? "rotate(90deg)" : "none" }}>▸</span>}
                    </button>
                    {!sidebarCollapsed && isOpen && <SidebarInlineItems items={classesItems} />}
                  </div>
                );
              })()}

              {/* Import / Export */}
              {!isReadOnly && (() => {
                const importItems = [
                  { label: "Import tasks from CSV",       onClick: () => { setImportModalTab("program"); setShowImportModal(true); } },
                  { label: "Import collateral from CSV",  onClick: () => { setShowImportCollateralModal(true); } },
                  { label: "Undo an import…",             onClick: () => { setImportModalTab("history"); setShowImportModal(true); } },
                  { divider: true },
                  { label: "Export tasks to CSV",         onClick: () => { exportTasksToCSV(displayProgramTasks, displayClassTasks, (viewingArchive ? viewingArchive.cycle : activeCycle)?.name); } },
                ];
                const isOpen = !!expandedSidebar.import;
                return (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => sidebarCollapsed ? openSidebarSectionExpanding('import') : toggleSidebarSection('import')} aria-expanded={isOpen} title={sidebarCollapsed ? "Import / Export" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", fontSize: 13, padding: sidebarCollapsed ? "10px 0" : "10px 12px", justifyContent: sidebarCollapsed ? "center" : "flex-start", borderRadius: "var(--border-radius-md)", border: "none", background: isOpen ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>
                      <SidebarIcon name="import" />
                      {!sidebarCollapsed && <span style={{ flex: 1, textAlign: "left" }}>Import / Export</span>}
                      {!sidebarCollapsed && <span aria-hidden="true" style={{ fontSize: 11, color: "var(--color-text-tertiary)", display: "inline-block", transition: "transform 0.15s ease", transform: isOpen ? "rotate(90deg)" : "none" }}>▸</span>}
                    </button>
                    {!sidebarCollapsed && isOpen && <SidebarInlineItems items={importItems} />}
                  </div>
                );
              })()}

              <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: sidebarCollapsed ? "6px 4px" : "6px 8px" }} />

              {/* Settings */}
              <button onClick={() => openSettings("preferences")} title={sidebarCollapsed ? "Settings" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", fontSize: 13, padding: sidebarCollapsed ? "10px 0" : "10px 12px", justifyContent: sidebarCollapsed ? "center" : "flex-start", borderRadius: "var(--border-radius-md)", border: "none", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>
                <SidebarIcon name="settings" />
                {!sidebarCollapsed && <span style={{ flex: 1, textAlign: "left" }}>Settings</span>}
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, padding: isMobile ? 12 : 24, minWidth: 0 }}>
        {(view === "board" || view === "list" || view === "mytasks") && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, padding: "4px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", flexShrink: 0 }}>
              {taskTypeOptions.filter(([t]) => view !== "board" || t !== "class").map(([t, l]) => (
                <button key={t} onClick={() => setTaskTypeFilter(t)} style={{ fontSize: 13, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "none", background: taskTypeFilter === t ? "var(--color-background-primary)" : "transparent", color: taskTypeFilter === t ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: taskTypeFilter === t ? 500 : 400, boxShadow: taskTypeFilter === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{l}</button>
              ))}
            </div>
            {showTaskList && <>
              <div style={{ width: "0.5px", height: 20, background: "var(--color-border-tertiary)", flexShrink: 0 }} />
              <FilterDropdown label="Department" options={["All", ...departments]} value={deptFilter} onChange={setDeptFilter} />
              <FilterDropdown label="Owner" options={["All", ...members]} value={ownerFilter} onChange={setOwnerFilter} />
              {taskTypeFilter === "class" && sessions.length > 0 && (() => {
                const sorted = [...sessions].sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
                const sessionLabel = s => { const prof = s.professor || s.name || "Session"; const cohort = s.cohort ? ` — ${s.cohort}` : ""; const date = s.date ? ` · ${fmtDate(s.date)}` : ""; return `${prof}${cohort}${date}`; };
                const labelToId = Object.fromEntries(sorted.map(s => [sessionLabel(s), s.id]));
                const idToLabel = Object.fromEntries(sorted.map(s => [s.id, sessionLabel(s)]));
                const sessionOptions = ["All", ...sorted.map(sessionLabel)];
                const sessionValue = sessionFilter === "all" ? "All" : (idToLabel[sessionFilter] ?? "All");
                return (
                  <FilterDropdown
                    label="Session"
                    options={sessionOptions}
                    value={sessionValue}
                    onChange={v => setSessionFilter(v === "All" ? "all" : labelToId[v])}
                  />
                );
              })()}
              <FilterDropdown label="Due date" options={["All","Overdue","Due today","Next 7 days","Next 30 days","No due date"]} value={dateFilter} onChange={setDateFilter} />
              {(deptFilter !== "All" || ownerFilter !== "All" || sessionFilter !== "all" || dateFilter !== "All") && <button onClick={() => { setDeptFilter("All"); setOwnerFilter("All"); setSessionFilter("all"); setDateFilter("All"); }} style={{ fontSize: 12, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Clear</button>}
              <div style={{ position: "relative", marginLeft: "auto" }}>
                <span aria-hidden="true" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-tertiary)", pointerEvents: "none" }}>⌕</span>
                <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="Search..." style={{ fontSize: 13, padding: "5px 10px 5px 26px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: 180 }} />
                {taskSearch && <button onClick={() => setTaskSearch("")} aria-label="Clear search" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 14, color: "var(--color-text-tertiary)", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>}
              </div>
            </>}
          </div>
        )}

        <div style={{display:view==="runofshow"?"":"none"}}>
          <RunOfShowView sessions={sessions} runOfShow={runOfShow} setRunOfShow={setRunOfShow} onSaveRow={handleSaveRunOfShowRow} onDeleteRow={handleDeleteRunOfShowRow} onToggleDone={handleToggleRunOfShowDone} members={members} profileIdByName={profileIdByName} isReadOnly={isReadOnly} rosProf={rosProf} rosDate={rosDate} onRosSel={handleRosSel} />
        </div>

        <div style={{display:view==="board"&&showTaskList?"":"none"}}>
          <BoardView filteredTasks={filteredTasks.filter(t=>t.type==="program").filter(t=>t.assignee===myUser||t.assist===myUser)} displayTasks={allTasks} displayDocs={displayDocs} milestones={milestones} isReadOnly={isReadOnly} boardGroup={boardGroup} setBoardGroup={setBoardGroup} openTask={openTask} onViewMilestone={m=>{setViewMilestone(m);setShowMilestoneDetail(true);}} updateStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} />
        </div>

        <div style={{display:view==="list"&&showTaskList?"":"none"}}>
          <ListView filteredTasks={filteredTasks} displayTasks={allTasks} displayDocs={displayDocs} milestones={milestones} isReadOnly={isReadOnly} listGroup={listGroup} setListGroup={setListGroup} openTask={openTask} onAddTask={()=>{setEditTask({...newTaskBase});setShowTaskModal(true);}} onAddMilestone={()=>{setEditMilestone({title:"",date:"",deps:[],collateralDeps:[]});setShowMilestoneModal(true);}} onEditMilestone={m=>{setViewMilestone(m);setShowMilestoneDetail(true);}} updateStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} onDeleteSelected={deleteSelectedTasks} sessions={taskTypeFilter==="class"?sessions:undefined} isMobile={isMobile} />
        </div>

        <div style={{display:view==="mytasks"&&showTaskList?"":"none"}}>
          <ListView filteredTasks={myFilteredTasks} displayTasks={allTasks} displayDocs={displayDocs} milestones={milestones} isReadOnly={isReadOnly} listGroup={listGroup} setListGroup={setListGroup} openTask={openTask} onAddTask={()=>{setEditTask({...newTaskBase});setShowTaskModal(true);}} onEditMilestone={m=>{setViewMilestone(m);setShowMilestoneDetail(true);}} updateStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} onDeleteSelected={deleteSelectedTasks} sessions={taskTypeFilter==="class"?sessions:undefined} isMobile={isMobile} />
        </div>

        <div style={{display:view==="calendar"?"":"none"}}>
          <CalendarView tasks={displayAllTasks} milestones={milestones} sessions={sessions} openTask={openTask} statusColors={statusColors} myUser={myUser} />
        </div>

        <div style={{display:view==="collateral"?"":"none"}}>
          <CollateralView docs={displayDocs} isReadOnly={isReadOnly} onSave={saveDoc} onDelete={deleteDoc} onDeleteSelected={deleteSelectedDocs} onArchiveSelected={archiveSelectedDocs} onUnarchive={unarchiveDoc} onAddDoc={()=>{setEditDoc({title:"",type:"Google Drive",audience:"",description:"",updated:new Date().toISOString().slice(0,10),next_update:"",owner:"",content_owner:"",assist:"",url:"",shareable_link:"",tags:[]});setShowDocModal(true);}} members={members} audiences={audiences} globalTags={globalTags} businessLines={businessLines} />
        </div>

        <div style={{display:view==="search"?"":"none"}}>
          <SearchView displayTasks={displayAllTasks} displayDocs={displayDocs} isReadOnly={isReadOnly} openTask={openTask} openDoc={openDoc} updateStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} />
        </div>
        </div>
      </div>

      {/* Modals */}
      {showAddSessionModal && !isReadOnly && <AddSessionModal isDuplicate={!!addSessionDuplicateFrom} isEdit={!!editingSession} initialData={editingSession ? { id: editingSession.id, professor: editingSession.professor || editingSession.name || "", cohort: editingSession.cohort || "Cohort 1", date: editingSession.date || "", addTasks: false } : addSessionDuplicateFrom ? { professor: addSessionDuplicateFrom.professor || addSessionDuplicateFrom.name || "", cohort: addSessionDuplicateFrom.cohort || "Cohort 1", date: "", addTasks: false } : undefined} template={classTaskTemplate} onSave={handleAddSessionFromModal} onClose={() => { setShowAddSessionModal(false); setAddSessionDuplicateFrom(null); setEditingSession(null); }} />}
      {showSessionsListModal && !isReadOnly && <SessionsListModal sessions={sessions} classTasks={classTasks} onEdit={s => { setShowSessionsListModal(false); openEditSession(s); }} onDuplicate={s => { setShowSessionsListModal(false); openDuplicateSession(s); }} onDelete={deleteSession} onClose={() => setShowSessionsListModal(false)} />}
      {showStandardTasksModal && !isReadOnly && <StandardTasksModal template={classTaskTemplate} members={members} sessions={sessions} onSaveTemplate={saveClassTaskTemplate} onApplyTemplate={applyTemplateToSession} onClose={() => setShowStandardTasksModal(false)} />}
      {showTaskModal     && editTask     && <TaskModal task={editTask} tasks={allTasks} docs={docs} milestones={milestones} members={members} departments={departments} globalTags={globalTags} prefs={prefs} sessions={sessions} profileIdByName={profileIdByName} onChange={setEditTask} onSave={saveTask} onDelete={deleteTask} onClose={() => { setShowTaskModal(false); setEditTask(null); }} />}
      {showDocModal      && editDoc      && <DocModal doc={editDoc} members={members} audiences={audiences} globalTags={globalTags} businessLines={businessLines} prefs={prefs} profileIdByName={profileIdByName} onChange={setEditDoc} onSave={saveDoc} onDelete={deleteDoc} onClose={() => { setShowDocModal(false); setEditDoc(null); }} />}
      {showMilestoneDetail && viewMilestone && (()=>{ const dm = milestones.find(m=>m.id===viewMilestone.id) ?? viewMilestone; return <MilestoneDetailModal milestone={dm} tasks={allTasks} docs={docs} onEdit={m=>{setShowMilestoneDetail(false);setViewMilestone(null);setEditMilestone({...m,deps:m.deps||[],collateralDeps:m.collateralDeps||[]});setShowMilestoneModal(true);}} onClose={()=>{setShowMilestoneDetail(false);setViewMilestone(null);}}/> })()}
      {showMilestoneModal && editMilestone && <MilestoneModal milestone={editMilestone} onChange={setEditMilestone} onSave={saveMilestone} onDelete={deleteMilestone} tasks={allTasks} docs={docs} onClose={() => { setShowMilestoneModal(false); setEditMilestone(null); }} />}
      {showCycleModal    && <CycleModal tasks={programTasks} activeCycle={activeCycle} initialDraft={draftCycle} sessions={sessions} cycleType={draftCycle?.cycleType || newCycleType} onSaveDraft={saveDraft} onLaunch={launchCycle} onClose={() => setShowCycleModal(false)} />}
      {showImportModal   && <ImportModal onImportProgram={importProgram} onImportClass={importClass} onImportRunOfShow={importROS} sessions={sessions} cycle={activeCycle} importHistory={importHistory} onReverseImport={reverseImport} initialTab={importModalTab} onClose={() => setShowImportModal(false)} />}
      {showImportCollateralModal && <ImportCollateralModal onImport={importCollateral} onSync={syncCollateral} docs={docs} onClose={() => setShowImportCollateralModal(false)} />}
      {showSettings      && <SettingsModal initialTab={settingsTab} members={members} setMembers={setMembersSync} departments={departments} setDepartments={setDepartmentsSync} audiences={audiences} setAudiences={setAudiencesSync} globalTags={globalTags} setGlobalTags={setGlobalTagsSync} businessLines={businessLines} setBusinessLines={setBusinessLinesSync} myUser={myUser} myUserId={userId} isAdmin={isAdmin} prefs={prefs} updatePrefs={updatePrefs} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
