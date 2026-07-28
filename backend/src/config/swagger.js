import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Distributed Payment Ledger API',
    version: '1.0.0',
    description: 'Double-entry monetary ledger API with JWT authentication, idempotency, BullMQ queues, risk scoring, and admin controls.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base Path',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
          password: { type: 'string', example: 'Password123!' },
          role: { type: 'string', enum: ['user', 'admin'], default: 'user' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
          password: { type: 'string', example: 'Password123!' },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
        },
      },
      TransferRequest: {
        type: 'object',
        required: ['receiverAccountId', 'amount'],
        properties: {
          receiverAccountId: { type: 'string', example: '60c72b2f9b1d8b001f8e4a1b' },
          amount: { type: 'integer', example: 1000, description: 'Amount in minor units (e.g. 1000 = 10.00 INR)' },
          currency: { type: 'string', example: 'INR', default: 'INR' },
          description: { type: 'string', example: 'Payment for dinner' },
          idempotencyKey: { type: 'string', example: 'ik_550e8400-e29b-41d4-a716-446655440000' },
        },
      },
      ReviewRequest: {
        type: 'object',
        required: ['decision'],
        properties: {
          decision: { type: 'string', enum: ['approve', 'reject'], example: 'approve' },
        },
      },
      FreezeRequest: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['freeze', 'unfreeze'], example: 'freeze' },
        },
      },
      ErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Request validation failed' },
              requestId: { type: 'string', example: 'req_12345' },
              timestamp: { type: 'string', example: '2026-07-28T10:00:00Z' },
              details: { type: 'object' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        tags: ['Health'],
        responses: { '200': { description: 'Health status summary' } },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          '201': { description: 'User successfully created' },
          '400': { description: 'Validation error or duplicate email' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user credentials',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'JWT access and refresh tokens returned' },
          '401': { description: 'Invalid credentials' },
          '403': { description: 'Account frozen' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate refresh token and issue new access token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } },
        },
        responses: {
          '200': { description: 'New access and refresh tokens issued' },
          '401': { description: 'Refresh token expired or revoked' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Revoke refresh session',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Session revoked successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/accounts/me': {
      get: {
        summary: 'Get current user wallet account details and balance',
        tags: ['Accounts'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Wallet account profile and balance' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/transactions': {
      post: {
        summary: 'Initiate a money transfer',
        tags: ['Transactions'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferRequest' } } },
        },
        responses: {
          '200': { description: 'Transfer completed or flagged' },
          '403': { description: 'Account frozen or fraud blocked' },
          '409': { description: 'Insufficient funds' },
        },
      },
      get: {
        summary: 'Get caller own paginated transaction history',
        tags: ['Transactions'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Paginated transactions history' },
        },
      },
    },
    '/transactions/{id}': {
      get: {
        summary: 'Get transaction details by ID (Ownership protected)',
        tags: ['Transactions'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Transaction details' },
          '403': { description: 'Access denied' },
          '404': { description: 'Transaction not found' },
        },
      },
    },
    '/transactions/{id}/ledger': {
      get: {
        summary: 'Get debit/credit ledger entries for a transaction (Ownership protected)',
        tags: ['Transactions'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Double-entry debit/credit ledger records' },
          '403': { description: 'Access denied' },
          '404': { description: 'Transaction not found' },
        },
      },
    },
    '/notifications': {
      get: {
        summary: 'Get caller paginated notifications',
        tags: ['Notifications'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Paginated user notifications' },
        },
      },
    },
    '/admin/users': {
      get: {
        summary: 'Get paginated users and wallet balances (Admin only)',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Paginated user list' },
          '403': { description: 'Forbidden (Admin role required)' },
        },
      },
    },
    '/admin/users/{id}/freeze': {
      patch: {
        summary: 'Freeze or unfreeze user account (Admin only)',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FreezeRequest' } } },
        },
        responses: {
          '200': { description: 'Account status updated' },
          '403': { description: 'Forbidden (Admin role required)' },
        },
      },
    },
    '/admin/transactions': {
      get: {
        summary: 'Get global transaction list with filters (Admin only)',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Global paginated transaction list' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/admin/transactions/{id}/review': {
      patch: {
        summary: 'Approve or reject a FLAGGED transaction (Admin only)',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewRequest' } } },
        },
        responses: {
          '200': { description: 'Transaction approved or rejected' },
          '400': { description: 'Transaction is not in FLAGGED state' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/admin/audit-logs': {
      get: {
        summary: 'Get paginated audit logs (Admin only)',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Paginated system audit trail' },
          '403': { description: 'Forbidden' },
        },
      },
    },
  },
};

export function setupSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/docs.json', (_req, res) => res.json(swaggerDocument));
  console.log('[Swagger] UI mounted at /docs');
}

export default setupSwagger;
