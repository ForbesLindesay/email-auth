import {parse, stringify} from 'qs';

export default function handleQs(url, query) {
  url = url.split('#');
  const end = url[1] ? '#' + url[1] : '';
  url = url[0].split('?');
  const start = url[0];
  let qs = (url[1] || '');

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
export function removeFields(url, fields) {
  url = url.split('#');
  const end = url[1] ? '#' + url[1] : '';
  url = url[0].split('?');
  const start = url[0];
  let qs = (url[1] || '');

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
