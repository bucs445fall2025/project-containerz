const mongoose = require('mongoose');

exports.connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGO_URI (or MONGODB_URI) env var missing');
        }
        await mongoose.connect(uri);
        console.log("MONGODB CONNECTED!");
    } catch (error) {
        console.log("Error connecting to MongoDB", error);
        process.exit(1);
    }
}
