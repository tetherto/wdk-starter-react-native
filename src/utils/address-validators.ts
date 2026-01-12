import { NetworkId } from '@/config/chain';
import WAValidator from 'multicoin-address-validator';

export type AddressValidationResult = { valid: true } | { valid: false; error: string };
export type AddressValidator = (address: string) => AddressValidationResult;

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

const SPARK_ADDRESS_PREFIXES = ['spark1', 'sparkt1', 'sparkrt1'];

export function validateSparkAddress(address: string): AddressValidationResult {
  const trimmed = address.trim().toLowerCase();

  const hasValidPrefix = SPARK_ADDRESS_PREFIXES.some((prefix) => trimmed.startsWith(prefix));

  if (!hasValidPrefix) {
    return {
      valid: false,
      error: 'Invalid Spark address. Address should start with spark1, sparkt1, or sparkrt1.',
    };
  }

  if (trimmed.length < 40 || trimmed.length > 100) {
    return {
      valid: false,
      error: 'Invalid Spark address length. Please check the address format.',
    };
  }

  const bech32Regex = /^(spark1|sparkt1|sparkrt1)[ac-hj-np-z02-9]+$/;
  if (!bech32Regex.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid Spark address format. Please check the address.',
    };
  }

  return { valid: true };
}

export function validateAddressByNetwork(
  networkId: NetworkId,
  address: string,
  validator?: AddressValidator
): AddressValidationResult {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  const effectiveValidator =
    validator ||
    ([NetworkId.SPARK, NetworkId.SPARK_REGTEST].includes(networkId)
      ? validateSparkAddress
      : validateEvmAddress);

  return effectiveValidator(trimmed);
}
