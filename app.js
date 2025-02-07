// Get elements
const video = document.getElementById('camera-feed');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const imageUpload = document.getElementById('image-upload');
const opacitySlider = document.getElementById('opacity-slider');
const switchCameraButton = document.getElementById('switch-camera');

let uploadedImage = null;
let currentStream = null;
let usingFrontCamera = true;
let isAnimating = true;

// Transformation properties
let imgX = 0, imgY = 0, imgScale = 1, imgRotation = 0, imgSkewX = 0, imgSkewY = 0;
let isDragging = false;

// Touch tracking variables
let lastDist = 0;
let lastAngle = 0;
let lastTouchX = 0, lastTouchY = 0;
let initialTouchX = 0, initialTouchY = 0;

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

  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      currentStream = stream;
      video.srcObject = stream;
      video.onloadedmetadata = resizeCanvas;
    })
    .catch(err => console.error('Error accessing the camera:', err));
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
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage = new Image();
      uploadedImage.src = e.target.result;
      uploadedImage.onload = () => {
        // Center the image initially
        imgX = canvas.width / 2;
        imgY = canvas.height / 2;
        // Scale image to fit nicely on screen
        imgScale = Math.min(
          (canvas.width * 0.8) / uploadedImage.width, 
          (canvas.height * 0.8) / uploadedImage.height
        );
        imgRotation = 0;
        imgSkewX = 0;
        imgSkewY = 0;
      };
    };
    reader.readAsDataURL(file);
  }
});

// Handle opacity change
opacitySlider.addEventListener('input', () => {
  // No need to call drawOverlay directly as it's handled by animation frame
});

// Improved draw overlay function with better performance
function drawOverlay() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Only draw the video if it's playing and ready
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  if (uploadedImage) {
    ctx.globalAlpha = parseFloat(opacitySlider.value);
    ctx.save();
    
    // Apply transformations with improved precision
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

  if (isAnimating) {
    requestAnimationFrame(drawOverlay);
  }
}

// Improved resize function with better aspect ratio handling
function resizeCanvas() {
  const aspectRatio = video.videoWidth / video.videoHeight;
  
  if (window.innerWidth / window.innerHeight > aspectRatio) {
    canvas.height = window.innerHeight;
    canvas.width = window.innerHeight * aspectRatio;
  } else {
    canvas.width = window.innerWidth;
    canvas.height = window.innerWidth / aspectRatio;
  }

  // Ensure uploaded image maintains relative position after resize
  if (uploadedImage) {
    imgX = (imgX / canvas.width) * canvas.width;
    imgY = (imgY / canvas.height) * canvas.height;
    imgScale = Math.min(
      (canvas.width * 0.8) / uploadedImage.width,
      (canvas.height * 0.8) / uploadedImage.height
    );
  }
}

// Improved touch handling
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
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
  
  if (event.touches.length === 1 && isDragging) {
    // Single touch drag to move image
    const touch = event.touches[0];
    const deltaX = touch.pageX - lastTouchX;
    const deltaY = touch.pageY - lastTouchY;
    
    imgX += deltaX;
    imgY += deltaY;
    
    lastTouchX = touch.pageX;
    lastTouchY = touch.pageY;
  } else if (event.touches.length === 2) {
    // Two finger gesture for scale, rotate, and skew
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    // Calculate distance and angle for scaling and rotation
    const dx = touch2.pageX - touch1.pageX;
    const dy = touch2.pageY - touch1.pageY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    if (lastDist > 0) {
      // Smooth scaling
      const scaleDelta = (dist - lastDist) / lastDist;
      imgScale = Math.max(0.1, Math.min(3, imgScale * (1 + scaleDelta)));
    }

    if (lastAngle !== 0) {
      // Smooth rotation
      imgRotation += angle - lastAngle;
    }

    // Improved skew handling
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
  // Debounce resize events
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resizeCanvas, 250);
});

// Start the animation loop when video is ready
video.addEventListener('play', () => {
  resizeCanvas();
  isAnimating = true;
  requestAnimationFrame(drawOverlay);
});

// Clean up when page is hidden/visible
document.addEventListener('visibilitychange', () => {
  isAnimating = !document.hidden;
  if (isAnimating) {
    requestAnimationFrame(drawOverlay);
  }
});
