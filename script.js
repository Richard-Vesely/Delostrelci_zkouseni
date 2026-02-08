const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

const inputs = {
  targetX: document.getElementById("target-x"),
  targetY: document.getElementById("target-y"),
  angle: document.getElementById("angle"),
  velocity: document.getElementById("velocity"),
  gravity: document.getElementById("gravity"),
};

const playButton = document.getElementById("play");
const resetButton = document.getElementById("reset");

const bounds = {
  minX: -10,
  maxX: 200,
  minY: -30,
  maxY: 100,
};

const cannon = { x: 0, y: 0 };
const target = { x: 120, y: 40, radius: 0.5 };
const hitTolerance = 0.1; // meters from target center

const state = {
  running: false,
  time: 0,
  positions: [],
  hit: false,
  miss: false,
};

const framesPerSecond = 30;
const timeStep = 1 / framesPerSecond;
let animationFrameId = null;
let lastFrameTime = 0;
let accumulator = 0;

function worldToCanvas(point) {
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;
  const x = ((point.x - bounds.minX) / worldWidth) * canvas.width;
  const y = canvas.height - ((point.y - bounds.minY) / worldHeight) * canvas.height;
  return { x, y };
}

function metersToPixels(distance) {
  const worldWidth = bounds.maxX - bounds.minX;
  return (distance / worldWidth) * canvas.width;
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function resetSimulation() {
  state.running = false;
  state.time = 0;
  state.positions = [];
  state.hit = false;
  state.miss = false;
  accumulator = 0;
  lastFrameTime = 0;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  drawScene();
}

function updateTargetFromInputs() {
  target.x = Number(inputs.targetX.value);
  target.y = Number(inputs.targetY.value);
}

function computePosition(time) {
  const angle = degreesToRadians(Number(inputs.angle.value));
  const velocity = Number(inputs.velocity.value);
  const gravity = Number(inputs.gravity.value);

  const x = velocity * Math.cos(angle) * time;
  const y = velocity * Math.sin(angle) * time - (gravity * time * time) / 2;

  return { x, y };
}

function checkHit(position) {
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  return Math.hypot(dx, dy) <= hitTolerance;
}

function stepSimulation() {
  state.time += timeStep;
  const position = computePosition(state.time);
  state.positions.push(position);

  if (checkHit(position)) {
    state.hit = true;
    state.running = false;
  } else if (position.y < bounds.minY) {
    state.miss = true;
    state.running = false;
  }
}

function drawAxes() {
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;

  const origin = worldToCanvas(cannon);

  ctx.beginPath();
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(canvas.width, origin.y);
  ctx.stroke();

  ctx.fillStyle = "#475569";
  ctx.font = "12px sans-serif";
  ctx.fillText(`x = ${bounds.minX} m`, 8, origin.y - 8);
  ctx.fillText(`x = ${bounds.maxX} m`, canvas.width - 80, origin.y - 8);
  ctx.fillText(`y = ${bounds.maxY} m`, origin.x + 6, 14);
  ctx.fillText(`y = ${bounds.minY} m`, origin.x + 6, canvas.height - 8);
  ctx.fillText("Origin (0,0)", origin.x + 6, origin.y + 16);
}

function drawGrid() {
  const gridStep = 20;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;

  for (let x = bounds.minX; x <= bounds.maxX; x += gridStep) {
    const start = worldToCanvas({ x, y: bounds.minY });
    const end = worldToCanvas({ x, y: bounds.maxY });
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  for (let y = bounds.minY; y <= bounds.maxY; y += gridStep) {
    const start = worldToCanvas({ x: bounds.minX, y });
    const end = worldToCanvas({ x: bounds.maxX, y });
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

function drawCannon() {
  const position = worldToCanvas(cannon);
  ctx.fillStyle = "#4b5563";
  ctx.beginPath();
  ctx.arc(position.x, position.y, 8, 0, Math.PI * 2);
  ctx.fill();

  const barrelLength = metersToPixels(8);
  const angle = degreesToRadians(Number(inputs.angle.value));
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(position.x, position.y);
  ctx.lineTo(position.x + barrelLength * Math.cos(angle), position.y - barrelLength * Math.sin(angle));
  ctx.stroke();
}

function drawTarget() {
  const position = worldToCanvas(target);
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
  const radius = metersToPixels(target.radius);
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#b91c1c";
  ctx.font = "12px sans-serif";
  ctx.fillText(`Target (${target.x.toFixed(1)}, ${target.y.toFixed(1)}) m`, position.x + 10, position.y - 10);
}

function drawTrail() {
  if (state.positions.length < 2) {
    return;
  }

  ctx.strokeStyle = "rgba(37, 99, 235, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const start = worldToCanvas(state.positions[0]);
  ctx.moveTo(start.x, start.y);
  for (const point of state.positions.slice(1)) {
    const canvasPoint = worldToCanvas(point);
    ctx.lineTo(canvasPoint.x, canvasPoint.y);
  }
  ctx.stroke();
}

function drawBall() {
  if (state.positions.length === 0) {
    return;
  }

  const current = worldToCanvas(state.positions[state.positions.length - 1]);
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.arc(current.x, current.y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawStatus() {
  ctx.fillStyle = "#1f2937";
  ctx.font = "14px sans-serif";

  let message = "Ready to launch.";
  if (state.running) {
    message = `Time: ${state.time.toFixed(2)} s`;
  } else if (state.hit) {
    message = "Hit! The cannonball reached the target.";
  } else if (state.miss) {
    message = "Missed! The cannonball fell below the scene.";
  }

  ctx.fillText(message, 14, canvas.height - 14);
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawAxes();
  drawTarget();
  drawCannon();
  drawTrail();
  drawBall();
  drawStatus();
}

function animate(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }
  const delta = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  accumulator += delta;

  while (accumulator >= timeStep && state.running) {
    stepSimulation();
    accumulator -= timeStep;
  }

  drawScene();

  if (state.running) {
    animationFrameId = requestAnimationFrame(animate);
  }
}

playButton.addEventListener("click", () => {
  updateTargetFromInputs();
  state.running = true;
  state.hit = false;
  state.miss = false;
  state.time = 0;
  state.positions = [computePosition(0)];
  accumulator = 0;
  lastFrameTime = 0;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(animate);
});

resetButton.addEventListener("click", () => {
  updateTargetFromInputs();
  resetSimulation();
});

Object.values(inputs).forEach((input) => {
  input.addEventListener("change", () => {
    if (!state.running) {
      updateTargetFromInputs();
      drawScene();
    }
  });
});

updateTargetFromInputs();
resetSimulation();
