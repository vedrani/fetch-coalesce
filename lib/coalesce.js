import find from 'lodash/find';
import isEqual from 'lodash/isEqual';
import clone from 'lodash/cloneDeep';
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

    const resolvedUrl = request.url;
    const resolvedOptions = pick(request, [
      'body',
      'method',
      'credentials',
      'mode',
      'headers',
    ]);

    if (normalizedMethods.indexOf(resolvedOptions.method) < 0) {
      return fetch(request);
    }

    const entry = find(cache[resolvedUrl], ({ options: opts }) => (
      isEqual(opts, resolvedOptions)
    ));

    if (entry) {
      return cloneResponse(entry.promise);
    }

    const promise = fetch(request);
    const newEntry = {
      promise,
      options: clone(resolvedOptions),
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
