/**
 * Encryption Utilities for Clockify API Keys
 *
 * Uses Web Crypto API (AES-GCM) for secure encryption/decryption
 * of sensitive data like Clockify API keys before storing in database.
 *
 * Algorithm: AES-GCM (Authenticated encryption)
 * Key Length: 256 bits
 * IV Length: 96 bits (12 bytes, recommended for GCM)
 *
 * Security Notes:
 * - Requires CLOCKIFY_ENCRYPTION_KEY environment variable (32+ chars)
 * - Each encryption uses a random IV (Initialization Vector)
 * - GCM provides both confidentiality and authenticity
 * - Never log encrypted or decrypted values
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Get encryption key from environment variable
 * @returns Encryption key string
 * @throws Error if CLOCKIFY_ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): string {
  const key = process.env.CLOCKIFY_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'CLOCKIFY_ENCRYPTION_KEY environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (key.length < 32) {
    throw new Error(
      'CLOCKIFY_ENCRYPTION_KEY must be at least 32 characters long for security. ' +
      'Current length: ' + key.length
    );
  }

  return key;
}

/**
 * Derive a crypto key from the encryption key string
 * @param keyString - Encryption key string
 * @returns CryptoKey for AES-GCM operations
 */
async function deriveCryptoKey(keyString: string): Promise<CryptoKey> {
  // Use first 32 bytes of the key string
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString.substring(0, 32));

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ENCRYPTION_ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive data (API key)
 *
 * Process:
 * 1. Generate random IV
 * 2. Encrypt data with AES-GCM
 * 3. Combine IV + encrypted data
 * 4. Return as base64 string
 *
 * @param plaintext - Data to encrypt (e.g., Clockify API key)
 * @returns Base64-encoded encrypted data (IV + ciphertext)
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  try {
    const key = getEncryptionKey();
    const cryptoKey = await deriveCryptoKey(key);

    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt the data
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      cryptoKey,
      data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for storage
    if (typeof Buffer !== 'undefined') {
      // Node.js environment
      return Buffer.from(combined).toString('base64');
    } else {
      // Browser environment (fallback, though this is server-side)
      return btoa(String.fromCharCode(...combined));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Encryption failed: ${message}`);
  }
}

/**
 * Decrypt sensitive data (API key)
 *
 * Process:
 * 1. Decode base64 string
 * 2. Extract IV from first 12 bytes
 * 3. Extract ciphertext from remaining bytes
 * 4. Decrypt with AES-GCM
 * 5. Return plaintext
 *
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted plaintext (e.g., Clockify API key)
 */
export async function decryptApiKey(encryptedData: string): Promise<string> {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string');
  }

  try {
    const key = getEncryptionKey();
    const cryptoKey = await deriveCryptoKey(key);

    // Decode from base64
    let combined: Uint8Array;

    if (typeof Buffer !== 'undefined') {
      // Node.js environment
      combined = new Uint8Array(Buffer.from(encryptedData, 'base64'));
    } else {
      // Browser environment (fallback)
      const binary = atob(encryptedData);
      combined = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        combined[i] = binary.charCodeAt(i);
      }
    }

    // Extract IV and encrypted data
    if (combined.length <= IV_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }

    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      cryptoKey,
      encrypted
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Provide helpful error messages
    if (message.includes('OperationError') || message.includes('decrypt')) {
      throw new Error(
        'Decryption failed: Invalid encryption key or corrupted data. ' +
        'This usually happens when CLOCKIFY_ENCRYPTION_KEY has changed.'
      );
    }

    throw new Error(`Decryption failed: ${message}`);
  }
}

/**
 * Validate that encryption/decryption works correctly
 * Useful for testing or validating environment setup
 *
 * @returns True if encryption is working, throws error otherwise
 */
export async function validateEncryption(): Promise<boolean> {
  const testData = 'test-api-key-12345';

  try {
    const encrypted = await encryptApiKey(testData);
    const decrypted = await decryptApiKey(encrypted);

    if (decrypted !== testData) {
      throw new Error('Decrypted data does not match original');
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Encryption validation failed: ${message}`);
  }
}

/**
 * Generate a secure random encryption key
 * Use this to generate CLOCKIFY_ENCRYPTION_KEY for .env.local
 *
 * Note: This is a utility function for development setup.
 * DO NOT use this in production to rotate keys - it will invalidate all encrypted data.
 *
 * @param length - Key length in bytes (default: 32 for AES-256)
 * @returns Hex-encoded random key
 */
export function generateEncryptionKey(length = 32): string {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('Crypto API not available');
  }

  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash API key for logging/debugging purposes
 * Returns first 8 characters only - safe to log
 *
 * @param apiKey - API key to hash
 * @returns Safe hash for logging (first 8 chars)
 */
export function hashApiKeyForLogging(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '****';
  }

  return apiKey.substring(0, 8) + '****';
}
