import { assessReachability, normalizeTurns } from "../src/lib/reachability";

const cases = [
  { name: "carrier busy (real call 1)", turns: [
      {speaker:"bot",text:"Hi Joy,"},
      {speaker:"user",text:"All circuits are busy now. Please try again later."},
      {speaker:"user",text:"The facility to make outgoing calls from this number has been withdrawn."}],
    expect:"no-human", refusal:false },
  { name: "real conversation (real call 2)", turns: [
      {speaker:"bot",text:"Hi Joy, this is Cierge from Supplya"},
      {speaker:"user",text:"yeah. that's right."},
      {speaker:"user",text:"we sell groceries."},
      {speaker:"user",text:"sure. sure. that would be great."}],
    expect:"human", refusal:false },
  { name: "refusal, no result", turns: [
      {speaker:"bot",text:"Is now a good time?"},
      {speaker:"user",text:"No. Take me off your list."}],
    expect:"human", refusal:true },
  { name: "not interested", turns: [{speaker:"user",text:"I'm not interested, stop calling."}], expect:"human", refusal:true },
  { name: "voicemail", turns: [{speaker:"bot",text:"Hi"},{speaker:"user",text:"Please leave a message after the tone."}], expect:"no-human", refusal:false },
  { name: "silence / ring-out", turns: [{speaker:"bot",text:"Hello?"}], expect:"no-human", refusal:false },
  { name: "no transcript", turns: [], expect:"indeterminate", refusal:false },
  { name: "mixed: carrier then human", turns: [
      {speaker:"user",text:"Please hold"},
      {speaker:"user",text:"Hello, yes I signed up yesterday."}], expect:"human", refusal:false },
];

let pass=0, fail=0;
for (const c of cases) {
  const v = assessReachability(normalizeTurns(c.turns));
  const ok = v.reachability===c.expect && Boolean(v.refusalEvidence)===c.refusal;
  console.log(`${ok?"PASS":"FAIL"}  ${c.name.padEnd(30)} -> ${v.reachability}${v.refusalEvidence?` | refusal: "${v.refusalEvidence}"`:""}`);
  ok?pass++:fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
