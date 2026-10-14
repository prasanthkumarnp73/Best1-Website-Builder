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

## Business storefront templates

`templates/categories.json` is the catalog for supported business types, including keyword aliases, category-specific copy, products, services, and artwork colors. It covers the requested local-shop categories and the existing automotive, business, ecommerce, and portfolio templates.

Run `npm run templates:build` to create category folders and refresh their shared About, Services, and Contact pages and `images/` assets. Existing category-specific homepages and styles are preserved. The generated SVG illustrations are local to each category, so generated storefronts do not depend on external stock-image URLs.

When a website is requested, the backend first checks the prompt for a specific business category, then falls back to the AI-selected category. It generates the home page at `/sites/business-name.html`, supporting pages at `/sites/business-name-about.html`, `/sites/business-name-services.html`, and `/sites/business-name-contact.html`, and copies the category's CSS, JavaScript, and images to `/sites/business-name-assets/`.

The services page displays category-specific products and services without inventing prices. Product buttons collect selections and use the provided business phone or email to start an order enquiry. The contact page includes call, email, WhatsApp, address, and map links; those links use only details supplied in the website request.