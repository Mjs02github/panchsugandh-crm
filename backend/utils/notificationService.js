const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const db = require('../db');

let fcmInitialized = false;

// Initialize Firebase Admin if service account exists
try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        fcmInitialized = true;
        console.log('✅ Firebase Admin initialized for Push Notifications.');
    } else {
        console.warn('⚠️ firebase-service-account.json not found. Push notifications will be DB-only.');
    }
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
}

/**
 * Send notification to a specific user
 * @param {number} userId - Recipient ID
 * @param {string} title - Notification title
 * @param {string} message - Notification body
 * @param {string} type - Notification type (ORDER_CREATED, BROADCAST, etc.)
 * @param {number} relatedId - Optional ID of related entity (e.g. order_id)
 */
async function sendNotification(userId, title, message, type = 'GENERAL', relatedId = null) {
    try {
        // 1. Save to database (In-app notification)
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)',
            [userId, title, message, type, relatedId]
        );

        // 2. Send Push Notification via FCM if initialized
        if (fcmInitialized) {
            const [tokens] = await db.query('SELECT token FROM fcm_tokens WHERE user_id = ?', [userId]);
            if (tokens.length > 0) {
                const registrationTokens = tokens.map(t => t.token);
                const payload = {
                    notification: {
                        title: title,
                        body: message,
                    },
                    data: {
                        type: type,
                        relatedId: String(relatedId || ''),
                    }
                };

                const response = await admin.messaging().sendEachForMulticast({
                    tokens: registrationTokens,
                    notification: payload.notification,
                    data: payload.data,
                });
                console.log(`Successfully sent push notification to ${response.successCount} devices.`);
            }
        }
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

/**
 * Broadcast notification to all users of a specific role
 * @param {string} role - Target role or 'ALL'
 * @param {string} title 
 * @param {string} message 
 */
async function broadcastNotification(role, title, message, createdBy = null) {
    try {
        let query = 'SELECT id FROM users WHERE is_active = 1';
        let params = [];
        if (role && role !== 'ALL') {
            query += ' AND role = ?';
            params.push(role);
        }

        const [users] = await db.query(query, params);
        for (const user of users) {
            await sendNotification(user.id, title, message, 'BROADCAST', null);
        }

        // Record in scheduled_notifications if it wasn't already there (for history)
        await db.query(
            'INSERT INTO scheduled_notifications (target_role, title, message, scheduled_at, is_sent, created_by) VALUES (?, ?, ?, NOW(), 1, ?)',
            [role || 'ALL', title, message, createdBy]
        );

    } catch (error) {
        console.error('Error broadcasting notification:', error);
    }
}

module.exports = {
    sendNotification,
    broadcastNotification
};
