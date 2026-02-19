import {
  createAdminTokenFn,
  DSchangeCarResquestStatusFn,
  DScreateBannerFn,
  DSdeleteBannerFn,
  DSdeleteCarRequestFn,
  DSdeleteLikesFn,
  DSgetAllCarRequestsFn,
  DSgetAllUserCarRequestsFn,
  DSgetAllUsersFn,
  DSgetCarRequestByIdFn,
  DSgetSearchUsersFn,
  DSgivePostLikesFn,
  DSpostToPopularFn,
  DSupdateCarRequestFn,
  DSuserToSellerFn,
} from '../services/dashboardService.js'

// =======================================
// ============== GET ALL USERS =============
// =======================================
export async function DSgetAllUsers(req, res) {
  const searchTerm = req.query?.searchTerm || ''
  const city = req.query?.city || ''
  const page = parseInt(req.query?.page) || 1
  const limit = 15
  const offset = (page - 1) * limit

  try {
    const users = await DSgetAllUsersFn(searchTerm, city, limit, offset)

    res.status(200).json({
      users,
      nextPage: users.length === limit ? page + 1 : null,
    })
  } catch (err) {
    console.error('Error in getAllUsers:', err)
    res.status(500).json({ error: 'Failed to retrieve users' })
  }
}

// =======================================
// =========== GET SEARCH USERS ==========
// =======================================
export async function DSgetSearchUsers(req, res) {
  const searchTerm = req.query?.searchTerm
  try {
    const users = await DSgetSearchUsersFn(searchTerm)
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' })
    }
    res.status(200).json(users)
  } catch (err) {
    console.error('Error in DSgetSearchUsers:', err)
    res.status(500).json({ error: 'Failed to retrieve users' })
  }
}

// =======================================
// ==== UPDATE POST TO POPULAR OR NOT ====
// =======================================
export async function DSpostToPopular(req, res) {
  const postId = req.query?.postId

  if (!postId) {
    return res
      .status(400)
      .json({ message: 'Post ID is required DSpostToPopular' })
  }
  try {
    const post = await DSpostToPopularFn(postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(200).json({ message: 'post updated susccesfully ' })
  } catch (err) {
    console.error('Error in postToPopularFn:', err)
    res.status(500).json({ error: 'Failed to retrieve post (postToPopularFn)' })
  }
}

// =======================================
// ===== UPDATE USER TO SELLER OR NOT ====
// =======================================
export async function DSuserToSeller(req, res) {
  const userId = req.query?.userId

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' })
  }

  try {
    const user = await DSuserToSellerFn(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.status(200).json({ message: 'user updated susccesfully ' })
  } catch (err) {
    console.error('Error in userToSeller:', err)
    res.status(500).json({ error: 'Failed to retrieve user (userToSeller)' })
  }
}

// =======================================
// ========== GET ALL CAR REQUESTS =======
// =======================================
export async function DSgetAllCarRequests(req, res) {
  const city = req.query.city || null

  try {
    const carRequests = await DSgetAllCarRequestsFn(city)

    return res.status(200).json(carRequests)
  } catch (err) {
    console.error('Error in DSgetAllCarRequests:', err)
    return res.status(500).json({
      message: 'Failed to retrieve car requests (DSgetAllCarRequests)',
    })
  }
}

// =======================================
// ============== GET USER REQUESTS ======
// =======================================
export const DSgetAllUserCarRequests = async (req, res) => {
  const { status = 'all' } = req.query
  const page = parseInt(req.query?.page) || 1
  const limit = 12
  const offset = (page - 1) * limit

  try {
    const posts = await DSgetAllUserCarRequestsFn(status, limit, offset)

    res.status(200).json({
      posts,
      nextPage: posts.length < limit ? null : page + 1,
    })
  } catch (err) {
    console.error('Error in DSgetAllUserCarRequests:', err)
    return res.status(500).json({
      message: 'Failed to retrieve car requests (DSgetAllUserCarRequests)',
    })
  }
}

// =======================================
// ======== GET REQUEST BY ID ============
// =======================================
export async function DSgetCarRequestById(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      message: 'Missing required parameters: id (DSgetCarRequestById)',
    })
  }

  try {
    const carRequest = await DSgetCarRequestByIdFn(id)

    if (!carRequest) {
      return res.status(404).json({ message: 'Car request not found' })
    }

    return res.status(200).json(carRequest)
  } catch (error) {
    console.error('Error in DSgetCarRequestById:', error)
    return res.status(500).json({ message: 'Failed to retrieve car request' })
  }
}

// =======================================
// ===== UPDATE USER TO SELLER OR NOT ====
// =======================================
export async function DSchangeCarResquestStatus(req, res) {
  const { id } = req.params
  const { status, rejectionReason = null } = req.query

  if (!id || !status) {
    return res
      .status(400)
      .json({ message: 'Car request post ID or status is required' })
  }

  try {
    const carRequstPost = await DSchangeCarResquestStatusFn(
      id,
      status,
      rejectionReason
    )
    if (!carRequstPost) {
      return res.status(404).json({ message: 'Car post not found' })
    }
    res.status(200).json({ message: 'carRequstPost updated susccesfully ' })
  } catch (err) {
    console.error('Error in carRequstPost:', err)
    res
      .status(500)
      .json({ error: 'Failed to retrieve user (DSchangeCarResquestStatus)' })
  }
}

// =======================================
// ============== UPDATE REQUEST ========
// =======================================
export const DSupdateCarRequest = async (req, res) => {
  const { id } = req.params
  const data = req.body || {}

  if (!id) {
    return res.status(400).json({
      message: 'Missing required parameters: id  (DSupdateCarRequest)',
    })
  }

  try {
    const updatedCarRequest = await DSupdateCarRequestFn(id, data)

    if (!updatedCarRequest) {
      return res.status(404).json({
        message: 'Car request not found or not authorized to update',
      })
    }

    return res.status(200).json(updatedCarRequest)
  } catch (error) {
    console.error('Error in DSupdateCarRequest:', error.stack || error)
    return res.status(500).json({ message: 'Failed to update car request' })
  }
}

// =======================================
// ============ GIVE A POST LIKES ========
// =======================================
export async function DSgivePostLikes(req, res) {
  const postId = Number(req.params?.postId)
  const numberOfLikes = Number(req.query?.likes)

  if (!postId || !numberOfLikes || isNaN(numberOfLikes) || numberOfLikes <= 0) {
    return res
      .status(400)
      .json({ message: 'postId and a valid number of likes are required' })
  }

  try {
    await DSgivePostLikesFn(postId, numberOfLikes)

    res.status(200).json({
      message: `${numberOfLikes} likes added successfully to post ${postId}`,
    })
  } catch (err) {
    console.error('Error in DSgivePostsLikesFn:', err)
    res.status(500).json({
      error: 'Failed to add likes to the post',
    })
  }
}

// =======================================
// ============== DELETE REQUEST =========
// =======================================
export const DSdeleteCarRequest = async (req, res) => {
  const id = req.params.id

  if (!id) {
    return res.status(400).json({
      message:
        'Missing required parameters: id and userId (DSdeleteCarRequest)',
    })
  }

  try {
    const deletedCarRequest = await DSdeleteCarRequestFn(id)

    if (!deletedCarRequest) {
      return res.status(404).json({
        message: 'Car request not found or not authorized to delete',
      })
    }

    return res.status(200).json({
      message: 'Car request deleted successfully',
      data: deletedCarRequest,
    })
  } catch (error) {
    console.error('Error in DSdeleteCarRequest:', error.stack || error)
    return res.status(500).json({ message: 'Failed to delete car request' })
  }
}

// =======================================
// ============== DELETE REQUEST =========
// =======================================
export async function DSdeleteBanner(req, res) {
  const id = req.params.id

  if (!id) {
    return res.status(400).json({
      message: 'Missing required parameters: id and userId (DSdeleteBanner)',
    })
  }

  try {
    const deleteBanner = await DSdeleteBannerFn(id)

    if (!deleteBanner) {
      return res.status(404).json({
        message: 'banner not found or not authorized to delete',
      })
    }

    return res.status(200).json({
      message: 'banner deleted successfully',
      data: deleteBanner,
    })
  } catch (error) {
    console.error('Error in DSdeleteBanner:', error.stack || error)
    return res.status(500).json({ message: 'Failed to delete car request' })
  }
}

// =======================================
// ========= DELETE A POST LIKES =========
// =======================================
export async function DSdeleteLikes(req, res) {
  const postId = Number(req.params?.postId)
  const numberOfLikes = Number(req.query?.likes)

  if (!postId || !numberOfLikes || isNaN(numberOfLikes) || numberOfLikes <= 0) {
    return res
      .status(400)
      .json({ message: 'postId and a valid number of likes are required' })
  }

  try {
    await DSdeleteLikesFn(postId, numberOfLikes)

    res.status(200).json({
      message: `${numberOfLikes} likes deleted successfully to post ${postId}`,
    })
  } catch (err) {
    console.error('Error in DSdeleteLikesFn:', err)
    res.status(500).json({
      error: 'Failed to delete likes to the post',
    })
  }
}

export const DScreateBanner = async (req, res) => {
  const { postId } = req.query

  if (!postId) {
    return res.status(400).json({ message: 'postId is required' })
  }

  try {
    const banner = await DScreateBannerFn(postId)

    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' })
    }

    res.status(200).json(banner)
  } catch (err) {
    console.error('Error updating banner:', err)
    res.status(500).json({ error: 'Failed to update banner' })
  }
}

// export const GetALlAdminTokens = async (req, res) => {
//   try {
//     const data = await GetALlAdminTokensFn()

//     res.status(200).json(data)
//   } catch (err) {
//     console.error('Error updating banner:', err)
//     res.status(500).json({ error: 'Failed to update banner' })
//   }
// }

export const createAdminToken = async (req, res) => {
  const { userId, token } = req.query

  if (!userId || !token) {
    return res.status(400).json({ message: 'userId and token are required' })
  }
  try {
    const tokenData = await createAdminTokenFn(userId, token)

    if (!tokenData) {
      return res.status(404).json({ message: 'tokenData not found' })
    }
    res.status(200).json(tokenData)
  } catch (err) {
    console.error('Error updating tokenData:', err)
    res.status(500).json({ error: 'Failed to update tokenData' })
  }
}
