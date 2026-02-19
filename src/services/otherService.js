import { executeQuery } from '../utils/helpingFunctions.js'

// =======================================
// ============== GET ALL BANNERS ==========
// =======================================
export async function getAllBannersFn() {
  const query = `SELECT b.*, 
    u.username, 
    u.city,
    u.profile
    FROM banners b 
    INNER JOIN users u 
    ON b.user_id = u.user_id
    ORDER BY b.updated_at DESC`

  return await executeQuery(query)
}

export async function getAllNotificationsFn() {
  const query = `SELECT * FROM notifications`
  return await executeQuery(query)
}
