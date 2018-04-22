/**
 * JIO Worker Storage Type = "Worker".
 * Connects to a substorage inside a worker or serviceworker.
 */
/*jslint indent: 2 */
/*global self, jIO, RSVP, navigator, encodeURIComponent, JSON*/
(function (self, jIO, RSVP, navigator, encodeURIComponent, JSON) {
  "use strict";

  function send(message) {
    var context = self;
    var storage = this;
    var queue = new RSVP.Queue();
    
    if (self._init === undefined) {
      self._init = true;
      queue.push(function () {
        return initializeStorage(storage);
      });
      queue.push(function () {
        self._ready = true;
        return;
      });
    }

    queue.push(function () {
      if (self._ready === undefined) {
        return storage._defer.promise;
      }
      return;
    });

    queue.push(function () {
      return new RSVP.Promise(function (resolve, reject) {
        var messageChannel;

        function handleResponse(event) {
          var error = event.data.error;
          if (error) {
            if (error.status_code === 404) {
              reject(new jIO.util.jIOError("Cannot find document", 404))
            }
            reject(error);
          } else {
            resolve(event.data.data);
          }
        }

        try {
  
          // worker
          if (context.ww) {
            context.onmessage = handleResponse;
            return context.ww.postMessage(message);
          }
  
          // serviceworker
          // This sends the message as well as transferring messageChannel.port2
          // to the service worker. The service worker can then use the 
          // transferred port to reply via postMessage(), which will in turn
          // trigger the onmessage handler on messageChannel.port1.
          // See https://html.spec.whatwg.org/multipage/workers.html
          messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = handleResponse;
          return context.sw.controller.postMessage(message, [messageChannel.port2]);
        } catch (error) {
          throw error;
        }
      });
    });

    return queue;
  }

  function waitForWorkerReady(my_storage) {
    return new RSVP.Queue()
      .push(function () {
        return self.sw.ready;
      })
      .push(function () {

        // controller is null by default on initial load. claim/skipWaiting can
        // be used to activate it immediately. If we get here everything
        // should be setup and active, so we can resolve the blocker preventing
        // requests to the sub_storage to go through (accessed through the
        // workers, this is why necessary to wait)
        if (my_storage._defer) {
          return my_storage._defer.resolve();
        }
        return;
      });
  }

  function waitForInstallation(registration, my_storage) {
    return new RSVP.Promise(function (resolve, reject) {
      if (registration.installing) {

        // If the current registration represents the "installing" service
        // worker, then wait until the installation step completes (during
        // which any defined resources are prefetched) to continue.
        registration.installing.addEventListener('statechange', function (e) {
          if (e.target.state === 'installed') {
          //  return resolve(registration);

          // when the serviceworker is activated, we can allow to let calls
          // to post message pass. if resolving on installed, postMessage
          // still fails
          } else if (e.target.state === 'activated') {
          //   return my_storage._defer.resolve();
            return resolve(my_storage);

          // if activate/install fail or this worker is replaced by another
          // https://bitsofco.de/the-service-worker-lifecycle/
          } else if (e.target.state === 'redundant') {
            return reject(e);
          }
        });
      } else {

        // Installation must have been completed during a previous visit to this
        // page and any resources will already have benn prefetched, so
        // continue right away.
        return resolve(my_storage);
      }
    });
  }

  function installServiceWorker(my_storage) {
    return new RSVP.Queue()
      .push(function () {
        return self.sw.getRegistration(my_storage._scope);
      })
      .push(function (registered_worker) {
        return new RSVP.Promise(function (resolve) {
          if (!registered_worker) {
            return resolve(self.sw.register(my_storage._url, {
              "scope": my_storage._scope
            }));   
          }
          // active serviceWorker, no need to register again
          return resolve(registered_worker);
        });
      });
  }

  function initializeStorage(my_storage) {
    return new RSVP.Queue()
      .push(function () {
        if (!my_storage._scope) {
          self.ww = new Worker(my_storage._url);
          return;
        }
        self.sw = navigator.serviceWorker;
        return new RSVP.Queue()
          .push(function () {
            return installServiceWorker(my_storage);
          })
          .push(function (registration) {
            return waitForInstallation(registration, my_storage);
          })
          .push(function (registered_storage) {
            return waitForWorkerReady(registered_storage);
          })
          .push(function () {
            my_storage._defer = null;
            return;
          })
          .push(null, function (error) {
            throw error;
          });
      })

      // XXX createJIO is sync, need to throw here to propagate errors up?
      .push(undefined, function (error) {
        throw error;
      });
  }

  // configuration must be passed through url
  function restrictUrl(spec) {
    var blank = "";
    return spec.url += "?" +
      spec.prefetch_url_list.reduce(function (str, element) {
        return str += "prefetch_url_list=" + encodeURIComponent(element) + "&";
      }, blank)  +
      "sub_storage=" + encodeURIComponent(JSON.stringify(spec.sub_storage)) +
      "&prefetch_update=" + (spec.prefetch_update || blank) +
      "&claim_clients=" + (spec.claim_clients || blank) +
      "&manifest_url=" + (spec.manifest_url || blank);
  }

  /**
   * The JIO WorkerStorage Storage extension
   *
   * @class WorkerStorage
   * @constructor
   */
  function WorkerStorage (spec) {
    if (spec.scope && "serviceWorker" in navigator === false) {
      throw new jIO.util.jIOError("Serviceworker not supported.",
                                  400);
    }
    if (!spec.scope && "Worker" in global === false) {
      throw new jIO.util.jIOError("WebWorker not supported.",
                                   400);
    }
    if (!spec.url) {
      throw new jIO.util.jIOError("Storage requires (service)worker url.",
                                  400);
    }
    this._url = restrictUrl(spec);
    this._scope = spec.scope;
    this._defer = new RSVP.defer();
    this._ready = null;
    //this._buffer_list = [];

    
    // as createJIO is not async, there is no way to call createJIO inside
    // a chain and manage the serviceworker setup which is async. thus we do
    // the initialization on the first send, which is async.

  }

  // bridge to storages inside the (service)worker
  WorkerStorage.prototype.post = function (param_dict) {
    return send.call(this, {command: "post", param: [param_dict]});
  };

  WorkerStorage.prototype.get = function (id) {
    return send.call(this, {command: "get", param: [id]});
  };

  WorkerStorage.prototype.put = function (id, param_dict) {
    return send.call(this, {command: "put", param: [id, param_dict]});
  };

  WorkerStorage.prototype.remove = function (id) {
    return send.call(this, {command: "remove", param: [id]});
  };

  WorkerStorage.prototype.removeAttachment = function (id, name) {
    return send.call(this, {command: "removeAttachment", param: [id, name]});
  };

  WorkerStorage.prototype.allAttachments = function (id, name) {
    return send.call(this, {command: "allAttachments", param: [id, name]});
  };

  WorkerStorage.prototype.getAttachment = function (id, name) {
    return send.call(this, {command: "getAttachment", param: [id, name]});
  };

  WorkerStorage.prototype.putAttachment = function (id, name, blob) {
    return send.call(this, {command: "putAttachment", param: [id, name, blob]});
  };

  WorkerStorage.prototype.allDocs = function (param_dict) {
    return send.call(this, {command: "allDocs", param: [param_dict]});
  };

  WorkerStorage.prototype.buildQuery = function (param_dict) {
    return send.call(this, {command: "buildQuery", param: [param_dict]});
  };

  WorkerStorage.prototype.repair = function () {
    return send.call(this, {command: "repair", param: []});
  };

  WorkerStorage.prototype.hasCapacity = function (capacity) {
    return send.call(this, {command: "hasCapacity", param: [capacity]});
  };

  jIO.addStorage('worker', WorkerStorage);

}(self, jIO, RSVP, navigator, encodeURIComponent, JSON));
