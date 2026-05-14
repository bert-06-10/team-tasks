import { useState, useEffect, useCallback, useRef } from "react";
import { BoardView, ListView, CalendarView, SearchView } from "./components/MainViews.jsx";
import { RunOfShowView, ListHeader, ListRow, DocCard, CollateralView } from "./components/TaskViews.jsx";
import { FilterDropdown } from "./components/Primitives.jsx";
import { SettingsModal } from "./components/Settings.jsx";
import { MilestoneModal, TaskModal, DocModal, ImportModal, ImportCollateralModal, CycleModal } from "./components/Modals.jsx";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { VIEWS, VIEW_LABELS, DEFAULT_STATUS_COLORS, DEFAULT_PREFS } from "./constants.js";
import { avatarBg, avatarTx, initials, isOverdue, addDays, isFlagged, genClassTasks, exportTasksToCSV } from "./utils.js";
import { supabase } from "./supabaseClient.js";
import * as db from "./lib/db.js";

const DEFAULT_USER_PREFS = {
  ...DEFAULT_PREFS,
  statusColors:  { ...DEFAULT_STATUS_COLORS },
  notifications: { ...DEFAULT_PREFS.notifications },
};

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
  const [userPrefs, setUserPrefs] = useState(DEFAULT_USER_PREFS);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [toasts,                    setToasts]                    = useState([]);
  const [view,                      setView]                      = useState("board");
  const [taskTypeFilter,            setTaskTypeFilter]            = useState("program");
  const [boardGroup,                setBoardGroup]                = useState("status");
  const [listGroup,                 setListGroup]                 = useState("none");
  const [deptFilter,                setDeptFilter]                = useState("All");
  const [ownerFilter,               setOwnerFilter]               = useState("All");
  const [viewingArchive,            setViewingArchive]            = useState(null);
  const [draftCycle,                setDraftCycle]                = useState(() => { try { return JSON.parse(localStorage.getItem('teamtasks_draft_cycle')); } catch { return null; } });
  const [collateralAudienceFilter,  setCollateralAudienceFilter]  = useState("All");
  const [collateralOwnerFilter,     setCollateralOwnerFilter]     = useState("All");
  const [showTaskModal,             setShowTaskModal]             = useState(false);
  const [showDocModal,              setShowDocModal]              = useState(false);
  const [showCycleModal,            setShowCycleModal]            = useState(false);
  const [newCycleType,              setNewCycleType]              = useState("spring");
  const [showImportModal,           setShowImportModal]           = useState(false);
  const [showImportCollateralModal, setShowImportCollateralModal] = useState(false);
  const [showSettings,              setShowSettings]              = useState(false);
  const [showMilestoneModal,        setShowMilestoneModal]        = useState(false);
  const [renamingCycle,             setRenamingCycle]             = useState(false);
  const [renameValue,               setRenameValue]               = useState('');
  const [openDropdown,              setOpenDropdown]              = useState(null);
  const [settingsTab,               setSettingsTab]               = useState("owners");
  const [editTask,      setEditTask]      = useState(null);
  const [editDoc,       setEditDoc]       = useState(null);
  const [editMilestone, setEditMilestone] = useState(null);

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
  const statusColors = prefs.statusColors || DEFAULT_STATUS_COLORS;

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

      // Fetch user prefs (fall back to defaults if empty)
      const savedPrefs = await db.fetchUserPrefs(uid);
      setUserPrefs(savedPrefs
        ? { ...DEFAULT_USER_PREFS, ...savedPrefs, statusColors: savedPrefs.statusColors || DEFAULT_STATUS_COLORS, notifications: savedPrefs.notifications || DEFAULT_PREFS.notifications }
        : DEFAULT_USER_PREFS
      );

      // Fetch config lists + sessions + cycle
      const [membersList, deptList, audList, tagList, sessionsData, cycle, archived] =
        await Promise.all([
          db.fetchMembers(), db.fetchDepartments(), db.fetchAudiences(),
          db.fetchGlobalTags(), db.fetchSessions(), db.fetchActiveCycle(),
          db.fetchArchivedCycles(),
        ]);

      // Ensure the signed-in user appears in the members list
      if (!membersList.includes(profile.name)) {
        await db.addMember(profile.name);
        membersList.push(profile.name);
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

      setProgramTasks(taskData.programTasks);
      setClassTasks(taskData.classTasks);
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
  const importProgram = async (rows, cycleInfo) => {
    try {
      if (cycleInfo) {
        const newCycle = await db.upsertActiveCycle({ name: cycleInfo.name, start: cycleInfo.start, end: null, holidays: [] });
        setActiveCycle(newCycle);
      }
      const saved = await db.bulkInsertTasks(rows, sessions);
      setProgramTasks(p => [...p, ...saved]);
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
      setShowImportModal(false);
      toast(cycleInfo ? `Cycle "${cycleInfo.name}" created and ${saved.length} tasks imported.` : `${saved.length} class tasks imported.`);
    } catch (e) { console.error("importClass error:", e); toast("Failed to import class tasks"); }
  };

  const importROS = async (sessionId, rows) => {
    try {
      const saved = await db.bulkInsertRunOfShow(sessionId, rows);
      setRunOfShow(prev => ({ ...prev, [sessionId]: [...(prev[sessionId] || []), ...saved] }));
      setShowImportModal(false);
      toast(`${saved.length} run of show rows imported.`);
    } catch (e) { console.error("importROS error:", e); toast("Failed to import run of show rows"); }
  };

  const importCollateral = async (items) => {
    try {
      const saved = await Promise.all(items.map(item => db.saveDoc(item)));
      setDocs(p => [...p, ...saved]);
      setShowImportCollateralModal(false);
      toast(`${saved.length} collateral items imported.`);
    } catch (e) { console.error("importCollateral error:", e); toast("Failed to import collateral: " + (e?.message || JSON.stringify(e))); }
  };

  // ── Run of show handlers ────────────────────────────────────────────────────
  const handleSaveRunOfShowRow   = async (sessionId, row) => db.saveRunOfShowRow(sessionId, row);
  const handleDeleteRunOfShowRow = async id => db.deleteRunOfShowRow(id);

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
  const isReadOnly          = !!viewingArchive;
  const sortByDue = ts => [...ts].sort((a, b) => { if (!a.due && !b.due) return 0; if (!a.due) return 1; if (!b.due) return -1; return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
  const filteredTasks       = sortByDue(displayTasks.filter(t => deptFilter === "All" || t.department === deptFilter).filter(t => ownerFilter === "All" || t.assignee === ownerFilter || t.assist === ownerFilter));
  const allAudiences        = ["All", ...Array.from(new Set(displayDocs.map(d => d.audience).filter(Boolean)))];
  const allDocOwners        = ["All", ...Array.from(new Set(displayDocs.map(d => d.owner).filter(Boolean)))];
  const filteredDocs        = displayDocs.filter(d => collateralAudienceFilter === "All" || d.audience === collateralAudienceFilter).filter(d => collateralOwnerFilter === "All" || d.owner === collateralOwnerFilter);

  const openTask     = t => { if (!isReadOnly) { setEditTask(t); setShowTaskModal(true); } };
  const openDoc      = d => { if (!isReadOnly) { setEditDoc(d); setShowDocModal(true); } };
  const openSettings = (tab = "owners") => { setSettingsTab(tab); setShowSettings(true); };

  const newTaskBase     = { title: "", assignee: myUser, assist: "", due: "", status: "To Do", notes: "", deps: [], collateralDeps: [], attachedDocs: [], tags: [], offset: 0, fallOffset: 0, department: "", type: taskTypeFilter === "runofshow" ? "class" : taskTypeFilter };
  const taskTypeOptions = [["program", "Program tasks"], ["class", "Class tasks"], ["runofshow", "Run of show"]];
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
      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", gap: 12, height: 52 }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)", flexShrink: 0 }}>Team Tasks</span>

          {/* Cycle selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, borderLeft: "0.5px solid var(--color-border-tertiary)", paddingLeft: 12 }}>
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Cycle:</span>
            {renamingCycle ? (
              <>
                <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitRenameCycle(); if (e.key === 'Escape') setRenamingCycle(false); }} style={{ fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "3px 8px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", width: 180 }} />
                <button onClick={commitRenameCycle} style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: "pointer" }}>Save</button>
                <button onClick={() => setRenamingCycle(false)} style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancel</button>
              </>
            ) : (
              <select value={viewingArchive ? String(viewingArchive.cycle.id) : "__active__"} onChange={e => { if (e.target.value === "__active__") setViewingArchive(null); else { const a = archivedCycles.find(x => String(x.cycle.id) === e.target.value); setViewingArchive(a || null); } }} style={{ fontSize: 13, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "3px 8px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>
                <option value="__active__">{activeCycle?.name || "No active cycle"} (active)</option>
                {archivedCycles.map(a => <option key={a.cycle.id} value={String(a.cycle.id)}>{a.cycle.name} (archived)</option>)}
              </select>
            )}
            {isReadOnly && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#FAEEDA", color: "#854F0B" }}>read-only</span>}
          </div>

          {/* Action dropdowns */}
          <div ref={dropdownsRef} style={{ display: "flex", alignItems: "center", gap: 4 }}>

            {/* Cycle dropdown */}
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

            {/* Program dropdown */}
            {!isReadOnly && (
              <div style={{ position: "relative", zIndex: 100 }}>
                <button onClick={() => setOpenDropdown(openDropdown === 'program' ? null : 'program')} style={{ fontSize: 13, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: openDropdown === 'program' ? "var(--color-background-secondary)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}>Program ▾</button>
                {openDropdown === 'program' && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 180, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 200 }}>
                    <div onClick={() => { setOpenDropdown(null); setEditTask({ ...newTaskBase }); setShowTaskModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Add new task</div>
                    <div onClick={() => { setOpenDropdown(null); setEditMilestone({ title: "", date: "" }); setShowMilestoneModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Add milestone</div>
                    <div onClick={() => { setOpenDropdown(null); setEditDoc({ title: "", type: "Google Drive", audience: "", description: "", updated: new Date().toISOString().slice(0, 10), next_update: "", owner: myUser, content_owner: "", assist: "", url: "", shareable_link: "", tags: [] }); setShowDocModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Add collateral</div>
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
                    <div onClick={() => { setOpenDropdown(null); setShowImportModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Import tasks from CSV</div>
                    <div onClick={() => { setOpenDropdown(null); setShowImportCollateralModal(true); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Import collateral from CSV</div>
                    <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "2px 0" }} />
                    <div onClick={() => { setOpenDropdown(null); exportTasksToCSV(displayProgramTasks, displayClassTasks, (viewingArchive ? viewingArchive.cycle : activeCycle)?.name); }} style={{ fontSize: 13, padding: "8px 14px", cursor: "pointer", color: "var(--color-text-primary)" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background=""}>Export tasks to CSV</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {draftCycle && (
              <div style={{ display: "flex", alignItems: "center", borderRadius: 20, border: "1px solid #9FE1CB", background: "#E1F5EE", overflow: "hidden" }}>
                <button onClick={() => setShowCycleModal(true)} style={{ fontSize: 12, padding: "4px 6px 4px 12px", border: "none", background: "transparent", color: "#0F6E56", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0F6E56", display: "inline-block" }}></span>{draftCycle.cycle.name}</button>
                <button onClick={deleteDraft} title="Delete draft" style={{ fontSize: 14, padding: "4px 10px 4px 4px", border: "none", background: "transparent", color: "#0F6E56", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => openSettings("preferences")} title="My preferences" style={{ width: 28, height: 28, borderRadius: "50%", background: avatarBg(myUser), border: "none", fontSize: 11, fontWeight: 500, color: avatarTx(myUser), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(myUser)}</button>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{myUser}</span>
              <button onClick={signOut} style={{ fontSize: 12, padding: "4px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Sign out</button>
            </div>
          </div>
        </div>
        <div style={{ padding: "0 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 0, alignItems: "center" }}>
          {VIEWS.map(v => <button key={v} onClick={() => setView(v)} style={{ fontSize: 13, padding: "10px 16px", border: "none", borderBottom: view === v ? "2px solid var(--color-text-primary)" : "2px solid transparent", background: "transparent", color: view === v ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: view === v ? 500 : 400 }}>{VIEW_LABELS[v]}</button>)}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 24 }}>
        {(view === "board" || view === "list" || view === "mytasks") && (
          <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: "4px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", width: "fit-content" }}>
            {taskTypeOptions.map(([t, l]) => (
              <button key={t} onClick={() => setTaskTypeFilter(t)} style={{ fontSize: 13, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "none", background: taskTypeFilter === t ? "var(--color-background-primary)" : "transparent", color: taskTypeFilter === t ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: taskTypeFilter === t ? 500 : 400, boxShadow: taskTypeFilter === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{l}</button>
            ))}
          </div>
        )}

        {(view === "board" || view === "list") && showTaskList && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <FilterDropdown label="Department" options={["All", ...departments]} value={deptFilter} onChange={setDeptFilter} />
            <FilterDropdown label="Owner" options={["All", ...members]} value={ownerFilter} onChange={setOwnerFilter} />
            {(deptFilter !== "All" || ownerFilter !== "All") && <button onClick={() => { setDeptFilter("All"); setOwnerFilter("All"); }} style={{ fontSize: 12, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Clear</button>}
          </div>
        )}

        {(view === "board" || view === "list" || view === "mytasks") && taskTypeFilter === "runofshow" && (
          <RunOfShowView sessions={sessions} runOfShow={runOfShow} setRunOfShow={setRunOfShow} onSaveRow={handleSaveRunOfShowRow} onDeleteRow={handleDeleteRunOfShowRow} members={members} isReadOnly={isReadOnly} />
        )}

        {view === "board" && showTaskList && <BoardView filteredTasks={filteredTasks} displayTasks={allTasks} displayDocs={displayDocs} milestones={milestones} isReadOnly={isReadOnly} boardGroup={boardGroup} setBoardGroup={setBoardGroup} openTask={openTask} updateStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} />}
        {view === "list"  && showTaskList && <ListView  filteredTasks={filteredTasks} displayTasks={allTasks} displayDocs={displayDocs} milestones={milestones} isReadOnly={isReadOnly} listGroup={listGroup} setListGroup={setListGroup} openTask={openTask} updateStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} onDeleteSelected={deleteSelectedTasks} />}

        {view === "mytasks" && showTaskList && (
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
            <ListHeader />
            {sortByDue(displayTasks.filter(t => t.assignee === myUser || t.assist === myUser)).map((t, i, arr) => (
              <ListRow key={t.id} task={t} tasks={allTasks} docs={displayDocs} last={i === arr.length - 1} readOnly={isReadOnly} onEdit={() => openTask(t)} onStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} />
            ))}
          </div>
        )}

        {view === "calendar"   && <CalendarView tasks={displayAllTasks} milestones={milestones} openTask={openTask} statusColors={statusColors} />}

        {view === "collateral" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
              <FilterDropdown label="Audience" options={allAudiences} value={collateralAudienceFilter} onChange={setCollateralAudienceFilter} />
              <FilterDropdown label="Owner" options={allDocOwners} value={collateralOwnerFilter} onChange={setCollateralOwnerFilter} />
              {(collateralAudienceFilter !== "All" || collateralOwnerFilter !== "All") && <button onClick={() => { setCollateralAudienceFilter("All"); setCollateralOwnerFilter("All"); }} style={{ fontSize: 12, padding: "5px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>Clear</button>}
            </div>
            <CollateralView filteredDocs={filteredDocs} isReadOnly={isReadOnly} onSave={saveDoc} onDeleteSelected={deleteSelectedDocs} members={members} audiences={audiences} />
          </div>
        )}

        {view === "search" && <SearchView displayTasks={displayAllTasks} displayDocs={displayDocs} isReadOnly={isReadOnly} openTask={openTask} openDoc={openDoc} updateStatus={updateStatus} getBlockedStatus={getBlockedStatus} statusColors={statusColors} />}
      </div>

      {/* Modals */}
      {showTaskModal     && editTask     && <TaskModal task={editTask} tasks={allTasks} docs={docs} members={members} departments={departments} globalTags={globalTags} prefs={prefs} sessions={sessions} onChange={setEditTask} onSave={saveTask} onDelete={deleteTask} onClose={() => { setShowTaskModal(false); setEditTask(null); }} />}
      {showDocModal      && editDoc      && <DocModal doc={editDoc} members={members} audiences={audiences} globalTags={globalTags} prefs={prefs} onChange={setEditDoc} onSave={saveDoc} onDelete={deleteDoc} onClose={() => { setShowDocModal(false); setEditDoc(null); }} />}
      {showMilestoneModal && editMilestone && <MilestoneModal milestone={editMilestone} onChange={setEditMilestone} onSave={saveMilestone} onDelete={deleteMilestone} onClose={() => { setShowMilestoneModal(false); setEditMilestone(null); }} />}
      {showCycleModal    && <CycleModal tasks={programTasks} activeCycle={activeCycle} initialDraft={draftCycle} sessions={sessions} cycleType={draftCycle?.cycleType || newCycleType} onSaveDraft={saveDraft} onLaunch={launchCycle} onClose={() => setShowCycleModal(false)} />}
      {showImportModal   && <ImportModal onImportProgram={importProgram} onImportClass={importClass} onImportRunOfShow={importROS} sessions={sessions} cycle={activeCycle} onClose={() => setShowImportModal(false)} />}
      {showImportCollateralModal && <ImportCollateralModal onImport={importCollateral} onClose={() => setShowImportCollateralModal(false)} />}
      {showSettings      && <SettingsModal initialTab={settingsTab} members={members} setMembers={setMembersSync} departments={departments} setDepartments={setDepartmentsSync} audiences={audiences} setAudiences={setAudiencesSync} globalTags={globalTags} setGlobalTags={setGlobalTagsSync} myUser={myUser} prefs={prefs} updatePrefs={updatePrefs} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
