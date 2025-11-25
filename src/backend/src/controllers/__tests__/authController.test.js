jest.mock('../../models/User.js', () => {
	const saveMock = jest.fn();
	const UserMock = jest.fn(function User(doc) {
		Object.assign(this, doc);
		this.save = saveMock;
	});
	UserMock.findOne = jest.fn();
	UserMock.__saveMock = saveMock;
	return UserMock;
});

jest.mock('../../utils/hashing.js', () => ({
	doHash: jest.fn(),
	doHashValidation: jest.fn(),
	hmacProcess: jest.fn(),
}));

jest.mock('../../middlewares/validation.js', () => ({
	signupSchema: { validate: jest.fn() },
	signinSchema: { validate: jest.fn() },
	acceptCodeSchema: { validate: jest.fn() },
	changePasswordSchema: { validate: jest.fn() },
	acceptFPCodeSchema: { validate: jest.fn() },
}));

jest.mock('jsonwebtoken', () => ({
	sign: jest.fn(() => 'signed-token'),
}));

jest.mock('../../middlewares/sendMail', () => ({
	sendMail: jest.fn(),
}));

const User = require('../../models/User.js');
const hashing = require('../../utils/hashing.js');
const validation = require('../../middlewares/validation.js');
const jwt = require('jsonwebtoken');

const { signup, signin } = require('../authController.js');

const createMockResponse = () => {
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	res.cookie = jest.fn().mockReturnValue(res);
	res.clearCookie = jest.fn().mockReturnValue(res);
	return res;
};

describe('authController', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		User.__saveMock.mockReset();
	});

	describe('signup', () => {
		// Validates signup persists a new user and issues a token-bearing response.
		it('creates a new user and returns a success response', async () => {
			const req = {
				body: {
					name: 'Test User',
					email: 'test@example.com',
					password: 'Password!1',
				},
			};

			validation.signupSchema.validate.mockReturnValue({ value: req.body });
			User.findOne.mockResolvedValue(null);
			const savedUser = {
				_id: '507f1f77bcf86cd799439011',
				name: req.body.name,
				email: req.body.email,
				verified: false,
			};
			User.__saveMock.mockResolvedValue(savedUser);
			hashing.doHash.mockResolvedValue('hashed-password');

			const res = createMockResponse();
			await signup(req, res);

			expect(validation.signupSchema.validate).toHaveBeenCalledWith(req.body, { abortEarly: false });
			expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
			expect(hashing.doHash).toHaveBeenCalledWith(req.body.password, 12);
			expect(User.__saveMock).toHaveBeenCalled();
			expect(jwt.sign).toHaveBeenCalledWith(
				{
					userId: savedUser._id,
					email: savedUser.email,
					verified: savedUser.verified,
				},
				process.env.TOKEN_SECRET,
				{ expiresIn: '8h' }
			);
			expect(res.cookie).toHaveBeenCalledWith(
				'Authorization',
				expect.stringContaining('Bearer '),
				expect.objectContaining({ httpOnly: expect.any(Boolean) })
			);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					user: {
						id: String(savedUser._id),
						name: savedUser.name,
						email: savedUser.email,
						verified: savedUser.verified,
					},
				})
			);
		});

		// Confirms signup short-circuits with a 400 when Joi validation fails.
		it('returns 400 when validation fails', async () => {
			const req = { body: {} };
			validation.signupSchema.validate.mockReturnValue({
				error: { details: [{ message: 'Invalid payload' }] },
			});

			const res = createMockResponse();
			await signup(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'Invalid payload',
			});
			expect(User.findOne).not.toHaveBeenCalled();
		});
	});

	describe('signin', () => {
		// Ensures signin returns 404 when the user lookup misses.
		it('returns 404 when user is not found', async () => {
			const req = {
				body: {
					email: 'missing@example.com',
					password: 'Password!1',
				},
			};

			validation.signinSchema.validate.mockReturnValue({ value: req.body });
			const selectMock = jest.fn().mockResolvedValue(null);
			User.findOne.mockReturnValue({ select: selectMock });

			const res = createMockResponse();
			await signin(req, res);

			expect(validation.signinSchema.validate).toHaveBeenCalledWith(req.body, { abortEarly: false });
			expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
			expect(selectMock).toHaveBeenCalledWith('+password');
			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({
				success: false,
				message: 'User not found!',
			});
			expect(hashing.doHashValidation).not.toHaveBeenCalled();
		});
	});
});
