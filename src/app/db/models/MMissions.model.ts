import { Schema, model, Document, Types } from 'mongoose';
import { EMissionStatus } from '../../models/enums/EMissions.enum';

export interface IMissions extends Document {
    _id: Types.ObjectId;
    bundleId: Types.ObjectId;
    document: Types.ObjectId; // Changed from documentPath and documentName
    student: Types.ObjectId;
    tutor: Types.ObjectId;
    createdAt: Date;
    remuneration: number;
    commissionedBy: Types.ObjectId;
    hoursCompleted: number;
    dateCompleted: Date;
    status: EMissionStatus;
    updatedAt: Date;
}

const MissionSchema = new Schema<IMissions>({
  bundleId: {
    type: Schema.Types.ObjectId,
    ref: 'Bundle',
    required: true
  },
  document: { // Changed from documentPath and documentName
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tutor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  remuneration: {
    type: Number,
    required: true,
    min: 0
  },
  commissionedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
    enum: Object.values(EMissionStatus),
    default: EMissionStatus.Active
  }
}, {
  timestamps: true
});

const MMission = model<IMissions>('Mission', MissionSchema);

export default MMission;