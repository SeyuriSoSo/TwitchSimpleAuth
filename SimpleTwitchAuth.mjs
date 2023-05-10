import open from 'open';
import express from 'express';
import querystring from 'querystring';


const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const randomString = length => {
    var result = ' ';
    for ( let i = 0; i < length; i++ )
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    return result;
};


class SimpleTwitchAuth {
    config = undefined;
    loopRefresh = true;
    tempPort = undefined;
    auth = undefined;
    authRefreshValid = false;
    urls = {
        "authorize": "https://id.twitch.tv/oauth2/authorize",
        "token": "https://id.twitch.tv/oauth2/token"
    }

    constructor(credentials, tempPort = 5853) {
        this.config = credentials;
        this.tempPort = tempPort;
        this.auth = undefined;
    }

    async obtainAuth(openBrowser = false, checkingMs = 250) {
        const auxApp = express();
        const tempRouter = express.Router();
        const auxAppListen = auxApp.listen(this.tempPort, () => {
            if (openBrowser === true)
                open(`http://localhost:${this.tempPort}/auth`);
        });

        auxApp.use(tempRouter);

        tempRouter.get('/auth', (req, res) => {
            res.status(200).redirect(this.urlAuth());
        });

        tempRouter.get('/callback', async (req, res) => {
            const { code } = req.query;

            if (!code)
                return res.status(401).json({ message: 'Callback doesnt have a valid code' });

            const authData = await fetch(this.urlCallback(code), { 'method': 'POST' })
                .then((response) => response.json())
                .catch((err) => {
                console.log('Fetch failed in callback response');
                return res.status(400).json({ message: 'Fetch failed in callback response' });
            })
            this.auth = authData;

            if (this.auth !== undefined) {
                this.authRefreshValid = true;
            }

            res.status(200).json({ 'message': 'Code provided successfully' });
            await auxAppListen.close(() => {
                // console.log('Temp auth app closed')
            });
        });

        while (this.auth === undefined) {
            await new Promise(resolve => setTimeout(resolve, checkingMs));
        }
    }

    async refreshAuthLoop(graceMs = 250) {
        while (this.loopRefresh) {
            await new Promise(resolve => setTimeout(resolve, this.auth.expires_in - graceMs));
            await this.refreshAuth();
        }
    }

    async refreshAuth() {
        try {
            const responsePost = fetch(this.urlRefresh(), {
                'method': 'POST',
                'headers': { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.auth = await responsePost
                .then(response => response.json())
            this.authRefreshValid = true;
        } catch(err) { this.authRefreshValid = false; }
    }

    urlAuth() { return `${this.urls.authorize}?` + querystring.stringify({
        'response_type': 'code',
        'client_id': this.config.client_id,
        'redirect_uri': this.config.redirect_uri,
        'scope': this.config.scopes.join(' '),
        'state': randomString(16)
    })};
    urlCallback(code) {
        return `${this.urls.token}?` + querystring.stringify({
            'client_id': this.config.client_id,
            'client_secret': this.config.client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': this.config.redirect_uri
        });
    }
    urlRefresh() {
        return `${this.urls.token}?` + querystring.stringify({
            'grant_type': 'refresh_token',
            'refresh_token': this.auth.refresh_token,
            'client_id': this.config.client_id,
            'client_secret': this.config.client_secret
        });
    }
}

export default SimpleTwitchAuth;
