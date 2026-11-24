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

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "pk0lmrfe";
const CLOUDINARY_UPLOAD_PRESET = "guestbook";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// DOM Elements
const form = document.getElementById("guestbook-form");
const nameInput = document.getElementById("user-name");
const messageInput = document.getElementById("user-message");
const nameError = document.getElementById("name-error");
const messageError = document.getElementById("message-error");
const nameCount = document.getElementById("name-count");
const messageCount = document.getElementById("message-count");
const submitBtn = document.getElementById("submit-btn");
const submitBtnText = submitBtn.querySelector(".btn-text");
const messagesContainer = document.getElementById("messages-container");
const loadingSpinner = document.getElementById("loading-spinner");
const emptyState = document.getElementById("empty-state");
const totalCountBadge = document.getElementById("total-count");
const setupAlert = document.getElementById("setup-alert");
const alertTitle = document.getElementById("alert-title");
const alertDesc = document.getElementById("alert-desc");
const toast = document.getElementById("toast");

// Image Upload Elements
const uploadArea = document.getElementById("upload-area");
const imageInput = document.getElementById("image-input");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const previewFilename = document.getElementById("preview-filename");
const removeImageBtn = document.getElementById("remove-image-btn");

// Lightbox Modal Elements
const imageModal = document.getElementById("image-modal");
const modalImage = document.getElementById("modal-image");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalBackdrop = document.getElementById("modal-backdrop");

// Attached file state
let selectedImageFile = null;

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

// Handle File Selection
function handleFileSelect(file) {
  if (!file) return;

  // Validate type
  if (!file.type.startsWith("image/")) {
    showToast("⚠️ 이미지 파일(JPG, PNG, GIF, WebP 등)만 업로드할 수 있습니다.");
    clearSelectedImage();
    return;
  }

  // Validate size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast("⚠️ 파일 크기는 최대 10MB까지 가능합니다.");
    clearSelectedImage();
    return;
  }

  selectedImageFile = file;
  previewFilename.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    imagePreviewContainer.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function clearSelectedImage() {
  selectedImageFile = null;
  imageInput.value = "";
  imagePreview.src = "";
  previewFilename.textContent = "";
  imagePreviewContainer.classList.add("hidden");
}

// Upload file to Cloudinary
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "이미지 서버 업로드에 실패했습니다.");
  }

  const data = await response.json();
  return data.secure_url;
}

// File input change listener
imageInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileSelect(e.target.files[0]);
  }
});

// Remove Image button listener
removeImageBtn.addEventListener("click", () => {
  clearSelectedImage();
});

// Drag & Drop listeners for upload area
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

// Lightbox Modal functions
function openModal(imgSrc) {
  modalImage.src = imgSrc;
  imageModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  imageModal.classList.add("hidden");
  modalImage.src = "";
  document.body.style.overflow = "";
}

modalCloseBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !imageModal.classList.contains("hidden")) {
    closeModal();
  }
});

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
    let imageUrl = null;

    // 1. Cloudinary에 이미지 업로드 (선택된 파일이 있는 경우)
    if (selectedImageFile) {
      submitBtnText.textContent = "이미지 업로드 중...";
      imageUrl = await uploadToCloudinary(selectedImageFile);
    }

    // 2. Add document to Firestore
    submitBtnText.textContent = "등록 중...";
    const docData = {
      name: name,
      message: message,
      createdAt: serverTimestamp()
    };

    if (imageUrl) {
      docData.imageUrl = imageUrl;
    }

    await addDoc(guestbookRef, docData);

    // Reset form
    nameInput.value = "";
    messageInput.value = "";
    nameCount.textContent = "0/20";
    messageCount.textContent = "0/300";
    clearSelectedImage();

    showToast("✨ 방명록이 성공적으로 등록되었습니다!");
  } catch (error) {
    console.error("Error submitting guestbook entry: ", error);
    if (error.code === "permission-denied") {
      setupAlert.classList.remove("hidden");
      alertTitle.textContent = "권한 오류 (보안 규칙 확인 필요)";
      alertDesc.textContent = "Firebase Console의 Firestore 보안 규칙에서 읽기/쓰기를 허용하도록 설정해주세요.";
      showToast("⚠️ 저장 권한이 없습니다. Firebase 보안 규칙을 확인해주세요.");
    } else {
      showToast("❌ 등록 중 오류가 발생했습니다: " + error.message);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
    submitBtnText.textContent = "등록하기";
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
    const imageUrl = data.imageUrl || null;
    const timeStr = formatDate(data.createdAt);
    const initial = name.trim().charAt(0) || "?";
    const avatarBg = getAvatarColor(name);

    const postEl = document.createElement("article");
    postEl.className = "message-card";

    // Escape HTML to prevent XSS
    const safeName = escapeHtml(name);
    const safeMessage = escapeHtml(message);
    const safeImageUrl = imageUrl ? escapeHtml(imageUrl) : null;

    postEl.innerHTML = `
      <div class="message-header">
        <div class="author-info">
          <div class="avatar" style="background-color: ${avatarBg};">${escapeHtml(initial)}</div>
          <span class="author-name">${safeName}</span>
        </div>
        <time class="timestamp">${timeStr}</time>
      </div>
      <div class="message-body">${safeMessage}</div>
      ${safeImageUrl ? `
        <div class="message-image-wrapper">
          <img src="${safeImageUrl}" alt="방명록 첨부 이미지" class="message-image" loading="lazy" />
        </div>
      ` : ""}
    `;

    // 이미지 클릭 시 라이트박스 열기
    if (safeImageUrl) {
      const imgEl = postEl.querySelector(".message-image");
      if (imgEl) {
        imgEl.addEventListener("click", () => openModal(imageUrl));
      }
    }

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
