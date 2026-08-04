/**
 * The onboarding welcome call: the first vertical slice.
 * Mirrors the Supplya "Customer Success Executive" job — contact every new
 * signup, walk them through onboarding + first order, capture feedback.
 */

export interface OnboardingCustomer {
  name?: string | null;
  businessName?: string | null;
}

const COMPANY_NAME = process.env.COMPANY_NAME ?? "Supplya";
const COMPANY_BLURB =
  process.env.COMPANY_BLURB ??
  "a B2B procurement platform that helps retailers, restaurants, offices and small businesses in Nigeria buy inventory more easily, with flexible payment options";

/**
 * Bump whenever the script or the result schema changes in a way that alters
 * what the customer hears or what we extract. It is part of the attempt key, so
 * a revised call can never inherit a previous attempt's provider identity.
 */
export const ONBOARDING_SCHEMA_VERSION = "v1";

/** Natural-language goal handed to CALL-E for the call. */
export function onboardingTask(c: OnboardingCustomer): string {
  const who = c.name ? c.name : "the new customer";
  const biz = c.businessName ? ` (business: ${c.businessName})` : "";
  return [
    `You are Cierge, a warm, concise customer success agent calling on behalf of ${COMPANY_NAME}, ${COMPANY_BLURB}.`,
    `You are calling ${who}${biz}, who just signed up. Your goal is a short (~2 minute) welcome + onboarding conversation.`,
    ``,
    `Follow this flow, but stay natural and allow interruptions:`,
    `1. Greet ${who} by name, introduce yourself as Cierge from ${COMPANY_NAME}.`,
    `2. Ask if now is a good time for a quick 2-minute welcome call, and mention the call may be recorded for quality. If they say no, warmly offer to call back later and end the call.`,
    `3. Discovery — understand: what type of business they run, why they signed up, and the main challenges they want to solve with procurement. Ask whether they have used a similar platform before.`,
    `4. Encourage them to place their first order and offer to help them get started. If they'd rather talk to a person, note that.`,
    `5. Only answer basic questions using what you clearly know about ${COMPANY_NAME}. NEVER invent pricing, delivery times, or policy — instead offer to have a human follow up.`,
    `6. Thank them, briefly summarize next steps, and end warmly.`,
    ``,
    `Detect the customer's sentiment. If they are frustrated, confused, angry, or explicitly ask for a human, treat follow_up_required and wants_human_contact as true.`,
  ].join("\n");
}

/**
 * JSON Schema for the structured result CALL-E extracts from the conversation.
 * This is the "voice of customer" payload that lands in the `insights` table.
 */
export const onboardingResultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    business_name: { type: "string", description: "Customer's business name if mentioned" },
    business_type: { type: "string", description: "e.g. Retail Grocery, Restaurant, Office" },
    goal: { type: "string", description: "Primary reason they signed up" },
    pain_points: {
      type: "array",
      items: { type: "string" },
      description: "Challenges they want to solve",
    },
    used_similar_before: { type: "boolean" },
    sentiment: {
      type: "string",
      enum: ["Positive", "Neutral", "Confused", "Frustrated", "Angry"],
    },
    activation_status: {
      type: "string",
      enum: ["Interested", "Activated", "NotInterested", "NeedsHumanFollowUp"],
    },
    wants_human_contact: { type: "boolean" },
    follow_up_required: { type: "boolean" },
    notes: { type: "string", description: "Anything else worth a CS rep knowing" },
  },
  required: ["sentiment", "activation_status", "follow_up_required"],
} as const;

/** Shape of the extracted result (kept in sync with the schema above). */
export interface OnboardingInsight {
  business_name?: string;
  business_type?: string;
  goal?: string;
  pain_points?: string[];
  used_similar_before?: boolean;
  sentiment?: string;
  activation_status?: string;
  wants_human_contact?: boolean;
  follow_up_required?: boolean;
  notes?: string;
}
