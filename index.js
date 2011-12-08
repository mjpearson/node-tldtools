var 	request = require('request'),
fs = require('fs'),
sys = require('util');

TLD_TOOLS = {
    _tldSource: 'http://mxr.mozilla.org/mozilla/source/netwerk/dns/src/effective_tld_names.dat?raw=1',
    _tldCacheOut: __dirname + '/.tlds',
    _tldStruct: {},

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
            request(this._tldSource, function(error, res, body) {
                if (error) {
                    if (undefined != onFail) {
                        onFail(body);
                    }
                } else {
                    // sanitize lines
                    var bodyNorm = body.match(/^([.*!]*\w[\S]*)/gm);
                    var lines = bodyNorm.toString().split('\n');
                    var lineNum = lines.length;
                    var stream = fs.createWriteStream(self._tldCacheOut);

                    stream.once('open', function(fd) {
                        var newLine = '';
                        while (lineNum--) {
                            newLine = lines[lineNum].split("").reverse().join("");
                            stream.write(newLine + "\n");
                            self._tldCacheBindRow(newLine);
                        }
                        if (undefined != onSucess) {
                            onSuccess();
                        }
                    });
                }
            }); //.pipe(fs.createWriteStream(this._tldCacheOut));
        } else {

    }
    },

    // extract data and build our local map
    _tldCacheBindRow: function(data) {
        var tokens = data.split('.');
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

     console.log(this._tldStruct);
    },

    tldCacheRefresh: function(onSuccess, onFail) {
        this._syncTLDList( {
            'onSuccess': onSuccess,
            'onFail': onFail
        } );
    },


    init: function() {
        var successFunc = function() {
            sys.puts('TLD Cache is UP');
        }

        var failFunc = function(errorBody) {
            sys.puts('TLD Cache could not be SYNCED');
            if (undefined != errorBody) {
                sys.puts(errorBody);
            }
        }

        this._syncTLDList( {
            'onSuccess': successFunc,
            'onFail' : failFunc
        } );
        return this;
    }
}

module.exports = TLD_TOOLS.init();
