import admin from "firebase-admin";
import webpush from "web-push";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
if (!serviceAccount.project_id) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid.");
if (!process.env.VAPID_PRIVATE_KEY) throw new Error("VAPID_PRIVATE_KEY is missing.");

admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();


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

// Assessments from the syllabus: 3 days and 1 day before (at 9am), and on
// the day (2 hours before a timed one, 9am for one with only a date).
function reminderForAssessment(code, a, now) {
  if (!a?.date || (isTaskAssessment(a) && (a.done ?? a.score != null))) return null;   // ticked off in Tasks
  const at = localDateTime(a.date, a.time || "23:59");
  if (!Number.isFinite(at)) return null;
  const nine = localDateTime(a.date, "09:00");
  const dayOf = a.time ? at - 2*60*MINUTE : nine;
  const stages = [["day", dayOf, "today"], ["1d", nine - 24*60*MINUTE, "1 day"], ["3d", nine - 3*24*60*MINUTE, "3 days"]];
  const hit = stages.find(([, when]) => now >= when);
  if (!hit || now > at) return null;
  const [stage, reminder, label] = hit;
  if (now - reminder > WINDOW) return null;
  const w = parseFloat(String(a.weight ?? "").replace(/[^0-9.]/g, ""));
  const slug = String(a.title).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {stage, reminder, due:at, id:`assess:${code}:${slug}:${a.date}:${stage}`, title:`🔔 Assessment · ${label}`,
    body:`${code} ${a.title}${Number.isFinite(w) ? ` (${+w.toFixed(2)}%)` : ""} · ${fmtDate(a.date)}${a.time ? `, ${a.time}` : ""}${a.venue ? ` · ${a.venue}` : ""}`,
    href:`/#/courses/module?code=${encodeURIComponent(code)}&tab=assess`};
}

// Ones you do yourself (online quizzes, assignments): when the window opens.
// Same rule as isTaskAssessment / assessmentOpens in shared.js.
const TASK_ASSESSMENT_TYPES = ["quiz", "assignment", "project", "lab"];
function isTaskAssessment(a) {
  if (!a?.date) return false;
  if (a.task === true) return true;
  if (a.task === false || a.official) return false;
  return TASK_ASSESSMENT_TYPES.includes(a.type) && !(a.time && a.endTime);
}
function assessmentOpensAt(a) {
  if (a?.opens) return String(a.opens).includes("T") ? localDateTime(...String(a.opens).split("T")) : localDateTime(a.opens, "00:00");
  const m = String(a?.notes || "").match(/\bopens?\s+(?:at\s+)?(\d{1,2})[:.]?(\d{2})(?:\s*(am|pm))?(?:\s+(?:on\s+)?(?:the\s+)?(day before|(\d+)\s+days?\s+before))?/i);
  if (!m || !a.date) return NaN;
  let h = +m[1];
  if (m[3]) { if (/pm/i.test(m[3]) && h < 12) h += 12; if (/am/i.test(m[3]) && h === 12) h = 0; }
  const back = m[4] ? (m[5] ? +m[5] : 1) : 0;
  return localDateTime(a.date, "00:00") - back * 24*60*MINUTE + (h*60 + +m[2]) * MINUTE;
}
function reminderForAssessmentOpen(code, a, now) {
  if (!isTaskAssessment(a) || (a.done ?? a.score != null)) return null;
  const opens = assessmentOpensAt(a);
  if (!Number.isFinite(opens) || now < opens || now - opens > WINDOW) return null;
  const slug = String(a.title).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {stage:"open", reminder:opens, due:localDateTime(a.date, a.time || "23:59"), id:`assess:${code}:${slug}:${a.date}:open`,
    title:"🔓 Assessment · open now", body:`${code} ${a.title} is open · due ${fmtDate(a.date)}${a.time ? `, ${a.time}` : ""}`,
    href:"/#/tasks"};
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
    if (existing.exists) { continue; }

    let delivered=false;
    for (const subDoc of subscriptions) {
      stats.subscriptionAttempts++;
      const subscription=subDoc.data().subscription;
      if(!subscription?.endpoint) { continue; }
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
    if(!subscription?.endpoint) { continue; }
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
const usersSnap=await db.collection("users").get();
console.log("Firestore users collection exists/readable:", true);
console.log("Firestore users documents:", usersSnap.size);
if (usersSnap.size > 0) {
  console.log("User document IDs found:", usersSnap.docs.map(d => d.id).join(", "));
} else {
  console.log("No documents were returned from /users.");
}
// MRT/LRT service alerts (LTA DataMall TrainServiceAlerts), when the
// LTA_ACCOUNT_KEY secret is set. Saved per account at users/{uid}/private/mrt
// for the website (LTA blocks browser requests); the key goes to
// users/{uid}/private/lta so the iOS app can ask LTA directly.
async function storeTrainAlerts(){
  const key=process.env.LTA_ACCOUNT_KEY;
  if(!key) return;
  try{
    const res=await fetch("https://datamall2.mytransport.sg/ltaodataservice/TrainServiceAlerts",{headers:{AccountKey:key,accept:"application/json"}});
    if(!res.ok) throw new Error(`LTA ${res.status}`);
    const body=await res.json();
    const doc={value:body.value||{},checkedAt:Date.now()};
    const users=await db.collection("users").listDocuments();
    await Promise.all(users.flatMap(u=>[
      u.collection("private").doc("mrt").set(doc),
      u.collection("private").doc("lta").set({key})
    ]));
    console.log(`MRT status ${doc.value.Status??"?"} saved for ${users.length} account(s).`);
  }catch(err){ console.warn("MRT alerts not updated:",err.message); }
}
await storeTrainAlerts();

const now=Date.now();
const testMode=String(process.env.PUSH_TEST||"false").toLowerCase()==="true";
const stats={
  usersChecked:usersSnap.size,
  usersWithSubscriptions:0,
  subscriptionAttempts:0,
  pushesSent:0,
  pushesFailed:0,
};

for (const userDoc of usersSnap.docs) {
  const uid=userDoc.id;
  const [stateSnap, subsSnap]=await Promise.all([
    userDoc.ref.collection("appState").doc("main").get(),
    userDoc.ref.collection("pushSubscriptions").get()
  ]);
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
  for(const m of (state.syllabus?.modules||[])) for(const a of (m.assessments||[])) {
    for(const r of [reminderForAssessment(m.code,a,now), reminderForAssessmentOpen(m.code,a,now)]) if(r) reminders.push(r);
  }
  if(!reminders.length) continue;
  await sendForUser(uid,subsSnap.docs,reminders,stats);
}

console.log("NUS Companion push check complete.");
console.log(JSON.stringify({
  mode:testMode?"TEST":"REMINDER",
  usersChecked:stats.usersChecked,
  usersWithSubscriptions:stats.usersWithSubscriptions,
  subscriptionAttempts:stats.subscriptionAttempts,
  pushesSent:stats.pushesSent,
  pushesFailed:stats.pushesFailed
},null,2));
