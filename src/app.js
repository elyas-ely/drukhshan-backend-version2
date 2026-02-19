import express from 'express'
import { connectDb } from './config/db.js'
import userRoutes from './routes/userRoutes.js'
import postRoutes from './routes/postRoutes.js'
import carRequestRoutes from './routes/carRequestRoutes.js'
import otherRoutes from './routes/otherRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import errorHandler from './middlewares/errorHandler.js'
import dotenv from 'dotenv'
import { logger } from './utils/logger.js'
import cors from 'cors'

dotenv.config()

const app = express()
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
app.use('/dashboard', dashboardRoutes)

// Error handling (must be after routes)
app.use(errorHandler)

const port = process.env.PORT || 3000

app.listen(port, '0.0.0.0', () => {
  logger.info(`Server started on port ${port}`)
})

export default app
