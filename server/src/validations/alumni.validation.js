const Joi = require('joi');

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  branch: Joi.string().allow(''),
  engagementRoles: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ),
  sort: Joi.string().valid('submittedAt'),
  order: Joi.string().valid('asc', 'desc'),
});

const priorityBodySchema = Joi.object({
  priority: Joi.boolean(),
}).unknown(false);

module.exports = { listQuerySchema, priorityBodySchema };
