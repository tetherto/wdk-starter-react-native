/** Typed error hierarchy. The data layer normalizes thrown values into these. */
export type WalletErrorKind = 'validation' | 'network' | 'chain' | 'unknown';
export class WalletError extends Error {
  readonly kind: WalletErrorKind;
  constructor(kind: WalletErrorKind, message: string) { super(message); this.name = 'WalletError'; this.kind = kind; }
}
export function errorToMessage(e: WalletError): string {
  switch (e.kind) {
    case 'validation': return e.message;
    case 'network': return 'Check your connection and try again.';
    case 'chain': return 'The network could not process this. Try again shortly.';
    default: return 'Something went wrong. Please try again.';
  }
}
