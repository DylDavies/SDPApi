/**
 * A generic Singleton factory class.
 * It can create and manage a single instance of any class that has a parameter-less constructor.
 */
export class Singleton {
    // The map is now generic, storing any constructor and its corresponding instance.
    private static instances: Map<unknown, unknown> = new Map();

    /**
     * Gets the single instance of a given class. If an instance doesn't exist, it creates one.
     * @param serviceClass The class to get an instance of.
     * @returns The singleton instance of the class.
     */
    public static getInstance<T extends { new(...args: unknown[]): object }>(serviceClass: T): InstanceType<T> {
        if (!Singleton.instances.has(serviceClass)) {
            Singleton.instances.set(serviceClass, new serviceClass());
        }
        return Singleton.instances.get(serviceClass) as InstanceType<T>;
    }
}
