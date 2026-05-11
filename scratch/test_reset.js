
const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/auth';

async function testResetFlow() {
    try {
        // 1. Request forgot password
        console.log('Requesting forgot password for test@example.com...');
        const forgotRes = await axios.post(`${BASE_URL}/forgot-password`, {
            email: 'test@example.com'
        });
        console.log('Forgot password response:', forgotRes.data);

        // Since I can't read the email, I'll have to check the database or mock it.
        // But I can't check the database easily from here without knowing the user's data.
        
        // Let's try to simulate what happens if we have a token.
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

// I can't easily run this because I don't have a running server or a way to intercept the email.
// But I can check the code logic.
