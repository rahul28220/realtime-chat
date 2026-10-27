# PulseChat - Real-Time Chat Application

A high-performance real-time messaging application built with Node.js, Express, Socket.io, and Tailwind CSS.

## Features
- **Real-Time WebSockets:** Sub-millisecond bi-directional communication powered by Socket.io.
- **Multiple Channels / Rooms:** Seamless channel switching (`#general`, `#engineering`, `#design`).
- **Presence & Online Members:** Real-time online member indicators and user counts per room.
- **Typing Telemetry:** Live typing alert indicators when other users compose messages.
- **Persistent Message Store:** MongoDB schema integration with fallback support.
- **Responsive Dark Interface:** Clean Discord/Slack-style layout with message timestamps and delivery ticks.

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev