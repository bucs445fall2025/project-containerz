const User = require('../models/User.js');
const jwt = require('jsonwebtoken');

const { signupSchema, signinSchema } = require('../middlewares/validator.js'); 
const { doHash, doHashValidation } = require('../utils/hashing.js');

exports.signup = async (req,res) => {
    try {
        const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ 
                success: false, 
                message: error.details[0].message 
            });
        }
        const { email, password } = value;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists!"
            });
        }
        const hashedPassword = await doHash(password, 12);
        const newUser = new User({
            email,
            password: hashedPassword
        })

        const result = await newUser.save();
        const { password: _pw, ...safeUser } = result.toObject();
        res.status(201).json({
            success: true,
            message: "Your account has been successfully created!",
            result: safeUser
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}

exports.signin = async (req,res) => {
    try {
        const { error, value } = signinSchema.validate(req.body, { abortEarly: false });
        if (error) {
            console.log("error validating");
            return res.status(400).json({ 
                success: false, 
                message: error.details[0].message 
            });
        }
        const { email, password } = value; 

        const existingUser = await User.findOne({email}).select('+password');
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found!"
            })
        }
        const ok = await doHashValidation(password, existingUser.password);
        if (!ok) {
            console.log("error comparing hash");
            return res.status(401).json({
                success: false,
                message: "Invalid Password!"
            });
        }
        const token = jwt.sign({
                userId: existingUser._id,
                email: existingUser.email
            },process.env.TOKEN_SECRET,
            {
                expiresIn: '8h'
            }
        );
        res.cookie('Authorization', 'Bearer ' + token, { 
            expires: new Date(Date.now() + 8 * 3600000), 
            httpOnly: process.env.NODE_ENV === 'production', 
            secure: process.env.NODE_ENV === 'production'}).json({ 
                success: true, 
                token, 
                message: "Log in successful"});
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}

exports.signout = async (req,res) => {
    res.clearCookie('Authorization').status(200).json({ success:true, message: "Logged out successfully" });
}