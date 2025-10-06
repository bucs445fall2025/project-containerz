const User = require('../models/User.js');
const jwt = require('jsonwebtoken');

const { signupSchema, signinSchema, acceptCodeSchema, changePasswordSchema, acceptFPCodeSchema} = require('../middlewares/validation.js'); 
const { doHash, doHashValidation, hmacProcess } = require('../utils/hashing.js');
const transport = require('../middlewares/sendMail');

exports.signup = async (req,res) => {
    try {
        const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ 
                success: false, 
                message: error.details[0].message 
            });
        }
        const { name, email, password } = value;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists!"
            });
        }
        const hashedPassword = await doHash(password, 12);
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });

        const result = await newUser.save();
        const token = jwt.sign({
                userId: result._id,
                email: result.email,
                verified: result.verified
            },process.env.TOKEN_SECRET,
            {
                expiresIn: '8h'
            }
        );

        const safeUser = {
            id: String(result._id),
            name: result.name,
            email: result.email
        };

        res.cookie('Authorization', 'Bearer ' + token, {
            expires: new Date(Date.now() + 8 * 3600000),
            httpOnly: process.env.NODE_ENV === 'production',
            secure: process.env.NODE_ENV === 'production'
        }).status(201).json({
            success: true,
            message: "Your account has been successfully created!",
            token,
            user: safeUser
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
                email: existingUser.email,
                verified: existingUser.verified
            },process.env.TOKEN_SECRET,
            {
                expiresIn: '8h'
            }
        );
        // console.log(existingUser.verified);
        const safeUser = {
            id: String(existingUser._id),
            name: existingUser.name,
            email: existingUser.email,
            verified: existingUser.verified,
        };

        res.cookie('Authorization', 'Bearer ' + token, { 
            expires: new Date(Date.now() + 8 * 3600000), 
            httpOnly: process.env.NODE_ENV === 'production', 
            secure: process.env.NODE_ENV === 'production'}).json({ 
                success: true, 
                token,
                user: safeUser,
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

exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}

exports.sendVerificationCode = async (req,res) => {
    const { email } = req.body;
    try {
        const existingUser = await User.findOne({ email })
        if (!existingUser) {
            return res.status(404).json({ success: false, message: "User doesn't exist!" });
        }
        if (existingUser.verified) {
            return res.status(400).json({ success: false, message: "Already Verified!" });
        }

        const codeValue = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // pad ensures it is 6 digits;
        let info = await transport.sendMail({
            from: process.env.NODE_CODE_EMAIL_ADDRESS,
            to: existingUser.email,
            subject: "Verification Code",
            html: '<h1>' + codeValue + '<h1>'
        });

        if (info.accepted[0] === existingUser.email) {
            const hashedCodeValue = hmacProcess(codeValue, process.env.HMAC_VERIFICATION_CODE_SECRET)
            existingUser.verificationCode = hashedCodeValue;
            existingUser.verificationCodeValidation = Date.now();
            await existingUser.save({ validateBeforeSave: false });
            // console.log(existingUser.verificationCode);
            // console.log(existingUser.verificationCodeValidation);
            return res.status(200).json({ success: true, message: "Code sent!"});
        }
        return res.status(400).json({ success: false, message: "Code did not send!"}) // if email not accepted

    } catch (error) {
        console.log(error);
    }
};

exports.verifyVerificationCode = async (req,res) => {
    const { email, providedCode } = req.body;
    try {
        const { error, value } = acceptCodeSchema.validate({ email, providedCode });
        if (error) {
            return res.status(401).json({ success:false, message: error.details[0].message });
        } 
        const codeValue = providedCode.toString();
        const existingUser = await User.findOne({ email }).select("+verificationCode +verificationCodeValidation"); // needs spaave between plus
        if (!existingUser) {
            return res.status(404).json({ success: false, message: "User does not exist"});
        }

        if (existingUser.verified) {
            return res.status(400).json({ success: false, message: "You are already verified" });
        }
        // console.log(existingUser.verificationCode);
        // console.log(existingUser.verificationCodeValidation);

        if (!existingUser.verificationCode || !existingUser.verificationCodeValidation) {
            return res.status(400).json({ success: false, message: "Something is wrong with the code!" })
        }
        if (Date.now() - existingUser.verificationCodeValidation > 15 * 60 * 1000){
            return res.status(400).json({ success: false, message: "code has been expired!"});
        }

        const hashedCodeValue = hmacProcess(codeValue, process.env.HMAC_VERIFICATION_CODE_SECRET);
        if (hashedCodeValue === existingUser.verificationCode) {
            existingUser.verified = true;
            existingUser.verificationCode = undefined;
            existingUser.verificationCodeValidation = undefined;
            await existingUser.save({ validateBeforeSave: false });
            return res.status(200).json({ success: true, message: "Your account has been verified" });
        }
        return res.status(400).json({ success: false, message: "unexpected occured"})
    } catch (error) {
        console.log(error);
    }
};

exports.changePassword = async (req,res) => {
    const userId  = req.user?.id;
    const { oldPassword, newPassword } = req.body;
    try {
        console.log("got id from req.user:", userId);
        const existingUser = await User.findOne({ _id: userId}).select('+password +verified');
        if (!existingUser) {
            return res.status(404).json({ success: false, message: "User does not exist"});
        }
        if (!existingUser.verified) {
            return res.status(401).json({ success:false, message: "You are not a verified user" });
        }  
        const { error, value } = changePasswordSchema.validate({ oldPassword, newPassword });
        if (error) {
            return res.status(401).json({ success:false, message: error.details[0].message });
        } 
    
        const result = await doHashValidation(oldPassword, existingUser.password);
        if (!result) {
            return res.status(401).json({ success: false, message: "Invalid credentials"});
        }
        const hashedPassword = await doHash(newPassword, 12);
        existingUser.password = hashedPassword;
        await existingUser.save({ validateBeforeSave: false });
        return res.status(200).json({ success:true, message: "password updated" });
    } catch (error) {
        console.log(error);
    }
};
