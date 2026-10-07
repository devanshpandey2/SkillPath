import type { Job } from '../types.js';

/**
 * Listing verification: transparency-first heuristics.
 * We NEVER claim a listing is fraudulent — we surface signals and let the
 * student decide, as the product principle demands.
 */
export function verifyListing(job: Job): { status: 'verified' | 'needs_review' | 'flagged'; signals: string[]; reason: string } {
  const signals: string[] = [];
  let score = 0; // positive = trustworthy, negative = concerning

  const text = `${job.title} ${job.description} ${job.company}`.toLowerCase();

  // --- Positive signals ---
  if (job.companyId) {
    score += 2;
    signals.push('Posted by a registered recruiter account');
  } else {
    score -= 1;
    signals.push('Posted outside a registered recruiter account (sample/imported listing)');
  }

  if (job.company && /([a-z]+ )?(labs|technologies|solutions|software|systems|pvt|ltd|llp|inc)/.test(job.company.toLowerCase())) {
    score += 1;
    signals.push('Company name follows a standard registered-business pattern');
  }

  if (job.stipendMin !== null && job.stipendMin > 0) {
    score += 1;
    signals.push('States a concrete stipend/salary range');
  } else {
    score -= 1;
    signals.push('No stipend or salary mentioned');
  }

  if (job.description.length > 300) {
    score += 1;
    signals.push('Detailed description with role expectations');
  } else if (job.description.length < 120) {
    score -= 1;
    signals.push('Very short description — expectations are vague');
  }

  if (/\b(apply|responsibilities|requirements|skills)\b/.test(text)) {
    score += 1;
    signals.push('Description lists responsibilities/requirements');
  }

  if (job.deadline && new Date(job.deadline) > new Date()) {
    score += 1;
    signals.push('Has a future application deadline');
  } else if (job.deadline && new Date(job.deadline) <= new Date()) {
    score -= 2;
    signals.push('Deadline has already passed');
  }

  if (/\b(hr@|careers@|jobs@|talent@) /.test(text)) {
    score += 1;
    if (/\b(hr@|careers@|jobs@|talent@)/.test(text)) signals.push('Official careers/hr contact email in description');
  }

  // --- Negative / risk signals ---
  if (/(registration|training|deposit|security)\s*(fee|charge)/.test(text) || /fee\s*(of|:)?\s*(rs|₹|inr)/i.test(text)) {
    score -= 3;
    signals.push('⚠ Mentions a registration/training/deposit fee — legitimate employers never charge candidates');
  }
  if (/(whatsapp|telegram)\s*(group|only)/i.test(text) || /send\s+(your\s+)?(resume|cv)\s+(on|to)\s+(whatsapp|telegram)/i.test(text)) {
    score -= 2;
      signals.push('⚠ Asks to apply via WhatsApp/Telegram only — outside normal hiring channels');
  }
  if (/(pay|payment).{0,40}(after|before)\s*(training|registration)/i.test(text)) {
    score -= 3;
    signals.push('⚠ Pay-to-work pattern detected');
  }
  if (/earn\s+(₹|rs\.?\s*)?\d+\s*(k|,000)?\s*(per|\/)\s*(day|week)/i.test(text)) {
    score -= 2;
    signals.push('⚠ "Earn X per day" pattern — typical of task-scam postings');
  }
  if (/no\s+(skills?|experience|interview)\s+(needed|required)/i.test(text)) {
    score -= 1;
    signals.push('⚠ "No skills needed" — common in mass-mailer listings');
  }
  if (job.remote === 'remote' && job.stipendMax !== null && job.stipendMax >= 80000) {
    score -= 2;
    signals.push('⚠ Unrealistic pay for a remote student role — verify independently');
  }

  let status: 'verified' | 'needs_review' | 'flagged';
  if (score >= 4) status = 'verified';
  else if (score >= 0) status = 'needs_review';
  else status = 'flagged';

  const reason =
    status === 'verified'
      ? 'Multiple trust signals present (recruiter account, concrete pay, detailed description). Always do your own due diligence.'
      : status === 'needs_review'
        ? 'Some signals could not be confirmed automatically. Verify the company on LinkedIn, check official careers pages, and never pay any fee.'
        : 'Several risk signals detected. This does NOT mean the listing is fraudulent — verify via the company\'s official careers page before sharing personal data.';

  return { status, signals, reason };
}
