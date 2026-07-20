const axios = require('axios');
const http = require('http');
const url = require('url');
require('dotenv').config();

// Helper to get environment variables handling extra spaces
const getCleanEnvVar = (baseKey) => {
    const keysToCheck = [
        `${baseKey} `,
        ` ${baseKey}`,
        baseKey
    ];
    for (const k of keysToCheck) {
        if (process.env[k] !== undefined) {
            const val = process.env[k].trim();
            if (val) return val;
        }
    }
    return null;
};

const GMAIL_CLIENT_ID = getCleanEnvVar('GMAIL_CLIENT_ID');
const GMAIL_CLIENT_SECRET = getCleanEnvVar('GMAIL_CLIENT_SECRET');

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    console.error('❌ ERROR: GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET is missing in your .env file.');
    process.exit(1);
}

// Redirect URI for local helper server
const PORT = 3002;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPE = 'https://mail.google.com/';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GMAIL_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;

console.log('================================================================');
console.log('              GMAIL OAUTH REFRESH TOKEN GENERATOR               ');
console.log('================================================================');
console.log('1. Open the following link in your browser to authorize:');
console.log('\n' + authUrl + '\n');

const server = http.createServer(async (req, res) => {
    try {
        const query = url.parse(req.url, true).query;
        if (query.code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h3>Authorization Successful! You can close this tab and return to the terminal.</h3>');
            
            console.log('2. Exchanging code for tokens...');
            
            const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                code: query.code,
                client_id: GMAIL_CLIENT_ID,
                client_secret: GMAIL_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            });

            console.log('\n================ SUCCESS! ================');
            console.log('Add the following refresh token to your .env file:\n');
            console.log(`GMAIL_REFRESH_TOKEN=${tokenResponse.data.refresh_token}`);
            console.log('==========================================');
            
            server.close();
            process.exit(0);
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('No authorization code found.');
        }
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error retrieving token: ' + err.message);
        console.error('❌ Error exchanging code:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
});

server.listen(PORT, () => {
    console.log(`Waiting for authorization redirect on ${REDIRECT_URI} ...`);
    console.log('If your browser does not open automatically, copy and paste the link above.');
});
