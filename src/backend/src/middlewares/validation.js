const Joi = require('joi');

exports.signupSchema = Joi.object({
    name: Joi.string().min(2).max(60).required(),
    email: Joi.string().min(6).max(60).required().email({
        tlds: {
            allowed: ['com', 'net', 'edu']
        }
    }),
    password: Joi.string().required().pattern(new RegExp(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ))
})

exports.signinSchema = Joi.object({
    email: Joi.string().min(6).max(60).required().email({
        tlds: {
            allowed: ['com', 'net', 'edu']
        }
    }),
    password: Joi.string().required().pattern(new RegExp(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ))
});

exports.acceptCodeSchema = Joi.object({
    email: Joi.string().min(6).max(60).required().email({
        tlds: { allowed: ['com', 'net', 'edu'] }
    }),
    providedCode: Joi.number().required()
});

exports.changePasswordSchema = Joi.object({
    newPassword: Joi.string().required().pattern(new RegExp(
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )),
    oldPassword: Joi.string().required().pattern(new RegExp(
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ))
});

exports.acceptFPCodeSchema = Joi.object({
    email: Joi.string().min(6).max(60).required().email({
        tlds: { allowed: ['com', 'net'] }
    }),
    providedCode: Joi.number().required(),
    newPassword: Joi.string().required().pattern(new RegExp(
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ))
});

