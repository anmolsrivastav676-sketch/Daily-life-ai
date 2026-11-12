DAILY LIFE AI SHOPPING AGENT V4

Files:
- index.html: frontend
- server.js: Node.js backend proxy
- package.json: start command

Run:
1. Install Node.js 18 or newer on a computer/server.
2. In this folder run: npm start
3. Open http://localhost:3000

IMPORTANT:
- This is not a standalone HTML-only app. The backend is required because the PriceInIndia service uses MCP Streamable HTTP.
- Do not put API secrets in index.html. This integration uses the public no-key PriceInIndia MCP endpoint.
- Search is read-only. It cannot order or pay.
- Price data excludes delivery, coupons and bank offers; confirm final checkout price.
- Ratings/review data may not be supplied. The app deliberately does not invent quality scores.
