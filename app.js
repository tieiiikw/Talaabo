// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// TODO: REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* UI elements */
const registerBtn = document.getElementById("registerBtn");
const regFullName = document.getElementById("regFullName");
const regUsername = document.getElementById("regUsername");
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");
const regMsg = document.getElementById("regMsg");

const loginBtn = document.getElementById("loginBtn");
const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");
const loginMsg = document.getElementById("loginMsg");

const logoutBtn = document.getElementById("logoutBtn");
const userNameDisplay = document.getElementById("userNameDisplay");

const authArea = document.querySelector(".auth-wrap");
const dashboardArea = document.querySelector(".container-dashboard");

/* helpers */
function showMessage(el, msg, success = true) {
  el.textContent = msg;
  el.style.color = success ? "green" : "crimson";
  setTimeout(()=> { el.textContent = ""; }, 5000);
}

async function isUsernameTaken(username) {
  const docRef = doc(db, "usernames", username.toLowerCase());
  const snap = await getDoc(docRef);
  return snap.exists();
}

/* Registration flow */
registerBtn.addEventListener("click", async () => {
  const fullName = regFullName.value.trim();
  const username = regUsername.value.trim();
  const email = regEmail.value.trim();
  const password = regPassword.value;

  if (!fullName || !username || !email || password.length < 6) {
    showMessage(regMsg, "Fadlan buuxi dhammaan goobaha. Password min 6 chars.", false);
    return;
  }

  try {
    // check username availability
    const unameLower = username.toLowerCase();
    const unameRef = doc(db, "usernames", unameLower);
    const unameSnap = await getDoc(unameRef);
    if (unameSnap.exists()) {
      showMessage(regMsg, "Username la isticmaalay. Fadlan dooro mid kale.", false);
      return;
    }

    // create user in Firebase Auth
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    // set profile displayName
    await updateProfile(user, { displayName: username });

    // create user doc
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email,
      username: unameLower,
      fullName,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });

    // set username mapping document (username -> email + uid)
    await setDoc(unameRef, {
      uid: user.uid,
      email
    });

    showMessage(regMsg, "Registration successful! You are logged in.");
  } catch (err) {
    console.error(err);
    showMessage(regMsg, "Error: " + (err.message || err.code), false);
  }
});

/* Login flow (email or username) */
loginBtn.addEventListener("click", async () => {
  const identifier = loginIdentifier.value.trim();
  const password = loginPassword.value;
  if (!identifier || !password) {
    showMessage(loginMsg, "Gali email/username iyo password", false);
    return;
  }

  try {
    let emailToLogin = identifier;
    // if identifier doesn't look like email, try to map username -> email
    if (!identifier.includes("@")) {
      const unameLower = identifier.toLowerCase();
      const unameRef = doc(db, "usernames", unameLower);
      const unameSnap = await getDoc(unameRef);
      if (!unameSnap.exists()) {
        showMessage(loginMsg, "Username ma jiro.", false);
        return;
      }
      const data = unameSnap.data();
      emailToLogin = data.email;
    }

    // sign in with email
    await signInWithEmailAndPassword(auth, emailToLogin, password);
    showMessage(loginMsg, "Logged in!");
  } catch (err) {
    console.error(err);
    showMessage(loginMsg, "Login failed: " + (err.message || err.code), false);
  }
});

/* Logout */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

/* Auth state observer */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // show dashboard
    authArea.style.display = "none";
    dashboardArea.style.display = "flex";
    logoutBtn.style.display = "inline-block";

    // load user profile from Firestore
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        userNameDisplay.textContent = data.username || user.displayName || user.email;
        document.getElementById("profileFullName").textContent = data.fullName || "";
        document.getElementById("profileUsername").textContent = data.username || "";
        if (data.lastSeen && data.lastSeen.toDate) {
          document.getElementById("lastSeen").textContent = data.lastSeen.toDate().toLocaleString();
        } else {
          document.getElementById("lastSeen").textContent = "Just now";
        }

        // update lastSeen timestamp
        await updateDoc(userDocRef, { lastSeen: serverTimestamp() });
      } else {
        userNameDisplay.textContent = user.displayName || user.email;
      }
    } catch (err) {
      console.error("Load profile error:", err);
    }
  } else {
    // show auth forms
    authArea.style.display = "flex";
    dashboardArea.style.display = "none";
    logoutBtn.style.display = "none";
    userNameDisplay.textContent = "";
  }
});

/* Menu Navigation (existing code adapted) */
const sections = {
  home: document.getElementById("homeSection"),
  friends: document.getElementById("friendsSection"),
  messages: document.getElementById("messagesSection"),
  notifications: document.getElementById("notificationsSection"),
  profile: document.getElementById("profileSection")
};

function showSection(sectionName){
  for(const key in sections){
    sections[key].style.display = (key === sectionName) ? "block" : "none";
  }
}

document.getElementById("menuHome").addEventListener("click", ()=> showSection("home"));
document.getElementById("menuFriends").addEventListener("click", ()=> showSection("friends"));
document.getElementById("menuMessages").addEventListener("click", ()=> showSection("messages"));
document.getElementById("menuNotifications").addEventListener("click", ()=> showSection("notifications"));
document.getElementById("menuProfile").addEventListener("click", ()=> showSection("profile"));

/* Basic posting (example storing posts in Firestore) */
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const feed = document.getElementById("feed");

postBtn.addEventListener("click", async () => {
  const text = postText.value.trim();
  const user = auth.currentUser;
  if (!user) { alert("Login first"); return; }
  if (!text) return;
  try {
    const postsRef = collection(db, "posts");
    await setDoc(doc(postsRef), {
      authorUid: user.uid,
      content: text,
      createdAt: serverTimestamp()
    });
    postText.value = "";
    feed.textContent = "Post submitted!";
  } catch(err) {
    console.error(err);
    feed.textContent = "Failed to submit post.";
  }
});
