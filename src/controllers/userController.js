const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { sendVerificationCode: sendVerificationEmail } = require('../services/emailService');

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_EXPIRY_MINUTES = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || '10');

/**
 * Generate a 4-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Create a new user account
 * POST /api/users
 * Body: { email, password, name? }
 */
async function createUser(req, res, next) {
  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    // Create user with pending email verification status
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        verificationCode,
        verificationCodeExpiresAt,
        status: 'pending_email_verification',
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        status: true,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email.toLowerCase(), verificationCode);
    } catch (emailError) {
      // Log error but don't fail the request - user can resend
      console.error('Failed to send verification email:', emailError);
    }

    return res.status(201).json({
      message: 'Account created successfully. Please check your email for the verification code.',
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user by ID
 * GET /api/users/:id
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    return res.json({ user });
  } catch (error) {
    next(error);
  }
}

/**
 * Send verification code to user's email
 * POST /api/users/:id/verify-email
 */
async function sendVerificationCode(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    if (user.status === 'email_verified' || user.status === 'active') {
      return res.status(400).json({
        error: 'Email is already verified',
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    // Update user with new code
    await prisma.user.update({
      where: { id },
      data: {
        verificationCode,
        verificationCodeExpiresAt,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationCode);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        error: 'Failed to send verification email. Please try again.',
      });
    }

    return res.json({
      message: 'Verification code sent successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify the email verification code
 * POST /api/users/:id/verify-code
 * Body: { code }
 */
async function verifyCode(req, res, next) {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Verification code is required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    if (user.status === 'email_verified' || user.status === 'active') {
      return res.status(400).json({
        error: 'Email is already verified',
      });
    }

    // Check if code matches
    if (user.verificationCode !== code) {
      return res.status(400).json({
        error: 'Invalid verification code',
      });
    }

    // Check if code has expired
    if (user.verificationCodeExpiresAt && new Date() > user.verificationCodeExpiresAt) {
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.',
      });
    }

    // Update user status to email_verified
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'email_verified',
        emailVerifiedAt: new Date(),
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    return res.json({
      message: 'Email verified successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resend verification code
 * POST /api/users/:id/resend-code
 */
async function resendVerificationCode(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    if (user.status === 'email_verified' || user.status === 'active') {
      return res.status(400).json({
        error: 'Email is already verified',
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    // Update user with new code
    await prisma.user.update({
      where: { id },
      data: {
        verificationCode,
        verificationCodeExpiresAt,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationCode);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        error: 'Failed to send verification email. Please try again.',
      });
    }

    return res.json({
      message: 'Verification code resent successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check if a user ID (username) is available
 * GET /api/users/check-userid/:userId
 */
async function checkUserIdAvailability(req, res, next) {
  try {
    const { userId } = req.params;

    if (!userId || userId.trim().length === 0) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    // Validate userId format (alphanumeric, underscore, 3-30 chars)
    const userIdRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!userIdRegex.test(userId)) {
      return res.json({
        available: false,
        userId,
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { userId: userId.toLowerCase() },
    });

    return res.json({
      available: !existingUser,
      userId,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create/set user ID (username) after email verification
 * POST /api/users/:id/create-userid
 * Body: { userId }
 */
async function createUserId(req, res, next) {
  try {
    const { id } = req.params;
    const { userId: newUserId } = req.body;

    if (!newUserId || newUserId.trim().length === 0) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    // Validate userId format
    const userIdRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!userIdRegex.test(newUserId)) {
      return res.status(400).json({
        error: 'User ID must be 3-30 characters and can only contain letters, numbers, and underscores',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Check if email is verified
    if (user.status !== 'email_verified') {
      return res.status(400).json({
        error: 'Please verify your email first',
      });
    }

    // Check if user already has a userId
    if (user.userId) {
      return res.status(400).json({
        error: 'User ID already set',
      });
    }

    // Check if userId is already taken
    const existingUser = await prisma.user.findUnique({
      where: { userId: newUserId.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'This user ID is already taken',
      });
    }

    // Update user with userId and change status to active
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        userId: newUserId.toLowerCase(),
        status: 'active',
      },
      select: {
        id: true,
        email: true,
        userId: true,
        name: true,
        status: true,
      },
    });

    return res.json({
      message: 'User ID created successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user with email and password
 * POST /api/users/login
 * Body: { email, password }
 */
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        userId: user.userId,
        name: user.name,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  loginUser,
  createUser,
  getUserById,
  sendVerificationCode,
  verifyCode,
  resendVerificationCode,
  checkUserIdAvailability,
  createUserId,
};