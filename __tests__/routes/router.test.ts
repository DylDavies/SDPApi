import request from 'supertest';
import express from 'express';
import mainRouter from '../../src/app/routes/router';

// Create a simple express app to test the router in isolation
const app = express();
app.use('/', mainRouter);

describe('Main Router', () => {
    it('should respond with "hello" and a 200 status on GET /', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('hello');
    });
});
