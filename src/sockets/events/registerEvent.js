import {
  getUserRoomsOnlineFn,
  updateAllMessagesToDeliveredFn,
  updateUserOnlineStatusFn,
} from '../../services/roomService.js'

// --- Main Function ---
export async function handleRegister(socket, users, userId, io) {
  if (!userId) {
    socket.emit('error', { message: 'User ID is required for registration' })
    return
  }

  try {
    registerUserSocket(users, userId, socket.id)
    await markUserOnline(userId)
    const rooms = await fetchUserRooms(userId)
    if (rooms.length === 0) return

    const onlineStatuses = prepareOnlineStatuses(rooms, users)
    sendOnlineStatusesToUser(socket, userId, onlineStatuses)
    notifyFriendsUserOnline(socket, users, userId, rooms)

    const messages = await updateAllMessagesToDeliveredFn(userId)

    if (messages && messages.length > 0) {
      messages.forEach((message) => {
        const friendSocketId = users[message.userid]

        if (friendSocketId) {
          io.to(friendSocketId).emit('all_messages_to_delivered', {
            roomId: message.roomid,
            userId: message.userid,
            status: 'delivered',
          })

          // console.log(`✅ Friend online: ${message.userid} — notified`)
        }
      })
    } else {
      // console.log('ℹ️ No messages found to mark as delivered')
    }
  } catch (error) {
    console.error('❌ Error in handleRegister:', error)
  }
}

// --- Helper: Register user socket in memory ---
function registerUserSocket(users, userId, socketId) {
  users[userId] = socketId
  // console.log(`-- 2 -- Registered user ${userId} with socket ${socketId}`)
}

// --- Helper: Update user status in DB ---
async function markUserOnline(userId) {
  await updateUserOnlineStatusFn(true, userId)
  // console.log(`-- 3 -- User ${userId} marked online in DB`)
}

// --- Helper: Get user’s rooms ---
async function fetchUserRooms(userId) {
  const rooms = await getUserRoomsOnlineFn(userId)
  if (!rooms || rooms.length === 0) {
    // console.log(`-- 4 -- No rooms found for ${userId}`)
    return []
  }
  // console.log(`-- 4 -- Got ${rooms.length} rooms for ${userId}`)
  return rooms
}

// --- Helper: Prepare current user’s online status list ---
function prepareOnlineStatuses(rooms, users) {
  return rooms.map((room) => ({
    roomId: room.id,
    userId: room.user_id,
    online: Boolean(users[room.user_id]),
  }))
}

// --- Helper: Send full list of friends' statuses to current user ---
function sendOnlineStatusesToUser(socket, userId, onlineStatuses) {
  socket.emit('online_status', onlineStatuses)
  // console.log(`-- 5 -- Sent online friends to ${userId}:`, onlineStatuses)
}

// --- Helper: Notify all online friends about current user ---
function notifyFriendsUserOnline(socket, users, userId, rooms) {
  const data = rooms.map((room) => ({
    roomId: room.id,
    userId,
    online: true,
  }))

  const notified = []

  rooms.forEach((room) => {
    const friendSocketId = users[room.user_id]
    if (friendSocketId) {
      socket.to(friendSocketId).emit('online_status', data)
      notified.push(room.user_id)
    }
  })

  // console.log(
  //   `-- 6 -- Notified ${notified.length} friends that ${userId} is online:`,
  //   notified
  // )
}
