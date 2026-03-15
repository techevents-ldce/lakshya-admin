const Joi = require('joi');

const createEventSchema = Joi.object({
  title: Joi.string().min(3).max(120).required(),
  description: Joi.string().allow(''),
  category: Joi.string().allow(''),
  eventType: Joi.string().valid('solo', 'team').default('solo'),
  capacity: Joi.number().min(1).default(100),
  registrationFee: Joi.number().min(0).default(0),
  isPaid: Joi.boolean().default(false),
  teamSizeMin: Joi.number().min(1).default(1),
  teamSizeMax: Joi.number().min(1).default(1),
  registrationDeadline: Joi.date().allow(null),
  isRegistrationOpen: Joi.boolean().default(true),
  venue: Joi.string().allow(''),
  eventDate: Joi.date().allow(null),
});

const updateEventSchema = createEventSchema.fork(
  ['title'],
  (schema) => schema.optional()
);

module.exports = { createEventSchema, updateEventSchema };
