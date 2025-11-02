// ==== LaamSocial Firebase Auth ====

const firebaseConfig = {
  apiKey: "AIzaSyDy_GTVZvwCZp8eLYvd_TUPI-uo_Jp5MpY",
  authDomain: "laamsocial-98cce.firebaseapp.com",
  projectId: "laamsocial-98cce",
  storageBucket: "laamsocial-98cce.appspot.com",
  messagingSenderId: "649707204234",
  appId: "1:649707204234:web:9be9178e24888c2c674773"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const message = document.getElementById("message");

// Register
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    try {
      await auth.createUserWithEmailAndPassword(email, password);
      message.style.color = "green";
      message.textContent = "Account created successfully!";
      setTimeout(() => (window.location.href = "dashboard.html"), 1500);
    } catch (error) {
      message.style.color = "red";
      message.textContent = error.message;
    }
  });
}

// Login
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    try {
      await auth.signInWithEmailAndPassword(email, password);
      message.style.color = "green";
      message.textContent = "Login successful!";
      setTimeout(() => (window.location.href = "dashboard.html"), 1000);
    } catch (error) {
      message.style.color = "red";
      message.textContent = error.message;
    }
  });
}

// Dashboard page functionality
if (window.location.pathname.includes("dashboard.html")) {
  const userEmail = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");

  auth.onAuthStateChanged((user) => {
    if (user) {
      userEmail.textContent = user.email;
    } else {
      window.location.href = "index.html";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });
}
