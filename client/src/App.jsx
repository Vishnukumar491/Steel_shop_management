import { useEffect, useMemo, useState } from "react";
import { Boxes, LayoutDashboard, PlusCircle, FileSpreadsheet, RefreshCw, Trash2, Pencil, X, Check, Search, LockKeyhole, UnlockKeyhole, PackageOpen, Download } from "lucide-react";
import api from "./api";

const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));
const dateLabel = d => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const units = ["KG", "PCS", "TON", "METER", "BUNDLE", "OTHER"];
const blankEntry = { objectName: "", quantity: "", unit: "KG", unitPrice: "", remarks: "" };

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState({ rows: [], grandTotal: 0, quantityByUnit: {}, entryCount: 0 });
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [form, setForm] = useState(blankEntry);
  const [sessionForm, setSessionForm] = useState({ sessionName: "", sessionDate: new Date().toISOString().slice(0,10), customerName: "", referenceNumber: "" });
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [sort, setSort] = useState("name");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const toast = message => { setNotice(message); window.setTimeout(() => setNotice(""), 3200); };
  const loadSessions = async () => {
    try {
      const { data } = await api.get("/sessions");
      setSessions(data.data);
      if (!activeId && data.data.length) setActiveId(data.data[0]._id);
    } catch (e) { toast(e.response?.data?.message || "Cannot load sessions. Check the backend connection."); }
  };
  const loadSession = async id => {
    if (!id) { setSession(null); setSummary({ rows: [], grandTotal: 0, quantityByUnit: {}, entryCount: 0 }); setEntries([]); return; }
    try {
      const [s, e] = await Promise.all([api.get(`/sessions/${id}`), api.get(`/entries/session/${id}`)]);
      setSession(s.data.data);
      setSummary({ rows: s.data.data.rows || [], grandTotal: s.data.data.grandTotal || 0, quantityByUnit: s.data.data.quantityByUnit || {}, entryCount: s.data.data.entryCount || 0 });
      setEntries(e.data.data);
    } catch (err) { toast(err.response?.data?.message || "Unable to load selected session."); }
  };
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { if (activeId) loadSession(activeId); else { setSession(null); setEntries([]); } }, [activeId]);
  const refresh = async () => { await loadSessions(); if (activeId) await loadSession(activeId); };
  const filteredRows = useMemo(() => {
    let rows = summary.rows.filter(r => r.objectName.toLowerCase().includes(query.toLowerCase()) && (unitFilter === "ALL" || r.unit === unitFilter));
    return rows.sort((a,b) => sort === "amount" ? b.totalAmount-a.totalAmount : sort === "quantity" ? b.totalQuantity-a.totalQuantity : a.objectName.localeCompare(b.objectName));
  }, [summary.rows, query, unitFilter, sort]);

  const createSession = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post("/sessions", sessionForm);
      setSessions(old => [data.data, ...old]); setActiveId(data.data._id); setPage("entry"); setShowSessionForm(false);
      setSessionForm({ sessionName: "", sessionDate: new Date().toISOString().slice(0,10), customerName: "", referenceNumber: "" });
      toast("Entry session created.");
    } catch (err) { toast(err.response?.data?.message || "Could not create session."); }
    finally { setBusy(false); }
  };
  const saveEntry = async e => {
    e.preventDefault();
    if (!activeId) { toast("Create or select a session first."); return; }
    if (!form.objectName.trim() || Number(form.quantity) <= 0 || Number(form.unitPrice) < 0 || form.unitPrice === "") { toast("Enter a material, quantity above zero, and a valid unit price."); return; }
    setBusy(true);
    const payload = { ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) };
    try {
      if (editing) await api.put(`/entries/${editing._id}`, payload);
      else await api.post(`/entries/session/${activeId}`, payload);
      setForm(blankEntry); setEditing(null); await loadSession(activeId); await loadSessions();
      toast(editing ? "Entry updated." : "Entry saved.");
    } catch (err) { toast(err.response?.data?.message || "Could not save entry."); }
    finally { setBusy(false); }
  };
  const deleteEntry = async entry => {
    if (!window.confirm(`Delete "${entry.objectName}" entry?`)) return;
    try { await api.delete(`/entries/${entry._id}`); await loadSession(activeId); await loadSessions(); toast("Entry deleted."); }
    catch (err) { toast(err.response?.data?.message || "Could not delete entry."); }
  };
  const changeStatus = async () => {
    if (!session) return;
    const status = session.status === "Open" ? "Closed" : "Open";
    if (!window.confirm(`${status === "Closed" ? "Close" : "Reopen"} this session?`)) return;
    try { await api.patch(`/sessions/${session._id}/status`, { status }); await loadSession(activeId); await loadSessions(); toast(`Session ${status.toLowerCase()}.`); }
    catch (err) { toast(err.response?.data?.message || "Could not update session."); }
  };
  const exportExcel = async () => {
    if (!activeId) return toast("Select a session first.");
    try {
      const response = await api.get(`/reports/${activeId}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a"); a.href = url;
      a.download = `Steel_Shop_Report_${session?.sessionDate ? new Date(session.sessionDate).toISOString().slice(0,10) : "report"}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast("Excel report downloaded.");
    } catch { toast("Excel export failed. Check the backend."); }
  };
  const beginEdit = entry => { setEditing(entry); setForm({ objectName: entry.objectName, quantity: String(entry.quantity), unit: entry.unit, unitPrice: String(entry.unitPrice), remarks: entry.remarks || "" }); setPage("entry"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Boxes size={23}/></div><div><strong>Steel<span>Mate</span></strong><small>SHOP MANAGEMENT</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <button className={`nav-item ${page==="dashboard"?"active":""}`} onClick={()=>setPage("dashboard")}><LayoutDashboard size={18}/> Dashboard</button>
      <button className={`nav-item ${page==="entry"?"active":""}`} onClick={()=>setPage("entry")}><PlusCircle size={18}/> Material entry</button>
      <button className={`nav-item ${page==="results"?"active":""}`} onClick={()=>setPage("results")}><FileSpreadsheet size={18}/> Consolidated report</button>
      <div className="sidebar-bottom"><div className="status-dot"/> <span>Shop records</span><span className="secure">MongoDB</span></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><div className="eyebrow">STEEL SHOP / OPERATIONS</div><h1>{page==="dashboard"?"Dashboard":page==="entry"?(editing?"Edit material entry":"Material entry"):"Consolidated report"}</h1></div><div className="top-actions"><button className="btn btn-light" onClick={refresh}><RefreshCw size={16}/> Refresh</button><button className="btn btn-primary" onClick={()=>{setEditing(null);setForm(blankEntry);setPage("entry");}}><PlusCircle size={17}/> New entry</button></div></header>
      {notice && <div className="toast">{notice}</div>}
      <section className="session-strip">
        <div className="session-selector"><span className="field-label">ACTIVE SESSION</span><select value={activeId} onChange={e=>setActiveId(e.target.value)}><option value="">Select a session</option>{sessions.map(s=><option key={s._id} value={s._id}>{s.sessionName} · {dateLabel(s.sessionDate)}{s.status==="Closed"?" (Closed)":""}</option>)}</select></div>
        <div className="session-meta">{session && <><span className={`status-pill ${session.status==="Open"?"open":"closed"}`}>{session.status}</span><span>{session.customerName || "No customer specified"}</span></>}</div>
        <button className="btn btn-outline" onClick={()=>setShowSessionForm(v=>!v)}>+ New session</button>
      </section>
      {showSessionForm && <form className="panel session-create" onSubmit={createSession}><div className="panel-heading"><div><h2>Create entry session</h2><p>Keep a separate report for each day, customer, or order.</p></div><button type="button" className="icon-btn" onClick={()=>setShowSessionForm(false)}><X size={18}/></button></div><div className="form-grid"><label>Session name *<input required value={sessionForm.sessionName} onChange={e=>setSessionForm({...sessionForm,sessionName:e.target.value})} placeholder="e.g. Daily sales - morning"/></label><label>Session date *<input type="date" required value={sessionForm.sessionDate} onChange={e=>setSessionForm({...sessionForm,sessionDate:e.target.value})}/></label><label>Customer / party<input value={sessionForm.customerName} onChange={e=>setSessionForm({...sessionForm,customerName:e.target.value})} placeholder="Optional"/></label><label>Order reference<input value={sessionForm.referenceNumber} onChange={e=>setSessionForm({...sessionForm,referenceNumber:e.target.value})} placeholder="Optional"/></label></div><div className="form-actions"><button className="btn btn-primary" disabled={busy}>{busy?"Creating…":"Create session"}</button></div></form>}

      {page==="dashboard" && <><div className="welcome"><div><div className="eyebrow light">OVERVIEW</div><h2>Keep every steel entry in control.</h2><p>Record materials, track quantities, and export clean reports.</p></div><div className="welcome-art"><Boxes size={74} strokeWidth={1}/></div></div>
        <div className="stats-grid"><Stat icon={<PackageOpen/>} label="Unique material rows" value={summary.rows.length} tone="blue"/><Stat icon={<FileSpreadsheet/>} label="Individual entries" value={summary.entryCount} tone="purple"/><Stat icon={<Boxes/>} label="Quantity units" value={Object.keys(summary.quantityByUnit).length} tone="orange"/><Stat icon={<span className="rupee">₹</span>} label="Session grand total" value={money(summary.grandTotal)} tone="green"/></div>
        <div className="content-grid"><div className="panel"><div className="panel-heading"><div><h2>Consolidated materials</h2><p>Repeated materials are grouped by name and unit.</p></div><button className="text-btn" onClick={()=>setPage("results")}>View report →</button></div><SummaryTable rows={summary.rows.slice(0,6)}/>{!summary.rows.length&&<EmptyState text="No materials in this session yet. Add your first entry to get started."/>}</div>
        <div className="panel"><div className="panel-heading"><div><h2>Quantity by unit</h2><p>Units are totaled separately.</p></div></div>{Object.entries(summary.quantityByUnit).length?Object.entries(summary.quantityByUnit).map(([unit,qty])=><div className="unit-row" key={unit}><span className="unit-chip">{unit}</span><strong>{qty.toLocaleString("en-IN",{maximumFractionDigits:3})}</strong></div>):<EmptyState text="Unit totals appear after you add entries."/>}<div className="export-card"><div className="export-icon"><FileSpreadsheet/></div><div><strong>Ready for Excel</strong><p>Download a two-sheet report for this session.</p></div><button className="icon-btn" onClick={exportExcel} title="Export Excel"><Download size={18}/></button></div></div></div>
      </>}

      {page==="entry" && <div className="panel entry-panel"><div className="panel-heading"><div><h2>{editing?"Update material":"Add a material"}</h2><p>Each entry is saved separately. The summary consolidates matching names and units.</p></div>{editing&&<button className="btn btn-light" onClick={()=>{setEditing(null);setForm(blankEntry)}}><X size={15}/> Cancel edit</button>}</div>
        {!session?<EmptyState text="Create or select an entry session before recording materials."/>:session.status==="Closed"?<div className="closed-notice"><LockKeyhole size={20}/><div><strong>This session is closed.</strong><p>Reopen it to add or edit material entries.</p></div><button className="btn btn-outline" onClick={changeStatus}>Reopen session</button></div>:<form onSubmit={saveEntry}>
          <div className="form-grid entry-grid"><label className="span-two">Object / material name *<input autoFocus required list="material-suggestions" value={form.objectName} onChange={e=>setForm({...form,objectName:e.target.value})} placeholder="e.g. Steel Rod 8mm"/><datalist id="material-suggestions">{[...new Set(entries.map(e=>e.objectName))].map(name=><option key={name} value={name}/>)}</datalist></label><label>Quantity *<input required type="number" min="0.000001" step="any" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="0.00"/></label><label>Unit *<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{units.map(u=><option key={u}>{u}</option>)}</select></label><label>Price per unit (₹) *<input required type="number" min="0" step="0.01" value={form.unitPrice} onChange={e=>setForm({...form,unitPrice:e.target.value})} placeholder="0.00"/></label><label>Total amount (₹)<div className="calculated">{money((Number(form.quantity)||0)*(Number(form.unitPrice)||0))}</div></label><label className="span-two">Remarks <input value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} placeholder="Optional note"/></label></div>
          <div className="form-footer"><span><Check size={15}/> Total is calculated automatically</span><div><button type="button" className="btn btn-light" onClick={()=>{setForm(blankEntry);setEditing(null)}}>Clear form</button><button className="btn btn-primary" disabled={busy}>{busy?"Saving…":editing?"Save changes":"Add entry"} <span>→</span></button></div></div>
        </form>}
        <div className="recent-head"><h3>Recent entries</h3><span>{entries.length} total</span></div>{entries.length?<div className="table-wrap"><table><thead><tr><th>Material</th><th>Quantity</th><th>Unit price</th><th>Total</th><th>Actions</th></tr></thead><tbody>{entries.slice(0,8).map(e=><tr key={e._id}><td><strong>{e.objectName}</strong>{e.remarks&&<small className="subtext">{e.remarks}</small>}</td><td>{e.quantity}</td><td>{money(e.unitPrice)}</td><td className="amount">{money(e.totalAmount)}</td><td><div className="row-actions"><button className="icon-btn" title="Edit" onClick={()=>beginEdit(e)}><Pencil size={15}/></button><button className="icon-btn danger" title="Delete" onClick={()=>deleteEntry(e)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>:<EmptyState text="No entries yet. Fill in the form above to add a material."/>}
      </div>}

      {page==="results" && <div className="panel"><div className="panel-heading"><div><h2>Consolidated results</h2><p>{session?`${session.sessionName} · ${dateLabel(session.sessionDate)}`:"Select a session to view its report"}</p></div><button className="btn btn-primary" onClick={exportExcel} disabled={!session}><FileSpreadsheet size={17}/> Export Excel</button></div>
        <div className="toolbar"><div className="searchbox"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search materials…"/></div><select value={unitFilter} onChange={e=>setUnitFilter(e.target.value)}><option value="ALL">All units</option>{units.map(u=><option key={u}>{u}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Sort: Name</option><option value="quantity">Sort: Quantity</option><option value="amount">Sort: Amount</option></select></div>
        <SummaryTable rows={filteredRows} detailed/><div className="report-footer"><div><span>Grand total</span><strong>{money(summary.grandTotal)}</strong></div><div><span>Individual entries</span><strong>{summary.entryCount}</strong></div></div>
        <div className="unit-totals"><strong>Quantity subtotals</strong>{Object.entries(summary.quantityByUnit).length?Object.entries(summary.quantityByUnit).map(([u,q])=><span key={u}>{u}: <b>{q.toLocaleString("en-IN",{maximumFractionDigits:3})}</b></span>):<span>No quantities yet</span>}</div>
        <div className="panel-bottom"><button className="btn btn-outline" onClick={changeStatus} disabled={!session}>{session?.status==="Open"?<><LockKeyhole size={16}/> Close session</>:<><UnlockKeyhole size={16}/> Reopen session</>}</button><span>Average price = total amount ÷ total quantity</span></div>
      </div>}
      <footer className="footer"><span>SteelMate · Steel Shop Management</span><span>Data is stored in your configured MongoDB database.</span></footer>
    </main>
  </div>;
}

function Stat({icon,label,value,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
function EmptyState({text}) { return <div className="empty-state"><PackageOpen size={28}/><p>{text}</p></div>; }
function SummaryTable({rows,detailed=false}) { return <div className="table-wrap"><table><thead><tr><th>S.No.</th><th>Object name</th><th>Total quantity</th><th>Unit</th><th>Total amount</th><th>Avg. unit price</th><th>Entries</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.objectName}-${r.unit}`}><td>{i+1}</td><td><strong>{r.objectName}</strong></td><td>{Number(r.totalQuantity).toLocaleString("en-IN",{maximumFractionDigits:3})}</td><td><span className="unit-chip">{r.unit}</span></td><td className="amount">{money(r.totalAmount)}</td><td>{money(r.averageUnitPrice)}</td><td><span className="count-chip">{r.entryCount}</span></td></tr>)}</tbody></table>{!rows.length&&<EmptyState text="No matching materials found."/>}</div>; }
