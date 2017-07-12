import {randomBytes} from 'crypto';
import Promise = require('promise');

const randomBytesAsync = Promise.denodeify(randomBytes);

export default function generateToken(): Promise<string> {
  // returns a 112 character URL safe string
  return randomBytesAsync(84).then(
    (sessionID: Buffer) => sessionID.toString('base64').replace(/\+/g, '_').replace(/\//g, '-'),
  );
}
