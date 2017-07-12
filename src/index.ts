import {readFileSync} from 'fs';
import Promise = require('promise');
import ms = require('ms');
import generateToken from './generate-token';
import sendPostmarkEmail from './send-postmark-email';
import handleQs, {removeFields} from './handle-qs';

export interface Token {
  /**
   * The e-mail address being authenticated by the token
   */
  email: string;
  /**
   * A long, case-senstive string of letters and numbers,
   * used as a kind of password to verify the token
   */
  value: string;
  /**
   * The time that the token expires, represented as milliseconds
   * since the unix epoch
   */
  expiry: number;
}

export interface Message {
  /**
   * The e-mail address that is being sent to
   */
  toAddress: string,
  /**
   * The url, including "token_id" and "token_value" as query string parameters
   */
  url: string,
  /**
   * The from e-mail address
   */
  fromAddress?: string,
  /**
   * The subject line for the e-mail
   */
  subject?: string,
  /**
   * The body of the message for e-mail apps that do not support rich text
   */
  txtBody?: string,
  /**
   * The body of the message for e-mail apps that do support rich text
   */
  htmlBody?: string,
  /**
   * The name of the person you are sending the e-mail to.  Note that this must match
   * [A-Za-z ]+ or it will be ignored.
   */
  userName?: string;
  /**
   * You can pass through additional strings to be replaced in your template
   */
  [key: string]: any,
}

export type Variable = string | ((v: Message) => string);
export interface ClientOptions<TTokenID extends number | string, TUser> {
  saveToken: (token: Token) => PromiseLike<TTokenID> | TTokenID;
  getTokenByID: (id: TTokenID) => PromiseLike<Token | null> | Token | null;
  developmentMode?: boolean;
  getUserByEmail?: (email: string) => TUser | null | PromiseLike<TUser | null>;

  /**
   * Additional values to be passed to the e-mail template
   */
  variables?: {[key: string]: any};

  /**
   * A function to send the e-mail. Provide this if you do not intend to use postmark to send
   * emails.
   */
  sendEmail?: (message: Message) => PromiseLike<void> | void;

  /**
   * Postmark API token. You must provide either this or `sendEmail`
   */
  postmark?: string;

  fromAddress?: Variable;
  subject?: Variable;
  txtTemplate?: Variable;
  htmlTemplate?: Variable;
}
export interface ExtraData {
  /**
   * The name of the person you are sending the e-mail to.  Note that this must match
   * [A-Za-z ]+ or it will be ignored.
   */
  userName?: string;
  fromAddress?: string;
  subject?: string;
  txtTemplate?: string;
  htmlTemplate?: string;
  /**
   * Additional values to be passed to the e-mail template
   */
  [key: string]: any;
}

export type SendMessageResult = {emailSent: true, development: false} | {emailSent: false, development: true, path: string};

function id<T>(v: T): T {
  return v;
}

function isEmail(email: any): email is string {
  return typeof email === 'string' && /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+/i.test(email);
}

function buildTemplate(src: string) {
  if (!/\{\{url\}\}/.test(src)) {
    src = readFileSync(src, 'utf8');
  }
  return (variables: Message) => src.replace(/\{\{([a-zA-Z0-9.]+)\}\}/g, (_, key) => variables[key]);
}

function getValue<TDefault>(variables: Message, value: Variable | void, defaultValue: TDefault): string | TDefault {
  if (typeof value === 'function') {
    return value(variables);
  }
  if (typeof value === 'string') {
    return value.replace(/\{\{([a-zA-Z0-9.]+)\}\}/g, (_, key) => variables[key])
  }
  return defaultValue;
}

export default function createClient<TTokenID extends number | string, TUser = 'string'>({
  saveToken,
  getTokenByID,
  developmentMode = false,
  getUserByEmail,
  variables = {},
  sendEmail,
  postmark,
  fromAddress,
  subject,
  txtTemplate,
  htmlTemplate,
}: ClientOptions<TTokenID, TUser>) {
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
  const _getUserByEmail: ((email: string) => TUser | null | PromiseLike<TUser | null>) = getUserByEmail || (id as any);
  if (typeof _getUserByEmail !== 'function') {
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
  if (sendEmail && typeof sendEmail !== 'function') {
    throw new Error(
      'Expected sendEmail to be a function that takes the variables and returns a Promise once the e-mail has been ' +
      'sent',
    );
  }
  if (postmark && typeof postmark !== 'string') {
    throw new Error(
      'Expected postmark to be a string representing an API token.',
    );
  }
  if (postmark) {
    sendEmail = sendPostmarkEmail(postmark);
  }
  if (!sendEmail) {
    throw new Error('You must provide one out of postmark or sendEmail');
  }
  const _sendEmail: (variables: Message) => PromiseLike<void> | void = sendEmail;
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

  function generateUrl(email: string, redirectURL: string): Promise<string> {
    if (!isEmail(email)) {
      return Promise.reject(new Error('You must provide a valid email address'));
    }
    if (!redirectURL || typeof redirectURL !== 'string') {
      return Promise.reject(new Error('You must provide a redirectURL'));
    }
    return Promise.all([
      _getUserByEmail(email),
      generateToken(),
    ]).then(([user, tokenString]) => {
      if (!user) {
        const err = new Error('Access Denied');
        (err as any).code = 'INVALID_EMAIL';
        (err as any).status = (err as any).statusCode = 403;
        throw err;
      }

      const expiry = Date.now() + ms('1 day');
      return Promise.resolve(saveToken({email, value: tokenString, expiry})).then(token_id => {
        return handleQs(redirectURL, {token_id, token_value: tokenString});
      });
    });
  }
  return {
    sendMessage(email: string, redirectURL: string, data: ExtraData = {}): Promise<SendMessageResult> {
      return generateUrl(email, redirectURL).then((url): SendMessageResult | Promise<SendMessageResult> => {
        if (developmentMode) {
          console.log('link to log in:');
          console.log(url);
          return {
            emailSent: false,
            development: true,
            path: url,
          };
        } else {
          const allVariables: Message = {
            ...variables,
            ...data,
            toAddress: email,
            url,
          };
          allVariables.fromAddress = getValue(allVariables, allVariables.fromAddress || fromAddress, undefined);
          allVariables.subject = getValue(allVariables, allVariables.subject || subject, undefined);
          allVariables.txtBody = getValue(allVariables, allVariables.txtBody || txtTemplate, undefined);
          allVariables.htmlBody = getValue(allVariables, allVariables.htmlBody || htmlTemplate, allVariables.txtBody);
          return Promise.resolve(_sendEmail(allVariables)).then((): SendMessageResult => ({
            emailSent: true,
            development: false,
          }));
        }
      });
    },
    verifyToken(id: TTokenID, tokenProvidedByUser: string): Promise<TUser> {
      // set timeout to prevent timing attacks on login process
      return new Promise(resolve => {
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
          (err as any).code = 'INALID_TOKEN';
          (err as any).status = (err as any).statusCode = 403;
          throw err;
        }
        const {email, value, expiry} = tokenObject;
        if (!isEmail(email)) {
          throw new Error('Invalid email address stored in database');
        }
        if (!value || typeof value !== 'string') {
          throw new Error('Invalid token stored in database');
        }
        if (!expiry || typeof expiry !== 'number') {
          throw new Error('Invalid expiry timestamp stored in database');
        }
        if (expiry > Date.now() && tokenProvidedByUser === value) {
          // success!
          return Promise.resolve(_getUserByEmail(email)).then(user => {
            if (!user) {
              const err = new Error('Access Denied');
              (err as any).code = 'INVALID_EMAIL';
              (err as any).status = (err as any).statusCode = 403;
              throw err;
            }
            return user;
          });
        } else {
          const err = new Error('Invalid or expired token');
          (err as any).code = 'INALID_TOKEN';
          (err as any).status = (err as any).statusCode = 403;
          throw err;
        }
      });
    },
    stripToken(url: string): string {
      return removeFields(url, ['token_id', 'token']);
    },
    generateUrl,
  };
};

// hack to support CommonJS
module.exports = createClient;
module.exports.default = createClient;
