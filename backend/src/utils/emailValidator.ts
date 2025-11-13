/**
 * Validates if an email is from a college/university domain
 * Supports multi-part TLDs (.edu.in, .ac.uk, .ac.in, etc.)
 */

const DEFAULT_COLLEGE_SUFFIXES = [
  '.edu',
  '.edu.in',
  '.ac.uk',
  '.ac.in',
  '.edu.au',
  '.edu.cn',
  '.adypu.edu.in'
];

function normalize(email: string) {
  return (email || '').toLowerCase().trim();
}

function isBasicEmailFormat(email: string) {
  // pragmatic RFC-like check
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email);
}

function loadAllowedSuffixes(): string[] {
  const extra = process.env.ADDITIONAL_COLLEGE_DOMAINS || '';
  const extras = extra
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (s.startsWith('.') ? s : `.${s}`));
  return [...DEFAULT_COLLEGE_SUFFIXES, ...extras];
}

export const isCollegeEmail = (inputEmail: string): boolean => {
  if (!inputEmail || typeof inputEmail !== 'string') return false;
  const email = normalize(inputEmail);
  if (!isBasicEmailFormat(email)) return false;

  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];

  const allowed = loadAllowedSuffixes();
  // check longest suffixes first
  allowed.sort((a, b) => b.length - a.length);
  for (const suffix of allowed) {
    const normSuffix = suffix.startsWith('.') ? suffix.slice(1) : suffix;
    if (domain === normSuffix || domain.endsWith(`.${normSuffix}`) || domain.endsWith(normSuffix)) {
      return true;
    }
  }

  // fallback: check a small allowlist from env (comma separated) for exact domains
  const known = (process.env.KNOWN_COLLEGE_DOMAINS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  if (known.includes(domain)) return true;

  return false;
};

export const extractCollegeName = (inputEmail: string): string | null => {
  if (!isCollegeEmail(inputEmail)) return null;
  const email = normalize(inputEmail);
  const domain = email.split('@')[1];
  if (!domain) return null;

  const allowed = loadAllowedSuffixes();
  // find matching suffix (longest first)
  allowed.sort((a, b) => b.length - a.length);
  let matchedSuffix = '';
  for (const s of allowed) {
    const norm = s.startsWith('.') ? s.slice(1) : s;
    if (domain === norm || domain.endsWith(`.${norm}`) || domain.endsWith(norm)) {
      matchedSuffix = norm;
      break;
    }
  }

  let base = matchedSuffix ? domain.slice(0, domain.length - matchedSuffix.length) : domain;
  // remove trailing dot if present
  if (base.endsWith('.')) base = base.slice(0, -1);
  if (!base) base = domain;

  // prefer the last label as a readable college identifier
  const parts = base.split('.');
  const raw = parts.length ? parts[parts.length - 1] : base;

  // make human-friendly: replace hyphens/underscores, capitalize words
  const friendly = raw
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
    .trim();

  return friendly || domain;
};

