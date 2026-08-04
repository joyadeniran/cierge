import { buildAttemptKey } from "../src/lib/attempt-key";

const base = { callId: "call-1", phone: "+15550101234", task: "script A", locale: "en-NG" };

const checks: { name: string; a: typeof base; b: typeof base; same: boolean }[] = [
  { name: "identical payload -> same key", a: base, b: { ...base }, same: true },
  { name: "different destination -> different key", a: base, b: { ...base, phone: "+15550109999" }, same: false },
  { name: "revised script -> different key", a: base, b: { ...base, task: "script B" }, same: false },
  { name: "different locale -> different key", a: base, b: { ...base, locale: "en-US" }, same: false },
  { name: "different call row -> different key", a: base, b: { ...base, callId: "call-2" }, same: false },
];

let pass = 0, fail = 0;
for (const c of checks) {
  const ka = buildAttemptKey(c.a), kb = buildAttemptKey(c.b);
  const ok = (ka === kb) === c.same;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  ok ? pass++ : fail++;
}

// The key must be stable across processes, so no randomness or clock input.
const stable = buildAttemptKey(base) === buildAttemptKey(base);
console.log(`${stable ? "PASS" : "FAIL"}  deterministic across calls`);
stable ? pass++ : fail++;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
