import express from 'express'
import {
  getAllUsers,
  getSearchUsers,
  getUserById,
  getViewedUsers,
  createUser,
  updateUser,
  deleteUser,
  updateViewedUsers,
} from '../controllers/userController.js'

const router = express.Router()

// =======================================
// ============== GET ROUTES =============
// =======================================
router.get('/', getAllUsers)
router.get('/viewed/:userId', getViewedUsers)
router.get('/search', getSearchUsers)
router.get('/:userId', getUserById)

// =======================================
// ============== POST ROUTES ============
// =======================================
router.post('/', createUser)

// =======================================
// ============== PUT ROUTES =============
// =======================================
router.put('/:userId', updateUser)
router.put('/viewed/:otherId', updateViewedUsers)

// =======================================
// ============== DELETE ROUTES ==========
// =======================================
router.delete('/:userId', deleteUser)

export default router
