
/* NUS Companion V3 - shared app logic */

const ACADEMIC_YEAR = "2026-2027";
const SEMESTER = "1";
const NUSMODS_BASE = `https://api.nusmods.com/v2/${ACADEMIC_YEAR}`;

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const DEFAULT_MODULES = [
  {code:"CS1101S", name:"Programming Methodology"},
  {code:"CS1231S", name:"Discrete Structures"},
  {code:"GEA1000", name:"Quantitative Reasoning"},
  {code:"MA1522", name:"Calculus for Computing"}
];

const defaultActivities = [
  {id:"default-basketball", name:"Basketball Training", club:"NUS Basketball", module:"", recurring:true, day:"Wednesday", date:"", startTime:"19:00", endTime:"21:00", venue:"MPSH"},
  {id:"default-marketing", name:"Marketing Meeting", club:"Tech Society", module:"", recurring:true, day:"Friday", date:"", startTime:"18:30", endTime:"20:00", venue:"COM3"}
];

const defaultTasks = [
  {id:"default-task-1", title:"CS1231S Tutorial 2", module:"CS1231S", dueDate:"2026-08-18", dueTime:"23:59", done:false},
  {id:"default-task-2", title:"GEA1000 Reading", module:"GEA1000", dueDate:"2026-08-20", dueTime:"23:59", done:false}
];

function clone(v){ return JSON.parse(JSON.stringify(v)); }

function read(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? clone(fallback) : JSON.parse(raw);
  } catch { return clone(fallback); }
}

const state = {
  modules: read("nus_modules", DEFAULT_MODULES),
  lessons: read("nus_lessons", []),
  activities: read("nus_activities", defaultActivities),
  tasks: read("nus_tasks", defaultTasks),
  semester: read("nus_semester", {academicYear:ACADEMIC_YEAR, semester:SEMESTER})
};

let cloudSaveTimer = null;
let cloudSyncStop = null;
let cloudSyncActive = false;
let lastLocalCloudChangeAt = 0;
let lastRemoteCloudChangeAt = 0;

function save(options={}){
  localStorage.setItem("nus_modules", JSON.stringify(state.modules));
  localStorage.setItem("nus_lessons", JSON.stringify(state.lessons));
  localStorage.setItem("nus_activities", JSON.stringify(state.activities));
  localStorage.setItem("nus_tasks", JSON.stringify(state.tasks));
  localStorage.setItem("nus_semester", JSON.stringify(state.semester));

  // Normal edits are debounced. Destructive operations can request an
  // immediate Firestore write so a refresh cannot race the pending save.
  if(window.nusFirebase?.configured && window.nusFirebase?.user){
    lastLocalCloudChangeAt=Date.now();
    clearTimeout(cloudSaveTimer);
    if(options.immediate){
      return window.nusFirebase.saveState(state).catch(err=>{
        console.error("Cloud save failed",err);
        toast("Deleted locally, but cloud sync failed.");
        throw err;
      });
    }
    cloudSaveTimer=setTimeout(()=>{
      window.nusFirebase.saveState(state).catch(err=>{
        console.error("Cloud save failed",err);
        toast("Saved locally, but cloud sync failed.");
      });
    },350);
  }
  return Promise.resolve();
}

function esc(v=""){
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function timeToMinutes(v){
  if(v == null || v === "") return null;
  const s=String(v).trim().toUpperCase();
  const m=s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if(m){
    let h=+m[1], min=+m[2];
    if(m[3]==="PM" && h!==12) h+=12;
    if(m[3]==="AM" && h===12) h=0;
    return h*60+min;
  }
  const hhmm=s.match(/^(\d{1,2}):(\d{2})$/);
  if(hhmm){
    const h=+hhmm[1], min=+hhmm[2];
    if(h>=0 && h<=23 && min>=0 && min<=59) return h*60+min;
  }
  if(/^\d{3,4}$/.test(s)){
    const p=s.padStart(4,"0");
    const h=+p.slice(0,2), min=+p.slice(2);
    return h<=23 && min<=59 ? h*60+min : null;
  }
  return null;
}

function minutesLabel(m){
  if(m==null) return "TBC";
  const h=Math.floor(m/60), min=m%60;
  const suffix=h>=12?"PM":"AM";
  return `${h%12||12}:${String(min).padStart(2,"0")} ${suffix}`;
}

function inputTimeToLabel(v){ return v ? minutesLabel(timeToMinutes(v)) : "TBC"; }

function parseTimeRange(v){
  if(!v) return null;
  const p=String(v).split(/\s*[–—-]\s*/);
  if(p.length<2) return null;
  const a=timeToMinutes(p[0]), b=timeToMinutes(p[1]);
  return a==null||b==null ? null : {start:a,end:b};
}

function isoDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

function startOfWeek(d){
  const x=new Date(d);
  const monday=(x.getDay()+6)%7;
  x.setDate(x.getDate()-monday);
  x.setHours(0,0,0,0);
  return x;
}

function sameDay(a,b){ return a.toDateString()===b.toDateString(); }

function fmtDate(s){
  if(!s) return "No date";
  return new Date(`${s}T12:00:00`).toLocaleDateString("en-SG",{day:"numeric",month:"short",year:"numeric"});
}

function moduleName(code){ return state.modules.find(m=>m.code===code)?.name || code || "No module"; }

function mapLocationLink(location, prefix="⌖ "){
  const label=String(location||"").trim();
  if(!label || /^(TBC|N\/A|DEADLINE)$/i.test(label)) return esc(label||"Venue TBC");
  return `<a class="map-location-link" href="/map.html?location=${encodeURIComponent(label)}" title="Open ${esc(label)} on NUS Map">${esc(prefix)}${esc(label)}</a>`;
}

function pageShell(page, title, icon){
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">N</div>
        <div><strong>NUS Companion</strong><span>Student dashboard</span></div>
        <button class="sidebar-close" id="sidebarClose" type="button" aria-label="Close sidebar">×</button>
      </div>
      <nav>
        <a class="nav-item ${page==="home"?"active":""}" href="/index.html">⌂ <span>Home</span></a>
        <a class="nav-item ${page==="calendar"?"active":""}" href="/calendar.html">◫ <span>Calendar</span></a>
        <a class="nav-item ${page==="modules"?"active":""}" href="/modules.html">▣ <span>Modules</span></a>
        <a class="nav-item ${page==="activities"?"active":""}" href="/activities.html">◎ <span>Activities</span></a>
        <a class="nav-item ${page==="friends"?"active":""}" href="/friends.html">♙ <span>Friends</span></a>
        <a class="nav-item ${page==="tasks"?"active":""}" href="/tasks.html">✓ <span>Tasks</span></a>
        <a class="nav-item ${page==="map"?"active":""}" href="/map.html">⌖ <span>Map</span></a>
        <a class="nav-item ${page==="bus"?"active":""}" href="/bus.html">🚌 <span>Bus Timings</span></a>
      </nav>
      <div class="sidebar-bottom">
        <button class="ghost-btn" id="themeBtn">☀ <span>Light mode</span></button>
        <button class="ghost-btn" id="installBtn" hidden>＋ <span>Install app</span></button>
      </div>
    </aside>
    <button class="sidebar-open" id="sidebarOpen" type="button" aria-label="Open sidebar">☰</button>
    <main class="main">
      <header class="topbar">
        <button class="mobile-menu" id="menuBtn">☰</button>
        <div><p class="eyebrow">${new Date().toLocaleDateString("en-SG",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p><h1>${esc(title)}</h1></div>
        <div class="top-actions"><button class="icon-btn" id="notifyBtn" title="Enable notifications">🔔</button><button class="avatar" id="accountBtn" title="Firebase account">A</button></div>
      </header>
      <section class="view">${icon}</section>
    </main>
  `;
}


function setupSidebarControls(){
  const body=document.body;
  const sidebar=$(".sidebar");
  const closeBtn=$("#sidebarClose");
  const openBtn=$("#sidebarOpen");
  const menuBtn=$("#menuBtn");
  if(!sidebar)return;

  const key="nus_sidebar_collapsed";
  const apply=()=>{
    const collapsed=localStorage.getItem(key)==="1";
    body.classList.toggle("sidebar-collapsed",collapsed);
    if(openBtn) openBtn.hidden=!collapsed;
    if(closeBtn) closeBtn.hidden=collapsed;
  };
  const setMobileOpen=(open)=>{
    sidebar.classList.toggle("open",open);
    if(menuBtn){
      menuBtn.textContent=open?"×":"☰";
      menuBtn.setAttribute("aria-expanded",String(open));
      // The topbar button must disappear while the drawer is open, otherwise
      // it becomes a second close button behind the drawer on mobile.
      menuBtn.classList.remove("sidebar-menu-hidden");
    }
  };
  closeBtn?.addEventListener("click",()=>{
    setMobileOpen(false);
    localStorage.setItem(key,"0");
    apply();
  });
  openBtn?.addEventListener("click",()=>{
    localStorage.setItem(key,"0");
    apply();
    setMobileOpen(true);
  });
  menuBtn?.addEventListener("click",()=>{
    localStorage.setItem(key,"0");
    setMobileOpen(!sidebar.classList.contains("open"));
    apply();
  });
  apply();
}

async function requireAuthentication(){
  if(document.body.dataset.page==="login") return true;

  try{
    const api=await window.nusFirebaseReady;
    if(!api || !api.configured){
      location.replace("/login.html");
      return false;
    }

    // Critical: don't redirect until Firebase has finished restoring the
    // persisted Google/email session from IndexedDB/local storage.
    const user=await window.nusAuthReady;
    if(!user){
      location.replace("/login.html");
      return false;
    }

    return true;
  }catch(e){
    console.error("Authentication guard failed",e);
    location.replace("/login.html");
    return false;
  }
}


const NOTIFICATION_KEY="nus_notification_log_v59";
const NOTIFICATION_WINDOW_MS=60*1000;
const DELETED_TASKS_KEY="nus_deleted_task_ids_v63";
const DELETED_ACTIVITIES_KEY="nus_deleted_activity_ids_v63";

function deletedIds(key){
  try{return new Set(JSON.parse(localStorage.getItem(key)||"[]"));}catch{return new Set();}
}
function saveDeletedIds(key,set){localStorage.setItem(key,JSON.stringify([...set]));}
function markDeletedId(key,id){
  if(!id)return;
  const set=deletedIds(key); set.add(String(id)); saveDeletedIds(key,set);
}
function clearDeletedId(key,id){
  if(!id)return;
  const set=deletedIds(key); set.delete(String(id)); saveDeletedIds(key,set);
}

function notificationLog(){
  try{return JSON.parse(localStorage.getItem(NOTIFICATION_KEY)||"{}");}catch{return {};}
}
function saveNotificationLog(log){localStorage.setItem(NOTIFICATION_KEY,JSON.stringify(log));}

function notificationTime(date){return new Date(date).getTime();}

function buildNotificationItems(){
  const now=new Date(), items=[];
  const add=(id,title,body,when,kind="Reminder",href="/tasks.html",deadline="")=>{
    const t=notificationTime(when);
    if(!Number.isFinite(t))return;
    items.push({id,title,body,when:t,kind,href,deadline});
  };

  for(const task of (state.tasks||[])){
    if(task.done)continue;
    if(!task.dueDate)continue;
    const due=new Date(`${task.dueDate}T${task.dueTime||"23:59"}:00`);
    if(Number.isNaN(due.getTime()))continue;
    add(`${task.id}-7d`,task.title,`${task.module||"Task"} · due ${fmtDate(task.dueDate)}`,new Date(due.getTime()-7*86400000),"Task · 7 days",`/tasks.html`,fmtDate(task.dueDate));
    add(`${task.id}-1d`,task.title,`${task.module||"Task"} · due tomorrow`,new Date(due.getTime()-86400000),"Task · 1 day",`/tasks.html`,fmtDate(task.dueDate));
    if(due<=now)add(`${task.id}-overdue`,task.title,`${task.module||"Task"} · overdue`,due,"Task · overdue",`/tasks.html`,fmtDate(task.dueDate));
  }

  // One-day reminders for activities. For recurring activities, use the next
  // occurrence rather than generating reminders for every historical date.
  for(const a of (state.activities||[])){
    let d=null;
    if(a.recurring && a.day){
      const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const target=names.indexOf(a.day);
      if(target>=0){
        d=new Date(now); d.setHours(0,0,0,0);
        let delta=(target-d.getDay()+7)%7;
        if(delta===0 && now.getHours()>=12)delta=7;
        d.setDate(d.getDate()+delta);
      }
    }else if(a.date){
      d=new Date(`${a.date}T${a.startTime||"09:00"}:00`);
    }
    if(!d||Number.isNaN(d.getTime()))continue;
    if(a.recurring)d.setHours(...(a.startTime||"09:00").split(":").map(Number),0,0);
    const activityDateLabel=a.recurring ? `${a.day} (next occurrence)` : fmtDate(a.date);
    add(`${a.id}-1d-${a.recurring?isoDate(d):a.date}`,a.name,`${a.club||"Activity"} · tomorrow`,new Date(d.getTime()-86400000),"Activity · 1 day",`/activities.html`,activityDateLabel);
  }

  return items.sort((a,b)=>a.when-b.when);
}

function cleanupNotificationLog(){
  const validIds=new Set(buildNotificationItems().map(x=>x.id));
  const log=notificationLog();
  let changed=false;
  for(const id of Object.keys(log)){
    if(!validIds.has(id)){
      delete log[id];
      changed=true;
    }
  }
  if(changed)saveNotificationLog(log);
}

function cleanupNotificationLog(){
  const validIds=new Set(buildNotificationItems().map(x=>x.id));
  const log=notificationLog();
  let changed=false;
  for(const id of Object.keys(log)){
    if(!validIds.has(id)){delete log[id]; changed=true;}
  }
  if(changed)saveNotificationLog(log);
}

function notificationScheduleCheck(){
  // Background Web Push is the single source of truth for reminder delivery.
  // Intentionally no-op to prevent duplicate foreground notifications.
}

async function showAppNotification(item){
  const payload={title:item.title,body:item.body,href:item.href};
  try{
    if("serviceWorker" in navigator){
      const reg=await navigator.serviceWorker.ready;
      if(reg?.showNotification){
        await reg.showNotification(item.kind==="Task · overdue"?"⚠ Overdue task":`🔔 ${item.kind}`,{
          body:payload.body,
          tag:`nus-${item.id}`,
          icon:"/assets/icon.svg",
          badge:"/assets/icon.svg",
          data:{href:payload.href}
        });
        return;
      }
    }
    if("Notification" in window && Notification.permission==="granted"){
      const n=new Notification(payload.title,{body:payload.body,icon:"/assets/icon.svg",tag:`nus-${item.id}`});
      n.onclick=()=>location.href=payload.href;
    }
  }catch(e){console.warn("Notification failed",e);}
}

function formatNotificationCountdown(ms){
  if(ms<=0)return "now";
  const mins=Math.max(1,Math.round(ms/60000));
  if(mins<60)return `${mins} min`;
  const hours=Math.round(mins/60);
  if(hours<24)return `${hours} hr`;
  return `${Math.round(hours/24)} day`;
}

async function enableWebPushNotifications(){
  if(!window.nusFirebase?.configured || !window.nusFirebase?.user){
    toast("Please sign in before enabling push notifications.");
    return false;
  }
  if(!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)){
    toast("Web Push is not supported in this browser.");
    return false;
  }
  if(!window.NUS_PUSH_CONFIG?.vapidPublicKey || window.NUS_PUSH_CONFIG.vapidPublicKey.includes("YOUR_")){
    toast("Web Push is not configured yet. Add the VAPID public key to push-config.js.");
    return false;
  }

  const permission=await Notification.requestPermission();
  if(permission!=="granted"){
    toast("Notification permission was not granted.");
    return false;
  }

  try{
    const registration=await navigator.serviceWorker.ready;
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription){
      const padding="=".repeat((4-window.NUS_PUSH_CONFIG.vapidPublicKey.length%4)%4);
      const base64=(window.NUS_PUSH_CONFIG.vapidPublicKey+padding).replace(/-/g,"+").replace(/_/g,"/");
      const raw=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
      subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:raw});
    }
    await window.nusFirebase.savePushSubscription(subscription.toJSON());
    toast("Background push notifications enabled.");
    return true;
  }catch(err){
    console.error("Web Push subscription failed",err);
    toast(`Push setup failed: ${err.message||err}`);
    return false;
  }
}

function notificationStatus(){
  return "Notification" in window ? Notification.permission : "unsupported";
}

function openNotificationCenter(){
  const items=buildNotificationItems();
  const now=Date.now();

  // The notification centre should show notifications that are due now,
  // not future reminders. For example, an activity on 20 Aug should not
  // appear in the centre on 15 Aug just because its 1-day reminder is
  // scheduled for 19 Aug.
  // Show reminders that are due already OR scheduled within the next 24
  // hours. This lets a task due tomorrow appear in the centre without
  // prematurely showing activities several days away.
  const next24h=24*60*60*1000;

  // Show only the latest relevant reminder stage for each item.
  // A missed 7-day reminder must not appear once the task is already inside
  // its 1-day reminder window.
  const grouped=new Map();
  for(const item of items){
    const key=item.id.replace(/-(7d|1d|overdue)(-.+)?$/,"");
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(item);
  }

  const due=[];
  for(const candidates of grouped.values()){
    const valid=candidates
      .filter(x=>x.when<=now || x.when-now<=next24h)
      .sort((a,b)=>b.when-a.when);

    if(valid.length)due.push(valid[0]);
  }

  due.sort((a,b)=>a.when-b.when);
  openModal(`
    <h2>🔔 Notifications</h2>
    <p class="subtle">Notifications appear here when they are due. Task reminders are sent 7 days and 1 day before the deadline, and activities are reminded 1 day before. The centre shows the actual deadline/date, not a countdown to the reminder.</p>
    <div class="list">
      ${due.map(x=>{
        const dateText=x.deadline ? ` · Deadline: ${esc(x.deadline)}` : "";
        return `<div class="item"><div class="item-title">${esc(x.kind==="Task · overdue"?"⚠ ":"")}${esc(x.title)}</div><div class="item-sub">${esc(x.kind)}${dateText}</div></div>`;
      }).join("")}
      ${!due.length?`<div class="empty">No notifications right now.</div>`:""}
    </div>
    <div class="modal-footer">
      <button class="secondary" id="enableNotificationsBtn">${notificationStatus()==="granted"?"Enable background notifications":"Enable notifications"}</button>
      <button class="secondary" id="clearNotificationLogBtn">Reset reminder history</button>
      <button class="secondary" id="closeNotificationCenter">Close</button>
    </div>
  `);
  $("#closeNotificationCenter")?.addEventListener("click",closeModal);
  $("#enableNotificationsBtn")?.addEventListener("click",async()=>{
    await enableWebPushNotifications();
    closeModal();
  });
  $("#clearNotificationLogBtn")?.addEventListener("click",()=>{
    localStorage.removeItem(NOTIFICATION_KEY);
    toast("Reminder history reset.");
    closeModal();
  });
}

async function initCommon(){
  const authenticated=await requireAuthentication();
  if(!authenticated) return;

  setupSidebarControls();
  const savedTheme=localStorage.getItem("nus_theme");
  if(savedTheme==="light") document.body.classList.add("light");

  $("#themeBtn")?.addEventListener("click",()=>{
    document.body.classList.toggle("light");
    const light=document.body.classList.contains("light");
    localStorage.setItem("nus_theme", light?"light":"dark");
    $("#themeBtn").innerHTML=light?"☾ <span>Dark mode</span>":"☀ <span>Light mode</span>";
  });
  if(document.body.classList.contains("light")) $("#themeBtn").innerHTML="☾ <span>Dark mode</span>";


  $("#notifyBtn")?.addEventListener("click",async()=>{
    openNotificationCenter();
  });

  // Reminder delivery is handled exclusively by the server-side Web Push
  // scheduler. Do not run the old foreground/local notification scheduler,
  // otherwise one reminder can produce two notifications.

  initModal();
  setupInstall();
  setupFirebaseAccount();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", {updateViaCache:"none"}).then(r=>r.update()).catch(()=>{});
}

async function setupFirebaseAccount(){
  const btn=$("#accountBtn");
  if(!btn) return;

  const update=()=>{
    const user=window.nusFirebase?.user;
    if(user){
      btn.textContent=(user.displayName||user.email||"A").trim().charAt(0).toUpperCase();
      btn.title=`Signed in as ${user.email||user.displayName||"Google account"}. Click to manage sync.`;
      btn.classList.add("signed-in");
    }else{
      btn.textContent="A";
      btn.title=window.nusFirebase?.configured ? "Sign in with Google" : "Firebase is not configured";
      btn.classList.remove("signed-in");
    }
  };

  const readableFirebaseError = error => {
    const code=error?.code||"";
    const map={
      "auth/unauthorized-domain":"This Firebase domain is not authorised. Add your Firebase Hosting domain under Firebase Console → Authentication → Settings → Authorised domains.",
      "auth/operation-not-allowed":"Google sign-in is not enabled. Enable Google under Firebase Console → Authentication → Sign-in method.",
      "auth/popup-blocked":"The browser blocked the Google sign-in popup. Please allow popups or try again.",
      "auth/popup-closed-by-user":"Google sign-in was cancelled.",
      "auth/invalid-api-key":"The Firebase Web App API key is invalid.",
      "auth/network-request-failed":"Firebase could not connect to the network.",
    };
    return map[code] || error?.message || "Firebase sign-in failed.";
  };

  window.addEventListener("nus-auth-changed",update);

  window.addEventListener("nus-firebase-error",e=>{
    const msg=readableFirebaseError(e.detail);
    if(e.detail?.code!=="auth/popup-closed-by-user") toast(msg);
  });

  const applyCloudState=async remote=>{
    if(!remote){
      if(window.nusFirebase?.user){
        try{
          // A brand-new account must start from clean defaults, never from
          // another account's previous browser state.
          await window.nusFirebase.saveState(state);
        }catch(err){
          console.error(err);
          toast("Signed in, but Firestore could not initialize your account.");
        }
      }
      return;
    }

    const remoteChangedAt=Number(remote.clientUpdatedAt||0);
    // A local edit that has not yet reached Firestore must not be overwritten
    // by an older realtime snapshot. Firestore remains the source of truth
    // once the local write has completed.
    if(remoteChangedAt && remoteChangedAt < lastLocalCloudChangeAt) return;
    if(remoteChangedAt && remoteChangedAt === lastRemoteCloudChangeAt) return;

    lastRemoteCloudChangeAt=remoteChangedAt || Date.now();
    if(Array.isArray(remote.modules)) state.modules=remote.modules;
    if(Array.isArray(remote.lessons)) state.lessons=remote.lessons;
    if(Array.isArray(remote.activities)){
      const deleted=deletedIds(DELETED_ACTIVITIES_KEY);
      state.activities=remote.activities.filter(a=>!deleted.has(String(a.id)));
    }
    if(Array.isArray(remote.tasks)){
      const deleted=deletedIds(DELETED_TASKS_KEY);
      state.tasks=remote.tasks.filter(t=>!deleted.has(String(t.id)));
    }
    if(remote.semester) state.semester=remote.semester;

    localStorage.setItem("nus_modules",JSON.stringify(state.modules));
    localStorage.setItem("nus_lessons",JSON.stringify(state.lessons));
    localStorage.setItem("nus_activities",JSON.stringify(state.activities));
    localStorage.setItem("nus_tasks",JSON.stringify(state.tasks));
    localStorage.setItem("nus_semester",JSON.stringify(state.semester));

    // Re-render any current page after a change from another device/tab.
    window.dispatchEvent(new CustomEvent("nus-cloud-state-applied"));
  };

  window.addEventListener("nus-cloud-state",e=>applyCloudState(e.detail));

  const startRealtimeSync=()=>{
    if(cloudSyncStop) cloudSyncStop();
    cloudSyncStop=window.nusFirebase?.startStateSync?.(
      remote=>{
        cloudSyncActive=true;
        applyCloudState(remote);
      },
      err=>{
        cloudSyncActive=false;
        console.error("Realtime cloud sync failed",err);
        toast("Realtime sync is temporarily unavailable. Your local changes are still saved.");
      }
    ) || null;
    if(cloudSyncStop) cloudSyncActive=true;
  };

  const ACCOUNT_LOCAL_KEYS = [
    "nus_modules","nus_lessons","nus_activities","nus_tasks","nus_semester",
    "nus_manual_friends","nus_my_friend_code","nus_notification_log",
    "nus_deleted_tasks","nus_deleted_activities"
  ];

  function purgeAccountLocalStorage(){
    for(const key of ACCOUNT_LOCAL_KEYS) localStorage.removeItem(key);
    const prefixes=["nus_manual_friends_","nus_my_friend_code_"];
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i)||"";
      if(prefixes.some(prefix=>key.startsWith(prefix))) localStorage.removeItem(key);
    }
  }

  function resetLocalStateForAccount(){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer=null;
    lastLocalCloudChangeAt=0;
    lastRemoteCloudChangeAt=0;
    purgeAccountLocalStorage();

    state.modules=clone(DEFAULT_MODULES);
    state.lessons=[];
    state.activities=clone(defaultActivities);
    state.tasks=clone(defaultTasks);
    state.semester={academicYear:ACADEMIC_YEAR,semester:SEMESTER};

    localStorage.setItem("nus_modules",JSON.stringify(state.modules));
    localStorage.setItem("nus_lessons",JSON.stringify(state.lessons));
    localStorage.setItem("nus_activities",JSON.stringify(state.activities));
    localStorage.setItem("nus_tasks",JSON.stringify(state.tasks));
    localStorage.setItem("nus_semester",JSON.stringify(state.semester));
    window.dispatchEvent(new CustomEvent("nus-data-changed"));
  }

  let lastHandledAuthUid = "__uninitialized__";
  function handleAccountBoundary(user){
    const uid=user?.uid||null;
    if(uid===lastHandledAuthUid) return;
    lastHandledAuthUid=uid;
    resetLocalStateForAccount();
  }

  window.addEventListener("nus-auth-changed",e=>{
    handleAccountBoundary(e.detail||null);
    if(e.detail) startRealtimeSync();
    else if(cloudSyncStop){
      cloudSyncStop();
      cloudSyncStop=null;
      cloudSyncActive=false;
    }
  });

  window.addEventListener("nus-cloud-state-applied",()=>{
    // Pages listen for this event to redraw without requiring Sync Now.
    window.dispatchEvent(new CustomEvent("nus-data-changed"));
  });

  // Firebase can restore a user before this listener is installed.
  // Handle that already-authenticated state explicitly.
  if(window.nusFirebase?.user){
    handleAccountBoundary(window.nusFirebase.user);
    startRealtimeSync();
  }else{
    handleAccountBoundary(null);
  }

  btn.addEventListener("click",async()=>{
    const api=window.nusFirebase;

    if(!api?.configured){
      openModal(`
        <h2>Firebase is not configured</h2>
        <p class="subtle">Deploy this project with Firebase Hosting, or add your Firebase Web App configuration to <b>firebase-config.js</b>.</p>
      `);
      return;
    }

    if(api.user){
      openModal(`
        <h2>Cloud sync</h2>
        <p class="subtle">Signed in as <b>${esc(api.user.email||api.user.displayName||"Google account")}</b>.</p>
        <div class="list">
          <button class="primary full-btn" id="syncNowBtn">Sync now</button>
          <button class="secondary full-btn" id="signOutBtn">Sign out</button>
        </div>
      `);

      $("#syncNowBtn")?.addEventListener("click",async()=>{
        try{
          await api.saveState(state);
          toast("Synced successfully.");
          closeModal();
        }catch(err){
          console.error(err);
          toast(`Sync failed: ${readableFirebaseError(err)}`);
        }
      });

      $("#signOutBtn")?.addEventListener("click",async()=>{
        try{
          await api.signOut();
          handleAccountBoundary(null);
          closeModal();
          update();
          toast("Signed out.");
        }
        catch(err){ console.error(err); toast(readableFirebaseError(err)); }
      });
      return;
    }

    location.replace("/login.html");
  });

  update();

  if(window.nusFirebaseReady){
    try{ await window.nusFirebaseReady; update(); }
    catch(err){ console.error(err); }
  }
}

function toast(msg){
  const x=document.createElement("div");
  x.className="toast"; x.textContent=msg; document.body.appendChild(x);
  setTimeout(()=>x.remove(),2600);
}

function openModal(html){
  const b=$("#modalBackdrop"); if(!b) return;
  $("#modalContent").innerHTML=html;
  b.hidden=false; b.classList.remove("is-hidden");
}
function closeModal(){
  const b=$("#modalBackdrop"); if(!b) return;
  b.hidden=true; b.classList.add("is-hidden");
}
function initModal(){
  $("#modalClose")?.addEventListener("click",closeModal);
  $("#modalBackdrop")?.addEventListener("click",e=>{if(e.target.id==="modalBackdrop") closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape") closeModal();});
}

let deferredPrompt=null;
function setupInstall(){
  const btn=$("#installBtn");
  const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const standalone=matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
  if(!standalone && btn) btn.hidden=false;

  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault(); deferredPrompt=e; if(btn) btn.hidden=false;
  });
  btn?.addEventListener("click",async()=>{
    if(deferredPrompt){
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt=null;
      btn.hidden=true;
      return;
    }
    if(ios){
      openModal(`<h2>Install NUS Companion</h2><p class="subtle">On iPhone/iPad in Brave, use the Share menu and choose <b>Add to Home Screen</b>.</p>`);
    } else toast("Use your browser's install option to add the PWA.");
  });
}

function activityOccursOnDate(a,date){
  if(a.recurring) return date.toLocaleDateString("en-SG",{weekday:"long"})===a.day;
  return a.date===isoDate(date);
}

function activityRange(a){
  return {start:timeToMinutes(a.startTime),end:timeToMinutes(a.endTime)};
}

function taskDateTime(t){
  return new Date(`${t.dueDate}T${t.dueTime || "23:59"}:00`);
}

/* NUSMods */
let nusModuleListCache=null;
async function fetchNUSModsList(){
  if(nusModuleListCache) return nusModuleListCache;
  const r=await fetch(`${NUSMODS_BASE}/moduleList.json`);
  if(!r.ok) throw new Error(`NUSMods module list failed (${r.status})`);
  nusModuleListCache=await r.json();
  return nusModuleListCache;
}

async function fetchNUSModsModule(code){
  const moduleUrl=`${NUSMODS_BASE}/modules/${encodeURIComponent(code)}.json`;
  const timetableUrl=`${NUSMODS_BASE}/semesters/${SEMESTER}/${encodeURIComponent(code)}/timetable.json`;
  const errors=[];
  let moduleData=null;

  // First fetch the module information. This contains the title and, when
  // available, the timetable used by NUSMods.
  try{
    const r=await fetch(moduleUrl);
    if(r.ok){
      moduleData=await r.json();
      if(Array.isArray(moduleData.timetable)) return moduleData;
    }else{
      errors.push(`module endpoint returned ${r.status}`);
    }
  }catch(e){
    errors.push("module endpoint could not be reached");
  }

  // Some modules exist in the catalogue but have semester-specific timetable
  // data only. Try the semester endpoint as a fallback.
  try{
    const r=await fetch(timetableUrl);
    if(r.ok){
      const timetable=await r.json();
      return {
        ...(moduleData||{}),
        moduleCode:moduleData?.moduleCode||code,
        title:moduleData?.title||moduleName(code),
        timetable:Array.isArray(timetable)?timetable:(timetable?.timetable||[])
      };
    }
    errors.push(`semester timetable returned ${r.status}`);
  }catch(e){
    errors.push("semester timetable endpoint could not be reached");
  }

  if(moduleData){
    return {
      ...moduleData,
      moduleCode:moduleData.moduleCode||code,
      title:moduleData.title||moduleName(code),
      timetable:Array.isArray(moduleData.timetable)?moduleData.timetable:[]
    };
  }

  throw new Error(`${code} could not be loaded from NUSMods (${errors.join("; ")}).`);
}

function normaliseLessonData(data, code){
  const raw=Array.isArray(data.timetable)?data.timetable:[];
  const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const normaliseTime=(value)=>{
    if(value==null||value==="")return "";
    const n=timeToMinutes(value);
    if(n==null)return String(value);
    return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
  };

  const normaliseDay=value=>{
    if(value==null||value==="")return "";
    const text=String(value).trim();
    const found=days.find(d=>d.toLowerCase()===text.toLowerCase());
    return found||text;
  };

  const timetable=raw.map((x,i)=>{
    if(!x||typeof x!=="object")return null;

    // NUSMods has used slightly different field names across API versions.
    // Preserve all original fields, then expose one consistent format to the
    // rest of the app.
    const timeRange=x.time||x.timeRange||x.timing||"";
    let rangeStart="",rangeEnd="";
    if(timeRange){
      const parsed=parseTimeRange(timeRange);
      if(parsed){
        rangeStart=normaliseTime(parsed.start);
        rangeEnd=normaliseTime(parsed.end);
      }
    }

    const start=normaliseTime(
      x.startTime ?? x.start ?? x.start_time ?? x.starttime ?? rangeStart
    );
    const end=normaliseTime(
      x.endTime ?? x.end ?? x.end_time ?? x.endtime ?? rangeEnd
    );

    return {
      ...x,
      id:x.id||`${code}-lesson-${i}`,
      module:code,
      lessonType:x.lessonType||x.lessonTypeName||x.type||x.lesson_type||"Class",
      classNo:String(x.classNo??x.ClassNo??x.class??x.classNumber??x.group??"TBC"),
      day:normaliseDay(x.day||x.dayText||x.weekday||x.weekDay||""),
      startTime:start,
      endTime:end,
      venue:x.venue||x.location||x.room||x.venueCode||""
    };
  }).filter(x=>x && x.day && x.startTime && x.endTime);

  return {
    moduleCode:data.moduleCode||code,
    title:data.title||moduleName(code),
    timetable
  };
}

function lessonGroups(data){
  const groups=new Map();
  for(const l of data.timetable){
    const type=l.lessonType||"Class";
    const no=String(l.classNo??l.ClassNo??"").trim() || "TBC";
    const key=`${type}::${no}`;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(l);
  }
  return [...groups.entries()];
}

function lessonGroupLabel(type,no){
  const pretty=String(type||"Class").trim() || "Class";
  return `${pretty} · Group ${no}`;
}

function migrateOldData(){
  let changed=false;
  state.modules=(state.modules||[]).map(m=>({code:m.code,name:m.name||m.code}));
  state.activities=(state.activities||[]).map(a=>{
    if(a.recurring===undefined){
      const range=parseTimeRange(a.time);
      changed=true;
      return {id:a.id||crypto.randomUUID?.()||String(Date.now()+Math.random()),name:a.name||"Activity",club:a.club||"",module:a.module||"",recurring:true,day:a.day||"Monday",date:"",startTime:range?`${String(Math.floor(range.start/60)).padStart(2,"0")}:${String(range.start%60).padStart(2,"0")}`:"19:00",endTime:range?`${String(Math.floor(range.end/60)).padStart(2,"0")}:${String(range.end%60).padStart(2,"0")}`:"20:00",venue:a.venue||""};
    }
    return a;
  });
  state.tasks=(state.tasks||[]).map(t=>{
    if(!t.dueDate){
      changed=true;
      return {...t,dueDate:t.due||isoDate(new Date()),dueTime:t.dueTime||"23:59"};
    }
    return t;
  });
  if(changed) save();
}

migrateOldData();

function migrateLessonTimings(){
  let changed=false;
  state.lessons=(state.lessons||[]).map((l,i)=>{
    if(!l||typeof l!=="object")return l;
    const next={...l};
    if(!next.startTime) {
      const v=next.start??next.start_time??next.starttime;
      if(v!=null){ const m=timeToMinutes(v); if(m!=null){next.startTime=`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;changed=true;} }
    }
    if(!next.endTime) {
      const v=next.end??next.end_time??next.endtime;
      if(v!=null){ const m=timeToMinutes(v); if(m!=null){next.endTime=`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;changed=true;} }
    }
    return next;
  });
  if(changed)save();
}

migrateLessonTimings();

// Build the shared shell before page-specific scripts render their content.
// Each HTML page only needs <div class="app-shell"></div>.
document.addEventListener("DOMContentLoaded", () => {
  const shell = document.querySelector(".app-shell");
  if (!shell || shell.querySelector(".sidebar")) return;

  const page = document.body.dataset.page || "home";
  const titles = {
    home: "Good evening, Austin.",
    calendar: "Calendar",
    modules: "Your modules",
    activities: "Clubs & activities",
    tasks: "Tasks & deadlines",
    map: "NUS Map",
    bus: "Bus Timings"
  };

  shell.innerHTML = pageShell(page, titles[page] || "NUS Companion", "");
});
