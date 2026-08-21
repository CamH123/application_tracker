import { proposalSchema } from "../http/validation.js";
import type {
  AnalysisGateway,
  GmailMessage,
  MessageAnalysis,
} from "../sync/types.js";
import {
  rankApplicationMatches,
  type MatchSignals,
} from "../domain/matching.js";

export const OLLAMA_MODEL = "llama3.2:3b";

export class OllamaGateway implements AnalysisGateway {
  constructor(
    private readonly baseUrl = process.env.OLLAMA_URL ??
      "http://localhost:11434",
  ) {}

  async health(): Promise<{ available: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok)
        return {
          available: false,
          message: `Ollama returned ${response.status}`,
        };
      const data = (await response.json()) as {
        models?: Array<{ name: string }>;
      };
      const available =
        data.models?.some(
          (model) =>
            model.name === OLLAMA_MODEL ||
            model.name.startsWith(`${OLLAMA_MODEL}:`),
        ) ?? false;
      return available
        ? { available: true }
        : {
            available: false,
            message: `Ollama model ${OLLAMA_MODEL} is not installed`,
          };
    } catch {
      return {
        available: false,
        message: `Ollama is unavailable at ${this.baseUrl}`,
      };
    }
  }

  async analyze(message: GmailMessage): Promise<MessageAnalysis> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(message) },
        ],
      }),
    });
    if (!response.ok)
      throw new Error(`Ollama analysis failed (${response.status})`);
    const envelope = (await response.json()) as {
      message?: { content?: string };
    };
    let decoded: unknown;
    try {
      decoded = JSON.parse(envelope.message?.content ?? "");
    } catch {
      throw new Error("Ollama returned malformed JSON");
    }
    if (typeof decoded !== "object" || decoded === null)
      throw new Error("Ollama returned an invalid analysis");
    const raw = decoded as Record<string, unknown>;
    if (raw.recruiting === false) {
      return {
        recruiting: false,
        confidence: Number(raw.confidence ?? 0),
        rationale: String(raw.rationale ?? "No recruiting signal"),
      };
    }
    const proposal = proposalSchema.safeParse(raw.proposal);
    if (!proposal.success)
      throw new Error("Ollama returned an invalid proposal");
    let proposedAction = proposal.data;
    let rationale = String(
      raw.rationale ?? "Model-classified recruiting message",
    );
    let confidence = Number(raw.confidence ?? 0);
    if (
      proposedAction.action === "update_event" &&
      message.candidates?.length
    ) {
      const targetEventId = proposedAction.targetEventId;
      const eventOwner = message.candidates.find((candidate) =>
        candidate.events.some((event) => event.id === targetEventId),
      );
      if (!eventOwner)
        throw new Error(
          "Ollama proposed an Application Event that is not a supplied candidate",
        );
      proposedAction = {
        ...proposedAction,
        targetApplicationId: eventOwner.id,
      };
      rationale = `${rationale}; exact supplied Application Event`;
    } else if (
      proposedAction.action === "create_event" &&
      !proposedAction.newApplication &&
      message.candidates?.length &&
      raw.matchSignals &&
      typeof raw.matchSignals === "object"
    ) {
      const matches = rankApplicationMatches(
        message.candidates,
        raw.matchSignals as MatchSignals,
      );
      if (matches[0]) {
        proposedAction = {
          ...proposedAction,
          targetApplicationId: matches[0].applicationId,
        };
        rationale = `${rationale}; ${matches[0].rationale}`;
        confidence = Math.min(confidence, matches[0].confidence);
      }
    }
    return {
      recruiting: true,
      proposal: proposedAction,
      confidence,
      rationale,
    };
  }
}

const systemPrompt = `Classify one email for a job application tracker. Return JSON only with recruiting, confidence (0..1), rationale, matchSignals, and proposal. matchSignals may contain externalApplicationId, companyName, roleTitle, occurredOn, and sender. A proposal is exactly one create_application, create_event, or update_event action. Use YYYY-MM-DD dates. Scheduled interviews require scheduledTime and an IANA timeZone. Candidate Applications and their Application Events are included with the message. Never invent a target Application or Application Event UUID: use supplied candidates only; otherwise propose create_application or create_event with a newApplication. Ignore newsletters and generic job marketing. Deterministic server matching ranks exact external Application ID, Company identity, sender/ATS, normalized role, then temporal proximity.`;
