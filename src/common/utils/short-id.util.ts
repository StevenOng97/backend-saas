import { customAlphabet } from 'nanoid';

// Create a custom nanoid generator with only numbers (0-9) and 6 digits length
const generateShortId = customAlphabet('1234567890abcdef', 6);

export function createShortId(): string {
  return generateShortId();
}

/**
 * Generate a unique short ID with collision handling
 * @param checkExists - Function that returns true if the ID already exists
 * @param maxAttempts - Maximum number of attempts to generate a unique ID
 * @returns A unique short ID
 */
export async function createUniqueShortId(
  checkExists: (id: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const shortId = generateShortId();
    const exists = await checkExists(shortId);
    
    if (!exists) {
      return shortId;
    }
    
    // If we've reached max attempts, throw an error
    if (attempt === maxAttempts) {
      throw new Error(`Failed to generate unique short ID after ${maxAttempts} attempts`);
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw new Error('Unexpected error in short ID generation');
}

export { generateShortId }; 