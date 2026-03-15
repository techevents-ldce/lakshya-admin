const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().allow(''),
  college: Joi.string().allow(''),
  branch: Joi.string().allow(''),
  year: Joi.number().min(1).max(6).allow(null),
  role: Joi.string().valid('participant', 'coordinator', 'admin').default('participant'),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().allow(''),
  college: Joi.string().allow(''),
  branch: Joi.string().allow(''),
  year: Joi.number().min(1).max(6).allow(null),
  isActive: Joi.boolean(),
});

const assignEventsSchema = Joi.object({
  eventIds: Joi.array().items(Joi.string()).required(),
});

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
});

module.exports = { createUserSchema, updateUserSchema, assignEventsSchema, resetPasswordSchema };
