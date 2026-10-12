require('dotenv').config();
const mongoose = require('mongoose');
const { Area, Parish } = require('../models/Hierarchy');

const addParish = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swa-db';
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const parishName = process.argv[2];
        const areaName = process.argv[3];

        if (!parishName || !areaName) {
            console.error('Usage: node src/scripts/addParish.js <parishName> <areaName>');
            process.exit(1);
        }

        const area = await Area.findOne({ name: { $regex: `^${areaName.trim()}$`, $options: 'i' } });
        if (!area) {
            console.error(`Area "${areaName}" not found. Available areas:`);
            const areas = await Area.find().select('name');
            areas.forEach(a => console.error(`  - ${a.name}`));
            process.exit(1);
        }

        const existing = await Parish.findOne({
            name: { $regex: `^${parishName.trim()}$`, $options: 'i' },
            areaId: area._id.toString()
        });
        if (existing) {
            console.log(`Parish "${existing.name}" already exists under area "${area.name}". Nothing to do.`);
            await mongoose.disconnect();
            return;
        }

        const parish = await Parish.create({
            name: parishName.trim(),
            areaId: area._id.toString()
        });
        console.log(`Created Parish: ${parish.name} (id: ${parish._id}) under Area: ${area.name}`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

addParish();
