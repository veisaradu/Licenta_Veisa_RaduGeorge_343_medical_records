function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function encryptDocument(file, rsaPublicKey) {
  const fileBuffer = await file.arrayBuffer();

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', fileBuffer);
  const documentHash = '0x' + Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    fileBuffer
  );

  const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKey,
    exportedAesKey
  );

  return {
    encryptedContent: arrayBufferToBase64(encryptedContent),
    encryptedAesKey: arrayBufferToBase64(encryptedAesKey),
    iv: arrayBufferToBase64(iv),
    documentHash,
  };
}

export async function decryptDocument(encryptedContent, encryptedAesKey, iv, rsaPrivateKey) {
  const encryptedAesBytes = Uint8Array.from(atob(encryptedAesKey), c => c.charCodeAt(0));
  const aesKeyRaw = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKey,
    encryptedAesBytes
  );

  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    aesKeyRaw,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const encryptedBytes = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));

  return await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    aesKey,
    encryptedBytes
  );
}

export async function verifyIntegrity(decryptedBuffer, storedHash) {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', decryptedBuffer);
  const computedHash = '0x' + Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return computedHash === storedHash;
}
