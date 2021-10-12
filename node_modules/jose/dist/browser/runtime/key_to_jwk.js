import crypto, { isCryptoKey } from './webcrypto.js';
const keyToJWK = async (key) => {
    if (!isCryptoKey(key)) {
        throw new TypeError('invalid key input');
    }
    if (!key.extractable) {
        throw new TypeError('non-extractable CryptoKey cannot be exported as a JWK');
    }
    const { ext, key_ops, alg, use, ...jwk } = await crypto.subtle.exportKey('jwk', key);
    return jwk;
};
export default keyToJWK;
