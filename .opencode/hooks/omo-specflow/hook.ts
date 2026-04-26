import type { PluginInput } from "@opencode-ai/plugin";
import { getState, setState, recoverSession } from "./state.js";
import * as fs from "fs/promises";

const DEV_INTENT_PATTERN = /^(我要|帮我|我想)?(开发|构建|实现|添加|新增|build|implement|create|add)\s*(.+)/i;
const OUTLINE_CONFIRMED_PATTERN = /已确认大纲/;
const STATE_TTL_MS = 30 * 60 * 1000;
const INTERVIEW_STATE_PATH = ".spec/.interview-state.json";

type InterviewTrack = "web" | "api" | "cli" | "unknown";
type PrdStatus = "outline" | "refining" | "reviewed";
type CompetitorResearchStatus = "pending" | "in_progress" | "completed";

interface InterviewProgress {
    track: InterviewTrack;
    questionIndex: number;
    outlineConfirmed: boolean;
    prdStatus: PrdStatus;
    competitorResearchStatus: CompetitorResearchStatus;
    answers: Record<string, string>;
}

interface SpeckitIntentState {
    detected: boolean;
    intent: string;
    featureDescription: string;
    fullMatch: string;
    timestamp: number;
    triggered: boolean;
    progress: InterviewProgress;
}

const sessionState = new Map<string, SpeckitIntentState>();

function inferTrack(featureDescription: string): InterviewTrack {
    if (/(页面|前端|ui|web|网站|后台)/i.test(featureDescription)) return "web";
    if (/(api|接口|服务|后端|backend)/i.test(featureDescription)) return "api";
    if (/(cli|命令行|脚本|terminal)/i.test(featureDescription)) return "cli";
    return "unknown";
}

function createInitialProgress(featureDescription: string): InterviewProgress {
    return {
        track: inferTrack(featureDescription),
        questionIndex: 0,
        outlineConfirmed: false,
        prdStatus: "outline",
        competitorResearchStatus: "pending",
        answers: {},
    };
}

function updateProgressFromMessage(progress: InterviewProgress, fullMessage: string): InterviewProgress {
    if (!OUTLINE_CONFIRMED_PATTERN.test(fullMessage)) {
        return progress;
    }

    return {
        ...progress,
        outlineConfirmed: true,
        prdStatus: "refining",
        questionIndex: Math.max(progress.questionIndex, 1),
    };
}

async function persistInterviewState(sessionId: string, intent: SpeckitIntentState): Promise<void> {
    try {
        await fs.mkdir(".spec", { recursive: true });
        await fs.writeFile(INTERVIEW_STATE_PATH, JSON.stringify({ sessionId, ...intent }, null, 2), "utf-8");
    } catch {
        return;
    }
}

async function initializeWorkflow(sessionId: string): Promise<void> {
    try {
        const currentState = await getState();
        if (currentState.sessionId === sessionId) {
            await recoverSession(sessionId);
            return;
        }
        await setState({ phase: "discovery", sessionId });
    } catch {
        await setState({ phase: "discovery", sessionId });
    }
}

async function syncWorkflowMetadata(sessionId: string, progress: InterviewProgress): Promise<void> {
    try {
        const currentState = await getState();
        if (currentState.sessionId !== sessionId) {
            return;
        }

        await setState({
            phase: currentState.phase,
            sessionId,
            metadata: {
                ...currentState.metadata,
                discovery: {
                    ...(currentState.metadata?.discovery ?? {}),
                    interviewTrack: progress.track,
                    questionIndex: progress.questionIndex,
                    outlineConfirmed: progress.outlineConfirmed,
                    prdStatus: progress.prdStatus,
                    competitorResearchStatus: progress.competitorResearchStatus,
                },
            },
        });
    } catch {
        return;
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

export function createSpeckitIntentDetectorHook(_ctx: PluginInput): {
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
            const existingState = sessionState.get(input.sessionID);

            if (fullMessage.length < 3) {
                return;
            }

            if (existingState && OUTLINE_CONFIRMED_PATTERN.test(fullMessage)) {
                existingState.progress = updateProgressFromMessage(existingState.progress, fullMessage);
                existingState.timestamp = Date.now();
                await persistInterviewState(input.sessionID, existingState);
                await syncWorkflowMetadata(input.sessionID, existingState.progress);
                return;
            }

            const intentMatch = DEV_INTENT_PATTERN.exec(fullMessage);
            if (!intentMatch) {
                return;
            }

            const intent = intentMatch[2];
            const featureDescription = (intentMatch[3] || "").trim();
            if (!featureDescription || existingState?.triggered) {
                return;
            }

            const state: SpeckitIntentState = {
                detected: true,
                intent,
                featureDescription,
                fullMatch: intentMatch[0],
                timestamp: Date.now(),
                triggered: false,
                progress: createInitialProgress(featureDescription),
            };

            sessionState.set(input.sessionID, state);

            (output.message as Record<string, unknown>)["_speckitIntent"] = {
                detected: true,
                intent,
                featureDescription,
            } as SpeckitIntent;
            (output.message as Record<string, unknown>)["_workflowMode"] = "spec-start";
            (output.message as Record<string, unknown>)["_interviewProgress"] = state.progress;

            await initializeWorkflow(input.sessionID);
            await persistInterviewState(input.sessionID, state);
            await syncWorkflowMetadata(input.sessionID, state.progress);

            state.triggered = true;
        },

        dispose: () => {
            sessionState.clear();
        },
    };
}
