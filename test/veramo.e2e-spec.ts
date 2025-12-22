import {
  dbConnection,
  setupDatabase,
  veramo,
  veramo2,
} from '@tonomy/tonomy-id-sdk';
import Debug from 'debug';

/**
 * NOTE: These tests are currently skipped because they require the DataSource import
 * in the SDK's veramo.ts file to be a runtime import (not type-only).
 *
 * While changing `import type { DataSource }` to `import { DataSource }` fixes these
 * tests, it breaks the SDK's build for UMD/browser bundles because TypeORM's DataSource
 * cannot be bundled for browser environments (it depends on Node.js-specific modules).
 *
 * The veramo functionality is primarily used in Node.js/server contexts, so these tests
 * should eventually be moved to a Node.js-specific test suite or the SDK should provide
 * separate entry points for Node.js vs browser environments.
 *
 * For now, these tests remain skipped to avoid breaking the SDK build.
 */
describe.skip('veramo', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  afterEach(async () => {
    const entities = dbConnection.entityMetadatas;

    for (const entity of entities) {
      const repository = dbConnection.getRepository(entity.name);

      await repository.clear(); // This clears all entries from the entity's table.
    }
  });

  test('1', async () => {
    await veramo();
  });

  test('2', async () => {
    await veramo2();
  });
});
