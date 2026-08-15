document.addEventListener("DOMContentLoaded",()=>{
  const view=document.querySelector(".view");
  let searchTimer=null;

  render();

  function render(){
    view.innerHTML=`
      <div class="section-head">
        <div><h2>Your modules</h2><div class="subtle">AY ${esc(state.semester.academicYear)} · Semester ${esc(state.semester.semester)}</div></div>
        <div class="action-row"><button class="primary" id="addModule">＋ Add module</button><button class="secondary" id="importModules">↻ Import from NUSMods</button></div>
      </div>
      <div class="grid">${state.modules.length?state.modules.map((m,i)=>`
        <div class="card">
          <div class="item-row"><div><div class="item-title">${esc(m.code)}</div><div class="item-sub">${esc(m.name)}</div></div><span class="pill">${state.lessons.filter(l=>l.module===m.code).length} classes</span></div>
          <div class="lesson-summary">${state.lessons.filter(l=>l.module===m.code).slice(0,8).map(l=>`<div><b>${esc(l.lessonType||"Class")}</b> · Group ${esc(l.classNo||"TBC")} · ${esc(l.day)} · ${minutesLabel(timeToMinutes(l.startTime))} – ${minutesLabel(timeToMinutes(l.endTime))}<br><span>${mapLocationLink(l.venue)}</span></div>`).join("")||`<div class="empty">No timetable entries yet.</div>`}</div>
          <div class="action-row">
            <button class="secondary compact" onclick="editModule(${i})">Edit module</button>
            <button class="ghost-btn danger-btn compact" onclick="deleteModule(${i})">Delete module</button>
          </div>
        </div>`).join(""):`<div class="card"><div class="empty">No modules yet. Import them from NUSMods.</div></div>`}</div>
      ${state.modules.length?`<div class="danger-zone"><button class="ghost-btn danger-btn" id="removeAll">⚠ Remove all modules</button><span>Useful when starting a new semester.</span></div>`:""}`;

    $("#addModule").onclick=openManualModule;
    $("#importModules").onclick=openImporter;
    $("#removeAll")?.addEventListener("click",()=>{
      if(confirm("Remove ALL modules and timetable entries? Tasks and activities will NOT be deleted.")){
        state.modules=[]; state.lessons=[]; save(); render(); toast("All modules removed");
      }
    });
  }

  window.deleteModule=i=>{
    const code=state.modules[i]?.code; if(!code)return;
    state.modules.splice(i,1); state.lessons=state.lessons.filter(l=>l.module!==code); save(); render(); toast(`${code} removed`);
  };

  window.editModule=function(i,passedDraft=null){
    const mod=state.modules[i]; if(!mod)return;
    let draft=passedDraft ? passedDraft.map(x=>({...x})) :
      (mod.__editDraft ? mod.__editDraft.map(x=>({...x})) :
      state.lessons.filter(l=>l.module===mod.code).map(x=>({...x})));
    delete mod.__editDraft;

    const lessonTypes=["Lecture","Tutorial","Recitation","Laboratory","Section","Seminar","Class"];

    function editTimeValue(value){
      // HTML <input type="time"> only accepts 24-hour HH:MM values.
      // Older lessons may contain "10:00 AM", "1000", etc., which makes
      // the browser display an empty field even though the timing exists.
      const mins=timeToMinutes(value);
      if(mins==null)return "";
      return `${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
    }

    function row(l,index){
      const startValue=editTimeValue(l.startTime ?? l.start ?? l.start_time ?? "");
      const endValue=editTimeValue(l.endTime ?? l.end ?? l.end_time ?? "");
      return `<div class="edit-lesson-row" data-index="${index}">
        <div class="two-col">
          <label>Lesson type<select data-field="lessonType">${lessonTypes.map(t=>`<option value="${esc(t)}" ${String(l.lessonType||"Class").toLowerCase()===t.toLowerCase()?"selected":""}>${esc(t)}</option>`).join("")}</select></label>
          <label>Group<input data-field="classNo" value="${esc(l.classNo||"TBC")}" placeholder="01"></label>
        </div>
        <div class="two-col">
          <label>Day<select data-field="day">${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d=>`<option value="${d}" ${l.day===d?"selected":""}>${d}</option>`).join("")}</select></label>
          <label>Venue<input data-field="venue" value="${esc(l.venue||"")}" placeholder="LT1"></label>
        </div>
        <div class="two-col">
          <label>Start<input type="time" data-field="startTime" value="${esc(startValue)}" required></label>
          <label>End<input type="time" data-field="endTime" value="${esc(endValue)}" required></label>
        </div>
        <button type="button" class="ghost-btn danger-btn compact remove-lesson" data-index="${index}">Remove this timing</button>
      </div>`;
    }

    function renderDraft(){
      const list=$("#editLessonList");
      list.innerHTML=draft.length?draft.map(row).join(""):`<div class="empty">No lesson timings. Add one below.</div>`;
      $$(".remove-lesson",list).forEach(btn=>btn.onclick=()=>{
        draft.splice(Number(btn.dataset.index),1);
        renderDraft();
      });
    }

    openModal(`<h2>Edit ${esc(mod.code)}</h2>
      <form class="form" id="editModuleForm">
        <label>Module name<input name="name" value="${esc(mod.name||"")}" required></label>
        <p class="small-help">Edit existing lecture/tutorial/recitation timings or remove them. You can also add a new timing manually.</p>
        <div id="editLessonList" class="list"></div>
        <div class="action-row">
          <button type="button" class="secondary" id="addLessonTiming">＋ Add lesson timing</button>
          <button type="button" class="secondary" id="importEditLessons">↻ Import from NUSMods</button>
        </div>
        <div class="modal-footer"><button type="button" class="secondary" id="cancelEditModule">Cancel</button><button class="primary">Save changes</button></div>
      </form>`);

    renderDraft();

    $("#addLessonTiming").onclick=()=>{
      draft.push({
        id:`${mod.code}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        module:mod.code,
        lessonType:"Tutorial",
        classNo:"",
        day:"Monday",
        startTime:"",
        endTime:"",
        venue:""
      });
      renderDraft();
    };

    $("#importEditLessons").onclick=()=>importLessonsIntoEditor(mod,draft,renderDraft);

    $("#cancelEditModule").onclick=closeModal;

    $("#editModuleForm").onsubmit=e=>{
      e.preventDefault();

      const list=$("#editLessonList");
      const updated=[];
      $$(".edit-lesson-row",list).forEach((rowEl,index)=>{
        const get=field=>rowEl.querySelector(`[data-field="${field}"]`)?.value||"";
        const base={...(draft[index]||{})};

        const startField=rowEl.querySelector('[data-field="startTime"]');
        const endField=rowEl.querySelector('[data-field="endTime"]');
        const venueField=rowEl.querySelector('[data-field="venue"]');

        Object.assign(base,{
          module:mod.code,
          lessonType:get("lessonType")||base.lessonType||"Class",
          classNo:get("classNo")||base.classNo||"TBC",
          day:get("day")||base.day||"Monday",
          // Preserve existing timing if a time input was not populated by an
          // older/partially migrated lesson object.
          startTime:startField ? (startField.value || editTimeValue(base.startTime||base.start||base.start_time||"")) : (base.startTime||""),
          endTime:endField ? (endField.value || editTimeValue(base.endTime||base.end||base.end_time||"")) : (base.endTime||""),
          venue:venueField ? venueField.value : (base.venue||"")
        });

        updated.push(base);
      });

      // Keep all other modules untouched and replace only this module's
      // lesson timings.
      state.modules[i].name=String(new FormData(e.target).get("name")||"").trim();
      state.lessons=[
        ...state.lessons.filter(l=>l.module!==mod.code),
        ...updated
      ];

      save(); closeModal(); render(); toast(`${mod.code} updated`);
    };
  };

  async function importLessonsIntoEditor(mod, draft, renderDraft){
    openModal(`<h2>Import lesson groups</h2>
      <p class="subtle">${esc(mod.code)} · ${esc(mod.name)}</p>
      <div class="import-box"><div class="spinner"></div>Loading NUSMods…</div>`);

    try{
      const raw=await fetchNUSModsModule(mod.code);
      const data=normaliseLessonData(raw,mod.code);
      const groups=lessonGroups(data);

      if(!groups.length){
        openModal(`<h2>No lesson groups found</h2>
          <p class="subtle">NUSMods has no published timetable groups for ${esc(mod.code)} in AY ${esc(ACADEMIC_YEAR)} Semester ${esc(SEMESTER)}.</p>
          <div class="modal-footer"><button class="secondary" id="importLessonsBack">Back to edit module</button></div>`);
        $("#importLessonsBack").onclick=()=>window.editModule(state.modules.findIndex(x=>x.code===mod.code));
        return;
      }

      const types=[...new Set(groups.map(([key])=>key.split("::")[0]))];
      const options=groups.map(([key,lessons])=>{
        const [type,no]=key.split("::");
        return `<label class="lesson-option" data-type="${esc(type)}" data-search="${esc((`${type} ${no} ${lessons.map(l=>`${l.day} ${l.venue||""}`).join(" ")}`).toLowerCase())}">
          <input type="checkbox" class="edit-import-choice" value="${esc(key)}">
          <span><b>${esc(lessonGroupLabel(type,no))}</b>
          ${lessons.map(l=>`<small>${esc(l.day)} · ${esc(minutesLabel(timeToMinutes(l.startTime)))} – ${esc(minutesLabel(timeToMinutes(l.endTime)))} · ${esc(l.venue||"Venue TBC")}</small>`).join("")}</span>
        </label>`;
      }).join("");

      openModal(`<h2>Import into ${esc(mod.code)}</h2>
        <p class="small-help">Select lecture, tutorial, recitation or other lesson groups to add to this module. Existing timings will be kept.</p>
        <input id="editLessonSearch" class="modal-search" placeholder="Search groups, days, venues..." autocomplete="off">
        <div class="lesson-filters">
          <button class="filter-chip selected" data-filter="all">All (${groups.length})</button>
          ${types.map(t=>`<button class="filter-chip" data-filter="${esc(t)}">${esc(t)} (${groups.filter(([k])=>k.startsWith(`${t}::`)).length})</button>`).join("")}
        </div>
        <div class="lesson-picker" id="editLessonPicker">${options}</div>
        <div class="modal-footer">
          <button class="secondary" id="backToEditModule">Back</button>
          <button class="primary" id="addImportedEditLessons">Add selected</button>
        </div>`);

      const picker=$("#editLessonPicker"), search=$("#editLessonSearch");
      let activeFilter="all";

      const apply=()=>{
        const q=search.value.trim().toLowerCase();
        $$(".lesson-option",picker).forEach(el=>{
          el.hidden=(activeFilter!=="all"&&el.dataset.type!==activeFilter) || (q&&!el.dataset.search.includes(q));
        });
      };
      search.addEventListener("input",apply);

      $$(".filter-chip").forEach(btn=>btn.onclick=()=>{
        activeFilter=btn.dataset.filter;
        $$(".filter-chip").forEach(x=>x.classList.toggle("selected",x===btn));
        apply();
      });

      $("#backToEditModule").onclick=()=>window.editModule(state.modules.findIndex(x=>x.code===mod.code));

      $("#addImportedEditLessons").onclick=()=>{
        const selected=new Set($$(".edit-import-choice:checked").map(x=>x.value));
        if(!selected.size){toast("Select at least one lesson group");return;}

        const existingKeys=new Set(
          draft.map(l=>`${l.lessonType||"Class"}::${String(l.classNo??"TBC")}`)
        );

        const chosen=data.timetable.filter(l=>{
          const key=`${l.lessonType||"Class"}::${String(l.classNo??l.ClassNo??"TBC")}`;
          return selected.has(key) && !existingKeys.has(key);
        });

        chosen.forEach((l,i)=>{
          draft.push({
            ...l,
            module:mod.code,
            id:l.id||`${mod.code}-import-${Date.now()}-${i}`
          });
        });

        const skipped=data.timetable.filter(l=>{
          const key=`${l.lessonType||"Class"}::${String(l.classNo??l.ClassNo??"TBC")}`;
          return selected.has(key) && existingKeys.has(key);
        }).length;

        closeModal();
        // Reopen the editor so the imported rows are visible immediately.
        // Persist the draft temporarily in memory for this edit operation.
        mod.__editDraft=draft;
        window.editModule(state.modules.findIndex(x=>x.code===mod.code), draft);
        toast(skipped?`Added groups. ${skipped} already existed.`:"Lesson groups added");
      };
    }catch(e){
      openModal(`<h2>Import failed</h2>
        <div class="error-box">${esc(e.message)}</div>
        <div class="modal-footer"><button class="secondary" id="importEditFailedBack">Back to edit module</button></div>`);
      $("#importEditFailedBack").onclick=()=>window.editModule(state.modules.findIndex(x=>x.code===mod.code));
    }
  }

  function openManualModule(){
    openModal(`<h2>Add module</h2><form class="form" id="manualModuleForm"><label>Module code<input name="code" placeholder="CS1231S" required autocomplete="off"></label><label>Module name<input name="name" placeholder="Discrete Structures" required></label><button class="primary">Save module</button></form>`);
    $("#manualModuleForm").onsubmit=e=>{
      e.preventDefault(); const f=new FormData(e.target),code=String(f.get("code")).trim().toUpperCase(),name=String(f.get("name")).trim();
      if(state.modules.some(m=>m.code===code)){toast("That module is already added");return;}
      state.modules.push({code,name}); save(); closeModal(); render();
    };
  }

  async function openImporter(){
    openModal(`<h2>Import from NUSMods</h2><p class="subtle">AY ${esc(ACADEMIC_YEAR)} · Semester ${esc(SEMESTER)}</p><input id="nusSearch" class="modal-search" placeholder="Search module code or name..." autocomplete="off"><div id="nusResults" class="nus-results"><div class="import-box"><div class="spinner"></div>Loading NUSMods…</div></div><div class="modal-footer"><button class="secondary" id="closeImporter">Close</button></div>`);
    $("#closeImporter").onclick=closeModal;
    try{
      const list=await fetchNUSModsList();
      const input=$("#nusSearch"); if(!input)return;
      const update=()=>{ clearTimeout(searchTimer); searchTimer=setTimeout(()=>renderResults(list,input.value),0); };
      input.addEventListener("input",update); renderResults(list,""); input.focus();
    }catch(e){
      const results=$("#nusResults"); if(!results)return;
      results.innerHTML=`<div class="error-box">${esc(e.message)}</div>`;
      $("#closeImporter").onclick=closeModal;
    }
  }

  function renderResults(list,q){
    const query=q.trim().toLowerCase();
    const results=list.filter(m=>`${m.moduleCode} ${m.title}`.toLowerCase().includes(query)).slice(0,40);
    $("#nusResults").innerHTML=results.length?results.map(m=>`<button class="nus-result" data-code="${esc(m.moduleCode)}"><span><b>${esc(m.moduleCode)}</b><small>${esc(m.title)}</small></span><span>›</span></button>`).join(""):`<div class="empty">No matching modules.</div>`;
    $$(".nus-result",$("#nusResults")).forEach(b=>b.onclick=()=>loadModule(b.dataset.code));
  }

  async function loadModule(code){
    openModal(`<h2>${esc(code)}</h2><div class="import-box"><div class="spinner"></div>Loading lesson groups…</div>`);
    try{
      const raw=await fetchNUSModsModule(code),data=normaliseLessonData(raw,code),groups=lessonGroups(data);
      if(!groups.length){
        openModal(`<h2>${esc(data.moduleCode)}</h2><p class="subtle">${esc(data.title)}</p><div class="error-box">No timetable groups were found for ${esc(data.moduleCode)} in AY ${esc(ACADEMIC_YEAR)} Semester ${esc(SEMESTER)}. The module may be offered in another semester or may not have a published timetable yet.</div><div class="modal-footer"><button class="secondary" id="noGroupsBack">Back to module search</button><button class="secondary" id="noGroupsClose">Close</button></div>`);
        $("#noGroupsBack").onclick=openImporter; $("#noGroupsClose").onclick=closeModal; return;
      }

      const types=[...new Set(groups.map(([key])=>key.split("::")[0]))];
      const options=groups.map(([key,lessons])=>{
        const [type,no]=key.split("::");
        return `<label class="lesson-option" data-type="${esc(type)}" data-search="${esc((`${type} ${no} ${lessons.map(l=>`${l.day} ${l.venue||""}`).join(" ")}`).toLowerCase())}"><input type="checkbox" class="lesson-choice" value="${esc(key)}"><span><b>${esc(lessonGroupLabel(type,no))}</b>${lessons.map(l=>`<small>${esc(l.day)} · ${esc(minutesLabel(timeToMinutes(l.startTime)))} – ${esc(minutesLabel(timeToMinutes(l.endTime)))} · ${esc(l.venue||"Venue TBC")}</small>`).join("")}</span></label>`;
      }).join("");

      openModal(`<h2>${esc(data.moduleCode)}</h2><p class="subtle">${esc(data.title)}</p><p class="small-help">Select the lecture, tutorial, recitation, laboratory or other lesson group(s) you need. Search below to find a group quickly.</p><input id="lessonSearch" class="modal-search" placeholder="Search groups, days, venues..." autocomplete="off"><div class="lesson-filters"><button class="filter-chip selected" data-filter="all">All (${groups.length})</button>${types.map(t=>`<button class="filter-chip" data-filter="${esc(t)}">${esc(t)} (${groups.filter(([k])=>k.startsWith(`${t}::`)).length})</button>`).join("")}</div><div class="lesson-picker" id="lessonPicker">${options}</div><div class="modal-footer"><button class="secondary" id="backImport">Back</button><button class="primary" id="addSelected">Add selected</button></div>`);

      const picker=$("#lessonPicker"), search=$("#lessonSearch");
      let activeFilter="all";
      function applyFilters(){
        const q=search.value.trim().toLowerCase();
        $$(".lesson-option",picker).forEach(el=>{
          const type=el.dataset.type;
          el.hidden=!(activeFilter==="all"||type===activeFilter) || (q && !el.dataset.search.includes(q));
        });
      }
      search.addEventListener("input",applyFilters);
      $$(".filter-chip").forEach(btn=>btn.onclick=()=>{
        activeFilter=btn.dataset.filter; $$(".filter-chip").forEach(x=>x.classList.toggle("selected",x===btn)); applyFilters();
      });

      $("#backImport").onclick=openImporter;
      $("#addSelected").onclick=()=>{
        const selected=new Set($$(".lesson-choice:checked").map(x=>x.value));
        if(!selected.size){toast("Select at least one lesson group");return;}
        const chosen=data.timetable.filter(l=>selected.has(`${l.lessonType||"Class"}::${String(l.classNo??l.ClassNo??"TBC")}`));
        state.modules=state.modules.filter(m=>m.code!==data.moduleCode); state.lessons=state.lessons.filter(l=>l.module!==data.moduleCode);
        state.modules.push({code:data.moduleCode,name:data.title});
        chosen.forEach((l,i)=>state.lessons.push({...l,module:data.moduleCode,id:`${data.moduleCode}-${Date.now()}-${i}`}));
        save(); closeModal(); render(); toast(`${data.moduleCode} imported`);
      };
    }catch(e){
      openModal(`<h2>Import failed</h2><div class="error-box">${esc(e.message)}</div><div class="modal-footer"><button class="secondary" id="importFailedBack">Back to module search</button><button class="secondary" id="importFailedClose">Close</button></div>`);
      $("#importFailedBack").onclick=openImporter; $("#importFailedClose").onclick=closeModal;
    }
  }

  window.addEventListener("nus-data-changed",()=>render());
  initCommon(); initModal();
});
