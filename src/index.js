import fs from 'fs';
import Promise from 'promise';
import ms from 'ms';
import generateToken from './generate-token';
import sendPostmarkEmail from './send-postmark-email';

function id(v) {
  return v;
}

function isEmail(email) {
  return typeof email === 'string' && /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+/i.test(email);
}

function buildTemplate(src) {
  if (!/\{\{url\}\}/.test(src)) {
    src = fs.readFileSync(src, 'utf8');
  }
  return variables => src.replace(/\{\{([a-zA-Z0-9.]+)\}\}/g, (_, key) => variables[key]);
}
module.exports = function createClient({
  saveToken,
  getTokenByID,
  developmentMode = false,
  getUserByEmail = id,
  variables = {},
  sendEmail,
  postmark,
  fromAddress,
  subject,
  txtTemplate,
  htmlTemplate,
}) {
  if (typeof saveToken !== 'function') {
    throw new Error(
      'Expected saveToken to be a function that takes an object `{email: string, token: string, expiry: number}` and ' +
      'returns a `Promise<ID>` or `ID` with the ID of the saved token.',
    );
  }
  if (typeof getTokenByID !== 'function') {
    throw new Error(
      'Expected getTokenByID to be a function that takes an ID and returns a ' +
      '`Promise<{email: string, token: string, expiry: number}>` or `{email: string, token: string, expiry: number}` ' +
      'with the token saved at that ID.  ' +
      'You can safely return null/delete the token from the database once the token has been expired.',
    );
  }
  if (typeof developmentMode !== 'boolean') {
    throw new Error(
      'Expected development mode to be a boolean.  Set it to `true` if you wish to disable actually sending the ' +
      'email and just return the url to complete sign in.  This is extremely dangerous to enable in production.',
    );
  }
  if (typeof getUserByEmail !== 'function') {
    throw new Error(
      'Expected getUserByEmail to be a function that takes an `email` and returns a ' +
      '`Promise<?UserObject>` or `?UserObject`.  ' +
      'You can return `null` to indicate that there is no valid user with that email.',
    );
  }
  if (!variables || typeof variables !== 'object') {
    throw new Error(
      'Expected variables to be an object.  It will be passed to the templates for the email body/subject. ' +
      'The template will also be passed: url, fromAddress, toAddress, subject',
    );
  }
  if (postmark && sendEmail) {
    throw new Error('You can only provide one out of postmark or sendEmail');
  }
  if (!sendEmail && !postmark) {
    throw new Error('You must provide one out of postmark or sendEmail');
  }
  if (sendEmail && typeof sendEmail !== 'function') {
    throw new Error(
      'Expected sendEmail to be a function that takes the variables and returns a Promise once the e-mail has been ' +
      'sent',
    );
  }
  if (postmark && typeof postmark !== 'string') {
    throw new Error('Expected postmark to be a string');
  }
  if (postmark) {
    sendEmail = sendPostmarkEmail(postmark);
  }
  if (postmark && typeof postmark !== 'string') {
    throw new Error(
      'Expected postmark to be a string representing an API token.',
    );
  }
  if (typeof htmlTemplate === 'string') {
    htmlTemplate = buildTemplate(htmlTemplate);
  }
  if (typeof txtTemplate === 'string') {
    txtTemplate = buildTemplate(txtTemplate);
  }
  if (typeof subject === 'string') {
    const subjectSrc = subject;
    subject = variables => subjectSrc.replace(/\{\{([a-zA-Z0-9.]+)\}\}/g, (_, key) => variables[key]);
  }
  if (typeof fromAddress === 'string') {
    const fromAddressSrc = fromAddress;
    fromAddress = variables => fromAddressSrc.replace(/\{\{([a-zA-Z0-9.]+)\}\}/g, (_, key) => variables[key]);
  }

  return {
    sendMessage(email, redirectURL) {
      if (!isEmail(email)) {
        return Promise.reject(new Error('You must provide a valid email address'));
      }
      if (!redirectURL || typeof redirectURL !== 'string') {
        return Promise.reject(new Error('You must provide a redirectURL'));
      }
      return Promise.all([
        getUserByEmail(email),
        generateToken(),
      ]).then(([user, token]) => {
        if (!user) {
          const err = new Error('Access Denied');
          err.code = 'INVALID_EMAIL';
          err.status = err.statusCode = 403;
          throw err;
        }

        const expiry = Date.now() + ms('1 day');
        return Promise.resolve(saveToken({email, token, expiry})).then(id => {
          const url = (
            redirectURL +
            (redirectURL.indexOf('?') === -1 ? '?' : '&') +
            'id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(token)
          );
          if (developmentMode) {
            console.log('link to log in:');
            console.log(url);
            return {
              emailSent: false,
              development: true,
              path: url,
            };
          } else {
            const allVariables = {
              ...variables,
              toAddress: email,
              url,
            };
            allVariables.fromAddress = fromAddress ? fromAddress(allVariables) : undefined;
            allVariables.subject = subject ? subject(allVariables) : undefined;
            allVariables.txtBody = txtTemplate ? txtTemplate(allVariables) : undefined;
            allVariables.htmlBody = htmlTemplate ? htmlTemplate(allVariables) : allVariables.txtBody;
            return Promise.resolve(sendEmail(allVariables)).then(() => ({
              emailSent: true,
              development: false,
            }));
          }
        });
      });
    },
    verifyToken(id, tokenProvidedByUser) {
      // set timeout to prevent timing attacks on login process
      return new Promise((resolve, reject) => {
        setTimeout(resolve, (Math.random() * 100) | 0);
      }).then(() => {
        if (typeof id !== 'string' && typeof id !== 'number') {
          throw new Error('Invalid id provided by user');
        }
        if (!tokenProvidedByUser || typeof tokenProvidedByUser !== 'string') {
          throw new Error('Invalid token provided by user');
        }
        return getTokenByID(id);
      }).then(tokenObject => {
        if (tokenObject == null) {
          const err = new Error('Invalid or expired token');
          err.code = 'INALID_TOKEN';
          err.status = err.statusCode = 403;
          throw err;
        }
        const {email, token, expiry} = tokenObject;
        if (!isEmail(email)) {
          throw new Error('Invalid email address stored in database');
        }
        if (!token || typeof token !== 'string') {
          throw new Error('Invalid token stored in database');
        }
        if (!expiry || typeof expiry !== 'number') {
          throw new Error('Invalid expiry timestamp stored in database');
        }
        if (expiry > Date.now() && tokenProvidedByUser === token) {
          // success!
          return Promise.resolve(getUserByEmail(email)).then(user => {
            if (!user) {
              const err = new Error('Access Denied');
              err.code = 'INVALID_EMAIL';
              err.status = err.statusCode = 403;
              throw err;
            }
            return user;
          });
        } else {
          const err = new Error('Invalid or expired token');
          err.code = 'INALID_TOKEN';
          err.status = err.statusCode = 403;
          throw err;
        }
      });
    },
  };
};
