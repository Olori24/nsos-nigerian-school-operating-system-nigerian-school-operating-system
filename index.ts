import { createApplication } from "./server/_core/app";

const app = createApplication({ spaFallback: true });

// Preserve raw webhook request bytes for provider signature verification.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
