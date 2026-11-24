// Firebase SDK v10 (ES Modules) via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyB5bRY5ghzCmFLubnMD5lB0l6YJ0taWXDU",
  authDomain: "guestbook-9b65e.firebaseapp.com",
  projectId: "guestbook-9b65e",
  storageBucket: "guestbook-9b65e.firebasestorage.app",
  messagingSenderId: "174135162925",
  appId: "1:174135162925:web:2658663f19ccd9681920a4"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const guestbookRef = collection(db, "guestbook");

// DOM Elements
const form = document.getElementById("guestbook-form");
const nameInput = document.getElementById("user-name");
const messageInput = document.getElementById("user-message");
const nameError = document.getElementById("name-error");
const messageError = document.getElementById("message-error");
const nameCount = document.getElementById("name-count");
const messageCount = document.getElementById("message-count");
const submitBtn = document.getElementById("submit-btn");
const messagesContainer = document.getElementById("messages-container");
const loadingSpinner = document.getElementById("loading-spinner");
const emptyState = document.getElementById("empty-state");
const totalCountBadge = document.getElementById("total-count");
const setupAlert = document.getElementById("setup-alert");
const alertTitle = document.getElementById("alert-title");
const alertDesc = document.getElementById("alert-desc");
const toast = document.getElementById("toast");

// Avatar color palette based on name
const AVATAR_COLORS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b",
  "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// Show Toast notification
let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Format Date / Relative time
function formatDate(timestamp) {
  if (!timestamp) return "방금 전";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 60) return "방금 전";
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}분 전`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}시간 전`;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

// Character counter listeners
nameInput.addEventListener("input", () => {
  nameCount.textContent = `${nameInput.value.length}/20`;
  if (nameInput.value.trim()) {
    nameInput.classList.remove("input-error");
    nameError.classList.remove("show");
  }
});

messageInput.addEventListener("input", () => {
  messageCount.textContent = `${messageInput.value.length}/300`;
  if (messageInput.value.trim()) {
    messageInput.classList.remove("input-error");
    messageError.classList.remove("show");
  }
});

// Handle Form Submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  let hasError = false;

  // Validation
  if (!name) {
    nameInput.classList.add("input-error");
    nameError.classList.add("show");
    hasError = true;
  } else {
    nameInput.classList.remove("input-error");
    nameError.classList.remove("show");
  }

  if (!message) {
    messageInput.classList.add("input-error");
    messageError.classList.add("show");
    hasError = true;
  } else {
    messageInput.classList.remove("input-error");
    messageError.classList.remove("show");
  }

  if (hasError) return;

  // Disable button and show spinner
  submitBtn.disabled = true;
  submitBtn.classList.add("loading");

  try {
    // Add document to Firestore
    await addDoc(guestbookRef, {
      name: name,
      message: message,
      createdAt: serverTimestamp()
    });

    // Reset form
    nameInput.value = "";
    messageInput.value = "";
    nameCount.textContent = "0/20";
    messageCount.textContent = "0/300";

    showToast("✨ 방명록이 성공적으로 등록되었습니다!");
  } catch (error) {
    console.error("Error adding document: ", error);
    if (error.code === "permission-denied") {
      setupAlert.classList.remove("hidden");
      alertTitle.textContent = "권한 오류 (보안 규칙 확인 필요)";
      alertDesc.textContent = "Firebase Console의 Firestore 보안 규칙에서 읽기/쓰기를 허용하도록 설정해주세요.";
      showToast("⚠️ 저장 권한이 없습니다. Firebase 보안 규칙을 확인해주세요.");
    } else {
      showToast("❌ 저장 중 오류가 발생했습니다: " + error.message);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
});

// Render Posts List
function renderPosts(snapshot) {
  loadingSpinner.classList.add("hidden");
  messagesContainer.innerHTML = "";

  const total = snapshot.docs.length;
  totalCountBadge.textContent = `${total}개의 글`;

  if (total === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const name = data.name || "익명";
    const message = data.message || "";
    const timeStr = formatDate(data.createdAt);
    const initial = name.trim().charAt(0) || "?";
    const avatarBg = getAvatarColor(name);

    const postEl = document.createElement("article");
    postEl.className = "message-card";

    // Escape HTML to prevent XSS
    const safeName = escapeHtml(name);
    const safeMessage = escapeHtml(message);

    postEl.innerHTML = `
      <div class="message-header">
        <div class="author-info">
          <div class="avatar" style="background-color: ${avatarBg};">${escapeHtml(initial)}</div>
          <span class="author-name">${safeName}</span>
        </div>
        <time class="timestamp">${timeStr}</time>
      </div>
      <div class="message-body">${safeMessage}</div>
    `;

    messagesContainer.appendChild(postEl);
  });
}

// XSS Prevention helper
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// Subscribe to Realtime Updates (최근 작성한 글이 위에 오도록 정렬: orderBy('createdAt', 'desc'))
function listenForMessages() {
  const q = query(guestbookRef, orderBy("createdAt", "desc"));

  onSnapshot(
    q, 
    (snapshot) => {
      // Hide any previous alert if successful
      setupAlert.classList.add("hidden");
      renderPosts(snapshot);
    }, 
    (error) => {
      loadingSpinner.classList.add("hidden");
      console.error("Firestore Listen Error: ", error);
      setupAlert.classList.remove("hidden");

      if (error.code === "permission-denied") {
        alertTitle.textContent = "Firestore 보안 규칙(Rules) 설정 필요";
        alertDesc.textContent = "Firestore Database가 생성되지 않았거나 보안 규칙에서 읽기 권한이 거부되었습니다. 안내에 따라 규칙을 수정해주세요.";
      } else if (error.code === "failed-precondition") {
        alertTitle.textContent = "인덱스(Index) 또는 데이터베이스 필요";
        alertDesc.textContent = "Firestore Database를 생성했는지 확인해주세요.";
      } else {
        alertTitle.textContent = "연결 오류";
        alertDesc.textContent = error.message;
      }
    }
  );
}

// Start Listening
listenForMessages();
