import { CalleClient } from "@call-e/calle";

let _client: CalleClient | null = null;

/** Lazily-constructed CALL-E client (server-only). */
export function calle(): CalleClient {
  const apiKey = process.env.CALLE_API_KEY;
  if (!apiKey) throw new Error("CALLE_API_KEY is not set");
  if (!_client) _client = new CalleClient({ apiKey });
  return _client;
}

export function calleConfigured(): boolean {
  return Boolean(process.env.CALLE_API_KEY);
}
