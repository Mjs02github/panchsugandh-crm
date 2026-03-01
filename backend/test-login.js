require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testLogin() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const email = 'Mjs@vbnm.club';
        const rawPassword = 'Admin';
        console.log(`Testing login for raw email: ${email}`);

        const searchEmail = email.toLowerCase().trim();
        console.log(`Sending DB search for: ${searchEmail}`);

        const [rows] = await connection.execute(
            `SELECT u.id, u.name, u.email, u.password, u.is_active, u.manager_id, r.name AS role
             FROM users u JOIN roles r ON u.role_id = r.id
             WHERE u.email = ? LIMIT 1`,
            [searchEmail]
        );

        if (!rows.length) {
            console.log('User not found in DB with that email!');
        } else {
            const user = rows[0];
            console.log('User found! Checking password...');
            const isMatch = await bcrypt.compare(rawPassword, user.password);
            if (!isMatch) {
                console.log('Password DID NOT match!');
            } else {
                console.log('Password MATCHED! Login successful.');
            }
        }

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

testLogin();
