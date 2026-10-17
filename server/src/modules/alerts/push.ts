import type { FastifyBaseLogger } from "fastify";

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
};

/** Per message, in the same order: sent, or the token is no longer valid and should be removed. */
export type PushResult = "sent" | "invalidToken" | "failed";

export type PushSender = (messages: PushMessage[]) => Promise<PushResult[]>;

export const isExpoPushToken = (token: string) => /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);

/** Development: writes messages to the log instead of sending them. */
export const createLogSender =
  (log: FastifyBaseLogger): PushSender =>
  async (messages) => {
    for (const message of messages) {
      log.info({ push: message }, "push notification (not sent, PUSH_MODE=log)");
    }
    return messages.map(() => "sent");
  };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

type ExpoTicket = { status: "ok"; id: string } | { status: "error"; message: string; details?: { error?: string } };

/** Sends through Expo's push service, which delivers to both iOS and Android. */
export const createExpoSender =
  (log: FastifyBaseLogger, accessToken?: string): PushSender =>
  async (messages) => {
    const results: PushResult[] = [];
    for (let start = 0; start < messages.length; start += EXPO_BATCH_SIZE) {
      const batch = messages.slice(start, start + EXPO_BATCH_SIZE);
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            ...(accessToken && { authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify(batch.map((message) => ({ ...message, sound: "default" }))),
        });
        if (!response.ok) {
          log.error({ status: response.status }, "Expo push request failed");
          results.push(...batch.map((): PushResult => "failed"));
          continue;
        }
        const { data } = (await response.json()) as { data: ExpoTicket[] };
        results.push(
          ...batch.map((_, index): PushResult => {
            const ticket = data[index];
            if (ticket?.status === "ok") {
              return "sent";
            }
            return ticket?.details?.error === "DeviceNotRegistered" ? "invalidToken" : "failed";
          }),
        );
      } catch (error) {
        log.error(error, "Expo push request failed");
        results.push(...batch.map((): PushResult => "failed"));
      }
    }
    return results;
  };
