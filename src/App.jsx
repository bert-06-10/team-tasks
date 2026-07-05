import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BoardView, ListView, CalendarView, SearchView } from "./components/MainViews.jsx";
import { RunOfShowView, ListHeader, ListRow, DocCard, CollateralView } from "./components/TaskViews.jsx";
import { FilterDropdown } from "./components/Primitives.jsx";
import { SettingsModal } from "./components/Settings.jsx";
import { MilestoneModal, MilestoneDetailModal, TaskModal, DocModal, ImportModal, ImportCollateralModal, CycleModal, AddSessionModal, StandardTasksModal } from "./components/Modals.jsx";
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
  const [audiences,    setAudiences]    = useState([]);
  const [globalTags,   setGlobalTags]   = useState([]);
  const [activeCycle,  setActiveCycle]  = useState(null);
  const [archivedCycles, setArchivedCycles] = useState([]);
  const [loading,      setLoading]      = useState(true);

  // ── User / prefs state ──────────────────────────────────────────────────────
  const [myUser,    setMyUser]    = useState("");
  const [myRole,    setMyRole]    = useState("staff"); // 'admin' | 'staff' | 'viewer' — mirrors profiles.role
  const [profiles,  setProfiles]  = useState([]); // every {id,name,email,role} — used to link assignees to real accounts
  const [userPrefs, setUserPrefs] = useState(DEFAULT_USER_PREFS);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [toasts,                    setToasts]                    = useState([]);
  const [view, setViewRaw] = useState(() => { const s = sessionStorage.getItem('teamtasks_view'); return (s && s !== 'classes') ? s : 'board'; });
  const setView = useCallback((v) => { setViewRaw(v); sessionStorage.setItem('teamtasks_view', v); }, []);
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
  const [settingsTab,               setSettingsTab]               = useState("owners");
  const [editTask,      setEditTask]      = useState(null);
  const [editDoc,       setEditDoc]       = useState(null);
  const [editMilestone, setEditMilestone] = useState(null);

  // Keep a ref so realtime handlers always see current sessions without stale closure
  const sessionsRef = useRef([]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  // ── Dropdown click-outside handler ──────────────────────────────────────────
  const dropdownsRef = useRef(null);
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e) => {
      if (dropdownsRef.current && !dropdownsRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  // ── Refs for config-list diffing ────────────────────────────────────────────
  const membersRef     = useRef([]);
  const departmentsRef = useRef([]);
  const audiencesRef   = useRef([]);
  const globalTagsRef  = useRef([]);
  useEffect(() => { membersRef.current     = members;     }, [members]);
  useEffect(() => { departmentsRef.current = departments; }, [departments]);
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
  const toast = useCallback((msg) => {
    const id = Date.now();
    setToasts(n => [...n, { id, msg }]);
    setTimeout(() => setToasts(n => n.filter(x => x.id !== id)), 4000);
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
      const [membersList, deptList, audList, tagList, sessionsData, cycle, archived, allProfiles] =
        await Promise.all([
          db.fetchMembers(), db.fetchDepartments(), db.fetchAudiences(),
          db.fetchGlobalTags(), db.fetchSessions(), db.fetchActiveCycle(),
          db.fetchArchivedCycles(), db.fetchAllProfiles(),
        ]);
      setProfiles(allProfiles);

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
      } else if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !s)) {
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
            next_update: r.next_update || '',
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
  const setAudiencesSync   = useCallback(n => syncList(setAudiences,   audiencesRef,   n, db.addAudience,   db.removeAudience,   db.updateAudience),   [syncList]);
  const setGlobalTagsSync  = useCallback(n => syncList(setGlobalTags,  globalTagsRef,  n, db.addGlobalTag,  db.removeGlobalTag,  db.updateGlobalTag),  [syncList]);

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
        if (saved.type === "program") setProgramTasks(p => [...p, saved]);
        else setClassTasks(p => [...p, saved]);
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
  };

  const importProgram = async (rows, cycleInfo) => {
    try {
      if (cycleInfo) {
        const newCycle = await db.upsertActiveCycle({ name: cycleInfo.name, start: cycleInfo.start, end: null, holidays: [] });
        setActiveCycle(newCycle);
      }
      const saved = await db.bulkInsertTasks(rows, sessions);
      setProgramTasks(p => [...p, ...saved]);
      addToImportHistory('program', saved, `${saved.length} program task${saved.length !== 1 ? 's' : ''}`);
      setShowImportModal(false);
      toast(cycleInfo ? `Cycle "${cycleInfo.name}" created and ${saved.length} tasks imported.` : `${saved.length} program tasks imported.`);
    } catch (e) { console.error("importProgram error:", e); toast("Failed to import: " + (e?.message || JSON.stringify(e))); }
  };

  const importClass = async (rows, cycleInfo) => {
    try {
      if (cycleInfo) {
        const newCycle = await db.upsertActiveCycle({ name: cycleInfo.name, start: cycleInfo.start, end: null, holidays: [] });
        setActiveCycle(newCycle);
      }
      const saved = await db.bulkInsertTasks(rows, sessions);
      setClassTasks(p => [...p, ...saved]);
      addToImportHistory('class', saved, `${saved.length} class task${saved.length !== 1 ? 's' : ''}`);
      setShowImportModal(false);
      toast(cycleInfo ? `Cycle "${cycleInfo.name}" created and ${saved.length} tasks imported.` : `${saved.length} class tasks imported.`);
    } catch (e) { console.error("importClass error:", e); toast("Failed to import class tasks"); }
  };

  const importROS = async (sessionId, rows) => {
    try {
      const saved = await db.bulkInsertRunOfShow(sessionId, rows);
      setRunOfShow(prev => ({ ...prev, [sessionId]: [...(prev[sessionId] || []), ...saved] }));
      const sess = sessions.find(s => s.id === sessionId);
      addToImportHistory('runofshow', saved, `${saved.length} run of show row${saved.length !== 1 ? 's' : ''}`, { sessionId, sessionLabel: sess ? (sess.professor || sess.name) : '' });
      setShowImportModal(false);
      toast(`${saved.length} run of show rows imported.`);
    } catch (e) { console.error("importROS error:", e); toast("Failed to import run of show rows"); }
  };

  const importCollateral = async (items) => {
    try {
      const saved = await Promise.all(items.map(item => db.saveDoc(item)));
      setDocs(p => [...p, ...saved]);
      addToImportHistory('collateral', saved, `${saved.length} collateral item${saved.length !== 1 ? 's' : ''}`);
      setShowImportCollateralModal(false);
      toast(`${saved.length} collateral items imported.`);
    } catch (e) { console.error("importCollateral error:", e); toast("Failed to import collateral: " + (e?.message || JSON.stringify(e))); }
  };

  const reverseImport = async (entry) => {
    if (!window.confirm(`Remove ${entry.count} imported ${entry.type === 'runofshow' ? 'run of show rows' : entry.type === 'collateral' ? 'collateral items' : 'tasks'} from "${entry.label}"?`)) return;
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
      }
      setImportHistory(prev => {
        const next = prev.filter(e => e.id !== entry.id);
        localStorage.setItem('teamtasks_import_history', JSON.stringify(next));
        return next;
      });
      toast(`Import reversed — ${entry.count} record${entry.count !== 1 ? 's' : ''} removed.`);
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
    await saveSession({
      ...sessData,
      ...(addSessionDuplicateFrom && { duplicateFromId: addSessionDuplicateFrom.id }),
    });
  };

  const openAddSession = () => { setAddSessionDuplicateFrom(null); setShowAddSessionModal(true); };
  const openDuplicateSession = (sess) => { setAddSessionDuplicateFrom(sess); setShowAddSessionModal(true); };

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
          setClassTasks(prev => [...prev, ...newTasks]);
        }
      } else if (sessionData.addTasks) {
        const newTasks = await db.bulkInsertTasks(genClassTasks([saved], classTaskTemplate), updatedSessions);
        setClassTasks(prev => [...prev, ...newTasks]);
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
      setClassTasks(prev => [...prev, ...newTasks]);
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
      setClassTasks(prev => [...prev, ...newTasks]);
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
        {toasts.map(n => <div key={n.id} style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "var(--color-text-primary)", maxWidth: 320, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{n.msg}</div>)}
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

          {/* Action dropdowns — desktop only; mobile gets one consolidated menu below */}
          {!isMobile && (
          <div ref={dropdownsRef} style={{ display: "flex", alignItems: "center", gap: 4 }}>

            {/* Cycle dropdown — cycle lifecycle is admin-only */}
            {isAdmin && (
            <div style={{ position: "relative", zIndex: 100 }}>
              <button onClick={() => setOpenDropdown(openDropdown === 'cycle' ? null : 'cycle')} style={{ fontSize: 13, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: openDropdown === 'cycle' ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>Cycle ▾</button>
              {openDropdown === 'cycle' && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 190, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 200 }}>
                  {viewingArchive ? (
                    <>
                      <div onClick={() => { setOpenDropdown(null); startRenameCycle(); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Rename cycle</div>
                      <div onClick={() => { setOpenDropdown(null); reactivateCycle(viewingArchive); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Reactivate cycle</div>
                      <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                      <div onClick={() => { setOpenDropdown(null); deleteArchivedCycle(viewingArchive); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "#A32D2D" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Delete cycle</div>
                    </>
                  ) : (
                    <>
                      <div onClick={() => { setOpenDropdown(null); startRenameCycle(); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Rename cycle</div>
                      <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                      <div onClick={() => { setOpenDropdown(null); deleteActiveCycle(); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "#A32D2D" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Delete cycle</div>
                      <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                      {draftCycle
                        ? <div onClick={() => { setOpenDropdown(null); setShowCycleModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Edit draft</div>
                        : <>
                            <div onClick={() => { setOpenDropdown(null); setNewCycleType("spring"); setShowCycleModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>+ New Spring cycle</div>
                            <div onClick={() => { setOpenDropdown(null); setNewCycleType("fall"); setShowCycleModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>+ New Fall cycle</div>
                          </>
                      }
                    </>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Program dropdown */}
            {!isReadOnly && (
              <div style={{ position: "relative", zIndex: 100 }}>
                <button onClick={() => setOpenDropdown(openDropdown === 'program' ? null : 'program')} style={{ fontSize: 13, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: openDropdown === 'program' ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>Program ▾</button>
                {openDropdown === 'program' && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 180, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 200 }}>
                    <div onClick={() => { setOpenDropdown(null); setEditTask({ ...newTaskBase }); setShowTaskModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Add new task</div>
                    <div onClick={() => { setOpenDropdown(null); setEditMilestone({ title: "", date: "", deps: [], collateralDeps: [] }); setShowMilestoneModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Add milestone</div>
                    <div onClick={() => { setOpenDropdown(null); setEditDoc({ title: "", type: "Google Drive", audience: "", description: "", updated: new Date().toISOString().slice(0, 10), next_update: "", owner: myUser, content_owner: "", assist: "", url: "", shareable_link: "", tags: [] }); setShowDocModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Add collateral</div>
                  </div>
                )}
              </div>
            )}

            {/* Classes dropdown */}
            {!isReadOnly && (
              <div style={{ position: "relative", zIndex: 100 }}>
                <button onClick={() => setOpenDropdown(openDropdown === 'classes' ? null : 'classes')} style={{ fontSize: 13, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: openDropdown === 'classes' ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>Classes ▾</button>
                {openDropdown === 'classes' && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 170, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 200 }}>
                    <div onClick={() => { setOpenDropdown(null); openAddSession(); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Add session</div>
                    <div onClick={() => { setOpenDropdown(null); setShowStandardTasksModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Standard tasks</div>
                  </div>
                )}
              </div>
            )}

            {/* Import dropdown */}
            {!isReadOnly && (
              <div style={{ position: "relative", zIndex: 100 }}>
                <button onClick={() => setOpenDropdown(openDropdown === 'import' ? null : 'import')} style={{ fontSize: 13, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: openDropdown === 'import' ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>Import / Export ▾</button>
                {openDropdown === 'import' && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 180, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 200 }}>
                    <div onClick={() => { setOpenDropdown(null); setImportModalTab("program"); setShowImportModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Import tasks from CSV</div>
                    <div onClick={() => { setOpenDropdown(null); setShowImportCollateralModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Import collateral from CSV</div>
                    <div onClick={() => { setOpenDropdown(null); setImportModalTab("history"); setShowImportModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Undo an import…</div>
                    <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                    <div onClick={() => { setOpenDropdown(null); exportTasksToCSV(displayProgramTasks, displayClassTasks, (viewingArchive ? viewingArchive.cycle : activeCycle)?.name); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Export tasks to CSV</div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Mobile consolidated "+ Add" menu — merges Program/Classes/Import into one button */}
          {isMobile && !isReadOnly && (
            <div style={{ position: "relative", zIndex: 100 }}>
              <button onClick={() => setOpenDropdown(openDropdown === 'mobileMenu' ? null : 'mobileMenu')} style={{ fontSize: 13, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: openDropdown === 'mobileMenu' ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>+ Add ▾</button>
              {openDropdown === 'mobileMenu' && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 200, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 200, maxHeight: "70vh", overflowY: "auto" }}>
                  <div onClick={() => { setOpenDropdown(null); setEditTask({ ...newTaskBase }); setShowTaskModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)" }}>Add new task</div>
                  <div onClick={() => { setOpenDropdown(null); setEditMilestone({ title: "", date: "", deps: [], collateralDeps: [] }); setShowMilestoneModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)" }}>Add milestone</div>
                  <div onClick={() => { setOpenDropdown(null); setEditDoc({ title: "", type: "Google Drive", audience: "", description: "", updated: new Date().toISOString().slice(0, 10), next_update: "", owner: myUser, content_owner: "", assist: "", url: "", shareable_link: "", tags: [] }); setShowDocModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)" }}>Add collateral</div>
                  <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                  <div onClick={() => { setOpenDropdown(null); openAddSession(); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)" }}>Add session</div>
                  <div onClick={() => { setOpenDropdown(null); setShowStandardTasksModal(true); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)" }}>Standard tasks</div>
                  <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                  <div onClick={() => { setOpenDropdown(null); exportTasksToCSV(displayProgramTasks, displayClassTasks, (viewingArchive ? viewingArchive.cycle : activeCycle)?.name); }} style={{ fontSize: 13, padding: "10px 14px", cursor: "pointer", color: "var(--color-text-primary)" }}>Export tasks to CSV</div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {draftCycle && !isMobile && (
              <div style={{ display: "flex", alignItems: "center", borderRadius: 20, border: "1px solid #9FE1CB", background: "#E1F5EE", overflow: "hidden" }}>
                <button onClick={() => setShowCycleModal(true)} style={{ fontSize: 12, padding: "4px 6px 4px 12px", border: "none", background: "transparent", color: "#0F6E56", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0F6E56", display: "inline-block" }}></span>{draftCycle.cycle.name}</button>
                <button onClick={deleteDraft} title="Delete draft" style={{ fontSize: 14, padding: "4px 10px 4px 4px", border: "none", background: "transparent", color: "#0F6E56", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            )}
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

      {/* Main content */}
      <div style={{ flex: 1, padding: isMobile ? 12 : 24 }}>
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
                <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-tertiary)", pointerEvents: "none" }}>⌕</span>
                <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="Search..." style={{ fontSize: 13, padding: "5px 10px 5px 26px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: 180 }} />
                {taskSearch && <button onClick={() => setTaskSearch("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 14, color: "var(--color-text-tertiary)", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>}
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
          <CalendarView tasks={displayAllTasks} milestones={milestones} openTask={openTask} statusColors={statusColors} myUser={myUser} />
        </div>

        <div style={{display:view==="collateral"?"":"none"}}>
          <CollateralView docs={displayDocs} isReadOnly={isReadOnly} onSave={saveDoc} onDelete={deleteDoc} onDeleteSelected={deleteSelectedDocs} onAddDoc={()=>{setEditDoc({title:"",type:"Google Drive",audience:"",description:"",updated:new Date().toISOString().slice(0,10),next_update:"",owner:myUser,content_owner:"",assist:"",url:"",shareable_link:"",tags:[]});setShowDocModal(true);}} members={members} audiences={audiences} globalTags={globalTags} />
        </div>

        <div style={{display:view==="search"?"":"none"}}>
          <SearchView displayTasks={displayAllTasks} displayDocs={displayDocs} isReadOnly={isReadOnly} openTask={openTask} openDoc={openDoc} updateStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} />
        </div>
      </div>

      {/* Modals */}
      {showAddSessionModal && !isReadOnly && <AddSessionModal isDuplicate={!!addSessionDuplicateFrom} initialData={addSessionDuplicateFrom ? { professor: addSessionDuplicateFrom.professor || addSessionDuplicateFrom.name || "", cohort: addSessionDuplicateFrom.cohort || "Cohort 1", date: "", addTasks: false } : undefined} template={classTaskTemplate} onSave={handleAddSessionFromModal} onClose={() => { setShowAddSessionModal(false); setAddSessionDuplicateFrom(null); }} />}
      {showStandardTasksModal && !isReadOnly && <StandardTasksModal template={classTaskTemplate} members={members} sessions={sessions} onSaveTemplate={saveClassTaskTemplate} onApplyTemplate={applyTemplateToSession} onClose={() => setShowStandardTasksModal(false)} />}
      {showTaskModal     && editTask     && <TaskModal task={editTask} tasks={allTasks} docs={docs} milestones={milestones} members={members} departments={departments} globalTags={globalTags} prefs={prefs} sessions={sessions} profileIdByName={profileIdByName} onChange={setEditTask} onSave={saveTask} onDelete={deleteTask} onClose={() => { setShowTaskModal(false); setEditTask(null); }} />}
      {showDocModal      && editDoc      && <DocModal doc={editDoc} members={members} audiences={audiences} globalTags={globalTags} prefs={prefs} profileIdByName={profileIdByName} onChange={setEditDoc} onSave={saveDoc} onDelete={deleteDoc} onClose={() => { setShowDocModal(false); setEditDoc(null); }} />}
      {showMilestoneDetail && viewMilestone && (()=>{ const dm = milestones.find(m=>m.id===viewMilestone.id) ?? viewMilestone; return <MilestoneDetailModal milestone={dm} tasks={allTasks} docs={docs} onEdit={m=>{setShowMilestoneDetail(false);setViewMilestone(null);setEditMilestone({...m,deps:m.deps||[],collateralDeps:m.collateralDeps||[]});setShowMilestoneModal(true);}} onClose={()=>{setShowMilestoneDetail(false);setViewMilestone(null);}}/> })()}
      {showMilestoneModal && editMilestone && <MilestoneModal milestone={editMilestone} onChange={setEditMilestone} onSave={saveMilestone} onDelete={deleteMilestone} tasks={allTasks} docs={docs} onClose={() => { setShowMilestoneModal(false); setEditMilestone(null); }} />}
      {showCycleModal    && <CycleModal tasks={programTasks} activeCycle={activeCycle} initialDraft={draftCycle} sessions={sessions} cycleType={draftCycle?.cycleType || newCycleType} onSaveDraft={saveDraft} onLaunch={launchCycle} onClose={() => setShowCycleModal(false)} />}
      {showImportModal   && <ImportModal onImportProgram={importProgram} onImportClass={importClass} onImportRunOfShow={importROS} sessions={sessions} cycle={activeCycle} importHistory={importHistory} onReverseImport={reverseImport} initialTab={importModalTab} onClose={() => setShowImportModal(false)} />}
      {showImportCollateralModal && <ImportCollateralModal onImport={importCollateral} onClose={() => setShowImportCollateralModal(false)} />}
      {showSettings      && <SettingsModal initialTab={settingsTab} members={members} setMembers={setMembersSync} departments={departments} setDepartments={setDepartmentsSync} audiences={audiences} setAudiences={setAudiencesSync} globalTags={globalTags} setGlobalTags={setGlobalTagsSync} myUser={myUser} myUserId={userId} isAdmin={isAdmin} prefs={prefs} updatePrefs={updatePrefs} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
