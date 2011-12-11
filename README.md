## tldtools

This module provides TLD domain extraction and resolution services.

Installation

    npm install tldtools

Usage

    var tldtools = require('tldtools');

### tldtools.extract(fqdn)

Extracts tld, domain and subdomain parts from the provided fqdn (supports FQDNs names and URIs).
Returns an object keyed by

* tld - top level domain (com, gov.uk etc)
* domain - first subdomain of tld
* subdomain - prefixing A records for domain/tld

eg:

    var tldtools = require('tldtools');
    console.log(tldtools.extract('http://bob:funk@wagga.wagga.funkjazz.gov.au:1234/?go=abc&123'));

Returns...

    TLD Cache is UP
    { subdomain: 'funkjazz.wagga.wagga',
    domain: 'gov',
    tld: 'au' }

### tldtools.tldCacheRefresh(onSuccess, onFail)

Rebuilds the local in-memory cache from either the remote TLD datasource, or a local copy of effective_tld_names.dat if the local copy exists.

* onSuccess - success callback
* onFail(errorMessage) - failure callback


### tldtools.whois(fqdn, opts = {});

Attempts to perform a whois lookup for the provided fqdn (supprts FQDNs and URI's)

Available options (opts)

* hostName - whois hostname (default whois.internic.net)
* port - whois port (default 43)
* onSuccess - whois request complete callback containing utf8 encoded whois payload (first arg)
* onFail - failure callback containing errormessage and fqdn context

eg:

    tldtools.whois(
        'github.com',
        {
            'onSuccess' : function(whoisData) {
                console.log(whoisData);
            },
            'onFail' : function(errorMessage, fqdn) {
                console.log(fqdn + ' WHOIS FAILED');
                console.log(errorMessage);
            }
        });