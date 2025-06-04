import { createShortId, createUniqueShortId } from '../src/common/utils/short-id.util';

async function testShortIdGeneration() {
  console.log('Testing Short ID Generation...\n');

  // Test basic short ID generation
  console.log('Generated Short IDs:');
  for (let i = 0; i < 10; i++) {
    const shortId = createShortId();
    console.log(`  ${i + 1}. ${shortId}`);
  }

  // Test unique short ID generation with collision simulation
  console.log('\nTesting Unique Short ID Generation with collision simulation:');
  const existingIds = new Set(['abc123', 'def456', '789xyz']);
  
  const uniqueShortId = await createUniqueShortId(async (id: string) => {
    // Simulate checking if ID exists
    const exists = existingIds.has(id);
    if (exists) {
      console.log(`    Collision detected for ID: ${id}, generating new one...`);
    }
    return exists;
  });
  
  console.log(`Generated unique short ID: ${uniqueShortId}`);
  
  // Verify it's not in the existing set
  console.log(`Is unique (not in existing set): ${!existingIds.has(uniqueShortId)}`);
}

testShortIdGeneration().catch(console.error); 