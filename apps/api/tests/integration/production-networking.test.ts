import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');

const COMPOSE_PATH = path.join(PROJECT_ROOT, 'docker-compose.yml');
const NGINX_PATH = path.join(
  PROJECT_ROOT,
  'infrastructure',
  'nginx',
  'nevo.conf',
);

const compose = fs.readFileSync(COMPOSE_PATH, 'utf8');
const nginx = fs.readFileSync(NGINX_PATH, 'utf8');

function serviceBlock(service: string): string {
  const match = compose.match(
    new RegExp(
      `(?:^|\\n)  ${service}:\\n([\\s\\S]*?)(?=\\n  [A-Za-z0-9_-]+:\\n|\\nnetworks:\\n|\\nvolumes:\\n|$)`,
    ),
  );

  return match?.[1] ?? '';
}

const backend = serviceBlock('backend');
const frontend = serviceBlock('frontend');
const postgres = serviceBlock('postgres');
const redis = serviceBlock('redis');
const nginxService = serviceBlock('nginx');

describe('M29.6 Production Networking, Reverse Proxy & TLS Boundary', () => {
  describe('Production edge topology', () => {
    it('defines the required production services', () => {
      expect(compose).toContain('postgres:');
      expect(compose).toContain('redis:');
      expect(compose).toContain('backend:');
      expect(compose).toContain('frontend:');
      expect(compose).toContain('nginx:');
    });

    it('defines a dedicated edge network', () => {
      expect(compose).toMatch(
        /networks:\s*[\s\S]*?edge:\s*[\s\S]*?driver:\s*bridge/,
      );
    });

    it('defines an isolated internal network', () => {
      expect(compose).toMatch(
        /internal:\s*[\s\S]*?driver:\s*bridge\s*[\s\S]*?internal:\s*true/,
      );
    });

    it('connects Nginx to the edge network', () => {
      expect(nginxService).toContain('- edge');
    });

    it('connects the backend to the edge network', () => {
      expect(backend).toContain('- edge');
    });

    it('connects the frontend to the edge network', () => {
      expect(frontend).toContain('- edge');
    });

    it('keeps PostgreSQL on the internal network', () => {
      expect(postgres).toContain('- internal');
      expect(postgres).not.toContain('- edge');
    });

    it('keeps Redis on the internal network', () => {
      expect(redis).toContain('- internal');
      expect(redis).not.toContain('- edge');
    });
  });

  describe('Public port boundary', () => {
    it('publishes HTTP on port 80 through Nginx', () => {
      expect(nginxService).toContain('"80:80"');
    });

    it('publishes HTTPS on port 443 through Nginx', () => {
      expect(nginxService).toContain('"443:443"');
    });

    it('does not publish the backend port directly', () => {
      expect(backend).not.toMatch(/ports:\s*[\s\S]*?3000:3000/);
    });

    it('does not publish the frontend port directly', () => {
      expect(frontend).not.toMatch(/ports:\s*[\s\S]*?3001:3001/);
    });

    it('does not publish PostgreSQL directly', () => {
      expect(postgres).not.toMatch(/ports:/);
    });

    it('does not publish Redis directly', () => {
      expect(redis).not.toMatch(/ports:/);
    });
  });

  describe('HTTP to HTTPS boundary', () => {
    it('defines an HTTP listener', () => {
      expect(nginx).toContain('listen 80;');
    });

    it('defines an HTTPS listener', () => {
      expect(nginx).toContain('listen 443 ssl;');
    });

    it('redirects ordinary HTTP traffic to HTTPS', () => {
      expect(nginx).toContain(
        'return 301 https://$host$request_uri;',
      );
    });

    it('does not redirect the Nginx health endpoint', () => {
      expect(nginx).toContain(
        'location = /nginx-health',
      );
    });
  });

  describe('TLS configuration', () => {
    it('configures a TLS certificate', () => {
      expect(nginx).toContain(
        'ssl_certificate /etc/nginx/certs/fullchain.pem;',
      );
    });

    it('configures a TLS private key', () => {
      expect(nginx).toContain(
        'ssl_certificate_key /etc/nginx/certs/privkey.pem;',
      );
    });

    it('requires TLS 1.2 or newer', () => {
      expect(nginx).toContain(
        'ssl_protocols TLSv1.2 TLSv1.3;',
      );
    });

    it('disables TLS session tickets', () => {
      expect(nginx).toContain(
        'ssl_session_tickets off;',
      );
    });

    it('does not reference a private key outside the certificate boundary', () => {
      expect(nginx).not.toMatch(
        /ssl_certificate_key\s+\/(?!etc\/nginx\/certs\/)/,
      );
    });

    it('mounts TLS material read-only', () => {
      expect(nginxService).toContain(
        './infrastructure/tls:/etc/nginx/certs:ro',
      );
    });
  });

  describe('HTTP security headers', () => {
    it('configures HSTS', () => {
      expect(nginx).toContain(
        'Strict-Transport-Security',
      );
    });

    it('configures X-Content-Type-Options', () => {
      expect(nginx).toContain(
        'X-Content-Type-Options',
      );
    });

    it('configures X-Frame-Options', () => {
      expect(nginx).toContain(
        'X-Frame-Options',
      );
    });

    it('configures Referrer-Policy', () => {
      expect(nginx).toContain(
        'Referrer-Policy',
      );
    });
  });

  describe('API reverse proxy', () => {
    it('proxies API requests to the backend service', () => {
      expect(nginx).toContain(
        'proxy_pass http://backend:3000;',
      );
    });

    it('uses HTTP/1.1 for API proxying', () => {
      expect(nginx).toContain(
        'proxy_http_version 1.1;',
      );
    });

    it('forwards the Host header', () => {
      expect(nginx).toContain(
        'proxy_set_header Host $host;',
      );
    });

    it('forwards the client IP', () => {
      expect(nginx).toContain(
        'proxy_set_header X-Real-IP $remote_addr;',
      );
    });

    it('preserves the forwarded client IP chain', () => {
      expect(nginx).toContain(
        'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
      );
    });

    it('forwards the original protocol', () => {
      expect(nginx).toContain(
        'proxy_set_header X-Forwarded-Proto $scheme;',
      );
    });

    it('forwards the original host', () => {
      expect(nginx).toContain(
        'proxy_set_header X-Forwarded-Host $host;',
      );
    });

    it('does not proxy API traffic directly to PostgreSQL', () => {
      expect(nginx).not.toContain('proxy_pass postgres');
    });

    it('does not proxy API traffic directly to Redis', () => {
      expect(nginx).not.toContain('proxy_pass redis');
    });
  });

  describe('WebSocket reverse proxy', () => {
    it('defines a WebSocket route', () => {
      expect(nginx).toContain('location /ws');
    });

    it('proxies WebSocket traffic to the backend', () => {
      expect(nginx).toContain(
        'proxy_pass http://backend:3000/ws;',
      );
    });

    it('uses HTTP/1.1 for WebSocket traffic', () => {
      expect(nginx).toContain(
        'proxy_http_version 1.1;',
      );
    });

    it('forwards the WebSocket Upgrade header', () => {
      expect(nginx).toContain(
        'proxy_set_header Upgrade $http_upgrade;',
      );
    });

    it('forwards the WebSocket Connection header', () => {
      expect(nginx).toContain(
        'proxy_set_header Connection "upgrade";',
      );
    });

    it('preserves forwarded protocol information for WebSockets', () => {
      expect(nginx).toContain(
        'proxy_set_header X-Forwarded-Proto $scheme;',
      );
    });

    it('allows long-lived WebSocket connections', () => {
      expect(nginx).toContain(
        'proxy_read_timeout 3600s;',
      );
    });
  });

  describe('Frontend reverse proxy', () => {
    it('proxies frontend traffic to the frontend service', () => {
      expect(nginx).toContain(
        'proxy_pass http://frontend:3001;',
      );
    });

    it('uses HTTP/1.1 for frontend proxying', () => {
      expect(nginx).toContain(
        'proxy_http_version 1.1;',
      );
    });

    it('does not expose the frontend container directly', () => {
      expect(frontend).not.toContain('ports:');
    });
  });

  describe('Infrastructure isolation', () => {
    it('keeps PostgreSQL off the public edge network', () => {
      expect(postgres).not.toContain('- edge');
    });

    it('keeps Redis off the public edge network', () => {
      expect(redis).not.toContain('- edge');
    });

    it('does not expose PostgreSQL through Nginx', () => {
      expect(nginx).not.toContain('postgres:5432');
    });

    it('does not expose Redis through Nginx', () => {
      expect(nginx).not.toContain('redis:6379');
    });

    it('does not expose the Docker socket through Nginx', () => {
      expect(nginxService).not.toContain('/var/run/docker.sock');
    });

    it('does not configure host networking for Nginx', () => {
      expect(nginxService).not.toContain('network_mode: host');
    });

    it('does not configure host networking for the backend', () => {
      expect(backend).not.toContain('network_mode: host');
    });

    it('does not configure host networking for the frontend', () => {
      expect(frontend).not.toContain('network_mode: host');
    });
  });

  describe('Nginx operational boundary', () => {
    it('defines an Nginx healthcheck', () => {
      expect(nginxService).toContain('healthcheck:');
    });

    it('uses the Nginx health endpoint for readiness', () => {
      expect(nginxService).toContain(
        'https://127.0.0.1/nginx-health',
      );
    });

    it('waits for a healthy backend', () => {
      expect(nginxService).toMatch(
        /backend:\s*[\s\S]*?condition:\s*service_healthy/,
      );
    });

    it('waits for the frontend service', () => {
      expect(nginxService).toMatch(
        /frontend:\s*[\s\S]*?condition:\s*service_started/,
      );
    });

    it('mounts the Nginx configuration read-only', () => {
      expect(nginxService).toContain(
        './infrastructure/nginx/nevo.conf:/etc/nginx/conf.d/default.conf:ro',
      );
    });
  });

  describe('M29.6 certification boundary', () => {
    it('has a dedicated public edge service', () => {
      expect(nginxService).toContain('image: nginx:1.27-alpine');
    });

    it('has exactly HTTP and HTTPS public entry points', () => {
      expect(nginxService).toContain('"80:80"');
      expect(nginxService).toContain('"443:443"');
    });

    it('keeps application services behind the reverse proxy', () => {
      expect(backend).not.toContain('ports:');
      expect(frontend).not.toContain('ports:');
    });

    it('keeps data services private', () => {
      expect(postgres).not.toContain('ports:');
      expect(redis).not.toContain('ports:');
    });

    it('provides a TLS configuration boundary', () => {
      expect(nginx).toContain(
        'ssl_certificate /etc/nginx/certs/fullchain.pem;',
      );
      expect(nginx).toContain(
        'ssl_certificate_key /etc/nginx/certs/privkey.pem;',
      );
    });

    it('provides an HTTP to HTTPS redirect boundary', () => {
      expect(nginx).toContain(
        'return 301 https://$host$request_uri;',
      );
    });

    it('provides an API proxy boundary', () => {
      expect(nginx).toContain(
        'proxy_pass http://backend:3000;',
      );
    });

    it('provides a WebSocket proxy boundary', () => {
      expect(nginx).toContain(
        'proxy_set_header Upgrade $http_upgrade;',
      );
      expect(nginx).toContain(
        'proxy_set_header Connection "upgrade";',
      );
    });

    it('provides an HSTS security boundary', () => {
      expect(nginx).toContain(
        'Strict-Transport-Security',
      );
    });

    it('does not expose the database or cache to the host', () => {
      expect(postgres).not.toContain('ports:');
      expect(redis).not.toContain('ports:');
    });

    it('does not expose application containers directly to the host', () => {
      expect(backend).not.toContain('ports:');
      expect(frontend).not.toContain('ports:');
    });
  });
});
