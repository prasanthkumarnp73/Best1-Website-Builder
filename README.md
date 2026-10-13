# Best1 Technologies Website Builder

## Deploy to Render

This project is a Node.js/Express web service. The root-level [`render.yaml`](./render.yaml) Blueprint configures Render to:

- Deploy the `main` branch as the `best1-website-builder` web service, in the Singapore region.
- Install dependencies with `npm install` and start the app with `npm start`.
- Check service health at `/` and automatically deploy new commits.
- Use Groq's OpenAI-compatible API endpoint for the website builder.

To create the service:

1. Push the project to the GitHub repository and `main` branch.
2. In Render, select **New + → Blueprint**, connect the repository, and select `main`.
3. Review and apply the Blueprint. Render will prompt for `OPENAI_API_KEY`; enter the Groq API key there. Do not commit API keys or put them in `render.yaml`.
4. After the first deploy, open the service's **Environment** tab to update `OPENAI_API_KEY` or other environment variables. `OPENAI_BASE_URL` and `GROQ_MODEL` are set in the Blueprint.

The app reads `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and optionally `GROQ_MODEL`. It does not currently use a `WHATSAPP_ACCESS_TOKEN` or a `GROQ_API_KEY` environment variable; its WhatsApp link is a direct `wa.me` link.

The service name suggests the default URL `https://best1-website-builder.onrender.com`, if that Render subdomain is available. Confirm the URL in the Render dashboard after creation. The Singapore region is the closest configured Render region to India. A custom domain can be attached from the service's **Settings** tab.

The Blueprint uses Render's free instance plan. Its filesystem is ephemeral: generated websites and slideshow videos may be lost when the service restarts or redeploys. Use a persistent disk and configure the app's output directories before relying on Render to retain generated files.

### Repository

The repository URL currently configured as this checkout's Git remote is [`https://github.com/prasanthkumarnp73/Best1-Website-Builder`](https://github.com/prasanthkumarnp73/Best1-Website-Builder). Confirm this is the intended repository when connecting it in Render.