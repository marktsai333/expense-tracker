const KEY = "ledgerCode";
const CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 排除易混淆的 0/O/1/I

function randomCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

export function getOrCreateLedgerCode(): string {
  let code = localStorage.getItem(KEY);
  if (!code) {
    code = randomCode();
    localStorage.setItem(KEY, code);
  }
  return code;
}

export function setLedgerCode(code: string) {
  localStorage.setItem(KEY, code.trim().toUpperCase());
}
