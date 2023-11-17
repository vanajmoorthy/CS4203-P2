import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storePrivateKey } from "../cryptoUtils"
import * as forge from 'node-forge'

const Register = ({ onRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const baseUrl = "http://localhost:3000";

    const navigate = useNavigate();


    const generateKeyPair = () => {
        try {
            const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });

            // Extract the public key in PEM format
            const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);

            // Extract the private key in PEM format
            const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);

            // Store the private key
            storePrivateKey(privateKeyPem);

            console.log(publicKeyPem)
            console.log(privateKeyPem)

            return publicKeyPem;
        } catch (error) {
            console.error("Error generating key pair:", error);
        }
    };


    const handleRegister = async () => {
        const publicKey = generateKeyPair()

        if (!publicKey) {
            console.error("Failed to generate public key")
            return;
        }


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
                    localStorage.setItem('userName', loginData.username);


                    navigate('/groups');
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
