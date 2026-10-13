const aiForm = document.querySelector('#ai-form');
const aiResult = document.querySelector('#ai-result');
const websiteReady = document.querySelector('#website-ready');
const websiteLinkResult = document.querySelector('#website-link-result');

if (aiForm) {
aiForm.addEventListener('submit', (event) => event.preventDefault());

async function sendAIRequest(intent) {
  if (!aiForm.reportValidity()) return;

  const actionButtons = [
    document.querySelector('#create-website-button'),
    document.querySelector('#ask-question-button')
  ];
  aiResult.textContent = intent === 'create' ? 'Creating your website...' : 'Thinking...';
  aiResult.classList.remove('error');
  actionButtons.forEach((button) => { button.disabled = true; });

  try {
    const response = await fetch('/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiForm.elements.prompt.value, intent })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Could not process that request.');
    }

    if (intent === 'question') {
      if (data.type !== 'answer' || !data.answer) {
        throw new Error('No answer was returned. Please try again.');
      }
      aiResult.textContent = data.answer;
      return;
    }

    if (data.type !== 'website' || !data.url) {
      throw new Error('No website link was returned. Please try again.');
    }
    websiteLinkResult.replaceChildren();
    websiteLinkResult.classList.remove('error');
    websiteLinkResult.append('Your website is ready: ');
    const link = document.createElement('a');
    link.href = data.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = data.fileName;
    websiteLinkResult.append(link);
    websiteReady.hidden = false;
    aiResult.textContent = '';
  } catch (error) {
    aiResult.textContent = error.message;
    aiResult.classList.add('error');
  } finally {
    actionButtons.forEach((button) => { button.disabled = false; });
  }
}

document.querySelector('#create-website-button').addEventListener('click', () => sendAIRequest('create'));
document.querySelector('#ask-question-button').addEventListener('click', () => sendAIRequest('question'));

const voiceButton = document.querySelector('#voice-button');
const voiceStatus = document.querySelector('#voice-status');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

voiceButton.addEventListener('click', () => {
  if (!SpeechRecognition) {
    voiceStatus.textContent = 'Voice input is not supported in this browser. You can type your request instead.';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  voiceStatus.textContent = 'Listening...';
  voiceButton.disabled = true;

  recognition.addEventListener('result', (event) => {
    aiForm.elements.prompt.value = event.results[0][0].transcript;
    voiceStatus.textContent = 'Voice input added. Review it, then submit your request.';
  });
  recognition.addEventListener('error', (event) => {
    voiceStatus.textContent = event.error === 'not-allowed'
      ? 'Microphone access was denied. You can type your request instead.'
      : 'Voice input could not be captured. Please try again or type your request.';
  });
  recognition.addEventListener('end', () => {
    voiceButton.disabled = false;
  });
  recognition.start();
});
}

const slideshowForm = document.querySelector('#slideshow-form');
const slideshowStatus = document.querySelector('#slideshow-status');
const slideshowResult = document.querySelector('#slideshow-result');
const slideshowVideo = document.querySelector('#slideshow-video');
const photoFiles = document.querySelector('#photo-files');
const photoPreviews = document.querySelector('#photo-previews');
const photoObjectUrls = [];
const selectedPhotoFiles = [];

if (slideshowForm) {
photoFiles.addEventListener('change', () => {
  const newFiles = Array.from(photoFiles.files);
  photoFiles.value = '';
  if (selectedPhotoFiles.length + newFiles.length > 10) {
    slideshowStatus.textContent = 'Choose up to 10 photos.';
    slideshowStatus.classList.add('error');
    return;
  }
  selectedPhotoFiles.push(...newFiles);
  slideshowStatus.classList.remove('error');
  renderPhotoPreviews();
});

function renderPhotoPreviews() {
  photoPreviews.replaceChildren();
  photoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  photoObjectUrls.length = 0;
  selectedPhotoFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    photoObjectUrls.push(url);
    const preview = document.createElement('div');
    preview.className = 'photo-preview-card';
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    const name = document.createElement('span');
    name.textContent = file.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-photo';
    remove.setAttribute('aria-label', `Remove ${file.name}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      selectedPhotoFiles.splice(index, 1);
      renderPhotoPreviews();
    });
    preview.append(image, name, remove);
    photoPreviews.append(preview);
  });
}

document.querySelector('#video-file').addEventListener('change', (event) => {
  document.querySelector('#video-file-name').textContent = event.target.files[0]?.name || 'Choose a video';
});

document.querySelector('#music-file').addEventListener('change', (event) => {
  document.querySelector('#music-file-name').textContent = event.target.files[0]?.name || 'Or upload your own music';
});

function createMusicWav(track) {
  const sampleRate = 44100;
  const duration = 10;
  const sampleCount = sampleRate * duration;
  const melody = {
    gentle: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 392, 261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66, 261.63, 392, 329.63, 261.63],
    bright: [392, 440, 523.25, 392, 349.23, 392, 440, 523.25, 392, 523.25, 587.33, 523.25, 440, 392, 349.23, 392, 440, 392, 523.25, 392],
    dreamy: [261.63, 392, 329.63, 523.25, 293.66, 440, 349.23, 523.25, 261.63, 392, 329.63, 493.88, 293.66, 440, 349.23, 523.25, 392, 261.63, 329.63, 261.63]
  }[track];
  const progressions = [[130.81, 164.81, 196], [146.83, 174.61, 220], [110, 164.81, 196], [130.81, 164.81, 196], [146.83, 196, 246.94]];
  const samples = new Int16Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const beatTime = time % 0.5;
    const note = melody[Math.floor(time / 0.5) % melody.length];
    const noteEnvelope = Math.min(beatTime / 0.025, 1) * Math.min((0.47 - beatTime) / 0.14, 1);
    const chord = progressions[Math.floor(time / 2) % progressions.length];
    const pad = chord.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * time), 0) / 3;
    const lead = Math.sin(2 * Math.PI * note * time) + 0.22 * Math.sin(4 * Math.PI * note * time);
    const value = (lead * Math.max(0, noteEnvelope) * 0.2 + pad * 0.07) * 0.7;
    samples[index] = Math.max(-1, Math.min(1, value)) * 32767;
  }

  const wav = new ArrayBuffer(44 + samples.byteLength);
  const view = new DataView(wav);
  const writeText = (offset, text) => [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeText(0, 'RIFF');
  view.setUint32(4, wav.byteLength - 8, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, samples.byteLength, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true));
  return new Blob([wav], { type: 'audio/wav' });
}

slideshowForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const videoFile = document.querySelector('#video-file').files[0];
  const musicFile = document.querySelector('#music-file').files[0];
  if (!selectedPhotoFiles.length && !videoFile) {
    slideshowStatus.textContent = 'Upload at least one photo or a video to get started.';
    slideshowStatus.classList.add('error');
    return;
  }
  if (!slideshowForm.reportValidity()) return;

  const button = document.querySelector('#generate-video-button');
  button.disabled = true;
  slideshowStatus.textContent = 'Creating your slideshow video… This may take a few moments.';
  slideshowStatus.classList.remove('error');
  slideshowResult.hidden = true;

  try {
    const formData = new FormData();
    selectedPhotoFiles.forEach((file) => formData.append('photos', file));
    if (videoFile) formData.append('video', videoFile);
    if (musicFile) {
      formData.append('music', musicFile);
    } else {
      const music = createMusicWav(document.querySelector('#music-track').value);
      formData.append('music', music, 'background-music.wav');
    }
    const response = await fetch('/api/slideshow', { method: 'POST', body: formData });
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      if (response.status === 404 || responseText.trimStart().startsWith('<!DOCTYPE')) {
        throw new Error('The slideshow service is unavailable in the running server. Restart the app with “npm start” and try again.');
      }
      throw new Error('The slideshow service returned an unreadable response. Please restart the app and try again.');
    }
    if (!response.ok) throw new Error(data.error || 'Could not generate your slideshow.');

    slideshowVideo.src = data.url;
    document.querySelector('#download-video').href = data.url;
    slideshowResult.hidden = false;
    slideshowVideo.load();
    slideshowStatus.textContent = 'Your looping video is ready.';
    slideshowVideo.play().catch(() => {
      slideshowStatus.textContent = 'Your video is ready. Press play to watch it with music.';
    });
  } catch (error) {
    slideshowStatus.textContent = error.message;
    slideshowStatus.classList.add('error');
  } finally {
    button.disabled = false;
  }
});
}
