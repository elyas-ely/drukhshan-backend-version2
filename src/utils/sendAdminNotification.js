import fs from 'fs'
import admin from 'firebase-admin'
import { GetALlAdminTokensFn } from '../services/dashboardService.js'
import dotenv from 'dotenv'

dotenv.config()

const isProduction = process.env.NODE_ENV === 'production'
console.log('isProduction:', isProduction)

const firebasePath = isProduction
  ? '/app/firebase-service.json' // VPS path
  : './firebase-service.json' // local dev path

// Initialize Firebase only if file exists and not already initialized
if (fs.existsSync(firebasePath)) {
  console.log('Firebase JSON found, initializing Firebase...')
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(fs.readFileSync(firebasePath, 'utf8'))
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  }
} else {
  console.log('Firebase JSON not found, skipping Firebase initialization.')
}

// // Example function
export const sendBulkNotifications = async (title, body = '') => {
  try {
    const tokensData = await GetALlAdminTokensFn()
    const tokens = tokensData.map((t) => t.token)

    if (!tokens.length || !title) {
      throw new Error('❌ tokens, title, and body are required')
    }

    // console.log(tokens, title, body)

    const message = {
      notification: { title, body },
      tokens,
    }

    // const response = await admin.messaging().sendEachForMulticast(message)
    const response = await admin.messaging().sendEachForMulticast(message)
    response.responses.forEach((res, idx) => {
      if (res.success) {
        // console.log(`✅ Sent to ${tokens[idx]}`)
      } else {
        // console.log(`❌ Failed to ${tokens[idx]}:`, res.error)
      }
    })
    // console.log('Notifications sent')
    return response
  } catch (err) {
    console.log(err)
    throw err
  }
}

// sendBulkNotifications('new', 'body')
