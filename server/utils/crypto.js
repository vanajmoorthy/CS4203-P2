const crypto = require('crypto');
const forge = require('node-forge');

// Function to generate a secure random key
exports.generateGroupKey = () => {
    return crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256 key
};

exports.encryptKey = (data, publicKey) => {
    try {
        const publicKeyObj = forge.pki.publicKeyFromPem(publicKey);
        const encrypted = publicKeyObj.encrypt(forge.util.encode64(data), "RSA-OAEP");
        return forge.util.encode64(encrypted);
    } catch (error) {
        console.error("Error during encryption:", error);
        throw error;
    }
};