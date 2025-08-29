import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IApiKey extends Document {
  clientName: string;
  key: string; // HASHED key
  compareKey: (candidateKey: string) => Promise<boolean>;
}

const ApiKeySchema = new Schema<IApiKey>({
  clientName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  key: {
    type: String,
    required: true,
  }
}, { timestamps: true });

// --- Hashing Middleware ---
// This function runs BEFORE a new key is saved.
// It takes the plain-text key and hashes it.
ApiKeySchema.pre<IApiKey>('save', async function (next) {
  if (!this.isModified('key')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.key = await bcrypt.hash(this.key, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// --- Comparison Method ---
// This method allows us to compare a plain-text key from a request
// with the hashed key stored in the database.
ApiKeySchema.methods.compareKey = async function (candidateKey: string): Promise<boolean> {
  return bcrypt.compare(candidateKey, this.key);
};

export const ApiKey = model<IApiKey>('ApiKey', ApiKeySchema);
