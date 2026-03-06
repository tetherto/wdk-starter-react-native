// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

  const hasValidPrefix = SPARK_ADDRESS_PREFIXES.some(prefix => trimmed.startsWith(prefix));

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
  networkId: string,
  address: string,
  validator?: AddressValidator
): AddressValidationResult {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  const effectiveValidator = validator || (networkId === 'spark' ? validateSparkAddress : validateEvmAddress);

  return effectiveValidator(trimmed);
}
