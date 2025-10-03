import mongoose from 'mongoose';

export async function connectDB(
	uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://mongo:27017/fin_tool'
){
	try {
    	mongoose.set('strictQuery', true);
    	await mongoose.connect(uri);
    	console.log(`MongoDB connected: ${mongoose.connection.name}`);
    	return mongoose.connection;
	} catch (err) {
    	console.error('Error connecting to MongoDB:', err.message);
    	process.exit(1);
  	}
}