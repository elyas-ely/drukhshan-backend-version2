import { handleDisconnect } from './events/disconnectEvent.js'
import { handleRegister } from './events/registerEvent.js'
import { handleSendMessage } from './events/sendMessageEvent.js'
import { handleUpdateMessagesToSeen } from './events/updateMessagesToSeenEvent.js'

const users = {
  jlDG5DopH2Vv4XT62LP7bJ4FlJs1: 'jsaglDG5D2Vv4XT62LP7bJ4FlJs1',
}

export default function socketHandler(io) {
  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth.userId
    // console.log(' --- connected: ', userId)

    handleRegister(socket, users, userId, io)

    socket.on('send_message', (data) =>
      handleSendMessage(io, socket, data, users)
    )

    socket.on('messages_to_seen', (data) => {
      handleUpdateMessagesToSeen(
        data?.roomId,
        data?.userId,
        data?.otherUserId,
        socket,
        users,
        io
      )
    })

    socket.on('typing', (data) => {
      // console.log('typing...')

      if (data.roomId && data.userId && data.otherUserId) {
        const targetUserId = users[data.otherUserId]

        const isTypingData = {
          roomId: data.roomId,
          userId: data.otherUserId,
          otherUserId: data.userId,
          isTyping: data.isTyping,
        }

        if (targetUserId) {
          io.to(targetUserId).emit('is_typing', isTypingData)
          // console.log('this user is typing: ', data.userId)
        }
        // console.log(data)
      }
    })

    socket.on('recording', (data) => {
      // console.log('-------', data)

      if (data.roomId && data.userId && data.otherUserId) {
        const targetUserId = users[data.otherUserId]

        const isRecording = {
          roomId: data.roomId,
          userId: data.otherUserId,
          otherUserId: data.userId,
          isRecording: data.isRecording,
        }

        if (targetUserId) {
          io.to(targetUserId).emit('is_recording', isRecording)
          // console.log('this user is recording: ', data.userId)
        }
        // console.log(data)
      }
    })

    socket.on('disconnect', () => handleDisconnect(socket, users))
  })
}
