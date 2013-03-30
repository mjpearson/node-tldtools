/*
Thanks for using tldtools, it's distributed under the MIT License (MIT)

Copyright (c) 2011 Michael Pearson <npm@m.bip.io>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var 	request = require('request'),
        fs = require('fs'),
        url = require('url'),
        net = require('net');

TLD_TOOLS = {
    _tldSource: 'http://mxr.mozilla.org/mozilla/source/netwerk/dns/src/effective_tld_names.dat?raw=1',
    _tldLocalSource: __dirname + '/effective_tld_names.dat',
    _tldCacheOut: __dirname + '/.tlds',

    _whoisDefaultOpts: {
        'hostName' : 'whois.internic.net',
        'port' : 43,
        'stream_encoding' : 'utf8',
        'onSuccess' : function(whoisData) {
            console.log(whoisData);
        },
        'onFail' : function(errorMessage, fqdn) {
            console.log(fqdn + ' WHOIS FAILED');
            console.log(errorMessage);
        },
        'cbPassthrough' : {}
    },

    _tldCacheStruct: {},
    _whoisCacheStruct: {},

    _tldLineSnarf: function(data) {
        var lines = data.match(/^([.*!]*\w[\S]*)/gm);
        var lineNum = lines.length;
        return [lines, lineNum];
    },

    _tldSourceParseData: function(data, onSuccess, onFail) {
        var self = TLD_TOOLS;

        var lineMeta = self._tldLineSnarf(data)
        lines = lineMeta[0];
        lineNum = lineMeta[1];

        var stream = fs.createWriteStream(self._tldCacheOut);

        stream.once('open', function(fd) {
            var newLine = '';
            while (lineNum--) {
                newLine = lines[lineNum].split(".").reverse().join(".");
                stream.write(newLine + "\n");
                self._tldCacheBindRow(newLine);
            }

            if (undefined != onSuccess) {
                onSuccess();
            }
        });
    },

    // data read callback vs cache
    _tldCacheParseData: function(data, onSuccess, onFail) {
        var self = TLD_TOOLS;

        var lineMeta = self._tldLineSnarf(data)
        lines = lineMeta[0];
        lineNum = lineMeta[1];

        while (lineNum--) {
            self._tldCacheBindRow(lines[lineNum]);
        }

        if (undefined != onSuccess) {
            onSuccess();
        }
    },

    // extract data and build our local map
    _tldCacheBindRow: function(row) {
        var tokens = row.split('.');
        var tokenLength = tokens.length;
        var ptr = this._tldCacheStruct;
        var token;

        if (tokenLength > 0) {
            for (var idx = 0; idx < tokenLength; idx++) {
                token = tokens[idx];
                if (undefined == ptr[token]) {
                    ptr[token] = [];
                }
                ptr = ptr[token];
            }
        }
    },

    _readFileCB: function(filePath, readCallback, onSuccess, onFail) {
        // load pre-parsed data
        try {
            fs.lstatSync(filePath);

            // load the local file instead
            fs.readFile(filePath, function(error, data) {
                var dataString = data.toString();
                if (error) {
                    if (undefined != onFail) {
                        onFail(error);
                    }
                } else {
                    readCallback(dataString, onSuccess, onFail);
                }
            });
        } catch (e) {
            onFail(e.description);
        }
    },

    // Callback for remote tld source load fail
    _remoteTLDSourceLoad: function(onSuccess, onFail) {
        var self = this;

        return function(onSuccess, onFail) {
            request(self._tldSource, function(error, res, body) {
                if (error) {
                    if (undefined != onFail) {
                        console.log('No local source, retrieving from remote host ' + self._tldSource);
                        onFail(body);
                    }
                } else {
                    // parse and save remote data to local cache
                    self._tldSourceParseData(body, onSuccess, onFail);
                }
            });
        }
    },

    // ensures we have a local copy of the remote _tldSource file
    _syncTLDList: function(opts) {
        var self = this;

        if (undefined != opts.onFail) {
            var onFail = opts.onFail;
        }

        if (undefined != opts.onSuccess) {
            var onSuccess = opts.onSuccess;
        }

        var refreshCache = (undefined != opts.refresh && opts.refresh == true);

        // If we don't have a local cache copy, or we have a refresh option
        // then load from our tldSource
        if (!refreshCache) {
            try {
                fs.lstatSync(this._tldCacheOut)
            } catch (e) {
                refreshCache = true;
            }
        }

        if (refreshCache) {
            this._tldCacheStruct = {},
            this._readFileCB(
                this._tldLocalSource, // local path
                this._tldSourceParseData, // read callback
                onSuccess, // onsuccess callback passthrough
                this._remoteTLDSourceLoad(onSuccess, onFail) // onfail fallback and callback passthrough
                );
        } else {
            // load pre-parsed data
            this._readFileCB(
                this._tldCacheOut,  // local path
                this._tldCacheParseData, // read callback
                onSuccess, //
                onFail
                );
        }
    },

    _arrDepth: function(tokens, ptr, idx) {
        if (tokens.length != 0) {

            var ptrLen = ptr.length;
            var token = tokens.shift();

            if (undefined != ptr.token) {
                ++idx;
                if (ptr[token].length > 0) {
                    ptr = ptr[token];
                    idx = this._arrDepth(tokens, ptr, idx);
                }

            } else if (undefined != ptr['*'] && undefined == ptr['!' + token]) {
                ++idx;
            }
        }
        
        return idx;
    },

    whois: function(fqdn, opts) {
        var self = this;
        var domainParts = this.extract(fqdn);
        // ---------------------- Opt parsing
        if (undefined == opts) {
            opts = this._whoisDefaultOpts;
        }        
        var onSuccess = (undefined != opts.onSuccess) ? opts.onSuccess : this._whoisDefaultOpts.onSuccess;
        var onFail = (undefined != opts.onFail) ? opts.onFail : this._whoisDefaultOpts.onFail;
        var cbPassthrough = (undefined != opts.cbPassthrough) ? opts.cbPassthrough : this._whoisDefaultOpts.cbPassthrough;
        var streamEncoding = (undefined != opts.stream_encoding) ? opts.stream_encoding : this._whoisDefaultOpts.stream_encoding;

        // assemble domain
        if ( domainParts.inspect.useful() ) {

            domainName = domainParts.inspect.getDomain();

            if (undefined == this._whoisCacheStruct.domainName) {

                var hostName = (undefined != opts.hostName) ? opts.hostName : this._whoisDefaultOpts.hostName;
                var port = (undefined != opts.port) ? opts.port : this._whoisDefaultOpts.port;
                var stream = net.createConnection(port, hostName);

                stream.setEncoding(streamEncoding);

                // Request whois info
                stream.addListener('connect', function() {
                    stream.write(domainName + "\r\n");
                });

                //  Data callback
                stream.addListener('data', function(data) {
                    self._whoisCacheStruct.domainName = data;
                    // @todo key parsed data
                    onSuccess( { 'data_utf8_raw' : data }, fqdn, cbPassthrough );
                });

                // connection end
                stream.addListener('end', function() {
                    stream.end();
                });

                // error callback
                stream.addListener('error', function(exception) {
                    onFail(exception.description, fqdn, cbPassthrough);
                });
            } else {
                onSuccess(this._whoisCacheStruct.domainName);
            }
        } else {
            // doesn't look like a domain we can parse
            onFail('Invalid Domain Name', fqdn);
        }
    },

    // Attempts to extract the tld, domain and subdomain parts from the supplied 'fqdn' string
    //
    extract: function(fqdn) {

        var tld = [], subdomain = [], domain = '';
        var urlTokens = url.parse(fqdn);
        var hostName = (undefined != urlTokens.hostname) ? urlTokens.hostname : urlTokens.pathname;
        var hostTokens = hostName.split('.').reverse();
        var htIdx = hostTokens.length;
        var gtld = hostTokens.shift();

        tldDepth = (undefined != this._tldCacheStruct[gtld]) ?
                        this._arrDepth(hostTokens, this._tldCacheStruct[gtld], 1) :
                        0;       

        hostTokens = hostName.split('.');

        while (htIdx--) {            
            idxVal = hostTokens[htIdx];
            if (tldDepth > 0) {
                tld.unshift(idxVal);
            } else if (domain == '') {
                domain = idxVal;
            } else {
                subdomain.unshift(idxVal);
            }
            --tldDepth;
        }

       return {
           'subdomain' : subdomain.join('.'),
           'domain' : domain,
           'tld': tld.join('.'),
           'url_tokens' : urlTokens,
           'inspect' : {
               'useful': function() {
                   return (this.domain != '' && this.tld != '');
               },
               'getDomain' : function() {
                   return urlTokens.hostname;
               }
           }
       };
    },

    tldCacheRefresh: function(onSuccess, onFail) {
        this._syncTLDList( {
            'onSuccess': onSuccess,
            'onFail': onFail,
            'refresh' : true
        } );
    },

    init: function(success, fail) {
        var self = this;

        this._syncTLDList( {
            'onSuccess': success || function() {            
                    console.log('TLD Cache is UP');
            },
            'onFail' : fail || function(errorBody) {
                if (undefined != errorBody) {
                    console.log(errorBody);
                }
                console.log('TLD Cache could not be synced');
            }
        });
        return this;
    }
}

module.exports = TLD_TOOLS;
