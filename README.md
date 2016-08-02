fetch-coalesce
==============

`fetch-coalesce` is a decorator that coalesces multiple equivalent `fetch()` calls into a single network request.

Install
-------

```bash
$> npm install fetch-coalesce --save
```

Example
-------

```javascript
import coalesce from 'fetch-coalesce';

const fetch = coalesce({ methods: ['GET', 'HEAD'] })(window.fetch);

fetch('/foo/bar');
fetch('/foo/bar');
// Only one network request is made.
```

Usage
-----

```javascript
import coalesce from 'fetch-coalesce';
```

### coalesce(*config*) => decorator(*fetch*) => decorated
* Function that accepts configuration and returns a fetch decorator `Function`.
* Parameters
    * (`Object`) **config** [*optional*]:
        * (`String[]`) **config.methods** [*optional*]: HTTP methods (`GET`, `PUT`, `POST`, etc.) that should be coalesced. By default, all [idempotent](http://www.restapitutorial.com/lessons/idempotency.html) methods are coalesced.
* Returns
    * (`Function`): A `fetch` decorator `Function`:
        * Parameters
            * (`Function`) **fetch**: The fetch `Function` to decorate. Should pretty much always be `window.fetch`.
        * Returns
            * (`Function`): The decorated fetch `Function`. Call it just like you would call `fetch()`.