import express from 'express'
import { connectDb } from './config/db.js'
import userRoutes from './routes/userRoutes.js'
import postRoutes from './routes/postRoutes.js'
import carRequestRoutes from './routes/carRequestRoutes.js'
import otherRoutes from './routes/otherRoutes.js'
import messengerRoutes from './routes/roomRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import errorHandler from './middlewares/errorHandler.js'
import dotenv from 'dotenv'
import http from 'http'
import { Server } from 'socket.io'
import { logger } from './utils/logger.js'
import cors from 'cors'
import socketHandler from './sockets/socketHandler.js'
import { socketAuth } from './middlewares/socketMiddleware.js'

dotenv.config()

const app = express()
const server = http.createServer(app)

// Connect to database
connectDb()

// Attach socket.io to the server
export const io = new Server(server, {
  cors: {
    origin: '*', // ⚠️ Change this to your app domain in production
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'], // enforce WebSocket for speed and reliability
  pingInterval: 2000, // send ping every 10s
  pingTimeout: 2000, // if no pong within 20s, mark socket as disconnected
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000, // allow auto-rejoin within 30s
  },
})

app.set('io', io) // make socket.io available in routes/controllers

// ✅ Use the external socket middleware
io.use(socketAuth)

// Use the socket handler
socketHandler(io)

// Middleware
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.static('public'))

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() })
})

// Routes
app.use('/users', userRoutes)
app.use('/posts', postRoutes)
app.use('/car-requests', carRequestRoutes)
app.use('/others', otherRoutes)
app.use('/rooms', messengerRoutes)
app.use('/dashboard', dashboardRoutes)

// Error handling (must be after routes)
app.use(errorHandler)

const port = process.env.PORT || 3000

server.listen(port, '0.0.0.0', () => {
  logger.info(`Server started on port ${port}`)
})

export default app
