import { supabase } from '../supabaseClient.js'

// ── Auth / Profile ────────────────────────────────────────────────────────────

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function createProfile(userId, name, email) {
  const { data, error } = await supabase
    .from('profiles').insert({ id: userId, name, email }).select().single()
  if (error) throw error
  return data
}

// Admin-only (enforced by RLS): list every team member's profile + role
export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles').select('id, name, email, role').order('name')
  if (error) throw error
  return data
}

// Admin-only (enforced by RLS): change another user's role
export async function updateProfileRole(userId, role) {
  const { error } = await supabase
    .from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}

export async function fetchUserPrefs(userId) {
  const { data, error } = await supabase
    .from('user_preferences').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    darkMode:             data.dark_mode,
    defaultView:          data.default_view,
    desktopNotifications: data.desktop_notifications,
    googleCalendar:       data.google_calendar,
    googleDrive:          data.google_drive,
    statusColors:         data.status_colors,
    notifications:        data.notifications,
    timezone:             data.timezone || null,
  }
}

export async function saveUserPrefs(userId, prefs) {
  const baseRow = {
    user_id:               userId,
    dark_mode:             prefs.darkMode             ?? false,
    default_view:          prefs.defaultView          ?? 'board',
    desktop_notifications: prefs.desktopNotifications ?? false,
    google_calendar:       prefs.googleCalendar       ?? false,
    google_drive:          prefs.googleDrive          ?? false,
    status_colors:         prefs.statusColors         ?? {},
    notifications:         prefs.notifications        ?? {},
  }
  const { error } = await supabase.from('user_preferences').upsert({
    ...baseRow,
    timezone: prefs.timezone || null,
  })
  if (error) {
    // Retry without timezone if the column doesn't exist yet
    const { error: e2 } = await supabase.from('user_preferences').upsert(baseRow)
    if (e2) throw e2
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function taskFromRow(row, sessions = []) {
  const session = sessions.find(s => s.id === row.session_id)
  return {
    id:             row.id,
    title:          row.title,
    type:           row.type,
    assignee:       row.assignee || '',
    assignee_id:    row.assignee_id || null,
    assist:         row.assist || '',
    assist_id:      row.assist_id || null,
    due:            row.due_date || '',
    status:         row.status,
    notes:          row.notes || '',
    links:          row.links || '',
    tags:           row.tags || [],
    offset:         row.offset_days || 0,
    fallOffset:     row.fall_offset_days ?? row.offset_days ?? 0,
    department:     row.department || '',
    flagged:        row.flagged || false,
    sessionId:      row.session_id || '',
    sessionName:    session?.name || '',
    professor:      session?.professor || '',
    cohort:         session?.cohort    || '',
    deps:           (row.task_deps || []).map(d => d.depends_on_id),
    collateralDeps: (row.task_collateral_deps || []).map(d => d.doc_id),
    attachedDocs:   [],
  }
}

function taskToRow(task) {
  return {
    title:       task.title || '',
    type:        task.type,
    assignee:    task.assignee || '',
    assignee_id: task.assignee_id || null,
    assist:      task.assist || '',
    assist_id:   task.assist_id || null,
    due_date:    /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : null,
    status:      task.status || 'To Do',
    notes:       task.notes || '',
    links:       task.links || '',
    tags:        task.tags || [],
    offset_days:      task.offset || 0,
    fall_offset_days: task.fallOffset ?? task.offset ?? 0,
    department:  task.department || '',
    flagged:     task.flagged || false,
    session_id:  task.sessionId || null,
  }
}

// ── Config lists ──────────────────────────────────────────────────────────────

async function fetchList(table) {
  const { data, error } = await supabase.from(table).select('name').order('name')
  if (error) throw error
  return data.map(r => r.name)
}
async function addToList(table, name) {
  const { error } = await supabase.from(table).insert({ name })
  if (error) throw error
}
async function removeFromList(table, name) {
  const { error } = await supabase.from(table).delete().eq('name', name)
  if (error) throw error
}
async function updateInList(table, oldName, newName) {
  const { error } = await supabase.from(table).update({ name: newName }).eq('name', oldName)
  if (error) throw error
}

export const fetchMembers     = ()       => fetchList('members')
export const addMember        = n        => addToList('members', n)
export const removeMember     = n        => removeFromList('members', n)
export const updateMember     = (o, n)   => updateInList('members', o, n)

export const fetchDepartments = ()       => fetchList('departments')
export const addDepartment    = n        => addToList('departments', n)
export const removeDepartment = n        => removeFromList('departments', n)
export const updateDepartment = (o, n)   => updateInList('departments', o, n)

export const fetchAudiences   = ()       => fetchList('audiences')
export const addAudience      = n        => addToList('audiences', n)
export const removeAudience   = n        => removeFromList('audiences', n)
export const updateAudience   = (o, n)   => updateInList('audiences', o, n)

export const fetchGlobalTags  = ()       => fetchList('global_tags')
export const addGlobalTag     = n        => addToList('global_tags', n)
export const removeGlobalTag  = n        => removeFromList('global_tags', n)
export const updateGlobalTag  = (o, n)   => updateInList('global_tags', o, n)

// ── Cycles ────────────────────────────────────────────────────────────────────

export async function fetchActiveCycle() {
  const { data, error } = await supabase
    .from('cycles').select('*').eq('is_active', true).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { id: data.id, name: data.name, start: data.start_date, end: data.end_date, holidays: data.holidays || [] }
}

export async function fetchArchivedCycles() {
  const { data, error } = await supabase
    .from('archived_cycles')
    .select('*, cycles(name, start_date, end_date, holidays)')
    .order('archived_at', { ascending: false })
  if (error) throw error
  return data.map(r => ({
    cycle:        { id: r.cycle_id, name: r.cycles.name, start: r.cycles.start_date, end: r.cycles.end_date, holidays: r.cycles.holidays || [] },
    programTasks: r.program_tasks,
    classTasks:   r.class_tasks,
    docs:         r.docs,
  }))
}

export async function upsertActiveCycle(cycle) {
  if (cycle.id) {
    const { error } = await supabase
      .from('cycles')
      .update({ name: cycle.name, start_date: cycle.start, end_date: cycle.end || null, holidays: cycle.holidays || [] })
      .eq('id', cycle.id)
    if (error) throw error
    return cycle
  }
  const { data, error } = await supabase
    .from('cycles')
    .insert({ name: cycle.name, start_date: cycle.start, end_date: cycle.end || null, holidays: cycle.holidays || [], is_active: true })
    .select().single()
  if (error) throw error
  return { ...cycle, id: data.id }
}

export async function launchNewCycle(oldCycle, snapshot, newCycle, newSessions, updatedProgramTasks) {
  // Archive old cycle
  if (oldCycle?.id) {
    await supabase.from('archived_cycles').insert({
      cycle_id: oldCycle.id, program_tasks: snapshot.programTasks,
      class_tasks: snapshot.classTasks, docs: snapshot.docs,
    })
    await supabase.from('cycles').update({ is_active: false }).eq('id', oldCycle.id)
  }

  // Create new cycle
  const { data: cycleRow, error: cycleErr } = await supabase
    .from('cycles')
    .insert({ name: newCycle.name, start_date: newCycle.start, end_date: newCycle.end, holidays: newCycle.holidays || [], is_active: true })
    .select().single()
  if (cycleErr) throw cycleErr
  const savedCycle = { ...newCycle, id: cycleRow.id }

  // Reset program task statuses / due dates
  for (const t of updatedProgramTasks) {
    await supabase.from('tasks').update({ status: 'To Do', due_date: t.due || null, flagged: t.flagged || false }).eq('id', t.id)
  }

  // Replace sessions and class tasks if new sessions provided
  if (newSessions?.length) {
    await supabase.from('tasks').delete().eq('type', 'class')
    const { data: existingSessions } = await supabase.from('sessions').select('id')
    if (existingSessions?.length) {
      await supabase.from('sessions').delete().in('id', existingSessions.map(s => s.id))
    }
    const { data: sessRows, error: sessErr } = await supabase
      .from('sessions')
      .insert(newSessions.map((s, i) => ({ name: s.name, date: s.date, number: s.number || i + 1 })))
      .select()
    if (sessErr) throw sessErr
    return { savedCycle, savedSessions: sessRows.map(r => ({ id: r.id, name: r.name, date: r.date, number: r.number })) }
  }

  return { savedCycle, savedSessions: null }
}

export async function reactivateCycle(targetCycle, currentActive, currentSnapshot, archiveEntry) {
  if (currentActive?.id) {
    await supabase.from('archived_cycles').upsert(
      { cycle_id: currentActive.id, program_tasks: currentSnapshot.programTasks, class_tasks: currentSnapshot.classTasks, docs: currentSnapshot.docs },
      { onConflict: 'cycle_id' }
    )
    await supabase.from('cycles').update({ is_active: false }).eq('id', currentActive.id)
  }
  await supabase.from('archived_cycles').delete().eq('cycle_id', targetCycle.id)
  await supabase.from('cycles').update({ is_active: true }).eq('id', targetCycle.id)
  for (const t of (archiveEntry.programTasks || [])) {
    await supabase.from('tasks').update({ status: t.status, due_date: t.due || null, flagged: t.flagged || false }).eq('id', t.id)
  }
}

export async function deleteArchivedCycle(cycleId) {
  const { error } = await supabase.from('archived_cycles').delete().eq('cycle_id', cycleId)
  if (error) throw error
}

export async function deleteActiveCycle(cycleId) {
  await supabase.from('tasks').delete().in('type', ['program', 'class'])
  const { data: sessionRows } = await supabase.from('sessions').select('id')
  if (sessionRows?.length) {
    await supabase.from('sessions').delete().in('id', sessionRows.map(s => s.id))
  }
  const { error } = await supabase.from('cycles').delete().eq('id', cycleId)
  if (error) throw error
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function fetchSessions() {
  const { data, error } = await supabase.from('sessions').select('*').order('number')
  if (error) throw error
  return data.map(r => ({
    id:        r.id,
    name:      r.name,
    date:      r.date,
    number:    r.number,
    professor: r.professor || '',
    cohort:    r.cohort    || '',
  }))
}

export async function saveSession(session) {
  const fullRow = {
    name:      session.name      || session.professor || '',
    date:      session.date,
    number:    session.number    || 1,
    professor: session.professor || '',
    cohort:    session.cohort    || '',
  }
  const basicRow = { name: fullRow.name, date: fullRow.date, number: fullRow.number }

  if (session.id) {
    const { error } = await supabase.from('sessions').update(fullRow).eq('id', session.id)
    if (error) {
      const { error: e2 } = await supabase.from('sessions').update(basicRow).eq('id', session.id)
      if (e2) throw e2
    }
    return session
  }

  const { data, error } = await supabase.from('sessions').insert(fullRow).select().single()
  if (error) {
    // Retry without professor/cohort if those columns don't exist yet
    const { data: d2, error: e2 } = await supabase.from('sessions').insert(basicRow).select().single()
    if (e2) throw e2
    return { ...session, id: d2.id, name: fullRow.name }
  }
  return { ...session, id: data.id, name: fullRow.name }
}

export async function deleteSession(sessionId) {
  await supabase.from('tasks').delete().eq('session_id', sessionId)
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) throw error
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchTasks(sessions = []) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_deps!task_deps_task_id_fkey(depends_on_id), task_collateral_deps(doc_id)')
    .order('id')
  if (error) throw error
  const tasks = data.map(row => taskFromRow(row, sessions))
  return {
    programTasks: tasks.filter(t => t.type === 'program'),
    classTasks:   tasks.filter(t => t.type === 'class'),
  }
}

export async function saveTask(task, sessions = []) {
  const row = taskToRow(task)
  let savedId = task.id

  if (task.id) {
    const { error } = await supabase.from('tasks').update(row).eq('id', task.id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('tasks').insert(row).select().single()
    if (error) throw error
    savedId = data.id
  }

  // Sync deps
  await supabase.from('task_deps').delete().eq('task_id', savedId)
  if (task.deps?.length) {
    await supabase.from('task_deps').insert(task.deps.map(dep_id => ({ task_id: savedId, depends_on_id: dep_id })))
  }

  // Sync collateral deps
  await supabase.from('task_collateral_deps').delete().eq('task_id', savedId)
  if (task.collateralDeps?.length) {
    await supabase.from('task_collateral_deps').insert(task.collateralDeps.map(doc_id => ({ task_id: savedId, doc_id })))
  }

  const { data: updated, error: fetchErr } = await supabase
    .from('tasks')
    .select('*, task_deps!task_deps_task_id_fkey(depends_on_id), task_collateral_deps(doc_id)')
    .eq('id', savedId).single()
  if (fetchErr) throw fetchErr
  return taskFromRow(updated, sessions)
}

export async function updateTaskStatus(id, status) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateTaskDue(id, due) {
  const { error } = await supabase.from('tasks').update({ due_date: due || null }).eq('id', id)
  if (error) throw error
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function bulkInsertTasks(tasks, sessions = []) {
  if (!tasks.length) return []
  // Use a plain .select() after insert (no embedded relations) — combining the
  // FK-hinted embed syntax with a POST causes a 400 in some PostgREST versions.
  // Deps are never set on import; explicitly delete any auto-created entries
  // (e.g. from DB triggers) so they can only be added manually later.
  return Promise.all(
    tasks.map(async task => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskToRow(task))
        .select()
        .single()
      if (error) throw error
      await supabase.from('task_deps').delete().eq('task_id', data.id)
      await supabase.from('task_collateral_deps').delete().eq('task_id', data.id)
      return taskFromRow({ ...data, task_deps: [], task_collateral_deps: [] }, sessions)
    })
  )
}

// ── Milestones ────────────────────────────────────────────────────────────────

export async function fetchMilestones() {
  const { data, error } = await supabase.from('milestones').select('*').order('date')
  if (error) throw error
  return data.map(r => ({ id: r.id, title: r.title, date: r.date, deps: r.deps || [], collateralDeps: r.collateral_deps || [] }))
}

export async function saveMilestone(milestone) {
  const base = { title: milestone.title, date: milestone.date }
  const withDeps    = { ...base, deps: milestone.deps || [] }
  const withAll     = { ...withDeps, collateral_deps: milestone.collateralDeps || [] }
  const ret = { ...milestone, deps: milestone.deps || [], collateralDeps: milestone.collateralDeps || [] }
  if (milestone.id) {
    const { error } = await supabase.from('milestones').update(withAll).eq('id', milestone.id)
    if (error) {
      console.warn('saveMilestone: collateral_deps column missing, retrying without it', error.message)
      const { error: e2 } = await supabase.from('milestones').update(withDeps).eq('id', milestone.id)
      if (e2) {
        console.warn('saveMilestone: deps column missing, retrying without it', e2.message)
        const { error: e3 } = await supabase.from('milestones').update(base).eq('id', milestone.id)
        if (e3) throw e3
      }
    }
    return ret
  }
  const { data, error } = await supabase.from('milestones').insert(withAll).select().single()
  if (error) {
    console.warn('saveMilestone: collateral_deps column missing, retrying without it', error.message)
    const { data: d2, error: e2 } = await supabase.from('milestones').insert(withDeps).select().single()
    if (e2) {
      console.warn('saveMilestone: deps column missing, retrying without it', e2.message)
      const { data: d3, error: e3 } = await supabase.from('milestones').insert(base).select().single()
      if (e3) throw e3
      return { ...base, id: d3.id, deps: [], collateralDeps: [] }
    }
    return { ...base, id: d2.id, deps: milestone.deps || [], collateralDeps: [] }
  }
  return { ...base, id: data.id, deps: milestone.deps || [], collateralDeps: milestone.collateralDeps || [] }
}

export async function deleteMilestone(id) {
  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) throw error
}

// ── Docs ──────────────────────────────────────────────────────────────────────

export async function fetchDocs() {
  const { data, error } = await supabase.from('docs').select('*').order('id')
  if (error) throw error
  return data.map(r => ({
    id: r.id, title: r.title, type: r.type, url: r.url,
    audience: r.audience, description: r.description,
    owner: r.owner, content_owner: r.content_owner || '', assist: r.assist || '', shareable_link: r.shareable_link || '', updated: r.updated_date || '', tags: r.tags || [],
    next_update: r.next_update || '',
  }))
}

export async function saveDoc(doc) {
  const row = {
    title: doc.title, type: doc.type, url: doc.url || '',
    audience: doc.audience || '', description: doc.description || '',
    owner: doc.owner || '', content_owner: doc.content_owner || '', assist: doc.assist || '', shareable_link: doc.shareable_link || '', updated_date: doc.updated || null, tags: doc.tags || [],
    next_update: doc.next_update || null,
  }
  if (doc.id) {
    const { error } = await supabase.from('docs').update(row).eq('id', doc.id)
    if (error) throw error
    return doc
  }
  const { data, error } = await supabase.from('docs').insert(row).select().single()
  if (error) throw error
  return { ...doc, id: data.id }
}

export async function deleteDoc(id) {
  const { error } = await supabase.from('docs').delete().eq('id', id)
  if (error) throw error
}

// ── Run of show ───────────────────────────────────────────────────────────────

export async function fetchRunOfShow() {
  const { data, error } = await supabase
    .from('run_of_show').select('*').order('sort_order').order('created_at')
  if (error) throw error
  const result = {}
  data.forEach(r => {
    if (!result[r.session_id]) result[r.session_id] = []
    result[r.session_id].push({ id: r.id, cohort: r.cohort, time: r.time, event: r.event, owner: r.owner, assist: r.assist, notes: r.notes, done: r.done || false })
  })
  return result
}

export async function saveRunOfShowRow(sessionId, row) {
  const isTemp = !row.id || String(row.id).startsWith('ri')
  const dbRow = {
    session_id: sessionId, cohort: row.cohort || '', time: row.time || '',
    event: row.event || '', owner: row.owner || '', assist: row.assist || '', notes: row.notes || '',
    done: row.done || false,
  }
  if (!isTemp) {
    const { error } = await supabase.from('run_of_show').update(dbRow).eq('id', row.id)
    if (error) throw error
    return row
  }
  const { data, error } = await supabase.from('run_of_show').insert(dbRow).select().single()
  if (error) throw error
  return { ...row, id: data.id }
}

export async function updateRunOfShowDone(id, done) {
  const { error } = await supabase.from('run_of_show').update({ done }).eq('id', id)
  if (error) throw error
}

export async function deleteRunOfShowRow(id) {
  if (!id || String(id).startsWith('ri')) return
  const { error } = await supabase.from('run_of_show').delete().eq('id', id)
  if (error) throw error
}

export async function bulkInsertRunOfShow(sessionId, rows) {
  if (!rows.length) return []
  const results = await Promise.all(
    rows.map((r, i) =>
      supabase
        .from('run_of_show')
        .insert({
          session_id: sessionId, cohort: r.cohort || '', time: r.time || '',
          event: r.event || '', owner: r.owner || '', assist: r.assist || '',
          notes: r.notes || '', sort_order: i,
        })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) throw error
          return data
        })
    )
  )
  return results.map(r => ({ id: r.id, cohort: r.cohort, time: r.time, event: r.event, owner: r.owner, assist: r.assist, notes: r.notes }))
}

// ── Activity log (admin-only, enforced by RLS) ─────────────────────────────────
export async function fetchActivityLog(limit = 150) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
