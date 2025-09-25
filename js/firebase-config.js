<!-- include this on every page that needs Firebase, BEFORE your app scripts -->
<script type="module">
  // Firebase v10 modular via CDN
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyBA_hgPBgcwrkQJdxhIYFKd8GzmFee_l-I",
    authDomain: "affordable-properties.firebaseapp.com",
    projectId: "affordable-properties",
    storageBucket: "affordable-properties.firebasestorage.app",
    messagingSenderId: "483837713112",
    appId: "1:483837713112:web:8232658b5dfd13aa1995ad",
    measurementId: "G-EF9PN8SZGQ"
  };

  // Make app/auth/db available globally
  window._app = initializeApp(firebaseConfig);
  window._auth = getAuth(window._app);
  window._db = getFirestore(window._app);
</script>
