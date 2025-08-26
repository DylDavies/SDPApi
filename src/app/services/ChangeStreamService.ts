import { IService } from '../models/interfaces/IService.interface';
import { Singleton } from '../models/classes/Singleton';
import { LoggingService } from './LoggingService';
import MUser from '../db/models/MUser.model';
import MRole from '../db/models/MRole.model';
import SocketService from './SocketService';
import { EServiceLoadPriority } from '../models/enums/EServiceLoadPriority.enum';
import { ESocketMessage } from '../models/enums/ESocketMessage.enum';

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
                this.logger.info(`Change detected in 'users' collection: ${change.operationType}`);
                this.socketService.broadcast(ESocketMessage.UsersUpdated, { change });
            });

            MRole.watch().on('change', (change) => {
                this.logger.info(`Change detected in 'roles' collection: ${change.operationType}`);
                this.socketService.broadcast(ESocketMessage.RolesUpdated, { change });
            });

            this.logger.info('Now watching database collections for changes...');
        } catch (error) {
            this.logger.error('Failed to initialize Change Stream Service', error);
            throw error;
        }
    }
}

export default Singleton.getInstance(ChangeStreamService);
