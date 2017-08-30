/*jslint nomen: true, indent: 2 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // parameters
  /////////////////////////////

  /////////////////////////////
  // templates
  /////////////////////////////

  /////////////////////////////
  // some methods
  /////////////////////////////
  function getUrlParameter(name, url) {
    return decodeURIComponent(
      (new RegExp("[?|&]" + name + "=" + "([^&;]+?)(&|#|;|$)")
        .exec(url)||[, ""])[1].replace(/\+/g, "%20")) || null;
  }

  function uuid() {
    function S4() {
      return ("0000" + Math.floor(
        Math.random() * 0x10000
      ).toString(16)).slice(-4);
    }
    return S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4();
  }

  function setState() {
    var state = uuid();
    window.sessionStorage.setItem("state", state);
    return state;
  }

  function getState() {
    return window.sessionStorage.getItem("state");
  }

  rJS(window)

    /////////////////////////////
    // state
    /////////////////////////////
    .setState({
      connected: null,
    })

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      return this.initializeDropboxConnection();
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////

    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("getDropboxConnection", function (url, name, config) {
      return new Promise(function (resolve, reject) {
        var popup_resolver = function resolver(href) {
          var test = getUrlParameter("state", href);

          // already logged in
          if (test && getState() === test) {
            window.sessionStorage.setItem("state", null);
            resolve({
              "access_token": getUrlParameter("access_token", href),
              "uid": getUrlParameter("uid", href),
              "type": getUrlParameter("token_type", href)
            });
          } else {
            reject("forbidden - state parameter does not match.");
          }
        };

        return new RSVP.Queue()
          .push(function () {
            return window.open(url, name, config);
          })
          .push(function (my_opened_window) {
            my_opened_window.opener.popup_resolver = popup_resolver;
            return;
          });
      });
    })

    .declareMethod("setDropboxConnection", function () {
      var gadget = this;

      return new RSVP.Queue()
        .push(function () {
          return gadget.getDropboxConnection(
            "https://www.dropbox.com/1/oauth2/authorize?" +
              "client_id=rz2ua0dyty5lxx7" +
              "&response_type=token" +
              "&state=" + setState() +
              "&redirect_uri=" + window.location.href,
            "",
            "width=480,height=480,resizable=yes,scrollbars=yes,status=yes"
          );
        })
        .push(function (oauth_dict) {
          return gadget.jio_create({
            "type": "dropbox",
            "access_token": oauth_dict.access_token,
            "root": "sandbox"
          });
        });
        /*
        .push(function () {
          return gadget.jio_get("/test/");
        })
        .push(undefined, function (error) {
          if (error.status_code === 404) {
            return gadget.jio_put("/test/", {});
          }
          throw error;
        });
        */
    })

    .declareMethod("initializeDropboxConnection", function () {

      // the oauth popup will open same page and we will end up at this line, too,
      // but when inside the popup, the opener must be set
      if (window.opener === null) {
        return;
      }
      return new RSVP.Queue()
        .push(function () {

          // window.opener returns reference to  window that opened this window
          // https://developer.mozilla.org/en-US/docs/Web/API/Window/opener
          // this passes the token to the promise waiting above
          return window.opener.popup_resolver(
            window.location.hash.replace("#", "?")
          );
        })
        .push(function () {
          window.close();
          return;
        });
    })

    // jIO bridge
    .declareMethod("jio_create", function (my_jio_options) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.createJIO(my_jio_options);
        });
    })
    .declareMethod("jio_allDocs", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.allDocs.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_remove", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.remove.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_post", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.post.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_put", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.put.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_get", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.get.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_allAttachments", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.allAttachments.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_getAttachment", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.getAttachment.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_putAttachment", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.putAttachment.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_removeAttachment", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.removeAttachment.apply(my_gadget, my_param_list);
        });
    })
    .declareMethod("jio_repair", function (my_param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_gadget) {
          return my_gadget.repair.apply(my_gadget, my_param_list);
        });
    })

    /////////////////////////////
    // on state changes
    /////////////////////////////

    /////////////////////////////
    // on Event
    /////////////////////////////

    /////////////////////////////
    // declared jobs
    /////////////////////////////

    /////////////////////////////
    // declared service
    /////////////////////////////
    ;

}(window, rJS, RSVP));

