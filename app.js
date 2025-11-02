import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// DOM Elements
const userNameDisplay = document.getElementById("userNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const feed = document.getElementById("feed");

const chatUserSelect = document.getElementById("chatUserSelect");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

const friendsList = document.getElementById("friendsList");
const notificationsList = document.getElementById("notificationsList");

const profileFullName = document.getElementById("profileFullName");
const profileUsername = document.getElementById("profileUsername");
const lastSeenEl = document.getElementById("lastSeen");

let currentUser = null;
let unsubscribeChat = null;

// -------- Auth State --------
onAuthStateChanged(auth, async (user)=>{
  if(user){
    currentUser = user;
    // Get user doc from Firestore
    const snapshot = await getDocs(collection(db,"users"));
    const userDoc = snapshot.docs.find(doc => doc.data().email === user.email);
    if(userDoc){
      currentUser.uid = userDoc.id;
      currentUser.fullName = userDoc.data().fullName;
      currentUser.username = userDoc.data().username;
      // Update lastSeen
      await updateDoc(doc(db,"users",currentUser.uid),{lastSeen: serverTimestamp()});
    }

    userNameDisplay.textContent = currentUser.username;
    profileFullName.textContent = currentUser.fullName;
    profileUsername.textContent = currentUser.username;

    loadFeed();
    loadUsers();
    loadNotifications();
  } else {
    window.location.href="index.html";
  }
});

// -------- Logout --------
logoutBtn.addEventListener("click", async ()=>{
  if(unsubscribeChat) unsubscribeChat();
  await signOut(auth);
  window.location.href="index.html";
});

// -------- Post --------
postBtn.addEventListener("click", async ()=>{
  const text = postText.value.trim();
  if(!text) return;

  await addDoc(collection(db,"posts"),{
    userId: currentUser.uid,
    username: currentUser.username,
    text,
    createdAt: serverTimestamp()
  });
  postText.value="";
  loadFeed();
  loadNotifications();
});

// -------- Load Feed --------
async function loadFeed(){
  const q = query(collection(db,"posts"), orderBy("createdAt","desc"));
  const snapshot = await getDocs(q);
  feed.innerHTML="";
  snapshot.forEach(doc=>{
    const post = doc.data();
    const div = document.createElement("div");
    div.className="post-card";
    div.innerHTML=`<p><strong>${post.username}</strong></p><p>${post.text}</p>`;
    feed.appendChild(div);
  });
}

// -------- Load Users (Friends) --------
async function loadUsers(){
  const snapshot = await getDocs(collection(db,"users"));
  friendsList.innerHTML="";
  chatUserSelect.innerHTML=`<option value="">Select User</option>`;
  snapshot.forEach(doc=>{
    const data = doc.data();
    if(data.email!==currentUser.email){
      friendsList.innerHTML+=`<p>${data.username}</p>`;
      chatUserSelect.innerHTML+=`<option value="${doc.id}">${data.username}</option>`;
    }
  });
}

// -------- Chat --------
chatUserSelect.addEventListener("change", async ()=>{
  const toUid = chatUserSelect.value;
  if(unsubscribeChat) unsubscribeChat();
  chatBox.innerHTML="";
  if(!toUid) return;

  const chatsQuery = query(collection(db,"chats"), orderBy("createdAt"));
  unsubscribeChat = onSnapshot(chatsQuery, snapshot=>{
    chatBox.innerHTML="";
    snapshot.forEach(doc=>{
      const chat = doc.data();
      if((chat.from===currentUser.uid && chat.to===toUid) || (chat.from===toUid && chat.to===currentUser.uid)){
        const div = document.createElement("div");
        div.className=`chat-message ${chat.from===currentUser.uid?"self":""}`;
        div.textContent=`${chat.fromUsername}: ${chat.message}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    });
  });
});

sendBtn.addEventListener("click", async ()=>{
  const toUid = chatUserSelect.value;
  const message = chatInput.value.trim();
  if(!toUid || !message) return;

  const toUserDoc = await getDocs(collection(db,"users"));
  const toUser = toUserDoc.docs.find(d=>d.id===toUid);

  await addDoc(collection(db,"chats"),{
    from: currentUser.uid,
    fromUsername: currentUser.username,
    to: toUid,
    message,
    createdAt: serverTimestamp(),
    seen:false
  });
  chatInput.value="";
  loadNotifications();
});

// -------- Notifications --------
async function loadNotifications(){
  notificationsList.innerHTML="";
  const postsSnapshot = await getDocs(collection(db,"posts"));
  const chatsSnapshot = await getDocs(collection(db,"chats"));

  postsSnapshot.forEach(doc=>{
    const post = doc.data();
    if(post.userId!==currentUser.uid){
      const div = document.createElement("div");
      div.textContent=`New post by ${post.username}`;
      notificationsList.appendChild(div);
    }
  });

  chatsSnapshot.forEach(doc=>{
    const chat = doc.data();
    if(chat.to===currentUser.uid && !chat.seen){
      const div = document.createElement("div");
      div.textContent=`New message from ${chat.fromUsername}`;
      notificationsList.appendChild(div);
    }
  });

  if(notificationsList.innerHTML==="") notificationsList.innerHTML="No notifications yet.";
}
