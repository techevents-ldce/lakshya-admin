const AppError = require('./AppError');

/**
 * Validate request body / query / params against a Joi schema
 * Usage: router.post('/route', validate(schema), handler)
 */
const validate = (schema, property = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
  if (!error) return next();

  const details = error.details.map((d) => d.message).join('; ');
  return next(new AppError(`Validation error: ${details}`, 422));
};

module.exports = validate;
