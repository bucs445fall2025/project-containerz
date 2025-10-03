const Joi = require('joi');

exports.signupSchema = Joi.object({
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