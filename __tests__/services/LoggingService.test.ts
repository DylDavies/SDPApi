import { LoggingService } from '../../src/app/services/LoggingService';

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('LoggingService', () => {
    let logger: LoggingService;

    beforeEach(() => {
        consoleLogSpy.mockClear();
        consoleErrorSpy.mockClear();

        logger = LoggingService.getInstance();
    });

    it('should be a singleton', () => {
        const instance1 = LoggingService.getInstance();
        const instance2 = LoggingService.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should log an info message with the correct format', () => {
        logger.info('Test info message');
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test info message'));
    });

    it('should log a warning message', () => {
        logger.warn('Test warn message');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
    });

    it('should log a debug message', () => {
        logger.debug('Test debug message');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
    });

    it('should log an error message', () => {
        logger.error('Test error message');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    });

    it('should log context object on a new line', () => {
        const context = { userId: 123 };
        logger.info('Message with context', context);

        expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        expect(consoleLogSpy).toHaveBeenCalledWith(context);
    });

    it('should log an Error object stack trace using console.error', () => {
        const error = new Error('Something went wrong');
        logger.error('An error occurred', error);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('An error occurred'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });
});