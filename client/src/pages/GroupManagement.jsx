import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrivateKey } from '../cryptoUtils';

const GroupManagement = ({ userId }) => {
    const [groupName, setGroupName] = useState('');
    const [groups, setGroups] = useState([]); // State to store groups
    const baseUrl = "http://localhost:3000";

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [groupKey, setGroupKey] = useState(null);
    const [adminPrivateKey, setAdminPrivateKey] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchGroups();
        loadPrivateKey();
    }, []);

    const loadPrivateKey = async () => {
        try {
            const privateKey = await getPrivateKey();
            setAdminPrivateKey(privateKey);
        } catch (error) {
            console.error("Error loading private key:", error);
        }
    };

    const searchUsers = async () => {
        try {
            const response = await fetch(`${baseUrl}/groups/searchUsers?username=${searchTerm}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                },
            });

            const result = await response.json();
            if (response.ok) {
                setSearchResults(result.users);
            } else {
                console.error('Error searching users:', result.message);
            }
        } catch (error) {
            console.error('Network error:', error);
        }
    };


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
            console.log("Encrypting data with public key:");
            console.log("Public Key: " + publicKey);
            console.log("Data: " + typeof data);

            // Convert the public key from a PEM string to a CryptoKey object
            const cryptoKey = await window.crypto.subtle.importKey(
                "spki",
                pemToBuffer(publicKey),
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["encrypt"]
            );

            // Convert the data to an ArrayBuffer
            let encoded = new TextEncoder().encode(data);

            console.log("Encoded data length: " + encoded.byteLength);
            console.log("Encoded data: " + bufferToBase64(encoded));
            console.log("Crypto Key:", cryptoKey);

            // Encrypt the data
            let encrypted = await window.crypto.subtle.encrypt(
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                cryptoKey,
                encoded
            );

            console.log("Encryption successful. Encrypted data: " + bufferToBase64(encrypted));

            return bufferToBase64(encrypted);
        } catch (error) {
            console.error("Error during encryption:", error);
            throw error; // Rethrow the error to handle it at a higher level
        }
    }


    const decryptWithPrivateKey = async (encryptedData, privateKey) => {
        if (!(privateKey instanceof CryptoKey)) {
            throw new Error('Expected privateKey to be a CryptoKey');
        }

        // Ensure privateKey is for decryption
        if (!privateKey.usages.includes('decrypt')) {
            throw new Error('Private key does not support decryption');
        }

        // Convert the encrypted data from Base64 to an ArrayBuffer
        let encryptedBuffer = base64ToBuffer(encryptedData);

        console.log(encryptedData)
        console.log(encryptedBuffer)
        console.log(privateKey.usages)


        // Decrypt the data
        let decrypted = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            privateKey,
            encryptedBuffer
        );
        console.log("dec: " + decrypted)
        return new TextDecoder().decode(decrypted);
    }

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

    const fetchAndDecryptGroupKey = async (groupId) => {
        try {
            if (!adminPrivateKey) {
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
                    const decryptedGroupKey = await decryptWithPrivateKey(result.encryptedGroupKey, adminPrivateKey);
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


    const addUserToGroup = async (groupId, newUserId, groupKey) => {
        try {
            // Fetch the new user's public key
            const newUserPublicKey = await fetchUserPublicKey(newUserId);
            if (!newUserPublicKey) {
                throw new Error("Failed to fetch new user's public key");
            }

            // Encrypt the group key with the new user's public key
            const encryptedGroupKeyForNewUser = await encryptWithPublicKey(groupKey, newUserPublicKey);

            if (!encryptedGroupKeyForNewUser) {
                throw new Error("Failed to encrypt group key for new user");
            }

            // Send request to backend to add user to group
            const response = await fetch(`${baseUrl}/groups/addGroupMember`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                },
                body: JSON.stringify({ groupId, newUserId, encryptedGroupKey: encryptedGroupKeyForNewUser })
            });

            const result = await response.json();
            if (response.ok) {
                console.log('User added to group:', result);
            } else {
                console.error('Error adding user to group:', result.message);
            }
        } catch (error) {
            console.error('Error in addUserToGroup:', error);
        }
    };

    const fetchGroups = async () => {
        try {
            const response = await fetch(`${baseUrl}/groups/adminGroups`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`, // Assuming you store the token in localStorage
                },
            });

            const result = await response.json();

            if (response.ok) {
                setGroups(result.groups); // Assuming the response has a 'groups' field
            } else {
                console.error('Error fetching groups:', result.message);
            }
        } catch (error) {
            console.error('Network error:', error);
        }
    };
    const createGroup = async () => {
        event.preventDefault()

        try {
            // Generate a new group key
            const groupKey = await generateGroupKey(); // Implement this function to generate a group key

            // Encrypt the group key with the admin's public key

            const adminPublicKey = await fetchUserPublicKey(userId);

            const encryptedGroupKey = await encryptWithPublicKey(groupKey, adminPublicKey);

            if (!encryptedGroupKey) {
                throw new Error("Failed to encrypt group key for group creation");
            }

            const response = await fetch(`${baseUrl}/groups/createGroup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add your authentication headers here
                },
                body: JSON.stringify({ groupName, userId, encryptedGroupKey })
            });

            const result = await response.json();

            if (response.ok) {
                console.log('Group created:', result);
                // Handle successful group creation
            } else {
                console.error('Error creating group:', result.message);
                // Handle errors
            }
        } catch (error) {
            console.error('Network error:', error);
            // Handle network errors
        }
    }

    const generateGroupKey = async () => {
        // Generate a new symmetric key for the group (e.g., AES key)
        const groupKey = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );


        // Export the group key as an ArrayBuffer
        const exportedGroupKey = await window.crypto.subtle.exportKey("spki", groupKey.publicKey);
        console.log("exported group key: " + exportedGroupKey)
        // Convert the exported key to a Base64-encoded string for storage and sharing
        const groupKeyBase64 = bufferToBase64(exportedGroupKey);

        return groupKeyBase64;
    };


    const handleLogout = () => {
        localStorage.removeItem('userToken'); // Clear the token from local storage

        navigate('/login'); // Redirect to the login page
    };


    return (
        <div>
            <form onSubmit={createGroup} style={styles.form}>
                <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group Name"
                    required
                    style={styles.input}
                />
                <button type="submit" style={styles.button}>Create Group</button>
            </form>
            <button onClick={handleLogout} style={styles.button}>Logout</button> {/* Logout button */}
            {groups.map(group => (
                <div key={group._id}>
                    <h3>{group.name}</h3>
                    {/* Add a button to select this group */}
                    <button onClick={async () => {
                        setSelectedGroupId(group._id);
                        const key = await fetchAndDecryptGroupKey(group._id);
                        // console.log(groupKey)
                        setGroupKey(key);
                    }}>Select Group</button>
                </div>
            ))}

            <div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Users"
                />
                <button onClick={searchUsers}>Search</button>
            </div>
            <div>
                {searchResults.map(user => (
                    <div key={user._id}>
                        {user.username}
                        {/* Add a button to add the user to the selected group */}
                        <button onClick={() => addUserToGroup(selectedGroupId, user._id, groupKey)}>Add to Group</button>
                    </div>
                ))}

            </div>
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
    button: {
        padding: '10px 20px',
        cursor: 'pointer',
    },
    input: {
        display: 'block',
        margin: '10px 0',
        padding: '10px',
        width: '200px',
    }
}

export default GroupManagement;
