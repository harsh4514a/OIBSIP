const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'PizzaHub' },
    contactEmail: { type: String, default: 'contact@pizzahub.com' },
    contactPhone: { type: String, default: '+91 98765 43210' },
    storeAddress: { type: String, default: '123 Pizza Street, Food City, 380001' },
    deliveryFee: { type: Number, default: 49 },
    freeDeliveryThreshold: { type: Number, default: 499 },
    estDeliveryTime: { type: String, default: '30-45 mins' },
    maintenanceMode: { type: Boolean, default: false },
    cashOnDelivery: { type: Boolean, default: true },
    customPizzaBuilder: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
