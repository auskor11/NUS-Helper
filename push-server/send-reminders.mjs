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
const WINDOW = 2 * 60 * MINUTE;

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

async function sendForUser(uid, subscriptions, reminders) {
  for (const reminder of reminders) {
    const ref=await logRef(uid, reminder.id);
    const existing=await ref.get();
    if (existing.exists) continue;

    let delivered=false;
    for (const subDoc of subscriptions) {
      const subscription=subDoc.data().subscription;
      if(!subscription?.endpoint) continue;
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: reminder.title,
          body: reminder.body,
          href: reminder.href,
          tag: `nus-${reminder.id}`
        }), {TTL: 3600, urgency:"high"});
        delivered=true;
      } catch (err) {
        const status=err?.statusCode;
        if(status===404 || status===410) {
          await subDoc.ref.delete().catch(()=>{});
        } else {
          console.warn(`Push failed for ${uid}:`, status || err.message || err);
        }
      }
    }
    if(delivered) await ref.set({sentAt:FieldValue.serverTimestamp(), stage:reminder.stage});
  }
}

const usersSnap=await db.collection("users").get();
const now=Date.now();
let users=0, sent=0;
for (const userDoc of usersSnap.docs) {
  const uid=userDoc.id;
  const [stateSnap, subsSnap]=await Promise.all([
    userDoc.ref.collection("appState").doc("main").get(),
    userDoc.ref.collection("pushSubscriptions").get()
  ]);
  if(!stateSnap.exists || subsSnap.empty) continue;
  const state=stateSnap.data() || {};
  const reminders=[];
  for(const task of (state.tasks||[])) { const r=reminderForTask(task,now); if(r)reminders.push(r); }
  for(const activity of (state.activities||[])) { const r=reminderForActivity(activity,now); if(r)reminders.push(r); }
  if(!reminders.length) continue;
  users++;
  await sendForUser(uid,subsSnap.docs,reminders);
  sent+=reminders.length;
}
console.log(`NUS Companion push check complete. Users with reminders: ${users}; reminder candidates: ${sent}.`);
