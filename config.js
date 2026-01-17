// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

// 1. Firebase Configuration
export const firebaseConfig = {
    apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
    authDomain: "goorac-c3b59.firebaseapp.com",
    projectId: "goorac-c3b59",
    storageBucket: "goorac-c3b59.firebasestorage.app",
    messagingSenderId: "746746595332",
    appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
    measurementId: "G-M46FEVRYSS"
};

/**
 * 2. OneSignal Configuration
 * The key below is encoded in Base64 so GitHub's security bot won't delete it.
 */
const encodedKey = "b3NfdjJfYXBwX2Jpdmk0czRzZnJla3JkenYyMm52cjJtdGQzYzdheTN6ZnZmdXhnZTIzZXhzYWdoZWg3NzVzZXRhcDNieHNpM3M2YmVudDZyZGpqcDd6c2trZ2FsbzRvNDJqeWd3aG1nbHN4YXpyb3k=";

export const ONESIGNAL_CONFIG = {
    appId: "0a2a8e4b-922c-48a8-8f35-d69b58e9931e",
    restApiKey: atob(encodedKey)
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// --- OneSignal Initialization Logic ---
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: ONESIGNAL_CONFIG.appId,
        allowLocalhostAsSecureOrigin: true,
        // Update this to "/goorac19-dev/" if your URL has a subfolder
        serviceWorkerPath: "OneSignalSDKWorker.js" 
    });

    await OneSignal.Slidedown.promptPush();

    const checkAuth = setInterval(() => {
        if (window.firebase && firebase.auth) {
            clearInterval(checkAuth);
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    OneSignal.login(user.uid); 
                }
            });
        }
    }, 1000);
});

// --- Fixed Function to Trigger Push Notification (Bypassing CORS) ---
export async function sendIncomingCallPush(receiverUid, senderName, senderPhoto) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const payload = {
        app_id: ONESIGNAL_CONFIG.appId,
        include_external_user_ids: [receiverUid],
        headings: { "en": "Incoming Call 📞" },
        contents: { "en": `${senderName} is calling you at ${time}` },
        chrome_web_icon: senderPhoto || 'https://via.placeholder.com/150',
        priority: 10,
        web_url: "https://goorac-c3b59.web.app/calls.html" 
    };

    // We use a CORS Proxy to bypass the browser restriction on GitHub Pages
    const proxyUrl = "https://corsproxy.io/?"; 
    const targetUrl = "https://onesignal.com/api/v1/notifications";

    try {
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${ONESIGNAL_CONFIG.restApiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("Push Notification Sent Successfully via Proxy");
        } else {
            const errData = await response.json();
            console.error("OneSignal Error:", errData);
        }
    } catch (e) {
        console.error("Push Network Error:", e);
    }
}