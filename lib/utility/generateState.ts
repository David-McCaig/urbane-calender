import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateState(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let state = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    state += charset[randomValues[i] % charset.length];
  }

  return state;
}


/**
 * Generates a PKCE code verifier and code challenge.
 * 
 * @returns {Promise<{ codeVerifier: string, codeChallenge: string }>}
 */
export async function generatePKCECodes(): Promise<{ codeVerifier: string; codeChallenge: string; }> {
  // Helper: Convert ArrayBuffer to base64url string
  function base64UrlEncode(arrayBuffer: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // 1. Generate a secure random code_verifier
  const randomBytes = new Uint8Array(64); // 64 bytes = 86 base64url chars
  crypto.getRandomValues(randomBytes);
  const codeVerifier = base64UrlEncode(randomBytes.buffer);

  // 2. Hash the code_verifier with SHA-256 to get the code_challenge
  const encoder = new TextEncoder();
  const verifierUint8 = encoder.encode(codeVerifier);
  const digestBuffer = await crypto.subtle.digest("SHA-256", verifierUint8);
  const codeChallenge = base64UrlEncode(digestBuffer);

  return {
    codeVerifier,
    codeChallenge
  };
}