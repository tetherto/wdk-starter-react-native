import { networkConfigs } from '@/config/networks';
import { NetworkType } from '@tetherto/wdk-react-native-provider';
import { Address } from '@ton/core';
import WAValidator from 'multicoin-address-validator';

export type AddressValidationResult = { valid: true } | { valid: false; error: string };
export type AddressValidator = (address: string) => AddressValidationResult;

export function getAddressValidatorForNetwork(
  networkId: NetworkType
): AddressValidator | undefined {
  return networkConfigs[networkId]?.addressValidator;
}

/**
 * EVM: Ethereum / Polygon / Arbitrum
 */
export function validateEvmAddress(address: string): AddressValidationResult {
  const isValid = WAValidator.validate(address, 'eth');

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
export function validateBitcoinAddress(address: string): AddressValidationResult {
  const isValid = WAValidator.validate(address, 'btc');

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
export function validateTonAddress(address: string): AddressValidationResult {
  try {
    Address.parse(address);
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
export function validateTronAddress(address: string): AddressValidationResult {
  const isValid = WAValidator.validate(address, 'trx');

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
export function validateSolanaAddress(address: string): AddressValidationResult {
  const isValidFormat = WAValidator.validate(address, 'sol');

  if (!isValidFormat) {
    return {
      valid: false,
      error: 'Invalid Solana address. Please check the address and try again.',
    };
  }

  return { valid: true };
}

export function validateAddressByNetwork(
  networkId: NetworkType,
  address: string
): AddressValidationResult {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  const validator = getAddressValidatorForNetwork(networkId);

  if (!validator) {
    return {
      valid: false,
      error: 'Address validation is not supported for this network.',
    };
  }

  return validator(trimmed);
}
