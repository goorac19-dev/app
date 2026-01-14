// Goorac Service Worker for Background Notifications
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 1. Initialize Firebase inside the Service Worker
// Note: Only the config keys are needed here
firebase.initializeApp({
    apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
    projectId: "goorac-c3b59",
    messagingSenderId: "746746595332",
    appId: "1:746746595332:web:d3f8527d27fe8ca2530d51"
});

const messaging = firebase.messaging();

// 2. Handle background messages
messaging.onBackgroundMessage(function(payload) {
    console.log('[Goorac SW] Received background message:', payload);

    // Extract notification details from the payload
    const notificationTitle = payload.notification.title || "Goorac Alert";
    const notificationOptions = {
        body: payload.notification.body || "You have a new update.",
        icon: payload.notification.icon || 'https://via.placeholder.com/128/00d2ff/ffffff?text=G', // Temporary placeholder
        badge: 'https://via.placeholder.com/128/00d2ff/ffffff?text=G',
        click_action: payload.data.click_action || '/calls.html', // Redirect to calls page
        data: payload.data,
        tag: 'call-notification', // Prevents multiple notifications stacking
        renotify: true
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 3. Handle what happens when the user clicks the notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Close the notification popup

    const targetUrl = event.notification.data.click_action || '/calls.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // If a tab is already open, focus it
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no tab is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});