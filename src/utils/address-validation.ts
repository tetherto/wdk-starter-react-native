import { networkConfigs } from '@/config/networks';
import { NetworkType } from '@tetherto/wdk-react-native-provider';
import { Address } from '@ton/core';
import { ethers } from 'ethers';
import { ChainId } from '@/enum';
import WAValidator from 'multicoin-address-validator';
import bs58 from 'bs58';

export type AddressValidationResult = { valid: true } | { valid: false; error: string };

const NETWORK_TO_CHAIN_MAP: Record<string, ChainId> = Object.fromEntries(
  Object.values(networkConfigs)
    .map((config) => config.id)
    .filter((id): id is ChainId => Object.values(ChainId).includes(id as ChainId))
    .map((id) => [id, id as ChainId])
);

const VALIDATORS: Record<ChainId, (address: string) => AddressValidationResult> = {
  [ChainId.ETHEREUM]: validateEvmAddress,
  [ChainId.POLYGON]: validateEvmAddress,
  [ChainId.ARBITRUM]: validateEvmAddress,

  [ChainId.BITCOIN]: validateBitcoinAddress,
  [ChainId.TON]: validateTonAddress,
  [ChainId.TRON]: validateTronAddress,
  [ChainId.SOLANA]: validateSolanaAddress,

  [ChainId.UNKNOWN]: () => ({
    valid: false,
    error: 'Address validation is not supported for this network yet.',
  }),
};

export function getChainIdFromNetwork(networkId: NetworkType): ChainId | 'unknown' {
  const config = networkConfigs[networkId];
  if (!config) return 'unknown';

  return NETWORK_TO_CHAIN_MAP[config.id] ?? 'unknown';
}

/**
 * EVM: Ethereum / Polygon / Arbitrum
 */
function validateEvmAddress(address: string): AddressValidationResult {
  const trimmed = address.trim();

  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  const isValid = ethers.isAddress(trimmed);

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid EVM address. Please check the address and try again.',
    };
  }

  return { valid: true };
}

/**
 * Bitcoin (SegWit)
 */
function validateBitcoinAddress(address: string): AddressValidationResult {
  const trimmed = address.trim();

  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  const isValid = WAValidator.validate(trimmed, 'btc');

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid Bitcoin address. Please check the address format.',
    };
  }

  return { valid: true };
}

/**
 * TON: @ton/core Address.parse
 */
function validateTonAddress(address: string): AddressValidationResult {
  const trimmed = address.trim();

  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  try {
    Address.parse(trimmed);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Invalid TON address. Please check the address and try again.',
    };
  }
}

/**
 * Tron
 */
function validateTronAddress(address: string): AddressValidationResult {
  const trimmed = address.trim();

  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  const isValid = WAValidator.validate(trimmed, 'trx');

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid Tron address. Tron addresses usually start with "T".',
    };
  }

  return { valid: true };
}

/**
 * Solana
 */
function validateSolanaAddress(address: string): AddressValidationResult {
  const trimmed = address.trim();

  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  try {
    const decoded = bs58.decode(trimmed);

    // Solana public key = 32 bytes
    if (decoded.length !== 32) {
      return {
        valid: false,
        error: 'Invalid Solana address. Please check the address and try again.',
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Invalid Solana address. Please check the address and try again.',
    };
  }
}

export function validateAddressByNetwork(
  networkId: NetworkType,
  address: string
): AddressValidationResult {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  const chainId = getChainIdFromNetwork(networkId);
  const validator = VALIDATORS[chainId];

  return validator(trimmed);
}
