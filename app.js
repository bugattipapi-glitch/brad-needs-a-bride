document.querySelectorAll('[data-dialog-open]').forEach((button) => {
  button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.dialogOpen);
    if (dialog) dialog.showModal();
  });
});

document.querySelectorAll('[data-dialog-close]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog')?.close());
});

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.querySelectorAll('[data-demo-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = form.dataset.successTitle || 'Introduction drafted';
    const copy = form.dataset.successCopy || 'The working site would send this securely after the final form and screening flow are selected.';
    form.innerHTML = `<div class="form-success"><p class="eyebrow">Meet-cute submitted</p><h2>${title}</h2><p>${copy}</p></div>`;
  });
});

const datePicks = [...document.querySelectorAll('[data-date-pick]')];
const dateVerdict = document.getElementById('date-verdict');

datePicks.forEach((pick) => {
  pick.addEventListener('click', () => {
    datePicks.forEach((item) => {
      const selected = item === pick;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    if (dateVerdict) {
      dateVerdict.querySelector('p').textContent = pick.dataset.reply;
      dateVerdict.classList.add('has-pick');
    }
  });
});

const flightRows = [...document.querySelectorAll('[data-flight-stop]')];
const mapMarkers = [...document.querySelectorAll('[data-map-stop]')];
const flyingBrad = document.querySelector('.flying-brad');
const flightBubble = document.querySelector('.flight-bubble');
let currentFlightX = 86;

function selectFlightStop(key) {
  const row = flightRows.find((item) => item.dataset.flightStop === key);
  if (!row || !flyingBrad || !flightBubble) return;

  const x = Number(row.dataset.x);
  const y = Number(row.dataset.y);
  const direction = x < currentFlightX ? -1 : 1;
  currentFlightX = x;

  flightRows.forEach((item) => item.classList.toggle('is-active', item === row));
  mapMarkers.forEach((item) => item.classList.toggle('is-active', item.dataset.mapStop === key));
  flyingBrad.style.setProperty('--direction', direction);
  flyingBrad.style.left = `${x}%`;
  flyingBrad.style.top = `${y}%`;
  flightBubble.style.opacity = '0';
  window.setTimeout(() => {
    const bubbleX = Math.max(27, Math.min(72, x));
    const bubbleY = y > 58 ? y - 22 : y + 19;
    flightBubble.style.left = `${bubbleX}%`;
    flightBubble.style.top = `${bubbleY}%`;
    flightBubble.querySelector('strong').textContent = row.dataset.title;
    flightBubble.querySelector('p').textContent = row.dataset.detail;
    flightBubble.style.opacity = '1';
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
}

flightRows.forEach((row) => row.addEventListener('click', () => selectFlightStop(row.dataset.flightStop)));
mapMarkers.forEach((marker) => marker.addEventListener('click', () => selectFlightStop(marker.dataset.mapStop)));

const trailerStage = document.getElementById('brad-trailer');
const trailerFrames = trailerStage ? [...trailerStage.querySelectorAll('[data-trailer-frame]')] : [];
const trailerStart = trailerStage?.querySelector('[data-trailer-play]');
const trailerReplay = trailerStage?.querySelector('[data-trailer-replay]');
const trailerToggle = trailerStage?.querySelector('[data-trailer-toggle]');
const trailerToggleIcon = trailerStage?.querySelector('[data-trailer-toggle-icon]');
const trailerToggleLabel = trailerStage?.querySelector('[data-trailer-toggle-label]');
const trailerMute = trailerStage?.querySelector('[data-trailer-mute]');
const trailerProgress = trailerStage?.querySelector('[data-trailer-progress]');
const trailerStatus = trailerStage?.querySelector('[data-trailer-status]');
const trailerAudio = document.getElementById('trailer-soundtrack');
let trailerIndex = 0;
let trailerPlaying = false;
let trailerPaused = false;
let trailerElapsed = 0;
let trailerStartedAt = 0;
let trailerAnimationFrame;
let scoreMuted = false;

const trailerDuration = trailerFrames.reduce((total, frame) => total + Number(frame.dataset.duration || 2600), 0);
const trailerStops = trailerFrames.reduce((stops, frame) => {
  stops.push((stops.at(-1) || 0) + Number(frame.dataset.duration || 4200));
  return stops;
}, []);

function showTrailerFrame(index) {
  trailerFrames.forEach((frame, frameIndex) => {
    const wasActive = frame.classList.contains('is-active');
    const isActive = frameIndex === index;
    frame.classList.toggle('is-active', isActive);
    frame.setAttribute('aria-hidden', String(!isActive));
    if (wasActive && !isActive) {
      frame.classList.add('is-leaving');
      window.setTimeout(() => frame.classList.remove('is-leaving'), 850);
    } else if (isActive) {
      frame.classList.remove('is-leaving');
    }
  });
  if (trailerStatus) trailerStatus.textContent = `Scene ${index + 1} of ${trailerFrames.length}`;
}

function updateTrailerToggle() {
  if (!trailerToggle) return;
  trailerToggle.disabled = !trailerPlaying && !trailerPaused;
  const willPause = trailerPlaying;
  trailerToggle.setAttribute('aria-label', willPause ? 'Pause trailer' : 'Resume trailer');
  if (trailerToggleIcon) trailerToggleIcon.textContent = willPause ? '❚❚' : '▶';
  if (trailerToggleLabel) trailerToggleLabel.textContent = willPause ? 'Pause' : 'Resume';
}

function setSoundtrackTime(milliseconds) {
  if (!trailerAudio) return;
  const target = Math.max(0, milliseconds / 1000);
  if (Number.isFinite(trailerAudio.duration)) {
    trailerAudio.currentTime = Math.min(target, Math.max(0, trailerAudio.duration - .1));
  } else {
    trailerAudio.currentTime = target;
  }
}

function playSoundtrack() {
  if (!trailerAudio) return;
  trailerAudio.muted = scoreMuted;
  trailerAudio.volume = .82;
  trailerAudio.play().catch(() => {
    if (trailerStatus) trailerStatus.textContent = 'Trailer playing · tap Sound if audio is blocked';
  });
}

function renderTrailer(now) {
  if (!trailerPlaying) return;
  trailerElapsed = Math.min(trailerDuration, now - trailerStartedAt);
  const nextIndex = Math.min(
    trailerFrames.length - 1,
    trailerStops.findIndex((stop) => trailerElapsed < stop) === -1
      ? trailerFrames.length - 1
      : trailerStops.findIndex((stop) => trailerElapsed < stop),
  );

  if (nextIndex !== trailerIndex) {
    trailerIndex = nextIndex;
    showTrailerFrame(trailerIndex);
  }

  if (trailerProgress) trailerProgress.style.width = `${(trailerElapsed / trailerDuration) * 100}%`;
  if (trailerAudio && !scoreMuted) {
    const remaining = trailerDuration - trailerElapsed;
    trailerAudio.volume = remaining < 2400 ? Math.max(0, (remaining / 2400) * .82) : .82;
  }

  if (trailerElapsed >= trailerDuration) {
    trailerPlaying = false;
    trailerPaused = false;
    trailerAudio?.pause();
    if (trailerStatus) trailerStatus.textContent = 'Feature presentation complete';
    updateTrailerToggle();
    return;
  }
  trailerAnimationFrame = window.requestAnimationFrame(renderTrailer);
}

function startTrailer() {
  if (!trailerStage || !trailerFrames.length) return;
  window.cancelAnimationFrame(trailerAnimationFrame);
  trailerElapsed = 0;
  trailerStartedAt = performance.now();
  trailerIndex = 0;
  trailerPlaying = true;
  trailerPaused = false;
  showTrailerFrame(0);
  trailerStart?.classList.add('is-hidden');
  trailerStage.classList.add('is-playing');
  if (trailerProgress) trailerProgress.style.width = '0%';
  setSoundtrackTime(0);
  playSoundtrack();
  updateTrailerToggle();
  trailerAnimationFrame = window.requestAnimationFrame(renderTrailer);
}

function pauseTrailer(message = `Paused · scene ${trailerIndex + 1} of ${trailerFrames.length}`) {
  if (!trailerPlaying) return;
  trailerElapsed = Math.min(trailerDuration, performance.now() - trailerStartedAt);
  trailerPlaying = false;
  trailerPaused = true;
  window.cancelAnimationFrame(trailerAnimationFrame);
  trailerAudio?.pause();
  if (trailerStatus && message) trailerStatus.textContent = message;
  updateTrailerToggle();
}

function resumeTrailer() {
  if (!trailerPaused) return;
  trailerPlaying = true;
  trailerPaused = false;
  trailerStartedAt = performance.now() - trailerElapsed;
  setSoundtrackTime(trailerElapsed);
  playSoundtrack();
  showTrailerFrame(trailerIndex);
  updateTrailerToggle();
  trailerAnimationFrame = window.requestAnimationFrame(renderTrailer);
}

trailerStart?.addEventListener('click', startTrailer);
trailerReplay?.addEventListener('click', startTrailer);
trailerToggle?.addEventListener('click', () => {
  if (trailerPlaying) pauseTrailer();
  else resumeTrailer();
});
trailerMute?.addEventListener('click', () => {
  scoreMuted = !scoreMuted;
  trailerMute.setAttribute('aria-pressed', String(scoreMuted));
  trailerMute.innerHTML = `<span aria-hidden="true">${scoreMuted ? '♩' : '♫'}</span> Sound: ${scoreMuted ? 'off' : 'on'}`;
  if (trailerAudio) trailerAudio.muted = scoreMuted;
});

if (trailerStage) {
  showTrailerFrame(0);
  if (trailerStatus) trailerStatus.textContent = 'Ready for the feature presentation';
  updateTrailerToggle();
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && trailerPlaying) pauseTrailer('Paused off-screen · press resume');
  }, { threshold: 0.08 });
  observer.observe(trailerStage);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && trailerPlaying) pauseTrailer('Paused · press resume');
});
