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

// 2. OneSignal Configuration
export const ONESIGNAL_CONFIG = {
    appId: "0a2a8e4b-922c-48a8-8f35-d69b58e9931e",
    restApiKey: "os_v2_app_bivi4s4sfrekrdzv22nvr2mtd2wqudhdi4zukyu7y6qj2tauhs6hcqilycaodtz5rznp2jq7y3rdnykz4j3ssiovwvigq2ykhlxpusa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// --- OneSignal Initialization Logic ---
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: ONESIGNAL_CONFIG.appId,
        allowLocalhostAsSecureOrigin: true, // Crucial for testing on local live server
    });

    // This line forces the browser to show the "Allow Notifications" prompt
    await OneSignal.Slidedown.promptPush();

    // Link Firebase User to OneSignal (External ID)
    // Works with your existing Firebase auth logic in calls.html
    const checkAuth = setInterval(() => {
        if (window.firebase && firebase.auth) {
            clearInterval(checkAuth);
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    OneSignal.login(user.uid); 
                    console.log("OneSignal linked to Firebase UID:", user.uid);
                }
            });
        }
    }, 1000);

    // Redirect to calls.html when user clicks a notification
    OneSignal.Notifications.addEventListener("click", () => {
        window.location.href = "calls.html"; 
    });
});

// --- Function to Trigger the Push Notification ---
export async function sendIncomingCallPush(receiverUid, senderName, senderPhoto) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const payload = {
        app_id: ONESIGNAL_CONFIG.appId,
        include_external_user_ids: [receiverUid], // Target the person you are calling
        headings: { "en": "Incoming Call 📞" },
        contents: { "en": `${senderName} is calling you at ${time}` },
        chrome_web_icon: senderPhoto || 'https://via.placeholder.com/150',
        priority: 10,
        web_url: "https://goorac-c3b59.web.app/calls.html" 
    };

    try {
        await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${ONESIGNAL_CONFIG.restApiKey}`
            },
            body: JSON.stringify(payload)
        });
        console.log("Push sent to:", receiverUid);
    } catch (e) {
        console.error("Push Error:", e);
    }
}