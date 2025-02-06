// Get elements
const video = document.getElementById('camera-feed');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const imageUpload = document.getElementById('image-upload');
const opacitySlider = document.getElementById('opacity-slider');

let uploadedImage = null;

// Access the camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.error('Error accessing the camera: ', err);
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
    ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
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
