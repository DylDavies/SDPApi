import { Schema, model, Document, Types } from 'mongoose';
import { EMissionStatus } from '../../models/enums/EMissions.enum';


export  interface IMissions extends Document{
    _id: Types.ObjectId;
    bundleId: Types.ObjectId; 
    documentPath: string; // To store the file path
    documentName: string; // To store the original filename // URL or reference to the document/mission details
    student: Types.ObjectId; // The ID of the student this bundle is for, or the populated student object
    tutor: Types.ObjectId; //Id of tutor who wrote the mission
    createdAt: Date; // Automatically managed by timestamps
    remuneration: number; // The payment for the mission
    commissionedBy: Types.ObjectId;
    hoursCompleted: number;
    dateCompleted: Date; // The date the mission is scheduled for
    status: EMissionStatus;
    updatedAt: Date; // Automatically managed by timestamps
}

const MissionSchema = new Schema<IMissions>({
  bundleId: { 
    type: Schema.Types.ObjectId,
    ref: 'Bundle',
    required: true
  },
  documentPath: {
    type: String, 
    required: true,
  },
  documentName: {
      type: String,
      required: true,
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Creates a reference to User model
    required: true
  },
    tutor: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Creates a reference to User model
    required: true
  },
  remuneration: {
    type: Number,
    required: true,
    min: 0
  },
  commissionedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Creates a reference to the commissioning user
    required: true
  },
  hoursCompleted: {
    type: Number,
    default: 0
  },
  dateCompleted: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(EMissionStatus), // Ensures status is one of the defined enum values
    default: EMissionStatus.Active
  }
}, {

  timestamps: true
});

// Create and export the Mongoose model
const MMission = model<IMissions>('Mission', MissionSchema);

export default MMission;