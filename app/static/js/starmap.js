const container = document.getElementById('mapContainer');
const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
const starsLayer = document.getElementById('starsLayer');
const tooltip = document.getElementById('coordTooltip');
const modal = new bootstrap.Modal(document.getElementById('editModal'));
const GRID_SIZE = 120;
let offsetX = -3000;
let offsetY = -3000;
let scale = 1;
let isDragging = false;
let dragStart = {x:0, y:0};
let dragOrigin = {x:0, y:0};
let markers = [];
let currentEditId = null;
let dragMoved = false;
let pollingInterval = null;
let jumpMarker = null;

let lastTouchDistance = 0;
let isPinching = false;
let lastTap = 0;

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  const step = GRID_SIZE;
  const visibleX = canvas.width / scale;
  const visibleY = canvas.height / scale;
  const startX = Math.floor(-offsetX / scale / step) * step;
  const startY = Math.floor(-offsetY / scale / step) * step;
  const endX = startX + visibleX + step;
  const endY = startY + visibleY + step;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1 / scale;
  ctx.beginPath();
  for (let x = startX; x <= endX; x += step) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += step) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function clampOffsets() {
  const mapWidth = 60000 * scale;
  const mapHeight = 60000 * scale;
  const minX = container.clientWidth - mapWidth;
  const minY = container.clientHeight - mapHeight;
  offsetX = Math.min(Math.max(offsetX, minX), 0);
  offsetY = Math.min(Math.max(offsetY, minY), 0);
}

function updateTransforms() {
  clampOffsets();
  starsLayer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  drawGrid();
}

container.addEventListener('wheel', e => {
  e.preventDefault();
  const oldScale = scale;
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  scale = Math.min(Math.max(0.1, scale * delta), 3);
  const rect = container.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const mapX = (centerX - offsetX) / oldScale;
  const mapY = (centerY - offsetY) / oldScale;
  offsetX = centerX - mapX * scale;
  offsetY = centerY - mapY * scale;
  updateTransforms();
}, { passive: false });

container.addEventListener('mousedown', e => {
  isDragging = true;
  dragMoved = false;
  dragStart = {x: e.clientX, y: e.clientY};
  dragOrigin = {x: offsetX, y: offsetY};
});

window.addEventListener('mouseup', e => { isDragging = false; });

window.addEventListener('mousemove', e => {
  if (isDragging) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    offsetX = dragOrigin.x + dx;
    offsetY = dragOrigin.y + dy;
    updateTransforms();
  }

  const rect = container.getBoundingClientRect();
  const mapX = (e.clientX - rect.left - offsetX) / scale / GRID_SIZE;
  const mapY = (e.clientY - rect.top - offsetY) / scale / GRID_SIZE;
  const gridX = Math.floor(mapX);
  const gridY = Math.floor(mapY);
  tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
  tooltip.style.top = (e.clientY - rect.top + 10) + 'px';
  tooltip.textContent = `${gridX}, ${gridY}`;
});

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  };
}

container.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    isDragging = true;
    dragMoved = false;
    dragStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    dragOrigin = {x: offsetX, y: offsetY};
    
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      const rect = container.getBoundingClientRect();
      const mapX = (e.touches[0].clientX - rect.left - offsetX) / scale / GRID_SIZE;
      const mapY = (e.touches[0].clientY - rect.top - offsetY) / scale / GRID_SIZE;
      const gx = Math.floor(mapX);
      const gy = Math.floor(mapY);
      if (gx >= 0 && gy >= 0) createMarker(gx, gy);
      e.preventDefault();
    }
    lastTap = currentTime;
  } else if (e.touches.length === 2) {
    isPinching = true;
    isDragging = false;
    lastTouchDistance = getTouchDistance(e.touches);
    e.preventDefault();
  }
}, { passive: false });

container.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && isDragging && !isPinching) {
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    offsetX = dragOrigin.x + dx;
    offsetY = dragOrigin.y + dy;
    updateTransforms();
    e.preventDefault();
  } else if (e.touches.length === 2 && isPinching) {
    const newDistance = getTouchDistance(e.touches);
    const center = getTouchCenter(e.touches);
    const rect = container.getBoundingClientRect();
    
    const oldScale = scale;
    const scaleChange = newDistance / lastTouchDistance;
    scale = Math.min(Math.max(0.1, scale * scaleChange), 3);
    
    const mapX = (center.x - rect.left - offsetX) / oldScale;
    const mapY = (center.y - rect.top - offsetY) / oldScale;
    offsetX = center.x - rect.left - mapX * scale;
    offsetY = center.y - rect.top - mapY * scale;
    
    lastTouchDistance = newDistance;
    updateTransforms();
    e.preventDefault();
  }
}, { passive: false });

container.addEventListener('touchend', e => {
  if (e.touches.length === 0) {
    isDragging = false;
    isPinching = false;
  } else if (e.touches.length === 1) {
    isPinching = false;
  }
});

async function loadMarkers() {
  try {
    const res = await fetch('/api/points');
    const newMarkers = await res.json();
    
    if (JSON.stringify(markers) !== JSON.stringify(newMarkers)) {
      markers = newMarkers;
      renderMarkers();
    }
  } catch {
    markers = [];
  }
}

function renderMarkers() {
  starsLayer.innerHTML = '';
  for (const marker of markers) {
    const wrapper = document.createElement('div');
    wrapper.className = 'star';
    wrapper.style.left = (marker.x * GRID_SIZE - 25) + 'px';
    wrapper.style.top = (marker.y * GRID_SIZE - 25) + 'px';
    wrapper.setAttribute('data-bs-toggle', 'tooltip');
    wrapper.setAttribute('data-bs-placement', 'top');
    wrapper.setAttribute('data-bs-title', marker.details || 'No details');

    const star = document.createElement('div');
    star.textContent = '★';

    const label = document.createElement('div');
    label.className = 'star-label';
    label.textContent = marker.name || `(${marker.x}, ${marker.y})`;

    wrapper.appendChild(star);
    wrapper.appendChild(label);

    let touchStartTime = 0;
    wrapper.addEventListener('touchstart', e => {
      touchStartTime = Date.now();
    });
    
    wrapper.addEventListener('touchend', e => {
      e.stopPropagation();
      e.preventDefault();
      const touchDuration = Date.now() - touchStartTime;
      if (touchDuration > 500) {
        // Long press = delete
        deleteMarker(marker.id);
      } else {
        // Quick tap = edit
        editMarker(marker);
      }
    });

    wrapper.addEventListener('click', e => {
      e.stopPropagation();
      if (e.ctrlKey) {
        deleteMarker(marker.id);
      } else {
        editMarker(marker);
      }
    });

    starsLayer.appendChild(wrapper);
  }

  const tooltipTriggerList = starsLayer.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach(el => {
    new bootstrap.Tooltip(el, {
      trigger: 'hover',
      placement: 'top',
      container: 'body'
    });
  });
  
  updateStarList();
}

function updateStarList(filter = '') {
  const starList = document.getElementById('starList');
  starList.innerHTML = '';
  
  const filteredMarkers = markers.filter(m => {
    const name = m.name || `(${m.x}, ${m.y})`;
    const details = m.details || '';
    const searchText = (name + ' ' + details).toLowerCase();
    return searchText.includes(filter.toLowerCase());
  });
  
  filteredMarkers.sort((a, b) => {
    const nameA = (a.name || `(${a.x}, ${a.y})`).toLowerCase();
    const nameB = (b.name || `(${b.x}, ${b.y})`).toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  if (filteredMarkers.length === 0) {
    starList.innerHTML = '<div class="text-light text-center p-1">No stars found</div>';
    return;
  }
  
  for (const marker of filteredMarkers) {
    const item = document.createElement('div');
    item.className = 'star-list-item';
    item.innerHTML = `
      <div class="star-item-name">${marker.name || 'Unnamed Star'}</div>
      <div class="star-item-coords">Coordinates: ${marker.x}, ${marker.y}</div>
    `;
    
    item.addEventListener('click', () => {
      jumpToStar(marker);
      document.querySelectorAll('.star-list-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });
    
    starList.appendChild(item);
  }
}

function jumpToStar(marker) {
  const targetX = marker.x * GRID_SIZE;
  const targetY = marker.y * GRID_SIZE;
  
  offsetX = container.clientWidth / 2 - targetX * scale;
  offsetY = container.clientHeight / 2 - targetY * scale;
  
  updateTransforms();
  showJumpMarker(marker.x, marker.y);
}

function jumpToCoordinates() {
  const x = parseInt(document.getElementById('jumpX').value);
  const y = parseInt(document.getElementById('jumpY').value);
  
  if (isNaN(x) || isNaN(y)) {
    alert('Please enter valid coordinates');
    return;
  }
  
  jumpToStar({ x, y });
}
function showJumpMarker(x, y) {
  if (jumpMarker) {
    jumpMarker.remove();
  }
  
  jumpMarker = document.createElement('div');
  jumpMarker.className = 'jump-marker';
  jumpMarker.style.left = (x * GRID_SIZE - 30) + 'px';
  jumpMarker.style.top = (y * GRID_SIZE - 30) + 'px';
  
  const label = document.createElement('div');
  label.className = 'jump-label';
  label.textContent = `${x}, ${y}`;

  const circle = document.createElement('div');
  circle.className = 'jump-circle';
  
  jumpMarker.appendChild(label);
  jumpMarker.appendChild(circle);
  starsLayer.appendChild(jumpMarker);
  
  setTimeout(() => {
    if (jumpMarker) {
      jumpMarker.remove();
      jumpMarker = null;
    }
  }, 5000);
}

function setupSearch() {
  const searchBox = document.getElementById('searchBox');
  searchBox.addEventListener('input', e => {
    updateStarList(e.target.value);
  });
}

function setupJumpTo() {
  const jumpBtn = document.getElementById('jumpBtn');
  jumpBtn.addEventListener('click', jumpToCoordinates);
  
  document.getElementById('jumpX').addEventListener('keypress', e => {
    if (e.key === 'Enter') jumpToCoordinates();
  });
  document.getElementById('jumpY').addEventListener('keypress', e => {
    if (e.key === 'Enter') jumpToCoordinates();
  });
}

async function createMarker(gx, gy) {
  currentEditId = null;
  document.getElementById('starName').value = '';
  document.getElementById('starDetails').value = '';
  modal.show();
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      const name = document.getElementById('starName').value || 'Unnamed Star';
      const details = document.getElementById('starDetails').value;
      await fetch('/api/points', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ x: gx, y: gy, name, details })
      });
      modal.hide();
      await loadMarkers();
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  };
}

function editMarker(marker) {
  currentEditId = marker.id;
  document.getElementById('starName').value = marker.name || '';
  document.getElementById('starDetails').value = marker.details || '';
  modal.show();
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      const name = document.getElementById('starName').value;
      const details = document.getElementById('starDetails').value;
      await fetch('/api/points', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: marker.id, name, details })
      });
      modal.hide();
      await loadMarkers();
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  };
}

async function deleteMarker(id) {
  if (confirm('Delete this marker?')) {
    await fetch('/api/points', {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id })
    });
    await loadMarkers();
  }
}

container.addEventListener('dblclick', e => {
  const rect = container.getBoundingClientRect();
  const mapX = (e.clientX - rect.left - offsetX) / scale / GRID_SIZE;
  const mapY = (e.clientY - rect.top - offsetY) / scale / GRID_SIZE;
  const gx = Math.floor(mapX);
  const gy = Math.floor(mapY);
  if (gx >= 0 && gy >= 0) createMarker(gx, gy);
});

function startLiveUpdates() {
  pollingInterval = setInterval(loadMarkers, 2000);
}

function stopLiveUpdates() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function init() {
  drawGrid();
  updateTransforms();
  loadMarkers();
  setupSearch();
  setupJumpTo();
  startLiveUpdates();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopLiveUpdates();
  } else {
    startLiveUpdates();
  }
});

init();