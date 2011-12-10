var 	request = require('request'),
        fs = require('fs'),
        sys = require('util');

TLD_TOOLS = {
    _tldSource: 'http://mxr.mozilla.org/mozilla/source/netwerk/dns/src/effective_tld_names.dat?raw=1',
    _tldLocalSource: __dirname + '/tlds_local',
    _tldCacheOut: __dirname + '/.tlds',
    _tldStruct: {},

    _tldSourceParseData: function(data, onSuccess, onFail) {
        var self = TLD_TOOLS;
        var dataNorm = data.match(/^([.*!]*\w[\S]*)/gm);
        var lines = dataNorm.toString().split("\r\n");
        var lineNum = lines.length;
sys.puts(lineNum);
        // @todo scope fix?
        var stream = fs.createWriteStream(TLD_TOOLS._tldCacheOut);

        stream.once('open', function(fd) {
            var newLine = '';
            while (lineNum--) {
                //newLine = lines[lineNum].split("").reverse().join("");
                newLine = lines[lineNum].split(".").reverse().join(".");
                stream.write(newLine + "TRAIL\n\n");
                TLD_TOOLS._tldCacheBindRow(newLine);
            }
            if (undefined != onSuccess) {
                onSuccess();
            }
        });
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
                        onFail(dataString);
                    }
                } else {
                    readCallback(dataString, onSuccess, onFail);
                }
            });
        } catch (e) {
            onFail(e.description);
        }
    },

    _remoteTLDSourceLoad: function(onSuccess, onFail) {
        
        var self = this;
        return function(onFail) {
            sys.puts('No local source, retrieving from remote host ' + this._tldSource);
            request(self._tldSource, function(error, res, body) {
                if (error) {
                    if (undefined != onFail) {
                        onFail(body);
                    }
                } else {
                    // sanitize lines
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
            this._readFileCB(
                            this._tldLocalSource,
                            this._tldSourceParseData,
                            this._remoteTLDSourceLoad(onSuccess, onFail)
                        );            
        } else {
            // load pre-parsed data
            this._readFileCB(
                            this._tldCacheOut,
                            this._tldSourceParseData,
                            onFail
                        );
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
            if (undefined != errorBody) {
                sys.puts(errorBody);
            }
            sys.puts('TLD Cache could not be SYNCED');
        }

        this._syncTLDList( {
            'onSuccess': successFunc,
            'onFail' : failFunc
        } );
        return this;
    }
}

module.exports = TLD_TOOLS.init();
