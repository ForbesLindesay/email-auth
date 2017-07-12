import Promise = require('promise');
import generateToken from '../generate-token';

test('generates a string of n random characters', () => {
  const results = [];
  // run this many many times to compensate for the randomness in generating a random ID.
  // and to verify that a unique ID is generted across a reasonably large set of IDs.
  for (let i = 0; i < 10000; i++) {
    results.push(
      generateToken().then(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBe(112);
        // Note that we verify that there are no `=` signs used for padding.
        expect(id).toMatch(/^[A-Za-z0-9-_]{112}$/);
        expect(id).toMatch(encodeURIComponent(id));
        return id;
      }),
    );
  }
  return Promise.all(results).then(ids => {
    ids.forEach((id, index) => {
      expect(ids.indexOf(id)).toBe(index); // expect ids to be unique
    });
  });
});
