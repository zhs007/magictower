// Compatibility shim: some tooling expects the Fastify app entry at src/app.ts.
// Re-export the actual server implementation so both names stay in sync.
export { default } from './server';
export * from './server';
