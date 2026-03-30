import { createApp } from "./app.js";

async function start() {
  const { app, env } = await createApp();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
