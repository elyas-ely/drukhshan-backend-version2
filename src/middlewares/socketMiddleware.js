// middlewares/socketAuth.js
export function socketAuth(socket, next) {
  const { userId } = socket.handshake.auth

  if (!userId) {
    console.log('❌ Missing userId in handshake')
    return next(new Error('UserId missing'))
  }

  socket.userId = userId
  next()
}
