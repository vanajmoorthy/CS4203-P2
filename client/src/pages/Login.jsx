import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const baseUrl = "http://localhost:3000";

    const handleLogin = async () => {
        console.log(username, password);
        try {
            const response = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            // Check if the login was successful
            if (response.ok && data.token) {
                console.log('Login Success:', data);
                localStorage.setItem('userToken', data.token);
                if (onLogin) {
                    onLogin(username, password);
                }

            } else {
                // Handle login failure
                console.error('Login failed:', data.message || 'Unknown error');
            }
        } catch (error) {
            console.error("Error logging in: " + error);
        }
    };


    return (
        <div style={styles.form}>
            <h2>Login</h2>
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
            <button onClick={handleLogin} style={styles.button}>Login</button>
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

export default Login;