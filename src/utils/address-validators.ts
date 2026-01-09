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

// Spark addresses use Bech32 encoding with custom prefixes
const SPARK_ADDRESS_PREFIXES = ['spark1', 'sparkt1', 'sparkrt1'];

export function validateSparkAddress(address: string): AddressValidationResult {
  const trimmed = address.trim().toLowerCase();

  // Check if address starts with a valid Spark prefix
  const hasValidPrefix = SPARK_ADDRESS_PREFIXES.some(prefix => trimmed.startsWith(prefix));

  if (!hasValidPrefix) {
    return {
      valid: false,
      error: 'Invalid Spark address. Address should start with spark1, sparkt1, or sparkrt1.',
    };
  }

  // Basic length validation for Bech32 addresses (typically 62-90 characters)
  if (trimmed.length < 40 || trimmed.length > 100) {
    return {
      valid: false,
      error: 'Invalid Spark address length. Please check the address format.',
    };
  }

  // Bech32 character set validation (lowercase alphanumeric excluding 1, b, i, o)
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
  networkId: string,
  address: string,
  validator?: AddressValidator
): AddressValidationResult {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  // Use Spark validator for spark network, EVM validator for EVM networks
  const effectiveValidator = validator || (networkId === 'spark' ? validateSparkAddress : validateEvmAddress);

  return effectiveValidator(trimmed);
}
