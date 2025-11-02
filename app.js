const firebaseConfig = {
  apiKey: "AIzaSyDy_GTVZvwCZp8eLYvd_TUPI-uo_Jp5MpY",
  authDomain: "laamsocial-98cce.firebaseapp.com",
  projectId: "laamsocial-98cce",
  storageBucket: "laamsocial-98cce.appspot.com",
  messagingSenderId: "649707204234",
  appId: "1:649707204234:web:9be9178e24888c2c674773"
};

// Firebase init
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const message = document.getElementById("message");

// Auth Register/Login
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

// Dashboard & Feed Logic
if (window.location.pathname.includes("dashboard.html")) {
  const userEmail = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");
  const postForm = document.getElementById("postForm");
  const postText = document.getElementById("postText");
  const postImage = document.getElementById("postImage");
  const feed = document.getElementById("feed");

  auth.onAuthStateChanged((user) => {
    if (user) {
      userEmail.textContent = user.email;
      loadFeed();
    } else {
      window.location.href = "index.html";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const text = postText.value.trim();
    const file = postImage.files[0];
    let imageUrl = "";

    if (file) {
      const ref = storage.ref(`posts/${Date.now()}_${file.name}`);
      await ref.put(file);
      imageUrl = await ref.getDownloadURL();
    }

    await db.collection("posts").add({
      user: user.email,
      text,
      imageUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    postText.value = "";
    postImage.value = "";
    loadFeed();
  });

  async function loadFeed() {
    feed.innerHTML = "<p>Loading posts...</p>";
    const snapshot = await db.collection("posts").orderBy("createdAt", "desc").get();
    feed.innerHTML = "";
    snapshot.forEach((doc) => {
      const post = doc.data();
      const div = document.createElement("div");
      div.className = "post-card";
      div.innerHTML = `
        <p><strong>${post.user}</strong></p>
        <p>${post.text || ""}</p>
        ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image"/>` : ""}
      `;
      feed.appendChild(div);
    });
  }
}
