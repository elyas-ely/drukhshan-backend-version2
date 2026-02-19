import { client } from '../config/db.js'
import { executeQuery } from '../utils/helpingFunctions.js'
// =======================================
// ============== GET ALL POSTS ==========
// =======================================
export const getAllPostsFn = async (userId, limit = 12, offset = 0) => {
  const query = `SELECT 
    posts.*, 
    u.username, 
    u.profile, 
    u.city,
    (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = posts.id) AS likes_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $1 AND l.post_id = posts.id)::BOOLEAN AS like_status,
    EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $1 AND s.post_id = posts.id)::BOOLEAN AS save_status
  FROM posts
  INNER JOIN users u ON posts.user_id = u.user_id
  ORDER BY posts.created_at DESC
  LIMIT $2 OFFSET $3`

  return await executeQuery(query, [userId, limit, offset])
}

// =======================================
// ============== GET POPULAR POSTS ======
// =======================================
export const getPopularPostsFn = async (userId) => {
  const query = `SELECT 
    posts.*, 
    (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = posts.id) AS likes_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $1 AND l.post_id = posts.id) AS like_status,
    EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $1 AND s.post_id = posts.id) AS save_status
  FROM posts
  WHERE posts.popular = true
  ORDER BY posts.created_at DESC`

  return await executeQuery(query, [userId])
}

// =======================================
// ============== GET POST BY ID =========
// =======================================
export const getPostByIdFn = async (postId, userId) => {
  const query = `
    SELECT 
      p.*, 
      u.username, 
      u.profile, 
      u.city,
      u.whatsapp,
      u.phone_number1,
      (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = p.id) AS likes_count,
      EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $2 AND l.post_id = p.id) AS like_status,
      EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $2 AND s.post_id = p.id) AS save_status
    FROM posts p
    INNER JOIN users u ON u.user_id = p.user_id
    WHERE p.id = $1`

  const rows = await executeQuery(query, [postId, userId])
  return rows[0]
}

// =======================================
// ============== GET SAVED BY ID =========
// =======================================
export const getSavedPostFn = async (userId, limit, offset) => {
  const query = `SELECT 
    p.*, 
    (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = p.id) AS likes_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $1 AND l.post_id = p.id)::BOOLEAN AS like_status,
    EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $1 AND s.post_id = p.id)::BOOLEAN AS save_status
  FROM posts p
  JOIN saves s ON p.id = s.post_id
  WHERE s.user_id = $1
  ORDER BY s.created_at DESC
  LIMIT $2 OFFSET $3;`

  return await executeQuery(query, [userId, limit, offset])
}

// =======================================
// ============== GET POST BY ID =========
// =======================================
export const getViewedPostFn = async (userId) => {
  const query = `SELECT 
    p.*, 
    (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = p.id) AS likes_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $1 AND l.post_id = p.id)::BOOLEAN AS like_status,
    EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $1 AND s.post_id = p.id)::BOOLEAN AS save_status
  FROM posts p
  JOIN viewed_posts v ON p.id = v.post_id  -- Join with viewed_posts instead of saves
  WHERE v.user_id = $1  -- Filter by user_id for the viewed posts
  ORDER BY v.created_at DESC;`

  return await executeQuery(query, [userId])
}

// =======================================
// ============ GET SEARCH POSTS ============
// =======================================
export const getSearchPostsFn = async (searchTerm, limit, offset = 0) => {
  if (!searchTerm || !String(searchTerm).trim()) {
    return []
  }

  const query = `
    WITH ts AS (
      -- build a prefix tsquery: "toyota corolla" -> "toyota:* & corolla:*"
      SELECT
        id,
        car_name,
        to_tsquery(
          'simple',
          regexp_replace(trim(unaccent($1)), '\\s+', ':* & ', 'g') || ':*'
        ) AS tsq
      FROM posts
      WHERE sold_out IS NOT TRUE
    ),
    scored AS (
      SELECT
        id,
        car_name,
        -- eligibility filter
        (
          to_tsvector('simple', unaccent(car_name)) @@ ts.tsq
          OR unaccent(car_name) ILIKE '%' || unaccent($1) || '%'
          OR similarity(unaccent(car_name), unaccent($1)) > 0.15
        ) AS matches,
        -- features
        (car_name = $1) AS exact_cs,
        (LOWER(unaccent(car_name)) = LOWER(unaccent($1))) AS exact_ci,
        (unaccent(car_name) ILIKE unaccent($1) || '%') AS prefix,
        POSITION(unaccent($1) IN unaccent(car_name)) AS substr_pos,
        ts_rank_cd(to_tsvector('simple', unaccent(car_name)), ts.tsq) AS ts_rank,
        similarity(unaccent(car_name), unaccent($1)) AS tri_sim,
        ABS(LENGTH(car_name) - LENGTH($1)) AS len_diff
      FROM ts
    ),
    eligible AS (
      SELECT * FROM scored WHERE matches
    ),
    dedup AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(car_name)
          ORDER BY
            (exact_cs)::int DESC,
            (exact_ci)::int DESC,
            (prefix)::int DESC,
            CASE WHEN substr_pos > 0 THEN 1 ELSE 0 END DESC,
            ts_rank DESC,
            tri_sim DESC,
            len_diff ASC,
            car_name ASC
        ) AS rn
      FROM eligible
    )
    SELECT
      id,
      car_name
    FROM dedup
    WHERE rn = 1
    ORDER BY
      (exact_cs)::int DESC,
      (exact_ci)::int DESC,
      (prefix)::int DESC,
      CASE WHEN substr_pos > 0 THEN 1 ELSE 0 END DESC,
      ts_rank DESC,
      tri_sim DESC,
      len_diff ASC,
      car_name ASC
    LIMIT $2 OFFSET $3;
  `

  return await executeQuery(query, [searchTerm, limit, offset])
}

// =======================================
// ============== GET FILTERED POST  =====
// =======================================
export const getFilteredPostFn = async (filters, userId, limit, offset) => {
  try {
    const queryParts = []
    const queryParams = [userId] // $1

    let searchTermIndex = null

    const filterConditions = {
      car_name: (value) => {
        // Save search term index for later reuse in ORDER BY
        const paramIndex = queryParams.push(value) // unaccented searchTerm
        searchTermIndex = paramIndex

        // Add similarity and hybrid match conditions
        return `
          (
            similarity(unaccent(car_name), unaccent($${paramIndex})) > 0.15
            OR to_tsvector('simple', unaccent(car_name)) @@ plainto_tsquery('simple', unaccent($${paramIndex}))
            OR car_name ILIKE '%' || $${paramIndex} || '%'
          )
        `
      },
      conditions: (value) => `conditions = $${queryParams.push(value)}`,
      color: (value) => `color = $${queryParams.push(value)}`,
      engine: (value) => `engine = $${queryParams.push(value)}`,
      fuel_type: (value) => `fuel_type = $${queryParams.push(value)}`,
      model: (value) => `model = $${queryParams.push(value)}`,
      minPrice: (value) => `price >= $${queryParams.push(value)}`,
      maxPrice: (value) => `price <= $${queryParams.push(value)}`,
      side: (value) => `side = $${queryParams.push(value)}`,
      transmission: (value) => `transmission = $${queryParams.push(value)}`,
      city: (value) => `u.city = $${queryParams.push(value)}`,
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (filterConditions[key] && value !== undefined && value !== '') {
        queryParts.push(filterConditions[key](value))
      }
    })

    queryParts.push(`posts.sold_out IS NOT TRUE`)
    if (queryParts.length === 0) {
      console.log('No valid filters applied, returning empty array.')
      return []
    }

    const limitIdx = queryParams.push(limit)
    const offsetIdx = queryParams.push(offset)

    const query = `
      SELECT posts.*,
        (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = posts.id) AS likes_count,
        EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $1 AND l.post_id = posts.id)::BOOLEAN AS like_status,
        EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $1 AND s.post_id = posts.id)::BOOLEAN AS save_status
      FROM posts
      JOIN users u ON posts.user_id = u.user_id
      WHERE ${queryParts.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN car_name ILIKE $${searchTermIndex} || '%' THEN 1
          WHEN to_tsvector('simple', unaccent(car_name)) @@ plainto_tsquery('simple', unaccent($${searchTermIndex})) THEN 2
          WHEN similarity(unaccent(car_name), unaccent($${searchTermIndex})) > 0.15 THEN 3
          ELSE 4
        END,
        car_name ASC,
        created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `

    return await executeQuery(query, queryParams)
  } catch (error) {
    console.error('Error fetching filtered posts:', error)
    throw new Error(`Failed to fetch filtered posts: ${error.message}`)
  }
}

// =======================================
// ============== GET FILTERED POST  =====
// =======================================
export const getSponsoredFilteredPostFn = async (
  filters,
  userId,
  limit,
  offset
) => {
  try {
    const queryParts = []
    const queryParams = [userId] // $1

    let searchTermIndex = null

    const filterConditions = {
      car_name: (value) => {
        // Save search term index for later reuse in ORDER BY
        const paramIndex = queryParams.push(value) // unaccented searchTerm
        searchTermIndex = paramIndex

        // Add similarity and hybrid match conditions
        return `
          (
            similarity(unaccent(car_name), unaccent($${paramIndex})) > 0.15
            OR to_tsvector('simple', unaccent(car_name)) @@ plainto_tsquery('simple', unaccent($${paramIndex}))
            OR car_name ILIKE '%' || $${paramIndex} || '%'
          )
        `
      },
      conditions: (value) => `conditions = $${queryParams.push(value)}`,
      color: (value) => `color = $${queryParams.push(value)}`,
      engine: (value) => `engine = $${queryParams.push(value)}`,
      fuel_type: (value) => `fuel_type = $${queryParams.push(value)}`,
      model: (value) => `model = $${queryParams.push(value)}`,
      minPrice: (value) => `price >= $${queryParams.push(value)}`,
      maxPrice: (value) => `price <= $${queryParams.push(value)}`,
      side: (value) => `side = $${queryParams.push(value)}`,
      transmission: (value) => `transmission = $${queryParams.push(value)}`,
      city: (value) => `u.city = $${queryParams.push(value)}`,
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (filterConditions[key] && value !== undefined && value !== '') {
        queryParts.push(filterConditions[key](value))
      }
    })

    queryParts.push(`posts.sold_out = FALSE AND posts.sponsored = TRUE`)
    if (queryParts.length === 0) {
      console.log('No valid filters applied, returning empty array.')
      return []
    }

    const limitIdx = queryParams.push(limit)
    const offsetIdx = queryParams.push(offset)

    const query = `
      SELECT posts.*,
        (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = posts.id) AS likes_count,
        EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $1 AND l.post_id = posts.id)::BOOLEAN AS like_status,
        EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $1 AND s.post_id = posts.id)::BOOLEAN AS save_status
      FROM posts
      JOIN users u ON posts.user_id = u.user_id
      WHERE ${queryParts.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN car_name ILIKE $${searchTermIndex} || '%' THEN 1
          WHEN to_tsvector('simple', unaccent(car_name)) @@ plainto_tsquery('simple', unaccent($${searchTermIndex})) THEN 2
          WHEN similarity(unaccent(car_name), unaccent($${searchTermIndex})) > 0.15 THEN 3
          ELSE 4
        END,
        car_name ASC,
        created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `

    return await executeQuery(query, queryParams)
  } catch (error) {
    console.error('Error fetching filtered posts:', error)
    throw new Error(`Failed to fetch filtered posts: ${error.message}`)
  }
}
// =======================================
// ========= GET POSTS BY USER ID ========
// =======================================
export const getPostsByUserIdFn = async (userId, myId, limit, offset) => {
  const query = `SELECT 
    p.*, 
    (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = p.id) AS likes_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $2 AND l.post_id = p.id)::BOOLEAN AS like_status,
    EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $2 AND s.post_id = p.id)::BOOLEAN AS save_status
  FROM posts p
  JOIN users u ON p.user_id = u.user_id
  WHERE p.user_id = $1
  ORDER BY p.created_at DESC
  LIMIT $3 OFFSET $4`

  return await executeQuery(query, [userId, myId, limit, offset])
}

// =======================================
// ========= GET SPONSORED POSTS ========
// =======================================
export const getSponsoredPostsFn = async (userId, myId) => {
  const query = `SELECT 
    p.*,
    u.username,
    u.profile,
    u.city,
    (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = p.id) AS likes_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $2 AND l.post_id = p.id)::BOOLEAN AS like_status,
    EXISTS (SELECT 1 FROM saves s WHERE s.user_id = $2 AND s.post_id = p.id)::BOOLEAN AS save_status
  FROM posts p
  JOIN users u ON p.user_id = u.user_id
  WHERE p.sponsored = true AND p.user_id = $1
  ORDER BY p.created_at DESC`
  return await executeQuery(query, [userId, myId])
}

// =======================================
// ============== CREATE POST ============
// =======================================
export const createPostFn = async (postData) => {
  const {
    car_name,
    price,
    model,
    transmission,
    fuel_type,
    color,
    information,
    userId,
    conditions = null,
    engine = null,
    side = null,
    popular = false,
    images = [],
  } = postData

  const connection = await client.connect()
  try {
    await connection.query('BEGIN')

    const insertPostQuery = `
      INSERT INTO posts (
        car_name,
        price,
        model,
        transmission,
        fuel_type,
        color,
        information,
        conditions,
        engine,
        popular,
        side,
        images,
        user_id 
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`

    const postValues = [
      car_name,
      price,
      model,
      transmission,
      fuel_type,
      color,
      information,
      conditions,
      engine,
      popular,
      side,
      images,
      userId,
    ]

    const result = await connection.query(insertPostQuery, postValues)
    await connection.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}

// =======================================
// ============== UPDATE POST ============
// =======================================
export const updatePostFn = async (postId, postData) => {
  const connection = await client.connect()
  try {
    await connection.query('BEGIN')

    const setClauses = []
    const values = []
    let paramCount = 1

    // Iterate over the keys in postData
    Object.entries(postData).forEach(([key, value]) => {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    })

    // If no fields are provided to update, return early
    if (setClauses.length === 0) {
      throw new Error('No fields provided to update.')
    }

    // Add the postId as the last value for the WHERE clause
    values.push(postId)

    // Construct the SQL query dynamically
    const query = `
      UPDATE posts
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *`

    const result = await connection.query(query, values)
    await connection.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}

// =======================================
// ============== UPDATE SAVE POST =======
// =======================================
export const updateSaveFn = async (userId, postId) => {
  const connection = await client.connect()
  try {
    await connection.query('BEGIN')

    // Check if the post is already saved
    const { rows } = await connection.query(
      `SELECT * FROM saves WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    )

    let result
    if (rows.length > 0) {
      // If already saved, delete it
      await connection.query(
        `DELETE FROM saves WHERE user_id = $1 AND post_id = $2`,
        [userId, postId]
      )
      result = { status: 'unsaved' }
    } else {
      // If not saved, save it
      await connection.query(
        `INSERT INTO saves (user_id, post_id) VALUES ($1, $2) RETURNING *`,
        [userId, postId]
      )
      result = { status: 'saved' }
    }

    await connection.query('COMMIT')
    return result
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}

// =======================================
// ============== UPDATE LIKE POST =======
// =======================================
export const updateLikeFn = async (userId, postId) => {
  const connection = await client.connect()
  try {
    await connection.query('BEGIN')

    // Check if the post is already liked
    const { rows } = await connection.query(
      `SELECT * FROM likes WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    )

    let result
    if (rows.length > 0) {
      // If already liked, delete it
      await connection.query(
        `DELETE FROM likes WHERE user_id = $1 AND post_id = $2`,
        [userId, postId]
      )
      result = { status: 'unliked' }
    } else {
      // If not liked, like it
      await connection.query(
        `INSERT INTO likes (user_id, post_id) VALUES ($1, $2) RETURNING *`,
        [userId, postId]
      )
      result = { status: 'liked' }
    }

    await connection.query('COMMIT')
    return result
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}

// =======================================
// ============== UPDATE VIEWED POST =====
// =======================================
export const updateViewedPostsFn = async (userId, postId) => {
  const connection = await client.connect()
  try {
    await connection.query('BEGIN')

    // Check if the post is already viewed
    const { rows } = await connection.query(
      `SELECT * FROM viewed_posts WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    )

    if (rows.length > 0) {
      // If already viewed, update the timestamp
      await connection.query(
        `UPDATE viewed_posts SET created_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND post_id = $2`,
        [userId, postId]
      )
    } else {
      // Insert the new viewed post
      await connection.query(
        `INSERT INTO viewed_posts (user_id, post_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [userId, postId]
      )
    }

    // Ensure the user has a maximum of 5 viewed posts
    await connection.query(
      `DELETE FROM viewed_posts 
       WHERE user_id = $1 
       AND post_id NOT IN (
         SELECT post_id 
         FROM viewed_posts 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5
       )`,
      [userId]
    )

    await connection.query('COMMIT')
    return { status: rows.length > 0 ? 'updated' : 'viewed' }
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}

// =======================================
// ============== DELETE POST ============
// =======================================
export const deletePostFn = async (postId) => {
  const connection = await client.connect()
  try {
    await connection.query('BEGIN')

    // Delete the post
    const result = await connection.query(
      'DELETE FROM posts WHERE id = $1 RETURNING *',
      [postId]
    )

    await connection.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}

// =======================================
// ============== UPDATE POST STATUS =====
// =======================================
export const updatePostStatusFn = async (userId, postId) => {
  const connection = await client.connect()
  try {
    await connection.query('BEGIN')

    const result = await connection.query(
      'UPDATE posts SET sold_out = NOT sold_out WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, postId]
    )

    if (result.rowCount === 0) {
      throw new Error('Post not found or unauthorized')
    }

    await connection.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}
