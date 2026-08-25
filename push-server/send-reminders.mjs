import admin from "firebase-admin";
import webpush from "web-push";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
if (!serviceAccount.project_id) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing or invalid.");
}
if (!process.env.VAPID_PRIVATE_KEY) {
  throw new Error("VAPID_PRIVATE_KEY is missing.");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:nus-companion@example.com";

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const TZ = "Asia/Singapore";
const TZ_OFFSET = "+08:00";
const MINUTE = 60_000;
const WINDOW = 15 * MINUTE;

function localDateTime(date, time = "23:59") {
  if (!date) return NaN;

  return new Date(
    `${date}T${time || "23:59"}:00${TZ_OFFSET}`
  ).getTime();
}

function fmtDate(date) {
  const d = new Date(`${date}T12:00:00${TZ_OFFSET}`);

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ
  }).format(d);
}

function fmtTime(time) {
  return time ? `, ${time}` : "";
}

function datePartsInSingapore(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  }).formatToParts(date);

  const get = type =>
    parts.find(p => p.type === type)?.value;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday")
  };
}

function addDaysISO(dateString, days) {
  const d = new Date(
    `${dateString}T12:00:00${TZ_OFFSET}`
  );

  d.setUTCDate(d.getUTCDate() + days);

  return `${d.getUTCFullYear()}-${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function weekdayForISO(dateString) {
  const d = new Date(
    `${dateString}T12:00:00${TZ_OFFSET}`
  );

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: TZ
  }).format(d);
}

function nextWeeklyOccurrence(day, startTime, now) {
  const target = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ].indexOf(day);

  if (target < 0) return null;

  const today = datePartsInSingapore(now);

  const todayISO =
    `${today.year}-${String(today.month).padStart(2, "0")}-${String(
      today.day
    ).padStart(2, "0")}`;

  const todayDate = new Date(
    `${todayISO}T12:00:00${TZ_OFFSET}`
  );

  const todayIndex = todayDate.getUTCDay();

  let delta = (target - todayIndex + 7) % 7;

  let date = addDaysISO(todayISO, delta);

  let occurrence = localDateTime(
    date,
    startTime || "09:00"
  );

  if (occurrence <= now) {
    date = addDaysISO(date, 7);

    occurrence = localDateTime(
      date,
      startTime || "09:00"
    );
  }

  return {
    date,
    occurrence
  };
}

function scheduleDocumentID(identifier) {
  const data = Buffer.from(identifier, "utf8");

  let hash = 14695981039346656037n;

  for (const byte of data) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(
      64,
      hash * 1099511628211n
    );
  }

  return hash.toString(16);
}

function localTaskNotificationID(task, stage) {
  return `nushelper.task.${task.id}.${stage}.${String(
    task.dueDate
  )
    .replaceAll("-", "")
    .replaceAll(":", "")}${task.dueTime || "2359"}`;
}

function localEventNotificationID(
  prefix,
  id,
  stage,
  date,
  startTime
) {
  const compactDate =
    `${String(date).replaceAll("-", "")}${String(
      startTime || "0900"
    ).replaceAll(":", "")}`;

  return `nushelper.${prefix}.${id}.${stage}.${compactDate}`;
}

function reminderForTask(task, now) {
  if (task.done || !task.dueDate) return null;

  const due = localDateTime(
    task.dueDate,
    task.dueTime || "23:59"
  );

  if (!Number.isFinite(due)) return null;

  const todayNineAM = localDateTime(
    task.dueDate,
    "09:00"
  );

  const todayReminder =
    todayNineAM > now
      ? todayNineAM
      : due - 60 * MINUTE;

  const candidates = [
    {
      stage: "7d",
      reminder: due - 7 * 24 * 60 * MINUTE,
      title: "Task Reminder"
    },
    {
      stage: "1d",
      reminder: due - 24 * 60 * MINUTE,
      title: "Task Reminder"
    },
    {
      stage: "today",
      reminder: todayReminder,
      title: "Task Reminder"
    },
    {
      stage: "deadline",
      reminder: due,
      title: "Task Reminder"
    }
  ];

  const eligible = candidates.filter(
    c =>
      now >= c.reminder &&
      now - c.reminder <= WINDOW
  );

  if (!eligible.length) return null;

  const candidate =
    eligible[eligible.length - 1];

  const moduleText = task.module
    ? ` • ${task.module}`
    : "";

  let body;

  switch (candidate.stage) {
    case "7d":
      body =
        `${task.title}${moduleText} is due in 1 week.`;
      break;

    case "1d":
      body =
        `${task.title}${moduleText} is due tomorrow.`;
      break;

    case "deadline":
      body =
        `${task.title}${moduleText} is due now.`;
      break;

    default:
      body =
        `${task.title}${moduleText} is due today.`;
      break;
  }

  return {
    id: localTaskNotificationID(
      task,
      candidate.stage
    ),
    stage: candidate.stage,
    reminder: candidate.reminder,
    title: candidate.title,
    body,
    href: "/tasks.html"
  };
}

function nextActivityOccurrence(
  activity,
  now
) {
  if (activity.recurring) {
    return nextWeeklyOccurrence(
      activity.day,
      activity.startTime || "09:00",
      now
    );
  }

  if (!activity.date) return null;

  return {
    date: activity.date,
    occurrence: localDateTime(
      activity.date,
      activity.startTime || "09:00"
    )
  };
}

function reminderForActivity(
  activity,
  now
) {
  const occurrenceInfo =
    nextActivityOccurrence(activity, now);

  if (
    !occurrenceInfo ||
    !Number.isFinite(
      occurrenceInfo.occurrence
    )
  ) {
    return null;
  }

  const occurrence =
    occurrenceInfo.occurrence;

  const candidates = [
    {
      stage: "1d",
      reminder:
        occurrence - 24 * 60 * MINUTE,
      title: activity.name,
      body: "Tomorrow"
    },
    {
      stage: "1h",
      reminder:
        occurrence - 60 * MINUTE,
      title: activity.name,
      body: "Starting in 1 hour"
    },
    {
      stage: "start",
      reminder: occurrence,
      title: activity.name,
      body: "Starting now"
    }
  ];

  const candidate =
    candidates.find(
      c =>
        now >= c.reminder &&
        now - c.reminder <= WINDOW &&
        now < occurrence + WINDOW
    );

  if (!candidate) return null;

  const details = [
    activity.module,
    activity.venue
  ]
    .filter(Boolean)
    .join(" • ");

  const body = details
    ? `${candidate.body} • ${details}`
    : candidate.body;

  return {
    id: localEventNotificationID(
      "activity",
      activity.id,
      candidate.stage,
      occurrenceInfo.date,
      activity.startTime
    ),
    stage: candidate.stage,
    reminder: candidate.reminder,
    title: candidate.title,
    body,
    href: "/activities.html"
  };
}

function reminderForLesson(
  lesson,
  now
) {
  const occurrenceInfo =
    nextWeeklyOccurrence(
      lesson.day,
      lesson.startTime || "09:00",
      now
    );

  if (
    !occurrenceInfo ||
    !Number.isFinite(
      occurrenceInfo.occurrence
    )
  ) {
    return null;
  }

  const occurrence =
    occurrenceInfo.occurrence;

  const candidates = [
    {
      stage: "1d",
      reminder:
        occurrence - 24 * 60 * MINUTE,
      body: "Tomorrow"
    },
    {
      stage: "1h",
      reminder:
        occurrence - 60 * MINUTE,
      body: "Starting in 1 hour"
    },
    {
      stage: "start",
      reminder: occurrence,
      body: "Starting now"
    }
  ];

  const candidate =
    candidates.find(
      c =>
        now >= c.reminder &&
        now - c.reminder <= WINDOW &&
        now < occurrence + WINDOW
    );

  if (!candidate) return null;

  const lessonName = lesson.module
    ? `${lesson.module} · ${
        lesson.lessonType || "Class"
      } ${lesson.classNo || ""}`.trim()
    : `${
        lesson.lessonType || "Lesson"
      } ${lesson.classNo || ""}`.trim();

  const details = [
    lesson.module,
    lesson.venue
  ]
    .filter(Boolean)
    .join(" • ");

  const body = details
    ? `${candidate.body} • ${details}`
    : candidate.body;

  return {
    id: localEventNotificationID(
      "lesson",
      lesson.id,
      candidate.stage,
      occurrenceInfo.date,
      lesson.startTime
    ),
    stage: candidate.stage,
    reminder: candidate.reminder,
    title: lessonName,
    body,
    href: "/calendar.html"
  };
}

function notificationPayload(reminder) {
  return {
    notification: {
      title: reminder.title,
      body: reminder.body
    },

    data: {
      href: reminder.href,
      reminderId: reminder.id,
      type: reminder.id.split(":")[0]
    },

    apns: {
      headers: {
        "apns-priority": "10"
      },

      payload: {
        aps: {
          sound: "default",
          badge: 1
        }
      }
    }
  };
}

async function sendFCM(
  tokens,
  reminder,
  stats
) {
  for (const tokenDoc of tokens) {
    const token =
      tokenDoc.data().token;

    if (!token) continue;

    stats.fcmAttempts++;

    try {
      await messaging.send({
        token,
        ...notificationPayload(reminder)
      });

      stats.fcmSent++;
    } catch (err) {
      stats.fcmFailed++;

      const code =
        err?.code || "";

      console.warn(
        `FCM failed for ${tokenDoc.ref.path}:`,
        code,
        err?.message || err
      );

      if (
        code ===
          "messaging/registration-token-not-registered" ||
        code ===
          "messaging/invalid-registration-token"
      ) {
        await tokenDoc.ref
          .delete()
          .catch(() => {});

        stats.fcmTokensRemoved++;
      }
    }
  }
}

async function sendWebPush(
  subscriptions,
  reminder,
  stats
) {
  for (const subDoc of subscriptions) {
    const subscription =
      subDoc.data().subscription;

    if (!subscription?.endpoint) continue;

    stats.webAttempts++;

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: reminder.title,
          body: reminder.body,
          href: reminder.href,
          tag: `nus-${reminder.id}`
        }),
        {
          TTL: 3600,
          urgency: "high"
        }
      );

      stats.webSent++;
    } catch (err) {
      stats.webFailed++;

      const status =
        err?.statusCode;

      if (
        status === 404 ||
        status === 410
      ) {
        await subDoc.ref
          .delete()
          .catch(() => {});

        stats.webSubscriptionsRemoved++;
      } else {
        console.warn(
          `Web Push failed for ${subDoc.ref.path}:`,
          status ||
            err?.message ||
            err
        );
      }
    }
  }
}

async function sendForUser(
  uid,
  webSubscriptions,
  fcmTokens,
  localSchedules,
  reminders,
  stats
) {
  for (const reminder of reminders) {
    const localSchedule =
      localSchedules.get(
        reminder.id
      );

    if (localSchedule) {
      const fireAt =
        localSchedule.fireAt?.toMillis
          ? localSchedule.fireAt.toMillis()
          : Number(
              localSchedule.fireAt
            );

      const sameContent =
        localSchedule.title ===
          reminder.title &&
        localSchedule.body ===
          reminder.body;

      if (
        sameContent &&
        Number.isFinite(fireAt) &&
        fireAt >=
          Date.now() - WINDOW
      ) {
        continue;
      }
    }

    const ref = db
      .collection("users")
      .doc(uid)
      .collection("notificationLog")
      .doc(
        encodeURIComponent(
          reminder.id
        )
      );

    const existing =
      await ref.get();

    if (existing.exists) continue;

    const before =
      stats.fcmSent +
      stats.webSent;

    await Promise.all([
      sendWebPush(
        webSubscriptions,
        reminder,
        stats
      ),

      sendFCM(
        fcmTokens,
        reminder,
        stats
      )
    ]);

    const delivered =
      stats.fcmSent +
        stats.webSent >
      before;

    if (delivered) {
      await ref.set({
        sentAt:
          FieldValue.serverTimestamp(),
        stage:
          reminder.stage,
        reminderId:
          reminder.id
      });

      stats.remindersLogged++;
    }
  }
}

async function sendTestForUser(
  uid,
  webSubscriptions,
  fcmTokens,
  stats
) {
  const reminder = {
    id: `test:${Date.now()}:${uid}`,
    stage: "test",
    title: "🧪 NUS Helper test",
    body:
      "Background push notifications are working.",
    href: "/index.html"
  };

  await Promise.all([
    sendWebPush(
      webSubscriptions,
      reminder,
      stats
    ),

    sendFCM(
      fcmTokens,
      reminder,
      stats
    )
  ]);
}

const usersSnap =
  await db
    .collection("users")
    .get();

console.log(
  "Firestore users collection readable:",
  true
);

console.log(
  "Firestore users documents:",
  usersSnap.size
);

const now = Date.now();

const testMode =
  String(
    process.env.PUSH_TEST ||
      "false"
  ).toLowerCase() ===
  "true";

const stats = {
  usersChecked:
    usersSnap.size,

  usersWithSubscriptions: 0,

  webAttempts: 0,
  webSent: 0,
  webFailed: 0,
  webSubscriptionsRemoved: 0,

  fcmAttempts: 0,
  fcmSent: 0,
  fcmFailed: 0,
  fcmTokensRemoved: 0,

  remindersLogged: 0
};

for (const userDoc of usersSnap.docs) {
  const uid =
    userDoc.id;

  const [
    stateSnap,
    subsSnap,
    fcmSnap,
    scheduleSnap
  ] = await Promise.all([
    userDoc.ref
      .collection("appState")
      .doc("main")
      .get(),

    userDoc.ref
      .collection(
        "pushSubscriptions"
      )
      .get(),

    userDoc.ref
      .collection(
        "pushTokens"
      )
      .get(),

    userDoc.ref
      .collection(
        "notificationSchedules"
      )
      .get()
  ]);

  if (
    subsSnap.empty &&
    fcmSnap.empty
  ) {
    continue;
  }

  stats.usersWithSubscriptions++;

  if (testMode) {
    await sendTestForUser(
      uid,
      subsSnap.docs,
      fcmSnap.docs,
      stats
    );

    continue;
  }

  if (!stateSnap.exists) continue;

  const state =
    stateSnap.data() ||
    {};

  const reminders = [];

  for (
    const task of
      state.tasks || []
  ) {
    const reminder =
      reminderForTask(
        task,
        now
      );

    if (reminder) {
      reminders.push(
        reminder
      );
    }
  }

  for (
    const activity of
      state.activities || []
  ) {
    const reminder =
      reminderForActivity(
        activity,
        now
      );

    if (reminder) {
      reminders.push(
        reminder
      );
    }
  }

  for (
    const lesson of
      state.lessons || []
  ) {
    const reminder =
      reminderForLesson(
        lesson,
        now
      );

    if (reminder) {
      reminders.push(
        reminder
      );
    }
  }

  if (!reminders.length) {
    continue;
  }

  const localSchedules =
    new Map();

  for (
    const doc of
      scheduleSnap.docs
  ) {
    const data =
      doc.data() || {};

    if (data.identifier) {
      localSchedules.set(
        data.identifier,
        {
          fireAt:
            data.fireAt,

          title:
            data.title || "",

          body:
            data.body || ""
        }
      );
    }
  }

  await sendForUser(
    uid,
    subsSnap.docs,
    fcmSnap.docs,
    localSchedules,
    reminders,
    stats
  );
}

console.log(
  "NUS Helper background push check complete."
);

console.log(
  JSON.stringify(
    {
      mode: testMode
        ? "TEST"
        : "REMINDER",

      usersChecked:
        stats.usersChecked,

      usersWithSubscriptions:
        stats.usersWithSubscriptions,

      webAttempts:
        stats.webAttempts,

      webSent:
        stats.webSent,

      webFailed:
        stats.webFailed,

      fcmAttempts:
        stats.fcmAttempts,

      fcmSent:
        stats.fcmSent,

      fcmFailed:
        stats.fcmFailed,

      remindersLogged:
        stats.remindersLogged
    },
    null,
    2
  )
);