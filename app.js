import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const key = "bianca_dispatch_trips_v3";
const cfgKey = "bianca_sync_cfg_v1";
const $ = (id) => document.getElementById(id);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

let supabase = null;
let tripsCache = [];

function loadLocal() { return JSON.parse(localStorage.getItem(key) || "[]"); }
function saveLocal(all) { localStorage.setItem(key, JSON.stringify(all)); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function setSyncState(msg) { $("syncState").textContent = msg; }

function loadCfg(){ return JSON.parse(localStorage.getItem(cfgKey)||"{}"); }
function saveCfg(c){ localStorage.setItem(cfgKey, JSON.stringify(c)); }

async function listTrips(){
  if (!supabase) return loadLocal();
  const { data, error } = await supabase.from('trips').select('*').order('pickup_at', { ascending: true });
  if (error) { console.error(error); return []; }
  return (data || []).map(fromDb);
}

async function upsertTrip(t){
  if (!supabase) {
    const all = loadLocal();
    const idx = all.findIndex(x => x.id === t.id);
    if (idx >= 0) all[idx] = t; else all.push(t);
    saveLocal(all); return;
  }
  const row = toDb(t);
  const { error } = await supabase.from('trips').upsert(row);
  if (error) alert(`Save failed: ${error.message}`);
}

async function deleteTrip(id){
  if (!supabase) { saveLocal(loadLocal().filter(t => t.id !== id)); return; }
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) alert(`Delete failed: ${error.message}`);
}

function toDb(t){
  return {
    id: t.id, affiliate_trip_id: t.affiliateTripId, pickup_at: t.pickupAt || null, pickup_address: t.pickup,
    dropoff_address: t.dropoff, passenger_name: t.passenger, passenger_phone: t.phone,
    vehicle_class_requested: t.vehicleClass, job_type: t.jobType, status: t.status, revenue: t.revenue,
    other_costs: t.cost, source_type: 'affiliate', special_instructions: '',
  };
}
function fromDb(r){
  return {
    id: r.id, affiliateTripId: r.affiliate_trip_id || '', pickupAt: r.pickup_at ? r.pickup_at.slice(0,16) : '',
    pickup: r.pickup_address || '', dropoff: r.dropoff_address || '', passenger: r.passenger_name || '',
    phone: r.passenger_phone || '', vehicleClass: r.vehicle_class_requested || 'SUV',
    jobType: r.job_type || 'point_to_point', status: r.status || 'new', revenue: Number(r.revenue||0),
    cost: Number(r.other_costs||0), partner: '', driver: ''
  };
}

function parseAffiliate(raw) { const lines = raw.split(/\n/).map(l => l.trim()).filter(Boolean); const get = (label) => { const i = lines.findIndex(l => l.toLowerCase().startsWith(label.toLowerCase())); if (i === -1) return ""; return (lines[i].split(":").slice(1).join(":").trim()) || (lines[i + 1] || ""); }; return { affiliateTripId: get("Details for"), passenger: get("Passenger Name").replace(",", " "), phone: get("Passenger Mobile") }; }
function currentFilters(){ return { q: $("search").value.trim().toLowerCase(), status: $("fStatus").value, partner: $("fPartner").value.trim().toLowerCase(), todayOnly: $("todayOnly").checked }; }
function matchesFilter(t,f){ const target = `${t.passenger} ${t.partner} ${t.pickup} ${t.dropoff} ${t.driver}`.toLowerCase(); if(f.q&&!target.includes(f.q)) return false; if(f.status&&t.status!==f.status) return false; if(f.partner&&!(t.partner||"").toLowerCase().includes(f.partner)) return false; if(f.todayOnly){ const d=new Date(t.pickupAt), n=new Date(); if(isNaN(d)||d.toDateString()!==n.toDateString()) return false; } return true; }
function resetForm(){ ["pickupAt","affiliateTripId","partner","passenger","phone","pickup","dropoff","driver","revenue","cost"].forEach(id => $(id).value = ""); $("vehicleClass").value = "SUV"; $("status").value = "new"; $("jobType").value = "point_to_point"; $("editId").value = ""; $("save").textContent = "Save Trip"; }
function tripFromForm(){ return { id: $("editId").value || uid(), pickupAt: $("pickupAt").value, affiliateTripId: $("affiliateTripId").value, partner: $("partner").value, passenger: $("passenger").value, phone: $("phone").value, vehicleClass: $("vehicleClass").value, jobType: $("jobType").value, pickup: $("pickup").value, dropoff: $("dropoff").value, driver: $("driver").value, status: $("status").value, revenue: Number($("revenue").value || 0), cost: Number($("cost").value || 0) }; }

function render() {
  const f = currentFilters();
  const filtered = tripsCache.filter(t => matchesFilter(t, f));
  const tbody = $("rows"); tbody.innerHTML = "";
  let rev = 0, cost = 0;
  filtered.forEach(t => { rev += Number(t.revenue || 0); cost += Number(t.cost || 0); const profit = t.revenue - t.cost; const tr = document.createElement("tr"); tr.innerHTML = `<td>${t.pickupAt || ""}</td><td>${t.passenger || ""}</td><td>${t.pickup || ""} → ${t.dropoff || ""}</td><td>${t.driver || ""}</td><td>${t.status || "new"}</td><td>${t.partner || ""}</td><td>${money(t.revenue)}</td><td>${money(t.cost)}</td><td>${money(profit)}</td><td><button data-edit="${t.id}">Edit</button> <button data-del="${t.id}">Delete</button></td>`; tbody.appendChild(tr); });
  $("kTrips").textContent = filtered.length; $("kRevenue").textContent = money(rev); $("kCost").textContent = money(cost); $("kProfit").textContent = money(rev - cost);
  tbody.querySelectorAll("button[data-del]").forEach(btn => btn.onclick = async () => { await deleteTrip(btn.dataset.del); tripsCache = await listTrips(); render(); });
  tbody.querySelectorAll("button[data-edit]").forEach(btn => btn.onclick = () => { const t = tripsCache.find(x => x.id === btn.dataset.edit); if (!t) return; Object.assign($("editId"),{value:t.id}); $("pickupAt").value=t.pickupAt||""; $("affiliateTripId").value=t.affiliateTripId||""; $("partner").value=t.partner||""; $("passenger").value=t.passenger||""; $("phone").value=t.phone||""; $("vehicleClass").value=["SUV","Sedan","Sprinter"].includes(t.vehicleClass)?t.vehicleClass:"SUV"; $("jobType").value=t.jobType||"point_to_point"; $("pickup").value=t.pickup||""; $("dropoff").value=t.dropoff||""; $("driver").value=t.driver||""; $("status").value=t.status||"new"; $("revenue").value=t.revenue||0; $("cost").value=t.cost||0; $("save").textContent="Update Trip"; });
}

async function connectSupabase() {
  const url = $("sbUrl").value.trim();
  const anon = $("sbAnonKey").value.trim();
  if (!url || !anon) return alert('Enter Supabase URL + anon key');
  supabase = createClient(url, anon);
  saveCfg({ url, anon, email: $("sbEmail").value.trim() });
  setSyncState('Connected (cloud sync enabled)');
  tripsCache = await listTrips();
  render();
}

$("connect").onclick = connectSupabase;
$("login").onclick = async () => {
  if (!supabase) return alert('Connect first');
  const email = $("sbEmail").value.trim();
  if (!email) return alert('Enter email');
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) alert(error.message); else alert('Magic link sent. Open it on this device to sign in.');
};
$("logout").onclick = async () => { if (supabase) await supabase.auth.signOut(); setSyncState('Signed out'); };
$("save").onclick = async () => { await upsertTrip(tripFromForm()); tripsCache = await listTrips(); render(); resetForm(); };
$("parse").onclick = () => { const p = parseAffiliate($("raw").value || ""); $("affiliateTripId").value=p.affiliateTripId||""; $("passenger").value=p.passenger||""; $("phone").value=p.phone||""; };
$("exportCsv").onclick = () => { const rows = tripsCache; const headers = ["pickupAt","affiliateTripId","partner","passenger","phone","vehicleClass","jobType","pickup","dropoff","driver","status","revenue","cost"]; const csv = [headers.join(",")].concat(rows.map(r => headers.map(h => `"${String(r[h] ?? "").replaceAll('"','""')}"`).join(","))).join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "bianca_trips.csv"; a.click(); };
["search","fStatus","fPartner","todayOnly"].forEach(id => $(id).addEventListener("input", render));
$("resetForm").onclick = resetForm;

(async function init(){
  const cfg = loadCfg();
  if (cfg.url && cfg.anon) {
    $("sbUrl").value = cfg.url; $("sbAnonKey").value = cfg.anon; $("sbEmail").value = cfg.email || "";
    supabase = createClient(cfg.url, cfg.anon);
    setSyncState('Connected from saved config');
  } else {
    setSyncState('Local mode (no cloud sync)');
  }
  tripsCache = await listTrips();
  render();
})();
