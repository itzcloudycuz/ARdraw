// Previous element selections and state variables remain the same...

// Updated camera handling for iOS compatibility
async function getCameraStream(facingMode) {
  // First stop any existing stream
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  try {
    // For iOS devices, we need to use deviceId instead of facingMode
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    // If we have multiple cameras
    if (videoDevices.length > 1) {
      let deviceId;

      if (facingMode === 'user') {
        // Front camera is usually the first one on iOS
        deviceId = videoDevices[0].deviceId;
      } else {
        // Back camera is usually the last one
        deviceId = videoDevices[videoDevices.length - 1].deviceId;
      }

      const constraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback to basic constraints if high resolution fails
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } }
        });
      }
    } else {
      // Fallback for single camera devices
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
    }

    video.srcObject = currentStream;
    video.onloadedmetadata = resizeCanvas;
    isStreamActive = true;
    
    // Show/hide switch camera button based on available cameras
    switchCameraButton.style.display = videoDevices.length > 1 ? 'block' : 'none';

  } catch (err) {
    console.error('Error accessing the camera:', err);
    alert('Unable to access camera. Please check permissions and try again.');
    isStreamActive = false;
  }
}

// Modified isMobile function to better detect iOS devices
function isMobile() {
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Initialize camera handling
async function initializeCamera() {
  try {
    // Request permissions first
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop()); // Stop initial stream
    
    // Check available devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // Show switch button only if multiple cameras are available
    switchCameraButton.style.display = videoDevices.length > 1 ? 'block' : 'none';
    
    // Start with front camera
    getCameraStream('user');
  } catch (err) {
    console.error('Error initializing camera:', err);
    alert('Unable to access camera. Please check permissions.');
  }
}

// Modified switch camera button handler
switchCameraButton.addEventListener('click', () => {
  usingFrontCamera = !usingFrontCamera;
  getCameraStream(usingFrontCamera ? 'user' : 'environment');
});

// Initialize camera when page loads
initializeCamera();

// Rest of the code remains the same...
