import {parse, stringify} from 'qs';

export default function handleQs(url: string, query: {[key: string]: string | number}): string {
  let urlParts = url.split('#');
  const end = urlParts[1] ? '#' + urlParts[1] : '';
  urlParts = urlParts[0].split('?');
  const start = urlParts[0];
  let qs = (urlParts[1] || '');

  const baseQs = parse(qs);
  for (const i in query) {
    baseQs[i] = query[i];
  }
  qs = stringify(baseQs);
  if (qs !== '') {
    qs = '?' + qs;
  }
  return start + qs + end;
}

export function removeFields(url: string, fields: string[]): string {
  let urlParts = url.split('#');
  const end = urlParts[1] ? '#' + urlParts[1] : '';
  urlParts = urlParts[0].split('?');
  const start = urlParts[0];
  let qs = (urlParts[1] || '');

  const baseQs = parse(qs);
  fields.forEach(key => {
    if (key in baseQs) {
      delete baseQs[key];
    }
  });
  qs = stringify(baseQs);
  if (qs !== '') {
    qs = '?' + qs;
  }
  return start + qs + end;
}
