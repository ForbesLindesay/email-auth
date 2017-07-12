import Promise = require('promise');
import createPostmarkClient = require('postmark');
import {Message} from './index';

export default function createClient(postmarkToken: string) {
  const postmark = (createPostmarkClient(postmarkToken, {}) as any);
  function sendEmail({toAddress, fromAddress, subject, txtBody, htmlBody, userName}: Message): Promise<void> {
    if (typeof fromAddress !== 'string') {
      return Promise.reject(new Error('You must provide a value for "fromAddress" when using postmark to send e-mail.'));
    }
    if (typeof subject !== 'string') {
      return Promise.reject(new Error('You must provide a value for "subject" when using postmark to send e-mail.'));
    }
    if (typeof htmlBody !== 'string') {
      return Promise.reject(new Error('You must provide a value for "htmlBody" when using postmark to send e-mail.'));
    }
    let vanityTo = toAddress;
    if (userName && /^[A-Za-z ]+$/.test(userName)) {
      vanityTo = userName + '<' + toAddress + '>';
    }
    return new Promise((resolve, reject) => {
      postmark.send({
        To: vanityTo,
        From: fromAddress,
        Subject: subject,
        TextBody: txtBody,
        HtmlBody: htmlBody,
      }, (err: any) => {
        if (err) reject(new Error(err.message));
        resolve();
      });
    });
  }
  return sendEmail;
}
