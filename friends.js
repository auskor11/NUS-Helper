document.addEventListener("DOMContentLoaded",()=>{
  const view=document.querySelector(".view");
  let friends=[];
  let requests=[];
  let stopFriends=null,stopRequests=null;

  const lessonKey=l=>`${String(l.module||"").toUpperCase()}|${String(l.lessonType||"Class").toLowerCase()}|${String(l.classNo||l.ClassNo||"TBC").toUpperCase()}`;
  const lessonLabel=l=>`${l.module||"Unknown"} · ${l.lessonType||"Class"} ${l.classNo||l.ClassNo||"TBC"} · ${l.day||"Day TBC"} · ${inputTimeToLabel(l.startTime)} – ${inputTimeToLabel(l.endTime)}`;
  const myLessons=()=>state.lessons||[];

  function render(){
    const matches=[];
    const seen=new Set();
    for(const f of friends){
      const common=myLessons().filter(a=>friends.some(x=>x.uid===f.uid) && false);
      const otherLessons=f.lessons||[];
      const keys=new Set(otherLessons.map(lessonKey));
      const shared=myLessons().filter(l=>keys.has(lessonKey(l)));
      if(shared.length)matches.push({friend:f,shared});
    }
    view.innerHTML=`<div class="section-head"><div><h2>Friends</h2><div class="subtle">See which friends are in the same lesson or tutorial as you.</div></div><div class="action-row"><button class="secondary" id="manualFriend">＋ Manual friend</button><button class="primary" id="addAppFriend">＋ Add app friend</button></div></div>
      <div class="card"><div class="item-row"><div><div class="item-title">Your friend code</div><div class="item-sub">Share this code with another NUS Companion user.</div></div><button class="secondary compact" id="copyCode">Copy</button></div><div class="friend-code" id="myCode">Loading…</div></div>
      ${requests.length?`<div class="section-head"><div><h3>Friend requests</h3></div></div><div class="grid">${requests.map(r=>`<div class="card"><div class="item-title">${esc(r.fromName||"NUS Student")}</div><div class="item-sub">${esc(r.fromFriendCode||"")}</div><div class="action-row"><button class="primary compact accept-request" data-id="${esc(r.fromUid)}">Accept</button><button class="secondary compact reject-request" data-id="${esc(r.fromUid)}">Decline</button></div></div>`).join("")}</div>`:""}
      <div class="section-head"><div><h3>Same lessons</h3><div class="subtle">App friends are matched automatically using your timetable.</div></div></div>
      <div class="grid">${matches.length?matches.map(x=>`<div class="card"><div class="item-row"><div><div class="item-title">${esc(x.friend.displayName||"NUS Student")}</div><div class="item-sub">${esc(x.friend.friendCode||"")}</div></div><button class="ghost-btn danger-btn compact remove-friend" data-id="${esc(x.friend.uid)}">Remove</button></div><div class="lesson-summary">${x.shared.map(l=>`<div><b>${esc(l.lessonType||"Class")}</b> · ${esc(l.module||"")} · Group ${esc(l.classNo||"TBC")}<br><span>${esc(l.day||"Day TBC")} · ${inputTimeToLabel(l.startTime)} – ${inputTimeToLabel(l.endTime)}</span><br><span>${mapLocationLink(l.venue||"")}</span></div>`).join("")}</div></div>`).join(""):`<div class="card"><div class="empty">No shared lessons yet. Add app friends to automatically find matching lessons.</div></div>`}</div>`;

    $("#manualFriend").onclick=openManualFriend;
    $("#addAppFriend").onclick=openAppFriend;
    $("#copyCode").onclick=async()=>{const c=$("#myCode").textContent.trim(); if(c && c!=="Loading…"){try{await navigator.clipboard.writeText(c);toast("Friend code copied")}catch{toast(c)}}};
    $$(".accept-request").forEach(b=>b.onclick=async()=>{try{await window.nusFirebase.acceptFriendRequest({fromUid:b.dataset.id});toast("Friend added");}catch(e){toast(e.message||"Could not accept request")}});
    $$(".reject-request").forEach(b=>b.onclick=async()=>{try{await window.nusFirebase.rejectFriendRequest({fromUid:b.dataset.id});toast("Request declined");}catch(e){toast(e.message||"Could not decline request")}});
    $$(".remove-friend").forEach(b=>b.onclick=async()=>{if(!confirm("Remove this friend?"))return;try{await window.nusFirebase.removeFriend(b.dataset.id);toast("Friend removed");}catch(e){toast(e.message||"Could not remove friend")}});
  }

  function openManualFriend(){
    const options=myLessons().map((l,i)=>`<option value="${i}">${esc(lessonLabel(l))}</option>`).join("");
    openModal(`<h2>Add friend manually</h2><p class="subtle">Use this for friends who do not use NUS Companion. You can assign one or more of your lessons to them.</p><form class="form" id="manualFriendForm"><label>Friend name<input name="name" placeholder="John Tan" required></label><label>Shared lesson<select name="lesson" required><option value="">Select a lesson</option>${options}</select></label><button class="primary">Add friend</button></form>`);
    $("#manualFriendForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target),l=myLessons()[Number(fd.get("lesson"))]; if(!l){toast("Select a lesson");return;} const key=`manual-${Date.now()}`; const raw=read("nus_manual_friends",[]); raw.push({id:key,name:String(fd.get("name")||"").trim(),lessons:[{...l}]}); localStorage.setItem("nus_manual_friends",JSON.stringify(raw)); closeModal(); loadManual(); toast("Manual friend added");};
  }

  function loadManual(){
    const raw=read("nus_manual_friends",[]);
    for(const m of raw){
      const f={uid:m.id,displayName:m.name,friendCode:"Manual",lessons:m.lessons||[],manual:true};
      if(!friends.some(x=>x.uid===f.uid))friends.push(f); else friends=friends.map(x=>x.uid===f.uid?f:x);
    }
  }

  function openAppFriend(){
    openModal(`<h2>Add NUS Companion friend</h2><p class="subtle">Ask your friend to open Account → Friend code and send you their code.</p><form class="form" id="appFriendForm"><label>Friend code<input name="code" placeholder="NUS-ABC12345" autocomplete="off" required></label><button class="primary">Send friend request</button></form><div class="small-help">Your friend must accept the request before their timetable can be matched with yours.</div>`);
    $("#appFriendForm").onsubmit=async e=>{e.preventDefault();const code=new FormData(e.target).get("code");try{await window.nusFirebase.sendFriendRequest(code);toast("Friend request sent");closeModal();}catch(err){toast(err.message||"Could not send friend request")}};
  }

  async function init(){
    render();
    try{const p=await window.nusFirebase.ensureFriendProfile(); $("#myCode").textContent=p.friendCode;}catch(e){$("#myCode").textContent="Sign in to get a friend code";}
    loadManual();
    if(window.nusFirebase?.configured && window.nusFirebase.user){
      stopFriends=window.nusFirebase.listenFriends(list=>{friends=friends.filter(f=>f.manual); friends.push(...list.map(f=>({...f,lessons:[]}))); refreshFriendLessons();},e=>console.error(e));
      stopRequests=window.nusFirebase.listenFriendRequests(list=>{requests=list;render();},e=>console.error(e));
      refreshFriendLessons();
    }
    render();
  }

  async function refreshFriendLessons(){
    if(!window.nusFirebase?.db)return;
    const appFriends=friends.filter(f=>!f.manual);
    for(const f of appFriends){
      try{const snap=await window.nusFirebase.db.collection("users").doc(f.uid).collection("sharedTimetable").doc("main").get(); const data=snap.exists?snap.data():{}; f.lessons=Array.isArray(data.lessons)?data.lessons:[];}catch(e){f.lessons=[];}
    }
    render();
  }

  window.addEventListener("nus-data-changed",()=>refreshFriendLessons());
  init();
});
