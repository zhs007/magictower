const start = async () => {
  try {
    const mod = await import('./app');
    const createApp = mod.default;
    const server = createApp();
    await server.listen({ host: '127.0.0.1', port: 3000 });
    console.log('Mapeditor server listening on http://127.0.0.1:3000');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
};

start();
