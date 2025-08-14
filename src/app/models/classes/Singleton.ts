import { IService } from "../interfaces/IService.interface";
import { IServiceClass } from "../interfaces/IServiceClass.interface";

export class Singleton {
    private static instances: Map<IServiceClass, IService> = new Map();

    public static getInstance<T extends IServiceClass>(serviceClass: T): InstanceType<T> {
        if (!Singleton.instances.has(serviceClass)) {
            Singleton.instances.set(serviceClass, new serviceClass());
        }

        return Singleton.instances.get(serviceClass) as InstanceType<T>;
    }
}