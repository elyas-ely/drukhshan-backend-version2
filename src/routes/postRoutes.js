import express from 'express'

import {
  getAllPosts,
  getPopularPosts,
  getPostById,
  getSavesPost,
  getViewedPost,
  getFilteredPost,
  getPostsByUserId,
  getSearchPosts,
  getSponsoredPosts,
  createPost,
  updatePost,
  deletePost,
  updateSave,
  updateLike,
  updateViewedPosts,
  updatePostStatus,
  getSponsoredFilteredPost,
} from '../controllers/postController.js'

const router = express.Router()

// =======================================
// ============== GET ROUTES =============
// =======================================
router.get('/', getAllPosts)
router.get('/popular', getPopularPosts)
router.get('/sponsored', getSponsoredPosts)
router.get('/search', getSearchPosts)
router.get('/filtered', getFilteredPost)
router.get('/sponsored-filtered', getSponsoredFilteredPost)
router.get('/saves/:userId', getSavesPost)
router.get('/viewed/:userId', getViewedPost)
router.get('/user/:userId', getPostsByUserId)
router.get('/:postId', getPostById)

// =======================================
// ============== POST ROUTES ============
// =======================================
router.post('/', createPost)

// =======================================
// ============== PUT ROUTES =============
// =======================================
router.put('/:postId', updatePost)
router.put('/saves/:postId', updateSave)
router.put('/likes/:postId', updateLike)
router.put('/viewed/:postId', updateViewedPosts)
router.put('/status/:postId', updatePostStatus)

// =======================================
// ============== DELETE ROUTES ==========
// =======================================
router.delete('/:postId', deletePost)

export default router
