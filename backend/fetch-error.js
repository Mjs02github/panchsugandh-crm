const http = require('https');

const data = JSON.stringify({ email: 'Mjs@vbnm.club', password: 'Admin' });

const options = {
  hostname: 'vbnm.club',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => { console.log("RAW BODY:", body); });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
