/**
 * @file This file contains the interfaces related to the 'Bundle' feature.
 * It defines the structure for bundles and the subjects within them.
 */

import { EBundleStatus } from "../enums/EBundleStatus.enum";

/**
 * Represents a simplified, populated user object as returned by the backend.
 */
export interface IPopulatedUser {
  _id: string;
  displayName: string;
};

/**
 * Represents a single subject within a tutoring bundle.
 * It links a subject to a specific tutor and defines the number of hours allocated.
 */
export interface IBundleSubject {
  _id: string; // The unique identifier for this subject entry in the bundle
  subject: string; // The ID of the subject being taught
  grade: string; // The grade for the subject
  tutor: string | IPopulatedUser; // The ID of the assigned tutor, or the populated tutor object
  durationMinutes: number; // The number of tutoring hours for this subject
}

/**
 * Represents a tutoring bundle.
 * A bundle is a collection of subjects that a student is enrolled in,
 * created and managed by a staff member.
 */
export interface IBundle {
  _id: string; // The unique identifier for the bundle
  student: string | IPopulatedUser; // The ID of the student this bundle is for, or the populated student object
  subjects: IBundleSubject[]; // An array of subjects included in the bundle
  createdBy: string | IPopulatedUser; // The ID of the user who created the bundle
  status: EBundleStatus; // The current status of the bundle (e.g., pending, approved)
  isActive: boolean; // Whether the bundle is currently active or not
  lessonLocation?: string; // The location where lessons take place
  manager?: string | IPopulatedUser; // The ID of the staff member managing this bundle, or the populated manager object
  stakeholders?: (string | IPopulatedUser)[]; // An array of user IDs who are stakeholders in this bundle, or populated user objects
  createdAt: Date; // The timestamp when the bundle was created
  updatedAt: Date; // The timestamp when the bundle was last updated
}