# email-auth

[![Greenkeeper badge](https://badges.greenkeeper.io/ForbesLindesay/email-auth.svg)](https://greenkeeper.io/)

Email verification for login

[![Build Status](https://img.shields.io/travis/ForbesLindesay/email-auth/master.svg)](https://travis-ci.org/ForbesLindesay/email-auth)
[![Dependency Status](https://img.shields.io/david/ForbesLindesay/email-auth/master.svg)](http://david-dm.org/ForbesLindesay/email-auth)
[![NPM version](https://img.shields.io/npm/v/email-auth.svg)](https://www.npmjs.org/package/email-auth)

## Installation

```
npm install email-auth --save
```

## Usage

```js
const emailAuth = require('email-auth');

// this should be a database really
let nextID = 0;
const tokens = {};

const client = createClient({
  saveToken({email, token, expiry}) {
    // save the token and return the id of the saved token, this can return a Promise
    const id = nextID++;
    tokens[id] = {email, token, expiry};
    return id;
  },
  getTokenByID(id) {
    // get the token at that id, can return a Promise
    return tokens[id];
  },
  sendEmail({toAddress, url}) {
    // send the message using to the to email asking the user to click on the url
  },
});

// to send verification e-mail
client.sendMessage('forbes@lindesay.co.uk', 'https://example.com').done();

// to verify/complete a login
app.get('/', (req, res, next) => {
  if (req.query.token_id && req.query.token) {
    client.verifyToken(req.query.token_id, req.query.token).done(email => {
      // log the user in
    }, next);
  }
  // show the user a login page
})
```

## License

MIT
