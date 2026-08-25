/**
 * Single source of truth for the one fact this page carries beyond its own name.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  REPLACE BEFORE SHIPPING
 *
 *  `contact.value` is a placeholder. It was never supplied, and inventing a
 *  contact address is not something a build gets to do on the owner's behalf.
 *
 *  While it is empty the page shows "Em breve" / "Coming soon" — deliberate
 *  public copy, chosen by the owner, not a build warning. That means an empty
 *  value now ships quietly and looks intentional to a visitor: nothing on the
 *  page will remind you it is unset, so this file is the only reminder.
 *
 *  Set `channel` to 'email' or 'whatsapp' and `value` to the real address or
 *  number. Everything else on the page derives from this.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const contact = {
  channel: 'email' as 'email' | 'whatsapp',
  /** e.g. 'ola@fltr.dev' — or, for whatsapp, digits only: '5551999999999' */
  value: '',
} as const;

export const isContactSet = contact.value.trim().length > 0;

export function contactHref(): string | null {
  if (!isContactSet) return null;
  return contact.channel === 'whatsapp'
    ? `https://wa.me/${contact.value.replace(/\D/g, '')}`
    : `mailto:${contact.value}`;
}

/** Display string for the contact plate. */
export function contactLabel(): string | null {
  if (!isContactSet) return null;
  return contact.channel === 'whatsapp' ? `+${contact.value.replace(/\D/g, '')}` : contact.value;
}
