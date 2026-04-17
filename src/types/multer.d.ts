/**
 * Multer type declarations to fix Express.Multer.File namespace issues
 * This file ensures VSCode's TypeScript language service correctly recognizes
 * the Multer.File type from @types/multer
 */

// Re-export the File interface from @types/multer's global declaration
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        /** Name of the form field associated with this file. */
        fieldname: string;
        /** Name of the file on the uploader's computer. */
        originalname: string;
        /** Value of the `Content-Transfer-Encoding` header for this file. */
        encoding: string;
        /** Value of the `Content-Type` header for this file. */
        mimetype: string;
        /** Size of the file in bytes. */
        size: number;
        /** A readable stream of this file. */
        stream: import('stream').Readable;
        /** `DiskStorage` only: Directory to which this file has been uploaded. */
        destination: string;
        /** `DiskStorage` only: Name of this file within `destination`. */
        filename: string;
        /** `DiskStorage` only: Full path to the uploaded file. */
        path: string;
        /** `MemoryStorage` only: A Buffer containing the entire file. */
        buffer: Buffer;
      }
    }
  }
}

export {};
