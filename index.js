var 	request = require('request'),
	fs = require('fs'),
	sys = require('sys');

TLD_TOOLS = {
	_tldSource: 'http://mxr.mozilla.org/mozilla/source/netwerk/dns/src/effective_tld_names.dat?raw=1',
	_tldCacheOut: __dirname + '/.tlds',
	_tldStruct: {},

	_syncList: function(opts) {
		if (undefined != opts.onFail) {
			var onFail = opts.onFail;			
		}

		var refreshCache = (undefined != opts.refresh && opts.refresh == true);

		// If we don't have a local cache copy, or we have a refresh option
		// then load from our tldSource
		if (!fs.lstatSync(this._tldCacheOut) || refreshCache) {
			request(this._tldSource, function(error, res, body) {
				if (error) {
					onFail(body);
				} else {
					// sanitize lines
				        var lines = body.toString().split('\n');

					onSuccess(body);
				}
			}).pipe(fs.createWriteStream(this._tldCacheOut));
		}
	},

	// extract data and build our local map
	_tldCacheBind: function(data) {
	        var lines = data.toString().split('\n');
		var lineNum = lines.length;
		while (lineNum--) {
			
		}
		lines.forEach
	}

	tldCacheRefresh: function(onSuccess, onFail) {
		this._syncList( { 'onSuccess': onSuccess, 'onFail': onFail } );
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

		this._syncList( { 'onSuccess': successFunc, 'onFail' : failFunc } );
		return this;
	}
}

module.exports = TLD_TOOLS.init();
