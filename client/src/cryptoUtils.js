
const dbName = "cryptoKeys";
const storeName = "keys";
const baseUrl = "http://localhost:3000";
import * as forge from 'node-forge'

const generateGroupKey = async () => {
    try {
        const randomBytes = new Uint8Array(32);
        await window.crypto.getRandomValues(randomBytes);
        const hexString = Array.from(randomBytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
        return hexString;
    } catch (error) {
        // Handle any errors that might occur while generating random bytes.
        console.error('Error generating random bytes:', error);
        return null;
    }
}

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onerror = (event) => {
            reject("Database error: " + event.target.errorCode);
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(storeName, { keyPath: "id" });
        };
    });
}

const storePrivateKey = async (privateKey) => {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.put({ id: "userPrivateKey", key: privateKey });

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject("Error writing data: " + event.target.errorCode);
        };
    });
}

const getPrivateKey = async () => {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.get("userPrivateKey");

        request.onsuccess = (event) => {
            if (event.target.result) {
                resolve(event.target.result.key);
            } else {
                reject("No key found");
            }
        };

        request.onerror = (event) => {
            reject("Error reading data: " + event.target.errorCode);
        };
    });
}

const fetchUserPublicKey = async (userId) => {
    try {
        const response = await fetch(`${baseUrl}/groups/users/publicKey/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
            },
        });

        const result = await response.json();
        if (response.ok) {
            return result.publicKey;
        } else {
            console.error('Error fetching public key:', result.message);
        }
    } catch (error) {
        console.error('Network error:', error);
    }
};

const encryptWithPublicKey = async (data, publicKey) => {
    try {
        const publicKeyObj = forge.pki.publicKeyFromPem(publicKey);
        const encrypted = publicKeyObj.encrypt(forge.util.encode64(data), "RSA-OAEP");
        return forge.util.encode64(encrypted);
    } catch (error) {
        console.error("Error during encryption:", error);
        throw error;
    }
};


const decryptWithPrivateKey = async (encryptedData, privateKey) => {
    try {

        const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
        const decrypted = privateKeyObj.decrypt(forge.util.decode64(encryptedData), "RSA-OAEP");
        return decrypted;
    } catch (error) {
        console.error("Error during decryption:", error);
        throw error;
    }
};


const pemToBuffer = (pem) => {
    const b64Lines = pem.replace(/-----[A-Z ]+-----/g, '');
    const b64Prefix = b64Lines.replace(/\n/g, '');
    return base64ToBuffer(b64Prefix);
}

const base64ToBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

const bufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}


const binaryStringToByteArray = (binaryString) => {
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const base64ToBinary = (base64) => {
    const binaryString = window.atob(base64);
    return binaryString;
};

const binaryToHex = (binary) => {
    return Array.from(binary).map(byte => {
        return ('0' + byte.charCodeAt(0).toString(16)).slice(-2);
    }).join('');
};


const fetchAndDecryptGroupKey = async (groupId, privateKey) => {
    try {
        if (!privateKey) {
            console.error('Admin private key is not available.');
            return null;
        }

        const response = await fetch(`${baseUrl}/groups/groupKey/${groupId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
            },
        });

        const result = await response.json();


        if (response.ok) {
            if (!result.encryptedGroupKey) {
                console.error('Encrypted group key not found in the response.');
                return null;
            }
            try {
                const decryptedGroupKey = await decryptWithPrivateKey(result.encryptedGroupKey, privateKey);

                return decryptedGroupKey;
            } catch (decryptionError) {
                console.error('Error decrypting group key:', decryptionError);
                return null;
            }
        } else {
            console.error('Error fetching group key:', result.message);
            return null;
        }
    } catch (error) {
        console.error('Error in fetchAndDecryptGroupKey:', error);
        return null;
    }
};


const encryptWithAES = async (text, binaryKeyString) => {
    // Convert hex string to Uint8Array
    const keyByteArray = hexStringToUint8Array(binaryKeyString);


    // Import the key to a CryptoKey object
    const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyByteArray,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );

    // Convert the text to a buffer
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Generate a random initialization vector (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Perform the encryption
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        data
    );

    // Combine the IV and the encrypted data and return it as a base64-encoded string
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(new Uint8Array(iv), 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);

    return bufferToBase64(combined);
};


const decryptWithAES = async (encryptedText, binaryKeyString) => {
    // Convert binary string to ArrayBuffer
    const keyBuffer = hexStringToUint8Array(binaryKeyString);

    // Convert the base64-encoded string to a buffer
    const combined = base64ToBuffer(encryptedText);

    // Extract the IV from the buffer (first 12 bytes, as used in encryptWithAES)
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Import the key to a CryptoKey object
    const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    // Perform the decryption
    try {
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            cryptoKey,
            encryptedData
        );

        // Convert the decrypted buffer back into a string
        const decoder = new TextDecoder();

        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Error decrypting message:', error);
        return null; // or handle error as appropriate
    }
};

const hexStringToUint8Array = (hexString) => {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
};

const getUserIdFromToken = () => {
    const token = localStorage.getItem('userToken');
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload).id; // Adjust depending on the token's payload structure
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

const base64ToUint8Array = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export {
    getPrivateKey, base64ToBinary, binaryToHex, generateGroupKey, openDB, storePrivateKey, fetchUserPublicKey, encryptWithPublicKey, binaryStringToByteArray, decryptWithPrivateKey, pemToBuffer, base64ToBuffer, bufferToBase64, fetchAndDecryptGroupKey, encryptWithAES, decryptWithAES, hexStringToUint8Array, getUserIdFromToken
}
