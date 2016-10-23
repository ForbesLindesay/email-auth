import {randomBytes} from 'crypto';
import Promise from 'promise';

const randomBytesAsync = Promise.denodeify(randomBytes);

export default function generateToken() {
  // returns a 112 character URL safe string
  return randomBytesAsync(84).then(
    sessionID => sessionID.toString('base64').replace(/\+/g, '_').replace(/\//g, '-'),
  );
}
