import { client } from '../config/db.js'
import { executeQuery } from '../utils/helpingFunctions.js'

// =======================================
// ============ GET ALL USERS ============
// =======================================
export const getAllUsersFn = async (searchTerm, city, limit, offset) => {
  let query = `
    SELECT *,
      similarity(unaccent(username), unaccent($1)) AS sim,
      ts_rank_cd(
        setweight(to_tsvector('simple', unaccent(username)), 'A'),
        plainto_tsquery('simple', unaccent($1))
      ) AS rank
    FROM users 
    WHERE seller = true
      AND (
        similarity(unaccent(username), unaccent($1)) > 0.15 OR
        to_tsvector('simple', unaccent(username)) @@ plainto_tsquery('simple', unaccent($1)) OR
        username ILIKE '%' || $1 || '%'
      )
  `
  const params = [searchTerm]
  let paramIndex = 2

  if (city) {
    query += ` AND city = $${paramIndex}`
    params.push(city)
    paramIndex++
  }

  query += `
    ORDER BY 
      CASE 
        WHEN username ILIKE $1 || '%' THEN 1
        WHEN to_tsvector('simple', unaccent(username)) @@ plainto_tsquery('simple', unaccent($1)) THEN 2
        WHEN similarity(unaccent(username), unaccent($1)) > 0.15 THEN 3
        ELSE 4
      END,
      sim DESC,
      rank DESC,
      username ASC,
      created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `

  params.push(limit, offset)

  return await executeQuery(query, params)
}

// =======================================
// ============ GET SEARCH USERS ============
// =======================================
export const getSearchUsersFn = async (searchTerm, limit = 6) => {
  const query = `
    SELECT *,
      similarity(unaccent(username), unaccent($1)) AS sim,
      ts_rank_cd(
        setweight(to_tsvector('simple', unaccent(username)), 'A'),
        plainto_tsquery('simple', unaccent($1))
      ) AS rank
    FROM users 
    WHERE 
      seller = true AND (
        similarity(unaccent(username), unaccent($1)) > 0.15 OR
        to_tsvector('simple', unaccent(username)) @@ plainto_tsquery('simple', unaccent($1)) OR
        username ILIKE '%' || $1 || '%'
      )
    ORDER BY 
      CASE 
        WHEN username ILIKE $1 || '%' THEN 1
        WHEN to_tsvector('simple', unaccent(username)) @@ plainto_tsquery('simple', unaccent($1)) THEN 2
        WHEN similarity(unaccent(username), unaccent($1)) > 0.15 THEN 3
        ELSE 4
      END,
      sim DESC,
      rank DESC,
      username ASC,
      created_at DESC
    LIMIT $2;
  `

  return await executeQuery(query, [searchTerm, limit])
}

// =======================================
// =========== GET USER BY ID ===========
// =======================================
export const getUserByIdFn = async (userId) => {
  try {
    const query = `
      SELECT 
        u.*, 
        (SELECT COUNT(*) FROM posts WHERE user_id = u.user_id) AS total_posts,
        (SELECT COUNT(*) 
         FROM likes l 
         INNER JOIN posts p ON p.id = l.post_id 
         WHERE p.user_id = u.user_id) AS total_likes
      FROM users u
      WHERE u.user_id = $1
    `

    const values = [userId]
    const result = await executeQuery(query, values)

    return result[0]
  } catch (error) {
    console.error('Error in getUserByIdFn:', error)
    throw error
  }
}

// =======================================
// ============== GET VIEWED USERS =========
// =======================================
export const getViewedUsersFn = async (userId) => {
  const query = `SELECT u.* 
     FROM users u
     JOIN viewed_users v ON u.user_id = v.viewed_user_id
     WHERE v.user_id = $1
     ORDER BY v.created_at DESC`

  return await executeQuery(query, [userId])
}

// =======================================
// ============= CREATE USER ============
// =======================================

export const createUserFn = async (userData) => {
  const {
    userId,
    username,
    email,
    bio = null,
    city = null,
    background = null,
    profile = null,
    facebook = null,
    lat = null,
    lng = null,
    phone_number1 = null,
    phone_number2 = null,
    phone_number3 = null,
    address = null,
    whatsapp = null,
    x = null,
  } = userData



  const query = `
    INSERT INTO users (
      user_id, username, email, bio, city, background, profile,
      facebook, lat, lng, phone_number1, phone_number2, phone_number3,
      address, whatsapp, x, seller
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `

  const values = [
    userId,
    username,
    email,
    bio,
    city,
    background,
    profile,
    facebook,
    lat,
    lng,
    phone_number1,
    phone_number2,
    phone_number3,
    address,
    whatsapp,
    x,
    true,
  ]

  try {
    const [user] = await executeQuery(query, values)
    return user
  } catch (error) {
    throw error
  }
}

// =======================================
// ============= UPDATE USER ============
// =======================================
export const updateUserFn = async (userId, userData) => {
  const updatableFields = [
    'username',
    'email',
    'bio',
    'city',
    'background',
    'profile',
    'facebook',
    'lat',
    'lng',
    'phone_number1',
    'phone_number2',
    'phone_number3',
    'address',
    'whatsapp',
    'x',
  ]

  // Filter out fields that are not provided in the request
  const fieldsToUpdate = {}
  for (const field of updatableFields) {
    if (userData[field] !== undefined) {
      fieldsToUpdate[field] = userData[field]
    }
  }

  // If no fields are provided to update, throw an error
  if (Object.keys(fieldsToUpdate).length === 0) {
    throw new Error('No fields provided to update')
  }

  // Construct the SQL query dynamically
  const setClause = Object.keys(fieldsToUpdate)
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ')

  const values = Object.values(fieldsToUpdate)
  values.push(userId)

  const query = `
    UPDATE users
    SET ${setClause}
    WHERE user_id = $${values.length}
    RETURNING *
  `

  // Execute the query
  const result = await executeQuery(query, values)
  return result[0]
}

// =======================================
// ============== UPDATE VIEWED USERS ====
// =======================================

export const updateViewedUsersFn = async (userId, otherId) => {
  try {
    // Upsert the viewed user (insert or update timestamp if exists)
    await executeQuery(
      `INSERT INTO viewed_users (user_id, viewed_user_id, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, viewed_user_id)
       DO UPDATE SET created_at = EXCLUDED.created_at`,
      [userId, otherId]
    )

    // Keep only the 5 most recent viewed users
    await executeQuery(
      `DELETE FROM viewed_users
       WHERE user_id = $1
       AND viewed_user_id NOT IN (
         SELECT viewed_user_id FROM viewed_users
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5
       )`,
      [userId]
    )

    return { message: 'viewed' } // can be simplified since upsert always happens
  } catch (error) {
    throw error
  }
}

// =======================================
// ============= DELETE USER ============
// =======================================
export const deleteUserFn = async (userId) => {
  const query = 'DELETE FROM users WHERE user_id = $1 RETURNING *'
  const rows = await executeQuery(query, [userId])
  return rows[0]
}
