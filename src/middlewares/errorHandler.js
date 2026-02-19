const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
    })
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid authentication credentials',
    })
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    details: 'Something went wrong',
  })
}

export default errorHandler
