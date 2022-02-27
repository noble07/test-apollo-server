import mongoose from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator'

const schema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 5
  },
  phone: {
    type: String,
    minlength: 5
  },
  street: {
    type: String,
    required: true,
    minlenght: 5
  },
  city: {
    type: String,
    required: true,
    minlenght: 5
  }
})

schema.plugin(uniqueValidator)

export default mongoose.model('Person', schema)