// Google Apps Script Web App URL (PHOTO ID)
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZS8EpN2rGe4HgNfZK6p8OEr8g4qRNCb3b1yuLnF1SYGVGz13ir_gksE2D4HOfUbrO/exec';

// Google Apps Script Web App URL (GALLERY)
const GALLERY_API_URL = 'https://script.google.com/macros/s/AKfycbwt1KLPpJyRhvBVn-NxYHckvsloYA8kClWpIYzUe5awunF_ghAwpdZaVvqy7YY1D1mbyQ/exec';

// Cache for photo database
let photoCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch photo database from Google Apps Script
async function fetchPhotoDatabase() {
  const now = Date.now();
  if (photoCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    console.log('Using cached photo database');
    return photoCache;
  }

  console.log('Fetching from:', GOOGLE_APPS_SCRIPT_URL);

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Data received:', data);

    if (data.success) {
      photoCache = data.photos;
      cacheTimestamp = now;
      console.log('Photo database loaded successfully');
      return data.photos;
    } else {
      throw new Error(data.message || 'Failed to fetch photos');
    }
  } catch (error) {
    console.error('Detailed fetch error:', error);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    throw error;
  }
}

// Navigation functionality
function showPage(pageId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  window.scrollTo(0, 0);

  if (pageId === 'gallery') {
    loadGallery(); // Load gallery automatically when opened
  }
}

// Mobile menu toggle
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenu.classList.toggle('hidden');
}

document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileMenu);

// Photo form functionality
document.getElementById('photoForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const photoCode = document.getElementById('photoCode').value.trim().toUpperCase();
  const photoResult = document.getElementById('photoResult');
  const errorMessage = document.getElementById('errorMessage');
  const submitButton = e.target.querySelector('button[type="submit"]');

  console.log('Searching for photo code:', photoCode);

  photoResult.classList.add('hidden');
  errorMessage.classList.add('hidden');

  const originalButtonText = submitButton.innerHTML;
  submitButton.innerHTML = 'Searching...';
  submitButton.disabled = true;

  try {
    const photoDatabase = await fetchPhotoDatabase();
    console.log('Photo database keys:', Object.keys(photoDatabase));

    if (photoDatabase[photoCode]) {
      const photoData = photoDatabase[photoCode];
      console.log('Photo found:', photoData);

      window.currentPhotoUrl = photoData.downloadUrl;
      document.getElementById('foundPhotoId').textContent = photoCode;
      photoResult.classList.remove('hidden');
    } else {
      console.log('Photo not found. Available codes:', Object.keys(photoDatabase));
      errorMessage.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Search failed:', error);
    errorMessage.classList.remove('hidden');
  } finally {
    submitButton.innerHTML = originalButtonText;
    submitButton.disabled = false;
  }
});

// Download photo functionality
function downloadPhoto() {
  if (window.currentPhotoUrl) {
    window.open(window.currentPhotoUrl, '_blank');
  } else {
    alert('Photo URL not found. Please try searching again.');
  }
}

// Smooth scrolling and preload photo DB
document.addEventListener('DOMContentLoaded', function() {
  document.documentElement.style.scrollBehavior = 'smooth';
  fetchPhotoDatabase().catch(err => {
    console.log('Failed to preload photo database:', err);
  });
});

// ==========================
// LOAD GALLERY FROM DRIVE
// ==========================
async function loadGallery() {
  const galleryContainer = document.querySelector('#gallery .grid');
  if (!galleryContainer) return;

  galleryContainer.innerHTML = '<p class="text-gray-500 text-center">Loading photos...</p>';

  try {
    const res = await fetch(GALLERY_API_URL);
    const data = await res.json();

    if (!data.success) {
      galleryContainer.innerHTML = '<p class="text-red-500 text-center">Failed to load gallery.</p>';
      return;
    }

    let photos = [];
    if (data.categories) {
      Object.keys(data.categories).forEach(cat => {
        photos.push(...data.categories[cat]);
      });
    } else if (data.photos) {
      photos = Object.values(data.photos);
    }

    if (photos.length === 0) {
      galleryContainer.innerHTML = '<p class="text-gray-500 text-center">No photos found.</p>';
      return;
    }

    galleryContainer.innerHTML = photos.map(photo => `
      <div class="gallery-item bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
        <img src="${photo.downloadUrl || photo.url}" alt="${photo.filename}" class="w-full h-64 object-cover cursor-pointer" onclick="openPreview('${photo.downloadUrl || photo.url}')">
        <div class="p-4">
          <h3 class="font-semibold text-gray-800">${photo.filename}</h3>
          <a href="${photo.viewUrl}" target="_blank" class="inline-block mt-2 text-cyan-600 hover:text-cyan-800 font-medium">📸 View / Download</a>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Gallery load error:', err);
    galleryContainer.innerHTML = '<p class="text-red-500 text-center">Error loading gallery.</p>';
  }
}

// ==========================
// GALLERY PREVIEW MODAL
// ==========================
function openPreview(url) {
  const modal = document.getElementById('previewModal');
  const img = document.getElementById('previewImage');
  img.src = url;
  modal.classList.remove('hidden');
  modal.onclick = () => modal.classList.add('hidden');
}
