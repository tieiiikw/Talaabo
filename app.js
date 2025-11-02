import { auth, db, storage } from './firebase.js';
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  collection, addDoc, getDocs, serverTimestamp, query, orderBy, onSnapshot, updateDoc, where
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js";

// DOM Elements
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

const profileEmail = document.getElementById("profileEmail");
const lastSeenEl = document.getElementById("lastSeen");
const profilePicInput = document.getElementById("profilePicInput");
const profilePicDisplay = document.getElementById("profilePicDisplay");

const friendsList = document.getElementById("friendsList");
const notificationsList = document.getElementById("notificationsList");

let currentUserEmail = "";
let unsubscribeChat = null;

// -------- Auth State --------
onAuthStateChanged(auth, async (user) => {
  if(user){
    currentUserEmail = user.email;
    userEmail.textContent = currentUserEmail;
    profileEmail.textContent = currentUserEmail;

    // Add user if not exists
    const usersSnapshot = await getDocs(collection(db, "users"));
    let userDoc = usersSnapshot.docs.find(doc => doc.data().email === currentUserEmail);
    if(!userDoc){
      userDoc = await addDoc(collection(db, "users"), { email: currentUserEmail, lastSeen: serverTimestamp(), profilePic: "" });
    } else {
      await updateDoc(userDoc.ref, { lastSeen: serverTimestamp() });
      if(userDoc.data().profilePic) profilePicDisplay.src = userDoc.data().profilePic;
    }

    loadFeed();
    loadUsers();
    loadNotifications();
  } else {
    window.location.href = "index.html";
  }
});

// -------- Logout --------
logoutBtn.addEventListener("click", async () => {
  if(unsubscribeChat) unsubscribeChat();
  await signOut(auth);
  window.location.href = "index.html";
});

// -------- Profile Picture --------
profilePicInput.addEventListener("change", async () => {
  const file = profilePicInput.files[0];
  if(!file) return;
  const fileRef = ref(storage, `profilePics/${currentUserEmail}_${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  const usersSnapshot = await getDocs(collection(db, "users"));
  const userDoc = usersSnapshot.docs.find(doc => doc.data().email === currentUserEmail);
  await updateDoc(userDoc.ref, { profilePic: url });
  profilePicDisplay.src = url;
});

// -------- Post Functionality --------
postBtn.addEventListener("click", async () => {
  let text = postText.value.trim();
  let file = postImage.files[0];
  let imageUrl = "";

  if(file){
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
  loadNotifications();
});

// -------- Load Feed --------
async function loadFeed(filterUser=null){
  feed.innerHTML = "<p>Loading posts...</p>";
  let q;
  if(filterUser){
    q = query(collection(db, "posts"), where("user","==",filterUser), orderBy("createdAt"));
  } else {
    q = query(collection(db, "posts"), orderBy("createdAt","desc"));
  }
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

// -------- Load Users (Friends) --------
async function loadUsers(){
  const snapshot = await getDocs(collection(db, "users"));
  friendsList.innerHTML = "";
  chatUserSelect.innerHTML = `<option value="">Select User</option>`;
  snapshot.forEach(doc => {
    const email = doc.data().email;
    if(email !== currentUserEmail){
      friendsList.innerHTML += `<p>${email}</p>`;
      chatUserSelect.innerHTML += `<option value="${email}">${email}</option>`;
    }
  });
}

// -------- Chat Functionality --------
chatUserSelect.addEventListener("change", ()=>{
  const toUser = chatUserSelect.value;
  if(unsubscribeChat) unsubscribeChat();
  if(!toUser){ chatBox.innerHTML=""; return; }

  const chatsQuery = query(collection(db, "chats"), orderBy("createdAt"));
  unsubscribeChat = onSnapshot(chatsQuery, async snapshot=>{
    chatBox.innerHTML="";
    for(const doc of snapshot.docs){
      const chat = doc.data();
      if((chat.from===currentUserEmail && chat.to===toUser) ||
         (chat.from===toUser && chat.to===currentUserEmail)){

        if(chat.to===currentUserEmail && !chat.seen){
          await updateDoc(doc.ref, {seen:true});
          if(Notification.permission==="granted") new Notification(`New message from ${chat.from}`, {body: chat.message});
        }

        const div = document.createElement("div");
        div.className = `chat-message ${chat.from===currentUserEmail ? "self" : ""}`;
        div.textContent = `${chat.from}: ${chat.message}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }
  });
});

sendBtn.addEventListener("click", async ()=>{
  const toUser = chatUserSelect.value;
  const message = chatInput.value.trim();
  if(!toUser || !message) return;

  await addDoc(collection(db, "chats"), {
    from: currentUserEmail,
    to: toUser,
    message,
    createdAt: serverTimestamp(),
    seen:false
  });
  chatInput.value="";
  loadNotifications();
});

// -------- Notifications --------
async function loadNotifications(){
  const postsSnapshot = await getDocs(collection(db, "posts"));
  const chatsSnapshot = await getDocs(collection(db, "chats"));
  notificationsList.innerHTML = "";

  // New posts by others
  postsSnapshot.forEach(doc=>{
    const post = doc.data();
    if(post.user!==currentUserEmail){
      const div = document.createElement("div");
      div.textContent = `New post by ${post.user}`;
      notificationsList.appendChild(div);
    }
  });

  // New messages
  chatsSnapshot.forEach(doc=>{
    const chat = doc.data();
    if(chat.to===currentUserEmail && !chat.seen){
      const div = document.createElement("div");
      div.textContent = `New message from ${chat.from}`;
      notificationsList.appendChild(div);
    }
  });

  if(notificationsList.innerHTML==="") notificationsList.innerHTML="No notifications yet.";
}

// -------- Notification Permission --------
if("Notification" in window){
  Notification.requestPermission().then(permission => console.log("Notification permission:", permission));
}
