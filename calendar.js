
document.addEventListener("DOMContentLoaded",()=>{
  let mode=localStorage.getItem("nus_calendar_mode")||"week";
  let weekOffset=0;
  let monthCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);

  function render(){
    document.querySelector(".view").innerHTML=`
      <div class="section-head calendar-head">
        <div><h2>Calendar</h2><div class="subtle">Weekly timetable · Month view for deadlines and events</div></div>
        <div class="segmented"><button class="${mode==="week"?"selected":""}" id="weekBtn">Week</button><button class="${mode==="month"?"selected":""}" id="monthBtn">Month</button></div>
      </div>
      ${mode==="week"?weekView():monthView()}
    `;
    $("#weekBtn")?.addEventListener("click",()=>{mode="week";localStorage.setItem("nus_calendar_mode",mode);render();});
    $("#monthBtn")?.addEventListener("click",()=>{mode="month";localStorage.setItem("nus_calendar_mode",mode);render();});
    initToolbar();
    if(mode==="month") initMonthDayClicks();
  }

  function initToolbar(){
    $("#prevCal")?.addEventListener("click",()=>{if(mode==="week")weekOffset--;else monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()-1,1);render();});
    $("#nextCal")?.addEventListener("click",()=>{if(mode==="week")weekOffset++;else monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()+1,1);render();});
    $("#todayCal")?.addEventListener("click",()=>{if(mode==="week")weekOffset=0;else monthCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);render();});
  }

  function updateCurrentTimeLine(){
    if(mode!=="week") return;
    const now=new Date();
    const startHour=8,endHour=23,rowH=72;
    const start=addDays(startOfWeek(now),weekOffset*7);
    const isVisibleWeek=weekOffset===0;
    const minutes=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
    const visible=minutes>=startHour*60 && minutes<=endHour*60;
    const line=document.querySelector(".current-time-line");
    if(!line) return;
    if(!isVisibleWeek || !visible){
      line.hidden=true;
      return;
    }
    const top=((minutes-startHour*60)/60)*rowH;
    line.hidden=false;
    line.style.top=`${top}px`;
    const label=line.querySelector("span");
    if(label) label.textContent=now.toLocaleTimeString("en-SG",{hour:"2-digit",minute:"2-digit",hour12:false});
  }

  function weekView(){
    const start=addDays(startOfWeek(new Date()),weekOffset*7);
    const days=Array.from({length:7},(_,i)=>addDays(start,i));
    const startHour=8,endHour=23,rowH=72;
    const now=new Date();
    const nowInWeek=days.some(d=>sameDay(d,now));
    const nowMinutes=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
    const nowTop=((nowMinutes-startHour*60)/60)*rowH;
    const nowLabel=now.toLocaleTimeString("en-SG",{hour:"2-digit",minute:"2-digit",hour12:false});
    return `<div class="calendar-toolbar"><button class="secondary" id="prevCal">‹</button><strong>${days[0].toLocaleDateString("en-SG",{day:"numeric",month:"short"})} – ${days[6].toLocaleDateString("en-SG",{day:"numeric",month:"short",year:"numeric"})}</strong><div class="toolbar-right"><button class="secondary" id="todayCal">Today</button><button class="secondary" id="nextCal">›</button></div></div>
    <div class="week-scroll"><div class="week-grid" style="--row-h:${rowH}px;--hours:${endHour-startHour}">
      <div class="week-corner"></div>
      ${days.map(d=>`<div class="week-day-head ${sameDay(d,new Date())?"today-head":""}"><span>${d.toLocaleDateString("en-SG",{weekday:"short"})}</span><b>${d.getDate()}</b></div>`).join("")}
      <div class="week-time-axis" style="height:${(endHour-startHour)*rowH}px">${Array.from({length:endHour-startHour},(_,i)=>`<div style="height:${rowH}px">${String(startHour+i).padStart(2,"0")}:00</div>`).join("")}</div>
      ${days.map((d,i)=>`<div class="week-day-column" data-day="${isoDate(d)}" style="height:${(endHour-startHour)*rowH}px;grid-column:${i+2};grid-row:2"><div class="hour-lines"></div>${itemsForDay(d).map(x=>eventHTML(x,startHour,endHour,rowH)).join("")}${weekOffset===0&&sameDay(d,now)&&nowMinutes>=startHour*60&&nowMinutes<=endHour*60?`<div class="current-time-line" aria-label="Current time" style="top:${nowTop}px"><span>${esc(nowLabel)}</span></div>`:""}</div>`).join("")}
    </div></div>`;
  }

  function itemsForDay(d){
    const day=d.toLocaleDateString("en-SG",{weekday:"long"});
    const lessons=state.lessons.filter(l=>l.day===day).map(l=>({type:"lesson",module:l.module,title:l.module,subtitle:l.lessonType,venue:l.venue,start:timeToMinutes(l.startTime),end:timeToMinutes(l.endTime)}));
    const acts=state.activities.filter(a=>activityOccursOnDate(a,d)).map(a=>{const r=activityRange(a);return {type:"activity",title:a.name,subtitle:a.club,venue:a.venue,start:r.start,end:r.end};});
    const tasks=state.tasks.filter(t=>t.dueDate===isoDate(d)&&!t.done).map(t=>{
      const start=timeToMinutes(t.dueTime||"23:59");
      return {type:"task",title:t.title,subtitle:t.module?`${t.module} · Task`:"Task",venue:"Deadline",start:start==null?1439:start,end:Math.min(1439,(start==null?1439:start)+30)};
    });
    return [...lessons,...acts,...tasks].filter(x=>x.start!=null&&x.end!=null);
  }

  function eventHTML(x,startHour,endHour,rowH){
    const start=Math.max(startHour*60,x.start),end=Math.min(endHour*60,x.end);
    if(end<=start)return "";
    const top=((start-startHour*60)/60)*rowH;
    const height=Math.max(38,((end-start)/60)*rowH);
    return `<div class="tt-event ${x.type==="activity"?"activity-event":x.type==="task"?"task-calendar-event":""}" style="top:${top}px;height:${height}px"><b>${esc(x.title)}</b><span>${esc(x.subtitle||"")}</span><small>${x.venue && x.venue!=="Deadline" ? mapLocationLink(x.venue) : esc(x.venue||"")}</small></div>`;
  }

  function monthView(){
    const y=monthCursor.getFullYear(),m=monthCursor.getMonth(),first=new Date(y,m,1);
    // Month headers are Sunday → Saturday, so the grid must also begin on
    // Sunday. startOfWeek() intentionally returns Monday for the timetable.
    const sundayStart=new Date(first);
    sundayStart.setHours(0,0,0,0);
    sundayStart.setDate(first.getDate()-first.getDay());
    const start=sundayStart,end=addDays(start,41),days=[];
    for(let d=new Date(start);d<=end;d=addDays(d,1))days.push(new Date(d));
    return `<div class="calendar-toolbar"><button class="secondary" id="prevCal">‹</button><strong>${monthCursor.toLocaleDateString("en-SG",{month:"long",year:"numeric"})}</strong><div class="toolbar-right"><button class="secondary" id="todayCal">Today</button><button class="secondary" id="nextCal">›</button></div></div>
    <div class="card"><div class="month-grid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div class="day-head">${x}</div>`).join("")}${days.map(monthDay).join("")}</div></div>`;
  }

  function monthDay(d){
    const inMonth=d.getMonth()===monthCursor.getMonth();
    const tasks=state.tasks.filter(t=>t.dueDate===isoDate(d));
    const acts=state.activities.filter(a=>activityOccursOnDate(a,d));
    const total=tasks.length+acts.length;
    const previewLimit=3;
    const previewTasks=tasks.slice(0,previewLimit);
    const previewActs=acts.slice(0,Math.max(0,previewLimit-previewTasks.length));
    const displayedItems=previewTasks.length+previewActs.length;
    const remaining=Math.max(0,total-displayedItems);
    return `<div class="month-day month-day-clickable ${inMonth?"":"muted"} ${sameDay(d,new Date())?"today":""}" data-calendar-date="${isoDate(d)}" role="button" tabindex="0" aria-label="View ${esc(d.toLocaleDateString("en-SG",{day:"numeric",month:"long",year:"numeric"}))}">
      <div class="day-num">${d.getDate()}</div>
      ${previewTasks.map(t=>`<div class="cal-event task-event">✓ ${esc(t.title)}<small>${inputTimeToLabel(t.dueTime)}</small></div>`).join("")}
      ${previewActs.map(a=>`<div class="cal-event activity-cal">◎ ${esc(a.name)}${a.venue?`<small>${mapLocationLink(a.venue)}</small>`:""}</div>`).join("")}
      ${remaining>0?`<div class="cal-more">+${remaining} more</div>`:""}
    </div>`;
  }

  function initMonthDayClicks(){
    document.querySelectorAll(".month-day-clickable").forEach(cell=>{
      const open=()=>{
        const date=cell.dataset.calendarDate;
        const d=new Date(`${date}T12:00:00`);
        openDayDetails(d);
      };
      cell.addEventListener("click",open);
      cell.addEventListener("keydown",e=>{
        if(e.key==="Enter"||e.key===" "){
          e.preventDefault();
          open();
        }
      });
    });
  }

  function openDayDetails(d){
    const dateLabel=d.toLocaleDateString("en-SG",{
      weekday:"long",day:"numeric",month:"long",year:"numeric"
    });
    const tasks=state.tasks
      .filter(t=>t.dueDate===isoDate(d))
      .sort((a,b)=>String(a.dueTime||"23:59").localeCompare(String(b.dueTime||"23:59")));
    const acts=state.activities
      .filter(a=>activityOccursOnDate(a,d))
      .sort((a,b)=>String(a.startTime||"").localeCompare(String(b.startTime||"")));

    const taskHTML=tasks.length?tasks.map(t=>`
      <div class="calendar-day-item task-day-item">
        <div class="calendar-day-item-icon">✓</div>
        <div class="calendar-day-item-main">
          <b>${esc(t.title)}</b>
          <small>${t.dueTime?`Due ${inputTimeToLabel(t.dueTime)}`:"No time set"}${t.module?` · ${esc(t.module)}`:""}</small>
        </div>
      </div>`).join(""):`<div class="calendar-day-empty">No tasks due.</div>`;

    const activityHTML=acts.length?acts.map(a=>`
      <div class="calendar-day-item activity-day-item">
        <div class="calendar-day-item-icon">◎</div>
        <div class="calendar-day-item-main">
          <b>${esc(a.name)}</b>
          <small>${a.startTime&&a.endTime?`${inputTimeToLabel(a.startTime)} – ${inputTimeToLabel(a.endTime)}`:"Time not set"}${a.club?` · ${esc(a.club)}`:""}</small>
          ${a.venue?`<small>${mapLocationLink(a.venue)}</small>`:""}
        </div>
      </div>`).join(""):`<div class="calendar-day-empty">No activities.</div>`;

    openModal(`
      <h2>${esc(dateLabel)}</h2>
      <div class="calendar-day-section">
        <h3>Tasks <span>${tasks.length}</span></h3>
        <div class="calendar-day-list">${taskHTML}</div>
      </div>
      <div class="calendar-day-section">
        <h3>Activities <span>${acts.length}</span></h3>
        <div class="calendar-day-list">${activityHTML}</div>
      </div>
    `);
  }

  window.addEventListener("nus-data-changed",()=>render());
  render();
  setInterval(updateCurrentTimeLine,30000);
  initCommon();
  initModal();
});
