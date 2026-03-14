const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock User model
jest.mock('../src/models/User', () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    VALID_ROLES: ['soul_winner', 'parish_admin', 'area_admin', 'zonal_admin', 'super_admin']
}));

const User = require('../src/models/User');
const authRouter = require('../src/routes/auth');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);

describe('Signup Error Messages', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return helpful password validation messages', async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123', // Missing uppercase
                role: 'soul_winner'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.errors).toBeDefined();
        const upperCaseError = res.body.errors.find(e => e.msg === 'Please add at least one uppercase letter to your password combination');
        expect(upperCaseError).toBeDefined();
        expect(upperCaseError.path).toBe('password');
    });

    it('should return unified error format for existing user', async () => {
        User.findOne.mockResolvedValue({ email: 'existing@example.com' });

        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Existing User',
                email: 'existing@example.com',
                password: 'Password123',
                role: 'soul_winner'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].msg).toBe('User already exists');
        expect(res.body.errors[0].path).toBe('email');
        expect(res.body.errors[0].type).toBe('field');
    });

    it('should return unified error format for server errors', async () => {
        User.findOne.mockRejectedValue(new Error('Database connection failed'));

        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password123',
                role: 'soul_winner'
            });

        expect(res.statusCode).toEqual(500);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].type).toBe('server');
        expect(res.body.errors[0].msg).toBe('Database connection failed');
    });
});
