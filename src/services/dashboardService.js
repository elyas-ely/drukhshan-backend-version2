import { executeQuery, generateLikes } from '../utils/helpingFunctions.js'

// =======================================
// ============ GET ALL USERS ============
// =======================================
export async function DSgetAllUsersFn(searchTerm, city, limit, offset) {
  let query = `
    SELECT *,
      similarity(unaccent(username), unaccent($1)) AS sim,
      ts_rank_cd(
        setweight(to_tsvector('simple', unaccent(username)), 'A'),
        plainto_tsquery('simple', unaccent($1))
      ) AS rank
    FROM users 
    WHERE
     (
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
// ============ GET SEARCH USERS =========
// =======================================
export async function DSgetSearchUsersFn(searchTerm, limit = 6) {
  const query = `
    SELECT *,
      similarity(unaccent(username), unaccent($1)) AS sim,
      ts_rank_cd(
        setweight(to_tsvector('simple', unaccent(username)), 'A'),
        plainto_tsquery('simple', unaccent($1))
      ) AS rank
    FROM users 
    WHERE 
      (
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
// ============ POST TO POPULAR ==========
// =======================================
export async function DSpostToPopularFn(postId) {
  const query = `
    UPDATE posts
    SET
      popular = NOT popular,
      sponsored = NOT popular
    WHERE id = $1
  `
  return await executeQuery(query, [postId])
}

// =======================================
// ============ USER TO SELLER ===========
// =======================================
export async function DSuserToSellerFn(userId) {
  const query = `
    UPDATE users
    SET seller = NOT seller
    WHERE user_id = $1
  `
  return await executeQuery(query, [userId])
}

// =======================================
// ============== GET ALL CAR REQUESTS ===
// =======================================
export async function DSgetAllCarRequestsFn(city) {
  let query = `
    SELECT cr.*, 
           u.username,
           u.profile
      FROM car_requests cr
      INNER JOIN users u ON cr.user_id = u.user_id
  `
  const values = []

  if (city) {
    query += ` AND cr.city = $1`
    values.push(city)
  }

  // Order by newest requests first
  query += ` ORDER BY cr.created_at DESC`

  try {
    return await executeQuery(query, values)
  } catch (err) {
    throw err
  }
}

// =======================================
// ============== GET ALL USER REQUESTS ==
// =======================================
export const DSgetAllUserCarRequestsFn = async (status, limit, offset) => {
  // Base query and parameters
  let query = `
    SELECT cr.*, 
           u.username,
           u.profile
      FROM car_requests cr 
      INNER JOIN users u 
        ON cr.user_id = u.user_id`

  const values = []

  // Add status filter if status is NOT 'all'
  if (status && status.toLowerCase() !== 'all') {
    query += ` AND cr.status = $1`
    values.push(status)
  }

  // Always order by created_at DESC
  query += ` ORDER BY cr.created_at DESC`

  query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
  values.push(limit, offset)

  return await executeQuery(query, values)
}

// =======================================
// ============== GET REQUEST BY ID ======
// =======================================
export async function DSgetCarRequestByIdFn(id) {
  const query = `SELECT cr.*, 
    u.username,
    u.profile
    FROM car_requests cr 
    INNER JOIN users u 
    ON cr.user_id = u.user_id
    WHERE cr.id = $1 `

  const values = [id]

  const rows = await executeQuery(query, values)
  return rows[0]
}

// =======================================
// ========= CHANGE CAR REQUEST STATUS ===
// =======================================
export async function DSchangeCarResquestStatusFn(id, status, rejectionReason) {
  const query = `
    UPDATE car_requests
    SET status = $2, rejection_reason = $3
    WHERE id = $1
    RETURNING *
  `
  return await executeQuery(query, [id, status, rejectionReason])
}

// =======================================
// ============== UPDATE REQUEST =========
// =======================================
export const DSupdateCarRequestFn = async (id, data) => {
  if (!data || Object.keys(data).length === 0) {
    throw new Error('No fields provided for update')
  }

  // Allowed fields only
  const allowedFields = [
    'car_name',
    'model',
    'conditions',
    'fuel_type',
    'engine',
    'transmission',
    'color',
    'side',
    'city',
    'phone_number',
    'whatsapp',
    'information',
  ]

  const setClauses = []
  const values = []
  let index = 1

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = $${index}`)
      values.push(value)
      index++
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields provided for update')
  }

  // Add WHERE clause params
  values.push(id)

  const query = `
    UPDATE car_requests
    SET ${setClauses.join(', ')},  updated_at = CURRENT_TIMESTAMP
    WHERE id = $${index}
    RETURNING *;
  `

  return await executeQuery(query, values)
}

// =======================================
// =========== GIVE POST LIKES ===========
// =======================================
export async function DSgivePostLikesFn(postId, numberOfLikes) {
  try {
    const { values, placeholders } = generateLikes(postId, numberOfLikes)

    const query = `INSERT INTO likes (user_id, post_id) VALUES ${placeholders}`
    return await executeQuery(query, values)
  } catch (error) {
    console.error(error)
  }
}

// =======================================
// ============== DELETE REQUEST =========
// =======================================
export const DSdeleteCarRequestFn = async (id) => {
  const query = `DELETE FROM car_requests WHERE id = $1`

  const values = [id]

  return await executeQuery(query, values)
}

// =======================================
// ============== DELETE BANNER =========
// =======================================

export const DSdeleteBannerFn = async (id) => {
  if (!id) throw new Error('Invalid banner id')

  const bannerRows = await executeQuery(
    `SELECT post_id FROM banners WHERE id = $1`,
    [id]
  )
  if (bannerRows.length === 0) {
    throw new Error('Banner not found')
  }
  const postId = bannerRows[0].post_id

  await executeQuery(`DELETE FROM banners WHERE id = $1`, [id])

  await executeQuery(`UPDATE posts SET sponsored = popular WHERE id = $1`, [
    postId,
  ])

  return { success: true }
}

// =======================================
// ============ DELETE LIKES =============
// =======================================
export async function DSdeleteLikesFn(postId, numberOfLikes) {
  const query = `
    DELETE FROM likes
    WHERE ctid IN (
      SELECT ctid
      FROM likes
      WHERE post_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    )
  `
  return await executeQuery(query, [postId, numberOfLikes])
}

export async function DScreateBannerFn(postId) {
  const postData = await executeQuery(
    `SELECT user_id, images FROM posts WHERE id = $1`,
    [postId]
  )

  if (!postData || postData.length === 0) throw new Error('Post not found')

  const { user_id, images } = postData[0]
  const firstImage = Array.isArray(images)
    ? images[0]
    : typeof images === 'string'
      ? images.split(',')[0].trim()
      : null

  const newBanner = await executeQuery(
    `
      INSERT INTO banners (user_id, post_id, image)
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
    [user_id, postId, firstImage]
  )

  await executeQuery(`UPDATE posts SET sponsored = TRUE WHERE id = $1`, [
    postId,
  ])

  return newBanner[0] || null
}

// =======================================
// === SEND NOTIFICATIONS TO DASHBOARD====
// =======================================

export async function GetALlAdminTokensFn() {
  const tokenData = await executeQuery(
    `SELECT token FROM admin_notification_tokens`
  )

  return tokenData
}

export async function createAdminTokenFn(userId, token) {
  const tokenData = await executeQuery(
    `INSERT INTO admin_notification_tokens (admin_id, token)
      VALUES ($1, $2)
      ON CONFLICT (admin_id)
      DO UPDATE SET token = EXCLUDED.token
      RETURNING *
      `,
    [userId, token]
  )
  return tokenData
}
