import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../memory/store.js';

export default async function projectsRoutes(fastify: FastifyInstance) {
  // Get all projects
  fastify.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id;
    const result = await pool.query(
      'SELECT id, name, description, context, created_at, updated_at FROM projects WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [userId, tenantId]
    );
    return result.rows;
  });

  // Create project
fastify.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
  const userId = req.user?.id;
  const tenantId = req.tenant!.id;

  const { name, description, context } = req.body as {
    name: string;
    description?: string;
    context?: unknown;
  };

  if (!name) {
    return reply.status(400).send({ error: 'Missing name' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (
        user_id,
        tenant_id,
        name,
        description,
        context
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, user_id, tenant_id, description, context, created_at, updated_at`,
      [userId, tenantId, name, description || '', context || {}],
    );

    return reply.status(201).send(result.rows[0]);
  } catch (error) {
    req.log.error(
      {
        error,
        userId,
        tenantId,
        projectName: name,
      },
      'project creation failed',
    );

    return reply.status(500).send({
      error: 'Project creation failed',
    });
  }
});

  // Get single project
  fastify.get('/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user?.id;
    const { id } = req.params as { id: string };
    const tenantId = req.tenant!.id;
    const result = await pool.query(
      `SELECT *
FROM projects
WHERE id = $1
  AND user_id = $2
  AND tenant_id = $3`,
      [id, userId, tenantId]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return result.rows[0];
  });

  // Update project
  fastify.put('/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user?.id;
    const { id } = req.params as { id: string };
    const { name, description, context } = req.body as { name?: string; description?: string; context?: any };

    const result = await pool.query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           context = COALESCE($3, context),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5 AND tenant_id = $6
       RETURNING *`,
      [name, description, context, id, userId, req.tenant!.id]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return result.rows[0];
  });


// Get history for project
fastify.get('/:id/history', async (req: FastifyRequest, reply: FastifyReply) => {
  const userId = req.user?.id;
  const { id } = req.params as { id: string };

  const projectCheck = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND tenant_id = $3',
    [id, userId, req.tenant!.id]
  );

  if (projectCheck.rows.length === 0) {
    return reply.status(404).send({ error: 'Project not found' });
  }

  const result = await pool.query(
    `SELECT *
     FROM history_entries
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [id]
  );

  return result.rows;
});

  // Delete project
  fastify.delete('/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user?.id;
    const { id } = req.params as { id: string };
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 AND tenant_id = $3 RETURNING id',
      [id, userId, req.tenant!.id]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return reply.status(204).send();
  });

  // Get tasks for project
  fastify.get('/:id/tasks', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user?.id;
    const { id } = req.params as { id: string };
    // Verify ownership
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND tenant_id = $3',
      [id, userId, req.tenant!.id]
    );
    if (projectCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    const result = await pool.query(
      'SELECT * FROM project_tasks WHERE project_id = $1 ORDER BY created_at ASC',
      [id]
    );
    return result.rows;
  });
}