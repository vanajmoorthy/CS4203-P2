import React, { useState } from 'react';
import CryptoJS from 'crypto-js';
import { BrowserRouter as Router, Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import GroupManagement from './pages/GroupManagement';

const App = () => {
  const [userToken, setUserToken] = useState(localStorage.getItem('userToken'));




  const encryptMessage = (message, secretKey) => {
    return CryptoJS.AES.encrypt(message, secretKey).toString();
  };

  const decryptMessage = (ciphertext, secretKey) => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const sendMessage = async (message, groupId) => {
    const groupKey = getGroupKey(groupId); // Function to retrieve the group's key
    const encryptedMessage = encryptMessage(message, groupKey);

    // Send the encrypted message to the server
    const response = await fetch('/api/sendMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourAuthToken}` // Include your auth token
      },
      body: JSON.stringify({ content: encryptedMessage, groupId })
    });

    return response.json();
  };

  const receiveMessage = (encryptedMessage, groupId) => {
    const groupKey = getGroupKey(groupId);
    return decryptMessage(encryptedMessage, groupKey);
  };


  const handleLogin = (username, password) => {
    // ... login logic
    // On successful login:
    setUserToken("");
  };

  const handleRegister = (username, password, publicKey) => {
    // ... registration logic
  };



  const isLoggedIn = () => {
    return localStorage.getItem('userToken') !== null;
  };

  const getUserIdFromToken = () => {
    const token = localStorage.getItem('userToken');
    if (!token) return null;

    try {
      const base64Url = token.split('.')[1]; // Get the payload part of the token
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return payload.id;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isLoggedIn() ? <Navigate to="/groups" /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={isLoggedIn() ? <Navigate to="/groups" /> : <Register onRegister={handleRegister} />} />
        <Route path="/groups" element={isLoggedIn() ? <GroupManagement userId={getUserIdFromToken()} /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
};



export default App;
