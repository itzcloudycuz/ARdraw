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
    video: { facingMode: facingMode }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop()); // Stop the previous stream
      }
      currentStream = stream;
      video.srcObject = stream;
    })
    .catch((err) => {
      console.error('Error accessing the camera: ', err);
    });
}

// Initialize with front camera
getCameraStream('user'); // 'user' is the front camera

// Switch cameras
switchCameraButton.addEventListener('click', () => {
  usingFrontCamera = !usingFrontCamera;
  const facingMode = usingFrontCamera ? 'user' : 'environment'; // 'environment' is the back camera
  getCameraStream(facingMode);
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
        drawOverlay();
      };
    };
    reader.readAsDataURL(file);
  }
});

// Handle opacity change
opacitySlider.addEventListener('input', () => {
  drawOverlay();
});

// Draw the overlay
function drawOverlay() {
  const opacity = parseFloat(opacitySlider.value);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw camera feed
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Draw uploaded image with opacity
  if (uploadedImage) {
    ctx.globalAlpha = opacity;
    ctx.drawImage(uploadedImage, 0, 0, window.innerWidth, window.innerHeight;
    ctx.globalAlpha = 1.0; // Reset opacity
  }
}

// Resize canvas to match video feed
function resizeCanvas() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

// Continuously update the canvas
video.addEventListener('play', () => {
  resizeCanvas();
  setInterval(drawOverlay, 30); // Update overlay at 30fps
});
