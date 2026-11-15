const DB_KEY = "teachtrack_v2_data";
const $ = (id) => document.getElementById(id);
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const monthISO = () => todayISO().slice(0, 7);
let state = loadState();
let reportMode = "daily";

function loadState() { try { const saved = JSON.parse(localStorage.getItem(DB_KEY)); if (saved && Array.isArray(saved.teachers) && Array.isArray(saved.records)) return saved; } catch (e) { } return { teachers: [], records: [] }; }
function persist() { localStorage.setItem(DB_KEY, JSON.stringify(state)); }
function safe(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function initials(name) { return String(name || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase(); }
function showToast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove("show"), 2600); }
function recordFor(teacherId, date) { return state.records.find(r => r.teacherId === teacherId && r.date === date); }
function statusBadge(status) { const s = status || "Not marked"; return `<span class="status-badge ${safe(s.toLowerCase())}">${safe(s)}</span>`; }
function teacherCell(t) { return `<div class="teacher-cell"><div class="teacher-avatar">${safe(initials(t.name))}</div><div><b>${safe(t.name)}</b><small>${safe(t.id)}</small></div></div>`; }

function navigate(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
    document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === page));
    const titles = { dashboard: "Dashboard", teachers: "Teachers", attendance: "Attendance", reports: "Reports" };
    $("pageTitle").textContent = titles[page] || "Dashboard";
    $("sidebar").classList.remove("open");
    if (page === "dashboard") renderDashboard();
    if (page === "teachers") renderTeachers();
    if (page === "attendance") renderAttendance();
    if (page === "reports") renderReports();
}
function openModal(teacher = null) {
    $("teacherForm").reset(); $("editTeacherId").value = teacher ? teacher.id : "";
    $("modalTitle").textContent = teacher ? "Edit teacher" : "Add teacher";
    $("teacherName").value = teacher ? teacher.name : ""; $("teacherId").value = teacher ? teacher.id : "";
    $("teacherSubject").value = teacher ? teacher.subject : ""; $("teacherPhone").value = teacher ? teacher.phone || "" : "";
    $("teacherId").readOnly = !!teacher;
    $("teacherModal").classList.add("open"); $("teacherModal").setAttribute("aria-hidden", "false");
    setTimeout(() => $("teacherName").focus(), 50);
}
function closeModal() { $("teacherModal").classList.remove("open"); $("teacherModal").setAttribute("aria-hidden", "true"); $("teacherId").readOnly = false; }

function renderDashboard() {
    const date = todayISO(), total = state.teachers.length;
    const counts = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
    state.teachers.forEach(t => { const r = recordFor(t.id, date); if (r && counts[r.status] !== undefined) counts[r.status]++; });
    const marked = Object.values(counts).reduce((a, b) => a + b, 0), rate = total ? Math.round((counts.Present + counts.Late) / total * 100) : 0;
    $("statTotal").textContent = total; $("statPresent").textContent = counts.Present; $("statAbsent").textContent = counts.Absent; $("statLate").textContent = counts.Late;
    $("attendanceRate").textContent = `${rate}%`;
    $("attendanceDonut").style.background = `conic-gradient(var(--green) 0 ${rate * 3.6}deg,#edf1f6 ${rate * 3.6}deg 360deg)`;
    $("legendPresent").textContent = counts.Present; $("legendAbsent").textContent = counts.Absent; $("legendLate").textContent = counts.Late; $("legendLeave").textContent = counts.Leave;
    const recent = state.records.slice().sort((a, b) => (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt)).slice(0, 5);
    $("recentTable").innerHTML = recent.length ? recent.map(r => { const t = state.teachers.find(x => x.id === r.teacherId); return t ? `<tr><td>${teacherCell(t)}</td><td>${safe(r.date)}</td><td>${statusBadge(r.status)}</td></tr>` : ""; }).join("") : `<tr><td colspan="3" class="muted-cell">No attendance saved yet.</td></tr>`;
}
function renderTeachers() {
    const q = $("teacherSearch").value.trim().toLowerCase();
    const list = state.teachers.filter(t => [t.name, t.id, t.subject, t.phone].some(v => String(v || "").toLowerCase().includes(q)));
    $("teacherCount").textContent = `${list.length} teacher${list.length === 1 ? "" : "s"}`;
    $("teachersTable").innerHTML = list.map(t => `<tr><td>${teacherCell(t)}</td><td>${safe(t.id)}</td><td>${safe(t.subject)}</td><td>${safe(t.phone || "—")}</td><td><div class="action-group"><button class="icon-btn" title="Edit" data-edit="${safe(t.id)}">✎</button><button class="icon-btn delete" title="Delete" data-delete="${safe(t.id)}">×</button></div></td></tr>`).join("");
    $("teachersEmpty").classList.toggle("show", list.length === 0);
    $("teachersEmpty").querySelector("b").textContent = q ? "No matching teachers" : "No teachers yet";
    $("teachersEmpty").querySelector("p").textContent = q ? "Try another search term." : "Add your first teacher to get started.";
}
function renderAttendance() {
    const date = $("attendanceDate").value || todayISO(), q = $("attendanceSearch").value.trim().toLowerCase();
    const list = state.teachers.filter(t => [t.name, t.id, t.subject].some(v => String(v).toLowerCase().includes(q)));
    $("attendanceTable").innerHTML = list.map(t => { const r = recordFor(t.id, date); const status = r ? r.status : "Present"; return `<tr><td>${teacherCell(t)}</td><td>${safe(t.subject)}</td><td><select class="status-select" data-status="${safe(t.id)}"><option ${status === "Present" ? "selected" : ""}>Present</option><option ${status === "Absent" ? "selected" : ""}>Absent</option><option ${status === "Late" ? "selected" : ""}>Late</option><option ${status === "Leave" ? "selected" : ""}>Leave</option></select></td></tr>`; }).join("");
    $("attendanceEmpty").classList.toggle("show", list.length === 0);
    $("saveAttendanceBtn").disabled = state.teachers.length === 0;
    $("saveAttendanceBtn").style.opacity = state.teachers.length === 0 ? ".5" : "1";
}
function saveAttendance() {
    const date = $("attendanceDate").value;
    if (!date) { showToast("Please select a date first."); return; }
    if (!state.teachers.length) { showToast("Add teachers before marking attendance."); return; }
    document.querySelectorAll("#attendanceTable select[data-status]").forEach(sel => {
        const teacherId = sel.dataset.status, status = sel.value; let r = recordFor(teacherId, date);
        if (r) { r.status = status; r.updatedAt = new Date().toISOString(); }
        else state.records.push({ teacherId, date, status, updatedAt: new Date().toISOString() });
    });
    persist(); renderDashboard(); renderAttendance(); showToast("Attendance saved successfully.");
}
function setReportMode(mode) {
    reportMode = mode;
    document.querySelectorAll(".report-tab").forEach(b => b.classList.toggle("active", b.dataset.report === mode));
    $("dailyFilter").classList.toggle("hidden", mode !== "daily"); $("monthlyFilter").classList.toggle("hidden", mode !== "monthly");
    renderReports();
}
function renderReports() {
    const filtered = state.records.filter(r => reportMode === "daily" ? r.date === $("reportDate").value : r.date.startsWith($("reportMonth").value));
    const counts = { Present: 0, Absent: 0, Late: 0, Leave: 0 }; filtered.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    $("reportTotal").textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;
    $("reportStats").innerHTML = Object.entries(counts).map(([k, v]) => `<div class="report-stat"><span>${k}</span><b>${v}</b></div>`).join("");
    if (reportMode === "daily") {
        $("reportHead").innerHTML = "<tr><th>TEACHER</th><th>TEACHER ID</th><th>SUBJECT</th><th>DATE</th><th>STATUS</th></tr>";
        $("reportTable").innerHTML = filtered.map(r => { const t = state.teachers.find(x => x.id === r.teacherId); return t ? `<tr><td>${teacherCell(t)}</td><td>${safe(t.id)}</td><td>${safe(t.subject)}</td><td>${safe(r.date)}</td><td>${statusBadge(r.status)}</td></tr>` : ""; }).join("");
    } else {
        $("reportHead").innerHTML = "<tr><th>TEACHER</th><th>TEACHER ID</th><th>PRESENT</th><th>ABSENT</th><th>LATE</th><th>LEAVE</th><th>TOTAL</th></tr>";
        $("reportTable").innerHTML = state.teachers.map(t => { const rows = filtered.filter(r => r.teacherId === t.id); const c = { Present: 0, Absent: 0, Late: 0, Leave: 0 }; rows.forEach(r => c[r.status]++); return `<tr><td>${teacherCell(t)}</td><td>${safe(t.id)}</td><td>${c.Present}</td><td>${c.Absent}</td><td>${c.Late}</td><td>${c.Leave}</td><td><b>${rows.length}</b></td></tr>`; }).join("");
    }
    $("reportEmpty").classList.toggle("show", reportMode === "daily" ? filtered.length === 0 : state.teachers.length === 0);
}
function exportExcel() {
    const date = $("reportDate").value, month = $("reportMonth").value;
    let rows = [];
    if (reportMode === "daily") {
        rows = [["Teacher Name", "Teacher ID", "Subject", "Date", "Status"], ...state.records.filter(r => r.date === date).map(r => { const t = state.teachers.find(x => x.id === r.teacherId); return t ? [t.name, t.id, t.subject, r.date, r.status] : null; }).filter(Boolean)];
    } else {
        rows = [["Teacher Name", "Teacher ID", "Present", "Absent", "Late", "Leave", "Total"]];
        state.teachers.forEach(t => { const rs = state.records.filter(r => r.teacherId === t.id && r.date.startsWith(month)); const c = { Present: 0, Absent: 0, Late: 0, Leave: 0 }; rs.forEach(r => c[r.status]++); rows.push([t.name, t.id, c.Present, c.Absent, c.Late, c.Leave, rs.length]); });
    }
    if (rows.length === 1) { showToast("There is no data to export for this selection."); return; }
    const csv = rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `attendance_${reportMode}_${reportMode === "daily" ? date : month}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast("Excel-compatible report downloaded.");
}
function deleteTeacher(id) {
    const t = state.teachers.find(x => x.id === id); if (!t) return;
    if (!confirm(`Delete ${t.name}? Their attendance records will also be deleted.`)) return;
    state.teachers = state.teachers.filter(x => x.id !== id); state.records = state.records.filter(r => r.teacherId !== id); persist(); renderTeachers(); renderDashboard(); showToast("Teacher deleted.");
}

document.querySelectorAll(".nav-link").forEach(b => b.addEventListener("click", () => navigate(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.go)));
$("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("addTeacherBtn").addEventListener("click", () => openModal()); $("emptyAddBtn").addEventListener("click", () => openModal());
$("closeModal").addEventListener("click", closeModal); $("cancelModal").addEventListener("click", closeModal);
$("teacherModal").addEventListener("click", e => { if (e.target === $("teacherModal")) closeModal(); });
$("teacherForm").addEventListener("submit", e => {
    e.preventDefault();
    const editId = $("editTeacherId").value;
    const t = { name: $("teacherName").value.trim(), id: $("teacherId").value.trim(), subject: $("teacherSubject").value.trim(), phone: $("teacherPhone").value.trim() };
    if (!t.name || !t.id || !t.subject) { showToast("Please fill in all required fields."); return; }
    if (editId) { const existing = state.teachers.find(x => x.id === editId); if (existing) Object.assign(existing, { name: t.name, subject: t.subject, phone: t.phone }); showToast("Teacher updated."); }
    else { if (state.teachers.some(x => x.id.toLowerCase() === t.id.toLowerCase())) { showToast("That teacher ID already exists."); return; } state.teachers.push(t); showToast("Teacher added successfully."); }
    persist(); closeModal(); renderTeachers(); renderDashboard(); renderAttendance();
});
$("teachersTable").addEventListener("click", e => { const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]"); if (edit) { const t = state.teachers.find(x => x.id === edit.dataset.edit); if (t) openModal(t); } if (del) deleteTeacher(del.dataset.delete); });
$("teacherSearch").addEventListener("input", renderTeachers);
$("attendanceDate").value = todayISO(); $("reportDate").value = todayISO(); $("reportMonth").value = monthISO();
$("attendanceDate").addEventListener("change", renderAttendance); $("attendanceSearch").addEventListener("input", renderAttendance);
$("saveAttendanceBtn").addEventListener("click", saveAttendance);
document.querySelectorAll(".report-tab").forEach(b => b.addEventListener("click", () => setReportMode(b.dataset.report)));
$("reportDate").addEventListener("change", renderReports); $("reportMonth").addEventListener("change", renderReports); $("exportBtn").addEventListener("click", exportExcel);
$("todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
renderDashboard(); renderTeachers(); renderAttendance(); renderReports();
