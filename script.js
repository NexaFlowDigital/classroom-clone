// Embed any URL in an iframe
document.getElementById('embedBtn').addEventListener('click', () => {
  const url = prompt('Enter a URL to embed:');
  if (!url) return;
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.width = '800';
  iframe.height = '450';
  document.getElementById('canvas').appendChild(iframe);
});

// Capture and display your screen
document.getElementById('screenBtn').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.width = 800;
    video.height = 450;
    video.autoplay = true;
    document.getElementById('canvas').appendChild(video);
  } catch (err) {
    alert('Screen share failed: ' + err.message);
  }
});
