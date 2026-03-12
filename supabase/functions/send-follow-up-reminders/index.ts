import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface PushSubscription {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  product_ids: string[];
  current_step: string;
  stage_entered_at: string;
  follow_up_day: number | null;
  outcome: string;
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

async function sendWebPush(
  subscription: PushSubscription,
  payload: Record<string, unknown>,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  vapidSubject: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(JSON.stringify(payload));

    // Use web-push compatible format for the push service
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
      },
      body: payloadBytes,
    });

    return response.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@superpatch.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: contacts, error: contactsError } = await supabase
      .from("d2c_contacts")
      .select("*")
      .neq("current_step", "closed")
      .not("outcome", "in", '("won","lost")')
      .order("stage_entered_at", { ascending: true });

    if (contactsError || !contacts) {
      return new Response(
        JSON.stringify({ error: contactsError?.message || "No contacts" }),
        { status: 500 },
      );
    }

    const now = new Date();
    const userReminders: Map<string, { contact: Contact; message: string; url: string }[]> =
      new Map();

    for (const contact of contacts as Contact[]) {
      const enteredAt = new Date(contact.stage_entered_at);
      const daysSince = daysBetween(enteredAt, now);
      const step = contact.current_step;

      let shouldNotify = false;
      let message = "";
      let url = `/sales?contactId=${contact.id}`;

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
        existing.push({ contact, message, url });
        userReminders.set(contact.user_id, existing);
      }
    }

    let sentCount = 0;

    for (const [userId, reminders] of userReminders) {
      const { data: subscriptions } = await supabase
        .from("d2c_push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (!subscriptions || subscriptions.length === 0) continue;

      for (const reminder of reminders) {
        const payload = {
          title: `Follow up with ${reminder.contact.first_name}`,
          body: reminder.message,
          data: {
            contactId: reminder.contact.id,
            url: reminder.url,
          },
        };

        for (const sub of subscriptions as PushSubscription[]) {
          const success = await sendWebPush(sub, payload, vapidPrivateKey, vapidPublicKey, vapidSubject);
          if (success) sentCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        usersNotified: userReminders.size,
        notificationsSent: sentCount,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 },
    );
  }
});
