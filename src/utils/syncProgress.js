const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Convert = require('../models/Convert');

dotenv.config();

const syncConverts = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swa-db';
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB...');

        const converts = await Convert.find({ status: { $nin: ['Completed', 'Unreachable'] } });
        let updateCount = 0;
        const now = new Date();
        const oneDayInMs = 24 * 60 * 60 * 1000;

        for (const convert of converts) {
            const allVisitsDone = convert.followUpVisits.length === 8 && convert.followUpVisits.every(v => v.isCompleted);
            const allMilestonesDone =
                convert.spiritualGrowth.believerClass === 'Completed' &&
                convert.spiritualGrowth.waterBaptism === 'Completed' &&
                convert.spiritualGrowth.workersTraining === 'Completed';

            let newStatus = convert.status;

            if (allVisitsDone && allMilestonesDone) {
                newStatus = 'Completed';
            } else {
                const hasOverdueVisit = convert.followUpVisits.some(v =>
                    !v.isCompleted && v.visitDate && (now - new Date(v.visitDate)) > oneDayInMs
                );
                newStatus = hasOverdueVisit ? 'Inactive' : 'Active';
            }

            if (newStatus !== convert.status) {
                convert.status = newStatus;
                await convert.save();
                updateCount++;
                console.log(`Updated Convert: ${convert.name} to ${newStatus}`);
            }
        }

        console.log(`Sync finished. Total updated: ${updateCount}`);
        process.exit();
    } catch (error) {
        console.error('Error syncing converts:', error.message);
        process.exit(1);
    }
};

syncConverts();
