import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

const STALENESS_THRESHOLDS: Record<string, number> = {
  add_contact: 1,
  opening: 2,
  discovery: 2,
  presentation: 3,
  samples: 3,
  objections: 2,
  closing: 2,
};

const FOLLOWUP_DAY_OFFSETS = [1, 3, 7, 14];

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor(
    (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: "VAPID keys not configured" },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(
      "mailto:support@superpatch.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = await createAdminClient();

    const { data: contacts, error: contactsError } = await supabase
      .from("d2c_contacts")
      .select(
        "id, user_id, first_name, last_name, current_step, stage_entered_at, follow_up_day, outcome"
      )
      .neq("current_step", "closed")
      .not("outcome", "in", '("won","lost")')
      .order("stage_entered_at", { ascending: true });

    if (contactsError || !contacts) {
      return NextResponse.json(
        { error: contactsError?.message || "No contacts" },
        { status: 500 }
      );
    }

    const now = new Date();
    const userReminders = new Map<
      string,
      { contactId: string; name: string; message: string }[]
    >();

    for (const contact of contacts) {
      const enteredAt = new Date(contact.stage_entered_at);
      const daysSince = daysBetween(enteredAt, now);
      const step = contact.current_step;

      let shouldNotify = false;
      let message = "";

      if (step === "followup") {
        const dayIndex = contact.follow_up_day ?? 0;
        if (dayIndex < FOLLOWUP_DAY_OFFSETS.length) {
          const dueOffset = FOLLOWUP_DAY_OFFSETS[dayIndex];
          if (daysSince >= dueOffset) {
            shouldNotify = true;
            message = `DAY ${dueOffset} follow-up due for ${contact.first_name} ${contact.last_name}`;
          }
        }
      } else {
        const threshold = STALENESS_THRESHOLDS[step];
        if (threshold && daysSince >= threshold) {
          shouldNotify = true;
          message = `${contact.first_name} ${contact.last_name} has been in ${step} for ${daysSince} days`;
        }
      }

      if (shouldNotify) {
        const existing = userReminders.get(contact.user_id) || [];
        existing.push({
          contactId: contact.id,
          name: `${contact.first_name} ${contact.last_name}`,
          message,
        });
        userReminders.set(contact.user_id, existing);
      }
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const [userId, reminders] of userReminders) {
      const { data: subscriptions } = await supabase
        .from("d2c_push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

      if (!subscriptions || subscriptions.length === 0) continue;

      for (const reminder of reminders) {
        const payload = JSON.stringify({
          title: `Follow up with ${reminder.name}`,
          body: reminder.message,
          data: {
            contactId: reminder.contactId,
            url: `/contacts?openContact=${reminder.contactId}`,
          },
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            sentCount++;
          } catch (err: unknown) {
            failedCount++;
            const statusCode = (err as { statusCode?: number })?.statusCode;
            if (statusCode === 410 || statusCode === 404) {
              await supabase
                .from("d2c_push_subscriptions")
                .delete()
                .eq("endpoint", sub.endpoint)
                .eq("user_id", userId);
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      usersWithReminders: userReminders.size,
      notificationsSent: sentCount,
      notificationsFailed: failedCount,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
