// import pkg from 'pg'
// const { Client } = pkg
// import dotenv from 'dotenv'
// import { logger } from '../utils/logger.js'

// dotenv.config()

// const client = new Client({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// })

// const connectDb = async () => {
//   try {
//     await client.connect()
//     logger.info('Connected to the database')
//   } catch (err) {
//     console.error('Failed to connect to the database:', err)
//     process.exit(1)
//   }
// }

// export { client, connectDb }

// export const getUserRoomsFn = async (userId) => {
//   try {
//     const query = `
//       SELECT
//         r.id,
//         u.user_id,
//         u.username,
//         u.profile,

//         CASE
//         -- case 1
//           WHEN m.type = 'voice' THEN (
//             SELECT json_build_object(
//               'type', m.type,
//               'voice_url', mv.voice_url,
//               'duration', mv.duration,
//               'created_at', m.created_at
//             )
//             FROM message_voices mv
//             WHERE mv.message_id = m.id
//           )

//         -- case 2
//           WHEN m.type = 'image' THEN (
//             SELECT json_build_object(
//               'type', m.type,
//               'content', m.content,
//               'images', (
//                 SELECT json_agg(image_url)
//                 FROM message_images mi
//                 WHERE mi.message_id = m.id
//               ),
//               'created_at', m.created_at
//             )
//           )

//         -- case 3
//           ELSE json_build_object(
//             'type', m.type,
//             'content', m.content,
//             'created_at', m.created_at
//           )
//         END AS last_message
//       FROM rooms r
//       JOIN users u
//       ON u.user_id = CASE
//         WHEN r.user1_id = $1 THEN r.user2_id
//         ELSE r.user1_id
//       END
//       LEFT JOIN LATERAL (
//         SELECT *
//         FROM messages msg
//         WHERE msg.room_id = r.id
//         ORDER BY created_at DESC
//         LIMIT 1
//       ) m ON TRUE
//       WHERE r.user1_id = $1 OR r.user2_id = $1
//       ORDER BY r.created_at DESC;
//     `

//     return await executeQuery(query, [userId])
//   } catch (error) {
//     throw error
//   }
// }

