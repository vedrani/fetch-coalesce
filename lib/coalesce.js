import find from 'lodash/find';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

function cloneResponse(promise) {
  return promise.then(response => response.clone());
}

export default ({
  methods = [
    'OPTIONS',
    'GET',
    'HEAD',
    'PUT',
    'DELETE',
  ],
} = {}) => fetch => {
  const cache = {};
  const normalizedMethods = methods.map(method => method.toUpperCase());

  return (url, optionsWithoutDefaults) => {
    const request = new Request(url, optionsWithoutDefaults);
    if (normalizedMethods.indexOf(request.method) < 0) {
      return fetch(request);
    }

    const resolvedUrl = request.url;
    const resolvedOptions = JSON.stringify(
      pick(request, [
        'body',
        'method',
        'credentials',
        'mode',
        'headers',
      ])
    );

    const entry = find(cache[resolvedUrl], ({ options: opts }) => (
      isEqual(opts, resolvedOptions)
    ));

    if (entry) {
      return cloneResponse(entry.promise);
    }

    const promise = fetch(request);
    const newEntry = {
      promise,
      options: resolvedOptions,
    };
    const resolve = () => {
      cache[resolvedUrl] = cache[resolvedUrl].filter(({ options: opts }) => (
        !isEqual(opts, resolvedOptions)
      ));
    };

    (cache[resolvedUrl] || (cache[resolvedUrl] = [])).push(newEntry);
    promise.then(resolve, resolve);

    return cloneResponse(newEntry.promise);
  };
};
