import { logger , UserRow , Database } from "intellisolar-common";
import { extractFcmTokensFromSessions } from "./fcm-tocken-utils";
import { firebaseNotificationQueue } from "../queue/firebase-notification.queue";

interface NotifyUsersParams {
  userIds: string[];
  title: string;
  body: string;
  data: Record<string, string>;
}

export async function notifyUsers({ userIds, title, body, data }: NotifyUsersParams): Promise<void> {
  const uniqueUserIds = Array.from(
    new Set(userIds.filter((id) => typeof id === "string" && id.trim() !== "")),
  );
  if (uniqueUserIds.length === 0) return;

  const usersResult = await Database.query<UserRow>(
    `SELECT id, sessions
     FROM users
     WHERE is_active = TRUE
       AND sessions IS NOT NULL
       AND id = ANY($1::uuid[])`,
    [uniqueUserIds],
  );
 

  const tokens = new Set<string>();
  for (const userRow of usersResult.rows) {
    for (const token of extractFcmTokensFromSessions(userRow.sessions)) {
      tokens.add(token);
    }
  }

  if (tokens.size === 0) {
    logger.info(`notifyUsers — no active FCM tokens found for ${uniqueUserIds.length} user(s).`);
    return;
  }

  const jobs = Array.from(tokens).map((token) => ({
    name: "comment-notification",
    data: { token, title, body, data },
  }));

  await firebaseNotificationQueue.addBulk(jobs);
  logger.info(`notifyUsers — enqueued ${jobs.length} notification job(s).`);
}