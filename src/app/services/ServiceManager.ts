import fs from "fs";
import path from "path";
import { LoggingService } from "./LoggingService";
import { IServiceClass } from "../models/interfaces/IServiceClass.interface";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";

const logger = Singleton.getInstance(LoggingService);

type ServiceModule = {
    // The named export is the class itself (e.g., export class MongoService)
    // The default export is the singleton instance.
    // This index signature allows for both types, resolving the conflict.
    [key: string]: IServiceClass | IService;
    default: IService;
};

export class ServiceManager {
    /**
     * Dynamically loads, sorts, and initializes all services from the services directory.
     */
    public static async loadServices(): Promise<void> {
        logger.info("Loading services...");

        const servicesDir = path.join(__dirname);
        // Updated filter to correctly handle compiled JS files and avoid loading itself
        const serviceFiles = fs.readdirSync(servicesDir).filter(file => 
            (file.endsWith('Service.js') || file.endsWith('Service.ts')) && 
            !file.startsWith('ServiceManager') &&
            !file.endsWith('.d.ts') &&
            !file.endsWith('.map')
        );

        const loadedServices: { name: string, module: ServiceModule }[] = [];
        for (const serviceFile of serviceFiles) {
            const moduleName = path.basename(serviceFile, path.extname(serviceFile));
            try {
                const module = await import(path.join(servicesDir, serviceFile));
                // Ensure the module has the expected structure before adding it
                if (module.default && module[moduleName]) {
                    loadedServices.push({ name: moduleName, module });
                }
            } catch (error) {
                logger.error(`Failed to load service module: ${serviceFile}`, error);
            }
        }

        // Sort services based on the static loadPriority property from the named export (the class)
        const sortedServices = loadedServices.sort((a, b) => {
            const classA = a.module[a.name] as IServiceClass;
            const classB = b.module[b.name] as IServiceClass;
            const priorityA = classA?.loadPriority ?? 0;
            const priorityB = classB?.loadPriority ?? 0;
            return priorityB - priorityA; // Higher priority first
        });

        // Initialize services in the correct order using the instance from the default export
        for (const { name, module } of sortedServices) {
            const serviceInstance = module.default;
            if (serviceInstance && typeof serviceInstance.init === 'function') {
                await serviceInstance.init();
                logger.info(`Loaded Service: ${name}`);
            }
        }
    }
}
