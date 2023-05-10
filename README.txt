import SimpleTwitchAuth from "./index.mjs"

var config = {
    "redirect_uri": "http://localhost:9000/callback", // the redirect is by the port in constructor
    "client_id": "r9mrng47kc2gswg4xm4xdcdhsj4nys",
    "client_secret": "xmom9doi5cmc2bdk4ky8qufp7p0iv2",
    "scopes": ["chat:read", "chat:edit"]
}

async function main() {
    const twithAuth = new SimpleTwitchAuth(config, 9000);

    await twithAuth.obtainAuth();

    twithAuth.refreshAuthLoop();
}

main();