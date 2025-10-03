const mongoose = require('mongoose');

exports.connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MONGODB CONNECTED!");
    } catch (error) {
        console.log("Error connecting to MongoDB", error);
        process.exit(1);
    }
}