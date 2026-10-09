# Eclipse Groq backend

This backend keeps the Groq API key off the public Surge HTML site.

## Deploy the backend

1. Create a new GitHub repository and upload the files in this folder (`server.js`, `package.json`, and `.env.example`). Do not upload a real `.env` file or API key.
2. Create a Railway service from that repository.
3. In Railway's service Variables, add:
   - `GROQ_API_KEY` = a newly created key from https://console.groq.com/keys
   - `GROQ_MODEL` = `llama-3.3-70b-versatile`
   - `ALLOWED_ORIGINS` = `https://eclipse-main.surge.sh`
4. Deploy, then create/enable a public HTTPS domain for the service.
5. Open `eclipse-main-groq.html` and replace `https://YOUR-BACKEND.up.railway.app/api/chat` with `https://YOUR-ACTUAL-BACKEND-DOMAIN/api/chat`.
6. Rename the edited HTML to the site's original entry filename (usually `index.html`) and redeploy it to Surge.
7. Test `https://YOUR-ACTUAL-BACKEND-DOMAIN/health`; it should return `{"ok":true}`.

The backend allows browser requests only from `https://eclipse-main.surge.sh` by default and rate-limits the API endpoint. If you use another custom frontend domain, add it to `ALLOWED_ORIGINS` as a comma-separated origin list.
