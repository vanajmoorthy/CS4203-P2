import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = ({ onRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const baseUrl = "http://localhost:3000";

    const dbName = "cryptoKeys";
    const storeName = "keys";
    const navigate = useNavigate();

    useEffect(() => {
        generateKeyPair();
    }, []);

    const generateKeyPair = async () => {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );

        // Export the public key
        const exportedPublicKey = await window.crypto.subtle.exportKey(
            "spki",
            keyPair.publicKey
        );

        // Convert the exported key to Base64 to send to the server
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublicKey)));
        const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`;
        setPublicKey(publicKeyPEM);

        // Store the private key securely
        await storePrivateKey(keyPair.privateKey);
    };
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

    async function getPrivateKey() {
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

    const handleRegister = async () => {
        try {
            // Registration request
            const registerResponse = await fetch(`${baseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, publicKey }),
            });

            const registerData = await registerResponse.json();
            console.log("Registration info: " + registerData.message);

            // If registration is successful, proceed to login
            if (registerResponse.ok) {
                // Login request
                const loginResponse = await fetch(`${baseUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const loginData = await loginResponse.json();

                // If login is successful, set the user token and redirect
                if (loginResponse.ok) {
                    console.log('Login Success:', loginData);
                    localStorage.setItem('userToken', loginData.token);

                    navigate('/groups'); // if you are using react-router
                } else {
                    console.error("Error logging in after registration");
                }
            }
        } catch (error) {
            console.error("Error during registration or login: " + error);
        }
    };



    return (
        <div style={styles.form}>
            <h2>Register</h2>
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                style={styles.input}
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={styles.input}
            />
            <button onClick={handleRegister} style={styles.button}>Register</button>
        </div>
    );
};

const styles = {
    form: {
        margin: '10px',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '5px',
    },
    input: {
        display: 'block',
        margin: '10px 0',
        padding: '10px',
        width: '200px',
    },
    button: {
        padding: '10px 20px',
        cursor: 'pointer',
    }
};

export default Register;
