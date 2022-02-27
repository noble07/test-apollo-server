import mongoose from 'mongoose'

const MONGODB_URI = `URI_DE_MONGO`

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB')
})
.catch(error => {
  console.log(`Error connection to MongoDB ${error}`)
})