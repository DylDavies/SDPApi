import { IService } from '../models/interfaces/IService.interface';
import { Singleton } from '../models/classes/Singleton';
import { LoggingService } from './LoggingService';
import MUser from '../db/models/MUser.model';
import MRole from '../db/models/MRole.model';
import SocketService from './SocketService';
import { EServiceLoadPriority } from '../models/enums/EServiceLoadPriority.enum';
import { ESocketMessage } from '../models/enums/ESocketMessage.enum';
import MProficiencies from '../db/models/MProficiencies.model';
import MExtraWork from '../db/models/MExtraWork.model';
import MSidebar from '../db/models/MSidebar.model';
import MBadge from '../db/models/MBadge.model';
import MEvent from '../db/models/MEvent.model';

/**
 * Listens to MongoDB change streams and broadcasts events via the SocketService.
 */
export class ChangeStreamService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Medium;
    private logger = Singleton.getInstance(LoggingService);
    private socketService = SocketService;

    public async init(): Promise<void> {
        try {
            MUser.watch().on('change', (change) => {
                if (change.updateDescription?.updatedFields.theme) return;

                if (change.operationType === 'update' && change.documentKey._id) {
                    const userId = change.documentKey._id.toString();

                    this.logger.info(`Change detected in 'users' collection for user ${userId}: ${change.operationType}`);

                    this.socketService.emitToUser(userId, ESocketMessage.CurrentUserUpdate, { change });

                    this.socketService.broadcastToTopic(ESocketMessage.UsersUpdated, { change });
                } else {
                    this.logger.info(`Change detected in 'users' collection: ${change.operationType}`);
                    this.socketService.broadcastToTopic(ESocketMessage.UsersUpdated, { change });
                }
            });

            MRole.watch().on('change', (change) => {
                this.logger.info(`Change detected in 'roles' collection: ${change.operationType}`);
                this.socketService.broadcastToTopic(ESocketMessage.RolesUpdated, { change });
            });

            MProficiencies.watch().on('change', (change) =>{
                this.logger.info(`Change detected in 'proficiencies' collection: ${ change }`);
                this.socketService.broadcastToTopic(ESocketMessage.ProficienciesUpdated, { change });
            });

            MSidebar.watch().on('change', (change) => {
                this.logger.info(`Change detected in 'SidebarItem' collection: ${ change }`);
                this.socketService.broadcastToTopic(ESocketMessage.SidebarUpdated, { change });
            })


            MExtraWork.watch().on('change', (change) => {
                this.logger.info(`Change detected in 'extrawork' collection: ${change.operationType}`);
                this.socketService.broadcastToTopic(ESocketMessage.ExtraWorkUpdated, { change });
            });

            MBadge.watch().on('change', (change) =>{
                this.logger.info(`Change detected in 'badges' collection: ${change.operationType}`);
                this.socketService.broadcastToTopic(ESocketMessage.BadgesUpdated, { change });

            });

            MEvent.watch().on('change', async (change) => {
                this.logger.info(`Change detected in 'events' collection: ${change.operationType}`);

                // Broadcast to the general topic for all users
                this.socketService.broadcastToTopic(ESocketMessage.EventsUpdated, { change });

                // Send a targeted notification to the student and tutor
                if (change.operationType === 'insert' || change.operationType === 'update') {
                    const event = await MEvent.findById(change.documentKey._id);
                    if (event) {
                        const studentId = event.student.toString();
                        const tutorId = event.tutor.toString();
                        this.socketService.emitToUser(studentId, ESocketMessage.EventsUpdated, { change });
                        this.socketService.emitToUser(tutorId, ESocketMessage.EventsUpdated, { change });
                    }
                }
            });

            this.logger.info('Now watching database collections for changes...');
        } catch (error) {
            this.logger.error('Failed to initialize Change Stream Service', error);
            throw error;
        }
    }
}

export default Singleton.getInstance(ChangeStreamService);