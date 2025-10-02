function generateWdkSalt(email: any): Buffer {
  const localPart = email.split('@')[0];

  // Encode the local part using TextEncoder
  const encoder = new TextEncoder();
  const encoded = encoder.encode(localPart);

  // Prepare a 16-byte buffer
  const bf = new Uint8Array(16);

  if (encoded.length > 16) {
    // If more than 16 bytes, take the last 16 bytes
    const sliced = encoded.slice(0, 16);
    bf.set(sliced);
  } else {
    // Copy encoded bytes to beginning
    bf.set(encoded, 0);

    // Fill the remaining bytes with 7
    bf.fill(7, encoded.length);
  }

  console.info('[generateWdkSalt] --->', bf);

  return bf as Buffer;
}

export const wdkEncryptionSalt = {
  generateWdkSalt,
};
