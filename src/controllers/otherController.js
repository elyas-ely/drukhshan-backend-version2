import {
  getAllBannersFn,
  getAllNotificationsFn,
} from '../services/otherService.js'

// =======================================
// ============== GET ALL BANNAERS =======
// =======================================
export const getAllBanners = async (req, res) => {
  try {
    const banners = await getAllBannersFn()
    if (!banners) {
      return res
        .status(404)
        .json({ message: 'banners not found (getAllBannersFn)' })
    }
    res.status(200).json(banners)
  } catch (err) {
    console.error('Error in getAllBannersFn:', err)
    res
      .status(500)
      .json({ error: 'Failed to retrieve banners (getAllBannersFn)' })
  }
}

// =======================================
// ============== GET ALL NOTIFICATIONS =======
// =======================================
export const getAllNotifications = async (req, res) => {
  try {
    const notificaitons = await getAllNotificationsFn()
    if (!notificaitons) {
      return res
        .status(404)
        .json({ message: 'notificaitons not found (getAllNotificationsFn)' })
    }
    res.status(200).json(notificaitons)
  } catch (err) {
    console.error('Error in getAllNotificationsFn:', err)
    res.status(500).json({
      error: 'Failed to retrieve notificaitons (getAllNotificationsFn)',
    })
  }
}

export const getAppConfig = async (req, res) => {
  try {
    const data = {
      android: {
        latestVersion: '1.3.2',
      },
      ios: {
        latestVersion: '1.2.15',
      },
      underWorking: false,
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('Error in getServerData:', err)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve app version',
      error: err.message,
    })
  }
}
