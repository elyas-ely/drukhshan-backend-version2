import { client } from '../config/db.js'
import crypto from 'crypto'

export const executeQuery = async (query, params = []) => {
  const connection = await client.connect()
  try {
    const result = await connection.query(query, params)
    return result.rows
  } finally {
    connection.release()
  }
}

export function generateLikes(postId, count) {
  const values = []
  const placeholders = []

  for (let i = 0; i < count; i++) {
    const id = crypto.randomBytes(8).toString('hex')
    values.push(id, postId)
    placeholders.push(`($${i * 2 + 1}, $${i * 2 + 2})`)
  }

  return {
    values,
    placeholders: placeholders.join(','),
  }
}
