import express from 'express'
import {
  CreateMessage,
  createRoom,
  getAllRooms,
  getRoomById,
  getRoomMessages,
  getUserRooms,
  messagesToSeen,
} from '../controllers/roomController.js'

const router = express.Router()

// =======================================
// ============== GET ROUTES =============
// =======================================
router.get('/', getAllRooms)
router.get('/user', getUserRooms)
router.get('/:roomId/messages', getRoomMessages)
router.get('/:roomId', getRoomById)

router.post('/create', createRoom)
// NOTE: THIS ROUTE SHOULD BE FIXED WITH MESSAGES ROUTE
router.post('/', CreateMessage)
router.put('/:roomId/seen', messagesToSeen)

export default router
