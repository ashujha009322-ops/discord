import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface IncomingCallPushPayload {
  title: string;
  body: string;
  url: string;
  callId: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string | null;
  mode: "audio" | "video";
}

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    console.warn(
      "[WebPush] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY.",
    );
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendIncomingCallPushToUser(
  targetUserId: string,
  payload: IncomingCallPushPayload,
): Promise<{ sentCount: number; failedCount: number }> {
  if (!ensureVapidConfigured()) {
    return { sentCount: 0, failedCount: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: targetUserId },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) {
    return { sentCount: 0, failedCount: 0 };
  }

  let sentCount = 0;
  let failedCount = 0;
  const serialized = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          serialized,
          { TTL: 35 },
        );
        sentCount += 1;
      } catch (err: unknown) {
        failedCount += 1;
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? Number((err as { statusCode?: unknown }).statusCode)
            : undefined;

        // Clean up expired or unsubscribed endpoints
        if (statusCode === 404 || statusCode === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } catch (delErr) {
            console.error("[WebPush delete stale sub]", delErr);
          }
        } else {
          console.error("[WebPush sendNotification failed]", err);
        }
      }
    }),
  );

  return { sentCount, failedCount };
}
