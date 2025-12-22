const mongoose = require('mongoose')

const serviceItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  itemId: {
    type: String,
    required: true,
    unique: true
  },
  service: {
    type: String,
    required: true,
    enum: ['wash_fold', 'wash_iron', 'premium_laundry', 'dry_clean', 'steam_press', 'starching', 'premium_steam_press', 'premium_dry_clean', 'alteration']
  },
  category: {
    type: String,
    required: true,
    enum: ['men', 'women', 'kids', 'household', 'institutional', 'others']
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// Indexes
serviceItemSchema.index({ service: 1, isActive: 1 })
serviceItemSchema.index({ itemId: 1 })
serviceItemSchema.index({ category: 1 })

module.exports = mongoose.model('ServiceItem', serviceItemSchema)
