// Timer state
let state = {
  taskTitle: 'Focus Time',
  subtaskTitle: 'Working...',
  timeLeft: 300,
  initialDuration: 300,
  isRunning: false,
};

// DOM elements
const timeDisplay = document.getElementById('time');
const progressBar = document.getElementById('progress-bar');
const subtaskDisplay = document.getElementById('subtask');
const pauseIndicator = document.getElementById('pause-indicator');
const toggleBtn = document.getElementById('toggle-btn');
const closeBtn = document.getElementById('close-btn');
const starsCanvas = document.getElementById('stars-canvas');
const ctx = starsCanvas.getContext('2d');

// Stars for background animation
let stars = [];
let frameCount = 0;

// Initialize stars
function initStars() {
  const width = starsCanvas.width = 200;
  const height = starsCanvas.height = 120;
  stars = [];

  for (let i = 0; i < 40; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.3,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      twinkleOffset: Math.random() * Math.PI * 2,
      brightness: Math.random() * 0.6 + 0.3,
    });
  }
}

// Draw twinkling stars
function drawStars() {
  const width = starsCanvas.width;
  const height = starsCanvas.height;

  ctx.clearRect(0, 0, width, height);
  frameCount++;

  stars.forEach(star => {
    const twinkle = Math.sin(frameCount * star.twinkleSpeed + star.twinkleOffset);
    const currentBrightness = star.brightness * (0.5 + 0.5 * twinkle);

    // Star glow
    const gradient = ctx.createRadialGradient(
      star.x, star.y, 0,
      star.x, star.y, star.size * 4
    );
    gradient.addColorStop(0, `rgba(200, 200, 255, ${currentBrightness})`);
    gradient.addColorStop(0.5, `rgba(150, 150, 220, ${currentBrightness * 0.3})`);
    gradient.addColorStop(1, 'rgba(100, 100, 180, 0)');

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Star core
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${currentBrightness})`;
    ctx.fill();
  });

  requestAnimationFrame(drawStars);
}

// Format time as M:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Get color class based on progress
function getColorClass(percentage) {
  if (percentage > 66) return '';
  if (percentage > 33) return 'warning';
  return 'critical';
}

// Update UI
function updateUI() {
  const percentage = state.initialDuration > 0
    ? (state.timeLeft / state.initialDuration) * 100
    : 0;

  const colorClass = getColorClass(percentage);

  // Update time display
  timeDisplay.textContent = formatTime(state.timeLeft);
  timeDisplay.className = colorClass;

  // Update progress bar
  progressBar.style.width = `${percentage}%`;
  progressBar.className = colorClass;

  // Update subtask
  subtaskDisplay.textContent = state.subtaskTitle;

  // Update pause indicator
  pauseIndicator.classList.toggle('visible', !state.isRunning);

  // Update toggle button
  toggleBtn.textContent = state.isRunning ? '⏸' : '▶';
}

// Timer interval
let timerInterval = null;

function startTimer() {
  if (timerInterval) return;

  timerInterval = setInterval(() => {
    if (state.isRunning && state.timeLeft > 0) {
      state.timeLeft--;
      updateUI();

      // Sync state back to main process
      window.timerAPI.updateState({ timeLeft: state.timeLeft });

      // Timer completed
      if (state.timeLeft === 0) {
        state.isRunning = false;
        updateUI();
        // Could trigger notification here
      }
    }
  }, 1000);
}

// Event listeners
toggleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log('Toggle button clicked');
  window.timerAPI.toggle();
});

closeBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log('Close button clicked');
  // Hide the window via IPC
  window.timerAPI.hideWindow();
});

// Listen for timer updates from main process
window.timerAPI.onTimerUpdate((newState) => {
  state = { ...state, ...newState };
  updateUI();
});

// Initialize
async function init() {
  // Get initial state from main process
  const initialState = await window.timerAPI.getState();
  state = { ...state, ...initialState };

  // Initialize UI
  updateUI();

  // Start stars animation
  initStars();
  drawStars();

  // Start timer loop
  startTimer();
}

init();
