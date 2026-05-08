#!/usr/bin/env node
/**
 * V72 — Génération de clés VAPID pour Web Push.
 *
 * Usage:
 *   node scripts/gen-vapid-keys.mjs
 *
 * Sortie: JSON { publicKey, privateKey } à coller dans :
 *   - Supabase Dashboard → Edge Functions → Secrets :
 *       VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   - .env.local (frontend) :
 *       VITE_VAPID_PUBLIC_KEY=<publicKey>
 *
 * Pas de dep externe : utilise crypto natif (P-256 ECDH = courbe VAPID).
 */
import crypto from 'node:crypto';

function urlBase64(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();

// Public key uncompressed (65 bytes : 0x04 + X(32) + Y(32))
const publicKey = urlBase64(ecdh.getPublicKey());
const privateKey = urlBase64(ecdh.getPrivateKey());

console.log(JSON.stringify({ publicKey, privateKey }, null, 2));
