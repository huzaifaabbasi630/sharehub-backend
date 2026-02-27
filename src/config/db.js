const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    console.log('URI:', uri ? uri.replace(/:([^:@]+)@/, ':****@') : 'Not set, using localhost');
    
    const conn = await mongoose.connect(uri || 'mongodb://localhost:27017/sharehub');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };