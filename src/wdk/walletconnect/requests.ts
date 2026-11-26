import type { SessionRequest } from './types';

/**
 * Turns a raw WalletConnect request into something the request screen can
 * show and sign or send — or a reason it can't be.
 */

export interface TypedData {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType?: string;
  message: Record<string, unknown>;
}

/** The part of a dApp transaction this wallet sends. `value` is in wei, as a decimal string. */
export interface DappTransaction {
  to: string;
  value: string;
  data: string;
}

export type ParsedRequest =
  | { kind: 'message'; address: string; message: string }
  | { kind: 'typedData'; address: string; typedData: TypedData }
  | { kind: 'transaction'; address: string; tx: DappTransaction }
  | { kind: 'unsupported'; reason: string };

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX = /^0x([0-9a-fA-F]{2})*$/;

/** Strict UTF-8 decode of a 0x-hex string; null if the bytes aren't valid UTF-8. */
function hexToUtf8(hex: string): string | null {
  const bytes = new Uint8Array((hex.length - 2) / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function parsePersonalSign(params: unknown): ParsedRequest {
  if (!Array.isArray(params) || typeof params[0] !== 'string' || typeof params[1] !== 'string') {
    return { kind: 'unsupported', reason: 'Malformed personal_sign request.' };
  }
  // The spec order is [message, address], but some dApps send it reversed.
  let [raw, address] = params as [string, string];
  if (!ADDRESS.test(address) && ADDRESS.test(raw)) [raw, address] = [address, raw];
  if (!ADDRESS.test(address)) {
    return { kind: 'unsupported', reason: 'The request does not name a valid account.' };
  }

  if (!HEX.test(raw)) return { kind: 'message', address, message: raw };

  // WDK's account.sign() takes the message as text, and the arguments cross
  // the worklet boundary as JSON, so raw bytes can't be passed through.
  // Refuse non-text payloads rather than sign something other than what the
  // dApp asked for.
  const message = hexToUtf8(raw);
  if (message === null) {
    return {
      kind: 'unsupported',
      reason: 'This message is raw binary data, which this wallet cannot sign yet.',
    };
  }
  return { kind: 'message', address, message };
}

/**
 * A request must not ask for one chain through a session on another. Returns
 * the refusal when `named` (a chain ID in any number form) differs from the
 * request's CAIP-2 `chainId`.
 */
function wrongChain(what: string, named: unknown, chainId: string): ParsedRequest | undefined {
  if (named === undefined || `eip155:${Number(named)}` === chainId) return undefined;
  return { kind: 'unsupported', reason: `The ${what} is for chain ${String(named)}, but the request came in on ${chainId}.` };
}

function parseTypedData(params: unknown, chainId: string): ParsedRequest {
  if (!Array.isArray(params) || typeof params[0] !== 'string') {
    return { kind: 'unsupported', reason: 'Malformed typed-data request.' };
  }
  const address = params[0];
  if (!ADDRESS.test(address)) {
    return { kind: 'unsupported', reason: 'The request does not name a valid account.' };
  }

  let typedData: TypedData;
  try {
    typedData = typeof params[1] === 'string' ? JSON.parse(params[1]) : (params[1] as TypedData);
  } catch {
    return { kind: 'unsupported', reason: 'The typed data is not valid JSON.' };
  }
  if (!typedData || typeof typedData !== 'object' || !typedData.types || !typedData.message) {
    return { kind: 'unsupported', reason: 'The typed data is incomplete.' };
  }

  const mismatch = wrongChain('typed data', typedData.domain?.chainId, chainId);
  if (mismatch) return mismatch;
  return { kind: 'typedData', address, typedData: { ...typedData, domain: typedData.domain ?? {} } };
}

/** A JSON-RPC quantity (0x-hex, or decimal from lenient dApps) as a decimal string; null if invalid. */
function quantity(value: unknown): string | null {
  if (value === undefined || value === null || value === '' || value === '0x') return '0';
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  try {
    const n = BigInt(value);
    return n < 0n ? null : n.toString();
  } catch {
    return null;
  }
}

/**
 * Only `to`, `value` and `data` are kept. The account is an EIP-7702
 * delegated EOA that sends through a bundler and a sponsoring paymaster, so
 * they set the gas fields and the nonce themselves; whatever the dApp
 * suggested for those is ignored.
 */
function parseSendTransaction(params: unknown, chainId: string): ParsedRequest {
  const tx = Array.isArray(params) ? params[0] : undefined;
  if (!tx || typeof tx !== 'object') {
    return { kind: 'unsupported', reason: 'Malformed transaction request.' };
  }
  const { from, to, value, data, input, chainId: txChain } = tx as Record<string, unknown>;

  if (typeof from !== 'string' || !ADDRESS.test(from)) {
    return { kind: 'unsupported', reason: 'The transaction does not name a valid sending account.' };
  }
  // The smart account executes calls; it has no way to deploy a contract.
  if (to === undefined || to === null) {
    return { kind: 'unsupported', reason: 'Contract deployment is not supported by this wallet.' };
  }
  if (typeof to !== 'string' || !ADDRESS.test(to)) {
    return { kind: 'unsupported', reason: 'The transaction does not name a valid recipient.' };
  }
  const mismatch = wrongChain('transaction', txChain, chainId);
  if (mismatch) return mismatch;

  const wei = quantity(value);
  if (wei === null) return { kind: 'unsupported', reason: 'The transaction value is not a valid amount.' };

  // `input` is the newer name for `data`; some dApps send only that one.
  const calldata = data ?? input ?? '0x';
  if (typeof calldata !== 'string' || !HEX.test(calldata)) {
    return { kind: 'unsupported', reason: 'The transaction data is not valid hex.' };
  }

  return { kind: 'transaction', address: from, tx: { to, value: wei, data: calldata } };
}

export function parseRequest(request: SessionRequest): ParsedRequest {
  switch (request.method) {
    case 'personal_sign':
      return parsePersonalSign(request.params);
    case 'eth_signTypedData_v4':
      return parseTypedData(request.params, request.chainId);
    case 'eth_sendTransaction':
      return parseSendTransaction(request.params, request.chainId);
    default:
      return { kind: 'unsupported', reason: `This wallet does not support ${request.method}.` };
  }
}

/** The `types` map as signers expect it: without the implicit EIP712Domain entry. */
export function signableTypes(typedData: TypedData): TypedData['types'] {
  const { EIP712Domain: _domain, ...types } = typedData.types;
  return types;
}

/** ERC-20 calls worth spelling out before the user sends them. */
type DecodedCall =
  | { kind: 'approve'; spender: string; amount: bigint; unlimited: boolean }
  | { kind: 'transfer'; recipient: string; amount: bigint };

const APPROVE = '0x095ea7b3';
const TRANSFER = '0xa9059cbb';

/**
 * Recognises ERC-20 `approve` and `transfer`. An approval is the one a
 * malicious dApp most often asks for, and with gas sponsored it costs the
 * user nothing to approve one by mistake, so it is called out on screen.
 */
export function decodeCall(data: string): DecodedCall | null {
  // selector (4 bytes) + an address word + an amount word (32 bytes each)
  if (data.length !== 2 + 8 + 64 + 64) return null;
  const selector = data.slice(0, 10).toLowerCase();
  if (selector !== APPROVE && selector !== TRANSFER) return null;
  if (!/^0{24}$/.test(data.slice(10, 34))) return null; // address word must be zero-padded
  const address = `0x${data.slice(34, 74)}`;
  const amount = BigInt(`0x${data.slice(74)}`);
  if (selector === TRANSFER) return { kind: 'transfer', recipient: address, amount };
  // Wallets and dApps treat anything near 2^256-1 as "unlimited".
  return { kind: 'approve', spender: address, amount, unlimited: amount >= 1n << 255n };
}
