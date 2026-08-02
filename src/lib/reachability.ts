/**
 * Deciding whether a human took part in a call.
 *
 * The tempting shortcut — "no structured result means nobody answered" — is
 * wrong and dangerous. Extraction can fail, a result can fail validation, and a
 * customer who refuses often rings off before the model emits anything. Treating
 * those as "not reached" queues a retry and can put a call back in front of
 * someone who just asked not to be contacted.
 *
 * So reachability is decided from the transcript, independently of the result.
 */

export type Reachability = "human" | "no-human" | "indeterminate";

export interface TranscriptTurn {
  speaker?: string;
  text?: string;
  offset_seconds?: number | null;
}

/**
 * Recorded network and handset announcements. These arrive on the customer
 * channel and are transcribed as if the customer said them.
 */
const CARRIER_PATTERNS: RegExp[] = [
  /\ball circuits are busy\b/i,
  /\bplease try (again|your call) later\b/i,
  /\bthe number you (have )?dial(l)?ed\b/i,
  /\bnot available at the moment\b/i,
  /\bswitched off\b/i,
  /\bout of coverage\b/i,
  /\bfacility to make outgoing calls\b/i,
  /\bhas been withdrawn\b/i,
  /\bcall (cannot|can not) be completed\b/i,
  /\bno longer in service\b/i,
  /\bcheck the number and dial again\b/i,
  /\bplease hold\b/i,
  /\bleave a message after\b/i,
  /\brecord your message\b/i,
  /\bis not answering\b/i,
  /\bvoicemail\b/i,
  /\bunavailable\b/i,
];

/** Explicit refusals. Deliberately narrow — a false positive suppresses a real customer. */
const REFUSAL_PATTERNS: RegExp[] = [
  /\b(take|remove) me off\b/i,
  /\bdon'?t (call|contact|phone) me\b/i,
  /\bdo not (call|contact|phone) me\b/i,
  /\bstop calling\b/i,
  /\bnever call\b/i,
  /\bnot interested\b/i,
  /\bunsubscribe\b/i,
  /\bopt me out\b/i,
  /\blose my number\b/i,
];

export function isCarrierAudio(text: string): boolean {
  return CARRIER_PATTERNS.some((re) => re.test(text));
}

export function looksLikeRefusal(text: string): boolean {
  return REFUSAL_PATTERNS.some((re) => re.test(text));
}

export function normalizeTurns(raw: unknown): TranscriptTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => ({
      speaker: typeof t.speaker === "string" ? t.speaker : "unknown",
      text: typeof t.text === "string" ? t.text : "",
      offset_seconds: typeof t.offset_seconds === "number" ? t.offset_seconds : null,
    }));
}

export interface ReachabilityVerdict {
  reachability: Reachability;
  /** Set when the customer explicitly refused, with the words that show it. */
  refusalEvidence: string | null;
}

/**
 * Classify a call from its transcript alone.
 *
 * - `no-human`  every customer turn is carrier or voicemail audio, or there are
 *               no customer turns at all on a call that ran.
 * - `human`     at least one customer turn is real speech.
 * - `indeterminate` there is no transcript to judge, so we must not guess.
 */
export function assessReachability(turns: TranscriptTurn[]): ReachabilityVerdict {
  if (turns.length === 0) return { reachability: "indeterminate", refusalEvidence: null };

  const customerTurns = turns.filter(
    (t) => t.speaker === "user" && (t.text ?? "").trim().length > 0
  );

  if (customerTurns.length === 0) {
    // The agent spoke and nothing came back: ring-out, silence, dead air.
    return { reachability: "no-human", refusalEvidence: null };
  }

  const humanTurns = customerTurns.filter((t) => !isCarrierAudio(t.text ?? ""));

  if (humanTurns.length === 0) {
    // Every customer turn was a recorded announcement.
    return { reachability: "no-human", refusalEvidence: null };
  }

  const refusal = humanTurns.find((t) => looksLikeRefusal(t.text ?? ""));
  return {
    reachability: "human",
    refusalEvidence: refusal ? (refusal.text ?? "").trim().slice(0, 300) : null,
  };
}
