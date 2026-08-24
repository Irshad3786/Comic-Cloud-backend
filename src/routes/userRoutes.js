const express = require('express');
const { loginUser, createUser, getUserById, sendVerificationCode, verifyCode, resendVerificationCode, checkUserIdAvailability, createUserId } = require('../controllers/userController');

const router = express.Router();

/**
 * @route POST /api/users/login
 * @description Login with email and password
 * @access Public
 */
router.post('/login', loginUser);

/**
 * @route POST /api/users
 * @description Create a new user account
 * @access Public
 */
router.post('/', createUser);

/**
 * @route GET /api/users/:id
 * @description Get user by ID
 * @access Public (in production, add authentication middleware)
 */
router.get('/:id', getUserById);

/**
 * @route POST /api/users/:id/verify-email
 * @description Send verification code to user's email
 * @access Public
 */
router.post('/:id/verify-email', sendVerificationCode);

/**
 * @route POST /api/users/:id/verify-code
 * @description Verify the email verification code
 * @access Public
 */
router.post('/:id/verify-code', verifyCode);

/**
 * @route POST /api/users/:id/resend-code
 * @description Resend verification code
 * @access Public
 */
router.post('/:id/resend-code', resendVerificationCode);

/**
 * @route GET /api/users/check-userid/:userId
 * @description Check if a user ID is available
 * @access Public
 */
router.get('/check-userid/:userId', checkUserIdAvailability);

/**
 * @route POST /api/users/:id/create-userid
 * @description Create/set user ID after email verification
 * @access Public
 */
router.post('/:id/create-userid', createUserId);

module.exports = router;