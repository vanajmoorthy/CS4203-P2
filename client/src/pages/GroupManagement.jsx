import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GroupManagement = ({ userId }) => {
    const [groupName, setGroupName] = useState('');
    const baseUrl = "http://localhost:3000";

    const navigate = useNavigate();

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
        console.log("loggingout")
        localStorage.removeItem('userToken'); // Clear the token from local storage
        console.log("loggingout")

        navigate('/login'); // Redirect to the login page
        console.log("loggingoutt after nav")

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
