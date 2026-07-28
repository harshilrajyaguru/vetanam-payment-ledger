import request from 'supertest';
import { createApp } from '../../src/app.js';


describe('GET /health', () => {
  const app = createApp();

  it('returns 200 with success envelope', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.services).toBeDefined();
  });
});
