/**
 * Utilitários para PKCE (Proof Key for Code Exchange)
 */

function generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }
    return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a: ArrayBuffer): string {
    const bytes = new Uint8Array(a);
    let str = "";
    for (const byte of bytes) {
        str += String.fromCharCode(byte);
    }
    return btoa(str)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export async function generatePKCE() {
    const verifier = generateRandomString(128);
    const challengeBuffer = await sha256(verifier);
    const challenge = base64urlencode(challengeBuffer);
    return { verifier, challenge };
}