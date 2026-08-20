const express = require('express');
const { createUser, getUserById } = require('../controllers/userController');

const router = express.Router();

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

module.exports = router;