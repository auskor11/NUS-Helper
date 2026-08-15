document.addEventListener("DOMContentLoaded",()=>{
  const view=document.querySelector(".view");

  let activityVenueList=null;
  let activityNUSModsCoordinates=null;
  let activityGooglePlacesReady=null;
  let venueSearchTimer=null;

  const normaliseCode=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");

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

  async function loadActivityVenueData(){
    if(activityVenueList!==null)return;

    activityVenueList=[];
    try{
      const r=await fetch(`${NUSMODS_BASE}/semesters/${SEMESTER}/venues.json`,{cache:"no-store"});
      if(r.ok){
        const data=await r.json();
        activityVenueList=Array.isArray(data)
          ? data.map(normaliseVenue).filter(Boolean)
          : Object.keys(data||{}).map(k=>normaliseVenue(data[k],k)).filter(Boolean);
      }
    }catch(e){
      console.warn("Could not load NUSMods activity venues:",e);
    }

    try{
      const r=await fetch("https://raw.githubusercontent.com/nusmodifications/nusmods/master/website/api/optimiser/_constants/venues.json",{cache:"no-store"});
      if(r.ok){
        const data=await r.json();
        if(data&&typeof data==="object")activityNUSModsCoordinates=data;
      }
    }catch(e){
      console.warn("Could not load NUSMods activity venue coordinates:",e);
    }
  }

  function normaliseVenue(v,key=""){
    if(typeof v==="string")return {code:v,name:v};
    if(!v||typeof v!=="object")return key?{code:key,name:key}:null;
    const code=v.venue||v.code||v.name||v.venueCode||key;
    if(!code)return null;
    return {code:String(code),name:String(v.name||v.venue||v.location_name||code),raw:v};
  }

  function getNUSModsCoordinates(code){
    if(!activityNUSModsCoordinates)return null;
    const wanted=normaliseCode(code);
    for(const [key,value] of Object.entries(activityNUSModsCoordinates)){
      if(normaliseCode(key)!==wanted)continue;
      const x=Number(value?.location?.x), y=Number(value?.location?.y);
      if(Number.isFinite(x)&&Number.isFinite(y)){
        return {
          lat:y,lng:x,
          source:"NUSMods venue coordinates"
        };
      }
    }
    return null;
  }

  function activityVenueCandidates(){
    const byCode=new Map();
    for(const v of activityVenueList||[]){
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

    return activityVenueCandidates()
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
    if(activityGooglePlacesReady)return activityGooglePlacesReady;
    const key=window.NUS_GOOGLE_MAPS_API_KEY;
    if(!key || key.includes("YOUR_")){
      activityGooglePlacesReady=Promise.resolve(null);
      return activityGooglePlacesReady;
    }

    if(window.google?.maps?.importLibrary){
      activityGooglePlacesReady=window.google.maps.importLibrary("places").catch(()=>null);
      return activityGooglePlacesReady;
    }

    activityGooglePlacesReady=new Promise(resolve=>{
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

    return activityGooglePlacesReady;
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

  function setupActivityLocationSearch(existing){
    const input=$("#activityVenueSearch");
    const btn=$("#activityVenueSearchBtn");
    const box=$("#activityVenueResults");
    const source=$("#activityVenueSource");
    if(!input||!btn||!box)return;

    let selected=null;

    if(existing?.venue){
      selected={
        code:existing.venue,
        label:existing.venue,
        name:existing.venue,
        lat:Number.isFinite(Number(existing.venueLat))?Number(existing.venueLat):null,
        lng:Number.isFinite(Number(existing.venueLng))?Number(existing.venueLng):null,
        source:existing.venueSource||"Saved location"
      };
      source.textContent=existing.venueSource?`Saved from ${existing.venueSource}`:"Saved location";
    }

    const choose=location=>{
      selected=location;
      input.value=location.label||location.code||location.name||"";
      source.textContent=`Selected from ${location.source||"map search"}`;
      box.innerHTML=`<div class="subtle">Selected: <b>${esc(input.value)}</b> · ${esc(location.source||"Map search")}</div>`;
    };

    const localSuggest=async()=>{
      await loadActivityVenueData();
      const q=input.value.trim();
      if(!q){
        box.innerHTML=`<div class="subtle">Search NUS venues first. If there is no NUSMods match, the search will automatically use external maps.</div>`;
        return;
      }

      const matches=findNUSMatches(q,8);
      if(matches.length){
        renderLocationResults(matches,box,choose);
        return;
      }

      if(q.length<3){
        box.innerHTML=`<div class="subtle">No NUSMods match yet. Keep typing, or press Search for an external map search.</div>`;
        return;
      }

      clearTimeout(venueSearchTimer);
      venueSearchTimer=setTimeout(async()=>{
        const external=await searchPhoton(q);
        if(external.length)renderLocationResults(external,box,choose);
        else box.innerHTML=`<div class="subtle">No NUSMods match. Press Search to search external maps.</div>`;
      },350);
    };

    input.addEventListener("input",()=>{
      selected=null;
      source.textContent="No location selected";
      localSuggest();
    });

    btn.addEventListener("click",async()=>{
      const q=input.value.trim();
      if(!q)return localSuggest();

      box.innerHTML='<div class="import-box"><div class="spinner"></div>Searching NUSMods first…</div>';
      box.classList.remove("hidden");

      await loadActivityVenueData();
      const nus=findNUSMatches(q,10);
      if(nus.length){
        renderLocationResults(nus,box,choose);
        return;
      }

      box.innerHTML='<div class="import-box"><div class="spinner"></div>No NUSMods venue found. Searching external maps…</div>';
      const external=await searchExternalMap(q);
      renderLocationResults(external,box,choose);
    });

    input.addEventListener("keydown",e=>{
      if(e.key==="Enter"){
        e.preventDefault();
        btn.click();
      }
    });

    localSuggest();

    return {
      getSelected:()=>selected
    };
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

        <div class="location-picker">
          <label class="search-label" for="activityVenueSearch">Location</label>
          <div class="venue-search-box">
            <input id="activityVenueSearch" class="modal-search" name="venue" value="${esc(existing?.venue||"")}" placeholder="Search LT27, COM1, MPSH, Central Library..." autocomplete="off" required>
            <button class="primary" id="activityVenueSearchBtn" type="button">Search</button>
          </div>
          <div id="activityVenueSource" class="small-help">No location selected</div>
          <div id="activityVenueResults" class="venue-results">
            <div class="subtle">Search NUS venues first. If there is no NUSMods match, the search will automatically use external maps.</div>
          </div>
        </div>

        <button class="primary">${existing?"Save changes":"Save activity"}</button>
      </form>`);

    const locationSearch=setupActivityLocationSearch(existing);

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
      const selected=locationSearch.getSelected();
      const typedVenue=String(f.get("venue")||"").trim();

      if(!typedVenue){
        toast("Please enter a location");
        return;
      }

      const data={
        name:String(f.get("name")||"").trim(),
        club:String(f.get("club")||"").trim(),
        module:String(f.get("module")||""),
        recurring,
        date:recurring?"":String(f.get("date")||""),
        day:recurring?String(f.get("day")||""):"",
        startTime:String(f.get("startTime")||""),
        endTime:String(f.get("endTime")||""),
        venue:selected?.label||selected?.code||typedVenue,
        venueLat:selected?.lat??existing?.venueLat??null,
        venueLng:selected?.lng??existing?.venueLng??null,
        venueSource:selected?.source||existing?.venueSource||"Manual entry"
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

  window.addEventListener("nus-data-changed",()=>render());
  render(); initCommon(); initModal();
});
