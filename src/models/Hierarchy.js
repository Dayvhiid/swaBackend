const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const areaSchema = new mongoose.Schema({
    name: { type: String, required: true },
    zoneId: { type: String, required: true },
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const parishSchema = new mongoose.Schema({
    name: { type: String, required: true },
    areaId: { type: String, required: true },
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const Zone = mongoose.model('Zone', zoneSchema);
const Area = mongoose.model('Area', areaSchema);
const Parish = mongoose.model('Parish', parishSchema);

module.exports = { Zone, Area, Parish };
