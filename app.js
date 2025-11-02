import { auth, db, storage } from './firebase.js';
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  collection, addDoc, getDocs, serverTimestamp, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js";

const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const feed = document.getElementById("feed");

const chatUserSelect = document.getElementById("chatUserSelect");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

let currentUserEmail = "";
let unsubscribeChat = null;

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserEmail = user.email;
    userEmail.textContent = currentUserEmail;
    await loadFeed();
    await loadUsers();
  } else {
    window.location.href = "index.html";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  if (unsubscribeChat) unsubscribeChat();
  await signOut(auth);
  window.location.href = "index.html";
});

// Post functionality
postBtn.addEventListener("click", async () => {
  let text = postText.value.trim();
  let file = postImage.files[0];
  let imageUrl = "";

  if (file) {
    const fileRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    imageUrl = await getDownloadURL(fileRef);
  }

  await addDoc(collection(db, "posts"), {
    user: currentUserEmail,
    text,
    imageUrl,
    createdAt: serverTimestamp()
  });

  postText.value = "";
  postImage.value = "";
  loadFeed();
});

// Load Feed
async function loadFeed() {
  feed.innerHTML = "<p>Loading posts...</p>";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  feed.innerHTML = "";
  snapshot.forEach(doc => {
    const post = doc.data();
    const div = document.createElement("div");
    div.className = "post-card";
    div.innerHTML = `<p><strong>${post.user}</strong></p>
                     <p>${post.text || ""}</p>
                     ${post.imageUrl ? `<img src="${post.imageUrl}"/>` : ""}`;
    feed.appendChild(div);
  });
}

// Load Users for chat
async function loadUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  chatUserSelect.innerHTML = `<option value="">Select User</option>`;
  snapshot.forEach(doc => {
    const email = doc.data().email;
    if(email !== currentUserEmail){
      chatUserSelect.innerHTML += `<option value="${email}">${email}</option>`;
    }
  });
}

// Chat send
sendBtn.addEventListener("click", async () => {
  const toUser = chatUserSelect.value;
  const message = chatInput.value.trim();
  if(!toUser || !message) return;

  await addDoc(collection(db, "chats"), {
    from: currentUserEmail,
    to: toUser,
    message,
    createdAt: serverTimestamp()
  });

  chatInput.value = "";
});

// Chat user select change → setup live listener
chatUserSelect.addEventListener("change", () => {
  const toUser = chatUserSelect.value;
  if(unsubscribeChat) unsubscribeChat(); // remove previous listener
  if(!toUser) {
    chatBox.innerHTML = "";
    return;
  }

  const chatsQuery = query(
    collection(db, "chats"),
    orderBy("createdAt")
  );

  unsubscribeChat = onSnapshot(chatsQuery, (snapshot) => {
    chatBox.innerHTML = "";
    snapshot.forEach(doc => {
      const chat = doc.data();
      if((chat.from === currentUserEmail && chat.to === toUser) ||
         (chat.from === toUser && chat.to === currentUserEmail)){
        const div = document.createElement("div");
        div.className = `chat-message ${chat.from === currentUserEmail ? "self" : ""}`;
        div.textContent = `${chat.from}: ${chat.message}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    });
  });
});
