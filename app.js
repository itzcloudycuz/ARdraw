// Get elements
const video = document.getElementById('camera-feed');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const imageUpload = document.getElementById('image-upload');
const opacitySlider = document.getElementById('opacity-slider');

let uploadedImage = null;
let currentStream = null;
let imgX = 0, imgY = 0, imgScale = 1, imgRotation = 0;
let lastDist = 0, lastAngle = 0, lastTouchX = 0, lastTouchY = 0;

// Function to get camera stream
function getCameraStream(facingMode) {
  const constraints = { video: { facingMode: facingMode } };

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

// Handle image upload
imageUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage = new Image();
      uploadedImage.src = e.target.result;
      uploadedImage.onload = () => {
        imgX = canvas.width / 2;
        imgY = canvas.height / 2;
        imgScale = 1; // Reset scale on new image
        drawOverlay();
      };
    };
    reader.readAsDataURL(file);
  }
});

// Handle opacity change
opacitySlider.addEventListener('input', drawOverlay);

// Draw the overlay
function drawOverlay() {
  const opacity = parseFloat(opacitySlider.value);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (uploadedImage) {
    ctx.globalAlpha = opacity;
    ctx.save();
    
    // Apply transformations (scale, rotate)
    ctx.translate(imgX, imgY);
    ctx.rotate(imgRotation);
    ctx.scale(imgScale, imgScale);
    
    ctx.drawImage(uploadedImage, -uploadedImage.width / 2, -uploadedImage.height / 2);
    ctx.restore();
    ctx.globalAlpha = 1.0;
  }
}

// Resize canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawOverlay();
}

// Handle touch gestures (for now just scaling and rotating)
canvas.addEventListener("touchstart", (event) => {
  if (event.touches.length === 2) {
    event.preventDefault();
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    lastDist = getDistance(touch1, touch2);
    lastAngle = getAngle(touch1, touch2);
    lastTouchX = (touch1.pageX + touch2.pageX) / 2;
    lastTouchY = (touch1.pageY + touch2.pageY) / 2;
  }
});

canvas.addEventListener("touchmove", (event) => {
  if (event.touches.length === 2) {
    event.preventDefault();
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    // Calculate new distance and angle
    const dist = getDistance(touch1, touch2);
    const angle = getAngle(touch1, touch2);

    // Pinch-to-zoom scaling
    imgScale *= dist / lastDist;
    imgScale = Math.max(0.1, Math.min(imgScale, 3)); // Limit scale

    // Rotate the image
    imgRotation += angle - lastAngle;

    lastDist = dist;
    lastAngle = angle;

    drawOverlay();
  }
});

canvas.addEventListener("touchend", () => {
  lastDist = 0;
  lastAngle = 0;
  lastTouchX = 0;
  lastTouchY = 0;
});

// Utility function to calculate the distance between two touch points
function getDistance(touch1, touch2) {
  const dx = touch2.pageX - touch1.pageX;
  const dy = touch2.pageY - touch1.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Utility function to calculate the angle between two touch points
function getAngle(touch1, touch2) {
  const dx = touch2.pageX - touch1.pageX;
  const dy = touch2.pageY - touch1.pageY;
  return Math.atan2(dy, dx);
}

// Keep canvas size updated
window.addEventListener('resize', resizeCanvas);
video.addEventListener('play', () => {
  resizeCanvas();
  setInterval(drawOverlay, 30);
});
