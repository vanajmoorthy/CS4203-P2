const crypto = require('crypto');
const forge = require('node-forge');

// Function to generate a secure random key
exports.generateGroupKey = () => {
    return crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256 key
};

// Function to encrypt a key with a user's public key
exports.encryptKey = (key, publicKeyPem) => {
    try {
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
        const encrypted = publicKey.encrypt(key, 'RSA-OAEP');
        return forge.util.encode64(encrypted);
    } catch (error) {
        console.error(error);
    }
};
