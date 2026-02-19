import {
  getAllUsersFn,
  getUserByIdFn,
  getViewedUsersFn,
  updateUserFn,
  createUserFn,
  deleteUserFn,
  updateViewedUsersFn,
  getSearchUsersFn,
} from '../services/userService.js'

// =======================================
// ============= GET ALL USERS ===========
// =======================================
export const getAllUsers = async (req, res) => {
  const { searchTerm = '', city = '' } = req.query
  const page = parseInt(req.query?.page) || 1
  const limit = 15
  const offset = (page - 1) * limit

  if (!searchTerm) {
    return res.status(400).json({
      message: 'searchTerm is required (getAllUsers)',
    })
  }

  try {
    const users = await getAllUsersFn(searchTerm, city, limit, offset)

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
// ============= GET SEARCH USERS ===========
// =======================================
export const getSearchUsers = async (req, res) => {
  const searchTerm = req.query?.searchTerm

  if (!searchTerm) {
    return res.status(400).json({
      message: 'searchTerm is required (getSearchUsers)',
    })
  }
  try {
    const users = await getSearchUsersFn(searchTerm)

    res.status(200).json(users)
  } catch (err) {
    console.error('Error in getSearchUsers:', err)
    res.status(500).json({ error: 'Failed to retrieve users' })
  }
}

// =======================================
// ============ GET USER BY ID ===========
// =======================================
export const getUserById = async (req, res) => {
  const { userId } = req.params

  if (!userId) {
    return res.status(400).json({ message: 'userId is required (getUserById)' })
  }

  try {
    const user = await getUserByIdFn(userId)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.status(200).json(user)
  } catch (err) {
    console.error('Error in getUserById:', err)
    return res
      .status(500)
      .json({ error: 'Failed to retrieve user (getUserById)' })
  }
}

// =======================================
// ============ GET VIEWED USERS ===========
// =======================================
export const getViewedUsers = async (req, res) => {
  const { userId } = req.params

  if (!userId) {
    return res.status(400).json({
      message: 'userId is required (getViewedUsers)',
    })
  }

  try {
    const viewedUsers = await getViewedUsersFn(userId)
    return res.status(200).json(viewedUsers)
  } catch (err) {
    console.error('Error in getViewedUsers:', err)
    return res.status(500).json({
      error: 'Failed to retrieve users (getViewedUsers)',
    })
  }
}

// =======================================
// ============= CREATE USER =============
// =======================================
export const createUser = async (req, res) => {
  const userData = req.body

  if (!userData || Object.keys(userData).length === 0) {
    return res
      .status(400)
      .json({ message: 'User data is required (createUser)' })
  }

  try {
    await createUserFn(userData)
    res.status(201).json({ message: 'User created successfully' })
  } catch (err) {
    console.error('Error in createUser:', err)
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ error: 'User with this email already exists, try another one' })
    }
    res.status(500).json({ error: 'Failed to create user' })
  }
}

// =======================================
// ============= UPDATE USER =============
// =======================================
export const updateUser = async (req, res) => {
  const userId = req.params?.userId
  const userData = req.body

  if (!userId) throw new Error('User ID is required')

  try {
    await updateUserFn(userId, userData)
    res.status(200).json({ message: 'User updated successfully' })
  } catch (err) {
    console.error('Error in updateUser:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
}

// =======================================
// ============== UPDATE VIEWED USERS =======
// =======================================
export const updateViewedUsers = async (req, res) => {
  const userId = req.query?.userId
  const otherId = req.params?.otherId

  if (!userId || !otherId) {
    return res
      .status(400)
      .json({ error: 'Post ID and User ID are required (updateViewedUsers)' })
  }

  try {
    const post = await updateViewedUsersFn(userId, otherId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.status(200).json({ message: 'User viewd updated susccesfully ' })
  } catch (err) {
    console.error('Error in updateViewedUsers:', err)
    res
      .status(500)
      .json({ error: 'Failed to retrieve post (updateViewedUsers)' })
  }
}

// =======================================
// ============= DELETE USER =============
// =======================================
export const deleteUser = async (req, res) => {
  const { userId } = req.params

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required for deletion.' })
  }

  try {
    const deleted = await deleteUserFn(userId)

    // Optional: handle case if user doesn't exist
    if (!deleted) {
      return res
        .status(404)
        .json({ message: `User with ID ${userId} not found.` })
    }

    return res.status(204).send() // No content on success
  } catch (error) {
    console.error(`Failed to delete user ${userId}:`, error)
    return res
      .status(500)
      .json({ error: 'Internal server error while deleting user.' })
  }
}
