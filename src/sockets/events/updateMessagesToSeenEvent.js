import { updateMessageStatusFn } from '../../services/roomService.js'

export async function handleUpdateMessagesToSeen(
  roomId,
  userId,
  otherUserId,
  socket,
  users,
  io
) {
  try {
    await updateMessageStatusFn(roomId, userId, 'seen')

    const targetUserSocketId = users[otherUserId]
    if (targetUserSocketId) {
      io.to(targetUserSocketId).emit('all_messages_to_seen', {
        roomId,
        userId: otherUserId,
      })
    }
    // console.log('sent to ', otherUserId)
  } catch (error) {
    console.error('❌ Error handling message:', error)
    socket.emit('error', { message: 'Failed to send message' })
  }
}
