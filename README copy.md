# NexChat

🚀 **Zero-login, peer-to-peer real-time chat with cinematic UI**

NexChat is a browser-based chat application that requires no login or sign-up. Users identify themselves with unique alphanumeric keys (e.g., `NX-A3K9-Z72M`) and establish direct P2P connections via WebRTC for text, voice, and video communication.

## ✨ Features

- **Zero-Login Identity**: Generate or enter a unique key to identify yourself
- **P2P Communication**: Direct WebRTC connections for low-latency messaging
- **Multi-Media**: Support for text messages, voice calls, and video calls
- **Responsive Design**: Optimized for desktop and mobile devices
- **Cinematic UI**: Smooth animations and transitions using Framer Motion
- **No Installation**: Runs entirely in the browser
- **Real-time Signaling**: Socket.IO for fast peer discovery and WebRTC negotiation

## 🎯 Core Philosophy

1. **Zero-Login**: Your key IS your identity
2. **P2P First**: Direct connections where possible for privacy and performance
3. **Cinematic UI**: Every interaction feels fluid and responsive
4. **One App**: Text, voice, video, and media all in one place

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast development and building
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **Socket.IO Client** - Real-time signaling

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.IO** - WebSocket for signaling
- **TypeScript** - Type safety

### WebRTC
- **Native WebRTC API** - P2P connections
- **STUN Servers** - NAT traversal (Google's public STUN servers)

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone/camera access (for voice/video calls)

## 🚀 Quick Start

### Installation

```bash
# Clone or extract the project
cd nexchat

# Install dependencies
npm install
```

### Development

```bash
# Start both frontend and backend in development mode
npm run dev
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

### Production Build

```bash
# Build both client and server
npm run build

# Start production server
npm start
```

## 📖 How to Use

1. **Open the App**: Navigate to the NexChat application
2. **Generate or Enter Key**: 
   - Click "Generate" to create a new unique key (e.g., `NX-A3K9-Z72M`)
   - Or enter an existing key to join a chat room
3. **Set Nickname**: Enter a display name for others to see
4. **Enter Chat**: Click "Enter Chat" to join
5. **Connect with Others**: 
   - Share your key with others
   - When someone joins with your key, you'll see them in the peer list
6. **Chat**: 
   - Select a peer from the list
   - Type messages and click Send
   - Or click the phone/video icons to start a call

## 🔑 Key Format

NexChat keys follow a specific format:
```
NX-XXXX-XXXX
```

Where:
- `NX` is the fixed prefix
- Each `X` is a random alphanumeric character (A-Z, 0-9)
- Example: `NX-A3K9-Z72M`

## 🌐 Architecture

### Client-to-Server
- **WebSocket Connection**: Socket.IO connects clients to the signaling server
- **Key-Based Rooms**: Clients join a room based on their key
- **Peer Discovery**: Server notifies clients when new peers join

### P2P Communication
- **WebRTC Offer/Answer**: Direct connection negotiation via signaling server
- **ICE Candidates**: NAT traversal using STUN servers
- **Media Streams**: Audio/video transmitted directly peer-to-peer

### Signaling Flow
```
Client A                Server              Client B
    |                     |                    |
    |------- join ------->|                    |
    |                     |<------ join -------|
    |                  (peer list)            |
    |<--- peer-joined ---|                    |
    |                     |<-- peer-joined ---|
    |                                         |
    |---------- signal (offer) ------------->|
    |<----------- signal (answer) -----------|
    |----------- signal (ICE) ------------->|
    |<----------- signal (ICE) --------------|
    |========= WebRTC P2P Connection ========|
```

## 📱 Responsive Design

NexChat adapts to different screen sizes:

- **Desktop**: Full sidebar with peer list, main chat area with messages
- **Tablet**: Collapsible sidebar, optimized touch targets
- **Mobile**: Bottom navigation, modal-based peer selection, portrait/landscape modes

## 🎨 UI/UX Features

- **Smooth Animations**: Every interaction uses Framer Motion for fluidity
- **Glass Morphism**: Modern semi-transparent UI elements
- **Status Indicators**: Visual feedback for connection states (connected, connecting, disconnected)
- **Real-time Updates**: Messages and peer list update in real-time
- **Modal Dialogs**: Call dialogs and confirmations with smooth animations

## 🔐 Security & Privacy

- **No Registration**: No passwords or accounts to manage
- **P2P Encrypted**: Messages sent directly peer-to-peer (not stored on server)
- **No Server Storage**: Messages don't persist on the server
- **STUN Only**: Uses public STUN servers for connectivity (no TURN relay)

⚠️ **Note**: End-to-end encryption is not yet implemented. Messages are sent P2P but not encrypted. Consider this a development feature.

## 📊 API Endpoints

### Health Check
```
GET /health
```
Returns server status and connection count.

### Statistics
```
GET /api/stats
```
Returns room statistics and user count per room.

## 🔄 Socket.IO Events

### Client → Server

- `join`: Join a chat room
  ```javascript
  { key: "NX-A3K9-Z72M", nickname: "Alice" }
  ```

- `leave`: Leave current room

- `message`: Send a text message
  ```javascript
  { to: "NX-OTHER-KEY", content: "Hello!" }
  ```

- `signal`: Send WebRTC signal (offer/answer/ICE)
  ```javascript
  { to: "NX-OTHER-KEY", signal: {...} }
  ```

### Server → Client

- `peer-joined`: New peer joined the room
- `peer-left`: Peer left the room
- `peers-list`: List of existing peers
- `message`: Incoming message
- `signal`: Incoming WebRTC signal

## 🐛 Troubleshooting

### Can't connect to peers
1. Check that both users have the same key
2. Verify firewall doesn't block WebRTC
3. Check browser console for errors
4. Ensure both clients are connected to signaling server

### No audio/video
1. Grant microphone/camera permissions
2. Check browser permissions settings
3. Try a different browser
4. Verify devices aren't in use by other apps

### Messages not appearing
1. Verify peer is selected in sidebar
2. Check network connection
3. Restart the application
4. Check browser console for errors

## 🚀 Deployment

### Heroku
```bash
# Add Heroku remote
heroku create nexchat

# Deploy
git push heroku main
```

### Docker
```bash
# Build
docker build -t nexchat .

# Run
docker run -p 3000:3000 nexchat
```

### Vercel + Backend
1. Deploy frontend to Vercel
2. Deploy backend to Render/Railway/Heroku
3. Set backend URL in environment variables

## 📦 Project Structure

```
nexchat/
├── src/                 # Frontend source
│   ├── components/     # React components
│   ├── store/         # Zustand stores
│   ├── utils/         # Helper functions
│   ├── App.tsx        # Main app component
│   ├── main.tsx       # Entry point
│   └── index.css      # Styles
├── server/            # Backend source
│   ├── index.ts       # Socket.IO server
│   └── tsconfig.json
├── index.html         # HTML entry point
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
├── vite.config.ts     # Vite config
└── tailwind.config.ts # Tailwind config
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🎯 Future Roadmap

- [ ] End-to-end encryption
- [ ] Screen sharing
- [ ] File sharing
- [ ] Message history (client-side storage)
- [ ] User presence indicators
- [ ] Typing indicators
- [ ] Call recording
- [ ] Dark/Light themes
- [ ] Audio/video quality settings
- [ ] Mobile native apps (React Native)

## 💬 Support

For issues, questions, or suggestions:
1. Check the troubleshooting section
2. Review browser console for error messages
3. Test with another browser
4. Create an issue with details about your problem

---

Built with ❤️ for privacy-first, P2P communication
