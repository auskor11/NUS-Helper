document.addEventListener("DOMContentLoaded",()=>{
  const view=document.querySelector(".view");
  if(!view)return;

  const BUS_STOPS_URLS=[
    "https://data.busrouter.sg/v1/stops.min.json",
    "https://busrouter.sg/data/2/bus-stops.json"
  ];
  const ARRIVAL_URL=code=>`https://arrivelah2.busrouter.sg/?id=${encodeURIComponent(code)}`;

  let catalog=[];
  let selected=null;
  let searchTimer=null;
  let busMap=null;
  let busMapPublicMarkers=[];
  let busMapNusMarkers=[];
  let nusStops=[];
  let nusSelected=null;

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  view.innerHTML=`
    <div class="section-head">
      <div>
        <h2>NUS Bus Timings</h2>
        <div class="subtle">Live NUS shuttle information from NUS NextBus.</div>
      </div>
      <a class="secondary link-btn" href="https://bus.hewliyang.com/" target="_blank" rel="noopener">Open NUS NextBus ↗</a>
    </div>

    <div class="card bus-search-card">
      <label class="search-label" for="busStopSearch">Find an NUS bus stop</label>
      <div class="bus-search-row">
        <input id="busStopSearch" class="modal-search" placeholder="Search Central Library, University Hall, UTown..." autocomplete="off">
        <button class="primary" id="busStopSearchBtn" type="button">Search</button>
      </div>
      <div id="busStopSuggestions" class="bus-stop-suggestions"></div>
      <div class="bus-nearby-actions">
        <button class="secondary compact" id="nusNearbyBtn" type="button">◎ Nearby NUS stops</button>
      </div>
      <div id="nusNearbyResults" class="nus-nearby-results hidden"></div>
      <div class="bus-popular-wrap">
        <div class="kicker">POPULAR NUS BUS STOPS</div>
        <div class="bus-popular-stops" id="busNusStops"></div>
      </div>
    </div>

    <div class="card bus-nus-card">
      <div class="bus-live-header">
        <div>
          <div class="kicker">LIVE SOURCE</div>
          <h2 id="busNusSelectedName">NUS NextBus</h2>
          <div id="busNusSelectedMeta" class="subtle">Search for an NUS stop above, or use Nearby NUS stops.</div>
        </div>
        <a class="secondary compact link-btn" id="busNusOpen" href="https://bus.hewliyang.com/" target="_blank" rel="noopener">Open live source ↗</a>
      </div>
      <div class="bus-nus-frame-wrap">
        <iframe id="busNusFrame" title="NUS NextBus live source" src="https://bus.hewliyang.com/" loading="eager" referrerpolicy="no-referrer"></iframe>
      </div>
      <div class="bus-source-note">
        Live NUS shuttle information is displayed directly from <a href="https://bus.hewliyang.com/" target="_blank" rel="noopener">NUS NextBus by hewliyang</a>.
      </div>
    </div>
  `;

  initCommon();
  initModal();
  const NUS_STOPS=[
    ["COM 3","COM3",1.294431,103.775217],["Opp TCOMS","TCOMS-OPP",1.293789,103.776715],
    ["Prince George's Park","PGP",1.291765,103.780419],["Kent Ridge MRT","KR-MRT",1.294820,103.784413],
    ["LT 27","LT27",1.297421,103.780941],["University Hall","UHALL",1.297127,103.778822],
    ["Opp University Health Centre","UHC-OPP",1.298788,103.775612],["Museum","MUSEUM",1.301081,103.773690],
    ["University Town","UTOWN",1.303876,103.774621],["University Health Centre","UHC",1.298910,103.776103],
    ["Opp University Hall","UHALL-OPP",1.297574,103.778088],["S 17","S17",1.297519,103.780730],
    ["Opp Kent Ridge MRT","KR-MRT-OPP",1.294962,103.784556],["Prince George's Park Foyer","PGPR",1.290994,103.781153],
    ["TCOMS","TCOMS",1.293654,103.776898],["Opp HSSML","HSSML-OPP",1.292798,103.774978],
    ["Opp NUSS","NUSS-OPP",1.293208,103.772618],["Ventus","LT13-OPP",1.295340,103.770617],
    ["Information Technology","IT",1.297204,103.772688],["Opp Yusof Ishak House","YIH-OPP",1.298904,103.774118],
    ["Yusof Ishak House","YIH",1.298885,103.774377],["Central Library","CLB",1.296544,103.772569],
    ["LT 13","LT13",1.294552,103.770635],["AS 5","AS5",1.293619,103.771475],
    ["BIZ 2","BIZ2",1.293223,103.775068],["Opp SDE 3","SDE3-OPP",1.297799,103.769603],
    ["The Japanese Primary School","JP-SCH-16151",1.300770,103.769904],["Kent Vale","KV",1.301899,103.769455],
    ["Kent Ridge Bus Terminal","KRB",1.294536,103.770000],["Raffles Hall","RAFFLES",1.300946,103.772703]
  ].map(([name,code,lat,lng])=>({name,code,lat,lng}));

  const normal=v=>String(v??"").trim().toLowerCase();

  function renderNusStops(list=NUS_STOPS.slice(0,10)){
    const el=$("#busNusStops");
    el.innerHTML=list.map(s=>`<button type="button" class="bus-popular-stop" data-code="${esc(s.code)}"><span>🚌</span><span>${esc(s.name)}</span></button>`).join("");
    $$(".bus-popular-stop",el).forEach(btn=>btn.onclick=()=>{
      const stop=NUS_STOPS.find(x=>x.code===btn.dataset.code);
      if(stop)selectStop(stop);
    });
  }

  function selectStop(stop){
    $("#busStopSearch").value=stop.name;
    $("#busStopSuggestions").classList.remove("show");
    $("#busNusSelectedName").textContent=stop.name;
    $("#busNusSelectedMeta").textContent=`${stop.code} · Live NUS shuttle source`;
    const url=`https://bus.hewliyang.com/stop/${encodeURIComponent(stop.code)}`;
    $("#busNusOpen").href=url;
    $("#busNusFrame").src=url;
    window.scrollTo({top:document.querySelector(".bus-nus-card")?.offsetTop-20||0,behavior:"smooth"});
  }

  function renderSuggestions(query){
    const el=$("#busStopSuggestions"),q=normal(query);
    if(!q){el.classList.remove("show");el.innerHTML="";return;}
    const tokens=q.split(/\s+/).filter(Boolean);
    const matches=NUS_STOPS.filter(s=>tokens.every(t=>normal(`${s.name} ${s.code}`).includes(t))).slice(0,10);
    el.innerHTML=matches.length
      ?matches.map(s=>`<button type="button" class="bus-suggestion" data-code="${esc(s.code)}"><span>🚌</span><span><b>${esc(s.name)}</b><small>NUS shuttle · ${esc(s.code)}</small></span></button>`).join("")
      :`<div class="bus-suggestion-empty">No matching NUS shuttle stop found.</div>`;
    el.classList.add("show");
    $$(".bus-suggestion",el).forEach(btn=>btn.onclick=()=>{
      const stop=NUS_STOPS.find(x=>x.code===btn.dataset.code);
      if(stop)selectStop(stop);
    });
  }

  function showNearby(){
    const out=$("#nusNearbyResults");
    out.classList.remove("hidden");
    if(!navigator.geolocation){
      out.innerHTML=`<div class="bus-error-state"><h3>Location is unavailable</h3><p>Your browser does not provide location access.</p></div>`;
      return;
    }
    out.innerHTML=`<div class="bus-loading-state"><div class="spinner"></div><h3>Finding nearby NUS stops…</h3></div>`;
    navigator.geolocation.getCurrentPosition(pos=>{
      const {latitude,longitude}=pos.coords;
      const sorted=NUS_STOPS.map(s=>{
        const dy=(s.lat-latitude)*111320;
        const dx=(s.lng-longitude)*111320*Math.cos(latitude*Math.PI/180);
        return {...s,distance:Math.sqrt(dx*dx+dy*dy)};
      }).sort((a,b)=>a.distance-b.distance).slice(0,8);
      out.innerHTML=`<div class="nearby-stop-list">${sorted.map(s=>`
        <button class="nearby-stop" type="button" data-code="${esc(s.code)}">
          <span>🚌</span><span><b>${esc(s.name)}</b><small>${Math.round(s.distance)} m away</small></span>
        </button>`).join("")}</div>`;
      $$(".nearby-stop",out).forEach(btn=>btn.onclick=()=>{
        const stop=NUS_STOPS.find(x=>x.code===btn.dataset.code);
        if(stop){out.classList.add("hidden");selectStop(stop);}
      });
    },()=>{
      out.innerHTML=`<div class="bus-error-state"><h3>Location permission was not granted</h3><p>Allow location access and try again.</p></div>`;
    },{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  }

  $("#busStopSearch").addEventListener("input",e=>renderSuggestions(e.target.value));
  $("#busStopSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const q=normal(e.target.value);const exact=NUS_STOPS.find(s=>normal(s.name)===q||normal(s.code)===q);if(exact)selectStop(exact);else renderSuggestions(e.target.value);}});
  $("#busStopSearchBtn").onclick=()=>{
    const q=normal($("#busStopSearch").value);
    const exact=NUS_STOPS.find(s=>normal(s.name)===q||normal(s.code)===q);
    const match=exact||NUS_STOPS.find(s=>normal(`${s.name} ${s.code}`).includes(q));
    if(match)selectStop(match); else renderSuggestions(q);
  };
  $("#nusNearbyBtn").onclick=showNearby;
  document.addEventListener("click",e=>{if(!e.target.closest(".bus-search-card"))$("#busStopSuggestions")?.classList.remove("show");});

  renderNusStops();

  // Deep-link support from the Maps page:
  // /bus.html?stop=CLB automatically selects the stop, fills the search
  // field, and loads that stop in the live hewliyang source.
  const params=new URLSearchParams(window.location.search);
  const requestedStop=params.get("stop");
  const requestedName=params.get("name");
  if(requestedStop || requestedName){
    const wanted=normal(decodeURIComponent(requestedStop||requestedName||""));
    const nameWanted=normal(decodeURIComponent(requestedName||""));
    const stop=NUS_STOPS.find(x =>
      normal(x.code)===wanted ||
      normal(x.name)===wanted ||
      (nameWanted && normal(x.name)===nameWanted) ||
      normal(`${x.name} ${x.code}`).includes(wanted)
    );
    if(stop) selectStop(stop);
    else selectStop(NUS_STOPS.find(x=>x.code==="CLB")||NUS_STOPS[0]);
  }else{
    selectStop(NUS_STOPS.find(x=>x.code==="CLB")||NUS_STOPS[0]);
  }
});
