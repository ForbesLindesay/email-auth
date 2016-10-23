import createPostmarkClient from 'postmark';

export default function createClient(postmarkToken) {
  const postmark = createPostmarkClient(postmarkToken);
  function sendEmail({toAddress, fromAddress, subject, txtBody, htmlBody}) {
    return new Promise((resolve, reject) => {
      postmark.send({
        To: toAddress,
        From: fromAddress,
        Subject: subject,
        TextBody: txtBody,
        HtmlBody: htmlBody,
      }, (err, res) => {
        if (err) reject(new Error(err.message));
        resolve(res);
      });
    });
  }
  return sendEmail;
}
