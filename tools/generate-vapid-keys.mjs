const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"]
);

const publicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
const privatePkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));

function base64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

console.log(`VAPID_PUBLIC_KEY=${base64Url(publicRaw)}`);
console.log(`VAPID_PRIVATE_KEY=${base64Url(privatePkcs8)}`);
