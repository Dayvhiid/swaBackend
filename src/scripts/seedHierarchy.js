require('dotenv').config();
const mongoose = require('mongoose');
const { Zone, Area, Parish } = require('../models/Hierarchy');

const hierarchyData = {
    zoneName: 'REDEMPTION HOUSE ZONE',
    areas: [
        {
            name: 'REDEMPTION HOUSE AREA',
            parishes: [
                'REDEMPTION HOUSE',
                'FULFILLED EXPECTATIONS',
                'OASIS',
                'LIGHT HOUSE',
                'THE COVENANT PLACE'
            ]
        },
        {
            name: 'HOUSE OF REFUGE AREA',
            parishes: [
                'HOUSE OF REFUGE',
                'MOUNTAIN TOP',
                'POTTERS HOUSE'
            ]
        },
        {
            name: 'WONDERLAND AREA',
            parishes: [
                'WONDERLAND',
                'CENTRE OF MERCY',
                'HOPE OF GLORY'
            ]
        },
        {
            name: 'RIVERS OF LIVING WATER AREA',
            parishes: [
                'RIVERS OF LIVING WATER',
                'CHAPEL OF FAITH',
                'HOPE CENTER'
            ]
        },
        {
            name: 'GLORY HOUSE AREA',
            parishes: [
                'GLORY HOUSE',
                'FIRST FRUIT ASSEMBLY',
                'FRUIT OF LIFE ASSEMBLY'
            ]
        }
    ]
};

const seedHierarchy = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swa-db';
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing hierarchy (Optional - comment out if you want to keep existing data)
        await Zone.deleteMany({});
        await Area.deleteMany({});
        await Parish.deleteMany({});
        console.log('Cleared existing hierarchy data');

        // Create Zone
        const zone = await Zone.create({ name: hierarchyData.zoneName });
        console.log(`Created Zone: ${zone.name}`);

        // Create Areas and Parishes
        for (const areaData of hierarchyData.areas) {
            const area = await Area.create({
                name: areaData.name,
                zoneId: zone._id
            });
            console.log(`  Created Area: ${area.name}`);

            for (const parishName of areaData.parishes) {
                await Parish.create({
                    name: parishName,
                    areaId: area._id
                });
                console.log(`    Created Parish: ${parishName}`);
            }
        }

        console.log('\nHierarchy seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding hierarchy:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

seedHierarchy();
