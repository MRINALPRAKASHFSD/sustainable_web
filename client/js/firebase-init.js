// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCcrmSuKbwTsUOigbZu_maCQmvf4HQ8ia4",
    authDomain: "krmu-impact-bf09e.firebaseapp.com",
    databaseURL: "https://krmu-impact-bf09e-default-rtdb.firebaseio.com",
    projectId: "krmu-impact-bf09e",
    storageBucket: "krmu-impact-bf09e.firebasestorage.app",
    messagingSenderId: "676855708371",
    appId: "1:676855708371:web:6e5ca271427a61312df226",
    measurementId: "G-2ZHP3D9F8F"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    // Expose services globally
    window.authDB = firebase.auth();
    window.db = firebase.firestore();
    console.log('🔥 Firebase initialized');
} else {
    console.error('Firebase SDK not loaded');
}
