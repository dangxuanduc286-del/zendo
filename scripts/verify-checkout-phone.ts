const normalizePhone = (rawPhone: string): string => rawPhone.replace(/[^\d+]/g, "");
const phoneRegex = /^(0\d{9}|84\d{9}|\+84\d{9})$/;

const cases = [
  { input: "0965353286", expected: true },
  { input: " 0965 353 286 ", expected: true },
  { input: "+84965353286", expected: true },
  { input: "84965353286", expected: true },
  { input: "965353286", expected: false },
];

const results = cases.map((item) => {
  const normalized = normalizePhone(item.input);
  const valid = phoneRegex.test(normalized);
  return { ...item, normalized, valid };
});

const failed = results.filter((item) => item.valid !== item.expected);
if (failed.length > 0) {
  console.log(JSON.stringify({ ok: false, failed, results }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, results }, null, 2));
