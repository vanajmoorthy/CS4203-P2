
const dbName = "cryptoKeys";
const storeName = "keys";

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

export {
    getPrivateKey, openDB, storePrivateKey
}