const axios = require('axios');

async function testGST(gstin) {
    console.log(`Testing GSTIN: ${gstin}`);
    const urls = [
        `https://blog-backend.mastersindia.co/api/v1/custom/search/gstin/?keyword=${gstin}`
    ];

    for (const url of urls) {
        console.log(`\nTrying URL: ${url}`);
        try {
            const res = await axios.get(url, {
                headers: {
                    'authority': 'blog-backend.mastersindia.co',
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en;q=0.9',
                    'origin': 'https://www.mastersindia.co',
                    'referer': 'https://www.mastersindia.co/',
                    'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                },
                timeout: 10000
            });
            console.log('Status:', res.status);
            console.log('Data Preview:', JSON.stringify(res.data));
        } catch (err) {
            console.error('Error:', err.message);
            if (err.response) {
                console.error('Response Status:', err.response.status);
                console.error('Response Data Preview:', JSON.stringify(err.response.data));
            }
        }
    }
}

testGST('09ABEHS0965F1ZY');
