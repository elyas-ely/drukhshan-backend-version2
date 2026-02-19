import {
  insertImageMessages,
  insertMessage,
  insertVoiceMessage,
  updateMessageStatusFn,
} from '../../services/roomService.js'

export async function handleSendMessage(io, socket, data, users) {
  try {
    if (!validatePayload(socket, data)) return

    const message = await saveMessage(data)

    const newMessage = buildNewMessage(message, data)

    const targetUserSocketId = emitToUsers(
      io,
      socket,
      newMessage,
      data.otherUserId,
      users
    )

    await handleDeliveryStatus(
      socket,
      targetUserSocketId,
      data.roomId,
      message,
      data.otherUserId
    )
  } catch (error) {
    console.log('❌ Error handling message:', error)
    socket.emit('error', { message: 'Failed to send message' })
  }
}

// -------------------- HELPERS --------------------

// ✅ Validation
function validatePayload(socket, data) {
  const { roomId, userId, type } = data
  if (!roomId || !userId || !type) {
    socket.emit('error', { message: 'Invalid message payload' })
    return false
  }
  return true
}

// Insert message & handle voice/images
async function saveMessage(data) {
  const { roomId, userId, type, content, voice_url, duration, images } = data

  const message = await insertMessage(
    roomId,
    userId,
    type,
    type === 'text' || type === 'image' ? content : null
  )

  if (type === 'voice' && voice_url) {
    await insertVoiceMessage(message.id, voice_url, duration)
  }

  if (type === 'image' && Array.isArray(images)) {
    await insertImageMessages(message.id, images)
  }

  return message
}

// Build message object
function buildNewMessage(message, data) {
  const { userId, roomId, clientId, type, voice_url, duration, images } = data

  return {
    id: message.id,
    sender_id: userId,
    roomId,
    clientId,
    message: {
      status: message.status,
      type: message.type,
      content: message.content,
      created_at: message.created_at,
      is_own: false,
      ...(type === 'voice' ? { voice_url, duration } : {}),
      ...(type === 'image' ? { images } : {}),
    },
  }
}

// Emit to users
function emitToUsers(io, socket, newMessage, otherUserId, users) {
  const targetUserSocketId = users[otherUserId]

  if (targetUserSocketId) {
    io.to(targetUserSocketId).emit('receive_message', newMessage)
  }

  socket.emit('client_message', {
    ...newMessage,
    message: { ...newMessage.message, is_own: true },
  })

  return targetUserSocketId
}

// Handle delivery status
async function handleDeliveryStatus(
  socket,
  targetUserSocketId,
  roomId,
  message,
  otherUserId
) {
  if (!targetUserSocketId) return

  await updateMessageStatusFn(roomId, otherUserId, 'delivered')
  socket.emit('message_status_update', {
    id: message.id,
    roomId,
    status: 'delivered',
  })
}
