import ms from 'ms';
import createClient from '../';

jest.mock('../generate-token.js');

const oldNow = Date.now;
Date.now = () => 0;
afterAll(() => {
  Date.now = oldNow;
});
test('throws errors for incorrect config', () => {
  expect(
    () => createClient({
      getTokenByID(id) {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken({email, token, expiry}) {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken({email, token, expiry}) {
        throw new Error('Not implemented');
      },
      getTokenByID(id) {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
      developmentMode: 1,
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken({email, token, expiry}) {
        throw new Error('Not implemented');
      },
      getTokenByID(id) {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
      getUserByEmail: {},
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken({email, token, expiry}) {
        throw new Error('Not implemented');
      },
      getTokenByID(id) {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
      variables: true,
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken({email, token, expiry}) {
        throw new Error('Not implemented');
      },
      getTokenByID(id) {
        throw new Error('Not implemented');
      },
      sendEmail(message) {
        throw new Error('Not implemented');
      },
      variables: true,
    })
  ).toThrow();
  expect(
    () => createClient({
      saveToken({email, token, expiry}) {
        throw new Error('Not implemented');
      },
      getTokenByID(id) {
        throw new Error('Not implemented');
      },
    })
  ).toThrow();
});

test('sends the email', () => {
  const client = createClient({
    saveToken({email, token, expiry}) {
      expect(email).toBe('forbes@lindesay.co.uk');
      expect(token).toBe('MOCK_TOKEN');
      expect(expiry).toBe(ms('1 day'));
      return 0;
    },
    getTokenByID(id) {
      throw new Error('Not implemented');
    },
    sendEmail(message) {
      expect(message).toMatchSnapshot();
    },
  });
  return client.sendMessage('forbes@lindesay.co.uk', 'https://www.example.com/destination');
});


test('sends the email', () => {
  const client = createClient({
    saveToken({email, token, expiry}) {
      throw new Error('Not implemented');
    },
    getTokenByID(id) {
      expect(id).toBe(0);
      return {email: 'forbes@lindesay.co.uk', token: 'MOCK_TOKEN', expiry: 1};
    },
    sendEmail(message) {
      throw new Error('Not implemented');
    },
  });
  return client.verifyToken(0, 'MOCK_TOKEN').then(result => {
    expect(result).toBe('forbes@lindesay.co.uk');
  });
});
