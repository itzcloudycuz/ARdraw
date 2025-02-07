// Get elements
const video = document.getElementById('camera-feed');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const imageUpload = document.getElementById('image-upload');
const opacitySlider = document.getElementById('opacity-slider');
const switchCameraButton = document.getElementById('switch-camera');

// State variables
let uploadedImage = null;
let currentStream = null;
let usingFrontCamera = true;
let isAnimating = true;
let isStreamActive = false;

// Transformation properties
let imgX = 0, imgY = 0, imgScale = 1, imgRotation = 0, imgSkewX = 0, imgSkewY = 0;
let isDragging = false;

// Touch tracking variables
let lastDist = 0;
let lastAngle = 0;
let lastTouchX = 0, lastTouchY = 0;
let initialTouchX = 0, initialTouchY = 0;

// Cleanup function
function cleanup() {
  isAnimating = false;
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  uploadedImage = null;
}

// Detect mobile devices
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Show switch camera button only on mobile devices
if (isMobile()) {
  switchCameraButton.style.display = 'block';
}

// Function to get camera stream
function getCameraStream(facingMode) {
  const constraints = { 
    video: { 
      facingMode: facingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    } 
  };

  const fallbackConstraints = { video: { facingMode: facingMode } };

  navigator.mediaDevices.getUserMedia(constraints)
    .catch(() => navigator.mediaDevices.getUserMedia(fallbackConstraints))
    .then((stream) => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      currentStream = stream;
      video.srcObject = stream;
      video.onloadedmetadata = resizeCanvas;
      isStreamActive = true;
    })
    .catch(err => {
      console.error('Error accessing the camera:', err);
      alert('Unable to access camera. Please check permissions.');
      isStreamActive = false;
    });
}

// Initialize with front camera
getCameraStream('user');

// Switch cameras
switchCameraButton.addEventListener('click', () => {
  usingFrontCamera = !usingFrontCamera;
  getCameraStream(usingFrontCamera ? 'user' : 'environment');
});

// Handle image upload
imageUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Please choose an image under 5MB.');
      imageUpload.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage = new Image();
      uploadedImage.crossOrigin = "Anonymous"; // Fix CORS issues
      uploadedImage.src = e.target.result;
      
      uploadedImage.onerror = () => {
        alert('Error loading image. Please try another image.');
        uploadedImage = null;
        imageUpload.value = '';
      };

      uploadedImage.onload = () => {
        imgX = canvas.width / 2;
        imgY = canvas.height / 2;
        imgScale = Math.min(
          (canvas.width * 0.8) / uploadedImage.width,
          (canvas.height * 0.8) / uploadedImage.height
        );
        imgRotation = 0;
        imgSkewX = 0;
        imgSkewY = 0;
      };
    };

    reader.onerror = () => {
      alert('Error reading file. Please try again.');
      imageUpload.value = '';
    };

    reader.readAsDataURL(file);
  }
});

// Handle opacity change
opacitySlider.addEventListener('input', () => {
  // Handled in draw loop
});

// Improved draw overlay function
function drawOverlay() {
  if (!ctx || !canvas || !isAnimating) return;

  try {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (video.readyState === video.HAVE_ENOUGH_DATA && isStreamActive) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    if (uploadedImage) {
      ctx.globalAlpha = parseFloat(opacitySlider.value) || 0.5;
      ctx.save();
      
      ctx.translate(Math.round(imgX), Math.round(imgY));
      ctx.rotate(imgRotation);
      ctx.scale(imgScale, imgScale);
      ctx.transform(1, imgSkewY, imgSkewX, 1, 0, 0);
      
      ctx.drawImage(
        uploadedImage, 
        -Math.round(uploadedImage.width / 2), 
        -Math.round(uploadedImage.height / 2)
      );
      
      ctx.restore();
      ctx.globalAlpha = 1.0;
    }

    requestAnimationFrame(drawOverlay);
  } catch (error) {
    console.error('Error in drawOverlay:', error);
    isAnimating = false;
  }
}

// Improved resize function
function resizeCanvas() {
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  
  const aspectRatio = video.videoWidth / video.videoHeight || 16/9;
  
  if (window.innerWidth / window.innerHeight > aspectRatio) {
    canvas.height = window.innerHeight;
    canvas.width = window.innerHeight * aspectRatio;
  } else {
    canvas.width = window.innerWidth;
    canvas.height = window.innerWidth / aspectRatio;
  }

  if (uploadedImage) {
    imgX = (imgX / oldWidth) * canvas.width;
    imgY = (imgY / oldHeight) * canvas.height;
    imgX = Math.max(0, Math.min(canvas.width, imgX));
    imgY = Math.max(0, Math.min(canvas.height, imgY));
  }
}

// Improved touch handling
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  if (!uploadedImage) return;
  
  const touch = event.touches[0];
  initialTouchX = touch.pageX;
  initialTouchY = touch.pageY;
  
  if (event.touches.length === 1) {
    isDragging = true;
    lastTouchX = touch.pageX;
    lastTouchY = touch.pageY;
  }
});

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  if (!uploadedImage) return;
  
  if (event.touches.length === 1 && isDragging) {
    const touch = event.touches[0];
    const newX = imgX + (touch.pageX - lastTouchX);
    const newY = imgY + (touch.pageY - lastTouchY);
    
    imgX = Math.max(0, Math.min(canvas.width, newX));
    imgY = Math.max(0, Math.min(canvas.height, newY));
    
    lastTouchX = touch.pageX;
    lastTouchY = touch.pageY;
  } else if (event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    const dx = touch2.pageX - touch1.pageX;
    const dy = touch2.pageY - touch1.pageY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    if (lastDist > 0) {
      const scaleDelta = (dist - lastDist) / lastDist;
      imgScale = Math.max(0.1, Math.min(3, imgScale * (1 + scaleDelta)));
    }

    if (lastAngle !== 0) {
      imgRotation += angle - lastAngle;
    }

    const centerX = (touch1.pageX + touch2.pageX) / 2;
    const centerY = (touch1.pageY + touch2.pageY) / 2;
    
    if (lastTouchX !== 0 && lastTouchY !== 0) {
      const skewDeltaX = (centerX - lastTouchX) / canvas.width;
      const skewDeltaY = (centerY - lastTouchY) / canvas.height;
      
      imgSkewX = Math.max(-0.5, Math.min(0.5, imgSkewX + skewDeltaX));
      imgSkewY = Math.max(-0.5, Math.min(0.5, imgSkewY + skewDeltaY));
    }

    lastDist = dist;
    lastAngle = angle;
    lastTouchX = centerX;
    lastTouchY = centerY;
  }
});

canvas.addEventListener("touchend", () => {
  isDragging = false;
  lastDist = 0;
  lastAngle = 0;
  lastTouchX = 0;
  lastTouchY = 0;
});

// Improved window resize handling
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resizeCanvas, 250);
});

// Start animation when video is ready
video.addEventListener('play', () => {
  resizeCanvas();
  isAnimating = true;
  requestAnimationFrame(drawOverlay);
});

// Handle page visibility
document.addEventListener('visibilitychange', () => {
  isAnimating = !document.hidden;
  if (isAnimating) {
    requestAnimationFrame(drawOverlay);
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
