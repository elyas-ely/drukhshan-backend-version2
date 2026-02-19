import {
  getUserRoomsOnlineFn,
  updateUserOnlineStatusFn,
} from '../../services/roomService.js'

export async function handleDisconnect(socket, users) {
  const userId = socket.handshake.auth?.userId

  if (!userId) {
    console.log(`Disconnect: userId not found for socket ${socket.id}`)
    return
  }

  // console.log(`-- 1 -- ❌ Client disconnected: ${userId} (${socket.id})`)

  try {
    // Update online status
    await updateUserOnlineStatusFn(false, userId)
    // console.log(`-- 2 -- User online status set to false for: ${userId}`)

    // Get rooms the user belongs to
    const rooms = await getUserRoomsOnlineFn(userId)
    // console.log(`-- 3 -- Got rooms for user ${userId}:`, rooms)

    if (!rooms || rooms.length === 0) {
      // console.log(`-- 2 -- No rooms found for user ${userId}`)
      delete users[userId]
      return
    }

    // console.log(`-- 3 -- Got rooms for user ${userId}:`, rooms)

    // Prepare offline status array (for broadcasting)
    const offlineStatuses = rooms.map((room) => ({
      roomId: room.id,
      userId,
      online: false,
    }))

    rooms.forEach((room) => {
      const friendSocketId = users[room.user_id]
      if (friendSocketId) {
        socket.to(friendSocketId).emit('online_status', offlineStatuses)
        // console.log(
        //   `-- 4 -- Sent offline status array to friend ${room.user_id}`
        // )
      }
    })

    // Remove user from active users only if socket matches
    if (users[userId] === socket.id) {
      delete users[userId]
      // console.log(`-- 5 -- User ${userId} removed from active users`)
    }
  } catch (error) {
    console.error('Error in handleDisconnect:', error)
  }
}
