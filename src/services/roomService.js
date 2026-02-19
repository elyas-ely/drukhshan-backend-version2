import { executeQuery } from '../utils/helpingFunctions.js'

export const getAllRoomsFn = async () => {
  try {
    const query = `
      SELECT * FROM rooms
      ORDER BY created_at DESC
    `
    return await executeQuery(query)
  } catch (error) {
    throw error
  }
}

export const getRoomByIdFn = async (roomId, userId1) => {
  const query = `
    SELECT
      r.id,
      u.user_id,
      u.username,
      u.profile,
      u.online,
      u.last_seen
    FROM rooms r
    JOIN users u
      ON u.user_id = CASE
        WHEN r.user1_id = $2 THEN r.user2_id
        ELSE r.user1_id
      END
    WHERE r.id = $1
    LIMIT 1;
  `
  const room = await executeQuery(query, [roomId, userId1])
  return room[0]
}

export const getUserRoomsFn = async (userId, limit, offset) => {
  try {
    const query = `
      SELECT 
        r.id,
        u.user_id,
        u.username,
        u.profile,
        u.online,
        u.last_seen,
        (
          SELECT COUNT(*) 
          FROM messages m
          WHERE m.room_id = r.id
            AND m.sender_id != $1
            AND m.status != 'seen'
        ) AS unseen_count,

        CASE 
          -- case 1: voice message
          WHEN m.type = 'voice' THEN (
            SELECT json_build_object(
              'type', m.type,
              'status', m.status,
              'voice_url', mv.voice_url,
              'duration', mv.duration,
              'created_at', m.created_at,
              'is_own', (m.sender_id = $1)
            )
            FROM message_voices mv
            WHERE mv.message_id = m.id
          )

          -- case 2: image message
          WHEN m.type = 'image' THEN (
            SELECT json_build_object(
              'type', m.type,
              'status', m.status,
              'content', m.content,
              'images', (
                SELECT json_agg(image_url)
                FROM message_images mi
                WHERE mi.message_id = m.id
              ),
              'created_at', m.created_at,
              'is_own', (m.sender_id = $1)
            )
          )

          -- case 3: text or others
          ELSE json_build_object(
            'type', m.type,
            'status', m.status,
            'content', m.content,
            'created_at', m.created_at,
            'is_own', (m.sender_id = $1)
          )
        END AS last_message

      FROM rooms r
      JOIN users u
        ON u.user_id = CASE
          WHEN r.user1_id = $1 THEN r.user2_id
          ELSE r.user1_id
        END
      JOIN LATERAL (
        SELECT * 
        FROM messages msg
        WHERE msg.room_id = r.id
        ORDER BY msg.created_at DESC
        LIMIT 1
      ) m ON TRUE
      WHERE r.user1_id = $1 OR r.user2_id = $1
      ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3;
    `

    return await executeQuery(query, [userId, limit, offset])
  } catch (error) {
    throw error
  }
}

export const getRoomMessagesFn = async (roomId, userId, limit, offset) => {
  try {
    const query = `
      SELECT 
        m.id,
        m.sender_id,
        json_strip_nulls(
          json_build_object(
            'type', m.type,
            'status', m.status,
            'content', CASE WHEN m.type != 'voice' THEN m.content END,
            'voice_url', CASE WHEN m.type = 'voice' THEN mv.voice_url END,
            'duration', CASE WHEN m.type = 'voice' THEN mv.duration END,
            'images', CASE WHEN m.type = 'image' THEN (
              SELECT json_agg(image_url)
              FROM message_images mi
              WHERE mi.message_id = m.id
            ) END,
            'created_at', m.created_at,
            'is_own', (m.sender_id = $2)
          )
        ) AS message
      FROM messages m
      LEFT JOIN message_voices mv ON mv.message_id = m.id
      INNER JOIN rooms r ON r.id = m.room_id
      WHERE m.room_id = $1
        AND ($2 = r.user1_id OR $2 = r.user2_id)
      ORDER BY m.created_at DESC
      LIMIT $3
      OFFSET $4
      ;
    `

    return await executeQuery(query, [roomId, userId, limit, offset])
  } catch (error) {
    throw error
  }
}

export const createRoomFn = async (userId1, userId2) => {
  const query = `
    WITH inserted AS (
      INSERT INTO rooms (user1_id, user2_id)
      VALUES ($1, $2)
      ON CONFLICT (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
      DO UPDATE SET user1_id = rooms.user1_id
      RETURNING *
    )
    SELECT 
      r.id,
      u.user_id,
      u.username,
      u.profile,
      u.online,
      u.last_seen
    FROM inserted r
    JOIN users u
      ON u.user_id = CASE
        WHEN r.user1_id = $1 THEN r.user2_id
        ELSE r.user1_id
      END;
  `

  const rows = await executeQuery(query, [userId1, userId2])
  return rows[0]
}

// Insert into messages
export const insertMessage = async (roomId, userId, type, content = null) => {
  const query = `
    INSERT INTO messages (room_id, sender_id, type, content)
    VALUES ($1, $2, $3, $4)
    RETURNING*
  `
  const [message] = await executeQuery(query, [roomId, userId, type, content])
  return message
}

// Insert voice message metadata
export const insertVoiceMessage = async (
  messageId,
  voiceUrl,
  duration = null
) => {
  const query = `
    INSERT INTO message_voices (message_id, voice_url, duration)
    VALUES ($1, $2, $3)
  `
  await executeQuery(query, [messageId, voiceUrl, duration])
}

// Insert multiple image URLs
export const insertImageMessages = async (messageId, images = []) => {
  if (!images.length) return
  const query = `
    INSERT INTO message_images (message_id, image_url)
    SELECT $1, unnest($2::text[])
  `
  await executeQuery(query, [messageId, images])
}

// MESSAGES TO SEEN
export const messagesToSeenFn = async (roomId, userId) => {
  try {
    const query = `
      UPDATE messages
      SET status = 'seen'
      WHERE room_id = $1
        AND sender_id != $2
        AND status != 'seen';
    `

    const result = await executeQuery(query, [roomId, userId])

    return result
  } catch (error) {
    console.error('Error in messagesToSeenFn:', error)
    throw error
  }
}

export const updateMessageStatusFn = async (roomId, userId, status) => {
  try {
    let query

    if (status === 'delivered') {
      // Only update messages that are currently "sent"
      query = `
        UPDATE messages
        SET status = $3
        WHERE room_id = $1
          AND sender_id != $2
          AND status = 'sent';
      `
    } else if (status === 'seen') {
      // Only update messages that are not already seen
      query = `
        UPDATE messages
        SET status = $3
        WHERE room_id = $1
          AND sender_id != $2
          AND status != 'seen';
      `
    } else {
      // If unknown status, do nothing
      return { rowCount: 0 }
    }

    const result = await executeQuery(query, [roomId, userId, status])
    return result
  } catch (error) {
    console.error('Error in updateMessageStatusFn:', error)
    throw error
  }
}

export const updateAllMessagesToDeliveredFn = async (userId) => {
  try {
    const query = `
      WITH updated AS (
        UPDATE messages m
        SET status = 'delivered'
        FROM rooms r
        WHERE m.room_id = r.id
          AND (r.user1_id = $1 OR r.user2_id = $1)
          AND m.sender_id != $1
          AND m.status = 'sent'
        RETURNING m.room_id, 
                  CASE
                    WHEN r.user1_id = $1 THEN r.user2_id
                    ELSE r.user1_id
                  END AS userId
      )
      SELECT DISTINCT room_id AS roomId, userId
      FROM updated;
    `

    const result = await executeQuery(query, [userId])

    // console.log(
    //   `✅ Updated ${result.length} unique messages to 'delivered' for user ${userId}`,
    //   result
    // )

    return result
  } catch (error) {
    console.error('❌ Error in updateAllMessagesToDeliveredFn:', error)
    throw error
  }
}

export const getUserRoomsOnlineFn = async (userId) => {
  const query = `
      SELECT r.id,
      CASE 
        WHEN user1_id = $1 THEN user2_id 
        ELSE user1_id 
      END AS user_id
    FROM rooms r
    WHERE user1_id = $1 OR user2_id = $1
  `
  return await executeQuery(query, [userId])
}

export const updateUserOnlineStatusFn = async (online, userId) => {
  const query = `
    UPDATE users
    SET 
      online = $1,
      last_seen = CASE 
        WHEN $1 = false THEN NOW()
        ELSE last_seen
      END
    WHERE user_id = $2
  `

  return executeQuery(query, [online, userId])
}
