import {
  createCarRequestFn,
  deleteCarRequestFn,
  getAllCarRequestsFn,
  getAllUserCarRequestsFn,
  getCarRequestByIdFn,
  updateCarRequestFn,
} from '../services/carRequestService.js'
import { sendBulkNotifications } from '../utils/sendAdminNotification.js'

// =======================================
// ============== GET ALL REQUESTS =======
// =======================================
export const getAllCarRequests = async (req, res) => {
  const city = req.query.city || null
  const page = parseInt(req.query?.page) || 1
  const limit = 12
  const offset = (page - 1) * limit

  try {
    const posts = await getAllCarRequestsFn(city, limit, offset)

    res.status(200).json({
      posts,
      nextPage: posts.length < limit ? null : page + 1, // Indicate if more pages exist
    })
  } catch (err) {
    console.error('Error in getAllCarRequests:', err)
    return res.status(500).json({
      message: 'Failed to retrieve car requests (getAllCarRequests)',
    })
  }
}

// =======================================
// ============== GET USER REQUESTS ======
// =======================================
export const getAllUserCarRequests = async (req, res) => {
  const userId = req.query.userId
  const status = req.query.status || 'all'
  const page = parseInt(req.query?.page) || 1
  const limit = 12
  const offset = (page - 1) * limit

  if (!userId) {
    return res
      .status(400)
      .json({ message: 'userId is required (getAllUserCarRequests)' })
  }

  try {
    const posts = await getAllUserCarRequestsFn(userId, status, limit, offset)

    res.status(200).json({
      posts,
      nextPage: posts.length < limit ? null : page + 1, // Indicate if more pages exist
    })
  } catch (err) {
    console.error('Error in getAllUserCarRequests:', err)
    return res.status(500).json({
      message: 'Failed to retrieve car requests (getAllUserCarRequests)',
    })
  }
}

// =======================================
// ============== GET REQUEST BY ID ======
// =======================================
export const getCarRequestById = async (req, res) => {
  const { id } = req.params
  const { userId } = req.query

  if (!id || !userId) {
    return res.status(400).json({
      message: 'Missing required parameters: id and userId (getCarRequestById)',
    })
  }

  try {
    const carRequest = await getCarRequestByIdFn(id, userId)

    if (!carRequest) {
      return res.status(404).json({ message: 'Car request not found' })
    }

    return res.status(200).json(carRequest)
  } catch (error) {
    console.error('Error in getCarRequestById:', error)
    return res.status(500).json({ message: 'Failed to retrieve car request' })
  }
}

// =======================================
// ============== CREATE REQUEST ========
// =======================================
export const createCarRequest = async (req, res) => {
  const data = req.body || {}

  if (!data.user_id || !data.car_name || !data.city) {
    return res.status(400).json({
      message: 'Missing required fields: user_id, car_name, or city',
    })
  }

  try {
    const carRequest = await createCarRequestFn(data)
    // console.log(carRequest)

    if (carRequest) {
      await sendBulkNotifications(carRequest.car_name, carRequest.information)
    }
    return res.status(201).json(carRequest)
  } catch (error) {
    console.error('Error in createCarRequest:', error.stack || error)
    return res.status(500).json({ message: 'Failed to create car request' })
  }
}

// =======================================
// ============== UPDATE REQUEST ========
// =======================================
export const updateCarRequest = async (req, res) => {
  const id = req.params.id
  const userId = req.query.userId
  const data = req.body || {}

  if (!id || !userId) {
    return res.status(400).json({
      message: 'Missing required parameters: id and userId (updateCarRequest)',
    })
  }

  try {
    const updatedCarRequest = await updateCarRequestFn(id, userId, data)

    // console.log(updateCarRequest)

    if (!updatedCarRequest) {
      return res.status(404).json({
        message: 'Car request not found or not authorized to update',
      })
    }

    if (updatedCarRequest) {
      await sendBulkNotifications(
        updatedCarRequest.car_name,
        updatedCarRequest.information
      )
    }

    return res.status(200).json(updatedCarRequest)
  } catch (error) {
    console.error('Error in updateCarRequest:', error.stack || error)
    return res.status(500).json({ message: 'Failed to update car request' })
  }
}

// =======================================
// ============== DELETE REQUEST ========
// =======================================
export const deleteCarRequest = async (req, res) => {
  const id = req.params.id
  const userId = req.query.userId

  if (!id || !userId) {
    return res.status(400).json({
      message: 'Missing required parameters: id and userId (deleteCarRequest)',
    })
  }

  try {
    const deletedCarRequest = await deleteCarRequestFn(id, userId)

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
    console.error('Error in deleteCarRequest:', error.stack || error)
    return res.status(500).json({ message: 'Failed to delete car request' })
  }
}
