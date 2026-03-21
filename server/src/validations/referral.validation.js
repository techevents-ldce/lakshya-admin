const Joi = require('joi');

const createMappingSchema = Joi.object({
  referralCode: Joi.string().min(1).max(120).required(),
  caName: Joi.string().min(1).max(200).required(),
  caEmail: Joi.string().email().allow('', null),
  caPhone: Joi.string().max(40).allow('', null),
  notes: Joi.string().max(2000).allow('', null),
  isActive: Joi.boolean(),
});

const updateMappingSchema = Joi.object({
  referralCode: Joi.string().min(1).max(120),
  caName: Joi.string().min(1).max(200),
  caEmail: Joi.string().email().allow('', null),
  caPhone: Joi.string().max(40).allow('', null),
  notes: Joi.string().max(2000).allow('', null),
  isActive: Joi.boolean(),
}).min(1);

const listMappingsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
  search: Joi.string().allow(''),
  includeInactive: Joi.string().valid('true', 'false'),
});

module.exports = {
  createMappingSchema,
  updateMappingSchema,
  listMappingsQuerySchema,
};
