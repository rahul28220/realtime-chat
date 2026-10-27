const BACKEND_URL = 'http://localhost:5001';

let socket = null;
let currentUser = '';
let currentRoom = 'general';
let typingTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
});

function handleJoin(e) {
  e.preventDefault();
  const name = document.getElementById('usernameInput').value.trim();
  const room = document.getElementById('initialRoomSelect').value;

  if (!name) return;

  currentUser = name;
  currentRoom = room;

  document.getElementById('currentUserDisplay').innerText = currentUser;
  document.getElementById('avatarInitial').innerText = currentUser.charAt(0).toUpperCase();
  document.getElementById('currentRoomTitle').innerText = currentRoom;
  document.getElementById('messageInput').placeholder = `Type a message into #${currentRoom}...`;
  document.getElementById('joinModal').classList.add('hidden');

  initSocket();
}

function initSocket() {
  socket = io(BACKEND_URL);

  socket.on('connect', () => {
    socket.emit('join_room', { username: currentUser, room: currentRoom });
    loadRoomHistory(currentRoom);
  });

  socket.on('receive_message', (data) => {
    appendMessage(data);
  });

  socket.on('room_users', (users) => {
    renderUsersList(users);
  });

  socket.on('user_typing', ({ username }) => {
    const el = document.getElementById('typingIndicator');
    document.getElementById('typingText').innerText = `${username} is typing...`;
    el.classList.remove('hidden');
  });

  socket.on('user_stop_typing', () => {
    document.getElementById('typingIndicator').classList.add('hidden');
  });
}

async function loadRoomHistory(room) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/messages/${room}`);
    if (res.ok) {
      const msgs = await res.json();
      const container = document.getElementById('chatMessages');
      container.innerHTML = '';
      msgs.forEach(appendMessage);
    }
  } catch (err) {
    console.warn('Could not fetch historical logs from REST backend, starting clean stream');
  }
}

function switchRoom(newRoom) {
  if (currentRoom === newRoom) return;

  currentRoom = newRoom;
  document.getElementById('currentRoomTitle').innerText = currentRoom;
  document.getElementById('messageInput').placeholder = `Type a message into #${currentRoom}...`;

  // Highlight active room in sidebar
  document.querySelectorAll('.room-btn').forEach(btn => {
    btn.className = 'room-btn w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition';
  });
  const activeBtn = document.getElementById(`room-${newRoom}`);
  if (activeBtn) {
    activeBtn.className = 'room-btn w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-white';
  }

  document.getElementById('chatMessages').innerHTML = '';

  if (socket) {
    socket.emit('join_room', { username: currentUser, room: currentRoom });
    loadRoomHistory(currentRoom);
  }
}

function handleSendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('messageInput');
  const text = input.value.trim();

  if (!text || !socket) return;

  socket.emit('send_message', {
    sender: currentUser,
    room: currentRoom,
    text: text
  });

  socket.emit('stop_typing', { room: currentRoom });
  input.value = '';
}

function handleTyping() {
  if (!socket) return;
  socket.emit('typing', { username: currentUser, room: currentRoom });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', { room: currentRoom });
  }, 1200);
}

function appendMessage(msg) {
  const container = document.getElementById('chatMessages');

  // System notice
  if (msg.isSystem) {
    container.innerHTML += `
      <div class="text-center my-2">
        <span class="text-[11px] text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">${msg.text}</span>
      </div>
    `;
    scrollToBottom();
    return;
  }

  const isMe = msg.sender === currentUser;
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubble = `
    <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-semibold ${isMe ? 'text-indigo-400' : 'text-slate-300'}">${isMe ? 'You' : msg.sender}</span>
        <span class="text-[10px] text-slate-500">${time}</span>
      </div>
      <div class="max-w-md px-4 py-2.5 rounded-2xl text-sm ${
        isMe
          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
          : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50'
      }">
        <p class="leading-relaxed break-words">${msg.text}</p>
      </div>
      <span class="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
        ${isMe ? '<i data-lucide="check-check" class="w-3.5 h-3.5 text-indigo-400 inline"></i> Delivered' : ''}
      </span>
    </div>
  `;

  container.innerHTML += bubble;
  scrollToBottom();
  if (window.lucide) lucide.createIcons();
}

function renderUsersList(users) {
  const container = document.getElementById('usersList');
  document.getElementById('userCountBadge').innerText = users.length;
  container.innerHTML = '';

  users.forEach(u => {
    container.innerHTML += `
      <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/60">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="truncate">${u.username}</span>
      </div>
    `;
  });
}

function scrollToBottom() {
  const container = document.getElementById('chatMessages');
  container.scrollTop = container.scrollHeight;
}

function leaveChat() {
  location.reload();
}