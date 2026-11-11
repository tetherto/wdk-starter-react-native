import type { SessionRequest } from './types';

/**
 * Turns a raw WalletConnect signing request into something the request
 * screen can show and sign — or a reason it can't be signed.
 */

export interface TypedData {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType?: string;
  message: Record<string, unknown>;
}

export type ParsedRequest =
  | { kind: 'message'; address: string; message: string }
  | { kind: 'typedData'; address: string; typedData: TypedData }
  | { kind: 'unsupported'; reason: string };

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX = /^0x([0-9a-fA-F]{2})*$/;

/**
 * Strict UTF-8 decode of a 0x-hex string; null if the bytes aren't valid
 * UTF-8. Hand-rolled because TextDecoder isn't guaranteed in Hermes.
 */
function hexToUtf8(hex: string): string | null {
  const bytes: number[] = [];
  for (let i = 2; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));

  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let extra: number;
    let code: number;
    if (b < 0x80) { extra = 0; code = b; }
    else if (b >= 0xc2 && b < 0xe0) { extra = 1; code = b & 0x1f; }
    else if (b >= 0xe0 && b < 0xf0) { extra = 2; code = b & 0x0f; }
    else if (b >= 0xf0 && b < 0xf5) { extra = 3; code = b & 0x07; }
    else return null;

    if (i + extra >= bytes.length) return null;
    for (let j = 1; j <= extra; j++) {
      const next = bytes[i + j];
      if ((next & 0xc0) !== 0x80) return null;
      code = (code << 6) | (next & 0x3f);
    }
    // Reject overlong encodings, surrogates and out-of-range code points.
    if (extra === 2 && code < 0x800) return null;
    if (extra === 3 && (code < 0x10000 || code > 0x10ffff)) return null;
    if (code >= 0xd800 && code <= 0xdfff) return null;

    out += String.fromCodePoint(code);
    i += extra + 1;
  }
  return out;
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

  // A signature for one chain's domain must not be requested through a
  // session on another chain.
  const domainChain = typedData.domain?.chainId;
  if (domainChain !== undefined && `eip155:${Number(domainChain)}` !== chainId) {
    return {
      kind: 'unsupported',
      reason: `The typed data is for chain ${String(domainChain)}, but the request came in on ${chainId}.`,
    };
  }
  return { kind: 'typedData', address, typedData: { ...typedData, domain: typedData.domain ?? {} } };
}

export function parseRequest(request: SessionRequest): ParsedRequest {
  switch (request.method) {
    case 'personal_sign':
      return parsePersonalSign(request.params);
    case 'eth_signTypedData_v4':
      return parseTypedData(request.params, request.chainId);
    default:
      return { kind: 'unsupported', reason: `This wallet does not support ${request.method}.` };
  }
}

/** The `types` map as signers expect it: without the implicit EIP712Domain entry. */
export function signableTypes(typedData: TypedData): TypedData['types'] {
  const { EIP712Domain: _domain, ...types } = typedData.types;
  return types;
}
