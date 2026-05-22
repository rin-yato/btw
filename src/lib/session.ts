import { homedir } from "node:os";
import { join } from "node:path";

import { JsonStore } from "@/lib/json-store";

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { err, isErr, ok, type Result } from "@justmiracle/result";
import * as v from "valibot";

const SessionMessageSchema = v.object({
  role: v.string(),
  content: v.union([v.string(), v.array(v.any())]),
  timestamp: v.number(),
});

const SessionMessagesSchema = v.array(SessionMessageSchema);

////////////////////////////////////////////////////////////////////////////////////
const REASON_MESSAGES = {
  "load-failed": "Failed to load session data",
  "save-failed": "Failed to save session data",
} as const;

type SessionErrorReason = keyof typeof REASON_MESSAGES;

export class SessionError extends Error {
  declare readonly reason: SessionErrorReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: SessionErrorReason;
    message: string;
    cause?: unknown;
    meta?: Record<string, unknown>;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = this.constructor.name;
    this.reason = opts.reason;
    this.meta = opts.meta ?? {};
  }
}
////////////////////////////////////////////////////////////////////////////////////

export function getSessionDir(): string {
  const xdg = process.env.XDG_CACHE_HOME;
  if (xdg) return join(xdg, "btw", "sessions");
  return join(homedir(), ".cache", "btw", "sessions");
}

export function getGlobalSessionDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "btw", "sessions");
  return join(homedir(), ".config", "btw", "sessions");
}

export class SessionService {
  constructor(
    private storeFactory: (sessionId: string) => JsonStore = (id) => {
      if (id === "GLOBAL") {
        return new JsonStore({ dir: getGlobalSessionDir(), filename: "GLOBAL.json" });
      }
      return new JsonStore({ dir: getSessionDir(), filename: `${id}.json` });
    },
  ) {}

  getSessionId(mode: "global" | "per-terminal"): string | undefined {
    if (mode === "per-terminal") return process.env.BTW_SESSION_ID;
    return "GLOBAL";
  }

  async loadMessages(sessionId: string): Promise<Result<AgentMessage[], SessionError>> {
    const store = this.storeFactory(sessionId);
    const result = await store.read();

    if (isErr(result)) {
      if (result.error.reason === "not-found" || result.error.reason === "parse") return ok([]);
      return err(
        new SessionError({
          reason: "load-failed",
          message: REASON_MESSAGES["load-failed"],
          cause: result.error,
          meta: { sessionId },
        }),
      );
    }

    const parsed = v.safeParse(SessionMessagesSchema, result.value);
    if (!parsed.success) return ok([]);

    return ok(parsed.output as AgentMessage[]);
  }

  async saveMessages(
    sessionId: string,
    messages: AgentMessage[],
  ): Promise<Result<void, SessionError>> {
    const store = this.storeFactory(sessionId);
    const result = await store.write(messages);

    if (isErr(result)) {
      return err(
        new SessionError({
          reason: "save-failed",
          message: REASON_MESSAGES["save-failed"],
          cause: result.error,
          meta: { sessionId },
        }),
      );
    }

    return ok(undefined);
  }
}
