const { body } = require('express-validator');

const signupValidator = [
  body('name').isLength({ min: 2 }).withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 chars')
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

const forgotValidator = [body('email').isEmail().withMessage('Valid email required')];

const resetValidator = [
  body('token').notEmpty().withMessage('Token required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 chars')
];

module.exports = { signupValidator, loginValidator, forgotValidator, resetValidator };
