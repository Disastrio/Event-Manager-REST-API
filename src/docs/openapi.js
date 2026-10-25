'use strict';

const config = require('../config/env');

const errorResponse = (description, code) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: {
        success: false,
        error: { code, message: description },
      },
    },
  },
});

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Campus Events API',
    version: '1.0.0',
    description: [
      'REST API for a college event platform.',
      '',
      '**Features:** JWT authentication, event CRUD, event registration/cancellation,',
      'admin & student roles, pagination, search, validation, rate limiting.',
      '',
      '**Auth flow:** register or log in, then click **Authorize** and paste the returned',
      'token (no need to prefix it with "Bearer").',
    ].join('\n'),
    contact: { name: 'Campus Events API' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: '/', description: 'Current server' },
    { url: `http://localhost:${config.port}`, description: 'Local development' },
  ],
  tags: [
    { name: 'Auth', description: 'Registration, login and current user' },
    { name: 'Events', description: 'Event CRUD, search and categories' },
    { name: 'Registrations', description: 'Register for, cancel and list registrations' },
    { name: 'Users', description: 'Admin user management' },
    { name: 'System', description: 'Health check' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '665f1c2b8f1b2c0012a4d9e1' },
          name: { type: 'string', example: 'Ada Lovelace' },
          email: { type: 'string', format: 'email', example: 'ada@campus.edu' },
          role: { type: 'string', enum: ['student', 'admin'], example: 'student' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '665f1c2b8f1b2c0012a4d9e2' },
          title: { type: 'string', example: 'Annual Hackathon 2026' },
          description: {
            type: 'string',
            example: 'A 24-hour hackathon for students across all departments.',
          },
          category: { type: 'string', example: 'Technology' },
          location: { type: 'string', example: 'Main Auditorium, Block A' },
          startDate: { type: 'string', format: 'date-time', example: '2026-11-20T09:00:00.000Z' },
          endDate: { type: 'string', format: 'date-time', example: '2026-11-21T09:00:00.000Z' },
          capacity: { type: 'integer', minimum: 1, example: 200 },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'cancelled', 'completed'],
            example: 'published',
          },
          organizer: { $ref: '#/components/schemas/User' },
          registeredCount: { type: 'integer', minimum: 0, example: 37 },
          isFull: { type: 'boolean', example: false },
          seatsRemaining: { type: 'integer', example: 163 },
          isRegistered: {
            type: 'boolean',
            description: 'Only present on GET /events/{id} when a token is supplied.',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Registration: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '665f1c2b8f1b2c0012a4d9e3' },
          event: { $ref: '#/components/schemas/Event' },
          user: { $ref: '#/components/schemas/User' },
          status: { type: 'string', enum: ['registered', 'cancelled'], example: 'registered' },
          registeredAt: { type: 'string', format: 'date-time' },
          cancelledAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Meta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 5 },
          hasNextPage: { type: 'boolean', example: true },
          hasPrevPage: { type: 'boolean', example: false },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'email' },
                    message: { type: 'string', example: 'Please provide a valid email address' },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: errorResponse('Bad request', 'BAD_REQUEST'),
      Unauthorized: errorResponse('Missing, invalid or expired token', 'UNAUTHORIZED'),
      Forbidden: errorResponse('Authenticated but not allowed', 'FORBIDDEN'),
      NotFound: errorResponse('Resource not found', 'NOT_FOUND'),
      Conflict: errorResponse('Request conflicts with existing state', 'CONFLICT'),
      Unprocessable: errorResponse('Validation failed', 'VALIDATION_ERROR'),
      TooManyRequests: errorResponse('Rate limit exceeded', 'RATE_LIMITED'),
      ServerError: errorResponse('Unexpected server error', 'INTERNAL_ERROR'),
    },
  },
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Liveness probe with database state and uptime.',
        responses: {
          200: { description: 'Service is healthy' },
        },
      },
    },

    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a student account',
        description:
          'Public sign-up. Always creates a `student` account. Returns a JWT so the client can log in immediately.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 80, example: 'Ada Lovelace' },
                  email: { type: 'string', format: 'email', example: 'ada@campus.edu' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    maxLength: 72,
                    example: 'Passw0rd123',
                    description: 'At least 8 characters and must contain a letter and a number.',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          409: errorResponse('Email already registered', 'EMAIL_TAKEN'),
          422: { $ref: '#/components/responses/Unprocessable' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'ada@campus.edu' },
                  password: { type: 'string', example: 'Passw0rd123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: errorResponse('Invalid email or password', 'INVALID_CREDENTIALS'),
          422: { $ref: '#/components/responses/Unprocessable' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update the current user',
        description: 'Currently supports changing the display name.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 80, example: 'Ada L.' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/Unprocessable' },
        },
      },
    },

    '/api/v1/events': {
      get: {
        tags: ['Events'],
        summary: 'List events',
        description:
          'Public. Students only see published events; admins can pass `status` to filter or see everything.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Case-insensitive partial match on title, description and location.',
            schema: { type: 'string', maxLength: 100 },
          },
          { name: 'category', in: 'query', schema: { type: 'string', example: 'Technology' } },
          {
            name: 'status',
            in: 'query',
            description: 'Admin only when set to anything other than published.',
            schema: { type: 'string', enum: ['draft', 'published', 'cancelled', 'completed'] },
          },
          {
            name: 'sort',
            in: 'query',
            description: 'Field name, prefix with `-` for descending.',
            schema: {
              type: 'string',
              enum: [
                'createdAt',
                '-createdAt',
                'startDate',
                '-startDate',
                'title',
                '-title',
                'capacity',
                '-capacity',
                'registeredCount',
                '-registeredCount',
              ],
              default: '-createdAt',
            },
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
                    meta: { $ref: '#/components/schemas/Meta' },
                  },
                },
              },
            },
          },
          422: { $ref: '#/components/responses/Unprocessable' },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Create an event (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'title',
                  'description',
                  'category',
                  'location',
                  'startDate',
                  'endDate',
                  'capacity',
                ],
                properties: {
                  title: { type: 'string', minLength: 3, maxLength: 120 },
                  description: { type: 'string', minLength: 10, maxLength: 5000 },
                  category: { type: 'string', minLength: 2, maxLength: 50 },
                  location: { type: 'string', minLength: 2, maxLength: 200 },
                  startDate: { type: 'string', format: 'date-time', description: 'Must be in the future.' },
                  endDate: { type: 'string', format: 'date-time', description: 'Must be after startDate.' },
                  capacity: { type: 'integer', minimum: 1, maximum: 100000 },
                  status: {
                    type: 'string',
                    enum: ['draft', 'published', 'cancelled', 'completed'],
                    default: 'published',
                  },
                },
              },
              example: {
                title: 'Annual Hackathon 2026',
                description: 'A 24-hour hackathon for students across all departments.',
                category: 'Technology',
                location: 'Main Auditorium, Block A',
                startDate: '2026-11-20T09:00:00.000Z',
                endDate: '2026-11-21T09:00:00.000Z',
                capacity: 200,
                status: 'published',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Event created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Event' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/Unprocessable' },
        },
      },
    },

    '/api/v1/events/categories': {
      get: {
        tags: ['Events'],
        summary: 'List event categories',
        responses: {
          200: {
            description: 'Distinct, alphabetically sorted categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['Sports', 'Technology', 'Workshop'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/v1/events/{id}': {
      get: {
        tags: ['Events'],
        summary: 'Get one event',
        description: 'Drafts and cancelled events are only visible to the organizer and admins.',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: {
          200: {
            description: 'Event',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Event' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/Unprocessable' },
        },
      },
      patch: {
        tags: ['Events'],
        summary: 'Update an event (admin or organizer)',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Any subset of event fields.',
                properties: {
                  title: { type: 'string', minLength: 3, maxLength: 120 },
                  description: { type: 'string', minLength: 10, maxLength: 5000 },
                  category: { type: 'string', minLength: 2, maxLength: 50 },
                  location: { type: 'string', minLength: 2, maxLength: 200 },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                  capacity: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 100000,
                    description: 'Cannot be lower than the current registeredCount.',
                  },
                  status: {
                    type: 'string',
                    enum: ['draft', 'published', 'cancelled', 'completed'],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated event',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Event' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/Unprocessable' },
        },
      },
      delete: {
        tags: ['Events'],
        summary: 'Delete an event (admin or organizer)',
        description: 'Also deletes all registrations for the event.',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: {
          204: { description: 'Deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/events/{id}/register': {
      post: {
        tags: ['Registrations'],
        summary: 'Register for an event',
        description:
          'Rejects duplicates with 409, full events with 409, and events that are not published or already started.',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: {
          201: {
            description: 'Registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Registration' },
                  },
                },
              },
            },
          },
          400: errorResponse('Event not open for registration or already started', 'EVENT_NOT_OPEN'),
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          409: errorResponse('Already registered or event is full', 'ALREADY_REGISTERED'),
        },
      },
      delete: {
        tags: ['Registrations'],
        summary: 'Cancel your registration',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: {
          200: {
            description: 'Registration cancelled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Registration' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: errorResponse('No active registration for this event', 'REGISTRATION_NOT_FOUND'),
        },
      },
    },

    '/api/v1/events/{id}/registrations': {
      get: {
        tags: ['Registrations'],
        summary: 'List an event’s registrations (admin or organizer)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/EventId' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['registered', 'cancelled'] },
          },
        ],
        responses: {
          200: {
            description: 'Paginated registrations with populated users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Registration' } },
                    meta: { $ref: '#/components/schemas/Meta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/registrations/me': {
      get: {
        tags: ['Registrations'],
        summary: 'List my registrations',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['registered', 'cancelled'] },
          },
        ],
        responses: {
          200: {
            description: 'Paginated registrations for the current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Registration' } },
                    meta: { $ref: '#/components/schemas/Meta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/v1/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'role',
            in: 'query',
            schema: { type: 'string', enum: ['student', 'admin'] },
          },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } },
        ],
        responses: {
          200: {
            description: 'Paginated users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    meta: { $ref: '#/components/schemas/Meta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/v1/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Change a user’s role (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: '665f1c2b8f1b2c0012a4d9e1',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['student', 'admin'] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: errorResponse('Cannot demote yourself or the last admin', 'CANNOT_DEMOTE_SELF'),
          422: { $ref: '#/components/responses/Unprocessable' },
        },
      },
    },
  },
};

// Shared path parameters (kept out of the main object for readability).
openapi.components.parameters = {
  EventId: {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    example: '665f1c2b8f1b2c0012a4d9e2',
  },
};

module.exports = openapi;
