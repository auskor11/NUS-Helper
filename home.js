
document.addEventListener("DOMContentLoaded",async()=>{
  // V91: Firebase is now the source of truth, so do not render the dashboard
  // until the current user's Firestore state has finished loading.
  try{
    await initCommon();
  }catch(err){
    console.error("Home initialisation failed:",err);
  }

  renderHome();

  let overdueShown=false;
  const checkOverdue=()=>{
    if(overdueShown)return;
    const current=[...state.tasks]
      .filter(t=>!t.done&&taskDateTime(t)<new Date())
      .sort((a,b)=>taskDateTime(a)-taskDateTime(b));
    if(!current.length)return;
    overdueShown=true;
    setTimeout(()=>showOverduePopup(current),250);
  };

  checkOverdue();

  window.addEventListener("nus-data-changed",()=>{
    renderHome();
    checkOverdue();
  });

  // Recalculate time-sensitive dashboard information without reloading the app.
  // This lets "Next Class" move forward automatically as time passes.
  setInterval(()=>{
    renderHome();
    checkOverdue();
  },30000);
});

function renderHome(){
  const next=nextClass();
  const upcoming=[...state.tasks].filter(t=>!t.done).sort((a,b)=>taskDateTime(a)-taskDateTime(b)).slice(0,4);
  const acts=[...state.activities].filter(a=>activityOccursOnDate(a,new Date())).slice(0,4);

  const view=document.querySelector(".view");
  if(!view)return;

  view.innerHTML=`
    <div class="hero">
      <div class="hero-card">
        <div class="kicker">NEXT CLASS</div>
        ${next?`
          <div class="next-code">${esc(next.module)}</div>
          <div class="next-name">${esc(moduleName(next.module))}</div>
          <div class="meta-row"><span>◷ ${minutesLabel(timeToMinutes(next.startTime))} – ${minutesLabel(timeToMinutes(next.endTime))}</span><span>${mapLocationLink(next.venue)}</span></div>
        `:`<div class="next-code">No classes yet</div><div class="next-name">Import your timetable from NUSMods.</div>`}
      </div>
      <div class="hero-card hero-side"><div><div class="kicker">TODAY</div><div class="big-time">${new Date().toLocaleTimeString("en-SG",{hour:"numeric",minute:"2-digit"})}</div></div><div class="countdown">AY ${esc(state.semester.academicYear)} · Semester ${esc(state.semester.semester)}</div></div>
    </div>
    <div class="grid">
      <div class="card"><div class="section-head"><h2>Upcoming tasks</h2><a class="primary link-btn" href="/tasks.html">＋ Add</a></div><div class="list">${upcoming.length?upcoming.map(taskHTML).join(""):`<div class="empty">Nothing due. Nice.</div>`}</div></div>
      <div class="card"><div class="section-head"><h2>Today & activities</h2><a class="primary link-btn" href="/activities.html">View all</a></div><div class="list">${acts.length?acts.map(a=>`<div class="item"><div class="item-title">◎ ${esc(a.name)}</div><div class="item-sub">${esc(a.recurring?a.day:fmtDate(a.date))} · ${inputTimeToLabel(a.startTime)} – ${inputTimeToLabel(a.endTime)} · ${mapLocationLink(a.venue)}</div></div>`).join(""):`<div class="empty">No activities today.</div>`}</div></div>
    </div>
  `;
  initModal();
}


function showOverduePopup(tasks){
  openModal(`<h2>⚠ Overdue tasks</h2>
    <p class="subtle">You have ${tasks.length} overdue task${tasks.length===1?"":"s"}.</p>
    <div class="list">${tasks.map(t=>`
      <div class="item">
        <div class="item-title">${esc(t.title)}</div>
        <div class="item-sub">${esc(t.module||"No module")} · Due ${fmtDate(t.dueDate)}${t.dueTime?` at ${inputTimeToLabel(t.dueTime)}`:""}</div>
      </div>`).join("")}</div>
    <div class="modal-footer"><a class="primary link-btn" href="/tasks.html">View tasks</a><button class="secondary" id="closeOverdue">Dismiss</button></div>`);
  $("#closeOverdue")?.addEventListener("click",closeModal);
}

function nextClass(){
  const now=new Date();
  const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const today=days[(now.getDay()+6)%7];
  const nowMin=now.getHours()*60+now.getMinutes();
  const todayLessons=state.lessons.filter(l=>l.day===today).sort((a,b)=>timeToMinutes(a.startTime)-timeToMinutes(b.startTime));
  const later=todayLessons.find(l=>timeToMinutes(l.startTime)>nowMin);
  if(later) return later;
  for(let i=1;i<=7;i++){
    const d=days[(days.indexOf(today)+i)%7];
    const x=state.lessons.filter(l=>l.day===d).sort((a,b)=>timeToMinutes(a.startTime)-timeToMinutes(b.startTime))[0];
    if(x) return x;
  }
  return null;
}
function taskHTML(t){
  const overdue=!t.done && taskDateTime(t)<new Date();
  return `<div class="item"><div class="item-row"><div><div class="item-title">${esc(t.title)}</div><div class="item-sub">${esc(t.module||"No module")} · Due ${fmtDate(t.dueDate)} at ${inputTimeToLabel(t.dueTime)}</div></div><span class="pill ${overdue?"warn":""}">${overdue?"Overdue":"Upcoming"}</span></div></div>`;
}


function showOverduePopup(tasks){
  openModal(`<h2>⚠ Overdue tasks</h2>
    <p class="subtle">You have ${tasks.length} overdue task${tasks.length===1?"":"s"}.</p>
    <div class="list">${tasks.map(t=>`
      <div class="item">
        <div class="item-title">${esc(t.title)}</div>
        <div class="item-sub">${esc(t.module||"No module")} · Due ${fmtDate(t.dueDate)}${t.dueTime?` at ${inputTimeToLabel(t.dueTime)}`:""}</div>
      </div>`).join("")}</div>
    <div class="modal-footer"><a class="primary link-btn" href="/tasks.html">View tasks</a><button class="secondary" id="closeOverdue">Dismiss</button></div>`);
  $("#closeOverdue")?.addEventListener("click",closeModal);
}

function nextClass(){
  const now=new Date();
  const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const today=days[(now.getDay()+6)%7];
  const nowMin=now.getHours()*60+now.getMinutes();
  const todayLessons=state.lessons.filter(l=>l.day===today).sort((a,b)=>timeToMinutes(a.startTime)-timeToMinutes(b.startTime));
  const later=todayLessons.find(l=>timeToMinutes(l.startTime)>nowMin);
  if(later) return later;
  for(let i=1;i<=7;i++){
    const d=days[(days.indexOf(today)+i)%7];
    const x=state.lessons.filter(l=>l.day===d).sort((a,b)=>timeToMinutes(a.startTime)-timeToMinutes(b.startTime))[0];
    if(x) return x;
  }
  return null;
}
function taskHTML(t){
  const overdue=!t.done && taskDateTime(t)<new Date();
  return `<div class="item"><div class="item-row"><div><div class="item-title">${esc(t.title)}</div><div class="item-sub">${esc(t.module||"No module")} · Due ${fmtDate(t.dueDate)} at ${inputTimeToLabel(t.dueTime)}</div></div><span class="pill ${overdue?"warn":""}">${overdue?"Overdue":"Upcoming"}</span></div></div>`;
}
