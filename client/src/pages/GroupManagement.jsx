import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrivateKey, fetchUserPublicKey, encryptWithPublicKey, fetchAndDecryptGroupKey } from '../cryptoUtils';

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
            const response = await fetch(`${baseUrl}/groups/createGroup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add your authentication headers here
                },
                body: JSON.stringify({ groupName, userId })
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

    const handleLogout = () => {
        localStorage.removeItem('userToken'); // Clear the token from local storage

        navigate('/login'); // Redirect to the login page
    };

    const navigateToGroupChat = (groupId) => {
        navigate(`/group-chat/${groupId}`); // Redirect to the group chat page
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
                    <h3 onClick={() => navigateToGroupChat(group._id)} >{group.name}</h3>
                    {/* Add a button to select this group */}
                    <button onClick={async () => {
                        setSelectedGroupId(group._id);
                        const key = await fetchAndDecryptGroupKey(group._id, adminPrivateKey);
                        if (key) {
                            setGroupKey(key);
                        } else {
                            // Handle the case where key retrieval failed
                        }
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
