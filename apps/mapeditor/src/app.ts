// Compatibility entry: some dev tooling / plugins expect `src/app.ts` as the
// server entry. Re-export the real server implementation from `server.ts` so
// those tools can find it regardless of which entry name they try.
export { default } from './server';
