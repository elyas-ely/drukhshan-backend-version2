import express from 'express'
import {
  getAllBanners,
  getAllNotifications,
  getAppConfig,
} from '../controllers/otherController.js'

const router = express.Router()

// =======================================
// ============== GET ROUTES =============
// =======================================
router.get('/banners', getAllBanners)
router.get('/notifications', getAllNotifications)
router.get('/version', getAppConfig)

export default router
