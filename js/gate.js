// Parent gate (spec 12): adult-level task, randomised every time, never remembered,
// asks for no personal information, stores nothing.
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberToWords(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10), o = n % 10;
  return TENS[t] + (o ? '-' + ONES[o] : '');
}

export function makeChallenge(rand = Math.random) {
  if (rand() < 0.5) {
    const n = 21 + Math.floor(rand() * 78); // 21..98
    return { prompt: `Type this number using digits: ${numberToWords(n)}`, answer: String(n) };
  }
  const a = 3 + Math.floor(rand() * 7), b = 3 + Math.floor(rand() * 7), c = 2 + Math.floor(rand() * 15);
  return { prompt: `What is ${a} × ${b} + ${c}?`, answer: String(a * b + c) };
}
