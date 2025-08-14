import { EServiceLoadPriority } from "../enums/EServiceLoadPriority.enum";
import { IService } from "./IService.interface";

export interface IServiceClass {
    new(...args: any[]): IService;
    loadPriority: EServiceLoadPriority;
}