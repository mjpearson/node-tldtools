# tldtools

This module provides TLD domain extraction and resolution services.

## Installation

    npm install tldtools

## Usage

    var tldtools = require('tldtools').init();

or

    var tldtools = require('tldtools');
    tldtools.init(function() {
        console.log('success!');
    });

## TLD List Caching Notes and Operation

  The first time tldtools is loaded it will attempt to call out to `http://mxr.mozilla.org/mozilla/source/netwerk/dns/src/effective_tld_names.dat?raw=1`
to retrieve the latest TLD list.  This file is parsed, normalised and stored in `/.tlds`.  To override this outbound call and look locally, place your
own overriding file in `/effective_tld_names.dat`

To force a cache refresh of TLD data in your own running application, you must provide a hook which calls `tldtools.tldCacheRefresh`

### tldtools.extract(fqdn)

Extracts tld, domain and subdomain parts from the provided fqdn (supports FQDNs names and URIs).

Based on John Kurkowski's tldextract python library. https://github.com/john-kurkowski/tldextract

Returns an object keyed by

* tld - top level domain (com, gov.uk etc)
* domain - first subdomain of tld
* subdomain - prefixing A records for domain/tld
* url_tokens - node-url meta structure (convenience)
* inspect.useful() - closure reporting whether domain and tld parsed correctly
* inspect.getDomain() - string concatenation of domain + tld

eg:

    var tldtools = require('tldtools');
    console.log(tldtools.extract('http://bob:funk@wagga.wagga.funkjazz.gov.au:1234/?go=abc&123'));

Returns...

    { subdomain: 'wagga.wagga',
      domain: 'funkjazz',
      tld: 'gov.au',
      url_tokens:
       { protocol: 'http:',
         slashes: true,
         auth: 'bob:funk',
         host: 'bob:funk@wagga.wagga.funkjazz.gov.au:1234',
         port: '1234',
         hostname: 'wagga.wagga.funkjazz.gov.au',
         href: 'http://bob:funk@wagga.wagga.funkjazz.gov.au:1234/?go=abc&123',
         search: '?go=abc&123',
         query: 'go=abc&123',
         pathname: '/' },
      inspect: { useful: [Function], getDomain: [Function] } }

### tldtools.tldCacheRefresh(onSuccess, onFail)

Rebuilds the local in-memory cache from either the remote TLD datasource, or a local copy of `effective_tld_names.dat` if the local copy exists.

* onSuccess - success callback `function()`
* onFail - failure callback `function(errorMessage)`


### tldtools.whois(fqdn, opts = {});

Attempts to perform a whois lookup for the provided fqdn (supprts FQDNs and URI's)

Available options (opts)

* hostName - whois hostname (default whois.internic.net)
* port - whois port (default 43)
* stream_encoding - return encoding (default 'utf8')
* onSuccess - request complete callback `function(whoisData, fqdn, cbPassthrough)`
* onFail - failure callback `function(errorMessage, fqdn, cbPassthrough)` failure callback
* cbPassthrough - any extra passthrough parameters to onSuccess or onFail

eg:

    tldtools.whois(
        'github.com',
        {
            'onSuccess' : function(whoisData, fqdn, cbPassthrough) {
                console.log(whoisData);
                console.log(fqdn + ' ultimate success!');
                console.log(cbPassthrough);
            },
            'onFail' : function(errorMessage, fqdn, cbPassthrough) {
                console.log(errorMessage);
                console.log(fqdn + ' WHOIS FAILED');
                console.log(cbPassthrough);
            }
        },
        'cbPassthrough' : ['some data']
    });