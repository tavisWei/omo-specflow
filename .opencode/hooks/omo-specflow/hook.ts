import type { PluginInput } from "@opencode-ai/plugin";
import { getState, setState, recoverSession } from "./state.js";
import * as fs from "fs/promises";

const DEV_INTENT_PATTERN = /^(我要|帮我|我想)?(开发|构建|实现|添加|新增|build|implement|create|add)\s*(.+)/i;

interface SpeckitIntentState {
    detected: boolean;
    intent: string;
    featureDescription: string;
    fullMatch: string;
    timestamp: number;
    triggered: boolean;
}

const sessionState = new Map<string, SpeckitIntentState>();

const STATE_TTL_MS = 30 * 60 * 1000;
const INTERVIEW_STATE_PATH = ".spec/.interview-state.json";

async function persistInterviewState(sessionId: string, intent: SpeckitIntentState): Promise<void> {
  try {
    await fs.mkdir(".spec", { recursive: true });
    await fs.writeFile(INTERVIEW_STATE_PATH, JSON.stringify({ sessionId, ...intent }, null, 2), "utf-8");
  } catch {
    // Non-critical — interview state persistence is best-effort
  }
}

async function initializeWorkflow(sessionId: string): Promise<void> {
  try {
    const currentState = await getState();
    if (currentState.sessionId === sessionId) {
      await recoverSession(sessionId);
      return;
    }
    await setState({ phase: "constitution", sessionId });
  } catch {
    await setState({ phase: "constitution", sessionId });
  }
}

function cleanupStaleSessions(): void {
    const now = Date.now();
    for (const [sessionID, state] of sessionState) {
        if (now - state.timestamp > STATE_TTL_MS) {
            sessionState.delete(sessionID);
        }
    }
}

setInterval(cleanupStaleSessions, STATE_TTL_MS);

export interface SpeckitIntent {
    detected: boolean;
    intent: string;
    featureDescription: string;
}

export function createSpeckitIntentDetectorHook(ctx: PluginInput): {
    "chat.message": (input: {
        sessionID: string;
        agent?: string;
        model?: {
            providerID: string;
            modelID: string;
        };
        messageID?: string;
        variant?: string;
    }, output: {
        message: Record<string, unknown>;
        parts: Array<{
            type: string;
            text?: string;
            [key: string]: unknown;
        }>;
    }) => Promise<void>;
    dispose: () => void;
} {
    return {
        "chat.message": async (input, output) => {
            const textParts = output.parts
                .filter((part) => part.type === "text" && part.text)
                .map((part) => part.text as string);

            const fullMessage = textParts.join(" ");

            if (fullMessage.length < 3) {
                return;
            }

            const intentMatch = DEV_INTENT_PATTERN.exec(fullMessage);

            if (!intentMatch) {
                return;
            }

            const intent = intentMatch[2];
            const featureDescription = (intentMatch[3] || "").trim();

            if (!featureDescription) {
                return;
            }

            const existingState = sessionState.get(input.sessionID);

            if (existingState?.triggered) {
                return;
            }

            const state: SpeckitIntentState = {
                detected: true,
                intent,
                featureDescription,
                fullMatch: intentMatch[0],
                timestamp: Date.now(),
                triggered: false,
            };

            sessionState.set(input.sessionID, state);

            (output.message as Record<string, unknown>)["_speckitIntent"] = {
                detected: true,
                intent,
                featureDescription,
            } as SpeckitIntent;

            (output.message as Record<string, unknown>)["_workflowMode"] = "spec-start";

            await initializeWorkflow(input.sessionID);
            await persistInterviewState(input.sessionID, state);

            state.triggered = true;
        },

        dispose: () => {
            sessionState.clear();
        },
    };
}
