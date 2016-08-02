import find from 'lodash/find';
import isEqual from 'lodash/isEqual';
import clone from 'lodash/cloneDeep';
import defaults from 'lodash/defaults';
import assign from 'lodash/assign';

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

    return (url, optionsWithoutDefaults) => {
        const unnormalizedOptions = defaults({}, optionsWithoutDefaults, {
            method: 'GET',
        });
        const options = assign({}, unnormalizedOptions, {
            method: unnormalizedOptions.method.toUpperCase(),
        });

        if (methods.map(method => method.toUpperCase()).indexOf(options.method) < 0) {
            return fetch(url, options);
        }

        const entry = find(cache[url], ({ options: opts }) => isEqual(opts, options));

        if (entry) {
            return entry.promise;
        }

        const promise = fetch(url, options);
        const newEntry = {
            promise,
            options: clone(options),
        };
        const resolve = () => {
            cache[url] = cache[url].filter(({ options: opts }) => !isEqual(opts, options));
        };

        (cache[url] || (cache[url] = [])).push(newEntry);
        promise.then(resolve, resolve);

        return newEntry.promise;
    };
};
