# College Omegle Clone

A production-ready Omegle clone built specifically for college students with WebRTC peer-to-peer video chat functionality.

## Features

- ✅ **Real-time Video Chat**: WebRTC peer-to-peer video and audio communication
- ✅ **User Matching**: Automatic matching system for connecting users
- ✅ **Database Integration**: MongoDB for user and room management
- ✅ **Security**: Rate limiting, CORS, helmet.js security headers
- ✅ **Logging**: Comprehensive logging system with Winston
- ✅ **Room Management**: Automatic cleanup on disconnect
- ✅ **Reporting System**: Users can report inappropriate behavior
- ✅ **Production Ready**: Environment variables, error handling, graceful shutdown

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- Socket.io
- MongoDB + Mongoose
- Winston (Logging)
- Helmet (Security)
- Express Rate Limit

### Frontend
- React + TypeScript
- Vite
- Socket.io Client
- WebRTC API

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd omegle-master-3
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Create backend `.env` file**
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/omegle-clone
CORS_ORIGIN=http://localhost:5173
```

4. **Frontend Setup**
```bash
cd frontend
npm install
```

5. **Start MongoDB** (if running locally)
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongodb
```

6. **Start Backend**
```bash
cd backend
npm run dev
```

7. **Start Frontend** (in a new terminal)
```bash
cd frontend
npm run dev
```

8. **Open Browser**
Navigate to `http://localhost:5173`

## Project Structure

```
omegle-master-3/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   │   ├── database.ts  # MongoDB connection
│   │   │   ├── logger.ts    # Winston logger
│   │   │   └── webrtc.ts    # WebRTC config
│   │   ├── models/          # MongoDB models
│   │   │   ├── User.ts      # User schema
│   │   │   └── Room.ts      # Room schema
│   │   ├── managers/        # Business logic
│   │   │   ├── UserManger.ts
│   │   │   └── RoomManager.ts
│   │   └── index.ts        # Main server file
│   ├── dist/               # Compiled JavaScript
│   └── logs/               # Application logs
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.tsx  # Landing page
│   │   │   └── Room.tsx     # Video chat room
│   │   └── App.tsx
│   └── dist/               # Production build
└── README.md
```

## API Endpoints

### REST API
- `GET /` - Health check
- `GET /api/rtc-config` - WebRTC configuration

### Socket.io Events

#### Client → Server
- `join` - Join the matching queue
  ```typescript
  socket.emit('join', { name: string, interests?: string[] })
  ```
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `add-ice-candidate` - Send ICE candidate
- `disconnect-room` - Disconnect from current room
- `report-user` - Report a user

#### Server → Client
- `lobby` - User is in matching queue
- `send-offer` - Start WebRTC connection
- `offer` - Receive WebRTC offer
- `answer` - Receive WebRTC answer
- `add-ice-candidate` - Receive ICE candidate
- `user-disconnected` - Other user disconnected
- `error` - Error message

## Environment Variables

See `.env.example` files in both `backend` and `frontend` directories for all available environment variables.

## Production Deployment

See [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) for detailed production deployment instructions.

## Development

### Backend Development
```bash
cd backend
npm run dev  # Builds and starts server
npm run build  # Only builds TypeScript
npm start  # Runs compiled JavaScript
```

### Frontend Development
```bash
cd frontend
npm run dev  # Starts Vite dev server
npm run build  # Builds for production
npm run preview  # Preview production build
```

## Future Enhancements

- [ ] College email verification
- [ ] Interest-based matching
- [ ] Text chat alongside video
- [ ] Admin dashboard for moderation
- [ ] User profiles
- [ ] Block users
- [ ] Video filters/effects
- [ ] Screen sharing
- [ ] Mobile app support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For issues or questions, please open an issue on GitHub.
