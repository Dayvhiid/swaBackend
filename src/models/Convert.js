const mongoose = require('mongoose');

const followUpVisitSchema = new mongoose.Schema({
    visitNumber: { type: Number, min: 1, max: 8, required: true },
    title: { type: String, required: true },
    visitDate: { type: Date }, // This is the SCHEDULED date
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date } // This is when it was actually done
});

const convertSchema = new mongoose.Schema({
    soulWinnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parishId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    whatsapp: { type: String },
    houseAddress: { type: String },
    dateBornAgain: { type: Date },
    ageGroup: {
        type: String,
        enum: ['Children', 'Teenagers', 'YAYA', 'Adults', 'Elders']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female']
    },
    maritalStatus: {
        type: String,
        enum: ['Single', 'Married', 'Divorced', 'Widowed']
    },
    career: String,
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Completed', 'Unreachable'],
        default: 'Active'
    },
    followUpVisits: [followUpVisitSchema],
    spiritualGrowth: {
        believerClass: { type: String, enum: ['NotStarted', 'InProgress', 'Completed'], default: 'NotStarted' },
        waterBaptism: { type: String, enum: ['NotStarted', 'InProgress', 'Completed'], default: 'NotStarted' },
        workersTraining: { type: String, enum: ['NotStarted', 'InProgress', 'Completed'], default: 'NotStarted' }
    },
    createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to initialize follow-up visits and auto-update status
convertSchema.pre('save', async function () {
    const now = new Date();

    // Initialize default visits with daily schedule for new converts
    if (this.isNew && (!this.followUpVisits || this.followUpVisits.length === 0)) {
        const titles = [
            'Welcome & Introduction',
            'Assurance of Salvation',
            'The New Birth',
            'The Word of God',
            'Prayer',
            'The Holy Spirit',
            'Water Baptism',
            'Church & Fellowship'
        ];

        this.followUpVisits = titles.map((title, index) => {
            const scheduledDate = new Date();
            scheduledDate.setDate(now.getDate() + (index * 7)); // Weekly intervals
            scheduledDate.setHours(9, 0, 0, 0); // Set to 9 AM for consistency

            return {
                visitNumber: index + 1,
                title: `Visit ${index + 1}: ${title}`,
                visitDate: scheduledDate,
                isCompleted: false
            };
        });
    }

    // Auto-update status logic
    const allVisitsDone = this.followUpVisits.length === 8 && this.followUpVisits.every(v => v.isCompleted);
    const allMilestonesDone =
        this.spiritualGrowth.believerClass === 'Completed' &&
        this.spiritualGrowth.waterBaptism === 'Completed' &&
        this.spiritualGrowth.workersTraining === 'Completed';

    if (allVisitsDone && allMilestonesDone) {
        this.status = 'Completed';
    } else {
        // Only check Active/Inactive if not already Unreachable or Completed
        if (this.status !== 'Completed' && this.status !== 'Unreachable') {
            // Check for overdue visits (more than 1 day overdue)
            const oneDayInMs = 24 * 60 * 60 * 1000;
            const hasOverdueVisit = this.followUpVisits.some(v =>
                !v.isCompleted && v.visitDate && (now - new Date(v.visitDate)) > oneDayInMs
            );

            this.status = hasOverdueVisit ? 'Inactive' : 'Active';
        }
    }
});

// Virtual for Stage calculation (as per business logic in imp.md)
convertSchema.virtual('stage').get(function () {
    const completedVisits = this.followUpVisits.filter(v => v.isCompleted).length;

    if (completedVisits < 8) {
        return `Visit ${completedVisits + 1} of 8`;
    }

    if (completedVisits === 8 && this.spiritualGrowth.believerClass !== 'Completed') {
        return 'Believers Class';
    }

    if (this.spiritualGrowth.believerClass === 'Completed') {
        return 'Follow-up Completed';
    }

    return 'Unknown';
});

// Ensure virtuals are serialized
convertSchema.set('toJSON', { virtuals: true });
convertSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Convert', convertSchema);
