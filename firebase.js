/* NUS Companion V15 - Firebase Auth bootstrap.
   Important: the app waits for Firebase's FIRST onAuthStateChanged callback
   before deciding whether the user is logged in. This prevents the
   /login.html <-> /index.html redirect loop caused by checking too early.
*/
(function(){
  const SDK="https://www.gstatic.com/firebasejs/12.16.0";

  window.nusFirebase={
    configured:false,user:null,error:null,
    async signInGoogle(){throw new Error("Firebase is not configured.");},
    async signInEmail(){throw new Error("Firebase is not configured.");},
    async registerEmail(){throw new Error("Firebase is not configured.");},
    async signOut(){throw new Error("Firebase is not configured.");},
    async saveState(){throw new Error("Firebase is not configured.");},
    async loadState(){return null;},
    async savePushSubscription(){throw new Error("Firebase is not configured.");},
    async removePushSubscription(){throw new Error("Firebase is not configured.");},
    startStateSync(){return ()=>{};}
  };

  let resolveAuthReady;
  window.nusAuthReady=new Promise(resolve=>{resolveAuthReady=resolve;});

  function valid(c){
    return c && ["apiKey","authDomain","projectId","appId"].every(k=>c[k]) &&
      !Object.values(c).some(v=>String(v).includes("YOUR_"));
  }

  async function getConfig(){
    if(valid(window.NUS_FIREBASE_CONFIG)) return window.NUS_FIREBASE_CONFIG;
    try{
      const r=await fetch("/__/firebase/init.json",{cache:"no-store"});
      if(r.ok){
        const c=await r.json();
        if(valid(c)) return c;
      }
    }catch(e){console.warn("Firebase Hosting config unavailable",e);}
    return null;
  }

  window.nusFirebaseReady=getConfig().then(async config=>{
    if(!config){
      const err=new Error(
        "Firebase Web App configuration was not found. Register a Web App in Firebase Console and deploy this project with Firebase Hosting, or add its config to firebase-config.js."
      );
      window.nusFirebase.error=err;
      resolveAuthReady(null);
      window.dispatchEvent(new CustomEvent("nus-firebase-error",{detail:err}));
      return null;
    }

    try{
      await import(`${SDK}/firebase-app-compat.js`);
      await import(`${SDK}/firebase-auth-compat.js`);
      await import(`${SDK}/firebase-firestore-compat.js`);

      // On Firebase Hosting's *.web.app domain, using the default
      // *.firebaseapp.com authDomain can cause redirect sign-in to lose its
      // auth state on mobile browsers that block third-party storage.
      // Firebase recommends using the domain that actually serves the app.
      // We only override it for Firebase Hosting domains; a custom domain
      // keeps the configured authDomain unless the developer changes it in
      // Firebase Console.
      const host=window.location.hostname;
      const hostingAuthDomain =
        host.endsWith(".web.app") || host.endsWith(".firebaseapp.com")
          ? host
          : null;

      const runtimeConfig={...config};
      if(hostingAuthDomain) runtimeConfig.authDomain=hostingAuthDomain;

      const app=window.firebase.initializeApp(runtimeConfig);
      const auth=app.auth();
      const db=app.firestore();
      const provider=new window.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({prompt:"select_account"});

      // Make browser persistence explicit. LOCAL is the default, but being
      // explicit prevents accidental session-only behaviour.
      await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);

      // IMPORTANT for mobile redirect sign-in:
      // signInWithRedirect() returns after the browser leaves the page.
      // When the user comes back, getRedirectResult() must be checked
      // explicitly. Relying only on onAuthStateChanged is not sufficient for
      // all mobile browsers.
      let redirectResult=null;
      let redirectError=null;
      try{
        redirectResult=await auth.getRedirectResult();
      }catch(e){
        redirectError=e;
        console.error("Firebase redirect sign-in failed",e);
      }

      const api={
        configured:true,app,auth,db,user:null,error:null,
        async signInGoogle(){
          const ios=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);

          // iOS browsers, including Brave, are more reliable with the
          // full-page redirect flow than a popup.
          if(ios) return auth.signInWithRedirect(provider);

          try{
            const result=await auth.signInWithPopup(provider);
            api.user=result.user;
            return result.user;
          }catch(e){
            if(["auth/popup-blocked","auth/operation-not-supported-in-this-environment"].includes(e.code)){
              return auth.signInWithRedirect(provider);
            }
            throw e;
          }
        },
        async signInEmail(email,password){
          const result=await auth.signInWithEmailAndPassword(email,password);
          api.user=result.user;
          return result.user;
        },
        async registerEmail(email,password){
          const result=await auth.createUserWithEmailAndPassword(email,password);
          api.user=result.user;
          return result.user;
        },
        async signOut(){return auth.signOut();},
        async saveState(snapshot){
          if(!api.user) throw new Error("You are not signed in.");
          const userRef=db.collection("users").doc(api.user.uid);
          await userRef.set({
            uid:api.user.uid,
            email:api.user.email || null,
            updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
          },{merge:true});
          await userRef.collection("appState").doc("main").set({
            modules:snapshot.modules||[],
            lessons:snapshot.lessons||[],
            activities:snapshot.activities||[],
            tasks:snapshot.tasks||[],
            semester:snapshot.semester||{},
            manualFriends:snapshot.manualFriends||[],
            clientUpdatedAt:Date.now(),
            updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
          },{merge:true});
          // Timetable sharing is secondary. A restrictive rule on this
          // collection must never make the user's private save fail.
          try{
            await userRef.collection("sharedTimetable").doc("main").set({
              lessons:snapshot.lessons||[],
              updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
            },{merge:true});
          }catch(sharedErr){
            console.warn("Shared timetable save failed; private app data was saved.",sharedErr);
          }
        },
        async loadState(){
          if(!api.user)return null;
          const snap=await db.collection("users").doc(api.user.uid).collection("appState").doc("main").get();
          return snap.exists?snap.data():null;
        },
        async savePushSubscription(subscription){
          if(!api.user) throw new Error("You are not signed in.");
          if(!subscription?.endpoint) throw new Error("Invalid push subscription.");
          const userRef=db.collection("users").doc(api.user.uid);
          await userRef.set({
            uid:api.user.uid,
            email:api.user.email || null,
            updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
          },{merge:true});
          const bytes=new TextEncoder().encode(subscription.endpoint);
          const digest=await crypto.subtle.digest("SHA-256",bytes);
          const docId=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
          await db.collection("users").doc(api.user.uid).collection("pushSubscriptions").doc(docId).set({
            subscription:JSON.parse(JSON.stringify(subscription)),
            updatedAt:window.firebase.firestore.FieldValue.serverTimestamp(),
            userAgent:navigator.userAgent
          },{merge:true});
          return docId;
        },
        async ensureFriendProfile(){
          if(!api.user) throw new Error("You are not signed in.");
          const uid=api.user.uid;
          const friendCode=`NUS-${uid.replace(/[^a-zA-Z0-9]/g,"").slice(-8).toUpperCase()}`;
          const ref=db.collection("publicProfiles").doc(uid);
          const profile={
            uid,
            friendCode,
            displayName:api.user.displayName||api.user.email?.split("@")[0]||"NUS Student",
            updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
          };
          await ref.set(profile,{merge:true});
          return {...profile,friendCode};
        },
        async getFriendProfile(friendCode){
          if(!api.user) throw new Error("You are not signed in.");
          const code=String(friendCode||"").trim().toUpperCase();
          if(!code) throw new Error("Enter a friend code.");
          const snap=await db.collection("publicProfiles").where("friendCode","==",code).limit(1).get();
          if(snap.empty) return null;
          return snap.docs[0].data();
        },
        async sendFriendRequest(friendCode){
          if(!api.user) throw new Error("You are not signed in.");
          const target=await api.getFriendProfile(friendCode);
          if(!target) throw new Error("Friend code not found.");
          if(target.uid===api.user.uid) throw new Error("You cannot add yourself.");
          const existing=await db.collection("users").doc(api.user.uid).collection("friends").doc(target.uid).get();
          if(existing.exists) throw new Error("You are already friends.");
          const requestRef=db.collection("users").doc(target.uid).collection("friendRequests").doc(api.user.uid);
          await requestRef.set({
            fromUid:api.user.uid,
            fromName:api.user.displayName||api.user.email?.split("@")[0]||"NUS Student",
            fromFriendCode:(await api.ensureFriendProfile()).friendCode,
            createdAt:window.firebase.firestore.FieldValue.serverTimestamp()
          },{merge:true});
          return target;
        },
        async acceptFriendRequest(request){
          if(!api.user) throw new Error("You are not signed in.");
          const fromUid=String(request?.fromUid||"");
          if(!fromUid) throw new Error("Invalid friend request.");
          const other=await db.collection("publicProfiles").doc(fromUid).get();
          if(!other.exists) throw new Error("That account no longer exists.");
          const me=await api.ensureFriendProfile();
          const batch=db.batch();
          const meRef=db.collection("users").doc(api.user.uid).collection("friends").doc(fromUid);
          const otherRef=db.collection("users").doc(fromUid).collection("friends").doc(api.user.uid);
          batch.set(meRef,{uid:fromUid,displayName:other.data().displayName||"NUS Student",friendCode:other.data().friendCode||null,createdAt:window.firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
          batch.set(otherRef,{uid:api.user.uid,displayName:me.displayName,friendCode:me.friendCode,createdAt:window.firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
          batch.delete(db.collection("users").doc(api.user.uid).collection("friendRequests").doc(fromUid));
          await batch.commit();
        },
        async rejectFriendRequest(request){
          if(!api.user) throw new Error("You are not signed in.");
          const fromUid=String(request?.fromUid||"");
          if(!fromUid) return;
          await db.collection("users").doc(api.user.uid).collection("friendRequests").doc(fromUid).delete();
        },
        async removeFriend(friendUid){
          if(!api.user || !friendUid) return;
          const batch=db.batch();
          batch.delete(db.collection("users").doc(api.user.uid).collection("friends").doc(friendUid));
          batch.delete(db.collection("users").doc(friendUid).collection("friends").doc(api.user.uid));
          await batch.commit();
        },
        listenFriends(onChange,onError){
          if(!api.user)return ()=>{};
          return db.collection("users").doc(api.user.uid).collection("friends").onSnapshot(
            snap=>onChange(snap.docs.map(d=>({uid:d.id,...d.data()}))),onError
          );
        },
        listenFriendRequests(onChange,onError){
          if(!api.user)return ()=>{};
          return db.collection("users").doc(api.user.uid).collection("friendRequests").onSnapshot(
            snap=>onChange(snap.docs.map(d=>({id:d.id,...d.data()}))),onError
          );
        },
        async removePushSubscription(subscription){
          if(!api.user || !subscription?.endpoint)return;
          const bytes=new TextEncoder().encode(subscription.endpoint);
          const digest=await crypto.subtle.digest("SHA-256",bytes);
          const docId=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
          await db.collection("users").doc(api.user.uid).collection("pushSubscriptions").doc(docId).delete();
        }
      };

      window.nusFirebase=api;

      if(redirectResult?.user){
        api.user=redirectResult.user;
      }
      if(redirectError){
        api.error=redirectError;
        window.dispatchEvent(new CustomEvent("nus-firebase-error",{detail:redirectError}));
      }

      let firstState=true;
      auth.onAuthStateChanged(async user=>{
        api.user=user||null;

        if(firstState){
          firstState=false;
          resolveAuthReady(api.user);
        }

        window.dispatchEvent(new CustomEvent("nus-auth-changed",{detail:api.user}));

        if(user){
          try{ await api.ensureFriendProfile(); }catch(e){ console.warn("Friend profile setup failed",e); }
          try{
            const remote=await api.loadState();
            window.dispatchEvent(new CustomEvent("nus-cloud-state",{detail:remote}));
          }catch(e){
            console.error("Firestore load failed",e);
            window.dispatchEvent(new CustomEvent("nus-firebase-error",{detail:e}));
          }
        }
      });

      return api;
    }catch(e){
      console.error("Firebase initialisation failed",e);
      window.nusFirebase.error=e;
      resolveAuthReady(null);
      window.dispatchEvent(new CustomEvent("nus-firebase-error",{detail:e}));
      return null;
    }
  });
})();
