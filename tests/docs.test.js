'use strict';

const openapi = require('../src/docs/openapi');
const { app, request } = require('./helpers');

function resolveRef(ref, root) {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((node, key) => (node == null ? undefined : node[key]), root);
}

function collectRefs(node, refs = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, refs));
  } else if (node && typeof node === 'object') {
    if (typeof node.$ref === 'string') refs.push(node.$ref);
    Object.entries(node).forEach(([key, value]) => {
      if (key !== '$ref') collectRefs(value, refs);
    });
  }
  return refs;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

describe('OpenAPI documentation', () => {
  it('declares OpenAPI 3 and documents all routes', () => {
    expect(openapi.openapi).toMatch(/^3\./);
    expect(Object.keys(openapi.paths).length).toBeGreaterThanOrEqual(12);
  });

  it('has no broken local $refs', () => {
    const refs = collectRefs(openapi);
    expect(refs.length).toBeGreaterThan(0);

    const broken = refs.filter((ref) => ref.startsWith('#/') && resolveRef(ref, openapi) === undefined);
    expect(broken).toEqual([]);
  });

  it('gives every operation a summary and at least one response', () => {
    for (const [path, item] of Object.entries(openapi.paths)) {
      for (const method of HTTP_METHODS) {
        const operation = item[method];
        if (!operation) continue;
        expect(operation.summary).toEqual(expect.any(String));
        expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
        expect(operation.tags.length).toBeGreaterThan(0);
        expect(path.startsWith('/api/v1/')).toBe(true);
      }
    }
  });

  it('serves the Swagger UI and the raw spec', async () => {
    const ui = await request(app).get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.headers['content-type']).toMatch(/text\/html/);
    expect(ui.text).toContain('swagger-ui');

    const spec = await request(app).get('/api-docs.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe(openapi.openapi);
    expect(Object.keys(spec.body.paths).length).toBe(Object.keys(openapi.paths).length);
  });
});
