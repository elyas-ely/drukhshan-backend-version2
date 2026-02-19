import {
  getAllPostsFn,
  getPopularPostsFn,
  getPostByIdFn,
  getSavedPostFn,
  getViewedPostFn,
  getPostsByUserIdFn,
  getFilteredPostFn,
  createPostFn,
  updatePostFn,
  deletePostFn,
  getSearchPostsFn,
  updateSaveFn,
  updateLikeFn,
  updateViewedPostsFn,
  updatePostStatusFn,
  getSponsoredPostsFn,
  getSponsoredFilteredPostFn,
} from '../services/postService.js'
import { logger } from '../utils/logger.js'

// =======================================
// ============== GET ALL POSTS ==========
// =======================================
export const getAllPosts = async (req, res) => {
  const userId = req.query?.userId
  const page = parseInt(req.query?.page) || 1
  const limit = 12
  const offset = (page - 1) * limit

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    const posts = await getAllPostsFn(userId, limit, offset)

    res.status(200).json({
      posts,
      nextPage: posts.length < limit ? null : page + 1,
    })
  } catch (err) {
    console.error('Error in getAllPosts:', err)
    res.status(500).json({ error: 'Failed to retrieve posts' })
  }
}

// =======================================
// ============== GET POPULAR POSTS ==========
// =======================================
export const getPopularPosts = async (req, res) => {
  const userId = req.query?.userId

  if (!userId) throw new Error('User ID is required')

  try {
    const posts = await getPopularPostsFn(userId)

    if (posts.length === 0) {
      return res.status(404).json({ message: 'No posts found' })
    }

    res.status(200).json(posts)
  } catch (err) {
    console.error('Error in getAllPosts:', err)
    res
      .status(500)
      .json({ error: 'Failed to retrieve posts (getPopularPosts)' })
  }
}

// =======================================
// ============== GET POST BY ID =========
// =======================================
export const getPostById = async (req, res) => {
  const postId = req.params?.postId
  const userId = req.query?.userId

  if (!postId || !userId) {
    return res
      .status(400)
      .json({ error: 'Post ID and User ID are required (getPostById)' })
  }

  try {
    const post = await getPostByIdFn(postId, userId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(200).json(post)
  } catch (err) {
    console.error('Error in getPostById:', err)
    res.status(500).json({ error: 'Failed to retrieve post (getPostById)' })
  }
}

// =======================================
// ============== GET SAVED POST =========
// =======================================
export const getSavesPost = async (req, res) => {
  const userId = req.params?.userId
  const page = parseInt(req.query?.page) || 1
  const limit = 12
  const offset = (page - 1) * limit

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    const posts = await getSavedPostFn(userId, limit, offset)

    res.status(200).json({
      posts,
      nextPage: posts.length < limit ? null : page + 1, // Indicate if more pages exist
    })
  } catch (err) {
    console.error('Error in getSavesPost:', err)
    res.status(500).json({ error: 'Failed to retrieve saved posts' })
  }
}

// =======================================
// ============== GET VIEWED POST =========
// =======================================
export const getViewedPost = async (req, res) => {
  const userId = req.params?.userId

  if (!userId) {
    return res.status(400).json({ error: 'User ID are required' })
  }

  try {
    const post = await getViewedPostFn(userId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(200).json(post)
  } catch (err) {
    console.error('Error in getViewedPost:', err)
    res.status(500).json({ error: 'Failed to retrieve post' })
  }
}

// =======================================
// ============= GET SEARCH POSTS ========
// =======================================
export const getSearchPosts = async (req, res) => {
  const { searchTerm } = req.query
  const targetLimit = 10

  try {
    let offset = 0
    const batchSize = 10
    const uniqueMap = new Map()

    while (uniqueMap.size < targetLimit) {
      const posts = await getSearchPostsFn(searchTerm, batchSize, offset)

      if (!posts || posts.length === 0) break // no more results

      for (const post of posts) {
        const key = post.car_name.toLowerCase()
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, post)
          if (uniqueMap.size >= targetLimit) break
        }
      }

      offset += batchSize
    }

    const uniquePosts = Array.from(uniqueMap.values())

    res.status(200).json(uniquePosts)
  } catch (err) {
    console.error('Error in getSearchPosts:', err)
    res.status(500).json({ error: 'Failed to retrieve posts (getSearchPosts)' })
  }
}

// =======================================
// ========= GET FILTERED POSTS ========
// =======================================
export const getFilteredPost = async (req, res) => {
  const userId = req.query?.userId
  const filters = req.query
  const page = parseInt(req.query?.page) || 1
  const limit = 12
  const offset = (page - 1) * limit

  if (!filters?.car_name || !userId) {
    return res
      .status(400)
      .json({ error: 'User ID and car name are required (getFilteredPost)' })
  }

  try {
    const posts = await getFilteredPostFn(filters, userId, limit, offset)

    res.status(200).json({
      posts,
      nextPage: posts.length < limit ? null : page + 1,
    })
  } catch (err) {
    console.error('Error in getFilteredPost:', err)
    res.status(500).json({ error: 'Failed to retrieve filtered posts' })
  }
}

// =======================================
// ========= GET FILTERED POSTS ========
// =======================================
export const getSponsoredFilteredPost = async (req, res) => {
  const userId = req.query?.userId
  const filters = req.query
  const page = parseInt(req.query?.page) || 1
  const limit = 12
  const offset = (page - 1) * limit

  if (!filters?.car_name || !userId) {
    return res.status(400).json({
      error: 'User ID and car name are required (getSponsoredFilteredPost)',
    })
  }

  try {
    const posts = await getSponsoredFilteredPostFn(
      filters,
      userId,
      limit,
      offset
    )

    res.status(200).json({
      posts,
      nextPage: posts.length < limit ? null : page + 1,
    })
  } catch (err) {
    console.error('Error in getSponsoredFilteredPost:', err)
    res.status(500).json({ error: 'Failed to retrieve filtered posts' })
  }
}

// =======================================
// ========= GET POSTS BY USER ID ========
// =======================================
export const getPostsByUserId = async (req, res) => {
  const userId = req.params?.userId
  const myId = req.query?.myId
  const page = parseInt(req.query?.page) || 1
  const limit = 12
  const offset = (page - 1) * limit

  if (!userId || !myId) {
    return res
      .status(400)
      .json({ error: 'User ID and myId are required (getPostsByUserId)' })
  }

  try {
    const posts = await getPostsByUserIdFn(userId, myId, limit, offset)
    if (posts.length === 0) {
      return res.status(404).json({ message: 'No posts found for this user' })
    }
    res.status(200).json({
      posts,
      nextPage: posts.length < limit ? null : page + 1,
    })
  } catch (err) {
    console.error('Error in getPostsByUserId:', err)
    res
      .status(500)
      .json({ error: 'Failed to retrieve user posts (getPostsByUserId)' })
  }
}

// =======================================
// ========= GET SPONSORED POSTS ========
// =======================================
export const getSponsoredPosts = async (req, res) => {
  const { userId, myId } = req.query

  if (!userId || !myId) {
    return res
      .status(400)
      .json({ error: 'User ID is required (getSponsoredPosts)' })
  }

  try {
    const posts = await getSponsoredPostsFn(userId, myId)

    const updatedPosts = posts.map((post) => ({
      ...post,
      images: post.images?.[0] || null,
    }))

    res.status(200).json(updatedPosts)
  } catch (err) {
    console.error('Error in getSponsoredPosts:', err)
    res.status(500).json({ error: 'Failed to retrieve sponsored posts' })
  }
}

// =======================================
// ============== CREATE POST =============
// =======================================
export const createPost = async (req, res) => {
  try {
    const postData = req.body

    if (!postData?.car_name) {
      res.status(400).json({ message: 'post details are required' })
    }

    const newPost = await createPostFn(postData)
    if (!newPost) {
      res.status(400).json({ error: 'Failed to create post' })
    }
    return res.status(201).json({ message: 'new post created' })
  } catch (error) {
    logger.error('Error in createPost:', error)
    res.status(500).json({ error: 'Failed to create post' })
  }
}

// =======================================
// ============== UPDATE POST ============
// =======================================
export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params
    const updateData = { ...req.body }

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`
    }

    const updatedPost = await updatePostFn(postId, updateData)
    res.json(updatedPost)
  } catch (error) {
    logger.error('Error in updatePost:', error)
    res.status(500).json({ error: 'Failed to update post' })
  }
}

// =======================================
// ============== UPDATE SAVE POST =======
// =======================================
export const updateSave = async (req, res) => {
  const userId = req.query?.userId
  const postId = req.params?.postId

  if (!userId || !postId) {
    return res
      .status(400)
      .json({ error: 'Post ID and User ID are required (updateSave)' })
  }

  try {
    const post = await updateSaveFn(userId, postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(200).json({ message: 'post save updated susccesfully ' })
  } catch (err) {
    console.error('Error in getPostById:', err)
    res.status(500).json({ error: 'Failed to retrieve post (getPostById)' })
  }
}

// =======================================
// ============== UPDATE SAVE POST =======
// =======================================
export const updateLike = async (req, res) => {
  const userId = req.query?.userId
  const postId = req.params?.postId

  if (!userId || !postId) {
    return res
      .status(400)
      .json({ error: 'Post ID and User ID are required (updateLike)' })
  }

  try {
    const post = await updateLikeFn(userId, postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(200).json({ message: 'post like updated susccesfully ' })
  } catch (err) {
    console.error('Error in updateLike:', err)
    res.status(500).json({ error: 'Failed to retrieve post (updateLike)' })
  }
}

// =======================================
// ============== UPDATE VIEWED POST =======
// =======================================
export const updateViewedPosts = async (req, res) => {
  const userId = req.query?.userId
  const postId = req.params?.postId

  if (!userId || !postId) {
    return res
      .status(400)
      .json({ error: 'Post ID and User ID are required (updateViewedPosts)' })
  }

  try {
    const post = await updateViewedPostsFn(userId, postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(200).json({ message: 'post viewd updated susccesfully ' })
  } catch (err) {
    console.error('Error in updateViewedPosts:', err)
    res
      .status(500)
      .json({ error: 'Failed to retrieve post (updateViewedPosts)' })
  }
}

export const updatePostStatus = async (req, res) => {
  const userId = req.query?.userId
  const postId = req.params?.postId

  if (!userId || !postId) {
    return res
      .status(400)
      .json({ error: 'Post ID and User ID are required (updatePostStatus)' })
  }

  try {
    const post = await updatePostStatusFn(userId, postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(200).json({ message: 'post status updated susccesfully ' })
  } catch (err) {
    console.error('Error in updatePostStatus:', err)
    res
      .status(500)
      .json({ error: 'Failed to retrieve post (updatePostStatus)' })
  }
}

// =======================================
// ============== DELETE POST ============
// =======================================
export const deletePost = async (req, res) => {
  const postId = req.params?.postId
  const userId = req.query?.userId

  if (!postId || !userId) {
    return res.status(400).json({ error: 'Post ID and User ID are required' })
  }

  try {
    const result = await deletePostFn(postId)
    if (!result) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(204).send()
  } catch (err) {
    console.error('Error in deletePost:', err)
    res.status(500).json({ error: 'Failed to delete post' })
  }
}
