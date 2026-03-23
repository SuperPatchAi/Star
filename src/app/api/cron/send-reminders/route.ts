import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";
import type { ContactStep } from "@/lib/db/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/db/types";
import type { NotificationPreferences } from "@/lib/db/types";
import { STALENESS_THRESHOLDS, FOLLOWUP_DAY_OFFSETS } from "@/types/reminders";

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

    const { data: contactRows, error: contactsError } = await supabase
      .from("d2c_contacts")
      .select(
        "id, user_id, first_name, last_name, current_step, stage_entered_at, follow_up_day, outcome"
      )
      .neq("current_step", "closed")
      .neq("outcome", "won")
      .neq("outcome", "lost")
      .order("stage_entered_at", { ascending: true });

    if (contactsError || !contactRows) {
      return NextResponse.json(
        { error: contactsError?.message || "No contacts" },
        { status: 500 }
      );
    }

    const contacts = contactRows as {
      id: string;
      user_id: string;
      first_name: string;
      last_name: string;
      current_step: string;
      stage_entered_at: string;
      follow_up_day: number | null;
      outcome: string | null;
    }[];

    type ReminderType = "followup" | "overdue" | "sample";
    const now = new Date();
    const userReminders = new Map<
      string,
      { contactId: string; name: string; message: string; type: ReminderType }[]
    >();

    for (const contact of contacts) {
      const enteredAt = new Date(contact.stage_entered_at);
      const daysSince = daysBetween(enteredAt, now);
      const step = contact.current_step;

      let shouldNotify = false;
      let message = "";
      let reminderType: ReminderType = "overdue";

      if (step === "followup") {
        const dayIndex = contact.follow_up_day ?? 0;
        if (dayIndex < FOLLOWUP_DAY_OFFSETS.length) {
          const dueOffset = FOLLOWUP_DAY_OFFSETS[dayIndex];
          if (daysSince >= dueOffset) {
            shouldNotify = true;
            message = `DAY ${dueOffset} follow-up due for ${contact.first_name} ${contact.last_name}`;
            reminderType = "followup";
          }
        }
      } else if (step === "samples") {
        const threshold = STALENESS_THRESHOLDS[step as ContactStep];
        if (threshold && daysSince >= threshold) {
          shouldNotify = true;
          message = `${contact.first_name} ${contact.last_name} — check if samples arrived (${daysSince} days)`;
          reminderType = "sample";
        }
      } else {
        const threshold = STALENESS_THRESHOLDS[step as ContactStep];
        if (threshold && daysSince >= threshold) {
          shouldNotify = true;
          message = `${contact.first_name} ${contact.last_name} has been in ${step} for ${daysSince} days`;
          reminderType = "overdue";
        }
      }

      if (shouldNotify) {
        const existing = userReminders.get(contact.user_id) || [];
        existing.push({
          contactId: contact.id,
          name: `${contact.first_name} ${contact.last_name}`,
          message,
          type: reminderType,
        });
        userReminders.set(contact.user_id, existing);
      }
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const [userId, reminders] of userReminders) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileRow } = await (supabase as any)
        .from("user_profiles")
        .select("notification_preferences")
        .eq("id", userId)
        .single();

      const userPrefs = (profileRow?.notification_preferences as NotificationPreferences | null)
        ?? DEFAULT_NOTIFICATION_PREFERENCES;

      const { data: subRows } = await supabase
        .from("d2c_push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

      const subscriptions = (subRows ?? []) as {
        endpoint: string;
        p256dh: string;
        auth: string;
      }[];

      if (subscriptions.length === 0) continue;

      for (const reminder of reminders) {
        if (reminder.type === "followup" && !userPrefs.follow_up_reminders) continue;
        if (reminder.type === "overdue" && !userPrefs.overdue_alerts) continue;
        if (reminder.type === "sample" && !userPrefs.sample_check_ins) continue;
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
