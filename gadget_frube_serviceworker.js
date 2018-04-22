/*jslint indent: 2*/
/*global self, Request, Response, location, JSON */
var global = self, window = self;
(function (self, Request, Response, location, JSON) {
  "use strict";

  // DEBUG:
  // chrome://cache/
  // chrome://inspect/#service-workers
  // chrome://serviceworker-internals/

  // If at any point you want to force pages that use this service worker to 
  // start using a fresh cache, increment the VERSION value. It will 
  // kick off the service worker update flow and the old cache(s) will be 
  // purged as part of the activate event handler when the updated service 
  // worker is activated.
  var VERSION = 1;

  // compat for jio
  self.DOMParser = {};
  self.Node = {};
  self.DOMError = {};
  self.sessionStorage = {};
  self.localStorage = {};
  self.openDatabase = {};

  self.importScripts(
    "rsvp.latest.js",
    "jio.latest.js",
    "gadget_global.js"
  );

  function setupWorkerEventListener(context, listen_for, callback) {
    return new RSVP.Queue()
      .push(function () {
        return context.promiseEventListener(context, listen_for, true);
      })
      .push(function (event) {
        return callback(event);
      });
  }

  function deserializeUrlParameters(query_string) {
    var output = {},
      key_value_pair_list = query_string.split("&").filter(Boolean),
      len = key_value_pair_list.length,
      key_value_list,
      key,
      i;

    // &foo=1&foo=2&bar=3 => {foo: [1, 2], bar: 3}
    for (i = 0; i < len; i += 1) {
      key_value_list = key_value_pair_list[i].split("=");
      key = key_value_list[0];
      if (key.indexOf("_list") > -1) {
        output[key] = output[key] || [];
        output[key].push(key_value_list[1]);
      } else {
        output[key] = key_value_list[1];
      }
    }
    return output;
  }

  // message mapping to sub_storage
  function messageHandler(event) {
    var opts = self.config;
    var storage = opts.storage;
    var data = event.data;

    // event.ports[0] corresponds to the MessagePort that was transferred
    // as part of the controlled page's call to controller.postMessage().
    // Therefore, event.ports[0].postMessage() will trigger the onmessage
    // handler from the controlled page. It's up to you how to structure
    // the messages that you send back; this is just one example.
    return new RSVP.Queue()
      .push(function () {
        return storage[data.command].apply(storage, data.param);
      })
      .push(function (result) {
        return event.ports[0].postMessage({"error": null, "data": result});
      })
      .push(undefined, function (error) {
        return event.ports[0].postMessage({"error": error});
      });
  }

  function fetchFile(file_url) {
    var request,
      url;

    // This constructs a new URL object using the service worker's script
    // location as the base for relative URLs.
    url = new URL(file_url, location.href);

    // Append a cache-bust=TIMESTAMP URL parameter to each URL's query
    // string. This is particularly important when pre-caching resources
    // that are later used in the fetch handler as responses directly,
    // without consulting the network (i.e. cache-first). If we were to
    // get back a response from the HTTP browser cache for this precaching
    // request then that stale response would be used indefinitely, or at
    // least until the next time the service worker script changes
    // triggering the install flow.
    url.search += (url.search ? '&' : '?') + 'cache-bust=' +  Date.now();

    // It's very important to use {mode: 'no-cors'} if there is any chance
    // the resources fetched are served off a server that doesn't support CORS.
    // See http://en.wikipedia.org/wiki/Cross-origin_resource_sharing.
    // If the server doesn't support CORS the fetch() would fail if the
    // default mode of 'cors' was used for the fetch() request. The drawback
    // of hardcoding {mode: 'no-cors'} is that the response from all
    // cross-origin hosts will always be opaque
    // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/
    // and it is not possible to determine whether an opaque response
    // is a success or failure https://github.com/whatwg/fetch/issues/14
    request = new Request(url, {
      "mode": 'no-cors',
      "Content-Type": "text/plain"
    });

    // XXX content-type differentiation - ArrayBuffer, BinaryString, DataUrl?
    return new RSVP.Queue()
      .push(function () {
        return self.fetch(request);
      })
      .push(function(response) {
        if (response.status >= 400) {
          throw new Error('Request for ' + file_url +
            ' failed with status ' + response.statusText);
        }
        return response.blob();
      });
  }

  // function retrieveAndStoreFile(store, url) {
  //   var opts = self.config;
  //   return new RSVP.Queue()
  //     .push(function () {
  //       return fetchFile(url);
  //     })
  //     .push(function (response) {
  //       if (store) {
  //         return store.put(url, response);
  //       }
  //       return opts.storage.putAttachment(opts.cache_dict.prefetch, url, response);
  //     });
  // }

  function setCacheableAssetList() {
    var opts = self.config;

    return new RSVP.Queue()
      .push(function () {
        return fetchFile(opts.manifest_url);
      })
      .push(function (response) {
        return self.promiseReadAsText(response);
      })
      .push(function (content) {
        var exclude_list = ["CACHE MANIFEST", "CACHE:", "NETWORK:", "*"],
          hash = "#",
          token = "# generated on ";
        return content.split(/(.*?)[\r\n]/g).map(function (item) {
          if (item[0] !== hash && exclude_list.indexOf(item) === -1) {
            return item;
          }
          if (item[0] === hash && item.indexOf(token) > -1) {
            opts.app_cache_version = item.replace(token, "");
          }
        }).filter(Boolean);
      })
      .push(function (cacheable_list) {
        opts.cache_dict.assets = 'assets-v' + opts.app_cache_version || VERSION;
        opts.cacheable_list = cacheable_list;

        // only now we can let activate trigger and clear old caches
        return opts.manifest_url_defer.resolve();
      });
  }

  // fetch (offline) intercept/store/serve from cache if manifest_url is set
  function fetchHandler(event) {
    var opts = self.config;
    var queue = new RSVP.Queue();
    var url = event.request.url;
    var hijack = url.indexOf(location.origin) === 0 || opts.cacheable_list.indexOf(url) > -1;

    // internal asset & keeping a cache
    if (hijack && event.request.method === "GET") {
      return event.respondWith(queue
        .push(function (cache) {
          return caches.match(event.request, {"ignoreSearch": true});
        })
        .push(function (response) {
          // cached, return from cache
          if (response) {
            return response;
          }

          // not cached, fetch from network and add to cache
          // clone call, because any operation like fetch/put... will
          // consume the request, so we need a copy of the original
          // (see https://fetch.spec.whatwg.org/#dom-request-clone)
          // XXX if cacheAll on install, this is just a fallback, no? 
          return new RSVP.Queue()
            .push(function () {
              return self.fetch(event.request.clone());
            })
            .push(function(response) {
              if (response.status < 400 &&
                opts.cacheable_list.indexOf(event.request) > -1) {
                cache.put(event.request, response.clone());
              }
              return response;
            });
        })
        .push(undefined, function(error) {

          // This catch() will handle exceptions that arise from the match()
          // or fetch() operations. Note that a HTTP error response (e.g.
          // 404) will NOT trigger an exception. It will return a normal
          // response object that has the appropriate error code set.
          throw error;
        })
      );
    //} else if (hijack && event.request.method === "POST") {
    //  we could also handle POST here, too
    //}
    // all other network requests
    }

    return event.respondWith(queue
      .push(function () {
        return self.fetch(event.request);
      })
      .push(undefined, function (error) {

        // not sure being offline is the only TypeError that can be raised.
        // We only provide a "generic" reply as the fetch handler might be
        // used on several different storages, so the storage itself has to
        // handle "offline" responses. We could set a header to indicate that
        // though
        if (error instanceof TypeError) {
          return new Response(JSON.stringify({}), {
            headers: {'Content-Type': 'application/json'}
          });
        }
      })
    );
  }

  // activation: changes here (like deleting active cache) break page.
  // claiming at the end will make serviceworker available to all pages without
  // a reload (in combination with skipWaiting on install). Note it only fires
  // once when this version of the script is first registered. Won't trigger 
  // after sericeworker is revived after termination, use fetch/message handler
  function activateHandler(event) {
    var opts = self.config;
    var expected_cache_name_list = Object.keys(opts.cache_dict)
      .map(function(key) {
        return opts.cache_dict[key];
      });

    return event.waitUntil(
      new RSVP.Queue()
        .push(function () {
          return caches.keys();
        })
        .push(function (cache_name_list) {
          return RSVP.all(
            cache_name_list.map(function(cache_name) {
              var version = cache_name.split("-v")[1];

              // removes old caches with wrong version (set in appcache!)
              if (version && version !== opts.app_cache_version) {
                return caches.delete(cache_name);
              }

              // removes caches which are not on the list of allowed names
              if (expected_cache_name_list.indexOf(cache_name) === -1) {
                return caches.delete(cache_name);
              }

              return;
            })
          );
      })
      .push(function () {
        if (opts.claim_clients !== false) {
          return self.clients.claim();
        }
      })
    );
  }

  // installation: runs parallel to active/no worker (update/prefetch here).
  // skipWaiting will avoid having to refresh the page in order to activate
  // the serviceworker (in combination with claim on activate).
  function installHandler(event) {
    var opts = self.config;
    var queue = new RSVP.Queue();

    if (opts.manifest_url) {
      queue.push(function () {
        return RSVP.all([
          opts.manifest_url_defer.promise,
          setCacheableAssetList()
        ]);
      });
    }
    return event.waitUntil(queue
      .push(function () {
        var nested_queue = new RSVP.Queue();
        //var storage = opts.storage || {};
        //var prefetch_cache = opts.cache_dict.prefetch;
        //var handler;

        // bulk-cache for offline mode
        if (opts.manifest_url) {
          nested_queue.push(
            new RSVP.Queue()
            .push(function () {
              return caches.open(opts.cache_dict.assets);
            })
            .push(function (cache) {
              opts.cacheable_list.push('./')
              return cache.addAll(opts.cacheable_list);
            })
            .push(function (response) {
              if (response instanceof TypeError) {
                throw response;
              }
              return;
            })
          );
        }

        // get prefetch files and store in storage or prefetch cache
        // XXX refactor, jIO could manage default caches as cache-storage, too?
        // if (prefetch_cache) {
        //   handler = storage.put || caches.open;
        //   nested_queue.push(handler(prefetch_cache));
        //   nested_queue.push(function (store) {
        //     return RSVP.all(opts.prefetch_url_list).map(function (url) {
        //       return new RSVP.Queue()
        //         .push(function () {
        //           if (store) {
        //             return store.match(url);
        //           }
        //           return opts.storage.getAttachment(prefetch_cache, url);
        //         })
        //         .push(function (response) {
        //           if (opts.prefetch_update) {
        //             return retrieveAndStoreFile(store, url);
        //           }
        //         })
        //         .push(undefined, function (error) {
        //           if (error.status_code === 404) {
        //             return retrieveAndStoreFile(store, url);
        //           }
        //           throw error;
        //         });
        //     });
        //   });
        // }

        return nested_queue
          .push(function () {
            if (opts.skip_waiting !== false) {
              return self.skipWaiting();
            }
          });
      })
    );
  }

  // start:
  return new RSVP.Queue()
    .push(function () {
      var query_string = location.search.substring(1);
      var loop = self.loopEventListener;
      var opts = self.config = deserializeUrlParameters(query_string);
      var loop_listener_list = [];
      var queue = new RSVP.Queue();

      opts.version = VERSION;
      opts.cacheable_list = [];
      opts.cache_dict = {self: "self-v" + opts.version};
      opts.buffer_list = [];

      // prevent promise returning before addAll loaded all assets
      if (opts.manifest_url) {
        opts.manifest_url_defer = new RSVP.defer();
      }
      if (opts.prefetch_url_list && opts.prefetch_url_list.length > 0) {
        opts.cache_dict.prefetch = "prefetch-v" + opts.version;
      }
      if (opts.cache_dict.prefetch || opts.manifest_url) {
        //loop_listener_list.push(loop(self, "fetch", false, fetchHandler));
        self.addEventListener("fetch", fetchHandler);
      }

      // XXX: what if prefetch-files should go into sub-storage?
      if (opts.sub_storage) {
        //loop_listener_list.push(loop(self, "message", false, messageHandler));
        self.addEventListener("message", messageHandler);
        opts.storage = jIO.createJIO(
          JSON.parse(self.decodeURIComponent(opts.sub_storage))
        );
      }

      queue.push(function () {
        new RSVP.all([
          setupWorkerEventListener(self, 'install', installHandler),
          setupWorkerEventListener(self, 'activate', activateHandler)
        ]);
      });

      //queue.push(function () {
      //  return RSVP.all(loop_listener_list);
      //});

      return queue;
    })
    .push(undefined, function (error) {
      throw error;
    });

}(self, Request, Response, location, JSON));
