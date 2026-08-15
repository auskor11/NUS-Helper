document.addEventListener("DOMContentLoaded",()=>{
  const view=document.querySelector(".view");

  function render(){
    const sorted=[...state.activities].sort((a,b)=>(a.date||a.day||"").localeCompare(b.date||b.day||""));
    view.innerHTML=`<div class="section-head">
      <div><h2>Clubs & activities</h2><div class="subtle">Recurring club sessions or one-time events.</div></div>
      <button class="primary" id="addActivity">＋ Add activity</button>
    </div>
    <div class="grid">${sorted.length?sorted.map(a=>`
      <div class="card">
        <div class="item-row">
          <div><div class="item-title">${esc(a.name)}</div><div class="item-sub">${esc(a.club)}</div></div>
          ${a.module?`<span class="pill">${esc(a.module)}</span>`:""}
        </div>
        <div class="item-sub activity-details">
          ${a.recurring?`Every ${esc(a.day)}`:fmtDate(a.date)} · ${inputTimeToLabel(a.startTime)} – ${inputTimeToLabel(a.endTime)}
          <br>${mapLocationLink(a.venue)}
        </div>
        <div class="action-row">
          <button class="secondary compact edit-activity" data-id="${esc(a.id)}">Edit</button>
          <button class="ghost-btn danger-btn compact delete-activity" data-id="${esc(a.id)}">Delete</button>
        </div>
      </div>`).join(""):`<div class="card"><div class="empty">No activities yet.</div></div>`}</div>`;

    $("#addActivity").onclick=()=>openActivity();

    $$(".edit-activity").forEach(btn=>{
      btn.onclick=()=>openActivity(state.activities.find(a=>a.id===btn.dataset.id));
    });

    $$(".delete-activity").forEach(btn=>{
      btn.onclick=()=>{
        const id=btn.dataset.id;
        const activity=state.activities.find(a=>a.id===id);
        if(!activity)return;
        if(!confirm(`Delete "${activity.name}"?`))return;
        markDeletedId(DELETED_ACTIVITIES_KEY,id);
        state.activities=state.activities.filter(a=>a.id!==id);
        save({immediate:true}); render(); toast("Activity deleted");
      };
    });
  }

  function openActivity(existing=null){
    const opts=[`<option value="">None</option>`,...state.modules.map(m=>`<option value="${esc(m.code)}" ${existing?.module===m.code?"selected":""}>${esc(m.code)} — ${esc(m.name)}</option>`)].join("");

    openModal(`<h2>${existing?"Edit activity":"Add activity"}</h2>
      <form class="form" id="activityForm">
        <label>Activity<input name="name" value="${esc(existing?.name||"")}" placeholder="Basketball Training" required></label>
        <label>Club / organisation<input name="club" value="${esc(existing?.club||"")}" placeholder="NUS Basketball" required></label>
        <label>Related module (optional)<select name="module">${opts}</select></label>
        <label>Type<select name="recurring" id="activityType">
          <option value="true" ${existing?.recurring!==false?"selected":""}>Recurring weekly</option>
          <option value="false" ${existing?.recurring===false?"selected":""}>One-time</option>
        </select></label>
        <div id="activityDateWrap" class="conditional hidden">
          <label>Date<input type="date" name="date" value="${esc(existing?.date||"")}"></label>
        </div>
        <div id="activityDayWrap">
          <label>Day<select name="day">${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d=>`<option ${existing?.day===d?"selected":""}>${d}</option>`).join("")}</select></label>
        </div>
        <div class="two-col">
          <label>Start time<input type="time" name="startTime" value="${esc(existing?.startTime||"19:00")}" required></label>
          <label>End time<input type="time" name="endTime" value="${esc(existing?.endTime||"21:00")}" required></label>
        </div>
        <label>Venue<input name="venue" value="${esc(existing?.venue||"")}" placeholder="MPSH" required></label>
        <button class="primary">${existing?"Save changes":"Save activity"}</button>
      </form>`);

    const type=$("#activityType"), dw=$("#activityDateWrap"), day=$("#activityDayWrap"), date=$('input[name="date"]');
    const sync=()=>{
      const one=type.value==="false";
      dw.classList.toggle("hidden",!one);
      day.classList.toggle("hidden",one);
      date.required=one;
    };
    type.onchange=sync; sync();

    $("#activityForm").onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(e.target);
      const recurring=f.get("recurring")==="true";
      const data={
        name:String(f.get("name")||"").trim(),
        club:String(f.get("club")||"").trim(),
        module:String(f.get("module")||""),
        recurring,
        date:recurring?"":String(f.get("date")||""),
        day:recurring?String(f.get("day")||""):"",
        startTime:String(f.get("startTime")||""),
        endTime:String(f.get("endTime")||""),
        venue:String(f.get("venue")||"").trim()
      };

      if(existing){
        Object.assign(existing,data);
        toast("Activity updated");
      }else{
        state.activities.push({
          id:crypto.randomUUID?.()||String(Date.now()+Math.random()),
          ...data
        });
        toast("Activity added");
      }

      save(); closeModal(); render();
    };
  }

  render(); initCommon(); initModal();
});
