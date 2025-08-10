enum ELogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

export class LoggingService {
    private static instance: LoggingService;

    // ANSI escape codes for colors
    private readonly colors = {
        reset: "\x1b[0m",
        red: "\x1b[31m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        gray: "\x1b[90m", // Added gray color
    };

    private constructor() {}

    /**
     * Gets the single instance of the LoggingService.
     * @returns The singleton instance of LoggingService.
     */
    public static getInstance(): LoggingService {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }

    /**
     * Logs a debug message.
     * @param message The primary message to log.
     * @param context Optional context or additional data to log.
     */
    public debug(message: string, context?: any): void {
        this.log(message, ELogLevel.DEBUG, context);
    }

    /**
     * Logs an informational message.
     * @param message The primary message to log.
     * @param context Optional context or additional data to log.
     */
    public info(message: string, context?: any): void {
        this.log(message, ELogLevel.INFO, context);
    }

    /**
     * Logs a warning message.
     * @param message The primary message to log.
     * @param context Optional context or additional data to log.
     */
    public warn(message: string, context?: any): void {
        this.log(message, ELogLevel.WARN, context);
    }

    /**
     * Logs an error message.
     * @param message The primary message to log.
     * @param context Optional context or additional data, often an error object.
     */
    public error(message: string, context?: any): void {
        this.log(message, ELogLevel.ERROR, context);
    }

    /**
     * Gets the file path of the code that called the logger.
     * This is done by parsing the V8 stack trace.
     * @returns A string representing the relative file path, or 'unknown file'.
     */
    private getCallerFile(): string {
        const err = new Error();
        const stack = err.stack?.split('\n');

        // The stack trace structure is:
        // 0: Error
        // 1: at LoggingService.getCallerFile ...
        // 2: at LoggingService.log ...
        // 3: at LoggingService.info / .debug etc. ...
        // 4: at <the actual caller> ...  <-- This is the line we want.
        if (stack && stack.length > 4) {
            const callerLine = stack[4].trim();

            const match = callerLine.match(/((?:[A-Z]:\\|\/)[^:]+):\d+:\d+/);
            
            if (match && match[1]) {
                let filePath = match[1];
                
                // Make path relative to the project root
                let relativePath = filePath.replace(process.cwd(), '');
                
                // Remove the build directory (e.g., /dist or \dist) from the start of the path
                relativePath = relativePath.replace(/^[\/\\]dist/, '');
                
                return relativePath;
            }
        }
        return 'unknown file';
    }

    /**
     * The core logging method that formats and outputs the message.
     * @param message The message string.
     * @param level The log level (DEBUG, INFO, WARN, ERROR).
     * @param context Any additional data to be logged.
     */
    private log(message: string, level: ELogLevel, context?: any): void {
        const timestamp = new Date().toISOString();
        const color = this.getColorForLevel(level);
        //const callerFile = this.getCallerFile();

        // const logLine = `${color}[${level}] - ${timestamp} - [${callerFile}] - ${message}${this.colors.reset}`;
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