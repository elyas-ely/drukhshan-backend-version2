import { executeQuery } from '../utils/helpingFunctions.js'

// =======================================
// ============== GET ALL REQUESTS =======
// =======================================
export const getAllCarRequestsFn = async (city, limit, offset) => {
  let query = `
    SELECT cr.*, 
           u.username,
           u.profile
      FROM car_requests cr
      INNER JOIN users u ON cr.user_id = u.user_id
    WHERE cr.status = 'approved'
  `

  const values = []

  if (city) {
    query += ` AND cr.city = $1`
    values.push(city)
  }

  // Append ORDER BY, LIMIT, OFFSET for both cases
  query += ` ORDER BY cr.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
  values.push(limit, offset)

  try {
    return await executeQuery(query, values)
  } catch (err) {
    throw err
  }
}

// =======================================
// ============== GET ALL USER REQUESTS ==
// =======================================
export const getAllUserCarRequestsFn = async (
  userId,
  status,
  limit,
  offset
) => {
  // Base query and parameters
  let query = `
    SELECT cr.*, 
           u.username,
           u.profile
      FROM car_requests cr 
      INNER JOIN users u 
        ON cr.user_id = u.user_id
     WHERE cr.user_id = $1
  `

  const values = [userId]

  // Add status filter if status is NOT 'all'
  if (status && status.toLowerCase() !== 'all') {
    query += ` AND cr.status = $2`
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
export const getCarRequestByIdFn = async (id, userId) => {
  const query = `SELECT cr.*, 
    u.username,
    u.profile
    FROM car_requests cr 
    INNER JOIN users u 
    ON cr.user_id = u.user_id
    WHERE cr.id = $1 AND cr.user_id = $2`

  const values = [id, userId]

  const rows = await executeQuery(query, values)
  return rows[0]
}

// =======================================
// ============== CREATE REQUEST =========
// =======================================
export const createCarRequestFn = async (data) => {
  const {
    user_id,
    car_name,
    city,
    phone_number = null,
    whatsapp = null,
    model = null,
    conditions = null,
    fuel_type = null,
    engine = null,
    transmission = null,
    color = null,
    side = null,
    information = null,
  } = data

  const query = `
    INSERT INTO car_requests (
      user_id,
      car_name,
      model,
      conditions,
      fuel_type,
      engine,
      transmission,
      color,
      side,
      city,
      phone_number,
      whatsapp,
      information
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    )
    RETURNING *;
  `

  const values = [
    user_id,
    car_name,
    model,
    conditions,
    fuel_type,
    engine,
    transmission,
    color,
    side,
    city,
    phone_number,
    whatsapp,
    information,
  ]
  const requests = await executeQuery(query, values)

  return requests[0]
}

// =======================================
// ============== UPDATE REQUEST =========
// =======================================
export const updateCarRequestFn = async (id, userId, data) => {
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
  values.push(id, userId)

  const query = `
    UPDATE car_requests
    SET ${setClauses.join(', ')}, status = 'pending', updated_at = CURRENT_TIMESTAMP
    WHERE id = $${index} AND user_id = $${index + 1}
    RETURNING *;
  `

  const requests = await executeQuery(query, values)

  return requests[0]
}

// =======================================
// ============== DELETE REQUEST =========
// =======================================
export const deleteCarRequestFn = async (id, userId) => {
  const query = `DELETE FROM car_requests WHERE id = $1 AND user_id = $2`

  const values = [id, userId]

  return await executeQuery(query, values)
}
