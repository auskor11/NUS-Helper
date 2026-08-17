document.addEventListener("DOMContentLoaded",()=>{
  const view=document.querySelector(".view");
  let searchTimer=null;
  let moduleVenueList=null;
  let moduleNUSModsCoordinates=null;
  let moduleGooglePlacesReady=null;
  let moduleVenueSearchTimer=null;

  render();

  function render(){
    view.innerHTML=`
      <div class="section-head">
        <div><h2>Your modules</h2><div class="subtle">AY ${esc(state.semester.academicYear)} · Semester ${esc(state.semester.semester)}</div></div>
        <div class="action-row"><button class="primary" id="addModule">＋ Add module</button><button class="secondary" id="importModules">↻ Import from NUSMods</button><button class="secondary" id="importNUSModsLink">🔗 Import timetable link</button></div>
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
    $("#importNUSModsLink").onclick=openNUSModsLinkImporter;
    $("#removeAll")?.addEventListener("click",async()=>{
      if(!confirm("Remove ALL modules and timetable entries? Tasks and activities will NOT be deleted.")) return;

      const previousModules=state.modules;
      const previousLessons=state.lessons;
      state.modules=[];
      state.lessons=[];

      try{
        await save({immediate:true});
        render();
        toast("All modules removed");
      }catch(err){
        // Restore the in-memory state if Firestore rejected the deletion.
        state.modules=previousModules;
        state.lessons=previousLessons;
        render();
        toast("Could not remove all modules. Your data was not changed in Firebase.");
      }
    });
  }

  window.deleteModule=i=>{
    const code=state.modules[i]?.code; if(!code)return;
    state.modules.splice(i,1); state.lessons=state.lessons.filter(l=>l.module!==code); save(); render(); toast(`${code} removed`);
  };

  async function loadModuleVenueData(){
    if(moduleVenueList!==null)return;

    moduleVenueList=[];
    try{
      const r=await fetch(`${NUSMODS_BASE}/semesters/${SEMESTER}/venues.json`,{cache:"no-store"});
      if(r.ok){
        const data=await r.json();
        moduleVenueList=Array.isArray(data)
          ? data.map(normaliseVenue).filter(Boolean)
          : Object.keys(data||{}).map(k=>normaliseVenue(data[k],k)).filter(Boolean);
      }
    }catch(e){
      console.warn("Could not load NUSMods module venues:",e);
    }

    try{
      const r=await fetch("https://raw.githubusercontent.com/nusmodifications/nusmods/master/website/api/optimiser/_constants/venues.json",{cache:"no-store"});
      if(r.ok){
        const data=await r.json();
        if(data&&typeof data==="object")moduleNUSModsCoordinates=data;
      }
    }catch(e){
      console.warn("Could not load NUSMods module venue coordinates:",e);
    }
  }

  function normaliseVenue(v,key=""){
    if(typeof v==="string")return {code:v,name:v};
    if(!v||typeof v!=="object")return key?{code:key,name:key}:null;
    const code=v.venue||v.code||v.name||v.venueCode||key;
    if(!code)return null;
    return {
      code:String(code),
      name:String(v.name||v.venue||v.location_name||code),
      raw:v
    };
  }

  function getNUSModsCoordinates(code){
    if(!moduleNUSModsCoordinates)return null;
    const wanted=normaliseCode(code);
    for(const [key,value] of Object.entries(moduleNUSModsCoordinates)){
      if(normaliseCode(key)!==wanted)continue;
      const x=Number(value?.location?.x), y=Number(value?.location?.y);
      if(Number.isFinite(x)&&Number.isFinite(y)){
        return {lat:y,lng:x,source:"NUSMods venue coordinates"};
      }
    }
    return null;
  }

  function moduleVenueCandidates(){
    const byCode=new Map();
    for(const v of moduleVenueList||[]){
      const key=normaliseCode(v.code);
      if(!key)continue;
      const coords=getNUSModsCoordinates(v.code);
      byCode.set(key,{
        code:v.code,
        name:v.name,
        lat:coords?.lat??null,
        lng:coords?.lng??null,
        source:coords?"NUSMods coordinates":"NUSMods"
      });
    }
    return [...byCode.values()];
  }

  function findNUSMatches(query,limit=10){
    const q=normaliseCode(query);
    if(!q)return [];

    return moduleVenueCandidates()
      .map(v=>{
        const code=normaliseCode(v.code);
        const name=normaliseCode(v.name);
        let score=0;
        if(code===q)score=100;
        else if(code.startsWith(q))score=80;
        else if(name.includes(q))score=60;
        else if(code.includes(q))score=40;
        return {...v,score};
      })
      .filter(v=>v.score>0)
      .sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code))
      .slice(0,limit);
  }

  function looksLikeNUSVenueQuery(query){
    const q=String(query||"").trim().toUpperCase();
    return /^(LT|UT|COM|AS|EA|E|SDE|MD|SOC|MPSH|TP|RVRC|PGPR|R|BTC|CLB|NUS)\b/.test(q)
      || q.includes("NUS")
      || q.includes("NATIONAL UNIVERSITY");
  }

  function loadGooglePlaces(){
    if(moduleGooglePlacesReady)return moduleGooglePlacesReady;
    const key=window.NUS_GOOGLE_MAPS_API_KEY;
    if(!key || key.includes("YOUR_")){
      moduleGooglePlacesReady=Promise.resolve(null);
      return moduleGooglePlacesReady;
    }

    if(window.google?.maps?.importLibrary){
      moduleGooglePlacesReady=window.google.maps.importLibrary("places").catch(()=>null);
      return moduleGooglePlacesReady;
    }

    moduleGooglePlacesReady=new Promise(resolve=>{
      const existing=document.getElementById("googleMapsScript");
      if(existing){
        existing.addEventListener("load",async()=>{
          try{resolve(await window.google.maps.importLibrary("places"));}catch(e){resolve(null);}
        },{once:true});
        return;
      }

      const script=document.createElement("script");
      script.id="googleMapsScript";
      script.async=true;
      script.defer=true;
      script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
      let settled=false;
      const finish=value=>{if(settled)return;settled=true;resolve(value);};
      script.onload=async()=>{
        try{
          const lib=await Promise.race([
            window.google.maps.importLibrary("places"),
            new Promise(r=>setTimeout(()=>r(null),7000))
          ]);
          finish(lib||null);
        }catch(e){finish(null);}
      };
      script.onerror=()=>finish(null);
      document.head.appendChild(script);
      setTimeout(()=>finish(null),8000);
    });

    return moduleGooglePlacesReady;
  }

  async function searchGooglePlaces(query){
    const placesLib=await loadGooglePlaces();
    if(!placesLib||!window.google?.maps?.places?.Place)return [];

    try{
      const request={
        textQuery:`${query}${looksLikeNUSVenueQuery(query) ? ", National University of Singapore, Singapore" : ", Singapore"}`,
        fields:["displayName","location","formattedAddress","googleMapsURI"],
        locationBias:{center:{lat:1.2966,lng:103.7764},radius:5000},
        maxResultCount:8,
        language:"en-SG",
        region:"sg"
      };

      const result=await Promise.race([
        window.google.maps.places.Place.searchByText(request),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error("Google Places search timed out")),8000))
      ]);

      return (result.places||[]).map(place=>({
        code:place.displayName?.text||query,
        name:place.formattedAddress||"Google Maps location",
        label:place.displayName?.text||place.formattedAddress||query,
        lat:typeof place.location?.lat==="function"?place.location.lat():Number(place.location?.lat),
        lng:typeof place.location?.lng==="function"?place.location.lng():Number(place.location?.lng),
        source:"Google Maps",
        googleMapsURI:place.googleMapsURI||"",
        external:true
      })).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
    }catch(e){
      console.warn("Google Places activity search failed:",e);
      return [];
    }
  }

  async function searchNominatim(query){
    const q=String(query||"").trim();
    if(!q)return [];
    const queries=[q,`${q}, Singapore`];
    const seen=new Set(),results=[];

    for(const text of queries){
      try{
        const params=new URLSearchParams({
          q:text,format:"jsonv2",limit:"8",countrycodes:"sg",addressdetails:"1"
        });
        const r=await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`,{
          headers:{Accept:"application/json"},cache:"no-store"
        });
        if(!r.ok)continue;
        const data=await r.json();

        for(const x of data){
          const lat=Number(x.lat),lng=Number(x.lon);
          if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
          const key=`${lat.toFixed(6)},${lng.toFixed(6)}`;
          if(seen.has(key))continue;
          seen.add(key);
          results.push({
            code:x.name||q,
            label:x.name||x.display_name||q,
            name:x.display_name||"External map location",
            lat,lng,source:"OpenStreetMap",external:true
          });
        }
        if(results.length>=8)break;
      }catch(e){
        console.warn("Nominatim activity search failed:",e);
      }
    }
    return results.slice(0,8);
  }

  async function searchPhoton(query){
    const q=String(query||"").trim();
    if(!q)return [];
    try{
      const params=new URLSearchParams({q:`${q}, Singapore`,limit:"8",lang:"en"});
      const r=await fetch(`https://photon.komoot.io/api/?${params.toString()}`,{
        headers:{Accept:"application/json"},cache:"no-store"
      });
      if(!r.ok)return [];
      const data=await r.json();
      return (data.features||[]).map(f=>{
        const [lng,lat]=f.geometry?.coordinates||[];
        const p=f.properties||{};
        const name=p.name||p.street||q;
        const parts=[p.name,p.street,p.housenumber,p.suburb,p.city,p.country].filter(Boolean);
        return {
          code:name,label:name,name:parts.join(", ")||q,
          lat:Number(lat),lng:Number(lng),source:"External map",external:true
        };
      }).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng))
        .filter(x=>x.lat>=1&&x.lat<=2&&x.lng>=103&&x.lng<=104);
    }catch(e){
      console.warn("Photon activity search failed:",e);
      return [];
    }
  }

  async function searchExternalMap(query){
    const googleMatches=await searchGooglePlaces(query);
    if(googleMatches.length)return googleMatches;

    const osmMatches=await searchNominatim(query);
    if(osmMatches.length)return osmMatches;

    return await searchPhoton(query);
  }

  function renderLocationResults(results,box,onSelect){
    if(!results.length){
      box.innerHTML=`<div class="subtle">No locations found. Try a fuller venue name or Singapore address.</div>`;
      return;
    }

    box.innerHTML=results.map((v,i)=>`
      <button type="button" class="venue-result" data-location-result="${i}">
        <span><b>${esc(v.label||v.code)}</b><small>${esc(v.name||"")} · ${esc(v.source||"")}</small></span><span>⌖</span>
      </button>
    `).join("");

    $$(".venue-result",box).forEach((el,i)=>el.onclick=()=>onSelect(results[i]));
  }


  function setupModuleLocationSearch(list,draft){
    if(!list)return;

    $$(".edit-lesson-row",list).forEach((rowEl,index)=>{
      const input=rowEl.querySelector(".module-venue-input");
      const btn=rowEl.querySelector(".module-venue-search-btn");
      const box=rowEl.querySelector(".module-venue-results");
      const source=rowEl.querySelector(".module-venue-source");
      if(!input||!btn||!box)return;

      const existing=String(input.value||"").trim();
      let selected=null;
      if(existing) source.textContent="Current venue";

      const choose=location=>{
        selected=location;
        input.value=location.label||location.code||location.name||"";
        draft[index].venue=input.value;
        draft[index].venueLat=location.lat??null;
        draft[index].venueLng=location.lng??null;
        draft[index].venueSource=location.source||"Map search";
        source.textContent=`Selected from ${location.source||"map search"}`;
        box.innerHTML=`<div class="subtle">Selected: <b>${esc(input.value)}</b> · ${esc(location.source||"Map search")}</div>`;
      };

      const localSuggest=async()=>{
        try{
          await loadModuleVenueData();
        }catch(err){
          console.warn("NUSMods venue suggestions failed:",err);
        }
        const q=input.value.trim();
        if(!q){
          box.innerHTML=`<div class="subtle">Search NUS venues first. If there is no NUSMods match, press Search for external maps.</div>`;
          return;
        }
        const matches=findNUSMatches(q,8);
        if(matches.length){ renderLocationResults(matches,box,choose); return; }
        if(q.length<3){
          box.innerHTML=`<div class="subtle">No NUSMods match yet. Keep typing, or press Search for external maps.</div>`;
          return;
        }
        clearTimeout(moduleVenueSearchTimer);
        moduleVenueSearchTimer=setTimeout(async()=>{
          const external=await searchPhoton(q);
          if(external.length) renderLocationResults(external,box,choose);
          else box.innerHTML=`<div class="subtle">No NUSMods match. Press Search to search external maps.</div>`;
        },350);
      };

      input.addEventListener("input",()=>{
        selected=null;
        draft[index].venue=input.value;
        draft[index].venueLat=null;
        draft[index].venueLng=null;
        draft[index].venueSource="Manual entry";
        source.textContent="No location selected";
        localSuggest();
      });

      btn.addEventListener("click",async()=>{
        const q=input.value.trim();
        if(!q){ localSuggest(); return; }
        box.innerHTML='<div class="import-box"><div class="spinner"></div>Searching NUSMods first…</div>';
        box.classList.remove("hidden");
        try{
          await loadModuleVenueData();
        }catch(err){
          console.warn("NUSMods venue search failed:",err);
        }

        const nus=findNUSMatches(q,10);
        if(nus.length){ renderLocationResults(nus,box,choose); return; }

        box.innerHTML='<div class="import-box"><div class="spinner"></div>No NUSMods venue found. Searching external maps…</div>';
        try{
          const external=await searchExternalMap(q);
          renderLocationResults(external,box,choose);
        }catch(err){
          console.warn("External venue search failed:",err);
          box.innerHTML='<div class="subtle">Location search failed. Please try again or enter the venue manually.</div>';
        }
      });

      input.addEventListener("keydown",e=>{
        if(e.key==="Enter"){ e.preventDefault(); btn.click(); }
      });

      if(existing) localSuggest();
    });
  }

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
          <label>Venue
            <div class="venue-search-box module-venue-search-box">
              <input data-field="venue" class="modal-search module-venue-input" value="${esc(l.venue||"")}" placeholder="Search LT27, COM1, MPSH..." autocomplete="off">
              <button type="button" class="secondary compact module-venue-search-btn">Search</button>
            </div>
            <div class="small-help module-venue-source">No location selected</div>
            <div class="venue-results module-venue-results">
              <div class="subtle">NUSMods venues are searched first. If no match is found, Search will use external maps.</div>
            </div>
          </label>
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
      setupModuleLocationSearch(list,draft);
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
          venue:venueField ? venueField.value : (base.venue||""),
          venueLat:base.venueLat??null,
          venueLng:base.venueLng??null,
          venueSource:base.venueSource||"Manual entry"
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

  // Parse NUSMods Share timetable links such as:
  // ?CS1101S=REC:09A,TUT:08B,LEC:1&CS1231S=TUT:13A,LEC:1&hidden=...
  function parseNUSModsTimetableLink(raw){
    let url;
    try{ url=new URL(String(raw||"").trim()); }
    catch{ throw new Error("That is not a valid URL. Please paste the full NUSMods timetable link."); }

    if(!/(^|\.)nusmods\.com$/i.test(url.hostname)){
      throw new Error("Please paste a timetable link from nusmods.com.");
    }

    const parts=[];
    for(const [code,value] of url.searchParams.entries()){
      if(code.toLowerCase()==="hidden") continue;
      const lessons=String(value||"").split(",").map(token=>{
        const i=token.indexOf(":");
        return i>0
          ? {raw:token,type:token.slice(0,i).trim().toUpperCase(),classNo:token.slice(i+1).trim()}
          : {raw:token,type:token.trim().toUpperCase(),classNo:""};
      }).filter(x=>x.type);
      if(lessons.length) parts.push({code:code.trim().toUpperCase(),lessons});
    }
    if(!parts.length) throw new Error("No module selections were found in that NUSMods link.");
    return parts;
  }

  function nusModsTypeMatches(type, lessonType){
    const a=String(type||"").toUpperCase();
    const b=String(lessonType||"").toUpperCase().replace(/[^A-Z]/g,"");
    const aliases={
      LEC:["LECTURE","LEC"], TUT:["TUTORIAL","TUT"], REC:["RECITATION","REC"],
      LAB:["LABORATORY","LAB"], SEC:["SECTION","SEC"], SEM:["SEMINAR","SEM"]
    };
    return (aliases[a]||[a]).some(x=>b===x || b.startsWith(x));
  }

  async function importNUSModsTimetableLink(raw){
    const selections=parseNUSModsTimetableLink(raw);
    const results=[], failures=[];

    openModal(`<h2>Importing NUSMods timetable</h2><div id="nusLinkProgress" class="import-box"><div class="spinner"></div>Preparing ${selections.length} modules…</div>`);

    for(let i=0;i<selections.length;i++){
      const item=selections[i], progress=$("#nusLinkProgress");
      if(progress) progress.innerHTML=`<div class="spinner"></div>Loading <b>${esc(item.code)}</b> (${i+1}/${selections.length})…`;
      try{
        const rawData=await fetchNUSModsModule(item.code);
        const data=normaliseLessonData(rawData,item.code);
        const chosen=[];
        for(const wanted of item.lessons){
          const matches=data.timetable.filter(l=>
            nusModsTypeMatches(wanted.type,l.lessonType) &&
            String(l.classNo||"").trim().toUpperCase()===wanted.classNo.toUpperCase()
          );
          if(matches.length) chosen.push(...matches);
          else failures.push(`${item.code}: ${wanted.raw} was not found`);
        }

        const unique=[],seen=new Set();
        for(const lesson of chosen){
          const key=[lesson.lessonType,lesson.classNo,lesson.day,lesson.startTime,lesson.endTime,lesson.venue].join("|");
          if(!seen.has(key)){seen.add(key);unique.push(lesson);}
        }
        if(unique.length) results.push({code:item.code,name:data.title||moduleName(item.code),lessons:unique});
        else failures.push(`${item.code}: no matching classes could be imported`);
      }catch(e){ failures.push(`${item.code}: ${e.message}`); }
    }

    if(!results.length){
      openModal(`<h2>Import failed</h2><div class="error-box">${esc(failures.join(" · ")||"No modules could be imported.")}</div><div class="modal-footer"><button class="secondary" id="closeNUSLinkImport">Close</button></div>`);
      $("#closeNUSLinkImport").onclick=closeModal;
      return;
    }

    const importedCodes=new Set(results.map(x=>x.code));
    state.modules=(state.modules||[]).filter(m=>!importedCodes.has(String(m.code).toUpperCase()));
    state.lessons=(state.lessons||[]).filter(l=>!importedCodes.has(String(l.module||"").toUpperCase()));

    let lessonId=Date.now();
    for(const result of results){
      state.modules.push({code:result.code,name:result.name});
      result.lessons.forEach(lesson=>state.lessons.push({...lesson,module:result.code,id:`${result.code}-import-${lessonId++}`}));
    }

    try{ await save({immediate:true}); }
    catch{ render(); return; }

    const lessonCount=results.reduce((n,x)=>n+x.lessons.length,0);
    openModal(`
      <h2>Timetable imported ✓</h2>
      <p class="small-help">Imported <b>${results.length}</b> module${results.length===1?"":"s"} and <b>${lessonCount}</b> lesson entries from NUSMods.</p>
      ${failures.length?`<div class="error-box"><b>Some selections could not be matched:</b><br>${failures.map(esc).join("<br>")}</div>`:`<div class="success-box">All selected classes were matched successfully.</div>`}
      <div class="modal-footer"><button class="primary" id="closeNUSLinkSuccess">Done</button></div>
    `);
    $("#closeNUSLinkSuccess").onclick=()=>{closeModal();render();};
  }

  function openNUSModsLinkImporter(){
    openModal(`
      <h2>Import NUSMods timetable link</h2>
      <p class="small-help">Paste a NUSMods <b>Share</b> timetable link. The selected modules and class groups will be imported automatically.</p>
      <label class="form-label">NUSMods timetable link
        <textarea id="nusModsLinkInput" class="modal-search" rows="4" placeholder="https://nusmods.com/timetable/sem-1/share?..."></textarea>
      </label>
      <div class="small-help">The <code>hidden</code> parameter is ignored. Existing modules with the same code will be replaced by the imported selections; unrelated modules stay unchanged.</div>
      <div id="nusLinkError"></div>
      <div class="modal-footer"><button class="secondary" id="cancelNUSLink">Cancel</button><button class="primary" id="startNUSLink">Import timetable</button></div>
    `);
    $("#cancelNUSLink").onclick=closeModal;
    $("#startNUSLink").onclick=async()=>{
      const raw=$("#nusModsLinkInput")?.value.trim(), error=$("#nusLinkError");
      try{ parseNUSModsTimetableLink(raw); }
      catch(e){ if(error) error.innerHTML=`<div class="error-box">${esc(e.message)}</div>`; return; }
      await importNUSModsTimetableLink(raw);
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
