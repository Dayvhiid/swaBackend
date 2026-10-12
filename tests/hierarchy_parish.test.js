const request = require('supertest');
const express = require('express');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Mock User model (used by protect middleware)
jest.mock('../src/models/User', () => ({
    findById: jest.fn()
}));

// Mock jsonwebtoken (used by protect middleware)
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn()
}));

// Mock Hierarchy models (used by the controller)
jest.mock('../src/models/Hierarchy', () => ({
    Area: { findById: jest.fn() },
    Parish: { findOne: jest.fn(), create: jest.fn() },
    Zone: {}
}));

const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const { Area, Parish } = require('../src/models/Hierarchy');
const hierarchyRouter = require('../src/routes/hierarchyRoutes');

const app = express();
app.use(express.json());
app.use('/api/hierarchy', hierarchyRouter);

const mockUser = (role) => {
    User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'user1', role })
    });
};

describe('POST /api/hierarchy/parishes', () => {
    const auth = { Authorization: 'Bearer test-token' };

    beforeEach(() => {
        jest.clearAllMocks();
        jwt.verify.mockReturnValue({ id: 'user1' });
    });

    it('should return 401 without a token', async () => {
        const res = await request(app)
            .post('/api/hierarchy/parishes')
            .send({ name: 'New Parish', areaId: 'area1' });

        expect(res.statusCode).toEqual(401);
    });

    it('should return 403 for zonal_admin (not super_admin)', async () => {
        mockUser('zonal_admin');

        const res = await request(app)
            .post('/api/hierarchy/parishes')
            .set(auth)
            .send({ name: 'New Parish', areaId: 'area1' });

        expect(res.statusCode).toEqual(403);
        expect(Parish.create).not.toHaveBeenCalled();
    });

    it('should return 400 when name is missing', async () => {
        mockUser('super_admin');

        const res = await request(app)
            .post('/api/hierarchy/parishes')
            .set(auth)
            .send({ areaId: 'area1' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Parish name is required.');
    });

    it('should return 404 when area does not exist', async () => {
        mockUser('super_admin');
        Area.findById.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/hierarchy/parishes')
            .set(auth)
            .send({ name: 'New Parish', areaId: 'nonexistent' });

        expect(res.statusCode).toEqual(404);
        expect(res.body.message).toBe('Area not found.');
    });

    it('should return 409 when parish name already exists in the area', async () => {
        mockUser('super_admin');
        Area.findById.mockResolvedValue({ _id: 'area1', name: 'REDEMPTION HOUSE AREA' });
        Parish.findOne.mockResolvedValue({ _id: 'p1', name: 'The Chosen Tribe', areaId: 'area1' });

        const res = await request(app)
            .post('/api/hierarchy/parishes')
            .set(auth)
            .send({ name: 'the chosen tribe', areaId: 'area1' });

        expect(res.statusCode).toEqual(409);
        expect(res.body.message).toBe('A parish with this name already exists in this area.');
        expect(Parish.create).not.toHaveBeenCalled();
    });

    it('should create the parish and return 201 for super_admin', async () => {
        mockUser('super_admin');
        Area.findById.mockResolvedValue({ _id: 'area1', name: 'REDEMPTION HOUSE AREA' });
        Parish.findOne.mockResolvedValue(null);
        Parish.create.mockResolvedValue({ _id: 'p2', name: 'New Parish', areaId: 'area1' });

        const res = await request(app)
            .post('/api/hierarchy/parishes')
            .set(auth)
            .send({ name: '  New Parish  ', areaId: 'area1' });

        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('New Parish');
        expect(Parish.create).toHaveBeenCalledWith({ name: 'New Parish', areaId: 'area1' });
    });
});
