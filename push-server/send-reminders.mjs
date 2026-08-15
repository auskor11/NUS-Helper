import admin from "firebase-admin";
import webpush from "web-push";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
if (!serviceAccount.project_id) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid.");
if (!process.env.VAPID_PRIVATE_KEY) throw new Error("VAPID_PRIVATE_KEY is missing.");

admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();

console.log("Service account project_id:", serviceAccount.project_id);
console.log("Service account client_email:", serviceAccount.client_email);
console.log("Admin app project_id:", admin.app().options.credential?.projectId || "(unknown)");
const diagnosticProjectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "(not provided)";
const diagnosticDatabaseId = process.env.FIRESTORE_DATABASE_ID || "(default)";
console.log("=== FIREBASE DIAGNOSTICS ===");
console.log("Project ID:", diagnosticProjectId);
console.log("Firestore database:", diagnosticDatabaseId);
console.log("============================");

const FieldValue = admin.firestore.FieldValue;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:nus-companion@example.com";
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

const TZ = "+08:00";
const MINUTE = 60_000;
const WINDOW = 15 * MINUTE;

function localDateTime(date, time="23:59") {
  if (!date) return NaN;
  return new Date(`${date}T${time || "23:59"}:00${TZ}`).getTime();
}

function fmtDate(date) {
  const d = new Date(`${date}T12:00:00${TZ}`);
  return new Intl.DateTimeFormat("en-SG", {day:"numeric", month:"short", year:"numeric", timeZone:"Asia/Singapore"}).format(d);
}

function reminderForTask(task, now) {
  if (task.done || !task.dueDate) return null;
  const due = localDateTime(task.dueDate, task.dueTime || "23:59");
  if (!Number.isFinite(due)) return null;
  let stage = null;
  let reminder = null;
  if (now >= due) { stage = "overdue"; reminder = due; }
  else if (now >= due - 24*60*MINUTE) { stage = "1d"; reminder = due - 24*60*MINUTE; }
  else if (now >= due - 7*24*60*MINUTE) { stage = "7d"; reminder = due - 7*24*60*MINUTE; }
  if (!stage) return null;
  // Do not send a reminder if its trigger is far in the past. This protects a
  // new installation/subscription from receiving ancient overdue reminders.
  if (now - reminder > WINDOW) return null;
  return {stage, reminder, due, id:`task:${task.id}:${stage}`, title:stage === "overdue" ? "⚠ Overdue task" : `🔔 Task · ${stage === "1d" ? "1 day" : "7 days"}`, body:`${task.title} · Deadline: ${fmtDate(task.dueDate)}${task.dueTime ? `, ${task.dueTime}` : ""}`, href:"/tasks.html"};
}

function nextRecurringOccurrence(activity, now) {
  const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const target=days.indexOf(activity.day);
  if(target<0) return null;
  const base=new Date(now);
  base.setHours(0,0,0,0);
  const delta=(target-base.getDay()+7)%7;
  base.setDate(base.getDate()+delta);
  const date=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,"0")}-${String(base.getDate()).padStart(2,"0")}`;
  let occurrence=localDateTime(date, activity.startTime || "09:00");
  if(occurrence <= now) {
    base.setDate(base.getDate()+7);
    const d=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,"0")}-${String(base.getDate()).padStart(2,"0")}`;
    occurrence=localDateTime(d, activity.startTime || "09:00");
    return {occurrence,date:d};
  }
  return {occurrence,date};
}

function reminderForActivity(activity, now) {
  let occurrenceInfo;
  if (activity.recurring) occurrenceInfo=nextRecurringOccurrence(activity, now);
  else if (activity.date) occurrenceInfo={occurrence:localDateTime(activity.date, activity.startTime || "09:00"), date:activity.date};
  else return null;
  if (!occurrenceInfo || !Number.isFinite(occurrenceInfo.occurrence)) return null;
  const reminder=occurrenceInfo.occurrence-24*60*MINUTE;
  if (now < reminder || now >= occurrenceInfo.occurrence || now-reminder > WINDOW) return null;
  const id=`activity:${activity.id}:${occurrenceInfo.date}:1d`;
  return {id,stage:"1d",reminder,title:"🔔 Activity · 1 day",body:`${activity.name} · ${fmtDate(occurrenceInfo.date)}`,href:"/activities.html"};
}

async function logRef(uid, id) {
  return db.collection("users").doc(uid).collection("notificationLog").doc(encodeURIComponent(id));
}

async function sendForUser(uid, subscriptions, reminders, stats) {
  for (const reminder of reminders) {
    const ref=await logRef(uid, reminder.id);
    const existing=await ref.get();
    if (existing.exists) { stats.skippedLogged++; continue; }

    let delivered=false;
    for (const subDoc of subscriptions) {
      stats.subscriptionAttempts++;
      const subscription=subDoc.data().subscription;
      if(!subscription?.endpoint) { stats.invalidSubscriptions++; continue; }
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: reminder.title,
          body: reminder.body,
          href: reminder.href,
          tag: `nus-${reminder.id}`
        }), {TTL: 3600, urgency:"high"});
        delivered=true;
        stats.pushesSent++;
      } catch (err) {
        const status=err?.statusCode;
        stats.pushesFailed++;
        if(status===404 || status===410) {
          await subDoc.ref.delete().catch(()=>{});
          stats.subscriptionsRemoved++;
        } else {
          console.warn(`Push failed for ${uid}:`, status || err.message || err);
        }
      }
    }
    if(delivered) {
      await ref.set({sentAt:FieldValue.serverTimestamp(), stage:reminder.stage});
      stats.remindersLogged++;
    }
  }
}

async function sendTestForUser(uid, subscriptions, stats) {
  const reminder = {
    id:`test:${Date.now()}:${uid}`,
    stage:"test",
    title:"🧪 NUS Companion test",
    body:"Background push notifications are working.",
    href:"/index.html"
  };

  for (const subDoc of subscriptions) {
    stats.subscriptionAttempts++;
    const subscription=subDoc.data().subscription;
    if(!subscription?.endpoint) { stats.invalidSubscriptions++; continue; }
    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: reminder.title,
        body: reminder.body,
        href: reminder.href,
        tag: "nus-background-push-test"
      }), {TTL: 3600, urgency:"high"});
      stats.pushesSent++;
    } catch (err) {
      const status=err?.statusCode;
      stats.pushesFailed++;
      if(status===404 || status===410) {
        await subDoc.ref.delete().catch(()=>{});
        stats.subscriptionsRemoved++;
      } else {
        console.warn(`Test push failed for ${uid}:`, status || err.message || err);
      }
    }
  }
}
try {
  const collections = await db.listCollections();
  console.log("Top-level collections visible to Admin SDK:", collections.map(c => c.id).join(", ") || "(none)");
} catch (err) {
  console.log("Could not list top-level collections:", err.message || err);
}

const diagnosticUserId = process.env.DIAGNOSTIC_USER_ID || "";
if (diagnosticUserId) {
  const directUserSnap = await db.collection("users").doc(diagnosticUserId).get();
  console.log("Direct diagnostic user read:", directUserSnap.exists ? "EXISTS" : "NOT FOUND");
  if (directUserSnap.exists) {
    const subSnap = await directUserSnap.ref.collection("pushSubscriptions").get();
    console.log("Direct diagnostic user's pushSubscriptions:", subSnap.size);
  }
}
const usersSnap=await db.collection("users").get();
console.log("Firestore users collection exists/readable:", true);
console.log("Firestore users documents:", usersSnap.size);
if (usersSnap.size > 0) {
  console.log("User document IDs found:", usersSnap.docs.map(d => d.id).join(", "));
} else {
  console.log("No documents were returned from /users.");
}
const now=Date.now();
const testMode=String(process.env.PUSH_TEST||"false").toLowerCase()==="true";
const stats={
  usersChecked:usersSnap.size,
  usersWithState:0,
  usersWithSubscriptions:0,
  usersWithReminders:0,
  reminderCandidates:0,
  subscriptionAttempts:0,
  pushesSent:0,
  pushesFailed:0,
  invalidSubscriptions:0,
  subscriptionsRemoved:0,
  remindersLogged:0,
  skippedLogged:0
};

for (const userDoc of usersSnap.docs) {
  const uid=userDoc.id;
  const [stateSnap, subsSnap]=await Promise.all([
    userDoc.ref.collection("appState").doc("main").get(),
    userDoc.ref.collection("pushSubscriptions").get()
  ]);
  if(stateSnap.exists) stats.usersWithState++;
  if(subsSnap.empty) continue;
  stats.usersWithSubscriptions++;

  if(testMode) {
    await sendTestForUser(uid,subsSnap.docs,stats);
    continue;
  }

  if(!stateSnap.exists) continue;
  const state=stateSnap.data() || {};
  const reminders=[];
  for(const task of (state.tasks||[])) { const r=reminderForTask(task,now); if(r)reminders.push(r); }
  for(const activity of (state.activities||[])) { const r=reminderForActivity(activity,now); if(r)reminders.push(r); }
  if(!reminders.length) continue;
  stats.usersWithReminders++;
  stats.reminderCandidates+=reminders.length;
  await sendForUser(uid,subsSnap.docs,reminders,stats);
}

console.log("NUS Companion push check complete.");
console.log(JSON.stringify({
  mode:testMode?"TEST":"REMINDER",
  ...stats
},null,2));
