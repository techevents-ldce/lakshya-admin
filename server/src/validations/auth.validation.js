const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().allow(''),
  college: Joi.string().allow(''),
  branch: Joi.string().allow(''),
  year: Joi.number().min(1).max(6).allow(null),
  role: Joi.string().valid('participant', 'coordinator').default('participant'),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { loginSchema, registerSchema, refreshSchema };
