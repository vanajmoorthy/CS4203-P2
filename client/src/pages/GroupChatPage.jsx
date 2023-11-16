// GroupChatPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPrivateKey, encryptWithAES, decryptWithPrivateKey, fetchAndDecryptGroupKey, hexStringToUint8Array, getUserIdFromToken } from '../cryptoUtils';

const GroupChatPage = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [groupDetails, setGroupDetails] = useState({ name: '', members: [] });
    const { groupId } = useParams();
    const [userPrivateKey, setUserPrivateKey] = useState(null);
    const [groupKey, setGroupKey] = useState(null)

    const baseUrl = "http://localhost:3000";

    useEffect(() => {
        loadPrivateKey();
        fetchGroupMembers(groupId);
    }, [groupId]);

    useEffect(() => {
        const fetchKeyAndMessages = async () => {
            if (userPrivateKey) {
                try {
                    const decryptedKey = await fetchAndDecryptGroupKey(groupId, userPrivateKey);
                    setGroupKey(decryptedKey);
                    fetchMessages(); // Now dependent on userPrivateKey
                } catch (error) {
                    console.error("Error in fetching and decrypting group key:", error);
                }
            }
        };

        fetchKeyAndMessages();
    }, [groupId, userPrivateKey]);

    const loadPrivateKey = async () => {
        try {
            const privateKey = await getPrivateKey();
            setUserPrivateKey(privateKey);
        } catch (error) {
            console.error("Error loading private key:", error);
        }
    };
    const fetchGroupMembers = async (groupId) => {
        try {
            const response = await fetch(`${baseUrl}/groups/details/${groupId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                },
            });
            const result = await response.json();
            if (response.ok) {
                setGroupDetails(result);
            } else {
                console.error('Error fetching group members:', result.message);
            }

        } catch (error) {
            console.error('Network error:', error);
        }
    };


    const fetchMessages = async () => {
        try {
            const response = await fetch(`${baseUrl}/groups/messages/${groupId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                },
            });
            const result = await response.json();

            if (response.ok && groupKey) {
                const decryptedMessages = await Promise.all(
                    result.messages.map(async (msg) => {
                        const decryptedContent = await decryptWithAES(msg.content, groupKey);
                        return {
                            ...msg,
                            content: decryptedContent,
                        };
                    })
                );
                setMessages(decryptedMessages);
            } else {
                console.error('Error fetching messages:', result.message);
            }
        } catch (error) {
            console.error('Network error:', error);
        }
    };

    const handleSendMessage = async () => {
        try {
            if (!groupKey) {
                console.error("Group key not available for encryption.");
                return;
            }

            const groupKeyArrayBuffer = hexStringToUint8Array(groupKey)

            const encryptedContent = await encryptWithAES(newMessage, groupKeyArrayBuffer);

            const userId = getUserIdFromToken();
            if (!userId) {
                console.error("User ID is not available.");
                return;
            }

            const response = await fetch(`${baseUrl}/groups/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                },
                body: JSON.stringify({
                    content: encryptedContent,
                    senderId: userId,
                    groupId,
                }),
            });

            if (response.ok) {
                setMessages([...messages, { content: newMessage, sender: userId }]);
                setNewMessage('');
            } else {
                console.error('Error sending message');
            }
        } catch (error) {
            console.error('Error in handleSendMessage:', error);
        }
    };


    return (
        <div>
            <h2>Group Chat - {groupDetails.name}</h2>

            <div>
                <h3>Members</h3>
                <ul>
                    {groupDetails.members.map((member, index) => (
                        <li key={index}>{member.username}</li> // Display member names
                    ))}
                </ul>
            </div>

            <div>
                {messages.map((message, index) => (
                    <div key={index}>{message.content}</div> // Display decrypted messages
                ))}
            </div>

            <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
            />
            <button onClick={handleSendMessage}>Send</button>
        </div>
    );
};

export default GroupChatPage;
