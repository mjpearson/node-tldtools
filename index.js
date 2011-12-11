var 	request = require('request'),
fs = require('fs'),
sys = require('util');

TLD_TOOLS = {
    _tldSource: 'http://mxr.mozilla.org/mozilla/source/netwerk/dns/src/effective_tld_names.dat?raw=1',
    _tldLocalSource: __dirname + '/tlds_local',
    _tldCacheOut: __dirname + '/tlds',
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

        // @todo scope fix?
        var stream = fs.createWriteStream(TLD_TOOLS._tldCacheOut);

        stream.once('open', function(fd) {
            var newLine = '';
            while (lineNum--) {
                newLine = lines[lineNum].split(".").reverse().join(".");
                stream.write(newLine + "\n");
                self._tldCacheBindRow(newLine);
            }

            if (undefined != onSuccess) {
                console.log('done');
                onSuccess();
            }
        });
    },

    _tldCacheParseData: function(data, onSuccess, onFail) {
        var lineMeta = this._tldLineSnarf(data)
        lines = lineMeta[0];
        lineNum = lineMeta[1];
        var newLine = '';
        while (lineNum--) {
            newLine = lines[lineNum].split(".").reverse().join(".");
            self._tldCacheBindRow(newLine);
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
            console.log(filePath + ' statted ');
            fs.lstatSync(filePath);

            // load the local file instead
            fs.readFile(filePath, function(error, data) {
                var dataString = data.toString();
                if (error) {
                    console.log(filePath + ' stat failure ' );
                    console.log(error);
                    if (undefined != onFail) {
                        onFail(dataString);
                    }
                } else {
                    console.log(filePath + ' reading... ');
                    readCallback(dataString, onSuccess, onFail);
                }
            });
        } catch (e) {
            console.log(filePath + ' stat failure ' );
            console.log(e);
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
                        sys.puts('No local source, retrieving from remote host ' + this._tldSource);
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
            console.log('refreshing');
            this._readFileCB(
                this._tldLocalSource, // local path
                this._tldSourceParseData, // read callback
                onSuccess, // onsuccess callback passthrough
                this._remoteTLDSourceLoad(onSuccess, onFail) // onfail fallback and callback passthrough
                );
        } else {
            console.log('preparse load');
            // load pre-parsed data
            this._readFileCB(
                this._tldCacheOut,  // local path
                this._tldCacheParseData, // read callback
                onSuccess, //
                onFail
                );
        }
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
            console.log(self._tldStruct);
            sys.puts('TLD Cache is UP');
        }

        var failFunc = function(errorBody) {
            if (undefined != errorBody) {
                sys.puts(errorBody);
            }
            sys.puts('TLD Cache could not be synced');
        }

        this._syncTLDList( {
            'onSuccess': successFunc,
            'onFail' : failFunc
        } );
        return this;
    }
}

module.exports = TLD_TOOLS.init();
