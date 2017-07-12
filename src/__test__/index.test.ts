import ms = require('ms');
import createClient, {Token} from '../';

jest.mock('../generate-token', () => require('../__mocks__/generate-token'));

const oldNow = Date.now;
Date.now = () => 0;
afterAll(() => {
  Date.now = oldNow;
});
test('throws errors for incorrect config', () => {
  expect(
    () => createClient({
      getTokenByID(id: number): Promise<Token | null> {
        throw new Error('Not implemented');
      },
      sendEmail(message): Promise<void> {
        throw new Error('Not implemented');
      },
      saveToken: (null as any),
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken(token: Token): number {
        throw new Error('Not implemented');
      },
      getTokenByID: (undefined as any),
      sendEmail(message) {
        throw new Error('Not implemented');
      },
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken(token: Token): number {
        throw new Error('Not implemented');
      },
      getTokenByID(id): Token {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
      developmentMode: (1 as any),
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken({email, value, expiry}): number {
        throw new Error('Not implemented');
      },
      getTokenByID(id): Token {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
      getUserByEmail: ({} as any),
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken(token: Token): number {
        throw new Error('Not implemented');
      },
      getTokenByID(id): Token {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
      variables: (true as any),
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken(token: Token): number {
        throw new Error('Not implemented');
      },
      getTokenByID(id: number): Token {
        throw new Error('Not implemented');
      },
    })
  ).toThrow();
});

test('sends the email', () => {
  let emailSent = false;
  const client = createClient({
    saveToken(token: Token): number {
      expect(token.email).toBe('forbes@lindesay.co.uk');
      expect(token.value).toBe('MOCK_TOKEN');
      expect(token.expiry).toBe(ms('1 day'));
      return 0;
    },
    getTokenByID(id: number): Token {
      throw new Error('Not implemented');
    },
    sendEmail(message) {
      emailSent = true;
      expect(message).toMatchSnapshot();
    },
  });
  return client.sendMessage('forbes@lindesay.co.uk', 'https://www.example.com/destination').then(() => {
    expect(emailSent).toBe(true);
  });
});

test('postmark sends the email', () => {
  const client = createClient({
    saveToken(token: Token): number {
      expect(token.email).toBe('forbes@lindesay.co.uk');
      expect(token.value).toBe('MOCK_TOKEN');
      expect(token.expiry).toBe(ms('1 day'));
      return 0;
    },
    getTokenByID(id: number): Token {
      throw new Error('Not implemented');
    },
    postmark: 'POSTMARK_API_TEST',
  });
  return client.sendMessage('forbes@lindesay.co.uk', 'https://www.example.com/destination', {
    fromAddress: 'forbes@lindesay.co.uk',
    subject: 'Reset your password',
    htmlBody: '<a href="{{url}}>Log In</a>'
  });
});

test('sends the email', () => {
  const client = createClient({
    saveToken(token: Token): number {
      throw new Error('Not implemented');
    },
    getTokenByID(id: number): Token {
      expect(id).toBe(0);
      return {email: 'forbes@lindesay.co.uk', value: 'MOCK_TOKEN', expiry: 1};
    },
    sendEmail(message) {
      throw new Error('Not implemented');
    },
  });
  return client.verifyToken(0, 'MOCK_TOKEN').then(result => {
    expect(result).toBe('forbes@lindesay.co.uk');
  });
});
