var 	request = require('request'),
        fs = require('fs'),
        url = require('url');

TLD_TOOLS = {
    _tldSource: 'http://mxr.mozilla.org/mozilla/source/netwerk/dns/src/effective_tld_names.dat?raw=1',
    _tldLocalSource: __dirname + '/tlds_local',
    _tldCacheOut: __dirname + '/.tlds',
    _tldStruct: {},

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
        var ptr = this._tldStruct;
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
                        console.log('No local source, retrieving from remote host ' + this._tldSource);
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
        refreshCache = true;
        if (refreshCache) {
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
        var ptrLen = ptr.length;
        var token = tokens.shift();

        if (ptr.indexOf(token)) {
            ++idx;
            if (ptr[token].length > 0) {
                ptr = ptr[token];
                idx = this._arrDepth(tokens, ptr, idx);
            }
        } else if (ptr.indexOf('*')) {
            ++idx;
        }
        return idx;
    },

    // Attempts to extract the tld, domain and subdomain parts from the supplied 'fqdn' string
    //
    extract: function(fqdn, onFail) {
        var tld = [], subdomain = [], domain = '';
        var hostName = url.parse(fqdn)['hostname'];
        var hostTokens = hostName.split('.').reverse();
        var htIdx = hostTokens.length;
        var gtld = hostTokens.shift();

        tldDepth = (undefined != this._tldStruct[gtld]) ?
                        this._arrDepth(hostTokens, this._tldStruct[gtld], 1) :
                        0;       

        hostTokens = hostName.split('.');

        while (htIdx--) {            
            idxVal = hostTokens[htIdx];
            if (tldDepth > 0) {
                tld.push(idxVal);
            } else if (domain == '') {
                domain = idxVal;
            } else {
                subdomain.push(idxVal);
            }
            --tldDepth;
        }

       return {
           'subdomain' : subdomain.join('.'),
           'domain' : domain,
           'tld': tld.join('.')
       };
    },

    tldCacheRefresh: function(onSuccess, onFail) {
        this._syncTLDList( {
            'onSuccess': onSuccess,
            'onFail': onFail
        } );
    },

    init: function() {
        var self = this;
        var successFunc = function() {
            //console.log(self._tldStruct);
            console.log('TLD Cache is UP');
        }

        var failFunc = function(errorBody) {
            if (undefined != errorBody) {
                console.log(errorBody);
            }
            console.log('TLD Cache could not be synced');
        }

        this._syncTLDList( {
            'onSuccess': successFunc,
            'onFail' : failFunc
        } );
        return this;
    }
}

module.exports = TLD_TOOLS.init();
