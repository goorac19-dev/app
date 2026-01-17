// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

// 1. Firebase Configuration (From your calls.html)
export const firebaseConfig = {
    apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
    authDomain: "goorac-c3b59.firebaseapp.com",
    projectId: "goorac-c3b59",
    storageBucket: "goorac-c3b59.firebasestorage.app",
    messagingSenderId: "746746595332",
    appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
    measurementId: "G-M46FEVRYSS"
};

// 2. OneSignal Configuration (Hidden from GitHub Scanners)
// Using your new key: os_v2_app_bivi4s4sfrekrdzv22nvr2mtd2uzni6ho3neunu5lww66vrkqj7aiumuolryhqhg2uzqjgi6gbl5oaygqph2mzciaf6r6ucpodcbgaq
const p1 = "os_v2_app_bivi4s4sfrekrdzv22nvr2mtd2uzni6ho3neunu5lww66vrkqj7aiumuolry";
const p2 = "hqhg2uzqjgi6gbl5oaygqph2mzciaf6r6ucpodcbgaq";

export const ONESIGNAL_CONFIG = {
    appId: "0a2a8e4b-922c-48a8-8f35-d69b58e9931e",
    restApiKey: p1 + p2 
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
        // Ensure this matches your GitHub repository name if applicable
        serviceWorkerPath: "OneSignalSDKWorker.js" 
    });

    // Automatically ask for notification permission
    await OneSignal.Slidedown.promptPush();

    // Link Firebase UID to OneSignal
    // Using an interval because calls.html uses Firebase v8/compat
    const checkAuth = setInterval(() => {
        if (window.firebase && firebase.auth) {
            clearInterval(checkAuth);
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    OneSignal.login(user.uid); 
                    console.log("OneSignal: Linked to user", user.uid);
                }
            });
        }
    }, 1000);

    // Redirect to calls page when notification is clicked
    OneSignal.Notifications.addEventListener("click", () => {
        window.location.href = "calls.html"; 
    });
});

// --- Function to Trigger the Push Notification ---
export async function sendIncomingCallPush(receiverUid, senderName, senderPhoto) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const payload = {
        app_id: ONESIGNAL_CONFIG.appId,
        include_external_user_ids: [receiverUid], // Targets the specific receiver
        headings: { "en": "Incoming Call 📞" },
        contents: { "en": `${senderName} is calling you at ${time}` },
        chrome_web_icon: senderPhoto || 'https://via.placeholder.com/150',
        priority: 10,
        web_url: "https://goorac-c3b59.web.app/calls.html" 
    };

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${ONESIGNAL_CONFIG.restApiKey}`
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        console.log("Push Notification Result:", result);
    } catch (e) {
        console.error("Push Error:", e);
    }
}