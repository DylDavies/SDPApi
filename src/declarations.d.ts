declare module 'zeptomail' {
  /**
   * This provides a basic type definition for the SendMailClient class,
   * allowing TypeScript to understand its shape.
   */
  export class SendMailClient {
    constructor(options: { url: string; token: string });

    /**
     * Defines the shape of the sendMail method.
     * We use 'any' for the options and return type for simplicity,
     * as we don't need to type-check the library's internal logic.
     */
    sendMail(options: any): Promise<any>;
  }
}