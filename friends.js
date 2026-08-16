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
    for(const f of friends){
      const otherLessons=f.lessons||[];
      const keys=new Set(otherLessons.map(lessonKey));
      const shared=myLessons().filter(l=>keys.has(lessonKey(l)));
      if(shared.length)matches.push({friend:f,shared});
    }

    view.innerHTML=`<div class="section-head">
      <div><h2>Friends</h2><div class="subtle">See which friends are in the same lesson or tutorial as you.</div></div>
      <div class="action-row"><button class="secondary" id="manualFriend">＋ Manual friend</button><button class="primary" id="addAppFriend">＋ Add app friend</button></div>
    </div>
    <div class="card"><div class="item-row">
      <div><div class="item-title">Your friend code</div><div class="item-sub">Share this code with another NUS Companion user.</div></div>
      <button class="secondary compact" id="copyCode">Copy</button>
    </div><div class="friend-code" id="myCode">Loading…</div></div>

    ${requests.length?`<div class="section-head"><div><h3>Friend requests</h3></div></div>
    <div class="grid">${requests.map(r=>`<div class="card"><div class="item-title">${esc(r.fromName||"NUS Student")}</div><div class="item-sub">${esc(r.fromFriendCode||"")}</div>
      <div class="action-row"><button class="primary compact accept-request" data-id="${esc(r.fromUid)}">Accept</button><button class="secondary compact reject-request" data-id="${esc(r.fromUid)}">Decline</button></div>
    </div>`).join("")}</div>`:""}

    <div class="section-head"><div><h3>Same lessons</h3><div class="subtle">Friends are grouped together, with every shared lesson listed underneath their name.</div></div></div>
    <div class="grid">${matches.length?matches.map(x=>`
      <div class="card friend-card">
        <div class="item-row"><div><div class="item-title">${esc(x.friend.displayName||x.friend.name||"NUS Student")}</div><div class="item-sub">${esc(x.friend.friendCode||"Manual friend")}</div></div>
        <button class="ghost-btn danger-btn compact remove-friend" data-id="${esc(x.friend.uid)}" data-manual="${x.friend.manual?"1":"0"}">Remove</button></div>
        <div class="lesson-summary">
          ${x.shared.map(l=>`<div><b>${esc(l.module||"")}</b> · ${esc(l.lessonType||"Class")} · Group ${esc(l.classNo||"TBC")}<br>
            <span>${esc(l.day||"Day TBC")} · ${inputTimeToLabel(l.startTime)} – ${inputTimeToLabel(l.endTime)}</span><br>
            <span>${mapLocationLink(l.venue||"")}</span>
          </div>`).join("")}
        </div>
      </div>`).join(""):`<div class="card"><div class="empty">No shared lessons yet. Add a friend to automatically find matching lessons.</div></div>`}</div>`;

    $("#manualFriend").onclick=openManualFriend;
    $("#addAppFriend").onclick=openAppFriend;

    $("#copyCode").onclick=async()=>{
      const c=$("#myCode").textContent.trim();
      if(c && c!=="Loading…"){
        try{await navigator.clipboard.writeText(c);toast("Friend code copied");}
        catch{toast(c);}
      }
    };

    $$(".accept-request").forEach(b=>b.onclick=async()=>{
      try{await window.nusFirebase.acceptFriendRequest({fromUid:b.dataset.id});toast("Friend added");}
      catch(e){toast(e.message||"Could not accept friend request");}
    });

    $$(".reject-request").forEach(b=>b.onclick=async()=>{
      try{await window.nusFirebase.rejectFriendRequest({fromUid:b.dataset.id});toast("Request declined");}
      catch(e){toast(e.message||"Could not decline request");}
    });

    $$(".remove-friend").forEach(b=>b.onclick=async()=>{
      if(!confirm("Remove this friend?"))return;
      try{
        if(b.dataset.manual==="1") removeManualFriend(b.dataset.id);
        else await window.nusFirebase.removeFriend(b.dataset.id);
        toast("Friend removed");
        render();
      }catch(e){toast(e.message||"Could not remove friend");}
    });
  }

  function openManualFriend(){
    const options=myLessons().map((l,i)=>`
      <label class="lesson-option">
        <input type="checkbox" class="manual-lesson-choice" value="${i}">
        <span><b>${esc(l.module||"Unknown")} · ${esc(l.lessonType||"Class")} · Group ${esc(l.classNo||"TBC")}</b>
        <small>${esc(l.day||"Day TBC")} · ${inputTimeToLabel(l.startTime)} – ${inputTimeToLabel(l.endTime)} · ${esc(l.venue||"Venue TBC")}</small></span>
      </label>`).join("");

    openModal(`<h2>Add friend manually</h2>
      <p class="subtle">For friends who do not use NUS Companion. Select every lesson you share with them.</p>
      <form class="form" id="manualFriendForm">
        <label>Friend name<input name="name" placeholder="John Tan" required></label>
        <label>Shared lessons</label>
        <div class="lesson-picker">${options||`<div class="empty">Add your own modules and lesson timings first.</div>`}</div>
        <div class="modal-footer"><button type="button" class="secondary" id="cancelManualFriend">Cancel</button><button class="primary">Add friend</button></div>
      </form>`);

    $("#cancelManualFriend").onclick=closeModal;

    $("#manualFriendForm").onsubmit=e=>{
      e.preventDefault();
      const fd=new FormData(e.target);
      const name=String(fd.get("name")||"").trim();
      const selected=$$(".manual-lesson-choice:checked").map(x=>myLessons()[Number(x.value)]).filter(Boolean);
      if(!name){toast("Enter your friend's name");return;}
      if(!selected.length){toast("Select at least one shared lesson");return;}

      const raw=read("nus_manual_friends",[]);
      const normalName=name.toLowerCase();
      let existing=raw.find(x=>String(x.name||"").trim().toLowerCase()===normalName);
      if(existing){
        const byKey=new Map((existing.lessons||[]).map(l=>[lessonKey(l),l]));
        selected.forEach(l=>byKey.set(lessonKey(l),{...l}));
        existing.lessons=[...byKey.values()];
      }else{
        raw.push({id:`manual-${Date.now()}`,name,lessons:selected.map(l=>({...l}))});
      }
      localStorage.setItem("nus_manual_friends",JSON.stringify(raw));
      loadManual();
      closeModal();
      render();
      toast(existing?"Shared lessons updated":"Manual friend added");
    };
  }

  function loadManual(){
    const raw=read("nus_manual_friends",[]);
    const manual=raw.map(m=>({uid:m.id,displayName:m.name,friendCode:"Manual friend",lessons:m.lessons||[],manual:true}));
    friends=[...friends.filter(f=>!f.manual),...manual];
  }

  function removeManualFriend(id){
    const raw=read("nus_manual_friends",[]).filter(x=>x.id!==id);
    localStorage.setItem("nus_manual_friends",JSON.stringify(raw));
    loadManual();
  }

  function openAppFriend(){
    openModal(`<h2>Add NUS Companion friend</h2>
      <p class="subtle">Ask your friend to open Friends → Your friend code and send you their code.</p>
      <form class="form" id="appFriendForm">
        <label>Friend code<input name="code" placeholder="NUS-ABC12345" autocomplete="off" required></label>
        <div class="modal-footer"><button type="button" class="secondary" id="cancelAppFriend">Cancel</button><button class="primary">Send friend request</button></div>
      </form>
      <div class="small-help">Your friend must accept the request before their timetable can be matched with yours.</div>`);
    $("#cancelAppFriend").onclick=closeModal;
    $("#appFriendForm").onsubmit=async e=>{
      e.preventDefault();
      const code=new FormData(e.target).get("code");
      try{await window.nusFirebase.sendFriendRequest(code);toast("Friend request sent");closeModal();}
      catch(err){toast(err.message||"Could not send friend request");}
    };
  }

  async function loadFriendCode(){
    const el=$("#myCode");
    if(!el)return;
    if(!window.nusFirebase?.user){
      el.textContent="Sign in to get a friend code";
      return;
    }
    try{
      const p=await window.nusFirebase.ensureFriendProfile();
      el.textContent=p.friendCode;
    }catch(e){
      console.error("Friend code setup failed",e);
      el.textContent="Unable to load friend code";
    }
  }

  async function refreshFriendLessons(){
    if(!window.nusFirebase?.db || !window.nusFirebase?.user)return;
    const appFriends=friends.filter(f=>!f.manual);
    for(const f of appFriends){
      try{
        const snap=await window.nusFirebase.db.collection("users").doc(f.uid).collection("sharedTimetable").doc("main").get();
        const data=snap.exists?snap.data():{};
        f.lessons=Array.isArray(data.lessons)?data.lessons:[];
      }catch(e){console.warn("Could not load shared timetable",e);f.lessons=[];}
    }
    render();
  }

  async function init(){
    loadManual();
    render();

    window.addEventListener("nus-auth-changed",async()=>{
      await loadFriendCode();
      if(window.nusFirebase?.user && !stopFriends){
        stopFriends=window.nusFirebase.listenFriends(list=>{
          friends=[...friends.filter(f=>f.manual),...list.map(f=>({...f,lessons:[]}))];
          render();
          refreshFriendLessons();
        },e=>console.error("Friends listener failed",e));

        stopRequests=window.nusFirebase.listenFriendRequests(list=>{
          requests=list;
          render();
        },e=>console.error("Friend requests listener failed",e));

        refreshFriendLessons();
      }
    });

    if(window.nusFirebase?.user){
      await loadFriendCode();
    }
  }

  window.addEventListener("nus-data-changed",()=>{
    loadManual();
    refreshFriendLessons();
  });

  init();
});
