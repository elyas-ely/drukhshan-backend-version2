import {
  createRoomFn,
  getAllRoomsFn,
  getRoomByIdFn,
  getRoomMessagesFn,
  getUserRoomsFn,
  insertImageMessages,
  insertMessage,
  insertVoiceMessage,
  messagesToSeenFn,
} from '../services/roomService.js'

export const getAllRooms = async (req, res) => {
  try {
    const data = await getAllRoomsFn()
    res.json(data)
  } catch (error) {
    console.log(error)
  }
}

export const getUserRooms = async (req, res) => {
  const { userId } = req.query
  const page = parseInt(req.query?.page) || 1
  const limit = 6
  const offset = (page - 1) * limit

  if (!userId) {
    res.status(500).json({ message: 'userId is required' })
  }

  try {
    const rooms = await getUserRoomsFn(userId, limit, offset)
    res.status(200).json({
      rooms,
      nextPage: rooms.length < limit ? null : page + 1,
    })
  } catch (error) {
    console.log(error)
  }
}

export const getRoomMessages = async (req, res) => {
  const { roomId } = req.params
  const { userId } = req.query

  const page = parseInt(req.query?.page) || 1
  const limit = 15
  const offset = (page - 1) * limit

  if (!roomId || !userId) {
    res.status(500).json({ message: 'roomId and userid is required' })
  }
  try {
    const messages = await getRoomMessagesFn(roomId, userId, limit, offset)
    res.status(200).json({
      messages,
      nextPage: messages.length < limit ? null : page + 1,
    })
  } catch (error) {
    console.log(error)
  }
}

export const getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params
    const { userId1 } = req.query

    if (!roomId) {
      return res.status(400).json({
        message: 'roomId, userId1, and userId2 are required',
      })
    }

    const room = await getRoomByIdFn(roomId, userId1)

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      })
    }

    return res.status(200).json(room)
  } catch (error) {
    console.error('Error fetching room:', error)
    return res.status(500).json({
      message: 'Internal server error',
    })
  }
}

export const createRoom = async (req, res) => {
  try {
    const { userId1, userId2 } = req.body || {}

    // console.log('📩 createRoom called with:', userId1, userId2)

    if (!userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        message: 'Both userId1 and userId2 are required.',
      })
    }

    if (userId1 === userId2) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a room with yourself.',
      })
    }

    const room = await createRoomFn(userId1, userId2)

    if (!room) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create or retrieve room.',
      })
    }

    return res.status(200).json({
      success: true,
      room,
    })
  } catch (error) {
    console.error('❌ createRoom error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: error.message,
    })
  }
}

export const CreateMessage = async (req, res) => {
  const { roomId, userId } = req.query
  const data = req?.body

  try {
    // 1. Create base message
    const message = await insertMessage(
      roomId,
      userId,
      data.type,
      data.type === 'text' || data.type === 'image' ? data.content : null
    )

    // 2. Extra tables based on type
    if (data.type === 'voice' && data.voice_url) {
      await insertVoiceMessage(message.id, data.voice_url, data.duration)
    }

    if (data.type === 'image' && Array.isArray(data.images)) {
      await insertImageMessages(message.id, data.images)
    }

    // 3. Response (flat)
    return res.status(201).json({
      success: true,
      message: {
        id: message.id,
        sender_id: userId,
        type: message.type,
        content: message.content,
        created_at: message.created_at,
        ...(data.type === 'voice'
          ? { voice_url: data.voice_url, duration: data.duration }
          : {}),
        ...(data.type === 'image' ? { images: data.images } : {}),
      },
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create message',
    })
  }
}

export const messagesToSeen = async (req, res) => {
  const { roomId } = req.params
  const { userId } = req.query

  if (!roomId || !userId) {
    return res.status(400).json({
      success: false,
      message: 'roomId and userId are required',
    })
  }

  try {
    await messagesToSeenFn(roomId, userId)

    return res.status(204).send()
  } catch (error) {
    console.error('Error marking messages as seen:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to mark messages as seen',
    })
  }
}
