import { EServiceLoadPriority } from "../enums/EServiceLoadPriority.enum";
import { IService } from "./IService.interface";

export interface IServiceClass {
    new(...args: unknown[]): IService;
    loadPriority: EServiceLoadPriority;
}