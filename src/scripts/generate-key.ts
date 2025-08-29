/**
 * Standalone script to generate a new API key.
 *
 * How to run:
 * 1. Make sure you have `ts-node` and `dotenv` installed:
 * npm install -g ts-node
 * npm install dotenv
 * 2. Run the script from your project's root directory:
 * ts-node src/scripts/generate-key.ts
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import readline from 'readline';
import dotenv from 'dotenv';
import { ApiKey } from '../app/db/models/MAPIKey.model';

dotenv.config();

// --- Database Connection ---
const connectDB = async () => {
  try {
    const mongoUri = process.env.DB_CONN_STRING;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in your .env file.');
    }
    await mongoose.connect(mongoUri, {
        dbName: process.env.DB_NAME
    });
    console.log('MongoDB Connected...');
  } catch (err: any) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

// --- Main Function ---
const generateKey = async () => {
  await connectDB();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter a client name for the new API key: ', async (clientName) => {
    if (!clientName) {
      console.error('Client name cannot be empty.');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    try {
      const plainTextKey = crypto.randomBytes(32).toString('hex');

      const newApiKey = new ApiKey({
        clientName,
        key: plainTextKey,
      });

      await newApiKey.save();

      console.log('\n--------------------------------------------------');
      console.log(`✅ API Key for '${clientName}' created successfully!`);
      console.log('--------------------------------------------------');
      console.log('\n🔒 IMPORTANT: Share this key with the client. This is the only time it will be shown in plain text.');
      console.log(`\n🔑 API Key: ${plainTextKey}\n`);
      console.log('--------------------------------------------------');

    } catch (error: any) {
      if (error.code === 11000) { // Duplicate key error
        console.error(`\n❌ Error: An API key for the client '${clientName}' already exists.`);
      } else {
        console.error('\n❌ An error occurred while generating the key:', error.message);
      }
    } finally {
      rl.close();
      await mongoose.disconnect();
      console.log('MongoDB Disconnected.');
    }
  });
};

// --- Run the script ---
generateKey();
