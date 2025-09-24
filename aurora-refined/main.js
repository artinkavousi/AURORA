import { bootstrap } from './src/core/bootstrap.js';

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[aurora-refined] bootstrap failed', error);
});
