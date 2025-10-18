import { Singleton } from "../models/classes/Singleton";
import { LoggingService } from "./LoggingService";
import { IService } from "../models/interfaces/IService.interface";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import UserService from "./UserService";
import GoogleMapsService from "./GoogleMapsService";
import { IUser } from "../db/models/MUser.model";
import { IAddress } from "../models/interfaces/IAddress.interface";
import { EUserType } from "../models/enums/EUserType.enum";

export interface MatchmakingCriteria {
    lessonLocation: IAddress;
    subject?: string;
    proficiency?: string;
    grade?: string;
    hoursPerWeek: number;
    maxDistance?: number; // in kilometers
}

export interface MatchedTutor {
    _id: string;
    displayName: string;
    email: string;
    address?: IAddress;
    proficiencies: any[];
    availability: number;
    distance: number | null; // Distance in km, null if calculation failed
    matchScore: number; // Higher score = better match
}

/**
 * Service for matching tutors to bundle requirements based on
 * availability, subject proficiency, and distance from lesson location
 */
export class MatchmakingService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;
    private logger = Singleton.getInstance(LoggingService);
    private userService = UserService;
    private mapsService = GoogleMapsService;

    public async init(): Promise<void> {
        this.logger.info('MatchmakingService initialized');
        return Promise.resolve();
    }

    /**
     * Finds and ranks tutors based on matchmaking criteria
     * @param criteria The search criteria including location, hours, and optionally subject/proficiency
     * @returns Array of matched tutors sorted by match score (best first)
     */
    public async findMatchingTutors(criteria: MatchmakingCriteria): Promise<MatchedTutor[]> {
        const { lessonLocation, subject, proficiency, grade, hoursPerWeek, maxDistance } = criteria;

        // Get all users
        const allUsers = await this.userService.getAllUsers();

        // Filter to only staff (tutors)
        const tutors = allUsers.filter(user =>
            (user.type === EUserType.Staff || user.type === EUserType.Admin) &&
            !user.disabled &&
            !user.pending
        );

        // Filter and score tutors
        const matchedTutors: MatchedTutor[] = [];

        for (const tutor of tutors) {
            // Check if tutor has the required subject proficiency (only if subject is specified)
            if (subject) {
                const hasSubject = this.tutorHasSubject(tutor, subject, proficiency, grade);
                if (!hasSubject) {
                    continue; // Skip tutors without the required subject
                }
            }

            // Check if tutor has sufficient availability
            const tutorAvailability = tutor.availability || 0;
            if (tutorAvailability < hoursPerWeek) {
                continue; // Skip tutors without enough availability
            }

            // Calculate distance from lesson location
            let distance: number | null = null;
            if (tutor.address && lessonLocation) {
                try {
                    distance = await this.mapsService.calculateDistance(tutor.address, lessonLocation);
                } catch (error) {
                    this.logger.warn(`Failed to calculate distance for tutor ${tutor._id}:`, error);
                }
            }

            // Skip if distance exceeds max distance (when specified)
            if (maxDistance && distance !== null && distance > maxDistance) {
                continue;
            }

            // Calculate match score
            const matchScore = this.calculateMatchScore(tutor, distance, tutorAvailability, hoursPerWeek);

            matchedTutors.push({
                _id: tutor._id.toString(),
                displayName: tutor.displayName,
                email: tutor.email,
                address: tutor.address,
                proficiencies: tutor.proficiencies || [],
                availability: tutorAvailability,
                distance,
                matchScore
            });
        }

        // Sort by match score (highest first)
        matchedTutors.sort((a, b) => b.matchScore - a.matchScore);

        const subjectInfo = subject ? `for subject "${subject}"` : 'based on availability and distance';
        this.logger.info(`Found ${matchedTutors.length} matching tutors ${subjectInfo}`);

        return matchedTutors;
    }

    /**
     * Checks if a tutor has proficiency in a specific subject
     * @param tutor The tutor to check
     * @param subjectName The name of the subject
     * @param proficiencyName Optional proficiency name to filter by
     * @param gradeName Optional grade name to filter by
     * @returns true if tutor has the subject, false otherwise
     */
    private tutorHasSubject(tutor: IUser, subjectName: string, proficiencyName?: string, gradeName?: string): boolean {
        if (!tutor.proficiencies || tutor.proficiencies.length === 0) {
            return false;
        }

        for (const prof of tutor.proficiencies) {
            // If proficiency name is specified, only check that proficiency
            if (proficiencyName && prof.name !== proficiencyName) {
                continue;
            }

            // Check if the subject exists in this proficiency
            if (prof.subjects) {
                const subjects = prof.subjects instanceof Map
                    ? Array.from(prof.subjects.values())
                    : Object.values(prof.subjects);

                const hasSubject = subjects.some((sub: any) => {
                    const subjectMatches = sub.name.toLowerCase() === subjectName.toLowerCase();

                    if (!subjectMatches) {
                        return false;
                    }

                    // If grade is specified, check if tutor can teach that grade
                    if (gradeName && sub.grades && Array.isArray(sub.grades)) {
                        return sub.grades.some((g: string) => g.toLowerCase() === gradeName.toLowerCase());
                    }

                    return true;
                });

                if (hasSubject) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Calculates a match score for a tutor based on various criteria
     * Higher score = better match
     *
     * Scoring factors:
     * - Availability: Higher availability gets significantly higher scores (50 points max)
     * - Distance: Closer tutors get higher scores (30 points max)
     * - Exact availability match bonus (20 points max)
     *
     * @param tutor The tutor being scored
     * @param distance Distance from lesson location (in km)
     * @param availability Tutor's availability in hours
     * @param hoursNeeded Hours needed for the bundle
     * @returns Match score (0-100)
     */
    private calculateMatchScore(
        tutor: IUser,
        distance: number | null,
        availability: number,
        hoursNeeded: number
    ): number {
        let score = 0;

        // Availability score (50 points max) - WEIGHTED HIGHER
        // More availability relative to needs = better match
        const availabilityRatio = availability / hoursNeeded;
        if (availabilityRatio >= 4) {
            score += 50; // Lots of spare capacity
        } else if (availabilityRatio >= 3) {
            score += 45; // Very good availability
        } else if (availabilityRatio >= 2) {
            score += 40; // Good availability
        } else if (availabilityRatio >= 1.5) {
            score += 32; // Moderate availability
        } else if (availabilityRatio >= 1.2) {
            score += 25; // Adequate availability
        } else {
            score += 15; // Just barely enough
        }

        // Distance score (30 points max) - WEIGHTED LOWER
        // Closer = better. No distance data = neutral score
        if (distance !== null) {
            if (distance <= 5) {
                score += 30; // Very close
            } else if (distance <= 10) {
                score += 26; // Close
            } else if (distance <= 20) {
                score += 22; // Moderate distance
            } else if (distance <= 50) {
                score += 15; // Far
            } else {
                score += 8; // Very far
            }
        } else {
            score += 15; // No distance data = neutral
        }

        // Bonus for tutors with exactly the right amount of availability (20 points max)
        const exactnessScore = Math.max(0, 20 - Math.abs(availability - hoursNeeded) * 2);
        score += exactnessScore;

        return Math.min(100, score); // Cap at 100
    }
}

export default Singleton.getInstance(MatchmakingService);
