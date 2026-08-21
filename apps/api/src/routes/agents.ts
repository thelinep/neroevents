import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../memory/store.js';
import { randomBytes } from 'crypto';
import { requirePermission } from '../authorization/require-permission.js';

export default async function agentsRoutes(fastify: FastifyInstance) {
  // List agents
  fastify.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requirePermission(req, reply, 'agent:read')) {
      return;
    }

    const userId = req.user?.id;
    const tenantId = req.tenant!.id;
    const result = await pool.query(
      'SELECT * FROM custom_agents WHERE user_id = $1 AND tenant_id = $2 OR is_public = true',
      [userId, tenantId]
    );
    return result.rows;
  });

  // Create agent
  fastify.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requirePermission(req, reply, 'agent:create')) {
      return;
    }

    const userId = req.user?.id;
    const tenantId = req.tenant!.id;
    const {
      name,
      description,
      system_prompt,
      model_provider,
      model_name,
      temperature,
      tools,
      is_public,
    } = req.body as {
      name: string;
      description?: string;
      system_prompt: string;
      model_provider: string;
      model_name: string;
      temperature?: number;
      tools?: string[];
      is_public?: boolean;
    };

    if (!name || !system_prompt || !model_provider || !model_name) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO custom_agents (
        user_id, tenant_id, name, description, system_prompt, model_provider, model_name,
        temperature, tools, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [userId, tenantId, name, description, system_prompt, model_provider, model_name,
       temperature || 0.7, JSON.stringify(tools || []), is_public || false]
    );
    return reply.status(201).send(result.rows[0]);
  });

    // Get a single agent
  fastify.get('/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requirePermission(req, reply, 'agent:read')) {
      return;
    }

    const userId = req.user?.id;
    const tenantId = req.tenant!.id;
    const { id } = req.params as { id: string };

    const result = await pool.query(
      `
        SELECT *
        FROM custom_agents
        WHERE id = $1
          AND tenant_id = $2
          AND (
            user_id = $3
            OR is_public = true
          )
      `,
      [id, tenantId, userId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'Agent not found',
      });
    }

    return reply.send(result.rows[0]);
  });

  // Update agent
  // Update agent
  fastify.put('/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requirePermission(req, reply, 'agent:update')) {
      return;
    }

    const userId = req.user?.id;
    const { id } = req.params as { id: string };

    const updates = req.body as {
      name?: string;
      description?: string;
      system_prompt?: string;
      model_provider?: string;
      model_name?: string;
      temperature?: number;
      tools?: string[];
      is_public?: boolean;
    };

    const allowedFields = [
      'name',
      'description',
      'system_prompt',
      'model_provider',
      'model_name',
      'temperature',
      'tools',
      'is_public',
    ] as const;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of allowedFields) {
      if (!(key in updates)) continue;

      const value = updates[key];

      if (key === 'temperature') {
        if (
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 2
        ) {
          return reply.status(400).send({
            error: 'temperature must be a number between 0 and 2',
          });
        }
      }

      if (key === 'tools' && !Array.isArray(value)) {
        return reply.status(400).send({
          error: 'tools must be an array',
        });
      }

      if (key === 'is_public' && typeof value !== 'boolean') {
        return reply.status(400).send({
          error: 'is_public must be a boolean',
        });
      }

      fields.push(`${key} = $${idx}`);

      values.push(
        key === 'tools'
          ? JSON.stringify(value)
          : value,
      );

      idx++;
    }

    if (fields.length === 0) {
      return reply.status(400).send({
        error: 'No valid fields to update',
      });
    }

    values.push(id, userId, req.tenant!.id);

    const query = `
      UPDATE custom_agents
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND user_id = $${idx + 1} AND tenant_id = $${idx + 2}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'Agent not found',
      });
    }

    return result.rows[0];
  });
  // Delete agent
  fastify.delete('/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requirePermission(req, reply, 'agent:delete')) {
      return;
    }

    const userId = req.user?.id;
    const { id } = req.params as { id: string };
    const result = await pool.query(
      'DELETE FROM custom_agents WHERE id = $1 AND user_id = $2 AND tenant_id = $3 RETURNING id',
      [id, userId, req.tenant!.id]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    return reply.status(204).send();
  });

  // Share agent
  fastify.post('/:id/share', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requirePermission(req, reply, 'agent:share')) {
      return;
    }

    const userId = req.user?.id;
    const { id } = req.params as { id: string };
    const shareToken = randomBytes(16).toString('hex');
    const result = await pool.query(
      `UPDATE custom_agents
       SET share_token = $1, is_public = true
       WHERE id = $2 AND user_id = $3 AND tenant_id = $4
       RETURNING share_token`,
      [shareToken, id, userId, req.tenant!.id]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    return { shareToken };
  });
}