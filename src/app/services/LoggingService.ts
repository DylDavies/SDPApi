import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";

enum ELogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

export class LoggingService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.None;

    // ANSI escape codes for colors
    private readonly colors = {
        reset: "\x1b[0m",
        red: "\x1b[31m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        gray: "\x1b[90m", // Added gray color
    };

    constructor() {}

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Logs a debug message.
     * @param message The primary message to log.
     * @param context Optional context or additional data to log.
     */
    public debug(message: string, context?: unknown): void {
        this.log(message, ELogLevel.DEBUG, context);
    }

    /**
     * Logs an informational message.
     * @param message The primary message to log.
     * @param context Optional context or additional data to log.
     */
    public info(message: string, context?: unknown): void {
        this.log(message, ELogLevel.INFO, context);
    }

    /**
     * Logs a warning message.
     * @param message The primary message to log.
     * @param context Optional context or additional data to log.
     */
    public warn(message: string, context?: unknown): void {
        this.log(message, ELogLevel.WARN, context);
    }

    /**
     * Logs an error message.
     * @param message The primary message to log.
     * @param context Optional context or additional data, often an error object.
     */
    public error(message: string, context?: unknown): void {
        this.log(message, ELogLevel.ERROR, context);
    }

    /**
     * The core logging method that formats and outputs the message.
     * @param message The message string.
     * @param level The log level (DEBUG, INFO, WARN, ERROR).
     * @param context Any additional data to be logged.
     */
    private log(message: string, level: ELogLevel, context?: unknown): void {
        const timestamp = new Date().toISOString();
        const color = this.getColorForLevel(level);

        const logLine = `${color}[${level}] - ${timestamp} - ${message}${this.colors.reset}`;
        
        console.log(logLine);

        if (context) {
            if (context instanceof Error) {
                console.error(context);
            } else {
                console.log(context);
            }
        }
    }

    /**
     * Gets the appropriate ANSI color code for a given log level.
     * @param level The log level.
     * @returns The ANSI color code string.
     */
    private getColorForLevel(level: ELogLevel): string {
        switch (level) {
            case ELogLevel.ERROR:
                return this.colors.red;
            case ELogLevel.WARN:
                return this.colors.yellow;
            case ELogLevel.INFO:
                return this.colors.gray; // Changed to gray
            case ELogLevel.DEBUG:
                return this.colors.magenta;
            default:
                return this.colors.reset;
        }
    }
}