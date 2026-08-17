let nusMap = null;
let campusLocations = [];
let venueList = null;
let nusmodsVenueCoordinates = null;
let locationMarker = null;
let locationAccuracy = null;
let currentLocationMarker = null;
let currentLocationWatchId = null;
let venueMarker = null;
let googlePlacesReady = null;

const FALLBACK_BUS_STOPS = [
  {
    "name": "COM 3",
    "code": "COM3",
    "lat": 1.294431,
    "lng": 103.775217,
    "public": "",
    "nus": ""
  },
  {
    "name": "Opp TCOMS",
    "code": "TCOMS-OPP",
    "lat": 1.293789,
    "lng": 103.776715,
    "public": "",
    "nus": ""
  },
  {
    "name": "Prince George's Park",
    "code": "PGP",
    "lat": 1.291765,
    "lng": 103.780419,
    "public": "",
    "nus": ""
  },
  {
    "name": "Kent Ridge MRT",
    "code": "KR-MRT",
    "lat": 1.29482,
    "lng": 103.784413,
    "public": "",
    "nus": ""
  },
  {
    "name": "LT 27",
    "code": "LT27",
    "lat": 1.297421,
    "lng": 103.780941,
    "public": "",
    "nus": ""
  },
  {
    "name": "University Hall",
    "code": "UHALL",
    "lat": 1.297127,
    "lng": 103.778822,
    "public": "",
    "nus": ""
  },
  {
    "name": "Opp University Health Centre",
    "code": "UHC-OPP",
    "lat": 1.298788,
    "lng": 103.775612,
    "public": "",
    "nus": ""
  },
  {
    "name": "Museum",
    "code": "MUSEUM",
    "lat": 1.301081,
    "lng": 103.77369,
    "public": "",
    "nus": ""
  },
  {
    "name": "University Town",
    "code": "UTOWN",
    "lat": 1.303876,
    "lng": 103.774621,
    "public": "",
    "nus": ""
  },
  {
    "name": "University Health Centre",
    "code": "UHC",
    "lat": 1.29891,
    "lng": 103.776103,
    "public": "",
    "nus": ""
  },
  {
    "name": "Opp University Hall",
    "code": "UHALL-OPP",
    "lat": 1.297574,
    "lng": 103.778088,
    "public": "",
    "nus": ""
  },
  {
    "name": "S 17",
    "code": "S17",
    "lat": 1.297519,
    "lng": 103.78073,
    "public": "",
    "nus": ""
  },
  {
    "name": "Opp Kent Ridge MRT",
    "code": "KR-MRT-OPP",
    "lat": 1.294962,
    "lng": 103.784556,
    "public": "",
    "nus": ""
  },
  {
    "name": "Prince George's Park Foyer",
    "code": "PGPR",
    "lat": 1.290994,
    "lng": 103.781153,
    "public": "",
    "nus": ""
  },
  {
    "name": "TCOMS",
    "code": "TCOMS",
    "lat": 1.293654,
    "lng": 103.776898,
    "public": "",
    "nus": ""
  },
  {
    "name": "Opp HSSML",
    "code": "HSSML-OPP",
    "lat": 1.292798,
    "lng": 103.774978,
    "public": "",
    "nus": ""
  },
  {
    "name": "Opp NUSS",
    "code": "NUSS-OPP",
    "lat": 1.293208,
    "lng": 103.772618,
    "public": "",
    "nus": ""
  },
  {
    "name": "Ventus",
    "code": "LT13-OPP",
    "lat": 1.29534,
    "lng": 103.770617,
    "public": "",
    "nus": ""
  },
  {
    "name": "Information Technology",
    "code": "IT",
    "lat": 1.297204,
    "lng": 103.772688,
    "public": "",
    "nus": ""
  },
  {
    "name": "Opp Yusof Ishak House",
    "code": "YIH-OPP",
    "lat": 1.298904,
    "lng": 103.774118,
    "public": "",
    "nus": ""
  },
  {
    "name": "Yusof Ishak House",
    "code": "YIH",
    "lat": 1.298885,
    "lng": 103.774377,
    "public": "",
    "nus": ""
  },
  {
    "name": "Central Library",
    "code": "CLB",
    "lat": 1.296544,
    "lng": 103.772569,
    "public": "",
    "nus": ""
  },
  {
    "name": "LT 13",
    "code": "LT13",
    "lat": 1.294552,
    "lng": 103.770635,
    "public": "",
    "nus": ""
  },
  {
    "name": "AS 5",
    "code": "AS5",
    "lat": 1.293619,
    "lng": 103.771475,
    "public": "",
    "nus": ""
  },
  {
    "name": "BIZ 2",
    "code": "BIZ2",
    "lat": 1.293223,
    "lng": 103.775068,
    "public": "",
    "nus": ""
  },
  {
    "name": "Opp SDE 3",
    "code": "SDE3-OPP",
    "lat": 1.297799,
    "lng": 103.769603,
    "public": "",
    "nus": ""
  },
  {
    "name": "The Japanese Primary School",
    "code": "JP-SCH-16151",
    "lat": 1.30077,
    "lng": 103.769904,
    "public": "",
    "nus": ""
  },
  {
    "name": "Kent Vale",
    "code": "KV",
    "lat": 1.301899,
    "lng": 103.769455,
    "public": "",
    "nus": ""
  },
  {
    "name": "Kent Ridge Bus Terminal",
    "code": "KRB",
    "lat": 1.294536,
    "lng": 103.77,
    "public": "",
    "nus": ""
  },
  {
    "name": "Raffles Hall",
    "code": "RAFFLES",
    "lat": 1.300946,
    "lng": 103.772703,
    "public": "",
    "nus": ""
  },
  {
    "name": "College Green",
    "code": "CG",
    "lat": 1.323337,
    "lng": 103.816276,
    "public": "",
    "nus": ""
  },
  {
    "name": "Oei Tiong Ham Building",
    "code": "OTH",
    "lat": 1.319796,
    "lng": 103.817774,
    "public": "",
    "nus": ""
  },
  {
    "name": "Botanic Gardens MRT (PUDO)",
    "code": "BG-MRT",
    "lat": 1.322614,
    "lng": 103.815914,
    "public": "",
    "nus": ""
  }
];

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelector(".view").innerHTML=`
    <div class="section-head">
      <div><h2>NUS Map</h2><div class="subtle">Search venues, see NUS bus stops, or use your live location.</div></div>
      <a class="secondary link-btn" href="https://map.nus.edu.sg/index.php/main/mobile/location" target="_blank" rel="noopener">Official NUS map ↗</a>
    </div>

    <div class="map-tools card">
      <div class="venue-search-row">
        <div class="venue-search-main">
          <label class="search-label">Find a venue</label>
          <div class="venue-search-box">
            <input id="venueSearch" class="modal-search" placeholder="Search LT27, COM1, Bukit Batok MRT, Central Library, your address..." autocomplete="off">
            <button class="primary" id="venueSearchBtn">Search</button>
            <button class="secondary location-btn location-inline-btn" id="myLocationBtn" type="button">◎ My location</button>
          </div>
          <div id="venueResults" class="venue-results"><div class="subtle">Search NUS venues, or any Singapore place/address. NUS locations use NUSMods first; other places use external maps.</div></div>
          <div id="venueError" class="venue-search-error hidden" role="status" aria-live="polite"></div>
        </div>
      </div>
    </div>

    <div class="map-tools card public-bus-search-card">
      <div class="venue-search-row">
        <div class="venue-search-main">
          <label class="search-label" for="publicBusSearch">Find a public bus stop</label>
          <div class="venue-search-box">
            <input id="publicBusSearch" class="modal-search" placeholder="Search bus stop name or code, e.g. 08079 or Kent Ridge MRT..." autocomplete="off">
            <button class="primary" id="publicBusSearchBtn" type="button">Search</button>
          </div>
          <div id="publicBusResults" class="venue-results"><div class="subtle">Search Singapore public bus stops by name, road or 5-digit bus stop code.</div></div>
          <div id="publicBusError" class="venue-search-error hidden" role="status" aria-live="polite"></div>
        </div>
      </div>
        </div>
      </div>
    </div>

    <div class="map-layout">
      <div class="card map-panel map-panel-full"><div id="nusMap"></div></div>
    </div>

    <div class="card map-bus-live-card" id="mapBusLiveCard">
      <div class="bus-live-header">
        <div>
          <div class="kicker">NON-NUS BUS · LIVE ARRIVALS</div>
          <h2 id="mapBusSelectedName">Select a bus stop</h2>
          <div id="mapBusSelectedMeta" class="subtle">Click a yellow bus stop marker to view live public-bus timings.</div>
        </div>
        <button class="secondary compact" id="mapBusRefresh" type="button">Refresh</button>
      </div>
      <div id="mapBusArrivalStatus" class="bus-arrival-status">
        <div class="bus-empty-state"><div class="bus-empty-icon">🚌</div><h3>No public bus stop selected</h3><p>Choose a yellow bus stop on the map.</p></div>
      </div>
    </div>`;

  initCommon();
  initModal();
  initMap();
});



function publicBusSearchMatches(query){
  const q=String(query||"").trim().toLowerCase();
  if(!q)return [];
  const tokens=q.split(/\s+/).filter(Boolean);
  return publicBusStops
    .map(s=>{
      const hay=`${s.code} ${s.name} ${s.road}`.toLowerCase();
      let score=0;
      if(s.code.toLowerCase()===q)score=100;
      else if(s.name.toLowerCase()===q)score=95;
      else if(s.code.toLowerCase().startsWith(q))score=85;
      else if(s.name.toLowerCase().startsWith(q))score=80;
      else if(tokens.every(t=>hay.includes(t)))score=65;
      else if(hay.includes(q))score=45;
      return {...s,score};
    })
    .filter(s=>s.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,8);
}

function showPublicBusSearchResults(matches){
  const box=$("#publicBusResults");
  if(!box)return;
  if(!matches.length){
    box.innerHTML=`<div class="subtle">No public bus stop found. Try the 5-digit bus stop code, stop name, or road name.</div>`;
    box.classList.add("show");
    return;
  }
  box.innerHTML=matches.map(s=>`
    <button type="button" class="venue-result public-bus-result" data-public-code="${esc(s.code)}">
      <span class="venue-result-main"><b>${esc(s.name)}</b><small>${esc(s.code)}${s.road?` · ${esc(s.road)}`:""}</small></span>
    </button>`).join("");
  box.classList.add("show");
  $$(".public-bus-result",box).forEach(btn=>btn.onclick=()=>{
    const stop=publicBusStops.find(x=>x.code===btn.dataset.publicCode);
    if(stop)pinPublicBusStop(stop);
  });
}

function pinPublicBusStop(stop){
  if(!nusMap||!stop)return;

  if(publicSearchMarker){
    publicSearchMarker.remove();
    publicSearchMarker=null;
  }

  const icon=L.divIcon({
    className:"public-bus-search-marker",
    html:`<div class="public-bus-search-icon" title="${esc(stop.name)}" aria-label="Selected public bus stop">🚌</div>`,
    iconSize:[30,30],
    iconAnchor:[15,27],
    popupAnchor:[0,-25]
  });

  publicSearchMarker=L.marker([stop.lat,stop.lng],{
    icon,
    zIndexOffset:12000,
    keyboard:true
  }).addTo(nusMap);

  publicSearchMarker.bindPopup(`
    <div class="bus-popup">
      <b>${esc(stop.name)}</b><br>
      <small>${esc(stop.code)}${stop.road?` · ${esc(stop.road)}`:""}</small><br>
      <button type="button" class="map-bus-link map-selected-public-action">🚍 View public bus timings</button>
    </div>
  `);

  // Attach the handler before opening the popup. Otherwise Leaflet may fire
  // popupopen before the listener exists, leaving the button visually present
  // but inactive until the marker is reopened.
  publicSearchMarker.on("popupopen",()=>{
    const btn=publicSearchMarker.getPopup()?.getElement()?.querySelector(".map-selected-public-action");
    if(btn){
      btn.onclick=(event)=>{
        event.preventDefault();
        event.stopPropagation();
        showPublicBusTimings(stop);
      };
    }
  });
  publicSearchMarker.openPopup();

  $("#publicBusSearch").value=stop.name;
  $("#publicBusResults").classList.remove("show");
  $("#publicBusError").classList.add("hidden");
  nusMap.setView([stop.lat,stop.lng],17,{animate:true});
}

function setupPublicBusSearch(){
  const input=$("#publicBusSearch");
  const btn=$("#publicBusSearchBtn");
  if(!input||!btn)return;

  const run=()=>{
    const q=input.value.trim();
    if(!publicBusStops.length){
      $("#publicBusError").textContent="Public bus stop data is still loading. Please try again in a moment.";
      $("#publicBusError").classList.remove("hidden");
      return;
    }
    const matches=publicBusSearchMatches(q);
    showPublicBusSearchResults(matches);
  };

  btn.onclick=run;
  input.addEventListener("keydown",e=>{
    if(e.key==="Enter"){e.preventDefault();run();}
  });
  input.addEventListener("input",()=>{
    clearTimeout(input._publicSearchTimer);
    const q=input.value.trim();
    if(!q){
      $("#publicBusResults").classList.remove("show");
      return;
    }
    input._publicSearchTimer=setTimeout(run,180);
  });

  document.addEventListener("click",e=>{
    if(!e.target.closest(".public-bus-search-card")){
      $("#publicBusResults")?.classList.remove("show");
    }
  });
}

async function initMap(){
  if(!window.L)return;
  nusMap=L.map("nusMap").setView([1.2966,103.7764],15.5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(nusMap);

  // loadBusStops() depends on campusLocations, so do these sequentially.
  // The previous parallel loading could extract an empty NUS-stop list before
  // the NUS campus map response arrived.
  await loadCampusLocations();
  await loadBusStops();
  await Promise.allSettled([loadPublicBusStops(), loadVenues(), loadNUSModsVenueCoordinates()]);
  googlePlacesReady=loadGooglePlaces();

  setupVenueSearch();
  setupPublicBusSearch();
  $("#myLocationBtn")?.addEventListener("click",locateUser);
  // Request location once, then continuously follow the device without
  // automatically recentering the map.
  startPersistentLocation();

  // Leaflet calculates its dimensions while the mobile drawer may be closed.
  // Recalculate whenever the sidebar changes so the map never paints over it.
  const refreshMapLayout=()=>{
    if(nusMap) setTimeout(()=>nusMap.invalidateSize({animate:false}),280);
  };
  document.addEventListener("click",e=>{
    if(e.target.closest("#menuBtn,#sidebarOpen,#sidebarClose")) refreshMapLayout();
  });
  window.addEventListener("resize",refreshMapLayout);
  renderBusStops();

  // Deep-link support: Home, Calendar, Modules and Activities can link a
  // venue directly to this page. Search it and immediately pin the first
  // matching result.
  const deepLocation=new URLSearchParams(window.location.search).get("location");
  if(deepLocation){
    const target=decodeURIComponent(deepLocation);
    const input=$("#venueSearch");
    if(input) input.value=target;
    await searchVenues(target);
    const firstResult=$(".venue-result");
    if(firstResult) firstResult.click();
  }

  nusMap.on("moveend zoomend",schedulePublicBusMarkers);
  $("#mapBusRefresh")?.addEventListener("click",()=>{
    if(selectedPublicBusStop)showPublicBusTimings(selectedPublicBusStop);
    else toast("Select a public bus stop first");
  });
}

async function loadCampusLocations(){
  try{
    const r=await fetch("https://map.nus.edu.sg/index.php/search/ajax_auto",{cache:"no-store"});
    const text=await r.text();
    const data=JSON.parse(text);
    campusLocations=Array.isArray(data)?data.filter(x=>x&&x.lat&&x.long):[];
  }catch(e){
    campusLocations=[];
  }
}

function extractBusStops(){
  const dynamic=campusLocations
    .filter(x=>x&&x.tbl==="bus_stop"&&Number.isFinite(+x.lat)&&Number.isFinite(+(x.long)))
    .map(x=>({
      name:x.place_name||x.location_name||"NUS Bus Stop",
      code:x.bus_no||x.location_name||"",
      lat:+x.lat,lng:+x.long,
      public:x.sbs_bus||"",
      nus:x.nus_bus||""
    }));
  const combined=[...FALLBACK_BUS_STOPS,...dynamic];
  const seen=new Set();
  return combined.filter(s=>{
    const key=`${String(s.name).trim().toLowerCase()}|${String(s.code).trim()}`;
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}


let allBusStops=[];
let activeRoute="all";
let publicBusStops=[];
let publicBusMarkers=[];
let selectedPublicBusStop=null;
let publicSearchMarker=null;


async function loadBusStops(){
  allBusStops=extractBusStops();
  if(!allBusStops.length){
    allBusStops=FALLBACK_BUS_STOPS.map(x=>({...x}));
  }
}


async function loadPublicBusStops(){
  const urls=[
    "https://data.busrouter.sg/v1/stops.min.json",
    "https://busrouter.sg/data/2/bus-stops.json"
  ];
  for(const url of urls){
    try{
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok)continue;
      const data=await r.json();
      let rows=[];
      if(data && !Array.isArray(data) && !data.features && typeof data==="object"){
        rows=Object.entries(data).map(([code,v])=>{
          if(Array.isArray(v))return {code,lng:Number(v[0]),lat:Number(v[1]),name:v[2]||`Bus Stop ${code}`,road:v[3]||""};
          return {code,lng:Number(v.lng??v.longitude??v.Longitude),lat:Number(v.lat??v.latitude??v.Latitude),name:v.description||v.Description||v.name||`Bus Stop ${code}`,road:v.road||v.RoadName||v.roadName||""};
        });
      }else if(data?.features){
        rows=data.features.map(f=>{
          const p=f.properties||{}, c=f.geometry?.coordinates||[];
          return {code:String(p.number||p.code||p.busStopCode||""),lng:Number(c[0]),lat:Number(c[1]),name:p.name||p.description||`Bus Stop ${p.number||""}`,road:p.road||p.RoadName||""};
        });
      }else if(Array.isArray(data)){
        rows=data.map(x=>({code:String(x.code||x.busStopCode||x.BusStopCode||x.id||x.number||""),name:x.description||x.Description||x.name||x.longName||x.LongName||"",road:x.road||x.RoadName||x.roadName||"",lat:Number(x.lat??x.Latitude??x.latitude),lng:Number(x.lng??x.Longitude??x.longitude)}));
      }
      const seen=new Set();
      publicBusStops=rows.map(x=>({code:String(x.code||"").padStart(5,"0"),name:String(x.name||"").trim(),road:String(x.road||"").trim(),lat:Number(x.lat),lng:Number(x.lng)}))
        .filter(x=>x.code.length===5&&x.name&&Number.isFinite(x.lat)&&Number.isFinite(x.lng))
        .filter(x=>{if(seen.has(x.code))return false;seen.add(x.code);return true;});
      if(publicBusStops.length){
        renderPublicBusMarkers();
        return;
      }
    }catch(e){console.warn("Public bus catalogue failed:",url,e);}
  }
}

function publicBusIcon(){
  return L.divIcon({
    className:"public-bus-marker",
    html:`<div class="public-bus-map-icon" title="Singapore public bus stop" aria-label="Singapore public bus stop">🚌</div>`,
    iconSize:[18,18],iconAnchor:[9,16],popupAnchor:[0,-16]
  });
}

function publicStopOverlapsNus(stop,maxMeters=45){
  return allBusStops.some(n=>{
    const lat=stop.lat*Math.PI/180;
    const dy=(n.lat-stop.lat)*111320;
    const dx=(n.lng-stop.lng)*111320*Math.cos(lat);
    return Math.sqrt(dx*dx+dy*dy)<=maxMeters;
  });
}

let publicMarkerRenderTimer=null;
function schedulePublicBusMarkers(){
  clearTimeout(publicMarkerRenderTimer);
  publicMarkerRenderTimer=setTimeout(renderPublicBusMarkers,180);
}

function renderPublicBusMarkers(){
  if(!nusMap||!publicBusStops.length)return;

  publicBusMarkers.forEach(m=>m.remove());
  publicBusMarkers=[];

  // Only render stops in/near the current viewport. The catalogue is still complete,
  // but we avoid putting thousands of DOM-backed Leaflet markers on the page at once.
  const bounds=nusMap.getBounds().pad(0.20);
  const visible=publicBusStops.filter(s=>bounds.contains([s.lat,s.lng]));

  // At high zoom, show every visible stop. At broad zoom, cap the number of
  // rendered markers to protect mobile devices; zooming in reveals the rest.
  const zoom=nusMap.getZoom();
  let candidates=visible;
  if(zoom<13){
    const center=nusMap.getCenter();
    candidates=visible
      .slice().sort((a,b)=>{
        const da=(a.lat-center.lat)**2+(a.lng-center.lng)**2;
        const db=(b.lat-center.lat)**2+(b.lng-center.lng)**2;
        return da-db;
      }).slice(0,450);
  }else if(zoom<14){
    candidates=visible.slice(0,900);
  }

  candidates.forEach(s=>{
    // If a public stop is also an NUS shuttle stop, keep a single red NUS marker.
    // Its popup contains BOTH timing options.
    if(publicStopOverlapsNus(s))return;

    const marker=L.marker([s.lat,s.lng],{icon:publicBusIcon(),keyboard:true});
    marker.addTo(nusMap);
    marker.bindPopup(`<div class="bus-popup"><b>${esc(s.name)}</b><br><small>${esc(s.code)}${s.road?` · ${esc(s.road)}`:""}</small><br><button type="button" class="map-bus-link map-public-bus-action">🚍 View public bus timings</button></div>`);
    marker.on("popupopen",()=>{
      const btn=marker.getPopup()?.getElement()?.querySelector(".map-public-bus-action");
      if(btn)btn.onclick=()=>showPublicBusTimings(s);
    });
    publicBusMarkers.push(marker);
  });
}
function arrivalLabelMap(item){
  if(!item)return "—";
  const ms=Number(item.duration_ms);
  if(Number.isFinite(ms)){
    const mins=Math.max(0,Math.round(ms/60000));
    return mins===0?"Arriving":`${mins} min`;
  }
  const dt=item.estimatedArrival||item.EstimatedArrival||item.arrival;
  if(dt){
    const diff=new Date(dt).getTime()-Date.now();
    if(Number.isFinite(diff))return diff<=30000?"Arriving":`${Math.max(1,Math.round(diff/60000))} min`;
  }
  return "—";
}

function extractServicesMap(data){
  if(Array.isArray(data))return data;
  if(Array.isArray(data?.services))return data.services;
  if(Array.isArray(data?.service))return data.service;
  if(Array.isArray(data?.value))return data.value;
  return [];
}

async function showPublicBusTimings(stop){
  selectedPublicBusStop=stop;
  $("#mapBusSelectedName").textContent=stop.name;
  $("#mapBusSelectedMeta").textContent=`${stop.code}${stop.road?` · ${stop.road}`:""} · Live public-bus arrivals`;
  $("#mapBusArrivalStatus").innerHTML=`<div class="bus-loading-state"><div class="spinner"></div><h3>Loading live arrivals…</h3><p>Checking buses at ${esc(stop.name)}.</p></div>`;
  $("#mapBusLiveCard")?.scrollIntoView({behavior:"smooth",block:"start"});
  try{
    const r=await fetch(`https://arrivelah2.busrouter.sg/?id=${encodeURIComponent(stop.code)}`,{cache:"no-store"});
    if(!r.ok)throw new Error(`Arrival request returned ${r.status}`);
    const services=extractServicesMap(await r.json());
    if(!services.length)throw new Error("No active services");
    $("#mapBusArrivalStatus").innerHTML=`<div class="arrival-grid">${services.map(s=>{
      const no=s.no||s.serviceNo||s.ServiceNo||s.busNo||s.number||"—";
      const next=s.next||s.NextBus||s.nextBus||{};
      const second=s.subsequent||s.NextBus2||s.nextBus2||{};
      const third=s.subsequent2||s.NextBus3||s.nextBus3||{};
      return `<article class="arrival-card"><div class="arrival-service">${esc(no)}</div>
        <div class="arrival-times"><div><span>Next</span><strong>${esc(arrivalLabelMap(next))}</strong></div>
        <div><span>Then</span><strong>${esc(arrivalLabelMap(second))}</strong></div>
        <div><span>3rd</span><strong>${esc(arrivalLabelMap(third))}</strong></div></div></article>`;
    }).join("")}</div>
    <div class="bus-source-note">Live public-bus data: <a href="https://busrouter.sg/" target="_blank" rel="noopener">BusRouter SG</a>.</div>`;
  }catch(e){
    console.error("Public bus timing lookup failed:",e);
    $("#mapBusArrivalStatus").innerHTML=`<div class="bus-error-state"><h3>Live timings could not be loaded</h3><p>Try Refresh or open the public bus service directly.</p><a class="secondary link-btn" href="https://busrouter.sg/" target="_blank" rel="noopener">Open BusRouter SG ↗</a></div>`;
  }
}

function findNearbyPublicStop(nusStop, maxMeters=45){
  if(!publicBusStops.length)return null;
  const lat=nusStop.lat*Math.PI/180;
  let best=null,bestD=Infinity;
  publicBusStops.forEach(p=>{
    const dy=(p.lat-nusStop.lat)*111320;
    const dx=(p.lng-nusStop.lng)*111320*Math.cos(lat);
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<bestD){bestD=d;best=p;}
  });
  return best && bestD<=maxMeters ? {...best,distance:bestD} : null;
}

function addBusMarker(s){
  const publicMatch=findNearbyPublicStop(s);
  const publicButton=publicMatch
    ? `<br><button type="button" class="map-bus-link map-nus-public-action">🚍 View public bus timings</button>`
    : "";
  const busPage=`/bus.html?stop=${encodeURIComponent(s.code||s.name)}&name=${encodeURIComponent(s.name||"")}`;
  const busIcon=L.divIcon({
    className:"nus-bus-marker",
    html:`<div class="bus-map-icon" title="${esc(s.name)}" aria-label="NUS bus stop">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6" y="4" width="20" height="24" rx="5" fill="#ef4444"/>
        <rect x="9" y="8" width="14" height="8" rx="2" fill="#fff"/>
        <rect x="9" y="18" width="5" height="4" rx="1" fill="#fff"/>
        <rect x="18" y="18" width="5" height="4" rx="1" fill="#fff"/>
        <circle cx="10" cy="27" r="2" fill="#111827"/>
        <circle cx="22" cy="27" r="2" fill="#111827"/>
      </svg>
    </div>`,
    iconSize:[32,32],iconAnchor:[16,30],popupAnchor:[0,-28]
  });
  const marker=L.marker([s.lat,s.lng],{icon:busIcon}).addTo(nusMap);
  marker.bindPopup(`
    <div class="bus-popup">
      <b>${esc(s.name)}</b>
      <br><small>${esc(s.code)}</small>
      ${s.nus?`<br><span class="map-popup-route">NUS shuttle: ${esc(s.nus)}</span>`:""}
      ${s.public?`<br><span>Public bus: ${esc(s.public)}</span>`:""}
      <br><a class="map-bus-link" href="${busPage}">🚌 View NUS shuttle timings</a>
      ${publicButton}
    </div>
  `);
  marker.on("popupopen",()=>{
    if(publicMatch){
      const btn=marker.getPopup()?.getElement()?.querySelector(".map-nus-public-action");
      if(btn)btn.onclick=()=>showPublicBusTimings(publicMatch);
    }
  });
  s.marker=marker;
}

function renderBusStops(){
  if(!nusMap)return;
  allBusStops.forEach(s=>{ if(s.marker) { s.marker.remove(); delete s.marker; } });
  allBusStops.forEach(addBusMarker);
  renderPublicBusMarkers();
}


function filterBusStops(route){
  activeRoute=route;
  $$(".route-chip").forEach(x=>x.classList.toggle("selected",x.dataset.route===route));
  renderBusStops();
}


async function loadNUSModsVenueCoordinates(){
  // NUSMods' optimiser coordinate database is the authoritative source for
  // exact room-level coordinates. Try the raw file first, then GitHub's
  // Contents API because some deployed browsers/CDNs can reject the raw URL.
  const rawUrl="https://raw.githubusercontent.com/nusmodifications/nusmods/master/website/api/optimiser/_constants/venues.json";
  const apiUrl="https://api.github.com/repos/nusmodifications/nusmods/contents/website/api/optimiser/_constants/venues.json?ref=master";
  const errors=[];

  try{
    const r=await fetch(rawUrl,{cache:"no-store"});
    if(!r.ok)throw new Error(`raw URL returned ${r.status}`);
    const text=await r.text();
    if(text.trim().startsWith("<"))throw new Error("raw URL returned HTML instead of JSON");
    const data=JSON.parse(text);
    if(!data || typeof data!=="object" || Array.isArray(data))throw new Error("Invalid NUSMods coordinate database");
    nusmodsVenueCoordinates=data;
    console.info(`Loaded ${Object.keys(data).length} NUSMods venue coordinates from raw GitHub.`);
    return;
  }catch(e){
    errors.push(`raw: ${e.message}`);
  }

  try{
    const r=await fetch(apiUrl,{cache:"no-store",headers:{"Accept":"application/vnd.github+json"}});
    if(!r.ok)throw new Error(`GitHub API returned ${r.status}`);
    const payload=await r.json();
    if(!payload?.content)throw new Error("GitHub API returned no file content");
    const binary=atob(String(payload.content).replace(/\s/g,""));
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(!data || typeof data!=="object" || Array.isArray(data))throw new Error("Invalid decoded NUSMods coordinate database");
    nusmodsVenueCoordinates=data;
    console.info(`Loaded ${Object.keys(data).length} NUSMods venue coordinates via GitHub API.`);
    return;
  }catch(e){
    errors.push(`GitHub API: ${e.message}`);
  }

  nusmodsVenueCoordinates=null;
  console.warn("Could not load NUSMods venue coordinates:",errors.join(" | "));
}

function getNUSModsCoordinates(code){
  if(!nusmodsVenueCoordinates)return null;
  const wanted=normaliseCode(code);

  for(const [key,value] of Object.entries(nusmodsVenueCoordinates)){
    if(normaliseCode(key)!==wanted)continue;
    const x=Number(value?.location?.x);
    const y=Number(value?.location?.y);
    if(Number.isFinite(x)&&Number.isFinite(y)){
      return {
        lat:y,
        lng:x,
        floor:value?.floor ?? null,
        roomName:value?.roomName || "",
        source:"NUSMods venue coordinates"
      };
    }
  }

  return null;
}

async function loadVenues(){
  try{
    const r=await fetch(`${NUSMODS_BASE}/semesters/${SEMESTER}/venues.json`,{cache:"no-store"});
    if(!r.ok) throw new Error(`Venue list returned ${r.status}`);
    const data=await r.json();
    venueList=Array.isArray(data)?data.map(normaliseVenue).filter(Boolean):Object.keys(data||{}).map(k=>normaliseVenue(data[k],k)).filter(Boolean);
  }catch(e){
    venueList=[];
  }
}

function extractVenueCoordinates(v){
  if(!v || typeof v!=="object") return null;

  // Accept the coordinate shapes used by different NUS/NUSMods data versions.
  const pairs=[
    [v.lat, v.lng],
    [v.lat, v.lon],
    [v.latitude, v.longitude],
    [v.latitude, v.lng],
    [v.latitude, v.lon],
    [v.location?.lat, v.location?.lng],
    [v.location?.lat, v.location?.lon],
    [v.coordinates?.lat, v.coordinates?.lng],
    [v.coordinates?.latitude, v.coordinates?.longitude]
  ];

  for(const [lat,lng] of pairs){
    const a=Number(lat), b=Number(lng);
    if(Number.isFinite(a)&&Number.isFinite(b)&&a>=1&&a<=2&&b>=103&&b<=104){
      return {lat:a,lng:b};
    }
  }

  // GeoJSON-style [longitude, latitude].
  if(Array.isArray(v.coordinates)&&v.coordinates.length>=2){
    const lng=Number(v.coordinates[0]), lat=Number(v.coordinates[1]);
    if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=1&&lat<=2&&lng>=103&&lng<=104){
      return {lat,lng};
    }
  }

  return null;
}

function normaliseVenue(v,key=""){
  if(typeof v==="string") return {code:v,name:v,coordinates:null,raw:v};
  if(!v||typeof v!=="object") return key?{code:key,name:key,coordinates:null}:null;

  const code=v.venue||v.code||v.name||v.venueCode||key;
  if(!code)return null;

  return {
    code:String(code),
    name:String(v.name||v.venue||v.location_name||code),
    coordinates:extractVenueCoordinates(v),
    raw:v
  };
}


function loadGooglePlaces(){
  const key=window.NUS_GOOGLE_MAPS_API_KEY;
  if(!key || key.includes("YOUR_")) return Promise.resolve(null);

  if(window.google?.maps?.importLibrary){
    return window.google.maps.importLibrary("places").catch(()=>null);
  }

  return new Promise(resolve=>{
    const script=document.createElement("script");
    script.id="googleMapsScript";
    script.async=true;
    script.defer=true;
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
    let settled=false;
    const finish=value=>{
      if(settled)return;
      settled=true;
      resolve(value);
    };
    script.onload=async()=>{
      try{
        const lib=await Promise.race([
          window.google.maps.importLibrary("places"),
          new Promise(r=>setTimeout(()=>r(null),7000))
        ]);
        finish(lib||null);
      }catch(e){
        console.warn("Google Places library unavailable:",e);
        finish(null);
      }
    };
    script.onerror=()=>finish(null);
    document.head.appendChild(script);
    setTimeout(()=>finish(null),8000);
  });
}

function looksLikeNUSVenueQuery(query){
  const q=String(query||"").trim().toUpperCase();
  return /^(LT|UT|COM|AS|EA|E|SDE|MD|SOC|MPSH|TP|RVRC|PGPR|R|BTC|CLB|NUS)\b/.test(q)
    || q.includes("NUS")
    || q.includes("NATIONAL UNIVERSITY");
}

async function searchPhoton(query){
  const q=String(query||"").trim();
  if(!q)return [];

  try{
    const params=new URLSearchParams({
      q:`${q}, Singapore`,
      limit:"8",
      lang:"en"
    });
    const r=await fetch(`https://photon.komoot.io/api/?${params.toString()}`,{
      headers:{Accept:"application/json"},
      cache:"no-store"
    });
    if(!r.ok) return [];

    const data=await r.json();
    return (data.features||[]).map(f=>{
      const [lng,lat]=f.geometry?.coordinates||[];
      const p=f.properties||{};
      const name=p.name || p.street || q;
      const parts=[p.name,p.street,p.housenumber,p.suburb,p.city,p.country]
        .filter(Boolean);
      return {
        code:name,
        name:parts.join(", ")||q,
        lat:Number(lat),
        lng:Number(lng),
        source:"External map",
        external:true
      };
    }).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng))
      .filter(x=>x.lat>=1&&x.lat<=2&&x.lng>=103&&x.lng<=104);
  }catch(e){
    console.warn("Photon external lookup failed:",e);
    return [];
  }
}

async function searchExternalMap(query){
  const q=String(query||"").trim();
  if(!q)return [];

  // Explicit search: Google first when configured.
  const googleMatches=await searchGooglePlaces(q);
  if(googleMatches.length)return googleMatches;

  // Nominatim is the main no-key geocoder.
  const queries=[q, `${q}, Singapore`];
  const seen=new Set();
  let results=[];

  for(const text of queries){
    try{
      const params=new URLSearchParams({
        q:text,
        format:"jsonv2",
        limit:"8",
        countrycodes:"sg",
        addressdetails:"1"
      });
      const r=await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`,{
        headers:{Accept:"application/json"},
        cache:"no-store"
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
          name:x.display_name||"External map location",
          lat,lng,
          source:"OpenStreetMap",
          external:true
        });
      }
      if(results.length>=8)break;
    }catch(e){
      console.warn("Nominatim lookup failed:",text,e);
    }
  }

  // Photon catches POIs/transit stations that Nominatim may rank poorly.
  if(!results.length){
    results=await searchPhoton(q);
  }

  return results.slice(0,8);
}


async function searchGooglePlaces(query){
  const placesLib=await googlePlacesReady;
  if(!placesLib || !window.google?.maps?.places?.Place)return [];

  try{
    const request={
      textQuery:`${query}${looksLikeNUSVenueQuery(query) ? ", National University of Singapore, Singapore" : ", Singapore"}`,
      fields:["displayName","location","formattedAddress","googleMapsURI"],
      locationBias:{
        center:{lat:1.2966,lng:103.7764},
        radius:5000
      },
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
      lat:typeof place.location?.lat==="function"?place.location.lat():Number(place.location?.lat),
      lng:typeof place.location?.lng==="function"?place.location.lng():Number(place.location?.lng),
      source:"Google Maps",
      googleMapsURI:place.googleMapsURI||""
    })).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  }catch(e){
    console.warn("Google Places search failed:",e);
    return [];
  }
}

function setupVenueSearch(){
  const input=$("#venueSearch"), btn=$("#venueSearchBtn");
  if(!input||!btn)return;

  const run=()=>{
    clearVenueError();
    searchVenues(input.value);
  };
  btn.addEventListener("click",run);
  input.addEventListener("keydown",e=>{if(e.key==="Enter")run();});

  // Local autocomplete only: no request is made while typing.
  // This makes the search bar update immediately without hammering an external API.
  input.addEventListener("input",()=>{
    clearVenueError();
    void renderVenueSuggestions(input.value);
  });
}

function venueCandidates(){
  const byCode=new Map();

  // 1. NUSMods venue list. This is the preferred source when the public
  // semester venue endpoint is available.
  for(const v of (venueList||[])){
    const key=normaliseCode(v.code);
    if(!key)continue;
    const exact=getNUSModsCoordinates(v.code);
    byCode.set(key,{
      code:v.code,
      name:v.name||v.code,
      lat:exact?.lat ?? v.coordinates?.lat ?? null,
      lng:exact?.lng ?? v.coordinates?.lng ?? null,
      floor:exact?.floor ?? null,
      roomName:exact?.roomName || "",
      source:exact ? "NUSMods coordinates" : (v.coordinates ? "NUSMods coordinates" : "NUSMods")
    });
  }

  // 1b. IMPORTANT: the semester venue endpoint can return 404 for a
  // deployment/API version even though the NUSMods optimiser coordinate
  // dataset is available. In that situation, use the coordinate dataset's
  // exact venue keys as the NUS venue search index. This is what fixes
  // room-level venues such as COM1-0120 and COM1-0210.
  if(nusmodsVenueCoordinates && typeof nusmodsVenueCoordinates==="object"){
    for(const [code,value] of Object.entries(nusmodsVenueCoordinates)){
      const key=normaliseCode(code);
      if(!key || byCode.has(key))continue;

      const x=Number(value?.location?.x);
      const y=Number(value?.location?.y);
      if(!Number.isFinite(x)||!Number.isFinite(y))continue;

      byCode.set(key,{
        code:String(code),
        name:String(value?.roomName||code),
        lat:y,
        lng:x,
        floor:value?.floor ?? null,
        roomName:value?.roomName || "",
        source:"NUSMods coordinates"
      });
    }
  }

  // 2. NUS Campus Map fills gaps only. It must never overwrite an exact
  // NUSMods room coordinate.
  for(const x of campusLocations){
    const code=x.place_code||x.location_name||x.place_name;
    const name=x.place_name||x.location_name||code;
    if(!code || x.lat==null || x.long==null)continue;
    const key=normaliseCode(code);
    if(!key)continue;

    if(!byCode.has(key) || !Number.isFinite(Number(byCode.get(key).lat))){
      byCode.set(key,{
        code:String(code),
        name:String(name),
        lat:Number(x.lat),
        lng:Number(x.long),
        source:"NUS Campus Map"
      });
    }
  }

  return [...byCode.values()];
}

async function renderVenueSuggestions(query){
  const q=normaliseCode(query);
  const box=$("#venueResults");
  if(!box)return;

  if(!q){
    box.innerHTML=`<div class="subtle">Start typing an NUS venue, MRT station, landmark, business or Singapore address.</div>`;
    box.classList.remove("hidden");
    return;
  }

  const matches=venueCandidates()
    .map(v=>{
      const code=normaliseCode(v.code), name=normaliseCode(v.name);
      let score=0;
      const directCoords=getNUSModsCoordinates(v.code);
      if(directCoords){
        v.lat=directCoords.lat;
        v.lng=directCoords.lng;
        v.source="NUSMods venue coordinates";
      }
      if(code===q)score=100;
      else if(code.startsWith(q))score=80;
      else if(name.includes(q))score=60;
      else if(code.includes(q))score=40;
      return {...v,score};
    })
    .filter(v=>v.score>0)
    .sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code))
    .slice(0,8);

  if(matches.length){
    box.classList.remove("hidden");
    box.innerHTML=matches.map((v,i)=>`
      <button class="venue-result" data-suggestion="${i}">
        <span><b>${esc(v.code)}</b><small>${esc(v.name)} · ${esc(v.source)}${v.lat!=null&&v.lng!=null?" · coordinates available":" · map lookup"}</small></span><span>⌖</span>
      </button>
    `).join("");

    $$(".venue-result",box).forEach((el,i)=>{
      el.addEventListener("click",()=>focusVenue(matches[i]));
    });
    return;
  }

  // Local data has no match. Don't hammer Google while typing. Use the
  // lightweight public Photon endpoint for autocomplete; the full Search
  // button/Enter path can still use Google first.
  if(String(query).trim().length<3){
    box.innerHTML=`<div class="subtle">No NUS venue match yet. Keep typing for an external map search.</div>`;
    box.classList.remove("hidden");
    return;
  }

  box.innerHTML='<div class="import-box"><div class="spinner"></div>Searching external maps…</div>';
  box.classList.remove("hidden");

  clearTimeout(renderVenueSuggestions.timer);
  renderVenueSuggestions.timer=setTimeout(async()=>{
    const external=await searchPhoton(query);
    if(!external.length){
      box.innerHTML=`<div class="subtle">No NUS venue match. Press Enter/Search to search external maps.</div>`;
      return;
    }

    box.innerHTML=external.map((v,i)=>`
      <button class="venue-result" data-external-suggestion="${i}">
        <span><b>${esc(v.code)}</b><small>${esc(v.name)} · External map</small></span><span>⌖</span>
      </button>
    `).join("");

    $$(".venue-result",box).forEach((el,i)=>{
      el.addEventListener("click",()=>focusVenue(external[i]));
    });
  },450);
}


async function searchVenues(query){
  clearVenueError();
  const q=query.trim();
  if(!nusmodsVenueCoordinates){
    await loadNUSModsVenueCoordinates();
  }
  const box=$("#venueResults");
  if(!box)return;

  if(!q){
    renderVenueSuggestions("");
    return;
  }

  box.innerHTML='<div class="import-box"><div class="spinner"></div>Searching locations…</div>';
  box.classList.remove("hidden");

  try{
    const norm=normaliseCode(q);
    const matches=venueCandidates()
      .map(v=>{
        const code=normaliseCode(v.code), name=normaliseCode(v.name);
        let score=0;
        const directCoords=getNUSModsCoordinates(v.code);
        if(directCoords){
          v.lat=directCoords.lat;
          v.lng=directCoords.lng;
          v.source="NUSMods venue coordinates";
        }
        if(code===norm)score=100;
        else if(code.startsWith(norm))score=80;
        else if(name.includes(norm))score=60;
        else if(code.includes(norm))score=40;
        return {...v,score};
      })
      .filter(v=>v.score>0)
      .sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code))
      .slice(0,12);

    if(matches.length){
      box.innerHTML=matches.map((v,i)=>`
        <button class="venue-result" data-search-result="${i}">
          <span><b>${esc(v.code)}</b><small>${esc(v.name)} · ${esc(v.source)}${v.lat!=null&&v.lng!=null?" · coordinates available":" · map lookup"}</small></span><span>⌖</span>
        </button>
      `).join("");

      $$(".venue-result",box).forEach((el,i)=>el.addEventListener("click",()=>focusVenue(matches[i])));
      return;
    }

    // No NUS/NUSMods match. The same search bar can now search ordinary
    // places and addresses (e.g. Central Library, a cafe, or the user's
    // home address) through an external map provider.
    box.innerHTML='<div class="import-box"><div class="spinner"></div>Searching external maps…</div>';
    const externalMatches=await searchExternalMap(q);

    if(externalMatches.length){
      box.innerHTML=externalMatches.map((v,i)=>`
        <button class="venue-result" data-external-result="${i}">
          <span><b>${esc(v.code)}</b><small>${esc(v.name)} · ${esc(v.source)}</small></span><span>⌖</span>
        </button>
      `).join("");

      $$(".venue-result",box).forEach((el,i)=>el.addEventListener("click",()=>focusVenue(externalMatches[i])));
      return;
    }

    box.innerHTML=`
      <div class="subtle">
        No location was found for <b>${esc(q)}</b>.
        Try a fuller address, such as <b>123 Example Road, Singapore</b>.
      </div>`;
    showVenueError(`Could not find "${q}". Try a fuller address or venue name.`);
  }catch(e){
    console.error("Venue search failed:",e);
    box.innerHTML=`<div class="error-box">Search failed. Please try again.</div>`;
    showVenueError("Location search encountered an error. Your NUS venue search is still available.");
  }
}

function normaliseCode(s){return String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");}


const VENUE_PARENT_FALLBACKS={
  "TPSR1":"UT22","TPSR2":"UT22","TPSR3":"UT22","TPSR4":"UT22","TPSR5":"UT22",
  "TPSR6":"UT22","TPSR7":"UT22","TPSR8":"UT22","TPSR9":"UT22",
  "TPGLR":"UT22"
};

function findLocationForVenue(v){
  const q=normaliseCode(v.code);
  const nameQ=normaliseCode(v.name||"");

  // Highest priority: the same coordinate dataset NUSMods uses for its
  // venue/optimiser map. x is longitude, y is latitude.
  const modsCoordinate=getNUSModsCoordinates(v.code);
  if(modsCoordinate)return modsCoordinate;

  // Next: coordinates that happen to be included in the public NUSMods
  // venue payload.
  const modsMatch=(venueList||[]).find(x=>normaliseCode(x.code)===q);
  if(modsMatch?.coordinates){
    return {
      lat:modsMatch.coordinates.lat,
      lng:modsMatch.coordinates.lng,
      place_name:modsMatch.name,
      location_name:modsMatch.name,
      source:"NUSMods coordinates"
    };
  }

  const candidates=campusLocations.filter(x=>x.lat!=null && x.long!=null);

  let found=candidates.find(x=>normaliseCode(x.place_code)===q);
  if(found)return found;
  found=candidates.find(x=>normaliseCode(x.location_name)===q);
  if(found)return found;
  found=candidates.find(x=>normaliseCode(x.place_name)===q);
  if(found)return found;

  found=candidates.find(x=>{
    const fields=[x.place_code,x.location_name,x.place_name,x.description].map(normaliseCode);
    return fields.some(f=>f===q || (q.length>=4 && f.includes(q)) || (nameQ && f.includes(nameQ)));
  });
  if(found)return found;

  const parent=VENUE_PARENT_FALLBACKS[q];
  if(parent){
    return candidates.find(x=>{
      const fields=[x.place_code,x.location_name,x.place_name].map(normaliseCode);
      return fields.some(f=>f===normaliseCode(parent));
    })||null;
  }

  return null;
}

async function geocodeVenue(v){
  const cacheKey=`nusVenueGeo:${normaliseCode(v.code)}`;

  // Direct NUSMods coordinate fallback.
  const modsCoordinate=getNUSModsCoordinates(v.code);
  if(modsCoordinate){
    return {
      lat:modsCoordinate.lat,
      lng:modsCoordinate.lng,
      displayName:modsCoordinate.roomName||v.name||v.code,
      source:"NUSMods venue coordinates",
      floor:modsCoordinate.floor
    };
  }

  const modsVenue=(venueList||[]).find(x=>normaliseCode(x.code)===normaliseCode(v.code));
  if(modsVenue?.coordinates){
    return {
      lat:modsVenue.coordinates.lat,
      lng:modsVenue.coordinates.lng,
      displayName:modsVenue.name||v.name||v.code,
      source:"NUSMods coordinates"
    };
  }
  try{const cached=sessionStorage.getItem(cacheKey);if(cached)return JSON.parse(cached);}catch{}

  // 1. NUS Campus Map's own search data.
  try{
    const r=await fetch("https://map.nus.edu.sg/index.php/search/ajax_auto",{cache:"no-store"});
    if(r.ok){
      const data=await r.json();
      const q=normaliseCode(v.code);
      const match=data.find(x=>{
        if(x.lat==null||x.long==null)return false;
        const fields=[x.place_code,x.location_name,x.place_name,x.description].map(normaliseCode);
        return fields.some(f=>f===q || (q.length>=4 && f.includes(q)));
      });
      if(match){
        const result={lat:+match.lat,lng:+match.long,displayName:match.place_name||match.location_name||v.name};
        if(Number.isFinite(result.lat)&&Number.isFinite(result.lng)){
          try{sessionStorage.setItem(cacheKey,JSON.stringify(result));}catch{}
          return result;
        }
      }
    }
  }catch(e){console.warn("NUS campus map lookup failed",e);}

  // 2. Nominatim fallback.
  const queries=[
    `${v.code}, National University of Singapore, Singapore`,
    `${v.name||v.code}, National University of Singapore, Singapore`,
    `${v.code}, Kent Ridge, Singapore`
  ];

  for(const q of queries){
    try{
      const params=new URLSearchParams({q,format:"jsonv2",limit:"5",countrycodes:"sg"});
      const r=await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`,{headers:{Accept:"application/json"},cache:"no-store"});
      if(!r.ok)continue;
      const data=await r.json();
      const best=data.find(x=>/national university of singapore|nus|kent ridge/i.test(x.display_name||""))||data[0];
      if(best){
        const result={lat:+best.lat,lng:+best.lon,displayName:best.display_name};
        if(Number.isFinite(result.lat)&&Number.isFinite(result.lng)){
          try{sessionStorage.setItem(cacheKey,JSON.stringify(result));}catch{}
          return result;
        }
      }
    }catch(e){console.warn("Nominatim lookup failed",q,e);}
  }
  return null;
}



function showVenueError(message){
  const el=$("#venueError");
  if(!el)return;
  el.textContent=message;
  el.classList.remove("hidden");
  clearTimeout(showVenueError.timer);
  showVenueError.timer=setTimeout(()=>{
    el.classList.add("hidden");
    el.textContent="";
  },6000);
}

function clearVenueError(){
  const el=$("#venueError");
  if(!el)return;
  clearTimeout(showVenueError.timer);
  el.classList.add("hidden");
  el.textContent="";
}

function hideVenueDropdown(){
  const box=$("#venueResults");
  if(box){
    box.innerHTML="";
    box.classList.add("hidden");
  }
}


function citymapperVenueUrl(position, venue){
  const params=new URLSearchParams();
  if(position && Number.isFinite(position.lat) && Number.isFinite(position.lng)){
    params.set("startcoord",`${position.lat},${position.lng}`);
    params.set("startname","My location");
  }
  params.set("endcoord",`${venue.lat},${venue.lng}`);
  params.set("endname",venue.name||venue.code||"NUS location");
  // Citymapper's Singapore journey planner defaults to public transport.
  return `https://citymapper.com/directions?${params.toString()}`;
}

function openCitymapperForVenue(venue){
  const navigate=(position=null)=>{
    const url=citymapperVenueUrl(position,venue);
    // Use a normal top-level navigation so this works reliably on desktop
    // and mobile browsers, including when the popup is inside Leaflet.
    window.location.assign(url);
  };

  if(!navigator.geolocation){
    navigate();
    return;
  }

  const popupBtn=document.querySelector(".leaflet-popup .map-navigate-btn");
  if(popupBtn){
    popupBtn.disabled=true;
    popupBtn.textContent="Getting location…";
  }

  navigator.geolocation.getCurrentPosition(
    pos=>{
      navigate({
        lat:Number(pos.coords.latitude),
        lng:Number(pos.coords.longitude)
      });
    },
    ()=>{
      // If permission is denied/unavailable, still open Citymapper with
      // the destination. Citymapper can use its own location handling.
      navigate();
    },
    {enableHighAccuracy:true,timeout:8000,maximumAge:30000}
  );
}

async function focusVenue(v){
  hideVenueDropdown();
  clearVenueError();

  // External search results already contain exact coordinates. Use them
  // directly instead of sending them back through the NUS-only lookup chain.
  const directExternal = v?.external || v?.source==="Google Maps" || v?.source==="OpenStreetMap";
  const loc = directExternal && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng))
    ? v
    : findLocationForVenue(v);

  // NUSMods coordinates use { lat, lng } because x=longitude and y=latitude.
  // The NUS Campus Map data uses { lat, long }. Normalise both here before
  // passing coordinates to Leaflet.
  let result=null;
  if(loc){
    const lat=Number(loc.lat ?? loc.latitude ?? loc.y);
    const lng=Number(loc.lng ?? loc.long ?? loc.longitude ?? loc.x);
    if(Number.isFinite(lat)&&Number.isFinite(lng)){
      result={
        lat,
        lng,
        displayName:loc.displayName||loc.roomName||loc.place_name||loc.location_name||v.name,
        source:loc.source||"NUSMods / NUS Campus Map",
        floor:loc.floor ?? null
      };
    }
  }

  if(!result) result=await geocodeVenue(v);

  if(!result){
    showVenueError(`${v.code} could not be located automatically. Try the official NUS map.`);
    return;
  }

  const lat=Number(result.lat);
  const lng=Number(result.lng ?? result.long ?? result.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<1||lat>2||lng<103||lng>104){
    console.error("Invalid venue coordinates",{venue:v,location:loc,result});
    showVenueError(`${v.code} returned invalid map coordinates.`);
    return;
  }

  if(venueMarker) venueMarker.remove();
  venueMarker=L.marker([lat,lng]).addTo(nusMap);
  const sourceLabel=result.source||"Map lookup";
  const floorText=result.floor!=null?`<br><small>Level ${esc(String(result.floor))}</small>`:"";
  const googleLink=v.googleMapsURI
    ? `<br><a href="${esc(v.googleMapsURI)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>`
    : "";
  const displayCode=v.code||v.name||"Location";
  const navVenue={lat,lng,name:v.name||result.displayName||displayCode,code:displayCode};
  venueMarker.bindPopup(`
    <div class="venue-popup">
      <b>${esc(displayCode)}</b><br>
      ${esc(v.name||result.displayName||"")}
      ${floorText}<br>
      <small>${esc(sourceLabel)}</small>
      ${googleLink}
      <br><button type="button" class="map-navigate-btn" data-action="navigate">🧭 Navigate here</button>
      <br><small class="map-navigation-note">Uses your current location and opens Citymapper with public/NUS transit routing.</small>
    </div>
  `);

  // IMPORTANT: bind the popup handler BEFORE opening it. Leaflet can fire
  // popupopen immediately, so attaching the listener after openPopup()
  // can leave the button without an onclick handler.
  venueMarker.on("popupopen",()=>{
    const popupEl=venueMarker.getPopup()?.getElement();
    const btn=popupEl?.querySelector(".map-navigate-btn");
    if(btn){
      btn.onclick=(event)=>{
        event.preventDefault();
        event.stopPropagation();
        openCitymapperForVenue(navVenue);
      };
    }
  });

  // Also delegate the click from the map container. This makes the button
  // robust against Leaflet popup DOM re-renders.
  venueMarker.openPopup();
  nusMap.setView([lat,lng],18,{animate:true});
}


function updatePersistentCurrentLocation(pos){
  if(!nusMap)return;
  const {latitude,longitude}=pos.coords;
  const lat=Number(latitude),lng=Number(longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;

  const icon=L.divIcon({
    className:"persistent-location-marker",
    html:'<span class="persistent-location-pulse"></span><span class="persistent-location-dot"></span>',
    iconSize:[30,30],
    iconAnchor:[15,15]
  });

  if(!currentLocationMarker){
    currentLocationMarker=L.marker([lat,lng],{
      icon,
      interactive:false,
      keyboard:false,
      zIndexOffset:10000
    }).addTo(nusMap);
  }else{
    currentLocationMarker.setLatLng([lat,lng]);
    currentLocationMarker.setIcon(icon);
  }
}

function startPersistentLocation(){
  if(!navigator.geolocation || !nusMap)return;

  if(currentLocationWatchId!==null){
    navigator.geolocation.clearWatch(currentLocationWatchId);
    currentLocationWatchId=null;
  }

  currentLocationWatchId=navigator.geolocation.watchPosition(
    updatePersistentCurrentLocation,
    err=>console.warn("Persistent location unavailable:",err),
    {enableHighAccuracy:true,maximumAge:10000,timeout:15000}
  );
}


function updatePersistentCurrentLocation(pos){
  if(!nusMap || !pos?.coords)return;
  const lat=Number(pos.coords.latitude), lng=Number(pos.coords.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;

  const icon=L.divIcon({
    className:"persistent-location-marker",
    html:'<span class="persistent-location-pulse"></span><span class="persistent-location-dot"></span>',
    iconSize:[32,32],
    iconAnchor:[16,16]
  });

  if(!currentLocationMarker){
    currentLocationMarker=L.marker([lat,lng],{
      icon,
      interactive:false,
      keyboard:false,
      zIndexOffset:20000
    }).addTo(nusMap);
  }else{
    currentLocationMarker.setLatLng([lat,lng]);
  }
}

function startPersistentLocation(){
  if(!navigator.geolocation || !nusMap)return;

  // First request a position explicitly. This makes the permission prompt
  // happen reliably on mobile browsers; once granted, watchPosition keeps
  // the blue dot updated.
  navigator.geolocation.getCurrentPosition(
    pos=>{
      updatePersistentCurrentLocation(pos);

      if(currentLocationWatchId!==null){
        navigator.geolocation.clearWatch(currentLocationWatchId);
      }
      currentLocationWatchId=navigator.geolocation.watchPosition(
        updatePersistentCurrentLocation,
        err=>console.warn("Location watch error:",err),
        {enableHighAccuracy:true,maximumAge:5000,timeout:15000}
      );
    },
    err=>console.warn("Persistent current location unavailable:",err),
    {enableHighAccuracy:true,maximumAge:0,timeout:15000}
  );
}

function locateUser(){
  if(!navigator.geolocation){toast("Location is not supported by this browser.");return;}
  const btn=$("#myLocationBtn");
  btn.disabled=true; btn.textContent="Locating…";
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude,longitude,accuracy}=pos.coords;
    if(locationMarker) locationMarker.remove();
    if(locationAccuracy) locationAccuracy.remove();
    locationMarker=L.marker([latitude,longitude]).addTo(nusMap).bindPopup(`<b>Your location</b><br>Accuracy ±${Math.round(accuracy)} m`).openPopup();
    locationAccuracy=L.circle([latitude,longitude],{radius:accuracy,weight:1,fillOpacity:.08}).addTo(nusMap);
    nusMap.setView([latitude,longitude],17);
    btn.disabled=false; btn.textContent="◎ My location";
  },err=>{
    btn.disabled=false; btn.textContent="◎ My location";
    toast(err.code===1?"Location permission was denied. Please allow location access in Brave.":"Could not determine your location.");
  },{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
}
